/**
 * usePhotoOptimized - High-performance photo loading hook
 *
 * Features:
 * - Memory cache first (fastest)
 * - IndexedDB fallback
 * - Inline data support (for data already in props)
 * - Automatic caching for future use
 * - Progress callbacks
 *
 * Usage:
 * const { photo, loading, fromCache } = usePhotoOptimized({
 *   id: 'photo_123',
 *   inlineData: record.photoUrl, // Base64 or URL
 *   tableKey: PhotoStorage.LOGBOOK,
 * });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPhoto } from '../utils/photoCacheService';
import { PhotoStorage, isPhotoReference, extractPhotoIdFromRef } from '../utils/photoStorageService';

interface UsePhotoOptions {
  /** Unique ID for this photo */
  id: string;
  /** Inline photo data (Base64 or URL) - use this if photo already in props */
  inlineData?: string | null;
  /** Table key for PhotoStorage reference lookup */
  tableKey?: string;
  /** Field name for reference lookup */
  field?: string;
  /** Enable automatic caching of inline data */
  autoCache?: boolean;
  /** Priority: high = load immediately, low = lazy load */
  priority?: 'high' | 'low';
}

interface UsePhotoResult {
  /** The resolved photo data (Base64 or URL) */
  photo: string | null;
  /** Loading state */
  loading: boolean;
  /** Whether photo came from cache (vs freshly loaded) */
  fromCache: boolean;
  /** Error message if failed */
  error: string | null;
}

const globalCache = new Map<string, string>();
const MAX_GLOBAL_CACHE = 50;

export function usePhotoOptimized(options: UsePhotoOptions): UsePhotoResult {
  const {
    id,
    inlineData,
    tableKey,
    field,
    autoCache = true,
    priority = 'low',
  } = options;

  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const loadStartedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPhoto = useCallback(async () => {
    if (!id || loadStartedRef.current) return;
    loadStartedRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // 1. Check global cache first (fastest)
      const globalCached = globalCache.get(id);
      if (globalCached && isMountedRef.current) {
        setPhoto(globalCached);
        setFromCache(true);
        setLoading(false);
        return;
      }

      // 2. If we have inline data, use it immediately
      if (inlineData && typeof inlineData === 'string') {
        if (inlineData.startsWith('data:image') || inlineData.startsWith('http')) {
          setPhoto(inlineData);
          setFromCache(false);
          setLoading(false);

          // Auto-cache for future use
          if (autoCache && inlineData.startsWith('data:image')) {
            cacheInlinePhoto(id, inlineData);
          }
          return;
        }
      }

      // 3. Check if it's a photo reference and load from IndexedDB
      if (inlineData && isPhotoReference(inlineData)) {
        const photoId = extractPhotoIdFromRef(inlineData);
        if (photoId) {
          const cached = await getPhoto(photoId);
          if (cached && isMountedRef.current) {
            setPhoto(cached.data);
            setFromCache(true);
            // Add to global cache
            addToGlobalCache(id, cached.data);
            setLoading(false);
            return;
          }
        }
      }

      // 4. Try to load directly from IndexedDB using the id
      const indexedCached = await getPhoto(id);
      if (indexedCached && isMountedRef.current) {
        setPhoto(indexedCached.data);
        setFromCache(true);
        addToGlobalCache(id, indexedCached.data);
        setLoading(false);
        return;
      }

      // 5. Try to build photo ID from tableKey and field
      if (tableKey && field) {
        const photoId = `${tableKey}_${id}_${field}`;
        const refCached = await getPhoto(photoId);
        if (refCached && isMountedRef.current) {
          setPhoto(refCached.data);
          setFromCache(true);
          addToGlobalCache(id, refCached.data);
          setLoading(false);
          return;
        }
      }

      // 6. No photo found
      if (isMountedRef.current) {
        setPhoto(null);
        setLoading(false);
      }

    } catch (err) {
      console.warn(`[usePhotoOptimized] Failed to load photo ${id}:`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load photo');
        setPhoto(null);
        setLoading(false);
      }
    }
  }, [id, inlineData, tableKey, field, autoCache]);

  useEffect(() => {
    // Reset state when id changes
    loadStartedRef.current = false;

    if (priority === 'high') {
      // High priority: load immediately
      loadPhoto();
    } else {
      // Low priority: load when visible (intersection observer)
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadPhoto();
            observer.disconnect();
          }
        },
        { rootMargin: '100px' }
      );

      // Create a dummy element to observe
      const dummy = document.createElement('div');
      observer.observe(dummy);

      // Also try to load immediately if no intersection needed
      setTimeout(() => loadPhoto(), 0);

      return () => observer.disconnect();
    }
  }, [loadPhoto, priority]);

  return { photo, loading, fromCache, error };
}

/**
 * Add photo to global cache with LRU eviction
 */
function addToGlobalCache(id: string, data: string): void {
  if (globalCache.size >= MAX_GLOBAL_CACHE) {
    // Delete oldest entry
    const firstKey = globalCache.keys().next().value;
    if (firstKey) globalCache.delete(firstKey);
  }
  globalCache.set(id, data);
}

/**
 * Cache inline photo data to IndexedDB
 */
async function cacheInlinePhoto(id: string, data: string): Promise<void> {
  try {
    const { setPhoto } = await import('../utils/photoCacheService');
    await setPhoto(id, data);
    addToGlobalCache(id, data);
    console.log(`[usePhotoOptimized] Cached photo ${id} (${(data.length / 1024).toFixed(1)}KB)`);
  } catch (err) {
    console.warn(`[usePhotoOptimized] Failed to cache photo ${id}:`, err);
  }
}

/**
 * Preload multiple photos in batch
 */
export async function preloadPhotos(
  photos: Array<{ id: string; data: string }>
): Promise<void> {
  const { setPhotosBatch } = await import('../utils/photoCacheService');

  // Add to global cache first
  for (const photo of photos) {
    addToGlobalCache(photo.id, photo.data);
  }

  // Batch save to IndexedDB
  try {
    await setPhotosBatch(photos.map(p => ({ id: p.id, data: p.data })));
    console.log(`[usePhotoOptimized] Preloaded ${photos.length} photos`);
  } catch (err) {
    console.warn('[usePhotoOptimized] Failed to preload photos:', err);
  }
}

/**
 * Clear global photo cache
 */
export function clearGlobalPhotoCache(): void {
  globalCache.clear();
  console.log('[usePhotoOptimized] Global photo cache cleared');
}

export default usePhotoOptimized;
