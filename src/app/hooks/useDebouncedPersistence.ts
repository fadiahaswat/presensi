/**
 * Optimized debounced localStorage persistence hook
 * Only saves when data actually changes (shallow compare)
 *
 * Performance optimizations:
 * - Shallow comparison to avoid unnecessary saves
 * - Debouncing to batch rapid changes
 * - Error handling for quota exceeded
 */

import { useEffect, useRef } from "react";

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
      } catch (error) {
        // Handle quota exceeded or other errors
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn(`[useDebouncedPersistence] localStorage quota exceeded for key: ${key}`);
          // Could trigger cleanup here
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
        console.warn(`[createDebouncedSave] Failed to save ${key}:`, error);
      }
    }, debounceMs);
  };
}
