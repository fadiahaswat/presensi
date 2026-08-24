/**
 * VirtualizedList - High Performance Virtualized List Component
 * Uses @tanstack/react-virtual for efficient rendering of large lists
 * Only renders items visible in viewport + overscan buffer
 */

import React, { useRef, useMemo, useCallback, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  style?: React.CSSProperties;
  onEndReached?: () => void;
  endThreshold?: number;
  /** Show skeleton placeholders while loading */
  isLoading?: boolean;
  skeletonCount?: number;
  skeletonHeight?: number;
}

const DEFAULT_ESTIMATE_SIZE = 120;
const DEFAULT_OVERSCAN = 5;

export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = DEFAULT_ESTIMATE_SIZE,
  overscan = DEFAULT_OVERSCAN,
  getItemKey,
  className = "",
  style,
  onEndReached,
  endThreshold = 200,
  isLoading = false,
  skeletonCount = 5,
  skeletonHeight = 100,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Detect scroll to end for infinite loading
  React.useEffect(() => {
    if (!onEndReached || isLoading) return;

    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < endThreshold) {
        onEndReached();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [onEndReached, endThreshold, isLoading]);

  // Memoized skeleton renderer
  const SkeletonItem = memo(({ height }: { height: number }) => (
    <div
      className="animate-pulse bg-slate-100 rounded-xl mb-3"
      style={{ height }}
    >
      <div className="h-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
    </div>
  ));

  if (isLoading) {
    return (
      <div ref={parentRef} className={`overflow-auto ${className}`} style={style}>
        <div className="p-2">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonItem key={i} height={skeletonHeight} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div ref={parentRef} className={`overflow-auto ${className}`} style={style}>
        <div className="p-4 text-center text-slate-500" />
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={style}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Specialized hook for creating performant list configurations
export function useVirtualizedListConfig<T>(options: {
  items: T[];
  estimateSize?: number;
  overscan?: number;
}) {
  const { items, estimateSize = DEFAULT_ESTIMATE_SIZE, overscan = DEFAULT_OVERSCAN } = options;

  return useMemo(() => ({
    size: items.length,
    estimateSize,
    overscan,
  }), [items.length, estimateSize, overscan]);
}

// Export memoized item wrapper for better performance
export function memoizedItem<P>(Component: React.ComponentType<P>) {
  return memo(Component);
}
