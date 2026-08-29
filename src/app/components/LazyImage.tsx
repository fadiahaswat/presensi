/**
 * LazyImage - High Performance Lazy Loading Image Component
 * Uses Intersection Observer for efficient viewport-based loading
 * Supports thumbnails with progressive loading
 *
 * FIXED v2: Better photo resolution using sync service
 *
 * Performance optimizations:
 * - Flexible cache key matching
 * - Progressive thumbnail → full image loading
 * - IndexedDB + Memory cache
 * - Efficient state management
 * - Memory leak prevention
 */

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { getPhoto, setPhoto } from "../utils/photoCacheService";
import { googleSyncService } from "../utils/googleSyncService";

interface LazyImageProps {
  /** Image source URL or base64 data */
  src: string;
  /** Alternative text */
  alt: string;
  /** CSS class name */
  className?: string;
  /** Thumbnail URL for progressive loading (optional) */
  thumbnail?: string;
  /** Placeholder element while loading */
  placeholder?: React.ReactNode;
  /** Fallback image on error */
  fallbackSrc?: string;
  /** Callback when image starts loading */
  onLoadStart?: () => void;
  /** Callback when image finishes loading */
  onLoadComplete?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Whether to use cached version first */
  useCache?: boolean;
  /** Image aspect ratio (e.g., "16/9", "1/1") for preventing layout shift */
  aspectRatio?: string;
  /** Style object */
  style?: React.CSSProperties;
  /** Additional wrapper style */
  wrapperStyle?: React.CSSProperties;
  /** Preload the image (start loading immediately) */
  preload?: boolean;
  /** Unique ID for this photo (for caching) */
  cacheId?: string;
  /** Record ID for photo resolution */
  recordId?: string;
  /** Field name for photo resolution */
  photoField?: string;
  /** Table name for photo resolution */
  tableName?: string;
}

interface ImageState {
  loaded: boolean;
  error: boolean;
  currentSrc: string | null;
}

