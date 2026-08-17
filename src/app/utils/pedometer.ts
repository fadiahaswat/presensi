// Web Pedometer / Step Detector using DeviceMotionEvent Accelerometer

export interface PedometerState {
  steps: number;
  isActive: boolean;
  permissionGranted: boolean;
  supported: boolean;
  lastMagnitude: number;
}

export class PedometerService {
  private steps = 0;
  private isActive = false;
  private lastStepTime = 0;
  private lastMagnitude = 9.8;
  private onStepCallback?: (steps: number) => void;
  private onMagnitudeCallback?: (mag: number) => void;

  // Thresholds for step detection (m/s^2)
  private readonly STEP_THRESHOLD = 11.8; // Peak threshold
  private readonly STEP_MIN_INTERVAL = 280; // Minimum ms between human steps

  constructor() {
    this.handleMotion = this.handleMotion.bind(this);
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
        console.warn("DeviceMotionEvent permission request error:", err);
        return false;
      }
    }

    return typeof window.DeviceMotionEvent !== "undefined";
  }

  public start(onStep: (steps: number) => void, onMagnitude?: (mag: number) => void) {
    if (typeof window === "undefined" || this.isActive) return;
    this.onStepCallback = onStep;
    this.onMagnitudeCallback = onMagnitude;
    this.isActive = true;

    window.addEventListener("devicemotion", this.handleMotion, true);
  }

  public stop() {
    if (typeof window === "undefined" || !this.isActive) return;
    this.isActive = false;
    window.removeEventListener("devicemotion", this.handleMotion, true);
  }

  public reset(initialSteps = 0) {
    this.steps = initialSteps;
    this.onStepCallback?.(this.steps);
  }

  public simulateStep() {
    this.steps += 1;
    this.onStepCallback?.(this.steps);
    this.triggerHaptic();
  }

  private handleMotion(event: DeviceMotionEvent) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    // Magnitude calculation: |a| = sqrt(x^2 + y^2 + z^2)
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    this.onMagnitudeCallback?.(magnitude);

    const now = Date.now();
    // Peak detection: acceleration crosses step threshold and sufficient time elapsed
    if (magnitude > this.STEP_THRESHOLD && this.lastMagnitude <= this.STEP_THRESHOLD) {
      if (now - this.lastStepTime > this.STEP_MIN_INTERVAL) {
        this.steps += 1;
        this.lastStepTime = now;
        this.onStepCallback?.(this.steps);
        this.triggerHaptic();
      }
    }

    this.lastMagnitude = magnitude;
  }

  private triggerHaptic() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
  }
}

export const pedometerInstance = new PedometerService();
