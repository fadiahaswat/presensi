import React, { useState, useMemo } from "react";
import { 
  ChevronLeft, Camera, Search, Filter, Grid, List, Heart, Share2, 
  Sparkles, ShieldCheck, Footprints, Calendar, Building2, User, 
  Maximize2, X, CheckCircle2, Clock, Image as ImageIcon, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, subDays } from "date-fns";
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

interface PageGaleriLogbookProps {
  onBack: () => void;
  onOpenLogbook?: () => void;
  logbookData: LogbookStorage;
  musyrifList: Musyrif[];
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

export const PageGaleriLogbook: React.FC<PageGaleriLogbookProps> = ({
  onBack,
  onOpenLogbook,
  logbookData = {},
  musyrifList = []
}) => {
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "feed">("feed");
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

  // Unique Asrama list for filter
  const asramaOptions = useMemo(() => {
    const set = new Set<string>();
    musyrifList.forEach(m => {
      if (m.asrama) set.add(m.asrama);
    });
    return Array.from(set).sort();
  }, [musyrifList]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return allPosts.filter(p => {
      if (selectedAsrama !== "all" && p.asrama !== selectedAsrama) return false;
      
      if (selectedDateFilter === "today" && p.date !== todayStr) return false;
      if (selectedDateFilter === "week") {
        const pDate = new Date(p.date).getTime();
        const now = new Date().getTime();
        const diffDays = (now - pDate) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
      if (selectedDateFilter === "month") {
        const pDate = new Date(p.date).getTime();
        const now = new Date().getTime();
        const diffDays = (now - pDate) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      if (selectedCategory !== "all" && p.taskCategory !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.taskTitle.toLowerCase().includes(q);
        const matchName = p.musyrifName.toLowerCase().includes(q);
        const matchNotes = (p.notes || "").toLowerCase().includes(q);
        const matchAsrama = p.asrama.toLowerCase().includes(q);
        if (!matchTitle && !matchName && !matchNotes && !matchAsrama) return false;
      }

      return true;
    });
  }, [allPosts, selectedAsrama, selectedDateFilter, selectedCategory, searchQuery, todayStr]);

  // Statistics
  const todayCount = allPosts.filter(p => p.date === todayStr).length;
  const totalStepsInPhotos = allPosts.reduce((acc, p) => acc + (p.stepsCount || 0), 0);

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
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-3 sm:py-4 space-y-3 animate-in fade-in duration-200">
      {/* Top Header Bar with Back Button */}
      <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-3 rounded-2xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              triggerHaptic();
              onBack();
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
            title="Kembali ke Beranda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>Galeri Logbook Asrama</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {allPosts.length} Foto
              </span>
            </h2>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-0.5 border border-slate-200/80">
          <button
            onClick={() => {
              triggerHaptic();
              setViewMode("grid");
            }}
            className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-[11px]">Grid</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setViewMode("feed");
            }}
            className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === "feed"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Feed Postingan"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-[11px]">Feed</span>
          </button>
        </div>
      </div>

      {/* Main Gallery Display */}
      {filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Tidak Ada Foto Ditemukan</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            {searchQuery
              ? `Tidak ada dokumentasi foto yang sesuai dengan kata kunci "${searchQuery}".`
              : "Belum ada foto logbook untuk filter tanggal atau asrama yang dipilih."}
          </p>
          {onOpenLogbook && (
            <button
              onClick={() => onOpenLogbook()}
              className="mt-4 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Buka Form Jurnal Logbook
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID MODE (3 Kolom Bersih Tanpa Jarak) */
        <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-sm">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPost(post)}
              className="group relative aspect-square rounded-none overflow-hidden bg-slate-900 cursor-pointer transition-all"
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
      ) : (
        /* FEED MODE (Instagram Post Cards) */
        <div className="max-w-2xl mx-auto space-y-4">
          {filteredPosts.map((post) => {
            const isLiked = (likedPosts[post.id] || 0) > 0;
            return (
              <div
                key={post.id}
                className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-slate-700 font-bold text-xs">
                        {post.musyrifName.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {post.musyrifName}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                          {post.asrama}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {format(new Date(post.date), "dd MMMM yyyy", { locale: id })}
                        {post.completedAt ? ` • ${post.completedAt} WIB` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                    {post.taskCategory}
                  </span>
                </div>

                {/* Photo with Click-to-Zoom */}
                <div
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-4/3 sm:aspect-16/10 bg-slate-950 overflow-hidden cursor-pointer group"
                >
                  <img
                    src={post.photoUrl}
                    alt={post.taskTitle}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Post Action Bar & Caption */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-90 ${
                          isLiked ? "text-rose-600" : "text-slate-600 hover:text-rose-600"
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                        <span>{isLiked ? 1 : "Apresiasi"}</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(post)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>

                    {post.stepsCount && (
                      <span className="text-xs font-bold font-mono text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Footprints className="w-3 h-3 text-orange-600" />
                        <span>{post.stepsCount} Langkah</span>
                      </span>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="text-xs leading-relaxed text-slate-800">
                    <span className="font-bold text-slate-900 mr-1.5">{post.musyrifName}</span>
                    {post.notes ? (
                      <span className="text-slate-700">{post.notes}</span>
                    ) : (
                      <span className="text-slate-400 italic">Melaksanakan {post.taskTitle} secara tertib.</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal Detail */}
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
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/90">
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

              {/* Full Image */}
              <div className="p-2 sm:p-3 bg-black flex items-center justify-center overflow-auto max-h-[58vh]">
                <img
                  src={selectedPost.photoUrl}
                  alt={selectedPost.taskTitle}
                  className="w-full h-auto max-h-[54vh] object-contain rounded-xl"
                />
              </div>

              {/* Details & Actions */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-slate-400 block text-[10px]">Waktu Selesai</span>
                    <span className="font-bold text-white">{selectedPost.completedAt || "-"} WIB</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-slate-400 block text-[10px]">Tanggal Tugas</span>
                    <span className="font-bold text-white">
                      {format(new Date(selectedPost.date), "d MMMM yyyy", { locale: id })}
                    </span>
                  </div>
                  {selectedPost.stepsCount ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[10px]">Patroli Langkah</span>
                      <span className="font-bold text-amber-400">{selectedPost.stepsCount} Langkah</span>
                    </div>
                  ) : null}
                </div>

                {selectedPost.notes && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold block text-[10px] mb-0.5">Catatan Musyrif:</span>
                    {selectedPost.notes}
                  </div>
                )}

                {/* Actions */}
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
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageGaleriLogbook;
