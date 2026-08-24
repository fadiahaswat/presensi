/**
 * VirtualizedGallery - High Performance Photo Gallery
 * Combines virtualization + lazy loading + progressive images
 * For rendering hundreds/thousands of photos efficiently
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LazyImage } from "./LazyImage";
import { X, ZoomIn, ZoomOut, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";

export interface GalleryPhoto {
  id: string;
  url: string;
  thumbnail?: string;
  alt: string;
  width?: number;
  height?: number;
  meta?: Record<string, string>;
}

interface VirtualizedGalleryProps {
  photos: GalleryPhoto[];
  /** Column count for grid layout */
  columns?: number;
  /** Gap between items in px */
  gap?: number;
  /** Aspect ratio for grid items */
  aspectRatio?: string;
  /** Enable lightbox on click */
  enableLightbox?: boolean;
  /** Custom render for overlay info */
  renderOverlay?: (photo: GalleryPhoto, index: number) => React.ReactNode;
  /** Loading placeholder */
  loadingPlaceholder?: React.ReactNode;
  /** Called when photo is clicked */
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void;
  /** Called when all photos are loaded */
  onLoadComplete?: () => void;
  /** Initial scroll position */
  initialScrollTop?: number;
}

interface LightboxState {
  isOpen: boolean;
  currentIndex: number;
  currentPhoto: GalleryPhoto | null;
}

/**
 * Virtualized grid gallery with lazy loading
 */
export const VirtualizedGallery = memo(function VirtualizedGallery({
  photos,
  columns = 3,
  gap = 8,
  aspectRatio = "1/1",
  enableLightbox = true,
  renderOverlay,
  loadingPlaceholder,
  onPhotoClick,
  onLoadComplete,
  initialScrollTop = 0,
}: VirtualizedGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    currentIndex: 0,
    currentPhoto: null,
  });
  const [loadedCount, setLoadedCount] = useState(0);

  // Calculate item size based on container width
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate item dimensions
  const itemSize = useMemo(() => {
    if (containerWidth === 0) return 120; // Default fallback
    const totalGap = gap * (columns - 1);
    return Math.floor((containerWidth - totalGap) / columns);
  }, [containerWidth, columns, gap]);

  // Virtual list configuration
  const rowCount = Math.ceil(photos.length / columns);
  const rowHeight = itemSize + gap;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });

  // Handle photo click
  const handlePhotoClick = useCallback(
    (photo: GalleryPhoto, index: number) => {
      if (enableLightbox) {
        setLightbox({
          isOpen: true,
          currentIndex: index,
          currentPhoto: photo,
        });
      }
      onPhotoClick?.(photo, index);
    },
    [enableLightbox, onPhotoClick]
  );

  // Handle load complete
  const handlePhotoLoad = useCallback(() => {
    setLoadedCount((prev) => {
      const next = prev + 1;
      if (next >= photos.length) {
        onLoadComplete?.();
      }
      return next;
    });
  }, [photos.length, onLoadComplete]);

  // Lightbox navigation
  const goToNext = useCallback(() => {
    const nextIndex = (lightbox.currentIndex + 1) % photos.length;
    setLightbox({
      isOpen: true,
      currentIndex: nextIndex,
      currentPhoto: photos[nextIndex],
    });
  }, [lightbox.currentIndex, photos]);

  const goToPrev = useCallback(() => {
    const prevIndex = (lightbox.currentIndex - 1 + photos.length) % photos.length;
    setLightbox({
      isOpen: true,
      currentIndex: prevIndex,
      currentPhoto: photos[prevIndex],
    });
  }, [lightbox.currentIndex, photos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox((prev) => ({ ...prev, isOpen: false }));
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox.isOpen, goToNext, goToPrev]);

  // Scroll to initial position
  useEffect(() => {
    if (containerRef.current && initialScrollTop > 0) {
      containerRef.current.scrollTop = initialScrollTop;
    }
  }, [initialScrollTop]);

  const totalHeight = rowVirtualizer.getTotalSize();
  const items = rowVirtualizer.getVirtualItems();

  return (
    <>
      {/* Gallery Grid */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: "100%" }}
      >
        <div
          style={{
            height: `${totalHeight}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {items.map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const startPhotoIndex = rowIndex * columns;
            const rowPhotos = photos.slice(startPhotoIndex, startPhotoIndex + columns);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${itemSize}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                  padding: gap > 0 ? `0 0 ${gap}px 0` : 0,
                }}
              >
                {rowPhotos.map((photo, colIndex) => {
                  const globalIndex = startPhotoIndex + colIndex;
                  return (
                    <PhotoGridItem
                      key={photo.id}
                      photo={photo}
                      aspectRatio={aspectRatio}
                      onClick={() => handlePhotoClick(photo, globalIndex)}
                      onLoad={handlePhotoLoad}
                      renderOverlay={renderOverlay}
                      loadingPlaceholder={loadingPlaceholder}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox.isOpen && lightbox.currentPhoto && (
        <Lightbox
          photo={lightbox.currentPhoto}
          onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
          onPrev={goToPrev}
          onNext={goToNext}
          currentIndex={lightbox.currentIndex}
          totalCount={photos.length}
        />
      )}
    </>
  );
});

// Individual photo grid item with lazy loading
const PhotoGridItem = memo(function PhotoGridItem({
  photo,
  aspectRatio,
  onClick,
  onLoad,
  renderOverlay,
  loadingPlaceholder,
}: {
  photo: GalleryPhoto;
  aspectRatio: string;
  onClick: () => void;
  onLoad: () => void;
  renderOverlay?: (photo: GalleryPhoto, index: number) => React.ReactNode;
  loadingPlaceholder?: React.ReactNode;
}) {
  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-lg"
      style={{ aspectRatio }}
      onClick={onClick}
    >
      <LazyImage
        src={photo.url}
        thumbnail={photo.thumbnail}
        alt={photo.alt}
        className="w-full h-full"
        style={{ borderRadius: "0.5rem" }}
        onLoadComplete={onLoad}
        placeholder={
          loadingPlaceholder || (
            <div className="w-full h-full bg-slate-200 animate-pulse rounded-lg" />
          )
        }
      />

      {/* Hover overlay */}
      {renderOverlay && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg">
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {renderOverlay(photo, 0)}
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-white/90 rounded-full p-2 shadow-lg">
          <ZoomIn className="w-5 h-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
});

// Lightbox component
const Lightbox = memo(function Lightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}: {
  photo: GalleryPhoto;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation - Previous */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt={photo.alt}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "85vh" }}
      />

      {/* Navigation - Next */}
      {currentIndex < totalCount - 1 && (
        <button
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-2 rounded-full text-white text-sm">
        {currentIndex + 1} / {totalCount}
      </div>
    </div>
  );
});

/**
 * Simple Gallery - Non-virtualized for small lists
 * Use this for < 50 photos for simpler implementation
 */
export function SimpleGallery({
  photos,
  columns = 3,
  gap = 8,
  onPhotoClick,
}: {
  photos: GalleryPhoto[];
  columns?: number;
  gap?: number;
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
          onClick={() => onPhotoClick?.(photo, index)}
        >
          <LazyImage
            src={photo.url}
            thumbnail={photo.thumbnail}
            alt={photo.alt}
            className="w-full h-full transition-transform group-hover:scale-105"
            style={{ objectFit: "cover" }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        </div>
      ))}
    </div>
  );
}

export default VirtualizedGallery;
