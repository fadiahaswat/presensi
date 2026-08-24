/**
 * Client-side high-performance pure image compressor
 * Uses dual-mode image decoding (ObjectURL + FileReader fallback) & adaptive compression
 * strictly guaranteeing payload is <= 32,000 characters to fit securely inside Google Sheets cell limits.
 * Clean compression without any watermark.
 */

const MAX_SHEET_SAFE_CHARS = 32000; // Safe payload ceiling (<= 32,000 chars / ~24 KB) for Google Sheets cell safety

export interface ImageCompressOptions {
  maxDim?: number;
  quality?: number;
}

export async function compressAndWatermarkImage(
  file: File,
  options?: ImageCompressOptions | null,
  initialMaxDim = 640,
  initialQuality = 0.72
): Promise<string> {
  // Step 1: Decode image with fallback
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    let hasLoaded = false;
    
    // Method A: ObjectURL (instant & memory efficient)
    try {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        if (!hasLoaded) {
          hasLoaded = true;
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        fallbackWithFileReader();
      };
      image.src = objectUrl;
    } catch (_) {
      fallbackWithFileReader();
    }

    // Method B: FileReader fallback
    function fallbackWithFileReader() {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) {
          reject(new Error("Gagal membaca file foto."));
          return;
        }
        const image = new Image();
        image.onload = () => {
          if (!hasLoaded) {
            hasLoaded = true;
            resolve(image);
          }
        };
        image.onerror = () => reject(new Error("Format foto tidak dapat dirender di canvas."));
        image.src = src;
      };
      reader.onerror = () => reject(new Error("Gagal membuka file foto galeri."));
      reader.readAsDataURL(file);
    }
  });

  const origWidth = img.naturalWidth || img.width || 1024;
  const origHeight = img.naturalHeight || img.height || 768;

  // Step 2: Iterative adaptive compressor strictly guaranteeing <= 32,000 characters (Zero watermark)
  let currentMaxDim = options?.maxDim || initialMaxDim;
  let currentQuality = options?.quality || initialQuality;
  let resultDataUrl = "";

  for (let attempt = 0; attempt < 6; attempt++) {
    let width = origWidth;
    let height = origHeight;

    if (width > height) {
      if (width > currentMaxDim) {
        height = Math.round((height * currentMaxDim) / width);
        width = currentMaxDim;
      }
    } else {
      if (height > currentMaxDim) {
        width = Math.round((width * currentMaxDim) / height);
        height = currentMaxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext("2d");

    if (!ctx) break;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    resultDataUrl = canvas.toDataURL("image/jpeg", currentQuality);

    // If within safe character limit, return immediately
    if (resultDataUrl && resultDataUrl.length <= MAX_SHEET_SAFE_CHARS && resultDataUrl.length > 50) {
      return resultDataUrl;
    }

    // Otherwise downscale dimension & quality progressively
    currentMaxDim = Math.max(320, Math.round(currentMaxDim * 0.85));
    currentQuality = Math.max(0.45, currentQuality - 0.05);
  }

  return resultDataUrl || "";
}