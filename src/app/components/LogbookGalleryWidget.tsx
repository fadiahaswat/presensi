import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import {
  Camera, ChevronRight, X, Image as ImageIcon, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LogbookStorage } from "./JurnalLogbookModal";
import { googleSyncService } from "../utils/googleSyncService";
import { LazyImage } from "./LazyImage"; // OPTIMIZATION: Use LazyImage for progressive loading

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  role?: string;
  kamar?: string;
  email?: string;
}

interface LogbookGalleryWidgetProps {
  logbookData: LogbookStorage;
  musyrifList: Musyrif[];
  isLoading?: boolean;
  onOpenLogbook?: () => void;
  onOpenFullGallery?: () => void;
}

export interface GalleryPostItem {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama: string;
  date: string;
  taskKey: string;
  taskTitle: string;
  taskNumber: number;
  taskCategory: string;
  completedAt?: string;
  photoUrl: string;
  photoThumbnailUrl?: string; // OPTIMIZATION: Smaller thumbnail for grid display
  photoTakenAt?: string;
  photoSource?: "camera" | "preset" | "gallery";
  photoWatermark?: string;
  notes?: string;
  stepsCount?: number;
  gpsVerified?: boolean;
}

export const LOGBOOK_TASK_TITLES: Record<string, { title: string; category: string }> = {
  tahajjud: { title: "Membangunkan Shalat Tahajjud", category: "Malam / Subuh" },
  muhadatsah: { title: "Subuh & Muhadatsah / Tahfizh", category: "Subuh" },
  piketSubuh: { title: "Piket Subuh (Pembagian Makan)", category: "Subuh" },
  cekSakit: { title: "Memeriksa Santri yang Sakit", category: "Pagi" },
  kerjaBakti: { title: "Mendampingi Kerja Bakti Asrama", category: "Pagi" },
  sisirSekolah: { title: "Menyisir Kamar Berangkat Sekolah", category: "Pagi" },
  jagaGerbang: { title: "Menjaga Gerbang Asrama", category: "Pagi" },
  jumat: { title: "Mengontrol Shalat Jum'at", category: "Siang" },
  ashar: { title: "Mendampingi Shalat Ashar", category: "Sore" },
  mandiSore: { title: "Mengoprak Santri Mandi Sore", category: "Sore" },
  maghrib: { title: "Mendampingi Shalat Maghrib", category: "Maghrib" },
  bahasa: { title: "Pembelajaran Bahasa / Tahsin", category: "Malam" },
  belajarMalam: { title: "Mendampingi Belajar Malam", category: "Malam" },
  sisirMalam: { title: "Menyisir Kamar Tidur Malam", category: "Malam" }
};

// Memoized lookup cache
const TASK_TITLE_CACHE = new Map<string, string>();
const MIN_DATE_FILTER = "2026-08-18";

export const getTaskDisplayTitle = (key: string): string => {
  if (TASK_TITLE_CACHE.has(key)) {
    return TASK_TITLE_CACHE.get(key)!;
  }

  let result: string;
  if (key.startsWith("agenda_")) {
    result = "Presensi Agenda Rapat & Pertemuan";
  } else {
    result = LOGBOOK_TASK_TITLES[key]?.title || (
      key === "cekSakit" ? "Memeriksa Santri yang Sakit" :
      key === "kerjaBakti" ? "Mendampingi Kerja Bakti Asrama" :
      key === "sisirSekolah" ? "Menyisir Kamar Berangkat Sekolah" :
      key === "jagaGerbang" ? "Menjaga Gerbang Asrama" :
      key === "mandiSore" ? "Mengoprak Santri Mandi Sore" :
      key === "sisirMalam" ? "Menyisir Kamar Tidur Malam" :
      key === "piketSubuh" ? "Piket Subuh Asrama" :
      key === "tahajjud" ? "Membangunkan Tahajjud" :
      key === "muhadatsah" ? "Muhadatsah / Tahfizh" :
      key === "ashar" ? "Mendampingi Shalat Ashar" :
      key === "maghrib" ? "Mendampingi Shalat Maghrib" :
      key === "bahasa" ? "Pembelajaran Bahasa / Tahsin" :
      key === "belajarMalam" ? "Belajar Malam Santri" :
      key === "jumat" ? "Mengontrol Shalat Jum'at" :
      key
    );
  }

  // Cache only if under limit
  if (TASK_TITLE_CACHE.size < 100) {
    TASK_TITLE_CACHE.set(key, result);
  }
  return result;
};

