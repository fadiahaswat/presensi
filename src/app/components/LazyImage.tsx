/**
 * LazyImage - High Performance Lazy Loading Image Component
 * Uses Intersection Observer for efficient viewport-based loading
 * Supports thumbnails with progressive loading
 */

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { photoCacheService } from "../utils/photoCacheService";

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
 * - IndexedDB caching
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
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [state, setState] = useState<ImageState>({
    loaded: false,
    error: false,
    currentSrc: null,
  });

  const [isInView, setIsInView] = useState(preload);

  // Setup Intersection Observer
  useEffect(() => {
    if (preload) return; // Already in view if preloading

    const container = containerRef.current;
    if (!container) return;

    // Check if IntersectionObserver is available
    if (!("IntersectionObserver" in window)) {
      // Fallback: load immediately
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Stop observing once in view
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0,
      }
    );

    observerRef.current.observe(container);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [preload]);

  // Load image from cache or network
  const loadImage = useCallback(async (imageSrc: string) => {
    if (!imageSrc) return;

    onLoadStart?.();

    // Try cache first
    if (useCache) {
      try {
        const cached = await photoCacheService.getPhoto(imageSrc);
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
        // Cache miss, continue with network
      }
    }

    // Load from network
    const img = new Image();

    img.onload = async () => {
      // Cache the image
      if (useCache && imageSrc.startsWith('data:')) {
        try {
          await photoCacheService.cachePhoto(imageSrc, imageSrc);
        } catch (_) {}
      }

      setState({
        loaded: true,
        error: false,
        currentSrc: imageSrc,
      });
      onLoadComplete?.();
    };

    img.onerror = () => {
      // Try fallback if available
      if (fallbackSrc && fallbackSrc !== imageSrc) {
        loadImage(fallbackSrc);
      } else {
        setState({
          loaded: false,
          error: true,
          currentSrc: null,
        });
        onError?.(`Failed to load image: ${imageSrc}`);
      }
    };

    img.src = imageSrc;
  }, [useCache, fallbackSrc, onLoadStart, onLoadComplete, onError]);

  // Load when in view
  useEffect(() => {
    if (!isInView) return;

    // Prioritize thumbnail if available and not yet showing full image
    if (thumbnail && !state.loaded) {
      // Load thumbnail first
      const loadThumbnail = async () => {
        try {
          const cachedThumb = await photoCacheService.getThumbnail(thumbnail);
          if (cachedThumb) {
            setState((prev) => ({
              ...prev,
              currentSrc: cachedThumb,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              currentSrc: thumbnail,
            }));
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

    // Then load full image
    if (src) {
      loadImage(src);
    }
  }, [isInView, src, thumbnail, state.loaded, loadImage]);

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
