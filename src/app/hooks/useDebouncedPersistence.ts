/**
 * Optimized debounced localStorage persistence hook
 * Only saves when data actually changes (shallow compare)
 *
 * Performance optimizations:
 * - Shallow comparison to avoid unnecessary saves
 * - Debouncing to batch rapid changes
 * - Error handling for quota exceeded
 * - Automatic cleanup when quota is exceeded
 */

import { useEffect, useRef } from "react";

// Keys that can be safely removed when quota is exceeded (NEVER include active v5/v10 keys!)
const LEGACY_STORAGE_KEYS = [
  "presensi_jurnal_v4",
  "presensi_jurnal_v3",
  "presensi_jurnal_v2",
  "presensi_jurnal_v1",
  "presensi_jurnal_logbook_v4",
  "presensi_jurnal_logbook_v3",
  "presensi_jurnal_logbook_v2",
  "presensi_jurnal_logbook_v1",
  "presensi_attendance_records_v4",
  "presensi_attendance_records_v3",
  "presensi_attendance_records_v2",
  "presensi_attendance_records_v1",
  "presensi_izin_requests_v4",
  "presensi_izin_requests_v3",
  "presensi_izin_requests_v2",
  "presensi_izin_requests_v1",
  "presensi_kegiatan_asrama_v4",
  "presensi_kegiatan_asrama_v3",
  "presensi_kegiatan_asrama_v2",
  "presensi_kegiatan_asrama_v1",
  "presensi_mutabaah_yaumiyah_v4",
  "presensi_mutabaah_yaumiyah_v3",
  "presensi_mutabaah_yaumiyah_v2",
  "presensi_mutabaah_yaumiyah_v1",
  "presensi_mutabaah_v4",
  "presensi_mutabaah_v3",
  "presensi_mutabaah_v2",
  "presensi_mutabaah_v1",
  "presensi_santri_sakit_v4",
  "presensi_santri_sakit_v3",
  "presensi_santri_sakit_v2",
  "presensi_santri_sakit_v1",
  "presensi_santri_izin_v4",
  "presensi_santri_izin_v3",
  "presensi_santri_izin_v2",
  "presensi_santri_izin_v1",
  "presensi_pengasuhan_khusus_v4",
  "presensi_pengasuhan_khusus_v3",
  "presensi_pengasuhan_khusus_v2",
  "presensi_pengasuhan_khusus_v1",
  "presensi_santri_master_v9",
  "presensi_santri_master_v8",
  "presensi_santri_master_v7",
  "presensi_santri_master_v6",
  "presensi_santri_master_v5",
  "presensi_musyrif_master_v4",
  "presensi_musyrif_master_v3",
  "presensi_musyrif_master_v2",
  "presensi_musyrif_master_v1",
  "presensi_auth_users_master_v4",
  "presensi_auth_users_master_v3",
  "presensi_records_cache_v3",
  "presensi_records_cache_v2",
  "presensi_records_cache_v1",
  "presensi_photo_cache_v2",
  "presensi_photo_cache_v1",
  "presensi_photo_cache",
  "syamsa_musyrif_list_v3",
  "syamsa_musyrif_list_v2",
  "syamsa_musyrif_list_v1",
];

/**
 * Proactively clean up legacy obsolete keys from localStorage on startup
 */
export function cleanupLegacyStorage(): number {
  let freedCount = 0;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        freedCount++;
      }
    }
    if (freedCount > 0) {
      console.log(`[StorageCleanup] Proactively purged ${freedCount} legacy storage keys`);
    }
  } catch (_) {}
  return freedCount;
}

/**
 * Sanitize data for localStorage by extracting large base64 photos into IndexedDB
 * and replacing them with lightweight photo references (photo:photo_...).
 */
export function sanitizeForStorage<T>(data: T, keyContext: string): T {
  if (!data || typeof data !== "object") return data;

  try {
    const photosToCache: Array<{ id: string; data: string }> = [];

    const sanitizeNode = (node: any, path: string): any => {
      if (!node || typeof node !== "object") return node;

      if (Array.isArray(node)) {
        return node.map((item, idx) => sanitizeNode(item, `${path}_${idx}`));
      }

      const copy: any = { ...node };
      for (const k of Object.keys(copy)) {
        const val = copy[k];
        if (typeof val === "string" && val.startsWith("data:image") && val.length > 500) {
          const recordId = copy.id || copy.taskKey || path;
          const photoId = `photo_${keyContext}_${recordId}_${k}`.replace(/[^a-zA-Z0-9_-]/g, "_");
          photosToCache.push({ id: photoId, data: val });
          copy[k] = `photo:${photoId}`;
        } else if (val && typeof val === "object") {
          copy[k] = sanitizeNode(val, `${path}_${k}`);
        }
      }
      return copy;
    };

    const sanitized = sanitizeNode(data, keyContext);

    // Asynchronously cache any extracted base64 photos to IndexedDB
    if (photosToCache.length > 0) {
      import("../utils/photoCacheService").then(({ setPhotosBatch }) => {
        setPhotosBatch(photosToCache).catch(() => {});
      }).catch(() => {});
    }

    return sanitized;
  } catch (_) {
    return data;
  }
}

/**
 * Attempt to free up localStorage space by removing old/less critical data
 */
