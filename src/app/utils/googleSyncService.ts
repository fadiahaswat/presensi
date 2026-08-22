/**
 * ============================================================================
 * GOOGLE SHEETS CLOUD SYNC SERVICE
 * High-performance, Realtime-like Delta Synchronization Engine
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

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzulnnHPTuqMZ6FwkLb1_3ZKgH5HzYvm1zgG1MaxYeXKKoT0BL6W89q8hDmChB5S94aHQ/exec";
const GAS_URL_KEY = "presensi_gas_url";
const LAST_SYNC_KEY = "presensi_last_sync_timestamp_v5";
const QUEUE_KEY = "presensi_sync_outbox_queue_v5";

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

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(GAS_URL_KEY);
      if (saved && !saved.includes("AKfycbxX2GM9")) {
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

    // Listeners for network & visibility
    window.addEventListener("online", () => {
      this.updateStatus();
      this.flushQueue();
      this.pollDelta();
    });

    window.addEventListener("offline", () => {
      this.updateStatus();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // Tab became visible: trigger quick delta check & resume interval
        this.pollDelta();
        this.startSmartPolling();
      } else {
        // Tab hidden: pause polling to save battery and network
        this.stopSmartPolling();
      }
    });

    // Start polling if configured and online
    this.startSmartPolling();
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string): void {
    this.gasUrl = url.trim();
    try {
      localStorage.setItem(GAS_URL_KEY, this.gasUrl);
    } catch (_) {}
    this.updateStatus();
    if (this.gasUrl) {
      this.startSmartPolling();
      this.pollDelta();
    } else {
      this.stopSmartPolling();
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

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
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

  private updateStatus(newStatus?: SyncStatus, errorMsg?: string) {
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

  /**
   * Enqueue a record for asynchronous upsert or delete
   */
  public enqueue(table: string, record: any, action: "upsert" | "delete" = "upsert", immediate: boolean = false) {
    const id = String(record.id || crypto.randomUUID());
    const now = new Date().toISOString();
    
    // Normalisasi record dengan timestamps
    const normalizedRecord = {
      ...record,
      id,
      updated_at: now,
      created_at: record.created_at || now,
      is_deleted: action === "delete"
    };

    // Remove existing pending item with same id & table if present
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
      // Ultra-fast debounce flush (150ms)
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => {
        this.flushQueue();
      }, 150);
    }
  }

  /**
   * Test Connection with latency benchmark
   */
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

  /**
   * Alias for flushQueue to support manual trigger buttons
   */
  public async flush(): Promise<boolean> {
    return this.flushQueue();
  }

  /**
   * Flush Queue (Send all pending outbox records in 1 multi-table request)
   */
  public async flushQueue(): Promise<boolean> {
    if (!this.gasUrl || this.queue.length === 0 || this.isFlushing || !navigator.onLine) {
      return false;
    }

    this.isFlushing = true;
    this.updateStatus("syncing");

    try {
      // Group queue by table
      const tablesPayload: Record<string, any[]> = {};
      const batchItems = [...this.queue];

      batchItems.forEach(item => {
        if (!tablesPayload[item.table]) {
          tablesPayload[item.table] = [];
        }
        tablesPayload[item.table].push(item.record);
      });

      const res = await fetch(this.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "multi_table_upsert",
          tables: tablesPayload
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const resData = await res.json();
      if (resData.status === "success") {
        // Remove successfully flushed items from queue
        const flushedIds = new Set(batchItems.map(b => `${b.table}:${b.id}`));
        this.queue = this.queue.filter(q => !flushedIds.has(`${q.table}:${q.id}`));
        this.saveQueue();

        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

        this.updateStatus(this.queue.length > 0 ? "pending" : "synced");
        this.isFlushing = false;
        return true;
      } else {
        throw new Error(resData.message || "Gagal menyimpan ke Google Sheet");
      }
    } catch (err: any) {
      this.updateStatus("error", err.message || err.toString());
      this.isFlushing = false;
      return false;
    }
  }

  /**
   * Fetch All Data from Cloud (Initial hydration or force pull)
   */
  public async fetchAllFromCloud(): Promise<Record<string, any[]> | null> {
    if (!this.gasUrl || !navigator.onLine) return null;

    this.updateStatus("syncing");
    try {
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_all&_t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", mode: "cors" });
      
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const json = await res.json();
      if (json.status === "success" && json.data) {
        const nowIso = new Date().toISOString();
        this.lastSyncedAt = nowIso;
        try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

        // Emit full-replace updates to listeners (includes empty arrays to wipe stale cache)
        for (const tableName in json.data) {
          if (Object.prototype.hasOwnProperty.call(json.data, tableName)) {
            const tableRecords = Array.isArray(json.data[tableName]) ? json.data[tableName] : [];
            this.dataListeners.forEach(fn => fn(tableName, tableRecords, true));
          }
        }

        this.updateStatus("synced");
        return json.data;
      }
      return null;
    } catch (err: any) {
      this.updateStatus("error", err.message || err.toString());
      return null;
    }
  }

  /**
   * Fetch Delta updates (only records updated since last sync)
   */
  public async pollDelta(): Promise<void> {
    if (!this.gasUrl || !navigator.onLine || this.isPolling || this.isFlushing) return;

    this.isPolling = true;
    try {
      const since = this.lastSyncedAt || "";
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_all_delta&since=${encodeURIComponent(since)}&_t=${Date.now()}`;
      
      const res = await fetch(url, { method: "GET", mode: "cors" });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          let hasUpdates = false;
          for (const tableName in json.data) {
            if (Object.prototype.hasOwnProperty.call(json.data, tableName)) {
              const tableRecords = json.data[tableName];
              if (Array.isArray(tableRecords) && tableRecords.length > 0) {
                hasUpdates = true;
                this.dataListeners.forEach(fn => fn(tableName, tableRecords));
              }
            }
          }

          const nowIso = new Date().toISOString();
          this.lastSyncedAt = nowIso;
          try { localStorage.setItem(LAST_SYNC_KEY, nowIso); } catch (_) {}

          if (this.queue.length === 0) {
            this.updateStatus("synced");
          }
        }
      }
    } catch (_) {
      // Delta polling fail quietly to avoid disturbing user
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Reset All Data (Clean local caches, empty outbox, and wipe sheet database)
   */
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

  public startSmartPolling(intervalMs: number = 20000) {
    this.stopSmartPolling();
    if (!this.gasUrl) return;

    this.pollIntervalTimer = setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        this.pollDelta();
      }
    }, intervalMs);
  }

  public stopSmartPolling() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }
}

export const googleSyncService = new GoogleSyncService();
