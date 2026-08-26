/**
 * Thumbnail Generator - Creates optimized thumbnails from images
 * Uses Canvas API for fast client-side resizing
 *
 * Performance optimizations:
 * - Memoization cache for generated thumbnails
 * - Parallel batch processing
 * - Memory-efficient image handling
 */

const THUMBNAIL_MAX_DIM = 200; // Max dimension for thumbnail
const THUMBNAIL_QUALITY = 0.6; // JPEG quality

// Thumbnail cache (LRU with size limit)
const thumbnailCache = new Map<string, ThumbnailResult>();
const MAX_THUMBNAIL_CACHE_SIZE = 100;

function getThumbnailCacheKey(source: string, maxDim: number, quality: number): string {
  // Use first 50 chars of source + params as key
  const prefix = source.substring(0, Math.min(50, source.length));
  return `thumb_${prefix.length}_${prefix}_${maxDim}_${quality}`;
}

export interface ThumbnailResult {
  thumbnail: string;
  originalSize: number;
  thumbnailSize: number;
  reduction: number; // Percentage reduction
}

/**
 * Generate a thumbnail from a data URL or Image
 * Returns base64 data URL of the thumbnail
 * OPTIMIZED: Uses cache to avoid regenerating same thumbnails
 */
export async function generateThumbnail(
  source: string | HTMLImageElement | File,
  options?: {
    maxDim?: number;
    quality?: number;
    format?: "jpeg" | "png" | "webp";
  }
): Promise<ThumbnailResult> {
  const maxDim = options?.maxDim || THUMBNAIL_MAX_DIM;
  const quality = options?.quality || THUMBNAIL_QUALITY;
  const format = options?.format || "jpeg";

  let img: HTMLImageElement;
  let originalSize = 0;
  let sourceString = "";

  // Get source as string for cache key
  if (typeof source === "string") {
    sourceString = source;
    originalSize = source.length;
    img = await loadImage(source);
  } else if (source instanceof File) {
    sourceString = await fileToDataUrl(source);
    originalSize = source.size;
    img = await loadImage(sourceString);
  } else {
    img = source;
    sourceString = "HTMLImageElement";
  }

  // Check cache first
  const cacheKey = getThumbnailCacheKey(sourceString, maxDim, quality);
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Calculate thumbnail dimensions
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  // Create canvas and draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, 0, 0, width, height);

  // Convert to data URL
  const mimeType = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const thumbnail = canvas.toDataURL(mimeType, quality);

  const result: ThumbnailResult = {
    thumbnail,
    originalSize,
    thumbnailSize: thumbnail.length,
    reduction: originalSize > 0 ? Math.round((1 - thumbnail.length / originalSize) * 100) : 0,
  };

  // Cache with LRU eviction
  if (thumbnailCache.size >= MAX_THUMBNAIL_CACHE_SIZE) {
    const firstKey = thumbnailCache.keys().next().value;
    if (firstKey) thumbnailCache.delete(firstKey);
  }
  thumbnailCache.set(cacheKey, result);

  return result;
}

/**
 * Generate multiple thumbnails from an array of sources
 * OPTIMIZED: Parallel processing with concurrency limit
 */
export async function generateThumbnailsBatch(
  sources: Array<string | File>,
  options?: {
    maxDim?: number;
    quality?: number;
    onProgress?: (completed: number, total: number) => void;
    concurrency?: number; // Max parallel operations
  }
): Promise<ThumbnailResult[]> {
  const results: ThumbnailResult[] = new Array(sources.length);
  const total = sources.length;
  const concurrency = options?.concurrency || 3; // Default 3 parallel operations

  // Process in batches
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (source, batchIdx) => {
        const globalIdx = i + batchIdx;
        try {
          const result = await generateThumbnail(source, options);
          results[globalIdx] = result;
          options?.onProgress?.(globalIdx + 1, total);
          return result;
        } catch (error) {
          console.warn(`Failed to generate thumbnail for item ${globalIdx}:`, error);
          results[globalIdx] = {
            thumbnail: "",
            originalSize: 0,
            thumbnailSize: 0,
            reduction: 0,
          };
          options?.onProgress?.(globalIdx + 1, total);
          return results[globalIdx];
        }
      })
    );

    // Update results for any that might have failed
    batchResults.forEach((result, batchIdx) => {
      const globalIdx = i + batchIdx;
      if (result.status === "fulfilled") {
        results[globalIdx] = result.value;
      }
    });
  }

  return results;
}

/**
 * Clear thumbnail cache (call when memory is low)
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Get existing or generate new thumbnail (convenience function)
 */
export async function getOrGenerateThumbnail(
  source: string,
  options?: {
    maxDim?: number;
    quality?: number;
  }
): Promise<string> {
  const cacheKey = getThumbnailCacheKey(source, options?.maxDim || THUMBNAIL_MAX_DIM, options?.quality || THUMBNAIL_QUALITY);

  // Check cache first
  const cached = thumbnailCache.get(cacheKey);
  if (cached && cached.thumbnail) {
    return cached.thumbnail;
  }

  // Generate if not cached
  const result = await generateThumbnail(source, options);
  return result.thumbnail;
}

/**
 * Create a blurhash-like placeholder from an image
 * Returns a tiny base64 image that's heavily blurred
 */
export async function createBlurPlaceholder(
  source: string,
  size: number = 20
): Promise<string> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return source;

  // Draw tiny version
  ctx.drawImage(img, 0, 0, size, size);

  // Return as very low quality JPEG for tiny size
  return canvas.toDataURL("image/jpeg", 0.3);
}

/**
 * Load image from data URL or URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    img.src = src;
  });
}

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalImageFormat(): "webp" | "jpeg" | "png" {
  if (supportsWebP()) return "webp";
  return "jpeg";
}

/**
 * Preload image in background
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImagesBatch(
  urls: string[],
  concurrency: number = 3
): Promise<void> {
  const queue = [...urls];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (url) {
          try {
            await preloadImage(url);
          } catch (_) {
            // Silently fail preload
          }
        }
      }
    };
    workers.push(worker());
  }

  await Promise.all(workers);
}