function attemptStorageCleanup(protectKey?: string): boolean {
  try {
    let removedAny = false;

    // 1. Remove known legacy keys first
    for (const key of LEGACY_STORAGE_KEYS) {
      if (key === protectKey) continue;
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          const itemSize = item.length;
          localStorage.removeItem(key);
          console.log(`[StorageCleanup] Removed legacy key ${key} (${Math.round(itemSize / 1024)}KB) to free up space`);
          removedAny = true;
        }
      } catch {}
    }

    // 2. Look for any orphaned/obsolete keys in localStorage
    if (!removedAny) {
      const keysToExamine: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== protectKey && !k.endsWith("_v5") && !k.endsWith("_v10") && !k.startsWith("presensi_auth_user")) {
          keysToExamine.push(k);
        }
      }

      for (const k of keysToExamine) {
        try {
          const val = localStorage.getItem(k);
          if (val && val.length > 20000) {
            localStorage.removeItem(k);
            console.log(`[StorageCleanup] Removed non-critical large key ${k} (${Math.round(val.length / 1024)}KB)`);
            return true;
          }
        } catch {}
      }
    }

    return removedAny;
  } catch {
    return false;
  }
}

/**
 * Hook for debounced localStorage persistence with change detection
 */
export function useDebouncedPersistence<T>(
  key: string,
  data: T,
  debounceMs: number = 400
): void {
  const previousDataRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Sanitize data (extract large base64 images to IndexedDB and store photo: refs)
    const cleanData = sanitizeForStorage(data, key);
    const serialized = JSON.stringify(cleanData);

    // Skip if data hasn't changed (reference equality)
    if (serialized === previousDataRef.current) {
      return;
    }

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, serialized);
        previousDataRef.current = serialized;
        // Reset cleanup flag when save succeeds
        cleanupAttemptedRef.current.delete(key);
      } catch (error) {
        // Handle quota exceeded or other errors
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn(`[useDebouncedPersistence] localStorage quota exceeded for key: ${key}`);

          // Only attempt cleanup once per key per session
          if (!cleanupAttemptedRef.current.has(key)) {
            cleanupAttemptedRef.current.add(key);
            const cleaned = attemptStorageCleanup(key);

            if (cleaned) {
              // Retry save after cleanup
              try {
                localStorage.setItem(key, serialized);
                previousDataRef.current = serialized;
                console.log(`[useDebouncedPersistence] Save succeeded after cleanup for ${key}`);
                return;
              } catch (retryError) {
                console.warn(`[useDebouncedPersistence] Save still failed after cleanup for ${key}`);
              }
            }
          }

          // If still failing, try pruning older records for large date-keyed maps
          try {
            if (cleanData && typeof cleanData === 'object' && !Array.isArray(cleanData)) {
              const pruned: any = {};
              const cutoffDate = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
              for (const [topK, val] of Object.entries(cleanData as any)) {
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                  pruned[topK] = {};
                  for (const [subK, subVal] of Object.entries(val as any)) {
                    if (subK >= cutoffDate) {
                      pruned[topK][subK] = subVal;
                    }
                  }
                }
              }
              const prunedSerialized = JSON.stringify(pruned);
              localStorage.setItem(key, prunedSerialized);
              previousDataRef.current = prunedSerialized;
              console.log(`[useDebouncedPersistence] Save succeeded with pruned recent window for ${key}`);
              return;
            }
          } catch (_) {}

          // If cleanup didn't work or was already attempted, show warning but don't crash
          console.warn(`[useDebouncedPersistence] Unable to save ${key} - storage quota exceeded`);
        } else {
          console.warn(`[useDebouncedPersistence] Failed to save ${key}:`, error);
        }
      }
    }, debounceMs);

    // Cleanup on unmount or data change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [key, data, debounceMs]);
}

/**
 * Create a stable debounced save function
 * Useful for imperative saves outside of useEffect
 */
export function createDebouncedSave<T>(
  key: string,
  debounceMs: number = 400
): (data: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let previousData: string | null = null;

  return (data: T) => {
    const cleanData = sanitizeForStorage(data, key);
    const serialized = JSON.stringify(cleanData);

    // Skip if data hasn't changed
    if (serialized === previousData) {
      return;
    }

    // Clear existing timer
    if (timer) {
      clearTimeout(timer);
    }

    // Set new timer
    timer = setTimeout(() => {
      try {
        localStorage.setItem(key, serialized);
        previousData = serialized;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn(`[createDebouncedSave] localStorage quota exceeded for key: ${key}`);
          attemptStorageCleanup(key);

          // Retry once
          try {
            localStorage.setItem(key, serialized);
            previousData = serialized;
          } catch {
            console.warn(`[createDebouncedSave] Unable to save ${key} after cleanup`);
          }
        } else {
          console.warn(`[createDebouncedSave] Failed to save ${key}:`, error);
        }
      }
    }, debounceMs);
  };
}

/**
 * Utility function to check localStorage usage
 */
export function getStorageInfo(): { used: number; available: number; keys: string[] } {
  try {
    let used = 0;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
          keys.push(key);
        }
      }
    }

    // Estimate available space (5MB is typical limit)
    const estimatedLimit = 5 * 1024 * 1024;

    return {
      used,
      available: Math.max(0, estimatedLimit - used),
      keys,
    };
  } catch {
    return { used: 0, available: 0, keys: [] };
  }
}
