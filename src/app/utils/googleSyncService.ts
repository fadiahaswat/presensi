/**
 * ============================================================================
 * GOOGLE SHEETS CLOUD SYNC SERVICE
 * Optimized for reliability and efficiency
 * FIXED v2: Better photo sync with consistent key matching
 * Photos: Full data stays in IndexedDB, cloud only has thumbnails
 * ============================================================================
 */

export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "error" | "unconfigured";

export interface SyncQueueItem {
  id: string;
  table: string;
  record: any;
  action: "upsert" | "delete";
  timestamp: string;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage?: string;
  gasUrl: string;
}

type SyncListener = (state: SyncState) => void;
type DataUpdateListener = (table: string, records: any[], isFullReplace?: boolean) => void;

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycby9N-DKmk-UmVZrt31b6uhX7OlpqJLtrSi5fwmkZxFXXxBTca25RedQUzeRzK6OizwGGA/exec";
const GAS_URL_KEY = "presensi_gas_url";
const LAST_SYNC_KEY = "presensi_last_sync_timestamp_v7"; // Bumped version - v7 has better photo sync
const QUEUE_KEY = "presensi_sync_outbox_queue_v7"; // Bumped version

// === OPTIMIZED CONFIG ===
const DEFAULT_TIMEOUT = 20000; // 20 detik - lebih lama untuk reliability
const FETCH_ALL_TIMEOUT = 30000; // 30 detik khusus fetchAllFromCloud
const MAX_RETRIES = 5; // Lebih banyak retry untuk reliability
const RETRY_BASE_DELAY = 500; // Mulai dengan delay lebih pendek
const POLL_DEBOUNCE_MS = 2000; // Debounce lebih pendek
const HEALTH_CHECK_TIMEOUT = 8000; // Health check lebih lama
const BATCH_SIZE = 5; // Batasi ukuran batch upload

// === PHOTO SYNC CONFIG ===
// Standard photo field names across all tables
const PHOTO_FIELDS = ['photoUrl', 'fotoSantriUrl', 'lampiranUrl', 'imageUrl', 'avatarUrl', 'photo', 'foto'];
// Table name mappings (cloud name -> local key prefix)
const TABLE_NAME_MAP: Record<string, string> = {
  'logbook': 'logbook',
  'Logbook': 'logbook',
  'jurnal_logbook': 'logbook',
  'JurnalLogbook': 'logbook',
  'mutabaah': 'mutabaah',
  'Mutabaah': 'mutabaah',
  'mutabaah_yaumiyah': 'mutabaah',
  'MutabaahYaumiyah': 'mutabaah',
  'izin': 'izin',
  'Izin': 'izin',
  'santri_sakit': 'santrisakit',
  'SantriSakit': 'santrisakit',
  'records': 'records',
  'Records': 'records',
};

class GoogleSyncService {
  private gasUrl: string = DEFAULT_GAS_URL;
  private status: SyncStatus = "unconfigured";
  private lastSyncedAt: string | null = null;
  private queue: SyncQueueItem[] = [];
  private listeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataUpdateListener> = new Set();
  private flushTimer: any = null;
  private pollIntervalTimer: any = null;
  private isFlushing: boolean = false;
  private isPolling: boolean = false;
  private lastPollAttempt = 0;

  // === REQUEST DEDUPLICATION ===
  private pendingRequests: Map<string, AbortController> = new Map();

