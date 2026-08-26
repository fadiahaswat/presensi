/**
 * Photo Thumbnail Service
 * Handles thumbnail generation and caching for logbook photos
 *
 * Performance optimizations:
 * - Async thumbnail generation
 * - IndexedDB caching for thumbnails
 * - Batch processing
 */

import { getOrGenerateThumbnail, clearThumbnailCache } from "./thumbnailGenerator";
import { setPhoto, getPhoto, getStats } from "./photoCacheService";

const THUMBNAIL_SIZE = 200; // Grid thumbnail size
const THUMBNAIL_QUALITY = 0.6;

/**
 * Generate and cache thumbnail for a photo
 * Returns the thumbnail URL
 */
export async function generatePhotoThumbnail(
  photoId: string,
  photoData: string
): Promise<string | null> {
  if (!photoData || !photoData.startsWith('data:image')) {
    return null;
  }

  try {
    // Generate thumbnail
    const thumbnail = await getOrGenerateThumbnail(photoData, {
      maxDim: THUMBNAIL_SIZE,
      quality: THUMBNAIL_QUALITY
    });

    // Cache thumbnail with specific key
    const thumbnailId = `${photoId}_thumb`;
    await setPhoto(thumbnailId, thumbnail);

    return thumbnail;
  } catch (error) {
    console.warn('Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Get cached thumbnail for a photo
 */
export async function getCachedThumbnail(photoId: string): Promise<string | null> {
  try {
    const thumbnailId = `${photoId}_thumb`;
    const cached = await getPhoto(thumbnailId);
    return cached?.data || null;
  } catch {
    return null;
  }
}

/**
 * Get thumbnail URL for display (from cache or generate)
 * This is the main function to use for getting thumbnails
 */
export async function getThumbnailUrl(
  photoId: string,
  photoData: string
): Promise<{ thumbnail: string | null; isFromCache: boolean }> {
  // Try to get from cache first
  const cached = await getCachedThumbnail(photoId);
  if (cached) {
    return { thumbnail: cached, isFromCache: true };
  }

  // Generate new thumbnail
  const thumbnail = await generatePhotoThumbnail(photoId, photoData);
  return { thumbnail, isFromCache: false };
}

/**
 * Batch generate thumbnails for multiple photos
 * Processes photos in parallel with progress callback
 */
export async function batchGenerateThumbnails(
  photos: Array<{ id: string; data: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const total = photos.length;

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 5;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (photo) => {
        try {
          const thumbnail = await generatePhotoThumbnail(photo.id, photo.data);
          if (thumbnail) {
            results.set(photo.id, thumbnail);
          }
        } catch (error) {
          console.warn(`Failed to generate thumbnail for ${photo.id}:`, error);
        }
      })
    );

    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  return results;
}

/**
 * Get photo cache statistics including thumbnails
 */
export async function getPhotoCacheStats(): Promise<{
  totalCount: number;
  totalSize: number;
  sizeFormatted: string;
}> {
  const stats = await getStats();
  return {
    totalCount: stats.count,
    totalSize: stats.size,
    sizeFormatted: stats.sizeFormatted
  };
}

/**
 * Clear all thumbnail caches
 */
export function clearAllThumbnailCaches(): void {
  clearThumbnailCache();
}