// Stable timestamp parser - avoids creating regex on each call
const TIME_REGEX = /^\d{2}:\d{2}/;

const getPostTimestamp = (p: GalleryPostItem): number => {
  if (p.photoTakenAt) {
    const t = new Date(p.photoTakenAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (p.date) {
    const timePart = (p.completedAt && TIME_REGEX.test(p.completedAt)) ? p.completedAt : "12:00";
    const t = new Date(`${p.date}T${timePart}:00`).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
};

// Skip keys that are not task entries
const SKIP_KEYS = new Set([
  "generalNotes", "id", "musyrifId", "date", "created_at", "updated_at", "is_deleted"
]);

// Build musyrif lookup map once for O(1) access
const buildMusyrifMap = (musyrifList: Musyrif[]): Map<string, Musyrif> => {
  const map = new Map<string, Musyrif>();
  for (const m of musyrifList) {
    if (m.id) map.set(m.id, m);
    if (m.name) map.set(m.name, m);
  }
  return map;
};

export const LogbookGalleryWidget: React.FC<LogbookGalleryWidgetProps> = memo(({
  logbookData = {},
  musyrifList = [],
  isLoading = false,
  onOpenLogbook,
  onOpenFullGallery
}) => {
  const [selectedPost, setSelectedPost] = useState<GalleryPostItem | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Use ref to track latest sync status without causing re-renders
  const isSyncingRef = useRef(false);

  // Stable callback for opening modals
  const handleOpenLogbook = useCallback(() => {
    onOpenLogbook?.();
  }, [onOpenLogbook]);

  const handleOpenFullGallery = useCallback(() => {
    onOpenFullGallery?.();
  }, [onOpenFullGallery]);

  const handleSelectPost = useCallback((post: GalleryPostItem) => {
    setSelectedPost(post);
  }, []);

  const handleClosePost = useCallback(() => {
    setSelectedPost(null);
  }, []);

  // Subscribe to real-time Google Cloud Sync status
  useEffect(() => {
    const unsub = googleSyncService.subscribeStatus((st) => {
      isSyncingRef.current = st.isSyncing;
      setIsSyncing(st.isSyncing);
    });
    return unsub;
  }, []);

  // Build musyrif lookup map once
  const musyrifMap = useMemo(
    () => buildMusyrifMap(musyrifList || []),
    [musyrifList]
  );

  // Extract all gallery posts with photo from logbookData
  const allPosts = useMemo<GalleryPostItem[]>(() => {
    const posts: GalleryPostItem[] = [];
    const data = logbookData || {};
    const entries = Object.entries(data);

    for (let i = 0; i < entries.length; i++) {
      const [mId, dateEntries] = entries[i];
      const musyrif = musyrifMap.get(mId);
      const mName = musyrif?.name || mId || "Musyrif Asrama";
      const mAsrama = musyrif?.asrama || "Asrama";

      if (!dateEntries || typeof dateEntries !== "object") continue;

      const dateEntriesList = Object.entries(dateEntries);

      for (let j = 0; j < dateEntriesList.length; j++) {
        const [dateStr, entry] = dateEntriesList[j];

        if (!entry || typeof entry !== "object" || dateStr < MIN_DATE_FILTER) continue;

        const entryKeys = Object.keys(entry);

        for (let k = 0; k < entryKeys.length; k++) {
          const key = entryKeys[k];

          if (SKIP_KEYS.has(key)) continue;

          const taskVal = (entry as any)[key];
          if (!taskVal || typeof taskVal !== "object") continue;

          const tItem = taskVal as any;
          if (!tItem.photoUrl) continue;

          const taskDef = LOGBOOK_TASK_TITLES[key];
          const displayTitle = getTaskDisplayTitle(key);
          const category = taskDef?.category || "Kegiatan";

          posts.push({
            id: `${mId}_${dateStr}_${key}`,
            musyrifId: mId,
            musyrifName: mName,
            asrama: mAsrama,
            date: dateStr,
            taskKey: key,
            taskTitle: displayTitle,
            taskNumber: 1,
            taskCategory: category,
            completedAt: tItem.completedAt,
            photoUrl: tItem.photoUrl,
            photoTakenAt: tItem.photoTakenAt,
            photoSource: tItem.photoSource || "camera",
            photoWatermark: tItem.photoWatermark,
            notes: tItem.notes,
            stepsCount: tItem.stepsCount,
            gpsVerified: tItem.gpsVerified
          });
        }
      }
    }

    // Sort by timestamp descending
    if (posts.length > 9) {
      posts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
      return posts.slice(0, 9);
    }

    return posts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  }, [logbookData, musyrifMap]);

  const displayPosts = allPosts;
  const showSkeleton = isLoading && allPosts.length === 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden space-y-0">
      {/* Header Widget */}
      <WidgetHeader isSyncing={isSyncing} />

      {/* Main Content */}
      {showSkeleton ? (
        <SkeletonGrid />
      ) : displayPosts.length === 0 ? (
        <EmptyState onOpenLogbook={handleOpenLogbook} />
      ) : (
        <>
          <PhotoGrid posts={displayPosts} onPostClick={handleSelectPost} />
          {onOpenFullGallery && (
            <GalleryCTAButton onClick={handleOpenFullGallery} />
          )}
        </>
      )}

      {/* Simple Photo View Modal - Full Screen */}
      <AnimatePresence>
        {selectedPost && (
          <PhotoModal post={selectedPost} onClose={handleClosePost} />
        )}
      </AnimatePresence>
    </div>
  );
});

// ============ MEMOIZED SUB-COMPONENTS ============

const WidgetHeader = memo(({ isSyncing }: { isSyncing: boolean }) => (
  <div className="p-4 sm:p-5 pb-3.5 flex items-center justify-between gap-3 border-b border-slate-100">
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
          <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-rose-600">
            <Camera className="w-5 h-5" />
          </div>
        </div>
        {/* Static dot - shows sync is happening */}
        {isSyncing && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Galeri Logbook Asrama
        </h3>
        <p className="text-xs text-slate-500">
          Dokumentasi foto kegiatan harian musyrif
        </p>
      </div>
    </div>
  </div>
));

const SkeletonGrid = memo(() => (
  <div>
    <div className="grid grid-cols-3 gap-0 w-full bg-slate-100 overflow-hidden">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="relative aspect-square bg-slate-200 overflow-hidden border-[0.5px] border-white/60"
        >
          <div className="w-full h-full bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-200 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-slate-300 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
    <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-2">
      <RefreshCw className="w-3.5 h-3.5 text-rose-500 animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Memuat & menyinkronkan galeri foto...</span>
    </div>
  </div>
));

const EmptyState = memo(({ onOpenLogbook }: { onOpenLogbook?: () => void }) => (
  <div className="p-4 sm:p-5">
    <div className="py-10 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2.5">
        <Camera className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-700">Belum Ada Foto Logbook</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
        Musyrif belum mengunggah foto dokumentasi kegiatan logbook.
      </p>
      {onOpenLogbook && (
        <button
          onClick={onOpenLogbook}
          className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Camera className="w-3.5 h-3.5" />
          Buka Halaman Logbook
        </button>
      )}
    </div>
  </div>
));

const PhotoGridItem = memo(({ post, onClick }: { post: GalleryPostItem; onClick: () => void }) => (
  <motion.div
    key={post.id}
    whileHover={{ opacity: 0.92 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative aspect-square rounded-none overflow-hidden bg-slate-900 cursor-pointer select-none border-[0.5px] border-slate-900/50"
  >
    <img
      src={post.photoUrl}
      alt={post.taskTitle}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      loading="lazy"
      decoding="async"
    />
  </motion.div>
));

const PhotoGrid = memo(({ posts, onPostClick }: { posts: GalleryPostItem[]; onPostClick: (p: GalleryPostItem) => void }) => (
  <div className="grid grid-cols-3 gap-0 w-full bg-slate-950">
    {posts.map((post) => (
      <PhotoGridItem key={post.id} post={post} onClick={() => onPostClick(post)} />
    ))}
  </div>
));

const GalleryCTAButton = memo(({ onClick }: { onClick: () => void }) => (
  <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100">
    <button
      onClick={onClick}
      className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all group active:scale-[0.99]"
    >
      <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
      <span>Lihat Semua Galeri</span>
      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
    </button>
  </div>
));

const PhotoModal = memo(({ post, onClose }: { post: GalleryPostItem; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={post.photoUrl}
          alt={post.taskTitle}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </motion.div>
  </div>
));
