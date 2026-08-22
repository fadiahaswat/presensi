import React, { useState, useMemo } from "react";
import { 
  Heart, MessageCircle, Share2, Sparkles, Camera, MapPin, Clock, Calendar, 
  ChevronRight, ChevronLeft, Eye, Maximize2, ShieldCheck, User, Building2, 
  Grid, List, Filter, Flame, CheckCircle2, Footprints, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { LogbookStorage, JurnalLogbookEntry, getLogbookTasksForDate } from "./JurnalLogbookModal";

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
  onOpenLogbook?: (musyrifId?: string, date?: string, taskKey?: string) => void;
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
  photoSource?: "camera" | "preset";
  photoWatermark?: string;
  notes?: string;
  stepsCount?: number;
  gpsVerified?: boolean;
}

export const LogbookGalleryWidget: React.FC<LogbookGalleryWidgetProps> = ({
  logbookData,
  musyrifList,
  onOpenLogbook
}) => {
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "week" | "all">("today");
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
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
    const tasksDefMap = getLogbookTasksForDate(todayStr);

    Object.entries(logbookData).forEach(([mId, dateEntries]) => {
      const musyrif = musyrifList.find(m => m.id === mId);
      const mName = musyrif?.name || "Musyrif Asrama";
      const mAsrama = musyrif?.asrama || "Asrama";

      Object.entries(dateEntries).forEach(([dateStr, entry]) => {
        if (!entry) return;

        Object.entries(entry).forEach(([key, taskVal]) => {
          if (key === "generalNotes" || typeof taskVal !== "object") return;
          const tItem = taskVal as any;

          if (tItem && tItem.photoUrl) {
            const taskDef = tasksDefMap.find(t => t.key === key);
            posts.push({
              id: `${mId}_${dateStr}_${key}`,
              musyrifId: mId,
              musyrifName: mName,
              asrama: mAsrama,
              date: dateStr,
              taskKey: key,
              taskTitle: taskDef?.title || key,
              taskNumber: taskDef?.number || 1,
              taskCategory: taskDef?.category || "Kegiatan",
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
      return true;
    });
  }, [allPosts, selectedAsrama, selectedDateFilter, todayStr]);

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
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shadow-md shadow-rose-500/20">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-rose-600">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
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

        {/* View Mode Switcher & Counter */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
            <button
              onClick={() => {
                triggerHaptic();
                setViewMode("feed");
              }}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "feed"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Feed Postingan"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px]">Feed</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                setViewMode("grid");
              }}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Kotak Grid"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px]">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Date & Asrama) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              triggerHaptic();
              setSelectedDateFilter("today");
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              selectedDateFilter === "today"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Hari Ini ({allPosts.filter(p => p.date === todayStr).length})
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setSelectedDateFilter("week");
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              selectedDateFilter === "week"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setSelectedDateFilter("all");
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              selectedDateFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({allPosts.length})
          </button>
        </div>

        {/* Asrama Dropdown Filter */}
        {asramaOptions.length > 0 && (
          <select
            value={selectedAsrama}
            onChange={(e) => {
              triggerHaptic();
              setSelectedAsrama(e.target.value);
            }}
            className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0"
          >
            <option value="all">Semua Asrama</option>
            {asramaOptions.map(asr => (
              <option key={asr} value={asr}>{asr}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content: Feed or Grid */}
      {filteredPosts.length === 0 ? (
        <div className="py-12 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2.5">
            <Camera className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Belum Ada Foto Logbook</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            {selectedDateFilter === "today" 
              ? "Musyrif belum mengunggah foto pelaksanaan tugas logbook hari ini."
              : "Belum ada riwayat foto logbook yang sesuai dengan filter yang dipilih."}
          </p>
          {onOpenLogbook && (
            <button
              onClick={() => onOpenLogbook()}
              className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              Buka Halaman Logbook
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID MODE (Instagram Profile Grid) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPost(post)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs cursor-pointer"
            >
              <img
                src={post.photoUrl}
                alt={post.taskTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Top Badges */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-bold text-white bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 truncate max-w-[120px]">
                  {post.asrama}
                </span>
                {post.stepsCount && (
                  <span className="text-[10px] font-bold text-amber-300 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Footprints className="w-2.5 h-2.5" /> {post.stepsCount}
                  </span>
                )}
              </div>

              {/* Bottom Caption & User */}
              <div className="absolute bottom-2 left-2 right-2 pointer-events-none text-white">
                <h5 className="text-[11px] font-bold leading-snug line-clamp-1 drop-shadow-sm">
                  {post.taskTitle}
                </h5>
                <p className="text-[10px] text-slate-300 truncate">
                  {post.musyrifName} • {post.completedAt ? `${post.completedAt} WIB` : ""}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* FEED MODE (Instagram Post Feed) */
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const isLiked = (likedPosts[post.id] || 0) > 0;
            return (
              <div
                key={post.id}
                className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-shadow"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100">
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
                        {format(new Date(post.date), "dd MMM yyyy", { locale: id })}
                        {post.completedAt ? ` • ${post.completedAt} WIB` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Task Category Tag */}
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                    {post.taskCategory}
                  </span>
                </div>

                {/* Post Photo (With Click to Zoom) */}
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

                  {/* Floating Badge on Photo */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 text-white backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-white/20 shadow-md">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{post.taskTitle}</span>
                  </div>

                  {post.gpsVerified && (
                    <div className="absolute top-3 right-3 bg-emerald-950/80 text-emerald-300 backdrop-blur-md px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>GPS Valid</span>
                    </div>
                  )}
                </div>

                {/* Post Action Bar & Caption */}
                <div className="p-3 sm:p-4 space-y-2.5">
                  {/* Action Icons */}
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
                        title="Bagikan ke WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden xs:inline text-[11px]">Share</span>
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
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
