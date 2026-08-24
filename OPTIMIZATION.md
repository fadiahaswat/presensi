# Performa Optimasi - Presensi App

Dokumentasi optimasi performa yang sudah diimplementasikan.

## 1. Virtualization (List Rendering)

### File Baru
- [VirtualizedList.tsx](src/app/components/VirtualizedList.tsx) - High-performance virtualized list
- [PendingIzinItem.tsx](src/app/components/PendingIzinItem.tsx) - Memoized card component
- [ApprovedIzinItem.tsx](src/app/components/ApprovedIzinItem.tsx) - Memoized card component

### Penggunaan
```tsx
import { VirtualizedList } from "./components/VirtualizedList";
import { PendingIzinItem } from "./components/PendingIzinItem";

// Untuk list panjang dengan virtualization
<VirtualizedList
  items={pendingList}
  renderItem={(item) => (
    <PendingIzinItem
      item={item}
      onApprove={handleApprove}
      onReject={handleReject}
      onViewDetail={handleViewDetail}
    />
  )}
  estimateSize={200}
  overscan={3}
  getItemKey={(item) => item.id}
/>
```

### Manfaat
- Hanya merender item yang visible di viewport
- Reduced DOM nodes secara signifikan
- Memory usage lebih rendah untuk list besar
- Smooth scrolling tanpa lag

---

## 2. Memoization Hooks

### File Baru
- [useMemoList.ts](src/app/hooks/useMemoList.ts) - Optimized list hooks

### Fitur
- `useMemoList` - Memoized filter/sort dengan lazy evaluation
- `useDebounce` - Debounce value updates
- `useThrottle` - Throttle value updates
- `useLocalStorage` - Typed localStorage hook
- `useAsyncMemo` - Async memoization dengan loading states

### Penggunaan
```tsx
import { useMemoList, useDebounce, useAsyncMemo } from "./hooks/useMemoList";

// Memoized list
const { items, filteredCount, getPage } = useMemoList({
  items: allItems,
  keyExtractor: (item) => item.id,
  defaultSort: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

// Debounced search
const debouncedQuery = useDebounce(searchQuery, 300);

// Async data fetching dengan timeout
const { data, isLoading, error, refresh } = useAsyncMemo(
  () => fetchData(),
  [dependency],
  { timeout: 5000 }
);
```

---

## 3. Adaptive Sync (googleSyncService.ts)

### Fitur Optimasi

#### Adaptive Polling Interval
- **Active user**: Poll setiap 10 detik (min interval)
- **Normal**: Poll setiap 20 detik (base interval)
- **Idle user**: Poll setiap 2 menit (max interval)

#### Connection Quality Tracking
```typescript
const metrics = googleSyncService.getSyncMetrics();
// Returns: { avgLatency, queueSize, connectionQuality, ... }
```

#### Priority Sync
```typescript
// Sync table tertentu secara langsung
await googleSyncService.syncTable("attendance");

// Batch sync multiple tables
await googleSyncService.syncTablesBatch(["attendance", "izin"]);
```

### Alur Optimasi

```
User Activity Detected
        ↓
Track Activity → Adjust Interval
        ↓
Poll Delta dengan Latency Tracking
        ↓
Ada Updates? → Yes: Reset counter, notify listeners
        ↓
Tidak Ada Updates (5x berturut-turut)
        ↓
Tambah Interval Polling 1.5x
```

---

## 4. Code Splitting (yang sudah ada)

### Lazy Loaded Components
```tsx
const LeaderboardModal = lazy(() => import("./components/LeaderboardModal"));
const PageSantriIzin = lazy(() => import("./components/PageSantriIzin"));
```

### Manfaat
- Initial bundle size lebih kecil
- Load on demand untuk fitur yang jarang dipakai
- Faster Time to Interactive (TTI)

---

## 5. Service Worker Strategy

### Network First, Cache Fallback
```javascript
// sw.js
fetch(request)
  .then(response => cache.clone()) // Cache successful responses
  .catch(() => cache.match())      // Fallback to cache on network fail
```

---

## 6. Performance Metrics

### Target Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Initial Load | < 3s | ~3.5s timeout |
| Delta Poll | < 500ms | Varies |
| List Scroll | 60fps | Depends on list size |
| Memory Usage | < 50MB | Varies |

### Monitoring
```typescript
// Track sync performance
const metrics = googleSyncService.getSyncMetrics();
console.log(`Latency: ${metrics.avgLatency}ms, Quality: ${metrics.connectionQuality}`);
```

---

## 7. Implementasi di Komponen

### Checklist untuk List Components

1. **Gunakan memoized item components**:
   ```tsx
   export const MyListItem = memo(function MyListItem({ item, onAction }) {
     // Component code
   });
   ```

2. **Gunakan key extractor yang stabil**:
   ```tsx
   <VirtualizedList
     getItemKey={(item) => item.id}
   />
   ```

3. **Lazy load images**:
   ```tsx
   <img src={url} loading="lazy" decoding="async" />
   ```

4. **Debounce expensive operations**:
   ```tsx
   const debouncedFilter = useDebounce(filterText, 300);
   ```

---

## 8. Future Optimizations

### Pending
- [ ] IndexedDB untuk localStorage > 5MB
- [ ] React Query / SWR untuk network caching
- [ ] Image CDN dengan lazy loading
- [ ] Web Workers untuk heavy computations

### Not Recommended
- Server-side rendering (SSR) - overkill untuk app ini
- GraphQL - Overhead tidak sebanding dengan manfaat
