/**
 * ============================================================================
 * PHOTO STORAGE SERVICE - Pisahkan Foto dari Metadata
 * Fotos disimpan di IndexedDB, metadata hanya menyimpan photoId reference
 * ============================================================================
 */

import { setPhotosBatch, getPhoto, deletePhoto, getStats, clearCache } from './photoCacheService';

const PHOTO_REFERENCE_PREFIX = 'photo:';
const PHOTO_ID_PREFIX = 'photo_';

// Storage keys for metadata (NO photos in localStorage)
const METADATA_KEYS = {
  LOGBOOK_PHOTOS: 'presensi_logbook_photo_refs_v1',
  MUTABAAH_PHOTOS: 'presensi_mutabaah_photo_refs_v1',
  IZIN_PHOTOS: 'presensi_izin_photo_refs_v1',
  SANTRI_SAKIT_PHOTOS: 'presensi_santri_sakit_photo_refs_v1',
};

/**
 * Photo reference - stored in localStorage (NOT the photo data itself)
 */
export interface PhotoReference {
  photoId: string;
  recordId: string;
  field: string;
  timestamp: number;
  source?: 'camera' | 'gallery' | 'preset';
  thumbnail?: string; // Small thumbnail inline (optional, for quick display)
}

/**
 * Generate stable photo ID from record info
 */
export function generatePhotoId(recordId: string, field: string): string {
  return `${PHOTO_ID_PREFIX}${recordId}_${field}_${Date.now()}`;
}

/**
 * Check if a value is a photo reference (not inline Base64)
 */
export function isPhotoReference(value: string): boolean {
  return value?.startsWith(PHOTO_REFERENCE_PREFIX);
}

/**
 * Extract photo ID from photo reference
 */
export function extractPhotoIdFromRef(ref: string): string | null {
  if (!ref?.startsWith(PHOTO_REFERENCE_PREFIX)) return null;
  return ref.replace(PHOTO_REFERENCE_PREFIX, '');
}

/**
 * Create photo reference string
 */
export function createPhotoRef(photoId: string): string {
  return `${PHOTO_REFERENCE_PREFIX}${photoId}`;
}

// ============ Photo Metadata Storage (localStorage - refs only) ============

/**
 * Get all photo references for a table
 */
