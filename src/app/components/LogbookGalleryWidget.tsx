import React, { useState, useMemo } from "react";
import { 
  Camera, ChevronRight, Footprints, ShieldCheck, Heart, Share2, 
  Sparkles, Maximize2, X, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { LogbookStorage, getLogbookTasksForDate } from "./JurnalLogbookModal";

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
  onOpenLogbook,
  onOpenFullGallery
}) => {
  const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "week" | "all">("today");
  const [selectedPost, setSelectedPost] = useState<GalleryPostItem | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("syamsa_gallery_likes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Extract all gallery posts with photo from logbookData
  const allPosts = useMemo(() => {
    const posts: GalleryPostItem[] = [];

    Object.entries(logbookData || {}).forEach(([mId, dateEntries]) => {
      const musyrif = (musyrifList || []).find(m => m.id === mId || m.name === mId);
      const mName = musyrif?.name || mId || "Musyrif Asrama";
      const mAsrama = musyrif?.asrama || "Asrama";

      if (dateEntries && typeof dateEntries === "object") {
        Object.entries(dateEntries).forEach(([dateStr, entry]) => {
          if (!entry || typeof entry !== "object") return;

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

    // Sort descending by date and time
    return posts.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.completedAt || "").localeCompare(a.completedAt || "");
    });
  }, [logbookData, musyrifList, todayStr]);

  // Always display top 9 latest posts on Beranda for seamless 3x3 layout
  const displayPosts = allPosts.slice(0, 9);

  // Handle Like Toggle
  const handleToggleLike = (postId: string) => {
    triggerHaptic();
    setLikedPosts(prev => {
      const cur = prev[postId] || 0;
      const updated = {
        ...prev,
        [postId]: cur > 0 ? 0 : 1
      };
      try {
        localStorage.setItem("syamsa_gallery_likes", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Share to WhatsApp Helper
  const handleShareWhatsApp = (post: GalleryPostItem) => {
    triggerHaptic();
    const formattedDate = format(new Date(post.date), "EEEE, d MMMM yyyy", { locale: id });
    const text = `*📸 DOKUMENTASI LOGBOOK ASRAMA MU'ALLIMIN*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 *Asrama:* ${post.asrama}\n` +
      `👤 *Musyrif:* ${post.musyrifName}\n` +
      `📌 *Tugas:* ${post.taskTitle}\n` +
      `📅 *Tanggal:* ${formattedDate}\n` +
      `⏱️ *Waktu:* ${post.completedAt || "-"} WIB\n` +
      (post.stepsCount ? `👣 *Patroli:* ${post.stepsCount} Langkah\n` : "") +
      (post.notes ? `📝 *Catatan:* "${post.notes}"\n` : "") +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Presensi & Logbook Santri Syamsa Madrasah Mu'allimin Muhammadiyah Yogyakarta_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 space-y-3.5">
      {/* Header Widget */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-rose-600">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Galeri Logbook Asrama
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dokumentasi foto kegiatan harian musyrif langsung dari kamera asrama
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: Pure Grid Mode on Beranda (3x3) */}
      {allPosts.length === 0 ? (
        <div className="py-10 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-4">
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
      ) : (
        /* GRID MODE (3x3 Grid Rapi Seamless Tanpa Jarak & Tanpa Garis Pemisah) */
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden border border-slate-200">
            {displayPosts.map((post) => (
              <motion.div
                key={post.id}
                whileHover={{ opacity: 0.92 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square rounded-none overflow-hidden bg-slate-100 cursor-pointer"
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

          {/* Bottom Call-To-Action: Open Dedicated Gallery Page */}
          {onOpenFullGallery && (
            <button
              onClick={() => {
                triggerHaptic();
                onOpenFullGallery();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all group active:scale-[0.99]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>Lihat Semua Galeri</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Instagram Post Detail Modal (Lightbox) */}
      <AnimatePresence>
        {selectedPost && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                      {selectedPost.musyrifName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
                      {selectedPost.musyrifName}
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        {selectedPost.asrama}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {selectedPost.taskTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Full Image Display */}
              <div className="p-2 sm:p-3 bg-black flex items-center justify-center overflow-auto max-h-[58vh]">
                <img
                  src={selectedPost.photoUrl}
                  alt={selectedPost.taskTitle}
                  className="w-full h-auto max-h-[54vh] object-contain rounded-xl"
                />
              </div>

              {/* Details & Action Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-slate-400 block text-[10px]">Waktu Selesai</span>
                    <span className="font-bold text-white">{selectedPost.completedAt || "-"} WIB</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-slate-400 block text-[10px]">Tanggal Tugas</span>
                    <span className="font-bold text-white">
                      {format(new Date(selectedPost.date), "d MMM yyyy", { locale: id })}
                    </span>
                  </div>
                  {selectedPost.stepsCount ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[10px]">Patroli Langkah</span>
                      <span className="font-bold text-amber-400">{selectedPost.stepsCount} Langkah</span>
                    </div>
                  ) : null}
                </div>

                {/* Caption / Note */}
                {selectedPost.notes && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold block text-[10px] mb-0.5">Catatan Musyrif:</span>
                    {selectedPost.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleToggleLike(selectedPost.id)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      (likedPosts[selectedPost.id] || 0) > 0
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-950/40"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${(likedPosts[selectedPost.id] || 0) > 0 ? "fill-white" : ""}`} />
                    <span>{(likedPosts[selectedPost.id] || 0) > 0 ? "Disukai ✓" : "Beri Apresiasi"}</span>
                  </button>

                  <button
                    onClick={() => handleShareWhatsApp(selectedPost)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share WhatsApp</span>
                  </button>

                  {onOpenFullGallery && (
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        onOpenFullGallery();
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                      title="Buka Halaman Galeri Lengkap"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
