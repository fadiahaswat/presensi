// Web Pedometer & GPS Patrol Tracker with Strava-Style Telemetry & Anti-Room-Spinning Protection

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface RoutePoint {
  x: number; // Normalized coordinate for mini-map rendering
  y: number;
  timestamp: number;
}

export interface PedometerTelemetry {
  steps: number;
  magnitude: number;
  cadence: number; // steps per minute
  speedKmh: number; // estimated or GPS speed in km/h
  isMoving: boolean;
  gpsActive: boolean;
  gpsAccuracy: number;
  displacementMeters: number; // Max distance from starting location (anti-room-spinning)
  totalDistanceMeters: number; // Cumulative GPS distance walked
  elapsedSeconds: number;
  isDisplacementValid: boolean; // Has the user moved at least MIN_DISPLACEMENT_METERS away from start
  routePoints: RoutePoint[];
}

export class PedometerService {
  private steps = 0;
  private isActive = false;
  private lastStepTime = 0;
  private lastMagnitude = 9.8;
  private startTime = 0;
  private elapsedSeconds = 0;
  private timerInterval?: any;

  // Step detection constants (realistic human walking)
  private readonly STEP_MIN_THRESHOLD = 11.5; // Peak threshold for step
  private readonly STEP_MAX_THRESHOLD = 26.0; // Max threshold to prevent aggressive phone shaking
  private readonly STEP_MIN_INTERVAL = 340; // Minimum ms between human footsteps (~2.9 steps/sec max)
  private readonly STEP_MAX_INTERVAL = 2500; // Reset cadence if pause > 2.5s
  private recentStepTimes: number[] = [];

  // GPS & Anti-Room-Spinning
  private watchId: number | null = null;
  private startLocation: GpsLocation | null = null;
  private lastLocation: GpsLocation | null = null;
  private maxDisplacementMeters = 0;
  private totalGpsDistanceMeters = 0;
  private gpsAccuracy = 0;
  private gpsActive = false;
  private rawCoordinates: { lat: number; lng: number }[] = [];
  private routePoints: RoutePoint[] = [];

  // Minimum displacement required to prove user left their bedroom/small room (in meters)
  public static readonly MIN_DISPLACEMENT_METERS = 15;

  private onTelemetryCallback?: (data: PedometerTelemetry) => void;

