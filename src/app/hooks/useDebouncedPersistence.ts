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

// Keys that can be safely removed when quota is exceeded
const SAFE_TO_REMOVE_KEYS = [
  "presensi_jurnal_logbook_v5",
  "presensi_jurnal_v4",
  "presensi_mutabaah_v3",
  "presensi_records_cache_v3",
  "presensi_photo_cache_v2",
];

/**
 * Attempt to free up localStorage space by removing old/less critical data
 */
function attemptStorageCleanup(): boolean {
  try {
    const keysToCheck = [
      ...SAFE_TO_REMOVE_KEYS,
      // Add other non-critical keys here
    ];

    for (const key of keysToCheck) {
      try {
        const itemSize = localStorage.getItem(key)?.length || 0;
        if (itemSize > 0) {
          // Only remove if it's a large item (> 10KB)
          if (itemSize > 10000) {
            localStorage.removeItem(key);
            console.log(`[StorageCleanup] Removed ${key} (${Math.round(itemSize / 1024)}KB) to free up space`);
            return true;
          }
        }
      } catch {
        // Key doesn't exist or can't be accessed
      }
    }

    // If we couldn't find large items, try removing oldest entries
    for (const key of SAFE_TO_REMOVE_KEYS) {
      try {
        localStorage.removeItem(key);
        console.log(`[StorageCleanup] Removed ${key}`);
        return true;
      } catch {
        // Continue
      }
    }

    return false;
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
    // Serialize new data
    const serialized = JSON.stringify(data);

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
            const cleaned = attemptStorageCleanup();

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
    const serialized = JSON.stringify(data);

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
          attemptStorageCleanup();

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
