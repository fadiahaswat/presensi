// Web Pedometer & GPS Patrol Tracker with Strava-Style Telemetry & Anti-Room-Spinning Protection

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface RoutePoint {
  x: number; // Normalized coordinate for mini-map rendering (10..90)
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
  private startTime = 0;
  private elapsedSeconds = 0;
  private timerInterval?: any;

  // Digital Signal Processing (DSP) & Step Detection Filters
  private gravity = { x: 0, y: 0, z: 9.8 };
  private alpha = 0.85; // Stable balanced gravity filter
  private filteredMagnitude = 0;
  private prevMagnitude = 0;
  private prevSlope = 0;
  private currentValley = 0;
  
  // Rolling Window Adaptive Peak-Valley Thresholding (Calibrated for Asrama Stop-and-Go Patrol)
  private magHistory: number[] = [];
  private readonly MAG_HISTORY_LEN = 20; // ~0.4s window
  private dynamicThreshold = 1.25; // Dynamic threshold baseline
  private minPeakThreshold = 1.15; // Balanced floor: catches loose sarung/gamis/koko pockets while ignoring table resting / typing jitter (~0.12G)
  private maxPeakThreshold = 16.0; // Broad tolerance for stairs & brisk walking
  private minPeakToValley = 0.80; // Minimum wave amplitude for real human footsteps

  // Step Timing Constraints (Natural walking cadence: ~0.45Hz - 3.2Hz)
  private readonly STEP_MIN_INTERVAL = 310; // Max ~3.2 steps/sec
  private readonly STEP_MAX_INTERVAL = 2200; // 2.2s tolerance for musyrif stopping to inspect room / talk to santri
  private recentStepTimes: number[] = [];

  // Stop-and-Go 2-Step Confirmation Buffer
  private pendingSteps = 0;
  private lastCandidateTime = 0;
  private isRhythmEstablished = false;

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
    this.magHistory = [];
    this.pendingSteps = 0;
    this.lastCandidateTime = 0;
    this.isRhythmEstablished = false;
    this.currentValley = 0;
    this.gravity = { x: 0, y: 0, z: 9.8 };

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
        
        // Reset rhythm buffer if user stopped walking for > 2.2 seconds (without losing total steps)
        if (Date.now() - this.lastStepTime > this.STEP_MAX_INTERVAL && this.isRhythmEstablished) {
          this.isRhythmEstablished = false;
          this.pendingSteps = 0;
        }

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
    this.lastCandidateTime = 0;
    this.pendingSteps = 0;
    this.isRhythmEstablished = false;
    this.currentValley = 0;
    this.recentStepTimes = [];
    this.startLocation = null;
    this.lastLocation = null;
    this.maxDisplacementMeters = 0;
    this.totalGpsDistanceMeters = 0;
    this.rawCoordinates = [];
    this.magHistory = [];
    this.routePoints = [{ x: 50, y: 50, timestamp: Date.now() }];
    this.emitTelemetry();
  }

  public simulateStep() {
    this.steps += 1;
    const now = Date.now();
    this.lastStepTime = now;
    this.recentStepTimes.push(now);
    if (this.recentStepTimes.length > 15) this.recentStepTimes.shift();

    // Stride length ~0.75m
    this.totalGpsDistanceMeters += 0.75;
    if (this.maxDisplacementMeters < this.totalGpsDistanceMeters * 0.45) {
      this.maxDisplacementMeters = Math.round(this.totalGpsDistanceMeters * 0.45);
    }
    
    // Add realistic wandering GPS trail
    const lastPt = this.routePoints[this.routePoints.length - 1] || { x: 50, y: 50 };
    const angle = (this.steps * 18 * Math.PI) / 180 + Math.sin(this.steps * 0.3) * 0.5;
    const stepDist = 2.2 + (Math.sin(this.steps) * 0.8);
    const nextX = Math.max(10, Math.min(90, lastPt.x + Math.cos(angle) * stepDist));
    const nextY = Math.max(10, Math.min(90, lastPt.y + Math.sin(angle) * stepDist));
    this.routePoints.push({ x: nextX, y: nextY, timestamp: now });

    this.triggerHaptic();
    this.emitTelemetry();
  }

  /**
   * Stop-and-Go Calibrated Pedometer Filter for Asrama Patrol:
   * 1. Gravity Isolate (Low-pass IIR on 3D vectors)
   * 2. User Linear Dynamic Acceleration = Vector - Gravity
   * 3. Peak-to-Valley Amplitude Check (Filters hand twitch / table resting)
   * 4. Quick 2-Step Streak Buffer (Validates 2 consecutive steps so short inter-room walks are seamlessly counted)
   */
  private handleMotion(event: DeviceMotionEvent) {
    const rawAcc = event.accelerationIncludingGravity || event.acceleration;
    if (!rawAcc || rawAcc.x === null || rawAcc.y === null || rawAcc.z === null) return;

    const rx = rawAcc.x || 0;
    const ry = rawAcc.y || 0;
    const rz = rawAcc.z || 0;

    // 1. Isolate gravity using low-pass IIR filter (alpha = 0.85)
    this.gravity.x = this.alpha * this.gravity.x + (1 - this.alpha) * rx;
    this.gravity.y = this.alpha * this.gravity.y + (1 - this.alpha) * ry;
    this.gravity.z = this.alpha * this.gravity.z + (1 - this.alpha) * rz;

    // 2. High-pass filter linear body acceleration (remove tilt/orientation)
    const linX = rx - this.gravity.x;
    const linY = ry - this.gravity.y;
    const linZ = rz - this.gravity.z;

    // Calculate dynamic body acceleration magnitude
    const dynMagnitude = Math.sqrt(linX * linX + linY * linY + linZ * linZ);

    // 3. Smooth with exponential moving average to filter sensor jitter
    this.filteredMagnitude = 0.50 * this.filteredMagnitude + 0.50 * dynMagnitude;

    // Track rolling minimum (valley) during the wave
    if (this.filteredMagnitude < this.currentValley || this.currentValley === 0) {
      this.currentValley = this.filteredMagnitude;
    }

    // Rolling history for adaptive statistical thresholding
    this.magHistory.push(this.filteredMagnitude);
    if (this.magHistory.length > this.MAG_HISTORY_LEN) {
      this.magHistory.shift();
    }

    if (this.magHistory.length >= 6) {
      const sum = this.magHistory.reduce((a, b) => a + b, 0);
      const mean = sum / this.magHistory.length;
      const variance = this.magHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.magHistory.length;
      const stdDev = Math.sqrt(variance);

      // Adaptive dynamic threshold: mean + 0.70 * stdDev (clamped to minPeakThreshold = 1.15 m/s²)
      this.dynamicThreshold = Math.max(
        this.minPeakThreshold,
        Math.min(this.maxPeakThreshold, mean + stdDev * 0.70)
      );
    }

    // 4. Peak Detection with zero-crossing slope analysis
    const currentSlope = this.filteredMagnitude - this.prevMagnitude;
    const now = Date.now();

    // Check for local peak: slope changed from positive to negative above adaptive threshold
    if (this.prevSlope > 0 && currentSlope <= 0) {
      const peakVal = this.prevMagnitude;
      const amplitudeSwing = peakVal - this.currentValley;

      // Validate peak height AND genuine wave swing
      if (
        peakVal >= this.dynamicThreshold &&
        peakVal <= this.maxPeakThreshold &&
        amplitudeSwing >= this.minPeakToValley
      ) {
        const timeSinceLastCandidate = now - this.lastCandidateTime;

        // Check if timing fits walking interval (310ms - 2200ms)
        if (timeSinceLastCandidate >= this.STEP_MIN_INTERVAL && timeSinceLastCandidate <= this.STEP_MAX_INTERVAL) {
          if (!this.isRhythmEstablished) {
            this.pendingSteps += 1;
            // 2 consecutive steps confirms walking: credit both steps immediately!
            if (this.pendingSteps >= 2) {
              this.isRhythmEstablished = true;
              this.steps += this.pendingSteps;
              this.pendingSteps = 0;
              this.lastStepTime = now;
              this.recentStepTimes.push(now - 450, now);
              this.onStepValidated(2);
            }
          } else {
            // Walking is ongoing: count step directly in real-time
            this.steps += 1;
            this.lastStepTime = now;
            this.recentStepTimes.push(now);
            if (this.recentStepTimes.length > 15) this.recentStepTimes.shift();
            this.onStepValidated(1);
          }
          this.lastCandidateTime = now;
        } else if (timeSinceLastCandidate > this.STEP_MAX_INTERVAL || timeSinceLastCandidate < this.STEP_MIN_INTERVAL) {
          // If paused or erratic single movement: start new 2-step candidate
          this.isRhythmEstablished = false;
          this.pendingSteps = 1;
          this.lastCandidateTime = now;
        }

        // Reset valley for next step wave
        this.currentValley = peakVal;
      }
    }

    this.prevSlope = currentSlope;
    this.prevMagnitude = this.filteredMagnitude;
    this.emitTelemetry();
  }

  private onStepValidated(stepCount: number) {
    // Indoor Fallback: If GPS is unavailable/weak, estimate displacement from step count
    if (!this.gpsActive || this.gpsAccuracy > 35) {
      this.totalGpsDistanceMeters += 0.72 * stepCount; // Avg human stride length ~72cm
      if (this.steps >= 15) {
        this.maxDisplacementMeters = Math.max(
          this.maxDisplacementMeters,
          Math.min(35, Math.round(this.steps * 0.3))
        );
      }
    }
    this.triggerHaptic();
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
    const isMoving = this.filteredMagnitude > 0.8 || cadence > 25;
    // Speed km/h estimation: cadence / 100 * 4.5 km/h
    const speedKmh = cadence > 0 ? Number(((cadence / 110) * 4.2).toFixed(1)) : 0;

    const isDisplacementValid =
      this.maxDisplacementMeters >= PedometerService.MIN_DISPLACEMENT_METERS ||
      (this.steps >= 100 && this.totalGpsDistanceMeters >= 40);

    this.onTelemetryCallback({
      steps: this.steps,
      magnitude: Number(this.filteredMagnitude.toFixed(1)),
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