export function getPhotoReferences(tableKey: string): Record<string, PhotoReference> {
  try {
    const saved = localStorage.getItem(tableKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_) {}
  return {};
}

/**
 * Save photo references for a table
 */
export function savePhotoReferences(tableKey: string, refs: Record<string, PhotoReference>): void {
  try {
    localStorage.setItem(tableKey, JSON.stringify(refs));
  } catch (e) {
    console.warn(`[PhotoStorage] Failed to save refs for ${tableKey}:`, e);
  }
}

/**
 * Add a photo reference
 */
export function addPhotoReference(
  tableKey: string,
  recordId: string,
  field: string,
  photoId: string,
  source?: 'camera' | 'gallery' | 'preset'
): PhotoReference {
  const refs = getPhotoReferences(tableKey);
  const ref: PhotoReference = {
    photoId,
    recordId,
    field,
    timestamp: Date.now(),
    source,
  };
  refs[photoId] = ref;
  savePhotoReferences(tableKey, refs);
  return ref;
}

/**
 * Remove a photo reference
 */
export function removePhotoReference(tableKey: string, photoId: string): void {
  const refs = getPhotoReferences(tableKey);
  if (refs[photoId]) {
    delete refs[photoId];
    savePhotoReferences(tableKey, refs);
    // Also delete from IndexedDB
    deletePhoto(photoId).catch(() => {});
  }
}

/**
 * Get photo data from IndexedDB by photoId
 */
export async function getPhotoById(photoId: string): Promise<string | null> {
  try {
    const cached = await getPhoto(photoId);
    return cached?.data || null;
  } catch (_) {
    return null;
  }
}

/**
 * Store photo in IndexedDB with reference
 */
export async function storePhoto(
  photoId: string,
  photoData: string,
  tableKey: string,
  recordId: string,
  field: string,
  source?: 'camera' | 'gallery' | 'preset'
): Promise<PhotoReference> {
  // Store actual photo in IndexedDB
  await setPhotosBatch([{ id: photoId, data: photoData }]);

  // Store reference in localStorage
  const ref = addPhotoReference(tableKey, recordId, field, photoId, source);

  console.log(`[PhotoStorage] Stored photo ${photoId} (${(photoData.length / 1024).toFixed(1)}KB)`);
  return ref;
}

/**
 * Get photo by reference (handles both inline Base64 and photo refs)
 */
export async function resolvePhotoValue(
  value: string | null | undefined
): Promise<{ data: string | null; isReference: boolean; photoId: string | null }> {
  if (!value) {
    return { data: null, isReference: false, photoId: null };
  }

  // Direct Base64 - return as is
  if (value.startsWith('data:image')) {
    return { data: value, isReference: false, photoId: null };
  }

  // Photo reference - fetch from IndexedDB
  if (isPhotoReference(value)) {
    const photoId = extractPhotoIdFromRef(value);
    if (photoId) {
      const data = await getPhotoById(photoId);
      return { data, isReference: true, photoId };
    }
  }

  // URL or other - return as is
  return { data: value, isReference: false, photoId: null };
}

/**
 * Batch resolve photo values
 */
export async function resolvePhotoValues(
  items: Array<{ recordId: string; field: string; value: string | null }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(items.map(async ({ recordId, field, value }) => {
    const key = `${recordId}_${field}`;
    if (value) {
      const resolved = await resolvePhotoValue(value);
      if (resolved.data) {
        results.set(key, resolved.data);
      }
    }
  }));

  return results;
}

// ============ Record Normalization (replace inline Base64 with refs) ============

/**
 * Normalize a record - replace inline Base64 photos with photo references
 * Returns the normalized record and a list of photos to store
 */
export function normalizeRecordPhotos(
  record: any,
  recordId: string,
  tableKey: string
): { normalized: any; photos: Array<{ photoId: string; data: string; field: string }> } {
  const photos: Array<{ photoId: string; data: string; field: string }> = [];

  function processNode(node: any, path: string[] = []): any {
    if (!node || typeof node !== 'object') return node;

    if (Array.isArray(node)) {
      return node.map((item, idx) => processNode(item, [...path, String(idx)]));
    }

    const result: any = {};
    for (const key in node) {
      const value = node[key];

      // Handle photo fields
      if (typeof value === 'string' && value.startsWith('data:image')) {
        // Generate photo ID
        const photoId = generatePhotoId(recordId, key);

        // Store photo for later
        photos.push({ photoId, data: value, field: key });

        // Replace with reference
        result[key] = createPhotoRef(photoId);
      } else if (value && typeof value === 'object') {
        result[key] = processNode(value, [...path, key]);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  const normalized = processNode(record);
  return { normalized, photos };
}

/**
 * Denormalize a record - replace photo references with actual photo data
 * For display purposes
 */
export async function denormalizeRecordPhotos(
  record: any,
  tableKey: string
): Promise<any> {
  if (!record || typeof record !== 'object') return record;

  async function processNode(node: any): Promise<any> {
    if (!node || typeof node !== 'object') return node;

    if (Array.isArray(node)) {
      const results = await Promise.all(node.map((item) => processNode(item)));
      return results;
    }

    const result: any = {};
    for (const key in node) {
      const value = node[key];

      // Handle photo references
      if (isPhotoReference(value)) {
        const photoId = extractPhotoIdFromRef(value);
        if (photoId) {
          const photoData = await getPhotoById(photoId);
          result[key] = photoData || value; // Fallback to ref if not found
        } else {
          result[key] = value;
        }
      } else if (value && typeof value === 'object') {
        result[key] = await processNode(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return processNode(record);
}

/**
 * Store photos batch and update references
 */
export async function storePhotosBatch(
  tableKey: string,
  photos: Array<{ photoId: string; data: string; field: string; recordId: string }>
): Promise<void> {
  if (photos.length === 0) return;

  // Store photos in IndexedDB
  const photoItems = photos.map(p => ({ id: p.photoId, data: p.data }));
  await setPhotosBatch(photoItems);

  // Update references in localStorage
  const refs = getPhotoReferences(tableKey);
  for (const photo of photos) {
    refs[photo.photoId] = {
      photoId: photo.photoId,
      recordId: photo.recordId,
      field: photo.field,
      timestamp: Date.now(),
    };
  }
  savePhotoReferences(tableKey, refs);

  console.log(`[PhotoStorage] Stored ${photos.length} photos in batch`);
}

/**
 * Get photo statistics
 */
export async function getPhotoStorageStats(): Promise<{
  indexedDB: { count: number; size: string };
  metadata: Record<string, number>;
}> {
  const idbStats = await getStats();

  const metadata: Record<string, number> = {};
  for (const [key, storageKey] of Object.entries(METADATA_KEYS)) {
    const refs = getPhotoReferences(storageKey);
    metadata[key] = Object.keys(refs).length;
  }

  return {
    indexedDB: { count: idbStats.count, size: idbStats.sizeFormatted },
    metadata,
  };
}

/**
 * Clear all photo storage
 */
export async function clearAllPhotoStorage(): Promise<void> {
  // Clear IndexedDB
  await clearCache();

  // Clear metadata from localStorage
  for (const storageKey of Object.values(METADATA_KEYS)) {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  }

  console.log('[PhotoStorage] All photo storage cleared');
}

// ============ Quick Access Functions ============

export const PhotoStorage = {
  // Metadata storage keys
  LOGBOOK: METADATA_KEYS.LOGBOOK_PHOTOS,
  MUTABAAH: METADATA_KEYS.MUTABAAH_PHOTOS,
  IZIN: METADATA_KEYS.IZIN_PHOTOS,
  SANTRI_SAKIT: METADATA_KEYS.SANTRI_SAKIT_PHOTOS,

  // Core functions
  storePhoto,
  storePhotosBatch,
  getPhotoById,
  resolvePhotoValue,
  resolvePhotoValues,

  // Normalization
  normalizeRecordPhotos,
  denormalizeRecordPhotos,

  // References
  addPhotoReference,
  removePhotoReference,
  getPhotoReferences,

  // Utilities
  isPhotoReference,
  extractPhotoIdFromRef,
  createPhotoRef,
  generatePhotoId,

  // Maintenance
  getPhotoStorageStats,
  clearAllPhotoStorage,
};

export default PhotoStorage;
