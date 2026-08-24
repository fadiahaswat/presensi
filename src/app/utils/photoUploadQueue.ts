/**
 * ============================================================================
 * PHOTO UPLOAD DRAFT QUEUE SERVICE
 * Background retry mechanism for pending photo uploads
 * Ensures photos are uploaded even if sync fails, with adaptive compression
 * ============================================================================
 */

export interface PendingPhoto {
  id: string;
  table: string;
  recordId: string;
  fieldKey: string;
  photoData: string; // base64 data URL
  compressedData?: string; // progressively compressed versions
  watermarkText: string;
  createdAt: string;
  lastAttemptAt?: string;
  attemptCount: number;
  status: "pending" | "uploading" | "failed";
  lastError?: string;
  targetCharLimit: number; // target for this photo (starts at 50000, decreases on failures)
}

type PhotoUploadListener = (pending: PendingPhoto[]) => void;

const PHOTO_QUEUE_KEY = "presensi_photo_upload_queue_v1";
const MAX_RETRY_INTERVAL_MS = 300000; // 5 minutes max between retries
const INITIAL_RETRY_INTERVAL_MS = 10000; // 10 seconds initial retry
const MAX_GAS_CELL_CHARS = 50000; // Google Sheets cell limit
const TARGET_SAFE_CHARS = 24000; // Safe target for photos (well under limit - matching imageCompressor.ts)

class PhotoUploadQueueService {
  private queue: PendingPhoto[] = [];
  private listeners: Set<PhotoUploadListener> = new Set();
  private retryTimer: any = null;
  private isProcessing: boolean = false;
  private gasUrl: string = "";
  // Track successfully uploaded photos (recordId -> timestamp)
  private uploadedPhotos: Map<string, string> = new Map();
  private UPLOADED_KEY = "presensi_uploaded_photos_v1";

  constructor() {
    this.loadQueue();
    this.loadUploadedPhotos();
    this.setupNetworkListener();
  }

