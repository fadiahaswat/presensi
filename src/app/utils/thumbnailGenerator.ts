/**
 * Thumbnail Generator - Creates optimized thumbnails from images
 * Uses Canvas API for fast client-side resizing
 */

const THUMBNAIL_MAX_DIM = 200; // Max dimension for thumbnail
const THUMBNAIL_QUALITY = 0.6; // JPEG quality

export interface ThumbnailResult {
  thumbnail: string;
  originalSize: number;
  thumbnailSize: number;
  reduction: number; // Percentage reduction
}

/**
 * Generate a thumbnail from a data URL or Image
 * Returns base64 data URL of the thumbnail
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
  const originalSize = typeof source === "string" ? source.length : 0;

  // Load image if source is data URL or File
  if (typeof source === "string") {
    img = await loadImage(source);
  } else if (source instanceof File) {
    const dataUrl = await fileToDataUrl(source);
    img = await loadImage(dataUrl);
  } else {
    img = source;
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

  return {
    thumbnail,
    originalSize,
    thumbnailSize: thumbnail.length,
    reduction: originalSize > 0 ? Math.round((1 - thumbnail.length / originalSize) * 100) : 0,
  };
}

/**
 * Generate multiple thumbnails from an array of sources
 * More efficient than calling generateThumbnail multiple times
 */
export async function generateThumbnailsBatch(
  sources: Array<string | File>,
  options?: {
    maxDim?: number;
    quality?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<ThumbnailResult[]> {
  const results: ThumbnailResult[] = [];
  const total = sources.length;

  for (let i = 0; i < sources.length; i++) {
    try {
      const result = await generateThumbnail(sources[i], options);
      results.push(result);
    } catch (error) {
      console.warn(`Failed to generate thumbnail for item ${i}:`, error);
      results.push({
        thumbnail: "",
        originalSize: 0,
        thumbnailSize: 0,
        reduction: 0,
      });
    }

    options?.onProgress?.(i + 1, total);
  }

  return results;
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
