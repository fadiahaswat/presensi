/**
 * usePhoto - Lazy loading hook for photos
 *
 * Usage:
 * const { photo, loading, error } = usePhoto(recordId, photoField, photoData);
 *
 * Performance optimizations:
 * - Smart cache lookup
 * - Async caching
 * - Batch operations
 */

import { useState, useEffect, useRef } from 'react';

interface UsePhotoResult {
  photo: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for lazy loading a photo
 * @param recordId - Unique ID of the record
 * @param photoField - Field name containing the photo
 * @param initialPhoto - Photo data if already available (from record)
 */
export function usePhoto(
  recordId: string | null,
  photoField: string,
  initialPhoto: string | null | undefined
): UsePhotoResult {
  const [photo, setPhoto] = useState<string | null>(initialPhoto || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKeyRef = useRef<string | null>(null);
  const isProcessedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!recordId) {
      setPhoto(initialPhoto || null);
      return;
    }

    const cacheKey = `${recordId}_${photoField}`;

    // Already processed this cache key
    if (isProcessedRef.current.has(cacheKey)) {
      return;
    }

    // Already have inline photo - cache it for next time
    if (photo && photo.startsWith('data:image') && photo.length > 1000) {
      isProcessedRef.current.add(cacheKey);
      cachePhotoAsync(recordId, photoField, photo);
      return;
    }

    // Try to get from cache
    isProcessedRef.current.add(cacheKey);
    setLoading(true);
    getCachedPhoto(recordId, photoField)
      .then(cached => {
        if (cached) {
          setPhoto(cached);
        } else if (initialPhoto) {
          // No cached version, use initial if available
          setPhoto(initialPhoto);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load photo');
        setLoading(false);
      });
  }, [recordId, photoField, initialPhoto]);

  return { photo, loading, error };
}

/**
 * Get photo from cache (memory or IndexedDB)
 */
async function getCachedPhoto(recordId: string, photoField: string): Promise<string | null> {
  const cacheKey = `${recordId}_${photoField}`;

  try {
    const { getPhoto, getPhotoByPrefix } = await import('../utils/photoCacheService');

    // Try direct lookup first
    const cached = await getPhoto(cacheKey);
    if (cached?.data) {
      return cached.data;
    }

    // Try prefix match for inline data URLs
    if (cacheKey.startsWith('data:')) {
      const prefixMatch = await getPhotoByPrefix(cacheKey.substring(0, Math.min(50, cacheKey.length)));
      if (prefixMatch?.data) {
        return prefixMatch.data;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cache photo asynchronously (non-blocking)
 */
async function cachePhotoAsync(recordId: string, photoField: string, data: string): Promise<void> {
  const cacheKey = `${recordId}_${photoField}`;

  try {
    const { setPhoto } = await import('../utils/photoCacheService');
    await setPhoto(cacheKey, data);
  } catch {
    // Silent fail
  }
}

/**
 * Batch cache multiple photos
 */
export async function cachePhotosBatch(
  items: Array<{ id: string; photoField: string; photoData: string }>
): Promise<void> {
  try {
    const { setPhotosBatch } = await import('../utils/photoCacheService');

    const photos = items
      .filter(item => item.photoData && item.photoData.startsWith('data:image'))
      .map(item => ({
        id: `${item.id}_${item.photoField}`,
        data: item.photoData
      }));

    if (photos.length > 0) {
      await setPhotosBatch(photos);
    }
  } catch {
    // Silent fail
  }
}

/**
 * Hook for batch loading photos (e.g., for a gallery)
 */
export function usePhotoBatch(
  items: Array<{ id: string; photoField: string; initialPhoto?: string | null }>
): Map<string, string> {
  const [photos, setPhotos] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.initialPhoto) {
        map.set(item.id, item.initialPhoto);
      }
    }
    return map;
  });

  useEffect(() => {
    // Prefetch and cache all photos in background
    const prefetch = async () => {
      const photosToCache = items.filter(
        item => item.initialPhoto && item.initialPhoto.startsWith('data:image')
      );

      if (photosToCache.length > 0) {
        await cachePhotosBatch(photosToCache.map(item => ({
          id: item.id,
          photoField: item.photoField,
          photoData: item.initialPhoto!
        })));
      }
    };

    prefetch();
  }, [items]);

  return photos;
}