/**
 * High-performance lazy image with:
 * - Intersection Observer for viewport detection
 * - Progressive loading (thumbnail → full)
 * - Memory + IndexedDB caching
 * - Placeholder for CLS prevention
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = "",
  thumbnail,
  placeholder,
  fallbackSrc,
  onLoadStart,
  onLoadComplete,
  onError,
  useCache = true,
  aspectRatio,
  style,
  wrapperStyle,
  preload = false,
  cacheId,
  recordId,
  photoField,
  tableName,
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const resolvedSrcRef = useRef<string | null>(null);

  const isDirectImage = Boolean(
    src && (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('/'))
  );

  const [state, setState] = useState<ImageState>(() => ({
    loaded: isDirectImage,
    error: false,
    currentSrc: isDirectImage ? src : null,
  }));

  const [isInView, setIsInView] = useState(preload || isDirectImage);
  const [resolvedPhoto, setResolvedPhoto] = useState<string | null>(isDirectImage ? src : null);

  // Synchronize when src changes
  useEffect(() => {
    if (src && (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('/'))) {
      setState({
        loaded: true,
        error: false,
        currentSrc: src,
      });
      setResolvedPhoto(src);
      return;
    }

    if (!recordId || !photoField) {
      setResolvedPhoto(src);
      return;
    }

    // Resolve photo using sync service if we have record info
    googleSyncService.getRecordPhoto(recordId, photoField, src || null, tableName)
      .then((resolved) => {
        setResolvedPhoto(resolved || src);
      })
      .catch(() => {
        setResolvedPhoto(src);
      });
  }, [recordId, photoField, tableName, src]);

  // Setup Intersection Observer for deferred / non-direct images
  useEffect(() => {
    if (preload || isDirectImage) return; // Already in view if preloading or direct

    const container = containerRef.current;
    if (!container) return;

    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px", // Generous margin for smooth scrolling
        threshold: 0,
      }
    );

    observerRef.current.observe(container);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [preload, isDirectImage]);

  // Check if photo data is a valid image
  const isValidPhoto = (data: string): boolean => {
    return Boolean(data && (data.startsWith('data:image') || data.startsWith('http') || data.length > 500));
  };

  // Load image from cache or network
  const loadImage = useCallback(async (imageSrc: string) => {
    if (!imageSrc) return;

    onLoadStart?.();

    // If inline base64, use directly (fastest path)
    if (imageSrc.startsWith('data:')) {
      setState({
        loaded: true,
        error: false,
        currentSrc: imageSrc,
      });
      onLoadComplete?.();

      // Cache it for next time using cacheId if provided
      if (useCache && cacheId) {
        setPhoto(cacheId, imageSrc).catch(() => {});
      }
      return;
    }

    // If URL, load directly
    if (imageSrc.startsWith('http')) {
      const img = new Image();
      img.onload = () => {
        setState({
          loaded: true,
          error: false,
          currentSrc: imageSrc,
        });
        onLoadComplete?.();
      };
      img.onerror = () => {
        setState({
          loaded: false,
          error: true,
          currentSrc: null,
        });
        onError?.(`Failed to load: ${imageSrc}`);
      };
      img.src = imageSrc;
      return;
    }

    // Try cache first with flexible key matching
    if (useCache) {
      try {
        // Strategy 1: Use cacheId if provided
        if (cacheId) {
          const cached = await getPhoto(cacheId);
          if (cached?.data) {
            setState({
              loaded: true,
              error: false,
              currentSrc: cached.data,
            });
            onLoadComplete?.();
            return;
          }
        }

        // Strategy 2: For photo: or [PHOTO_REF:] format, extract and lookup
        if (imageSrc.startsWith('photo:') || imageSrc.startsWith('[PHOTO_REF:')) {
          const photoId = imageSrc.replace(/^photo:/, '').replace(/^\[PHOTO_REF:/, '').replace(/\]$/, '').trim();
          if (photoId) {
            const cached = await getPhoto(photoId);
            if (cached?.data) {
              setState({
                loaded: true,
                error: false,
                currentSrc: cached.data,
              });
              onLoadComplete?.();
              return;
            }
          }
        }

        // Strategy 3: Direct key lookup using src as key
        const cached = await getPhoto(imageSrc);
        if (cached?.data) {
          setState({
            loaded: true,
            error: false,
            currentSrc: cached.data,
          });
          onLoadComplete?.();
          return;
        }
      } catch (_) {
        // Cache miss or error, continue
      }
    }

    // If we reach here, no cached version found
    // For photo refs, try to show placeholder
    if (imageSrc.startsWith('[PHOTO_REF:') || imageSrc.startsWith('photo:')) {
      setState({
        loaded: false,
        error: true,
        currentSrc: null,
      });
      onError?.('Photo not found in cache');
      return;
    }

    // Unknown format
    setState({
      loaded: false,
      error: true,
      currentSrc: null,
    });
    onError?.('Unknown image format');
  }, [useCache, cacheId, onLoadStart, onLoadComplete, onError]);

  // Load when in view
  useEffect(() => {
    if (!isInView) return;

    // Use resolved photo (with full image from cache) if available
    const photoToLoad = resolvedPhoto || src;
    if (!photoToLoad) return;

    // Prioritize thumbnail if available and not yet showing full image
    if (thumbnail && !state.loaded) {
      // Load thumbnail first with cache check
      const loadThumbnail = async () => {
        try {
          // Check cache first
          const cachedThumb = await getPhoto(`thumb_${thumbnail}`);
          if (cachedThumb?.data) {
            setState((prev) => ({
              ...prev,
              currentSrc: cachedThumb.data,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              currentSrc: thumbnail,
            }));
            // Cache the thumbnail for next time
            setPhoto(`thumb_${thumbnail}`, thumbnail).catch(() => {});
          }
        } catch (_) {
          setState((prev) => ({
            ...prev,
            currentSrc: thumbnail,
          }));
        }
      };
      loadThumbnail();
    }

    // Then load full image (use resolvedPhoto if it's full, otherwise use src)
    if (photoToLoad) {
      // If resolved photo is valid, use it directly
      if (isValidPhoto(photoToLoad)) {
        setState({
          loaded: true,
          error: false,
          currentSrc: photoToLoad,
        });
        onLoadComplete?.();
      } else {
        // Try to load full image
        loadImage(photoToLoad);
      }
    }
  }, [isInView, src, thumbnail, state.loaded, loadImage, resolvedPhoto]);

  // Generate placeholder with aspect ratio
  const aspectRatioStyle = aspectRatio
    ? { aspectRatio, width: "100%" }
    : {};

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f1f5f9",
        ...aspectRatioStyle,
        ...wrapperStyle,
      }}
      className={className}
    >
      {/* Placeholder */}
      {!state.loaded && placeholder && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...style,
          }}
        >
          {placeholder}
        </div>
      )}

      {/* Skeleton shimmer while not loaded */}
      {!state.loaded && !placeholder && (
        <div
          className="animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer"
          style={{
            position: "absolute",
            inset: 0,
          }}
        />
      )}

      {/* Actual image */}
      {state.loaded && state.currentSrc && (
        <img
          ref={imgRef}
          src={state.currentSrc}
          alt={alt}
          className={className}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...style,
          }}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Error state */}
      {state.error && !state.loaded && !placeholder && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            fontSize: "0.75rem",
          }}
        >
          <span>⚠️ Gagal memuat</span>
        </div>
      )}
    </div>
  );
});

/**
 * Progressive Image - Loads thumbnail first, then full image
 * Perfect for galleries with many photos
 */
export const ProgressiveImage = memo(function ProgressiveImage({
  thumbnail,
  fullImage,
  alt,
  className = "",
  style,
}: {
  thumbnail?: string;
  fullImage?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [showFull, setShowFull] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Upgrade to full image after thumbnail loads
  const handleThumbnailLoad = useCallback(() => {
    if (fullImage && isInView) {
      // Small delay for smooth transition
      setTimeout(() => setShowFull(true), 100);
    }
  }, [fullImage, isInView]);

  if (!thumbnail && !fullImage) {
    return (
      <div
        className={`bg-slate-200 ${className}`}
        style={{ minHeight: 100, ...style }}
      />
    );
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      {/* Thumbnail - always shown first */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.3s ease",
            opacity: showFull ? 0 : 1,
          }}
          loading="lazy"
          decoding="async"
          onLoad={handleThumbnailLoad}
        />
      )}

      {/* Full image - loads after */}
      {showFull && fullImage && (
        <img
          src={fullImage}
          alt={alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Blur effect during transition */}
      {thumbnail && !showFull && (
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{ opacity: 0.3 }}
        />
      )}
    </div>
  );
});

export default LazyImage;
