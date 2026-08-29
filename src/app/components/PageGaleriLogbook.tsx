import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import {
  Camera, Heart, Share2,
  Footprints, User,
  X, Image as ImageIcon,
  MessageCircle, Send,
  LayoutGrid, List, Trash2, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { LogbookStorage, getLogbookTasksForDate } from "./JurnalLogbookModal";
import { getMusyrifCallName } from "../utils/notificationUtils";
import { googleSyncService } from "../utils/googleSyncService";
import { appAlert, appConfirm } from "../utils/customDialog";
import { VirtualizedGallery, GalleryPhoto } from "./VirtualizedGallery";
import { useVirtualizer } from "@tanstack/react-virtual";

// ============ CONSTANTS & HELPERS ============

const LOGBOOK_TASK_TITLES: Record<string, { title: string; category: string }> = {
  tahajjud: { title: "Membangunkan Pagi & Shalat Tahajjud", category: "Ibadah" },
  bakdaSubuh: { title: "Halaqah Tahfizh / Piket Ba'da Subuh", category: "Ibadah" },
  shubuh: { title: "Kawal Shalat Shubuh", category: "Ibadah" },
  tadarusPagi: { title: "Dampingi Tadarus Pagi", category: "Qur'ani" },
  piketMakanPagi: { title: "Pengawasan Makan Pagi", category: "Dapur" },
  raziaPagi: { title: "Pemeriksaan Kamar Pagi", category: "Kedisiplinan" },
  patroliKbmPagi: { title: "Patroli Asrama Jam KBM", category: "Patroli" },
  makanSiang: { title: "Pengawasan Makan Siang", category: "Dapur" },
  piketMakanMalam: { title: "Pengawasan Makan Malam", category: "Dapur" },
  sisirSekolah: { title: "Menyisir Area Sekolah", category: "Patroli" },
  jagaGerbang: { title: "Jaga Gerbang Asrama", category: "Keamanan" },
  oprakJumat: { title: "Oprak-oprak Shalat Jum'at", category: "Ibadah" },
  kerjaBakti: { title: "Kerja Bakti & Kebersihan Asrama", category: "Kegiatan" },
  oprakAshar: { title: "Oprak-oprak Shalat Ashar", category: "Ibadah" },
  oprakMandi: { title: "Oprak Mandi Sore", category: "Ketertiban" },
  sisirMaghrib: { title: "Menyisir Maghrib", category: "Patroli" },
  maghrib: { title: "Kawal Shalat Maghrib Berjamaah", category: "Ibadah" },
  bakdaMaghrib: { title: "Ba'da Maghrib (Tahsin/Belajar)", category: "Akademik" },
  tadarusMalam: { title: "Dampingi Tadarus Malam & Isya", category: "Qur'ani" },
  belajarMalam: { title: "Dampingi Belajar Malam Santri", category: "Akademik" },
  raziaKamar: { title: "Pemeriksaan Kamar Santri", category: "Kedisiplinan" },
  apelMalam: { title: "Apel & Absensi Malam", category: "Kedisiplinan" },
  istirahatMalam: { title: "Pengawasan Istirahat Malam", category: "Ketertiban" },
  cekTidur: { title: "Menyisir & Cek Tidur Santri", category: "Ketertiban" },
  olahraga: { title: "Olahraga Pagi Santri", category: "Kegiatan" },
  cekSakit: { title: "Memeriksa Santri yang Sakit", category: "Kesehatan" }
};

// Pre-compiled regex for time parsing
const TIME_REGEX = /^\d{2}:\d{2}/;
const MIN_DATE_FILTER = "2026-08-18";
const INTERACTIONS_KEY = "syamsa_gallery_interactions_v1";

// Skip keys that are not task entries
const SKIP_KEYS = new Set([
  "generalNotes", "id", "musyrifId", "date", "created_at", "updated_at", "is_deleted"
]);

// Build musyrif lookup map for O(1) access
const buildMusyrifMap = (musyrifList: any[] = [], authUsers: any[] = []): Map<string, any> => {
  const map = new Map<string, any>();

  // 1. Index authUsers (contains pictures from Google OAuth login)
  if (Array.isArray(authUsers)) {
    for (const u of authUsers) {
      if (!u) continue;
      const pic = u.picture || u.avatar || u.photo;
      const userObj = { ...u, picture: pic };
      if (u.id) map.set(u.id, userObj);
      if (u.musyrifId) map.set(u.musyrifId, userObj);
      if (u.name) {
        map.set(u.name, userObj);
        map.set(u.name.toLowerCase().trim(), userObj);
      }
      if (u.email) {
        const emails = u.email.toLowerCase().split(/[,;/\s]+/).filter(Boolean);
        for (const em of emails) map.set(em, userObj);
      }
    }
  }

  // 2. Index musyrifList & merge with authUsers data
  if (Array.isArray(musyrifList)) {
    for (const m of musyrifList) {
      if (!m) continue;
      const existing = map.get(m.id) || map.get(m.name) || (m.name ? map.get(m.name.toLowerCase().trim()) : undefined);
      const picture = m.picture || m.avatar || m.photo || existing?.picture;
      const merged = { ...existing, ...m, picture };

      if (m.id) map.set(m.id, merged);
      if (m.name) {
        map.set(m.name, merged);
        map.set(m.name.toLowerCase().trim(), merged);
      }
      if (m.email) {
        const emails = m.email.toLowerCase().split(/[,;/\s]+/).filter(Boolean);
        for (const em of emails) map.set(em, merged);
      }
    }
  }

  return map;
};

// Get post timestamp for sorting
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

// Optimized relative time string builder
const getRelativeTimeString = (dateStr: string, timeStr?: string, isoTakenAt?: string): string => {
  try {
    let targetDate: Date;
    if (isoTakenAt) {
      targetDate = new Date(isoTakenAt);
    } else if (dateStr) {
      if (timeStr && TIME_REGEX.test(timeStr)) {
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
};

// ============ TYPES ============

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
  authUsers?: any[];
  authUser?: any;
  onLogin?: () => void;
  viewMode?: "feed" | "grid";
  onViewModeChange?: (mode: "feed" | "grid") => void;
  onSaveLogbook?: (musyrifId: string, date: string, entry: any) => void;
  showToast?: (msg: string, type?: "success" | "info" | "error") => void;
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

// ============ MEMOIZED SUB-COMPONENTS ============

const AVATAR_COLORS = [
  "bg-emerald-600 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-500 text-white",
  "bg-violet-600 text-white",
  "bg-teal-600 text-white",
  "bg-sky-600 text-white",
  "bg-rose-500 text-white",
  "bg-pink-500 text-white",
  "bg-orange-500 text-white",
  "bg-blue-600 text-white",
];

const getInitials = (name: string) => {
  if (!name) return "U";
  const clean = name.replace(/^(ustaz|ustadz|ust|bpk|ibu|dr|dra|drs)\.?\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "U";
};

const getAvatarBg = (name: string) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Avatar with error fallback and no-referrer support
const AvatarImage = memo(({ src, name, size = "w-8 h-8", iconSize = "w-4 h-4", className = "" }: {
  src?: string; name: string; size?: string; iconSize?: string; className?: string
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = useMemo(() => getInitials(name), [name]);
  const colorClass = useMemo(() => getAvatarBg(name), [name]);

  if (!src || imgError) {
    return (
      <div className={`${size} rounded-full ${colorClass} ring-1 ring-black/10 flex items-center justify-center font-bold text-[10px] tracking-tight shrink-0 select-none shadow-2xs ${className}`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      className={`${size} rounded-full object-cover ring-1 ring-slate-200/80 shrink-0 ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
      decoding="async"
    />
  );
});

// Post header component with 3-dots menu for Koordinator
const PostHeader = memo(({
  post,
  timeString,
  canDeletePhoto,
  onOpenMenu
}: {
  post: GalleryPostItem;
  timeString: string;
  canDeletePhoto?: boolean;
  onOpenMenu?: (post: GalleryPostItem) => void;
}) => (
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
    <div className="flex items-center gap-1.5 shrink-0 ml-2">
      <span className="text-[11px] font-medium text-slate-400">
        {timeString}
      </span>
      {canDeletePhoto && onOpenMenu && (
        <button
          onClick={() => onOpenMenu(post)}
          className="w-7 h-7 -mr-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-90"
          title="Menu opsi koordinator"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
));

// Action buttons component
const ActionButtons = memo(({
  isLiked,
  likesCount,
  commentsCount,
  stepsCount,
  onLike,
  onComment,
  onShare
}: {
  isLiked: boolean; likesCount: number; commentsCount: number; stepsCount?: number;
  onLike: () => void; onComment: () => void; onShare: () => void;
}) => (
  <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={onLike} className="flex items-center gap-1.5" title="Suka">
        <Heart className={`w-6 h-6 transition-colors ${isLiked ? "fill-rose-500 text-rose-500" : "text-slate-800"}`} />
        {likesCount > 0 && <span className="text-xs font-bold text-rose-600">{likesCount}</span>}
      </button>
      <button onClick={onComment} className="flex items-center gap-1.5" title="Komentar">
        <MessageCircle className="w-6 h-6 text-slate-800 hover:text-sky-600 transition-colors" />
        {commentsCount > 0 && <span className="text-xs font-bold text-sky-700">{commentsCount}</span>}
      </button>
      <button onClick={onShare} title="Bagikan ke WhatsApp">
        <Share2 className="w-5 h-5 text-slate-800 hover:text-emerald-600 transition-colors" />
      </button>
    </div>
    {stepsCount ? (
      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
        <Footprints className="w-3.5 h-3.5 text-amber-600" />
        <span>{stepsCount} Langkah</span>
      </span>
    ) : null}
  </div>
));

// Caption component
const Caption = memo(({ musyrifName, taskTitle, notes }: { musyrifName: string; taskTitle: string; notes?: string }) => (
  <div className="px-3.5 pt-1 text-xs leading-snug">
    <span className="font-bold mr-1.5 text-slate-900">{musyrifName}</span>
    <span className="font-semibold text-slate-800">{taskTitle}</span>
    {notes && <span className="text-slate-600 ml-1 font-normal italic">— "{notes}"</span>}
  </div>
));

// Quick comment input
const QuickCommentInput = memo(({
  authUser,
  currentUserAvatar,
  currentUserName,
  inputValue,
  onInputChange,
  onSubmit,
  onLogin
}: {
  authUser: any; currentUserAvatar?: string; currentUserName: string;
  inputValue: string; onInputChange: (v: string) => void;
  onSubmit: () => void; onLogin: () => void;
}) => {
  if (authUser) {
    return (
      <div className="px-3.5 pt-1.5 flex items-center gap-2">
        <AvatarImage src={currentUserAvatar} name={currentUserName} size="w-6 h-6" iconSize="w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Beri apresiasi..."
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
          className="flex-1 text-xs bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 outline-none focus:border-sky-500 focus:bg-white transition-colors placeholder:text-slate-400"
        />
        {inputValue.trim() && (
          <button onClick={onSubmit} className="text-xs font-bold text-[#0C81E4] hover:text-[#0C4E8C] active:scale-95 px-1.5">
            Kirim
          </button>
        )}
      </div>
    );
  }

  return (
    <div onClick={onLogin} className="px-3.5 pt-1.5 flex items-center justify-between gap-2 cursor-pointer group select-none">
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
  );
});

// Comments preview
const CommentsPreview = memo(({ comments, onViewAll }: { comments: GalleryCommentItem[]; onViewAll: () => void }) => {
  if (!comments.length) return null;

  return (
    <div className="px-3.5 pt-1.5 space-y-0.5">
      {comments.length > 2 && (
        <button onClick={onViewAll} className="text-[11px] text-sky-600 font-medium hover:text-sky-700 block">
          Lihat semua {comments.length} komentar...
        </button>
      )}
      {comments.slice(-2).map(c => (
        <div key={c.id} className="text-xs leading-tight text-slate-800">
          <span className="font-bold mr-1.5 text-slate-900">{c.userName}</span>
          <span>{c.text}</span>
        </div>
      ))}
    </div>
  );
});

// Single post article
const PostArticle = memo(({
  post,
  postInter,
  isLiked,
  canDeletePhoto,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  authUser,
  inlineInputValue,
  onToggleLike,
  onViewComments,
  onOpenMenu,
  onShare,
  onInlineInputChange,
  onInlineSubmit,
  onLogin
}: {
  post: GalleryPostItem;
  postInter: GalleryPostInteraction;
  isLiked: boolean;
  canDeletePhoto?: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  authUser?: any;
  inlineInputValue: string;
  onToggleLike: () => void;
  onViewComments: () => void;
  onOpenMenu?: (post: GalleryPostItem) => void;
  onShare: () => void;
  onInlineInputChange: (v: string) => void;
  onInlineSubmit: () => void;
  onLogin: () => void;
}) => (
  <article className="bg-white pb-3">
    <PostHeader
      post={post}
      timeString={getRelativeTimeString(post.date, post.completedAt, post.photoTakenAt)}
      canDeletePhoto={canDeletePhoto}
      onOpenMenu={onOpenMenu}
    />

    <div onClick={onViewComments} className="relative w-full aspect-square bg-slate-950 cursor-pointer">
      <img src={post.photoUrl} className="w-full h-full object-cover" loading="lazy" decoding="async" />
    </div>

    <ActionButtons
      isLiked={isLiked}
      likesCount={postInter.likes?.length || 0}
      commentsCount={postInter.comments?.length || 0}
      stepsCount={post.stepsCount}
      onLike={onToggleLike}
      onComment={onViewComments}
      onShare={onShare}
    />

    {postInter.likes?.length > 0 && (
      <div className="px-3.5 pt-1 text-xs font-bold text-slate-900 leading-tight">
        {isLiked
          ? (postInter.likes.length === 1 ? "Disukai oleh Anda" : `Disukai oleh Anda dan ${(postInter.likes.length - 1)} lainnya`)
          : `Disukai oleh ${postInter.likes[0].userName}${postInter.likes.length > 1 ? ` dan ${postInter.likes.length - 1} lainnya` : ""}`
        }
      </div>
    )}

    <Caption musyrifName={post.musyrifName} taskTitle={post.taskTitle} notes={post.notes} />

    <CommentsPreview comments={postInter.comments || []} onViewAll={onViewComments} />

    <QuickCommentInput
      authUser={authUser}
      currentUserAvatar={currentUserAvatar}
      currentUserName={currentUserName}
      inputValue={inlineInputValue}
      onInputChange={onInlineInputChange}
      onSubmit={onInlineSubmit}
      onLogin={onLogin}
    />
  </article>
));

// Koordinator Action Modal (3-dots bottom sheet)
const KoordinatorActionModal = memo(({
  post,
  onDelete,
  onViewFull,
  onClose
}: {
  post: GalleryPostItem;
  onDelete: () => void;
  onViewFull: () => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl p-4 space-y-3 pb-8 sm:pb-4"
      onClick={e => e.stopPropagation()}
    >
      {/* Post Summary */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <img src={post.photoUrl} alt="" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 truncate">Ustaz {getMusyrifCallName(post.musyrifName)} • {post.asrama}</h4>
          <p className="text-[11px] text-slate-500 truncate">{post.taskTitle}</p>
          <p className="text-[10px] text-slate-400">{format(new Date(`${post.date}T12:00:00`), "EEEE, d MMM yyyy", { locale: id })}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action options */}
      <div className="space-y-1.5 pt-1">
        <button
          onClick={() => { onClose(); onViewFull(); }}
          className="w-full p-3 rounded-2xl hover:bg-slate-50 flex items-center gap-3 text-xs font-bold text-slate-700 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Lihat Foto Ukuran Penuh</p>
            <p className="text-[10px] text-slate-400 font-normal">Buka pratinjau gambar resolusi tinggi</p>
          </div>
        </button>

        <button
          onClick={() => { onClose(); onDelete(); }}
          className="w-full p-3 rounded-2xl hover:bg-rose-50 bg-rose-50/50 border border-rose-100 flex items-center gap-3 text-xs font-bold text-rose-700 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-rose-800">Hapus Foto Dokumentasi</p>
            <p className="text-[10px] text-rose-500 font-normal">Hapus foto ini dari logbook dan server cloud</p>
          </div>
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
      >
        Batal
      </button>
    </motion.div>
  </div>
));

// Photo modal (Lightbox)
const PhotoModal = memo(({
  post,
  photoUrl,
  taskTitle,
  canDeletePhoto,
  onDelete,
  onClose
}: {
  post?: GalleryPostItem | null;
  photoUrl: string;
  taskTitle: string;
  canDeletePhoto?: boolean;
  onDelete?: () => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[140] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-slate-950 rounded-none sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3.5 bg-black/60 backdrop-blur-sm border-b border-white/10 flex items-center justify-between gap-3 text-white z-10 shrink-0">
        <div className="min-w-0">
          <h4 className="text-xs font-bold truncate">{taskTitle}</h4>
          {post && (
            <p className="text-[11px] text-white/70 truncate">
              Ustaz {getMusyrifCallName(post.musyrifName)} • {post.asrama} • {format(new Date(`${post.date}T12:00:00`), "d MMM yyyy", { locale: id })}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-[300px] overflow-hidden">
        <img src={photoUrl} alt={taskTitle} className="max-w-full max-h-full object-contain select-none" />
      </div>

      {/* Footer Details & Delete Action */}
      <div className="p-3.5 bg-black/60 backdrop-blur-sm border-t border-white/10 space-y-2.5 text-white z-10 shrink-0">
        {post?.notes && (
          <p className="text-xs text-white/90 bg-white/10 rounded-xl p-2.5 italic">
            "{post.notes}"
          </p>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-white/80 font-mono">
            {post?.completedAt && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                ⏰ {post.completedAt} WIB
              </span>
            )}
            {post?.stepsCount ? (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                👣 {post.stepsCount} langkah
              </span>
            ) : null}
          </div>

          {canDeletePhoto && onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ml-auto"
              title="Hapus foto ini dari logbook dan cloud"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Foto</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  </div>
));

// Comments modal
const CommentsModal = memo(({
  post,
  comments,
  authUser,
  currentUserAvatar,
  currentUserName,
  commentInput,
  onInputChange,
  onSubmit,
  onClose,
  onLogin
}: {
  post?: GalleryPostItem | null;
  comments: GalleryCommentItem[];
  authUser?: any;
  currentUserAvatar?: string;
  currentUserName: string;
  commentInput: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onLogin: () => void;
}) => (
  <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4" onClick={onClose}>
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">Komentar & Apresiasi</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
            {comments.length}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Post Context Header (if available) */}
      {post && (
        <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <img src={post.photoUrl} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">Ustaz {getMusyrifCallName(post.musyrifName)} • {post.asrama}</p>
            <p className="text-[11px] text-slate-500 truncate">{post.taskTitle}</p>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {comments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-1">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">Belum Ada Komentar</p>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              Jadilah yang pertama memberikan apresiasi atau tanggapan untuk dokumentasi kegiatan ini!
            </p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-2.5 items-start">
              <AvatarImage src={c.userAvatar} name={c.userName} size="w-7 h-7" iconSize="w-3.5 h-3.5" />
              <div className="min-w-0 flex-1 bg-slate-50/90 border border-slate-100 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{c.userName}</p>
                  <span className="text-[10px] text-slate-400">{getRelativeTimeString("", "", c.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-snug break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form with safe bottom padding */}
      {authUser ? (
        <div className="p-3 pb-8 sm:pb-3.5 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <AvatarImage src={currentUserAvatar} name={currentUserName} size="w-7 h-7" iconSize="w-4 h-4" />
          <input
            value={commentInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
            className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 transition-colors placeholder:text-slate-400"
            placeholder="Tulis komentar atau apresiasi..."
            autoFocus
          />
          <button 
            onClick={onSubmit} 
            disabled={!commentInput.trim()}
            className="bg-[#0C81E4] hover:bg-[#0C4E8C] disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 pb-8 sm:pb-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-slate-600 font-medium truncate">Masuk untuk menulis komentar</span>
          </div>
          <button onClick={onLogin} className="bg-[#0C81E4] hover:bg-[#0C4E8C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition-all shrink-0">
            Masuk Akun
          </button>
        </div>
      )}
    </motion.div>
  </div>
));

// ============ MAIN COMPONENT ============

export const PageGaleriLogbook: React.FC<PageGaleriLogbookProps> = ({
  onBack,
  onOpenLogbook,
  logbookData,
  musyrifList,
  authUsers,
  authUser,
  onLogin,
  viewMode = "feed",
  onViewModeChange,
  onSaveLogbook,
  showToast
}) => {
  const [selectedPost, setSelectedPost] = useState<GalleryPostItem | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<GalleryPostItem | null>(null);
  const [actionMenuPost, setActionMenuPost] = useState<GalleryPostItem | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({}); // Default: feed view (Instagram-style)

  const canDeletePhoto = Boolean(
    authUser && (
      authUser.role === "koordinator_musyrif" ||
      authUser.role === "admin" ||
      authUser.role === "wadir4" ||
      authUser.role === "kaur_kis" ||
      authUser.role === "pamong"
    )
  );

  const handleDeletePost = async (post: GalleryPostItem) => {
    if (!canDeletePhoto) {
      appAlert("Hanya Koordinator Musyrif atau Pamong/Admin yang berwenang menghapus foto dokumentasi ini.", "Akses Ditolak", "warning");
      return;
    }

    const ok = await appConfirm(
      `Apakah Anda yakin ingin menghapus foto dokumentasi "${post.taskTitle}" tanggal ${format(new Date(`${post.date}T12:00:00`), "d MMMM yyyy", { locale: id })} oleh Ustaz ${getMusyrifCallName(post.musyrifName)}? Foto akan dihapus secara permanen dari logbook dan server cloud.`,
      "Hapus Foto Logbook",
      "danger"
    );

    if (!ok) return;

    if (onSaveLogbook) {
      const dayEntry = logbookData[post.musyrifId]?.[post.date] || {};
      const currentTask = (dayEntry as any)?.[post.taskKey] || {};

      const updatedEntry = {
        ...dayEntry,
        [post.taskKey]: {
          ...currentTask,
          photoUrl: "", // Explicit signal to remove photo
          photoTakenAt: undefined,
          photoSource: undefined,
          photoWatermark: undefined
        }
      };

      onSaveLogbook(post.musyrifId, post.date, updatedEntry);

      try {
        const { deletePhoto } = await import("../utils/photoCacheService");
        const cacheKey = `logbook_${post.musyrifId}_${post.date}_${post.taskKey}_photoUrl`;
        await deletePhoto(cacheKey);
      } catch (_) {}

      if (selectedPost?.id === post.id) {
        setSelectedPost(null);
      }
      if (activeCommentsPost?.id === post.id) {
        setActiveCommentsPost(null);
      }
      if (actionMenuPost?.id === post.id) {
        setActionMenuPost(null);
      }

      showToast?.("Foto dokumentasi logbook berhasil dihapus!", "success");
    }
  };

  // Load interactions from localStorage once
  const [interactions, setInteractions] = useState<Record<string, GalleryPostInteraction>>(() => {
    try {
      const raw = localStorage.getItem(INTERACTIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Deferred sync queue
  const pendingSyncRef = useRef<{ postId: string; interaction: GalleryPostInteraction }[]>([]);

  // Cross-tab sync
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem(INTERACTIONS_KEY);
        if (raw) setInteractions(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("syamsa_gallery_interactions_updated", handleUpdate);
    return () => window.removeEventListener("syamsa_gallery_interactions_updated", handleUpdate);
  }, []);

  // Deferred Google Sheets sync
  useEffect(() => {
    if (pendingSyncRef.current.length > 0) {
      const items = [...pendingSyncRef.current];
      pendingSyncRef.current = [];
      items.forEach(({ postId, interaction }) => {
        googleSyncService.enqueue("GalleryInteractions", { id: postId, ...interaction }, "upsert");
      });
    }
  });

  // User info
  const currentUserId = authUser?.id || authUser?.musyrifId || "guest";
  const currentUserName = authUser ? `Ustaz ${getMusyrifCallName(authUser.name)}` : "Ustaz";
  const currentUserAvatar = authUser?.picture;

  // Build musyrif lookup map once
  const musyrifMap = useMemo(() => buildMusyrifMap(musyrifList || [], authUsers || []), [musyrifList, authUsers]);

  // Extract all posts
  const allPosts = useMemo<GalleryPostItem[]>(() => {
    const posts: GalleryPostItem[] = [];
    const data = logbookData || {};
    const entries = Object.entries(data);

    for (let i = 0; i < entries.length; i++) {
      const [mId, dateEntries] = entries[i];
      const musyrifInfo = musyrifMap.get(mId) || (typeof mId === "string" ? musyrifMap.get(mId.toLowerCase().trim()) : undefined);
      const mName = musyrifInfo ? musyrifInfo.name : `Musyrif ${mId}`;
      const mAsrama = musyrifInfo ? musyrifInfo.asrama : "Asrama";

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

          posts.push({
            id: `${mId}_${dateStr}_${key}`,
            musyrifId: mId,
            musyrifName: mName,
            musyrifAvatar: tItem.photoUserAvatar || musyrifInfo?.picture || musyrifInfo?.avatar || musyrifInfo?.photo,
            asrama: mAsrama,
            date: dateStr,
            taskKey: key,
            taskTitle: key.startsWith("agenda_") ? "Presensi Agenda Rapat & Pertemuan" : (LOGBOOK_TASK_TITLES[key]?.title || key),
            taskNumber: 1,
            taskCategory: key.startsWith("agenda_") ? "Agenda Rapat" : (LOGBOOK_TASK_TITLES[key]?.category || "Kegiatan"),
            completedAt: tItem.completedAt,
            photoUrl: tItem.photoUrl,
            photoTakenAt: tItem.photoTakenAt,
            notes: tItem.notes,
            stepsCount: tItem.stepsCount
          });
        }
      }
    }

    // Sort by timestamp descending
    posts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
    return posts;
  }, [logbookData, musyrifMap]);

  // Handlers
  const handleToggleLike = useCallback((postId: string) => {
    if (!authUser) {
      triggerHaptic("warning");
      onLogin?.();
      return;
    }
    triggerHaptic("medium");
    const updatedAt = new Date().toISOString();

    setInteractions(prev => {
      const existing = prev[postId] || { postId, likes: [], comments: [] };
      const hasLiked = existing.likes?.some(l => l.userId === currentUserId || l.userName === currentUserName);
      const updatedLikes = hasLiked
        ? existing.likes.filter(l => l.userId !== currentUserId && l.userName !== currentUserName)
        : [...(existing.likes || []), { userId: currentUserId, userName: currentUserName, userAvatar: currentUserAvatar, likedAt: updatedAt }];
      const next = { ...prev, [postId]: { ...existing, postId, likes: updatedLikes, updatedAt } };

      try { localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(next)); } catch {}
      pendingSyncRef.current.push({ postId, interaction: next[postId] });
      window.dispatchEvent(new Event("syamsa_gallery_interactions_updated"));

      return next;
    });
  }, [authUser, currentUserId, currentUserName, currentUserAvatar, onLogin]);

  const handleAddComment = useCallback((postId: string, text: string) => {
    if (!authUser) {
      triggerHaptic("warning");
      onLogin?.();
      return;
    }
    if (!text.trim()) return;
    triggerHaptic("light");

    const newComment = {
      id: `c_${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    setInteractions(prev => {
      const existing = prev[postId] || { postId, likes: [], comments: [] };
      const next = {
        ...prev,
        [postId]: { ...existing, postId, comments: [...(existing.comments || []), newComment], updatedAt: new Date().toISOString() }
      };

      try { localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(next)); } catch {}
      pendingSyncRef.current.push({ postId, interaction: next[postId] });
      window.dispatchEvent(new Event("syamsa_gallery_interactions_updated"));

      return next;
    });

    setCommentInput("");
    setInlineInputs(prev => ({ ...prev, [postId]: "" }));
  }, [authUser, currentUserId, currentUserName, currentUserAvatar, onLogin]);

  const handleShareWhatsApp = useCallback((post: GalleryPostItem) => {
    triggerHaptic();
    const text = `*📸 DOKUMENTASI LOGBOOK*\n🏢 *Asrama:* ${post.asrama}\n👤 *Musyrif:* ${post.musyrifName}\n📌 *Tugas:* ${post.taskTitle}\n📝 *Catatan:* ${post.notes || "-"}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  const handleInlineInputChange = useCallback((postId: string, value: string) => {
    setInlineInputs(prev => ({ ...prev, [postId]: value }));
  }, []);

  const handleInlineSubmit = useCallback((postId: string) => {
    const text = inlineInputs[postId] || "";
    if (text.trim()) {
      handleAddComment(postId, text);
    }
  }, [inlineInputs, handleAddComment]);

  // Convert posts to GalleryPhoto format for VirtualizedGallery
  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    return allPosts.map(post => ({
      id: post.id,
      url: post.photoUrl,
      alt: `${post.musyrifName} - ${post.taskTitle}`,
      meta: {
        musyrif: post.musyrifName,
        asrama: post.asrama,
        task: post.taskTitle,
        date: post.date,
        time: getRelativeTimeString(post.date, post.completedAt, post.photoTakenAt)
      }
    }));
  }, [allPosts]);

  // Handler for grid photo click
  const handleGridPhotoClick = useCallback((photo: GalleryPhoto, index: number) => {
    const post = allPosts.find(p => p.id === photo.id);
    if (post) {
      setActiveCommentsPost(post);
    }
  }, [allPosts]);

  // Virtualized feed scroll container ref
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // Estimate post height for virtualization (average of 560px with photo + content)
  const ESTIMATED_POST_HEIGHT = 560;

  // Virtualizer for feed view (OPTIMIZATION: Only render visible posts with dynamic measurement)
  const feedVirtualizer = useVirtualizer({
    count: allPosts.length,
    getScrollElement: () => feedScrollRef.current,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 4, // Render extra posts above/below viewport
  });

  return (
    <div className="w-full max-w-lg mx-auto bg-white min-h-screen pb-28 px-0 animate-in fade-in duration-200">

      {allPosts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center p-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Belum Ada Foto Logbook</h4>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW: Seamless edge-to-edge for photos */
        <div className="h-[calc(100vh-120px)] bg-slate-950 -mx-4">
          <VirtualizedGallery
            photos={galleryPhotos}
            columns={3}
            gap={0}
            seamless={true}
            enableLightbox={true}
            onPhotoClick={handleGridPhotoClick}
          />
        </div>
      ) : (
        /* FEED VIEW: Instagram-style chronological feed - VIRTUALIZED */
        <div
          ref={feedScrollRef}
          className="divide-y divide-slate-100 bg-white overflow-auto"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div
            style={{
              height: `${feedVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {feedVirtualizer.getVirtualItems().map((virtualRow) => {
              const post = allPosts[virtualRow.index];
              if (!post) return null;

              const postInter = interactions[post.id] || { postId: post.id, likes: [], comments: [] };
              const isLiked = postInter.likes?.some(l => l.userId === currentUserId || l.userName === currentUserName);

              return (
                <div
                  key={post.id}
                  ref={feedVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <PostArticle
                    post={post}
                    postInter={postInter}
                    isLiked={isLiked}
                    canDeletePhoto={canDeletePhoto}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    currentUserAvatar={currentUserAvatar}
                    authUser={authUser}
                    inlineInputValue={inlineInputs[post.id] || ""}
                    onToggleLike={() => handleToggleLike(post.id)}
                    onViewComments={() => setActiveCommentsPost(post)}
                    onOpenMenu={(p) => setActionMenuPost(p)}
                    onShare={() => handleShareWhatsApp(post)}
                    onInlineInputChange={(v) => handleInlineInputChange(post.id, v)}
                    onInlineSubmit={() => handleInlineSubmit(post.id)}
                    onLogin={() => onLogin?.()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {actionMenuPost && (
          <KoordinatorActionModal
            post={actionMenuPost}
            onViewFull={() => setSelectedPost(actionMenuPost)}
            onDelete={() => handleDeletePost(actionMenuPost)}
            onClose={() => setActionMenuPost(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <PhotoModal
            post={selectedPost}
            photoUrl={selectedPost.photoUrl}
            taskTitle={selectedPost.taskTitle}
            canDeletePhoto={canDeletePhoto}
            onDelete={() => handleDeletePost(selectedPost)}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCommentsPost && (
          <CommentsModal
            post={activeCommentsPost}
            comments={interactions[activeCommentsPost.id]?.comments || []}
            authUser={authUser}
            currentUserAvatar={currentUserAvatar}
            currentUserName={currentUserName}
            commentInput={commentInput}
            onInputChange={setCommentInput}
            onSubmit={() => handleAddComment(activeCommentsPost.id, commentInput)}
            onClose={() => setActiveCommentsPost(null)}
            onLogin={() => { onLogin?.(); setActiveCommentsPost(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageGaleriLogbook;
