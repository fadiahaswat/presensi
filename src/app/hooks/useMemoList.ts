/**
 * useMemoList - Optimized List Hook for Large Data Sets
 * Provides memoization and lazy evaluation for filtered/sorted lists
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";

export interface UseMemoListOptions<T> {
  items: T[];
  /** Key extractor for stable references */
  keyExtractor: (item: T) => string | number;
  /** Default sort function */
  defaultSort?: (a: T, b: T) => number;
  /** Debounce filter changes in ms */
  filterDebounce?: number;
}

export interface UseMemoListResult<T> {
  /** Original items count */
  totalCount: number;
  /** Filtered items count */
  filteredCount: number;
  /** Get page of items (for pagination) */
  getPage: (page: number, pageSize: number) => T[];
  /** Get filtered & sorted items */
  items: T[];
  /** Check if list is empty after filter */
  isEmpty: boolean;
  /** Re-filter items manually if needed */
  refresh: () => void;
}

/**
 * Optimized list hook with memoization
 * Use this for lists that are filtered/sorted frequently
 */
export function useMemoList<T>({
  items,
  keyExtractor,
  defaultSort,
  filterDebounce = 150,
}: UseMemoListOptions<T>): UseMemoListResult<T> {
  // Track filter version for lazy evaluation
  const filterVersionRef = useRef(0);
  const [, forceUpdate] = useState(0);

  // Stable item map for O(1) lookups
  const itemMap = useMemo(() => {
    const map = new Map<string | number, T>();
    items.forEach((item) => {
      map.set(keyExtractor(item), item);
    });
    return map;
  }, [items, keyExtractor]);

  // Sort items if defaultSort provided
  const sortedItems = useMemo(() => {
    if (!defaultSort) return items;
    return [...items].sort((a, b) => defaultSort(a, b));
  }, [items, defaultSort]);

  // Debounced refresh trigger
  const refresh = useCallback(() => {
    filterVersionRef.current += 1;
    forceUpdate((v) => v + 1);
  }, []);

  // Get paginated items
  const getPage = useCallback(
    (page: number, pageSize: number): T[] => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return sortedItems.slice(start, end);
    },
    [sortedItems]
  );

  return {
    totalCount: items.length,
    filteredCount: sortedItems.length,
    items: sortedItems,
    isEmpty: sortedItems.length === 0,
    getPage,
    refresh,
  };
}

/**
 * useDebounce - Debounce value updates
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Throttle value updates
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * useMemoFilter - Memoized filter hook
 * Filters are computed lazily and cached until dependencies change
 */
export function useMemoFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList
): T[] {
  const filterRef = useRef<((item: T) => boolean) | null>(null);
  const cacheRef = useRef<Map<string, T[]>>(new Map());

  // Check if filter function changed
  const filterChanged = filterRef.current !== filterFn;
  if (filterChanged) {
    filterRef.current = filterFn;
    cacheRef.current.clear();
  }

  // Simple cache key based on items length
  const cacheKey = `${items.length}`;

  return useMemo(() => {
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    const result = items.filter(filterFn);
    cacheRef.current.set(cacheKey, result);
    return result;
  }, [items, filterFn, cacheKey, ...deps]);
}

/**
 * useLocalStorage - Typed localStorage hook with JSON serialization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * useAsyncMemo - Async memoization with loading/error states
 */
export function useAsyncMemo<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList,
  options?: {
    initialValue?: T;
    timeout?: number;
  }
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T | undefined>(options?.initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create timeout promise if configured
    const timeoutPromise = options?.timeout
      ? new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error(`Operation timed out after ${options.timeout}ms`));
          }, options.timeout);
        })
      : null;

    try {
      const result = await Promise.race([
        asyncFn(),
        ...(timeoutPromise ? [timeoutPromise] : []),
      ]);
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
    }
  }, [asyncFn, options?.timeout]);

  // Execute on mount and when deps change
  useEffect(() => {
    execute();
  }, [execute]);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refresh };
}
