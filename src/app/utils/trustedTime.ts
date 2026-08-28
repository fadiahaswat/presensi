/**
 * Trusted Server Time Synchronization Service
 * Menjaga integritas waktu presensi dan mencegah Time Spoofing (manipulasi jam perangkat).
 */

export interface TimeSyncState {
  offsetMs: number;
  lastSynced: number | null;
  status: "syncing" | "synced" | "error" | "drift_detected";
  driftMinutes: number;
  serverDate: Date;
  source: string;
}

let currentOffsetMs = 0;
let lastSyncTimestamp: number | null = null;
let currentStatus: TimeSyncState["status"] = "syncing";
let currentDriftMinutes = 0;
let syncSource = "Local Clock";
let isSyncing = false; // Prevent concurrent sync attempts

const listeners = new Set<(state: TimeSyncState) => void>();

function notifyListeners() {
  const state: TimeSyncState = {
    offsetMs: currentOffsetMs,
    lastSynced: lastSyncTimestamp,
    status: currentStatus,
    driftMinutes: currentDriftMinutes,
    serverDate: getTrustedDate(),
    source: syncSource,
  };
  listeners.forEach((fn) => fn(state));
}

/**
 * Mendapatkan objek Date yang telah dikalibrasi dengan jam server.
 * Mencegah kecurangan presensi dengan memajukan/memundurkan jam HP/Laptop.
 */
export function getTrustedDate(): Date {
  return new Date(Date.now() + currentOffsetMs);
}

export function getTrustedTimeOffset(): number {
  return currentOffsetMs;
}

/**
 * Melakukan sinkronisasi waktu ke server waktu otoritatif.
 * Menggunakan multiple fallbacks dengan error handling yang robust.
 */
export async function syncServerTime(): Promise<TimeSyncState> {
  // Prevent concurrent sync attempts
  if (isSyncing) {
    return {
      offsetMs: currentOffsetMs,
      lastSynced: lastSyncTimestamp,
      status: currentStatus,
      driftMinutes: currentDriftMinutes,
      serverDate: getTrustedDate(),
      source: syncSource,
    };
  }

  isSyncing = true;
  currentStatus = "syncing";
  notifyListeners();

  // Priority: use APIs that support CORS and are allowed by CSP
  // Note: Google generate_204 doesn't support CORS from localhost (dev only)
  const apis = [
    {
      name: "TimeAPI.io (WIB)",
      url: "https://timeapi.io/api/time/current/zone?timeZone=Asia%2FJakarta",
      parse: (data: any) => new Date(data.dateTime).getTime(),
      timeout: 5000,
    },
    {
      name: "WorldTimeAPI (WIB)",
      url: "https://worldtimeapi.org/api/timezone/Asia/Jakarta",
      parse: (data: any) => new Date(data.datetime).getTime(),
      timeout: 5000,
    },
  ];

  let calculatedOffset: number | null = null;
  let usedSource = "";

  for (const api of apis) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), api.timeout);

      const res = await fetch(api.url, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const serverTime = api.parse(data);
        const endTime = Date.now();
        const roundTrip = (endTime - startTime) / 2;

        // Offset = (ServerTime + NetworkDelay) - LocalTime
        calculatedOffset = serverTime + roundTrip - endTime;
        usedSource = api.name;
        break;
      }
    } catch {
      // Silently continue to next fallback
    }
  }

  // Fallback ke HTTP Date Header jika API waktu di atas diblokir/offline
  if (calculatedOffset === null) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(window.location.href, { method: "HEAD", cache: "no-store", signal: controller.signal });
      clearTimeout(timeoutId);
      const dateHeader = res.headers.get("Date");
      if (dateHeader) {
        const serverTime = new Date(dateHeader).getTime();
        const endTime = Date.now();
        const roundTrip = (endTime - startTime) / 2;
        calculatedOffset = serverTime + roundTrip - endTime;
        usedSource = "HTTP Server Header";
      }
    } catch {
      // Offline fallback - use local device time
    }
  }

  if (calculatedOffset !== null) {
    currentOffsetMs = calculatedOffset;
    lastSyncTimestamp = Date.now();
    currentDriftMinutes = Math.round(Math.abs(calculatedOffset) / (1000 * 60));
    syncSource = usedSource;

    // Jika selisih jam perangkat dengan server > 3 menit, tandai sebagai drift/terindikasi spoofing
    if (currentDriftMinutes >= 3) {
      currentStatus = "drift_detected";
    } else {
      currentStatus = "synced";
    }
  } else {
    // Mode offline / gagal terhubung ke server waktu - tetap pakai jam perangkat
    currentStatus = "error";
    syncSource = "Perangkat (Offline)";
  }

  isSyncing = false;
  notifyListeners();

  return {
    offsetMs: currentOffsetMs,
    lastSynced: lastSyncTimestamp,
    status: currentStatus,
    driftMinutes: currentDriftMinutes,
    serverDate: getTrustedDate(),
    source: syncSource,
  };
}

/**
 * Subscribe untuk update status sinkronisasi waktu
 */
export function subscribeTimeSync(listener: (state: TimeSyncState) => void): () => void {
  listeners.add(listener);
  listener({
    offsetMs: currentOffsetMs,
    lastSynced: lastSyncTimestamp,
    status: currentStatus,
    driftMinutes: currentDriftMinutes,
    serverDate: getTrustedDate(),
    source: syncSource,
  });
  return () => {
    listeners.delete(listener);
  };
}

// Inisialisasi sinkronisasi otomatis saat modul dimuat & berkala setiap 10 menit
if (typeof window !== "undefined") {
  // Delay initial sync to not block page load
  setTimeout(() => {
    syncServerTime().catch(() => {
      // Silent catch - error status will be set internally
    });
  }, 2000);

  setInterval(() => {
    syncServerTime().catch(() => {
      // Silent catch
    });
  }, 10 * 60 * 1000);
}