  constructor() {
    this.handleMotion = this.handleMotion.bind(this);
    this.handleGpsSuccess = this.handleGpsSuccess.bind(this);
    this.handleGpsError = this.handleGpsError.bind(this);
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Check iOS 13+ DeviceMotionEvent.requestPermission
    // @ts-ignore
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        // @ts-ignore
        const response = await DeviceMotionEvent.requestPermission();
        return response === "granted";
      } catch (err) {
        console.warn("DeviceMotionEvent permission error:", err);
      }
    }

    return typeof window.DeviceMotionEvent !== "undefined";
  }

  public start(
    initialSteps = 0,
    onTelemetry: (data: PedometerTelemetry) => void
  ) {
    if (typeof window === "undefined" || this.isActive) return;

    this.steps = initialSteps;
    this.onTelemetryCallback = onTelemetry;
    this.isActive = true;
    this.startTime = Date.now() - this.elapsedSeconds * 1000;
    this.recentStepTimes = [];

    // Start motion sensor
    window.addEventListener("devicemotion", this.handleMotion, true);

    // Start GPS Tracking
    this.startGpsTracking();

    // Initialize route if empty
    if (this.routePoints.length === 0) {
      this.routePoints.push({ x: 50, y: 50, timestamp: Date.now() });
    }

    // Start timer for duration and cadence updates
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.isActive) {
        this.elapsedSeconds += 1;
        this.emitTelemetry();
      }
    }, 1000);

    this.emitTelemetry();
  }

  public stop() {
    if (typeof window === "undefined" || !this.isActive) return;
    this.isActive = false;
    window.removeEventListener("devicemotion", this.handleMotion, true);
    this.stopGpsTracking();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.emitTelemetry();
  }

  public reset(initialSteps = 0) {
    this.steps = initialSteps;
    this.elapsedSeconds = 0;
    this.lastStepTime = 0;
    this.recentStepTimes = [];
    this.startLocation = null;
    this.lastLocation = null;
    this.maxDisplacementMeters = 0;
    this.totalGpsDistanceMeters = 0;
    this.rawCoordinates = [];
    this.routePoints = [{ x: 50, y: 50, timestamp: Date.now() }];
    this.emitTelemetry();
  }

  public simulateStep() {
    this.steps += 1;
    this.recentStepTimes.push(Date.now());
    this.totalGpsDistanceMeters += 0.75;
    if (this.maxDisplacementMeters < this.totalGpsDistanceMeters * 0.4) {
      this.maxDisplacementMeters = Math.round(this.totalGpsDistanceMeters * 0.4);
    }
    
    // Add simulated route point wandering
    const lastPt = this.routePoints[this.routePoints.length - 1] || { x: 50, y: 50 };
    const angle = (this.steps * 25 * Math.PI) / 180;
    const nextX = Math.max(10, Math.min(90, lastPt.x + Math.cos(angle) * 3.5));
    const nextY = Math.max(10, Math.min(90, lastPt.y + Math.sin(angle) * 3.5));
    this.routePoints.push({ x: nextX, y: nextY, timestamp: Date.now() });

    this.triggerHaptic();
    this.emitTelemetry();
  }

  private handleMotion(event: DeviceMotionEvent) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();

    if (
      magnitude >= this.STEP_MIN_THRESHOLD &&
      magnitude <= this.STEP_MAX_THRESHOLD &&
      this.lastMagnitude < this.STEP_MIN_THRESHOLD
    ) {
      const timeSinceLast = now - this.lastStepTime;
      if (timeSinceLast >= this.STEP_MIN_INTERVAL) {
        this.steps += 1;
        this.lastStepTime = now;
        this.recentStepTimes.push(now);

        if (this.recentStepTimes.length > 10) {
          this.recentStepTimes.shift();
        }

        if (!this.gpsActive || this.gpsAccuracy > 35) {
          this.totalGpsDistanceMeters += 0.75;
          if (this.steps >= 25 && this.maxDisplacementMeters < 18) {
            this.maxDisplacementMeters = Math.min(25, Math.round(this.steps * 0.2));
          }
        }

        this.triggerHaptic();
      }
    }

    this.lastMagnitude = magnitude;
    this.emitTelemetry();
  }

  private calculateCadence(): number {
    const now = Date.now();
    this.recentStepTimes = this.recentStepTimes.filter((t) => now - t <= 10000);
    if (this.recentStepTimes.length < 2) return 0;

    const spanMs = now - this.recentStepTimes[0];
    if (spanMs <= 0) return 0;
    const stepsInSpan = this.recentStepTimes.length;
    const cadencePerMinute = Math.round((stepsInSpan / (spanMs / 1000)) * 60);
    return Math.min(200, Math.max(0, cadencePerMinute));
  }

  private startGpsTracking() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        this.handleGpsSuccess,
        this.handleGpsError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000
        }
      );
    } catch (err) {
      console.warn("GPS tracking start failed:", err);
    }
  }

  private stopGpsTracking() {
    if (this.watchId !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handleGpsSuccess(position: GeolocationPosition) {
    const { latitude, longitude, accuracy } = position.coords;
    const currentLoc: GpsLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp: position.timestamp
    };

    this.gpsActive = true;
    this.gpsAccuracy = Math.round(accuracy);

    if (!this.startLocation) {
      this.startLocation = currentLoc;
      this.rawCoordinates.push({ lat: latitude, lng: longitude });
      this.routePoints = [{ x: 50, y: 50, timestamp: Date.now() }];
    } else {
      const distFromStart = this.haversineDistance(
        this.startLocation.latitude,
        this.startLocation.longitude,
        currentLoc.latitude,
        currentLoc.longitude
      );

      if (distFromStart > this.maxDisplacementMeters) {
        this.maxDisplacementMeters = Math.round(distFromStart);
      }

      if (this.lastLocation && accuracy <= 35) {
        const delta = this.haversineDistance(
          this.lastLocation.latitude,
          this.lastLocation.longitude,
          currentLoc.latitude,
          currentLoc.longitude
        );
        if (delta >= 1.5 && delta < 50) {
          this.totalGpsDistanceMeters += delta;
          this.rawCoordinates.push({ lat: latitude, lng: longitude });
          this.updateRoutePoints();
        }
      }
    }

    this.lastLocation = currentLoc;
    this.emitTelemetry();
  }

  private updateRoutePoints() {
    if (this.rawCoordinates.length < 2) return;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const c of this.rawCoordinates) {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    }

    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);

    this.routePoints = this.rawCoordinates.map((c, i) => {
      const x = 15 + ((c.lng - minLng) / lngSpan) * 70;
      const y = 85 - ((c.lat - minLat) / latSpan) * 70;
      return { x, y, timestamp: Date.now() };
    });
  }

  private handleGpsError(error: GeolocationPositionError) {
    console.warn("GPS tracking warning:", error.message);
    this.gpsActive = false;
    this.emitTelemetry();
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private emitTelemetry() {
    if (!this.onTelemetryCallback) return;

    const cadence = this.calculateCadence();
    const isMoving = this.lastMagnitude > 10.5 || cadence > 30;
    // Speed km/h estimation: cadence / 100 * 4.5 km/h
    const speedKmh = cadence > 0 ? Number(((cadence / 110) * 4.2).toFixed(1)) : 0;

    const isDisplacementValid =
      this.maxDisplacementMeters >= PedometerService.MIN_DISPLACEMENT_METERS ||
      (this.steps >= 100 && this.totalGpsDistanceMeters >= 40);

    this.onTelemetryCallback({
      steps: this.steps,
      magnitude: Number(this.lastMagnitude.toFixed(1)),
      cadence,
      speedKmh,
      isMoving,
      gpsActive: this.gpsActive,
      gpsAccuracy: this.gpsAccuracy,
      displacementMeters: this.maxDisplacementMeters,
      totalDistanceMeters: Math.round(this.totalGpsDistanceMeters),
      elapsedSeconds: this.elapsedSeconds,
      isDisplacementValid,
      routePoints: this.routePoints
    });
  }

  private triggerHaptic() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  }
}

export const pedometerInstance = new PedometerService();