  private loadUploadedPhotos() {
    try {
      const saved = localStorage.getItem(this.UPLOADED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(([key, timestamp]: [string, string]) => {
            this.uploadedPhotos.set(key, timestamp);
          });
        }
      }
    } catch (_) {}
  }

  private saveUploadedPhotos() {
    try {
      const data = Array.from(this.uploadedPhotos.entries());
      localStorage.setItem(this.UPLOADED_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  private markPhotoUploaded(recordId: string, fieldKey: string) {
    const key = `${recordId}:${fieldKey}`;
    this.uploadedPhotos.set(key, new Date().toISOString());
    this.saveUploadedPhotos();
  }

  public isPhotoUploaded(recordId: string, fieldKey: string): boolean {
    const key = `${recordId}:${fieldKey}`;
    return this.uploadedPhotos.has(key);
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(PHOTO_QUEUE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.queue = Array.isArray(parsed) ? parsed.filter(p => p && p.id && p.photoData) : [];
      }
    } catch (_) {
      this.queue = [];
    }
    this.notifyListeners();
  }

  private saveQueue() {
    try {
      // Don't save full photo data to localStorage (too large)
      // Only save metadata for quick reload
      const queueMeta = this.queue.map(p => ({
        id: p.id,
        table: p.table,
        recordId: p.recordId,
        fieldKey: p.fieldKey,
        watermarkText: p.watermarkText,
        createdAt: p.createdAt,
        lastAttemptAt: p.lastAttemptAt,
        attemptCount: p.attemptCount,
        status: p.status,
        lastError: p.lastError,
        targetCharLimit: p.targetCharLimit
        // Note: photoData not saved - will need to be re-provided on recovery
      }));
      localStorage.setItem(PHOTO_QUEUE_KEY, JSON.stringify(queueMeta));
    } catch (_) {}
  }

  private setupNetworkListener() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      // Start retry when network comes back
      this.scheduleRetry();
    });

    window.addEventListener("offline", () => {
      this.cancelRetry();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.queue.some(p => p.status === "pending" || p.status === "failed")) {
        this.scheduleRetry();
      }
    });
  }

  /**
   * Set the GAS URL for uploads
   */
  public setGasUrl(url: string) {
    this.gasUrl = url;
  }

  /**
   * Subscribe to queue updates
   */
  public subscribe(listener: PhotoUploadListener): () => void {
    this.listeners.add(listener);
    listener(this.getPendingPhotos());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const pending = this.getPendingPhotos();
    this.listeners.forEach(fn => {
      try { fn(pending); } catch (_) {}
    });
  }

  /**
   * Get all pending photos
   */
  public getPendingPhotos(): PendingPhoto[] {
    return this.queue.filter(p => p.status !== "uploading");
  }

  /**
   * Get count of pending uploads
   */
  public getPendingCount(): number {
    return this.queue.filter(p => p.status !== "uploading").length;
  }

  /**
   * Check if there are failed uploads that need attention
   */
  public hasFailedUploads(): boolean {
    return this.queue.some(p => p.status === "failed");
  }

  /**
   * Add a photo to the upload queue
   */
  public enqueue(
    table: string,
    recordId: string,
    fieldKey: string,
    photoData: string,
    watermarkText: string
  ): string {
    const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if this photo is already in queue
    const existing = this.queue.find(p =>
      p.table === table && p.recordId === recordId && p.fieldKey === fieldKey
    );
    if (existing) {
      // Update existing entry
      existing.photoData = photoData;
      existing.watermarkText = watermarkText;
      existing.status = "pending";
      existing.lastAttemptAt = undefined;
      existing.lastError = undefined;
      existing.attemptCount = 0;
      existing.targetCharLimit = MAX_GAS_CELL_CHARS;
    } else {
      // Add new entry
      this.queue.push({
        id,
        table,
        recordId,
        fieldKey,
        photoData,
        watermarkText,
        createdAt: new Date().toISOString(),
        attemptCount: 0,
        status: "pending",
        targetCharLimit: TARGET_SAFE_CHARS
      });
    }

    this.saveQueue();
    this.notifyListeners();
    this.scheduleRetry();

    return id;
  }

  /**
   * Remove a photo from the queue (e.g., when already uploaded via normal sync)
   */
  public remove(table: string, recordId: string, fieldKey: string): boolean {
    const idx = this.queue.findIndex(p =>
      p.table === table && p.recordId === recordId && p.fieldKey === fieldKey
    );
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear all pending photos (use with caution!)
   */
  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry() {
    if (!navigator.onLine || !this.gasUrl || this.isProcessing) return;

    const pending = this.queue.filter(p => p.status === "pending" || p.status === "failed");
    if (pending.length === 0) return;

    // Calculate delay with exponential backoff
    const maxAttempts = Math.max(...pending.map(p => p.attemptCount));
    const delay = Math.min(
      INITIAL_RETRY_INTERVAL_MS * Math.pow(2, maxAttempts),
      MAX_RETRY_INTERVAL_MS
    );

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  /**
   * Cancel scheduled retry
   */
  private cancelRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Process all pending photos in queue
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || !this.gasUrl) return;

    const pending = this.queue.filter(p => p.status !== "uploading");
    if (pending.length === 0) return;

    this.isProcessing = true;

    for (const photo of pending) {
      if (!navigator.onLine) break;

      try {
        await this.uploadPhoto(photo);
      } catch (err) {
        console.error(`[PhotoUploadQueue] Failed to upload photo ${photo.id}:`, err);
      }
    }

    this.isProcessing = false;
    this.scheduleRetry(); // Schedule next retry if still pending
  }

  /**
   * Upload a single photo with adaptive compression
   */
  private async uploadPhoto(photo: PendingPhoto): Promise<boolean> {
    if (!navigator.onLine || !this.gasUrl) {
      photo.status = "pending";
      return false;
    }

    photo.status = "uploading";
    photo.lastAttemptAt = new Date().toISOString();
    photo.attemptCount++;
    this.notifyListeners();

    try {
      // Compress photo to target character limit
      const compressedPhoto = await this.adaptiveCompress(photo);

      if (!compressedPhoto || compressedPhoto.length === 0) {
        throw new Error("Failed to compress photo to acceptable size");
      }

      // Prepare payload using existing batch_upsert action
      const payload = {
        action: "batch_upsert",
        table: photo.table,
        records: [{
          id: photo.recordId,
          [photo.fieldKey]: compressedPhoto,
          watermarkText: photo.watermarkText,
          // Add dummy fields to ensure record exists
          _placeholder: "photo_upload"
        }]
      };

      // Try upload
      const response = await fetch(this.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        // Success! Remove from queue and mark as uploaded
        this.markPhotoUploaded(photo.recordId, photo.fieldKey);
        const idx = this.queue.findIndex(p => p.id === photo.id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
        }
        this.saveQueue();
        this.notifyListeners();

        console.log(`[PhotoUploadQueue] ✓ Photo ${photo.id} uploaded successfully`);
        return true;
      } else {
        throw new Error(result.message || "Upload failed");
      }

    } catch (err: any) {
      photo.status = "failed";
      photo.lastError = err.message || "Unknown error";

      // Decrease target if photo is too large
      if (photo.lastError.includes("413") ||
          photo.lastError.includes("payload") ||
          photo.lastError.includes("large") ||
          (photo.photoData && photo.photoData.length > photo.targetCharLimit)) {
        photo.targetCharLimit = Math.max(8000, Math.floor(photo.targetCharLimit * 0.7));
      }

      this.saveQueue();
      this.notifyListeners();

      console.warn(`[PhotoUploadQueue] ✗ Photo ${photo.id} upload failed (attempt ${photo.attemptCount}): ${photo.lastError}`);
      return false;
    }
  }

  /**
   * Adaptive compression to fit within character limit
   */
  private async adaptiveCompress(photo: PendingPhoto): Promise<string> {
    const img = await this.loadImage(photo.photoData);

    let targetDim = 640;
    let quality = 0.72;
    let maxDim = 1280;
    const minDim = 160;
    const minQuality = 0.15;

    while (targetDim >= minDim && quality >= minQuality) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, targetDim);
      canvas.height = Math.max(1, Math.round(targetDim * (img.height / img.width)));

      const ctx = canvas.getContext("2d");
      if (!ctx) break;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);

      if (dataUrl.length <= photo.targetCharLimit) {
        return dataUrl;
      }

      // Reduce size
      targetDim = Math.max(minDim, Math.round(targetDim * 0.8));
      quality = Math.max(minQuality, quality - 0.08);
    }

    // Last resort - very small image
    const canvas = document.createElement("canvas");
    canvas.width = minDim;
    canvas.height = minDim;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, minDim, minDim);
      return canvas.toDataURL("image/jpeg", minQuality);
    }

    return "";
  }

  /**
   * Load image from data URL
   */
  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  }

  /**
   * Force retry all failed uploads
   */
  public forceRetryAll(): void {
    this.queue.forEach(p => {
      if (p.status === "failed") {
        p.status = "pending";
        p.lastError = undefined;
      }
    });
    this.saveQueue();
    this.notifyListeners();
    this.processQueue();
  }
}

// Singleton instance
export const photoUploadQueue = new PhotoUploadQueueService();
