import React, { useState, useMemo, useEffect } from "react";
import { 
  Camera, Heart, Share2, 
  Footprints, User, 
  X, Image as ImageIcon,
  MessageCircle, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { LogbookStorage, getLogbookTasksForDate } from "./JurnalLogbookModal";
import { getMusyrifCallName } from "../utils/notificationUtils";
import { googleSyncService } from "../utils/googleSyncService";

export function getRelativeTimeString(dateStr: string, timeStr?: string, isoTakenAt?: string): string {
  try {
    let targetDate: Date;
    if (isoTakenAt) {
      targetDate = new Date(isoTakenAt);
    } else if (dateStr) {
      if (timeStr && /^\d{2}:\d{2}/.test(timeStr)) {
        targetDate = new Date(`${dateStr}T${timeStr}:00`);
      } else {
        targetDate = new Date(`${dateStr}T12:00:00`);
      }
    } else {
      return "Baru saja";
    }

    if (isNaN(targetDate.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - targetDate.getTime();
    
    if (diffMs < 60 * 1000) return "Baru saja";
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24 && targetDate.getDate() === now.getDate()) return `${diffHours} jam lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1 || (diffDays === 0 && targetDate.getDate() !== now.getDate())) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return format(targetDate, "d MMM yyyy", { locale: id });
  } catch {
    return dateStr;
  }
}

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  role?: string;
  kamar?: string;
  email?: string;
  avatar?: string;
  picture?: string;
}

export interface GalleryLikeUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  likedAt: string;
}

export interface GalleryCommentItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface GalleryPostInteraction {
  postId: string;
  likes: GalleryLikeUser[];
  comments: GalleryCommentItem[];
  updatedAt?: string;
}

interface PageGaleriLogbookProps {
  onBack: () => void;
  onOpenLogbook?: () => void;
  logbookData: LogbookStorage;
  musyrifList: Musyrif[];
  authUser?: any;
  onLogin?: () => void;
}

export interface GalleryPostItem {
  id: string;
  musyrifId: string;
  musyrifName: string;
  musyrifAvatar?: string;
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

const LOGBOOK_TASK_TITLES: Record<string, { title: string; category: string }> = {
  tahajjud: { title: "Dampingi Tahajjud & Witir", category: "Ibadah" },
  shubuh: { title: "Kawal Shalat Shubuh", category: "Ibadah" },
  tadarusPagi: { title: "Dampingi Tadarus Pagi", category: "Qur'ani" },
  piketMakanPagi: { title: "Pengawasan Makan Pagi", category: "Dapur" },
  raziaPagi: { title: "Pemeriksaan Kamar Pagi", category: "Kedisiplinan" },
  patroliKbmPagi: { title: "Patroli Asrama Jam KBM", category: "Patroli" },
  makanSiang: { title: "Pengawasan Makan Siang", category: "Dapur" },
  piketMakanMalam: { title: "Pengawasan Makan Malam", category: "Dapur" },
  maghrib: { title: "Kawal Shalat Maghrib Berjamaah", category: "Ibadah" },
  tadarusMalam: { title: "Dampingi Tadarus Malam & Isya", category: "Qur'ani" },
  belajarMalam: { title: "Dampingi Belajar Malam Santri", category: "Akademik" },
  raziaKamar: { title: "Pemeriksaan Kamar Santri", category: "Kedisiplinan" },
  apelMalam: { title: "Apel & Absensi Malam", category: "Kedisiplinan" },
  istirahatMalam: { title: "Pengawasan Istirahat Malam", category: "Ketertiban" },
  kerjaBakti: { title: "Kerja Bakti & Kebersihan Asrama", category: "Kegiatan" },
  olahraga: { title: "Olahraga Pagi Santri", category: "Kegiatan" },
  cekSakit: { title: "Pemeriksaan Santri Sakit", category: "Kesehatan" }
};

// Avatar Image with Instagram-style user icon fallback
function AvatarImage({ src, name, size = "w-8 h-8", iconSize = "w-4 h-4", className = "" }: { src?: string; name: string; size?: string; iconSize?: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className={`${size} rounded-full bg-slate-100 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-500 shrink-0 ${className}`}>
        <User className={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${size} rounded-full object-cover ring-1 ring-slate-200/80 shrink-0 ${className}`}
      onError={() => setImgError(true)}
    />
  );
}

export const PageGaleriLogbook: React.FC<PageGaleriLogbookProps> = ({
  onBack,
  onOpenLogbook,
  logbookData,
  musyrifList,
  authUser,
  onLogin
}) => {
  const [selectedPost, setSelectedPost] = useState<GalleryPostItem | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<GalleryPostItem | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  const [interactions, setInteractions] = useState<Record<string, GalleryPostInteraction>>(() => {
    try {
      const raw = localStorage.getItem("syamsa_gallery_interactions_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem("syamsa_gallery_interactions_v1");
        if (raw) setInteractions(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("syamsa_gallery_interactions_updated", handleUpdate);
    return () => window.removeEventListener("syamsa_gallery_interactions_updated", handleUpdate);
  }, []);

  const currentUserId = authUser?.id || authUser?.musyrifId || "guest";
  const currentUserName = authUser ? `Ustaz ${getMusyrifCallName(authUser.name)}` : "Ustaz";
  const currentUserAvatar = authUser?.picture;
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const allPosts = useMemo<GalleryPostItem[]>(() => {
    const posts: GalleryPostItem[] = [];
    Object.entries(logbookData || {}).forEach(([mId, dateEntries]) => {
      const musyrifInfo = musyrifList.find(m => m.id === mId);
      const mName = musyrifInfo ? musyrifInfo.name : `Musyrif ${mId}`;
      const mAsrama = musyrifInfo ? musyrifInfo.asrama : "Asrama";
      if (dateEntries && typeof dateEntries === "object") {
        Object.entries(dateEntries).forEach(([dateStr, entry]) => {
          if (!entry || typeof entry !== "object") return;
          Object.entries(entry).forEach(([key, taskVal]) => {
            if (typeof taskVal !== "object" || !(taskVal as any)?.photoUrl) return;
            const tItem = taskVal as any;
            posts.push({
              id: `${mId}_${dateStr}_${key}`,
              musyrifId: mId,
              musyrifName: mName,
              musyrifAvatar: tItem.photoUserAvatar || (musyrifInfo as any)?.picture,
              asrama: mAsrama,
              date: dateStr,
              taskKey: key,
              taskTitle: LOGBOOK_TASK_TITLES[key]?.title || key,
              taskNumber: 1,
              taskCategory: LOGBOOK_TASK_TITLES[key]?.category || "Kegiatan",
              completedAt: tItem.completedAt,
              photoUrl: tItem.photoUrl,
              photoTakenAt: tItem.photoTakenAt,
              notes: tItem.notes,
              stepsCount: tItem.stepsCount
            });
          });
        });
      }
    });
    return posts.sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt || "").localeCompare(a.completedAt || ""));
  }, [logbookData, musyrifList]);

  const handleToggleLike = (postId: string) => {
    if (!authUser) {
      triggerHaptic("warning");
      if (onLogin) onLogin();
      return;
    }
    triggerHaptic("medium");
    setInteractions(prev => {
      const existing = prev[postId] || { postId, likes: [], comments: [] };
      const hasLiked = existing.likes?.some(l => l.userId === currentUserId || l.userName === currentUserName);
      const updatedLikes = hasLiked 
        ? (existing.likes || []).filter(l => l.userId !== currentUserId && l.userName !== currentUserName)
        : [...(existing.likes || []), { userId: currentUserId, userName: currentUserName, userAvatar: currentUserAvatar, likedAt: new Date().toISOString() }];
      const next = { ...prev, [postId]: { ...existing, postId, likes: updatedLikes, updatedAt: new Date().toISOString() } };
      localStorage.setItem("syamsa_gallery_interactions_v1", JSON.stringify(next));
      googleSyncService.enqueue("GalleryInteractions", { id: postId, ...next[postId] }, "upsert");
      return next;
    });
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!authUser) {
      triggerHaptic("warning");
      if (onLogin) onLogin();
      return;
    }
    if (!text.trim()) return;
    triggerHaptic("light");
    const newComment = { id: `c_${Date.now()}`, userId: currentUserId, userName: currentUserName, userAvatar: currentUserAvatar, text: text.trim(), createdAt: new Date().toISOString() };
    setInteractions(prev => {
      const existing = prev[postId] || { postId, likes: [], comments: [] };
      const next = { ...prev, [postId]: { ...existing, postId, comments: [...(existing.comments || []), newComment], updatedAt: new Date().toISOString() } };
      localStorage.setItem("syamsa_gallery_interactions_v1", JSON.stringify(next));
      googleSyncService.enqueue("GalleryInteractions", { id: postId, ...next[postId] }, "upsert");
      return next;
    });
    setCommentInput("");
    setInlineInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const renderLikeSummary = (postId: string) => {
    const item = interactions[postId];
    if (!item?.likes?.length) return null;
    const likes = item.likes;
    const isLikedByMe = likes.some(l => l.userId === currentUserId || l.userName === currentUserName);
    const others = likes.filter(l => l.userId !== currentUserId && l.userName !== currentUserName);
    if (isLikedByMe) return others.length === 0 ? "Disukai oleh Anda" : others.length === 1 ? `Disukai oleh Anda dan ${others[0].userName}` : `Disukai oleh Anda, ${others[0].userName}, dan ${others.length - 1} lainnya`;
    return likes.length >= 1 ? `Disukai oleh ${likes[0].userName}${likes.length > 1 ? ` dan ${likes.length - 1} lainnya` : ""}` : null;
  };

  const handleShareWhatsApp = (post: GalleryPostItem) => {
    triggerHaptic();
    const text = `*📸 DOKUMENTASI LOGBOOK*\n🏢 *Asrama:* ${post.asrama}\n👤 *Musyrif:* ${post.musyrifName}\n📌 *Tugas:* ${post.taskTitle}\n📝 *Catatan:* ${post.notes || "-"}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white min-h-screen pb-28 px-0 animate-in fade-in duration-200">
      {allPosts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center p-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Belum Ada Foto Logbook</h4>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 bg-white">
          {allPosts.map((post) => {
            const postInter = interactions[post.id] || { postId: post.id, likes: [], comments: [] };
            const isLiked = postInter.likes?.some(l => l.userId === currentUserId || l.userName === currentUserName);

            return (
              <article key={post.id} className="bg-white pb-3">
                {/* 1. Post Header (Top Call Name + Asrama + Time) */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarImage src={post.musyrifAvatar} name={post.musyrifName} size="w-8 h-8" iconSize="w-4 h-4" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        Ustaz {getMusyrifCallName(post.musyrifName)}
                      </h4>
                      <p className="text-[11px] text-sky-600 font-medium truncate">{post.asrama}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                    {getRelativeTimeString(post.date, post.completedAt, post.photoTakenAt)}
                  </span>
                </div>

                {/* 2. Photo Fullscreen Edge-to-Edge */}
                <div onClick={() => setSelectedPost(post)} className="relative w-full aspect-square bg-slate-950 cursor-pointer">
                  <img src={post.photoUrl} className="w-full h-full object-cover" loading="lazy" />
                </div>

                {/* 3. Actions Bar (Like, Comment, Share, Steps) */}
                <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleToggleLike(post.id)} className="flex items-center gap-1.5" title="Suka">
                      <Heart className={`w-6 h-6 transition-colors ${isLiked ? "fill-rose-500 text-rose-500" : "text-slate-800"}`} />
                      {postInter.likes?.length > 0 && <span className="text-xs font-bold text-rose-600">{postInter.likes.length}</span>}
                    </button>
                    <button onClick={() => setActiveCommentsPost(post)} className="flex items-center gap-1.5" title="Komentar">
                      <MessageCircle className="w-6 h-6 text-slate-800 hover:text-sky-600 transition-colors" />
                      {postInter.comments?.length > 0 && <span className="text-xs font-bold text-sky-700">{postInter.comments.length}</span>}
                    </button>
                    <button onClick={() => handleShareWhatsApp(post)} title="Bagikan ke WhatsApp">
                      <Share2 className="w-5 h-5 text-slate-800 hover:text-emerald-600 transition-colors" />
                    </button>
                  </div>

                  {post.stepsCount ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <Footprints className="w-3.5 h-3.5 text-amber-600" />
                      <span>{post.stepsCount} Langkah</span>
                    </span>
                  ) : null}
                </div>

                {/* 4. Multi-User Likes Summary */}
                {renderLikeSummary(post.id) && (
                  <div className="px-3.5 pt-1 text-xs font-bold text-slate-900 leading-tight">
                    {renderLikeSummary(post.id)}
                  </div>
                )}

                {/* 5. Caption with Full Musyrif Name & Task */}
                <div className="px-3.5 pt-1 text-xs leading-snug">
                  <span className="font-bold mr-1.5 text-slate-900">{post.musyrifName}</span>
                  <span className="font-semibold text-slate-800">{post.taskTitle}</span>
                  {post.notes && <span className="text-slate-600 ml-1 font-normal italic">— "{post.notes}"</span>}
                </div>

                {/* 6. Comments Preview */}
                {(postInter.comments || []).length > 0 && (
                  <div className="px-3.5 pt-1.5 space-y-0.5">
                    {(postInter.comments || []).length > 2 && (
                      <button
                        onClick={() => setActiveCommentsPost(post)}
                        className="text-[11px] text-sky-600 font-medium hover:text-sky-700 block"
                      >
                        Lihat semua {(postInter.comments || []).length} komentar...
                      </button>
                    )}
                    {(postInter.comments || []).slice(-2).map(c => (
                      <div key={c.id} className="text-xs leading-tight text-slate-800">
                        <span className="font-bold mr-1.5 text-slate-900">{c.userName}</span>
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 7. Quick Comment Input / Guest Login Callout */}
                {authUser ? (
                  <div className="px-3.5 pt-2 flex items-center gap-2">
                    <AvatarImage src={currentUserAvatar} name={currentUserName} size="w-6 h-6" iconSize="w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Beri apresiasi..."
                      value={inlineInputs[post.id] || ""}
                      onChange={e => setInlineInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleAddComment(post.id, inlineInputs[post.id] || "");
                      }}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 outline-none focus:border-sky-500 focus:bg-white transition-colors placeholder:text-slate-400"
                    />
                    {(inlineInputs[post.id] || "").trim() && (
                      <button
                        onClick={() => handleAddComment(post.id, inlineInputs[post.id] || "")}
                        className="text-xs font-bold text-[#0C81E4] hover:text-[#0C4E8C] active:scale-95 px-1.5"
                      >
                        Kirim
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      if (onLogin) onLogin();
                    }}
                    className="px-3.5 pt-2 flex items-center justify-between gap-2 cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-sky-600 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-medium">Masuk akun untuk memberi like & apresiasi...</span>
                    </div>
                    <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full group-hover:bg-sky-100 transition-colors">
                      Masuk
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Simple Clean Fullscreen Photo View Modal (Sama seperti di Beranda) */}
      <AnimatePresence>
        {selectedPost && (
          <div
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button - Top Right */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm shadow-lg active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Full Photo - Centered */}
              <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
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

      <AnimatePresence>
        {activeCommentsPost && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setActiveCommentsPost(null)}>
            <motion.div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-bold">Komentar</h3>
                <button onClick={() => setActiveCommentsPost(null)}><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(interactions[activeCommentsPost.id]?.comments || []).map(c => (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <AvatarImage src={c.userAvatar} name={c.userName} size="w-7 h-7" iconSize="w-3.5 h-3.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{c.userName}</p>
                      <p className="text-xs text-slate-700 mt-0.5 leading-snug break-words">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {authUser ? (
                <div className="p-3 border-t flex gap-2">
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleAddComment(activeCommentsPost.id, commentInput);
                    }}
                    className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 transition-colors"
                    placeholder="Tulis komentar..."
                    autoFocus
                  />
                  <button onClick={() => handleAddComment(activeCommentsPost.id, commentInput)} className="text-[#0C81E4] font-bold text-xs px-2">Kirim</button>
                </div>
              ) : (
                <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-medium truncate">
                      Masuk untuk menulis komentar
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      triggerHaptic("medium");
                      setActiveCommentsPost(null);
                      if (onLogin) onLogin();
                    }}
                    className="bg-[#0C81E4] hover:bg-[#0C4E8C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition-all shrink-0"
                  >
                    Masuk Akun
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageGaleriLogbook;