  // === CONNECTION HEALTH ===
  private isHealthy: boolean = true;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;
  private pollInterval: number = 30000; // 30s default, daha lambat
  private minPollInterval: number = 15000; // Minimum 15s
  private maxPollInterval: number = 300000; // Maximum 5min

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(GAS_URL_KEY);
      if (saved && !saved.includes("AKfycbxX2GM9") && !saved.includes("AKfycbzulnnHPTuqMZ6FwkLb1_3ZKgH5HzYvm1zgG1MaxYeXKKoT0BL6W89q8hDmChB5S94aHQ") && !saved.includes("AKfycbynVevPWfXU1u6ylxyM6Fn8-NRqBsnz2N4LJHrv6FNru5zqD0DrmH5Slw-_cZ1aJO3nOw")) {
        this.gasUrl = saved;
      } else {
        this.gasUrl = DEFAULT_GAS_URL;
        localStorage.setItem(GAS_URL_KEY, DEFAULT_GAS_URL);
      }
      this.lastSyncedAt = localStorage.getItem(LAST_SYNC_KEY) || null;
      const savedQueue = localStorage.getItem(QUEUE_KEY);
      if (savedQueue) {
        const parsed: SyncQueueItem[] = JSON.parse(savedQueue);
        this.queue = Array.isArray(parsed) ? parsed.filter(q => Boolean(q && q.id && q.table)) : [];
      }
    } catch (_) {}

    this.updateStatus();

    window.addEventListener("online", () => {
      this.isHealthy = true; // Reset on online event
      this.updateStatus();
      this.scheduleHealthCheck();
    });

    window.addEventListener("offline", () => {
      this.isHealthy = false;
      this.updateStatus();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.pollDelta();
      }
    });

    // Start polling only after health check
    this.scheduleHealthCheck();
  }

  /**
   * Schedule health check before starting sync
   */
  private scheduleHealthCheck() {
    setTimeout(() => this.checkConnectivity(), 1000);
  }

  /**
   * Quick connectivity check - light ping
   */
  private async checkConnectivity(): Promise<boolean> {
    if (!this.gasUrl || !navigator.onLine) {
      this.isHealthy = false;
      return false;
    }

    try {
      const pingUrl = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=ping&_t=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      const res = await fetch(pingUrl, { method: "GET", mode: "cors", signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        this.startPolling();
        return true;
      }
    } catch (_) {}

    this.consecutiveFailures++;
    this.isHealthy = this.consecutiveFailures < this.maxConsecutiveFailures;

    // Retry health check with backoff
    if (this.consecutiveFailures < this.maxConsecutiveFailures) {
      const delay = Math.min(5000 * Math.pow(2, this.consecutiveFailures), 30000);
      setTimeout(() => this.checkConnectivity(), delay);
    }

    return this.isHealthy;
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string): void {
    this.gasUrl = url.trim();
    try {
      localStorage.setItem(GAS_URL_KEY, this.gasUrl);
    } catch (_) {}
    this.isHealthy = true;
    this.consecutiveFailures = 0;
    this.updateStatus();
    if (this.gasUrl) {
      this.checkConnectivity();
    } else {
      this.stopPolling();
    }
  }

  public getState(): SyncState {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: this.queue.length,
      gasUrl: this.gasUrl
    };
  }

  public getStatus(): { isSyncing: boolean; status: SyncStatus } {
    return {
      isSyncing: this.status === "syncing" || this.isFlushing || this.isPolling,
      status: this.status
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStatus(listener: (status: { isSyncing: boolean; status: SyncStatus }) => void): () => void {
    return this.subscribe((state) => {
      listener({
        isSyncing: state.status === "syncing" || this.isFlushing || this.isPolling,
        status: state.status
      });
    });
  }

  public subscribeDataUpdates(listener: DataUpdateListener): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try { fn(state); } catch (_) {}
    });
  }

  private logDebug(operation: string, message: string) {
    console.log(`[SyncService] ${operation}: ${message}`);
  }

  private logWarn(operation: string, message: string) {
    console.warn(`[SyncService] ${operation}: ${message}`);
  }

  private logError(operation: string, message: string, attempt?: number) {
    console.error(`[SyncService] ${operation}: ${message}${attempt !== undefined ? ` (attempt ${attempt})` : ''}`);
  }

  /**
   * Cancel any pending request for this operation
   */
  private cancelPending(operation: string) {
    const existing = this.pendingRequests.get(operation);
    if (existing) {
      existing.abort();
      this.pendingRequests.delete(operation);
    }
  }

  /**
   * Fetch with retry + exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    operation: string,
    timeoutMs: number = DEFAULT_TIMEOUT,
    maxAttempts: number = MAX_RETRIES
  ): Promise<Response> {
    // Cancel any existing request for this operation
    this.cancelPending(operation);

    const controller = new AbortController();
    this.pendingRequests.set(operation, controller);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Create new controller for each attempt
      const attemptController = new AbortController();
      controller.signal.addEventListener('abort', () => attemptController.abort());

      const timeoutId = setTimeout(() => attemptController.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: attemptController.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.consecutiveFailures = 0;
          return response;
        }

        // Don't retry on client errors (400-499) - these indicate permanent failures
        if (response.status >= 400 && response.status < 500) {
          if (response.status === 408 || response.status === 429) {
            // 408 Request Timeout and 429 Too Many Requests are retryable
            lastError = new Error(`HTTP ${response.status}`);
            if (attempt < maxAttempts - 1) {
              const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
              this.logWarn(operation, `Retryable error ${response.status}, retrying in ${delay}ms...`);
              await this.sleep(delay);
              continue;
            }
          }
          // 404, 401, 403, etc. are NOT retryable
          lastError = new Error(`HTTP ${response.status} - Non-retryable client error`);
          this.logWarn(operation, `HTTP ${response.status} - Not retrying (client error)`);
          this.pendingRequests.delete(operation);
          throw lastError;
        }

        // Server errors (500+) are retryable
        lastError = new Error(`HTTP ${response.status}`);
        if (attempt < maxAttempts - 1) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
          this.logWarn(operation, `Server error ${response.status}, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          this.logError(operation, `Timeout/failed after ${timeoutMs}ms`, attempt);
          if (attempt === maxAttempts - 1) {
            this.handleFailure();
            this.pendingRequests.delete(operation);
            throw new Error(`Timeout after ${maxAttempts} attempts`);
          }
        } else {
          // Non-retryable errors (like 404) are already thrown above
          this.logWarn(operation, `Error: ${err.message}`);
          if (attempt === maxAttempts - 1) {
            this.handleFailure();
          }
        }

        // Retry on timeout or retryable errors
        if (attempt < maxAttempts - 1 && err.name === 'AbortError') {
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
          this.logDebug(operation, `retry ${attempt + 1}/${maxAttempts} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    this.pendingRequests.delete(operation);
    throw lastError || new Error(`Failed after ${maxAttempts} attempts`);
  }

  private handleFailure() {
    this.consecutiveFailures++;
    this.isHealthy = this.consecutiveFailures < this.maxConsecutiveFailures;

    // Slow down polling on failures
    if (this.pollInterval < this.maxPollInterval) {
      this.pollInterval = Math.min(this.pollInterval * 1.5, this.maxPollInterval);
      this.restartPolling();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create thumbnail from base64 image (for smaller display)
   */
  private createThumbnail(base64: string, maxWidth: number = 200): Promise<string> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality
        };
        img.onerror = () => resolve(base64); // Return original if fails
        img.src = base64;
      } catch {
        resolve(base64); // Return original if fails
      }
    });
  }

  /**
   * Check if field name is a photo field
   */
  private isPhotoField(fieldName: string): boolean {
    return PHOTO_FIELDS.some(f => fieldName.toLowerCase() === f.toLowerCase());
  }

  /**
   * Get table prefix for photo cache key
   */
  private getTablePrefix(tableName: string): string {
    return TABLE_NAME_MAP[tableName] || tableName.toLowerCase();
  }

  /**
   * Generate consistent photo cache key
   * Format: {tablePrefix}_{recordId}_{fieldName}
   * Examples: logbook_musyrif123_2026-08-25_photoUrl, mutabaah_musyrif123_2026-08-25_photoUrl
   */
  private getPhotoCacheKey(recordId: string, fieldName: string, tableName?: string): string {
    const prefix = tableName ? this.getTablePrefix(tableName) : 'record';
    return `${prefix}_${recordId}_${fieldName}`;
  }

  /**
   * Extract all photo fields from a record
   * Returns map of fieldName -> photoData
   */
  private extractPhotoFields(record: any): Map<string, string> {
    const photos = new Map<string, string>();
    if (!record || typeof record !== 'object') return photos;

    for (const [key, value] of Object.entries(record)) {
      if (this.isPhotoField(key) && typeof value === 'string' && value.startsWith('data:image')) {
        photos.set(key, value);
      }
    }
    return photos;
  }

  /**
   * Check if photo data is likely a thumbnail (small) vs full photo
   */
  private isLikelyThumbnail(photoData: string): boolean {
    return Boolean(photoData && (photoData.length < 30000 || photoData.startsWith('photo:') || photoData.startsWith('[PHOTO_REF:')));
  }

  /**
   * Check if photo data is a valid full resolution photo
   */
  private isLikelyFullPhoto(photoData: string): boolean {
    return Boolean(photoData && (photoData.startsWith('http') || (photoData.startsWith('data:image') && photoData.length >= 30000)));
  }

  private sanitizeData(data: any): any {
    // Preserve data integrity without truncating base64 images
    return data;
  }

  private updateStatus(newStatus?: SyncStatus, _errorMsg?: string) {
    if (!navigator.onLine) {
      this.status = "offline";
    } else if (!this.gasUrl) {
      this.status = "unconfigured";
    } else if (newStatus) {
      this.status = newStatus;
    } else if (this.queue.length > 0) {
      this.status = "pending";
    } else {
      this.status = "synced";
    }
    this.notify();
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (_) {}
  }

  public enqueue(table: string, record: any, action: "upsert" | "delete" = "upsert", immediate: boolean = false) {
    const id = String(record.id || crypto.randomUUID());
    const now = new Date().toISOString();

    const normalizedRecord = {
      ...record,
      id,
      updated_at: now,
      created_at: record.created_at || now,
      is_deleted: action === "delete"
    };

    this.queue = this.queue.filter(q => !(q.table === table && q.id === id));

    this.queue.push({
      id,
      table,
      record: normalizedRecord,
      action,
      timestamp: now
    });

    this.saveQueue();
    this.updateStatus("pending");

    if (immediate) {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushQueue();
    } else {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => {
        this.flushQueue();
      }, 200);
    }
  }

  public async testConnection(customUrl?: string): Promise<{ success: boolean; message: string; latency: number }> {
    const url = (customUrl || this.gasUrl).trim();
    if (!url) {
      return { success: false, message: "URL Google Apps Script belum diisi.", latency: 0 };
    }

    const startTime = performance.now();
    try {
      const pingUrl = `${url}${url.includes("?") ? "&" : "?"}action=ping&_t=${Date.now()}`;
      const res = await fetch(pingUrl, { method: "GET", mode: "cors" });
      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        throw new Error(`HTTP Status ${res.status}`);
      }

      const json = await res.json();
      if (json.status === "success") {
        return {
          success: true,
          message: `Terhubung dengan spreadsheet: "${json.spreadsheetName || 'Database Presensi'}"`,
          latency
        };
      } else {
        return { success: false, message: json.message || "Respon tidak valid dari server.", latency };
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: `Gagal terhubung: ${err.message || err.toString()}. Pastikan Deployment diatur ke 'Anyone'.`,
        latency
      };
    }
  }

  public async flush(): Promise<boolean> {
    return this.flushQueue();
  }

  public async flushQueue(): Promise<boolean> {
    if (!this.gasUrl || this.queue.length === 0 || this.isFlushing || !navigator.onLine) {
      return false;
    }

    // Skip if unhealthy
    if (!this.isHealthy && this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.logDebug('flushQueue', 'Skipping due to poor connection health');
      return false;
    }

    this.isFlushing = true;
    this.updateStatus("syncing");
    const operation = 'flushQueue';

    try {
      const tablesPayload: Record<string, any[]> = {};
      const batchItems = [...this.queue];
      let photoCount = 0;
      const photoCacheOperations: Array<{ table: string; id: string; field: string; data: string; photoId: string }> = [];
      const thumbnailOperations: Array<{ photoId: string; recordId: string; table: string; field: string; promise: Promise<string> }> = [];

      batchItems.forEach(item => {
        if (!tablesPayload[item.table]) {
          tablesPayload[item.table] = [];
        }

        let sanitized: any = {};
        try {
          sanitized = JSON.parse(JSON.stringify(item.record));
        } catch (_) {
          sanitized = { ...item.record };
        }

        const tablePrefix = this.getTablePrefix(item.table);

        const sanitizeNode = (node: any) => {
          if (!node || typeof node !== "object") return;
          for (const k in node) {
            const val = node[k];

            // Handle photo fields - extract and cache locally, send reference only in main table
            if (typeof val === "string" && val.startsWith("data:image")) {
              photoCount++;
              const photoId = `photo_${tablePrefix}_${item.id}_${k}`;

              // Queue photo for caching (FULL photo - stored locally in IndexedDB)
              photoCacheOperations.push({
                table: item.table,
                id: item.id,
                field: k,
                photoId,
                data: val
              });

              // Queue thumbnail generation for separate Photos table
              const thumbPromise = this.createThumbnail(val, 180);
              thumbnailOperations.push({
                photoId,
                recordId: item.id,
                table: item.table,
                field: k,
                promise: thumbPromise
              });

              // In main table: only store lightweight reference!
              node[k] = `photo:${photoId}`;
              node[`hasPhoto_${k}`] = true;

            } else if (typeof val === "string" && val.length > 46000) {
              // Truncate non-photo strings
              node[k] = val.substring(0, 46000);
            } else if (val && typeof val === "object") {
              sanitizeNode(val);
            }
          }
        };

        sanitizeNode(sanitized);
        tablesPayload[item.table].push(sanitized);
      });

      // Log photo extraction
      if (photoCount > 0) {
        console.log(`[SyncService] flushQueue: extracted ${photoCount} photos for isolated sync`);
      }

      // Cache FULL photos to IndexedDB FIRST (before network call)
      await this.cachePhotosBatch(photoCacheOperations);

      // PHASE 1: Upload text metadata to cloud (super lightweight, < 1KB per record)
      const res = await this.fetchWithRetry(
        this.gasUrl,
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "multi_table_upsert",
            tables: tablesPayload
          })
        },
        operation,
        DEFAULT_TIMEOUT
      );

      const resData = await res.json();
      if (resData.status === "success") {
        const flushedIds = new Set(batchItems.map(b => `${b.table}:${b.id}`));
        this.queue = this.queue.filter(q => !flushedIds.has(`${q.table}:${q.id}`));
        this.saveQueue();

        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

        // Speed up polling after successful sync
        if (this.pollInterval > this.minPollInterval) {
          this.pollInterval = Math.max(this.pollInterval * 0.8, this.minPollInterval);
          this.restartPolling();
        }

        this.updateStatus(this.queue.length > 0 ? "pending" : "synced");
        this.isFlushing = false;
        this.pendingRequests.delete(operation);

        console.log(`[SyncService] Phase 1 text sync completed - ${batchItems.length} items synced, ${photoCount} full photos cached locally`);

        // PHASE 2: Upload photos to separate "Photos" table in background (Non-blocking & isolated)
        if (thumbnailOperations.length > 0) {
          this.uploadPhotosBackground(thumbnailOperations);
        }

        return true;
      } else {
        console.warn(`[SyncService] Upload failed but photos cached locally: ${resData.message}`);
        this.updateStatus("pending");
        this.isFlushing = false;
        this.pendingRequests.delete(operation);
        return false;
      }
    } catch (err: any) {
      console.warn(`[SyncService] Upload error but photos cached locally: ${err.message}`);
      this.updateStatus("pending");
      this.isFlushing = false;
      this.pendingRequests.delete(operation);
      return false;
    }
  }

  /**
   * Phase 2: Background upload for photos to dedicated Photos sheet
   * Isolated from main text queue so failure never affects core data
   */
  private async uploadPhotosBackground(
    thumbnailOperations: Array<{ photoId: string; recordId: string; table: string; field: string; promise: Promise<string> }>
  ): Promise<void> {
    try {
      const thumbnailResults = await Promise.allSettled(
        thumbnailOperations.map(op => op.promise)
      );

      const photoRecords: any[] = [];
      thumbnailOperations.forEach((op, idx) => {
        const result = thumbnailResults[idx];
        const thumbData = (result.status === 'fulfilled' && result.value.length < 46000) ? result.value : "";
        if (thumbData) {
          photoRecords.push({
            id: op.photoId,
            record_id: op.recordId,
            table_source: op.table,
            field_key: op.field,
            photo_data: thumbData,
            timestamp: Date.now()
          });
        }
      });

      if (photoRecords.length === 0) return;

      console.log(`[SyncService] Phase 2: Uploading ${photoRecords.length} photo(s) to separate Photos table...`);

      const res = await fetch(this.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "batch_upsert",
          table: "Photos",
          records: photoRecords
        })
      });

      const json = await res.json();
      if (json.status === "success") {
        console.log(`[SyncService] Phase 2 photo upload successful (${photoRecords.length} photos synced to Photos tab)`);
      } else {
        console.warn(`[SyncService] Phase 2 photo upload responded with non-success:`, json.message);
      }
    } catch (e) {
      console.warn('[SyncService] Phase 2 photo upload error (core text data remains safe):', e);
    }
  }

  /**
   * Batch cache photos to IndexedDB (non-blocking)
   * Uses consistent key format: {tablePrefix}_{recordId}_{fieldName} and photoId
   */
  private async cachePhotosBatch(operations: Array<{ table: string; id: string; field: string; data: string; photoId?: string }>): Promise<void> {
    if (operations.length === 0) return;

    try {
      const { setPhotosBatch } = await import('./photoCacheService');

      const photosToCache: Array<{ id: string; data: string }> = [];
      operations.forEach(op => {
        const tablePrefix = this.getTablePrefix(op.table);
        const cacheKey = `${tablePrefix}_${op.id}_${op.field}`;
        photosToCache.push({ id: cacheKey, data: op.data });
        if (op.photoId && op.photoId !== cacheKey) {
          photosToCache.push({ id: op.photoId, data: op.data });
        }
      });

      await setPhotosBatch(photosToCache);
      console.log(`[SyncService] Batch cached ${photosToCache.length} photo entries to IndexedDB`);

      // Also cache in memory with consistent keys
      for (const op of operations) {
        const tablePrefix = this.getTablePrefix(op.table);
        const cacheKey = `${tablePrefix}_${op.id}_${op.field}`;
        this.cacheInMemory(cacheKey, op.data);
        if (op.photoId) {
          this.cacheInMemory(op.photoId, op.data);
        }
      }
    } catch (e) {
      console.debug('[SyncService] Batch photo cache failed:', e);
    }
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.updateStatus("synced");
  }

  /**
   * Get cached data from localStorage as fallback
   */
  private getCachedData(): Record<string, any[]> {
    const cached: Record<string, any[]> = {};
    const tableKeys: Record<string, string> = {
      'attendance': 'presensi_attendance_records_v5',
      'izin': 'presensi_izin_requests_v5',
      'kegiatan_asrama': 'presensi_kegiatan_asrama_v5',
      'jurnal_logbook': 'presensi_jurnal_logbook_v5',
      'mutabaah_yaumiyah': 'presensi_mutabaah_yaumiyah_v5',
      'santri_sakit': 'presensi_santri_sakit_v5',
      'musyrif': 'presensi_musyrif_master_v5',
      'santri': 'presensi_santri_master_v10'
    };

    for (const [table, key] of Object.entries(tableKeys)) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          cached[table] = Array.isArray(parsed) ? parsed : [];
        }
      } catch (_) {}
    }

    return cached;
  }

  /**
   * Fetch data - prioritizes local cache with full photos over cloud data
   * Cloud data may only have thumbnails, local data has full photos from IndexedDB
   */
  public async fetchAllFromCloud(forceRefresh: boolean = false): Promise<Record<string, any[]> | null> {
    if (!this.gasUrl || !navigator.onLine) {
      // Offline: use local cache
      return this.getMergedLocalData();
    }

    // If not forcing refresh and we have local data, use it first
    if (!forceRefresh && !this.shouldRefreshFromCloud()) {
      const localData = this.getMergedLocalData();
      if (localData && Object.keys(localData).length > 0) {
        console.log('[SyncService] Using local cache (no refresh needed)');
        return localData;
      }
    }

    // Skip if unhealthy
    if (!this.isHealthy && this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.logDebug('fetchAllFromCloud', 'Skipping due to poor connection health, using local cache');
      return this.getMergedLocalData();
    }

    this.updateStatus("syncing");
    const operation = 'fetchAllFromCloud';

    try {
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_all&_t=${Date.now()}`;
      const res = await this.fetchWithRetry(url, { method: "GET", mode: "cors" }, operation, FETCH_ALL_TIMEOUT);

      const json = await res.json();
      const sanitizedData = this.sanitizeData(json.data);

      if (json.status === "success" && sanitizedData) {
        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

        // Cache any incoming Photos table records to IndexedDB
        const photoTableNames = ["Photos", "Foto_Logbook", "Foto_SantriSakit", "Foto_Izin"];
        for (const ptName of photoTableNames) {
          if (Array.isArray(sanitizedData[ptName]) && sanitizedData[ptName].length > 0) {
            try {
              const { setPhotosBatch } = await import('./photoCacheService');
              const photoItems = sanitizedData[ptName]
                .map((p: any) => ({
                  id: p.id,
                  data: p.photo_data || p.photoUrl || p.data || p.photoData
                }))
                .filter((p: any) => Boolean(p.id && p.data && typeof p.data === 'string' && p.data.trim() !== ''));
              if (photoItems.length > 0) {
                await setPhotosBatch(photoItems);
              }
            } catch (_) {}
          }
        }

        // Merge local photos & resolve photo references
        await this.mergeLocalPhotos(sanitizedData);

        // Notify listeners of cloud data
        for (const tableName in sanitizedData) {
          if (Object.prototype.hasOwnProperty.call(sanitizedData, tableName)) {
            const tableRecords = Array.isArray(sanitizedData[tableName]) ? sanitizedData[tableName] : [];
            this.dataListeners.forEach(fn => fn(tableName, tableRecords, true));
          }
        }

        this.updateStatus("synced");
        console.log(`[SyncService] fetchAllFromCloud completed successfully`);
        this.pendingRequests.delete(operation);
        return sanitizedData;
      }
      this.pendingRequests.delete(operation);
      return this.getMergedLocalData();
    } catch (err: any) {
      const errorMsg = err.message || err.toString();
      this.logWarn(operation, `Failed: ${errorMsg}. Using local cache with full photos.`);

      // FALLBACK: Use local data (which has full photos)
      const localData = this.getMergedLocalData();
      if (localData && Object.keys(localData).length > 0) {
        console.log(`[SyncService] fetchAllFromCloud: Using local cache with full photos as fallback`);
        this.updateStatus("synced"); // Not error because we have local data
        for (const tableName in localData) {
          this.dataListeners.forEach(fn => fn(tableName, localData[tableName], true));
        }
        this.pendingRequests.delete(operation);
        return localData;
      }

      // No local data available
      this.updateStatus("error", `Sync gagal: ${errorMsg}. Coba lagi dalam beberapa menit.`);
      this.pendingRequests.delete(operation);
      return null;
    }
  }

  /**
   * Check if we should refresh from cloud based on last sync time
   */
  private shouldRefreshFromCloud(): boolean {
    if (!this.lastSyncedAt) return true;
    const lastSync = new Date(this.lastSyncedAt).getTime();
    const now = Date.now();
    // Refresh if last sync was more than 5 minutes ago
    return (now - lastSync) > 5 * 60 * 1000;
  }

  /**
   * Get local data merged with cached photos from IndexedDB
   * This ensures we have FULL photos, not just thumbnails from cloud
   */
  private getMergedLocalData(): Record<string, any[]> | null {
    const cachedData = this.getCachedData();
    if (Object.keys(cachedData).length === 0) return null;

    // Merge with photos from IndexedDB
    this.mergeLocalPhotos(cachedData);

    return cachedData;
  }

  /**
   * Merge local full photos from IndexedDB into cached data
   * Resolves photo: references and upgrades small thumbnails to full photos
   */
  private async mergeLocalPhotos(data: Record<string, any[]>): Promise<void> {
    try {
      const { getPhoto } = await import('./photoCacheService');

      for (const tableName of Object.keys(data)) {
        if (!Array.isArray(data[tableName])) continue;

        const tablePrefix = this.getTablePrefix(tableName);

        for (const record of data[tableName]) {
          if (!record?.id) continue;

          // Check all photo fields dynamically
          for (const field of PHOTO_FIELDS) {
            if (!record[field]) continue;

            const photoValue = record[field];
            if (typeof photoValue !== 'string' || !photoValue.trim()) continue;

            const isRef = photoValue.startsWith('photo:') || photoValue.startsWith('[PHOTO_REF:');
            const photoId = isRef ? photoValue.replace(/^photo:/, '').replace(/^\[PHOTO_REF:/, '').replace(/\]$/, '') : '';

            const cacheKeys = [
              ...(photoId ? [photoId] : []),
              this.getPhotoCacheKey(record.id, field, tablePrefix),
              `${tablePrefix}_${record.id}_${field}`,
              `${tableName}_${record.id}_${field}`,
              `${record.id}_${field}`,
            ];

            for (const cacheKey of cacheKeys) {
              const cached = await getPhoto(cacheKey);
              if (cached?.data && cached.data.startsWith('data:image')) {
                if (isRef || cached.data.length > photoValue.length) {
                  record[field] = cached.data;
                  break;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[SyncService] Failed to merge local photos:', e);
    }
  }

  /**
   * Cache photo for a specific record
   * Called after saving a record to ensure we have the full photo
   */
  public async cacheRecordPhoto(recordId: string, fieldName: string, photoData: string, tableName?: string): Promise<void> {
    const cacheKey = this.getPhotoCacheKey(recordId, fieldName, tableName);

    // Cache in memory
    this.cacheInMemory(cacheKey, photoData);

    // Cache in IndexedDB
    try {
      const { setPhoto } = await import('./photoCacheService');
      await setPhoto(cacheKey, photoData);
      console.log(`[SyncService] Cached photo ${cacheKey} (${(photoData.length / 1024).toFixed(1)}KB)`);
    } catch (e) {
      console.warn('[SyncService] Failed to cache photo:', e);
    }
  }

  /**
   * Get photo for a record - checks cache first, then returns provided data
   */
  public async getRecordPhoto(recordId: string, fieldName: string, currentData: string | null | undefined, tableName?: string): Promise<string | null> {
    // If we already have full data, return it
    if (currentData && this.isLikelyFullPhoto(currentData)) {
      return currentData;
    }

    // Try cache
    const cacheKey = this.getPhotoCacheKey(recordId, fieldName, tableName);

    // Check memory cache first
    const memoryCached = this.memoryPhotoCache.get(cacheKey);
    if (memoryCached && this.isLikelyFullPhoto(memoryCached.data)) {
      return memoryCached.data;
    }

    // Check IndexedDB
    try {
      const { getPhoto } = await import('./photoCacheService');
      const cached = await getPhoto(cacheKey);
      if (cached?.data && this.isLikelyFullPhoto(cached.data)) {
        return cached.data;
      }
    } catch (_) {}

    // Return whatever we have (could be thumbnail or null)
    return currentData || null;
  }

  public async pollDelta(): Promise<void> {
    if (!this.gasUrl || !navigator.onLine || this.isPolling || this.isFlushing) return;

    // Skip if unhealthy (graceful degradation)
    if (!this.isHealthy && this.consecutiveFailures >= this.maxConsecutiveFailures) {
      return;
    }

    // Debounce
    const now = Date.now();
    if (now - this.lastPollAttempt < POLL_DEBOUNCE_MS) return;
    this.lastPollAttempt = now;

    this.isPolling = true;
    const startTime = performance.now();
    const operation = 'pollDelta';

    try {
      const since = this.lastSyncedAt || "";
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_all_delta&since=${encodeURIComponent(since)}&_t=${Date.now()}`;

      const res = await this.fetchWithRetry(url, { method: "GET", mode: "cors" }, operation, DEFAULT_TIMEOUT);
      const latency = Math.round(performance.now() - startTime);

      // Track latency for adaptive polling
      if (latency < 2000 && this.pollInterval > this.minPollInterval) {
        this.pollInterval = Math.max(this.pollInterval * 0.9, this.minPollInterval);
        this.restartPolling();
      }

      const json = await res.json();

      if (json.status === "success" && json.data) {
        let hasUpdates = false;

        // Cache any delta Photos table records to IndexedDB
        if (Array.isArray(json.data["Photos"]) && json.data["Photos"].length > 0) {
          try {
            const { setPhotosBatch } = await import('./photoCacheService');
            const photoItems = json.data["Photos"]
              .map((p: any) => ({
                id: p.id,
                data: p.photo_data || p.photoUrl || p.data || p.photoData
              }))
              .filter((p: any) => Boolean(p.id && p.data));
            if (photoItems.length > 0) {
              await setPhotosBatch(photoItems);
            }
          } catch (_) {}
        }

        // Merge local photos & resolve references
        await this.mergeLocalPhotos(json.data);

        for (const tableName in json.data) {
          if (Object.prototype.hasOwnProperty.call(json.data, tableName)) {
            const tableRecords = json.data[tableName];
            if (Array.isArray(tableRecords) && tableRecords.length > 0) {
              hasUpdates = true;
              this.dataListeners.forEach(fn => fn(tableName, tableRecords));
            }
          }
        }

        if (hasUpdates && this.pollInterval > this.minPollInterval) {
          this.pollInterval = Math.max(this.pollInterval * 0.8, this.minPollInterval);
          this.restartPolling();
        }

        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

        if (this.queue.length === 0) {
          this.updateStatus("synced");
        }
      }
    } catch (_) {
      // Silent failure - polling should not disturb user
    } finally {
      this.isPolling = false;
      this.pendingRequests.delete(operation);
    }
  }

  public async resetAllData(): Promise<boolean> {
    this.queue = [];
    this.saveQueue();
    try {
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      localStorage.removeItem("presensi_attendance_records_v5");
      localStorage.removeItem("presensi_attendance_records_v2");
      localStorage.removeItem("presensi_izin_requests_v5");
      localStorage.removeItem("presensi_izin_requests_v2");
      localStorage.removeItem("presensi_kegiatan_asrama_v5");
      localStorage.removeItem("presensi_kegiatan_asrama_v2");
      localStorage.removeItem("presensi_jurnal_logbook_v5");
      localStorage.removeItem("presensi_jurnal_logbook_v2");
      localStorage.removeItem("presensi_mutabaah_yaumiyah_v5");
      localStorage.removeItem("presensi_mutabaah_yaumiyah_v2");
      localStorage.removeItem("presensi_santri_sakit_v5");
      localStorage.removeItem("presensi_santri_sakit_v2");
      localStorage.removeItem("presensi_santri_izin_v5");
      localStorage.removeItem("presensi_santri_master_v10");
      localStorage.removeItem("presensi_santri_change_requests_v1");
      localStorage.removeItem("presensi_musyrif_master_v5");
      localStorage.removeItem("presensi_musyrif_master_v2");
      localStorage.removeItem("presensi_auth_users_master_v5");
      localStorage.removeItem("presensi_sunnah_fasts");
      localStorage.removeItem("presensi_gas_url");
    } catch (_) {}

    if (this.gasUrl && navigator.onLine) {
      this.updateStatus("syncing");
      try {
        await fetch(this.gasUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "reset_all_data" })
        });
      } catch (_) {}
    }

    const nowIso = new Date().toISOString();
    this.lastSyncedAt = nowIso;
    try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}
    this.updateStatus("synced");
    return true;
  }

  private startPolling() {
    this.stopPolling();
    if (!this.gasUrl || !navigator.onLine) return;

    this.pollIntervalTimer = setInterval(() => {
      if (navigator.onLine && !document.hidden && this.isHealthy) {
        this.pollDelta();
      }
    }, this.pollInterval);
  }

  private restartPolling() {
    if (this.pollIntervalTimer) {
      this.startPolling();
    }
  }

  public stopPolling() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }

  public async syncTable(tableName: string): Promise<boolean> {
    if (!this.gasUrl || !navigator.onLine) return false;

    try {
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_table&table=${encodeURIComponent(tableName)}&_t=${Date.now()}`;
      const res = await this.fetchWithRetry(url, { method: "GET", mode: "cors" }, `syncTable(${tableName})`);

      const json = await res.json();
      if (json.status === "success" && json.data) {
        const records = Array.isArray(json.data) ? json.data : [];
        this.dataListeners.forEach(fn => fn(tableName, records, true));
        return true;
      }
    } catch (_e) {}
    return false;
  }

  public skipTableQueue(tableName: string): void {
    this.queue = this.queue.filter(q => q.table !== tableName);
    this.saveQueue();
    this.updateStatus();
  }

  // === PHOTO LAZY LOADING ===

  /**
   * In-memory photo cache (faster than IndexedDB for frequently accessed)
   */
  private memoryPhotoCache: Map<string, { data: string; timestamp: number }> = new Map();
  private readonly MAX_MEMORY_CACHE = 50;

  /**
   * Get photo by ID - returns from cache or fetches from cloud
   * This is the main method for lazy loading photos
   */
  public async getPhoto(recordId: string, photoField: string = 'photoUrl'): Promise<string | null> {
    const cacheKey = `${recordId}_${photoField}`;

    // 1. Check memory cache first (fastest)
    const memoryCached = this.memoryPhotoCache.get(cacheKey);
    if (memoryCached) {
      return memoryCached.data;
    }

    // 2. Check IndexedDB cache
    try {
      const { getPhoto: getCached } = await import('./photoCacheService');
      const cached = await getCached(cacheKey);
      if (cached) {
        this.cacheInMemory(cacheKey, cached.data);
        return cached.data;
      }
    } catch (_) {}

    // 3. Fetch from cloud (this would need GAS endpoint)
    // For now, return null - photo will be embedded in record data
    return null;
  }

  /**
   * Cache photo in both memory and IndexedDB
   */
  public async cachePhoto(recordId: string, photoField: string, data: string): Promise<void> {
    const cacheKey = `${recordId}_${photoField}`;

    // Memory cache
    this.cacheInMemory(cacheKey, data);

    // IndexedDB cache (async, don't wait)
    try {
      const { setPhoto } = await import('./photoCacheService');
      setPhoto(cacheKey, data).catch(() => {});
    } catch (_) {}
  }

  private cacheInMemory(key: string, data: string): void {
    // Evict oldest if at capacity
    if (this.memoryPhotoCache.size >= this.MAX_MEMORY_CACHE) {
      const oldestKey = this.memoryPhotoCache.keys().next().value;
      if (oldestKey) {
        this.memoryPhotoCache.delete(oldestKey);
      }
    }
    this.memoryPhotoCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Extract photo references from records for batch prefetching
   */
  public extractPhotoRefs(records: any[]): Array<{ id: string; field: string; data: string }> {
    const refs: Array<{ id: string; field: string; data: string }> = [];
    const photoFields = ['photoUrl', 'fotoSantriUrl', 'lampiranUrl', 'imageUrl', 'avatarUrl'];

    for (const record of records) {
      if (!record?.id) continue;
      for (const field of photoFields) {
        const data = record[field];
        if (data && typeof data === 'string' && data.startsWith('data:image')) {
          refs.push({ id: record.id, field, data });
        }
      }
    }

    return refs;
  }

  /**
   * Batch cache photos extracted from records
   * Call this after fetching records to cache their photos
   */
  public async cacheRecordPhotos(records: any[]): Promise<void> {
    const refs = this.extractPhotoRefs(records);

    for (const ref of refs) {
      await this.cachePhoto(ref.id, ref.field, ref.data);
    }

    // Cleanup old cache entries
    try {
      const { cleanup } = await import('./photoCacheService');
      cleanup(200);
    } catch (_) {}
  }

  /**
   * Clear all photo caches
   */
  public async clearPhotoCaches(): Promise<void> {
    this.memoryPhotoCache.clear();

    try {
      const { clearCache } = await import('./photoCacheService');
      await clearCache();
    } catch (_) {}
  }

  public getSyncMetrics(): {
    queueSize: number;
    lastSyncedAt: string | null;
    isPolling: boolean;
    isFlushing: boolean;
    pollInterval: number;
    connectionHealth: "good" | "degraded" | "poor";
  } {
    return {
      queueSize: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      isPolling: this.isPolling,
      isFlushing: this.isFlushing,
      pollInterval: this.pollInterval,
      connectionHealth: this.isHealthy ? "good" : this.consecutiveFailures < 3 ? "degraded" : "poor",
    };
  }
}

export const googleSyncService = new GoogleSyncService();
