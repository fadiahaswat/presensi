/**
 * Photo Cache Service - IndexedDB-based photo caching
 * Replaces localStorage for large binary data with unlimited storage
 */

const DB_NAME = 'presensi_photo_cache';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const THUMB_STORE_NAME = 'thumbnails';
const META_STORE = 'metadata';

interface PhotoCache {
  url: string;
  data: string; // base64 data URL
  thumbnail?: string;
  size: number;
  cachedAt: number;
  lastAccessed: number;
  mimeType: string;
}

interface PhotoMetadata {
  totalPhotos: number;
  totalSize: number;
  lastCleanup: number;
}

class PhotoCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('[PhotoCache] Failed to open IndexedDB, falling back to memory cache');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PhotoCache] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Main photo store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const photoStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          photoStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          photoStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Thumbnail store (smaller, separate for quick loading)
        if (!db.objectStoreNames.contains(THUMB_STORE_NAME)) {
          const thumbStore = db.createObjectStore(THUMB_STORE_NAME, { keyPath: 'url' });
          thumbStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Cache a photo with optional thumbnail
   */
  async cachePhoto(url: string, data: string, thumbnail?: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const entry: PhotoCache = {
      url,
      data,
      thumbnail,
      size: data.length,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      mimeType: this.detectMimeType(data),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => resolve();
    });
  }

  /**
   * Get cached photo
   */
  async getPhoto(url: string): Promise<PhotoCache | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as PhotoCache | undefined;
        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);
        }
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get thumbnail (faster than full photo)
   */
  async getThumbnail(url: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME, THUMB_STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const thumbStore = tx.objectStore(THUMB_STORE_NAME);

      // First check thumbnail store
      const thumbReq = thumbStore.get(url);
      thumbReq.onsuccess = () => {
        if (thumbReq.result) {
          resolve(thumbReq.result.data);
          return;
        }

        // Fallback to main store
        const req = store.get(url);
        req.onsuccess = () => {
          const result = req.result as PhotoCache | undefined;
          if (result?.thumbnail) {
            resolve(result.thumbnail);
          } else if (result?.data) {
            // Return full data if no thumbnail
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      };
      thumbReq.onerror = () => reject(thumbReq.error);
    });
  }

  /**
   * Check if photo is cached
   */
  async hasPhoto(url: string): Promise<boolean> {
    const photo = await this.getPhoto(url);
    return photo !== null;
  }

  /**
   * Cache multiple photos in batch (more efficient)
   */
  async cachePhotosBatch(photos: Array<{ url: string; data: string; thumbnail?: string }>): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      photos.forEach(({ url, data, thumbnail }) => {
        const entry: PhotoCache = {
          url,
          data,
          thumbnail,
          size: data.length,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          mimeType: this.detectMimeType(data),
        };
        store.put(entry);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Remove photo from cache
   */
  async removePhoto(url: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME, THUMB_STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).delete(url);
      tx.objectStore(THUMB_STORE_NAME).delete(url);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clear all cached photos
   */
  async clearCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME, THUMB_STORE_NAME, META_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(THUMB_STORE_NAME).clear();

      // Update metadata
      const metaStore = tx.objectStore(META_STORE);
      metaStore.put({ id: 'stats', totalPhotos: 0, totalSize: 0, lastCleanup: Date.now() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; estimatedSize: number }> {
    await this.init();
    if (!this.db) return { count: 0, estimatedSize: 0 };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      let totalSize = 0;

      countReq.onsuccess = () => {
        const count = countReq.result;

        // Calculate total size
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            totalSize += (cursor.value as PhotoCache).size || 0;
            cursor.continue();
          } else {
            resolve({ count, estimatedSize: totalSize });
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  /**
   * Cleanup old entries (LRU eviction when storage is full)
   */
  async cleanup(maxEntries: number = 500): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result;
        if (count <= maxEntries) {
          resolve(0);
          return;
        }

        // Delete oldest entries
        const toDelete = count - maxEntries;
        let deleted = 0;
        const index = store.index('lastAccessed');
        const cursorReq = index.openCursor();

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            // Update metadata
            const metaStore = tx.objectStore(META_STORE);
            metaStore.put({ id: 'stats', totalPhotos: count - deleted, lastCleanup: Date.now() });
            resolve(deleted);
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  private detectMimeType(dataUrl: string): string {
    if (dataUrl.startsWith('data:image/png')) return 'image/png';
    if (dataUrl.startsWith('data:image/gif')) return 'image/gif';
    if (dataUrl.startsWith('data:image/webp')) return 'image/webp';
    return 'image/jpeg';
  }
}

export const photoCacheService = new PhotoCacheService();
