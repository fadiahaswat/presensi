import React, { useState, useMemo, useEffect } from "react";
import {
  Camera, ChevronRight, X, Image as ImageIcon, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LogbookStorage } from "./JurnalLogbookModal";
import { googleSyncService } from "../utils/googleSyncService";

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

export const getTaskDisplayTitle = (key: string): string => {
  return LOGBOOK_TASK_TITLES[key]?.title || (
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
};

export const LogbookGalleryWidget: React.FC<LogbookGalleryWidgetProps> = ({
  logbookData = {},
  musyrifList = [],
  isLoading = false,
  onOpenLogbook,
  onOpenFullGallery
}) => {
  const [selectedPost, setSelectedPost] = useState<GalleryPostItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(() => googleSyncService.getStatus().isSyncing);

  // Subscribe to real-time Google Cloud Sync status
  useEffect(() => {
    const unsub = googleSyncService.subscribeStatus((st) => {
      setIsSyncing(st.isSyncing);
    });
    return unsub;
  }, []);

  // Extract all gallery posts with photo from logbookData
  const allPosts = useMemo(() => {
    const posts: GalleryPostItem[] = [];

    Object.entries(logbookData || {}).forEach(([mId, dateEntries]) => {
      const musyrif = (musyrifList || []).find(m => m.id === mId || m.name === mId);
      const mName = musyrif?.name || mId || "Musyrif Asrama";
      const mAsrama = musyrif?.asrama || "Asrama";

      if (dateEntries && typeof dateEntries === "object") {
        Object.entries(dateEntries).forEach(([dateStr, entry]) => {
          if (!entry || typeof entry !== "object" || dateStr < "2026-08-18") return;

          Object.entries(entry).forEach(([key, taskVal]) => {
            if (
              key === "generalNotes" ||
              key === "id" ||
              key === "musyrifId" ||
              key === "date" ||
              key === "created_at" ||
              key === "updated_at" ||
              key === "is_deleted" ||
              !taskVal ||
              typeof taskVal !== "object"
            ) return;

            const tItem = taskVal as any;

            if (tItem && tItem.photoUrl) {
              const displayTitle = getTaskDisplayTitle(key);
              const category = LOGBOOK_TASK_TITLES[key]?.category || "Kegiatan";

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
          });
        });
      }
    });

    // Sort strictly by latest timestamp (photoTakenAt or date/completedAt)
    const getPostTimestamp = (p: LogbookPhotoPost) => {
      if (p.photoTakenAt) {
        const t = new Date(p.photoTakenAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (p.date) {
        const timePart = (p.completedAt && /^\d{2}:\d{2}/.test(p.completedAt)) ? p.completedAt : "12:00";
        const t = new Date(`${p.date}T${timePart}:00`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    return posts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  }, [logbookData, musyrifList]);

  // Always display top 9 latest posts on Beranda for seamless 3x3 layout
  const displayPosts = allPosts.slice(0, 9);
  const showSkeleton = isLoading || (isSyncing && allPosts.length === 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden space-y-0">
      {/* Header Widget */}
      <div className="p-4 sm:p-5 pb-3.5 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-rose-600">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full flex items-center justify-center ${isSyncing ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Galeri Logbook Asrama
              </h3>
              {isSyncing ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Sinkron</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  Live Feed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Dokumentasi foto kegiatan harian musyrif langsung dari kamera asrama
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {showSkeleton ? (
        /* SKELETON SHIMMER 3x3 (Saat Fetch / Sinkronisasi Data Cloud) */
        <div>
          <div className="grid grid-cols-3 gap-0 w-full bg-slate-100 overflow-hidden">
            {[...Array(9)].map((_, i) => (
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
      ) : allPosts.length === 0 ? (
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
                onClick={() => onOpenLogbook()}
                className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                Buka Halaman Logbook
              </button>
            )}
          </div>
        </div>
      ) : (
        /* GRID MODE: Edge-to-Edge Full Bleed (Menyentuh Sisi Kiri-Kanan Kartu & Tanpa Rounded) */
        <div>
          <div className="grid grid-cols-3 gap-0 w-full bg-slate-950">
            {displayPosts.map((post) => (
              <motion.div
                key={post.id}
                whileHover={{ opacity: 0.92 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square rounded-none overflow-hidden bg-slate-900 cursor-pointer select-none"
              >
                <img
                  src={post.photoUrl}
                  alt={post.taskTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>

          {/* Bottom Call-To-Action */}
          {onOpenFullGallery && (
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100">
              <button
                onClick={() => {
                  onOpenFullGallery();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all group active:scale-[0.99]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>Lihat Semua Galeri</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Simple Photo View Modal - Full Screen */}
      <AnimatePresence>
        {selectedPost && (
          <div
            className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button - Top Right */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Full Photo - Centered */}
              <div className="flex-1 flex items-center justify-center p-4">
                <img
                  src={selectedPost.photoUrl}
                  alt={selectedPost.taskTitle}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
