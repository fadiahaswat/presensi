import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  LogIn, LogOut, CheckCircle2, Calendar, Sun, Sunset, Camera,
  ChevronLeft, ChevronRight, TrendingUp, LayoutDashboard,
  ClipboardList, X, Users, BookOpen, Lock, Search,
  Download, SlidersHorizontal, Flame, AlertCircle,
  Zap, Award, Info, Compass, Clock, Moon,
  MapPin, Navigation, Printer, ChevronDown, Star, RefreshCw, ArrowDown,
  Bell, BarChart2, Heart, Sunrise, User, Phone, Mail, MessageCircle, ExternalLink,
  ShieldCheck, ShieldAlert, Layers, Smile, GraduationCap, Crown, Sparkles, Feather, Coffee,
  Share2, FileCheck2, BellRing, Trophy, FileSpreadsheet, Wifi, WifiOff, Send,
  Smartphone, HeartPulse, HeartHandshake, Building2, Medal, Wrench, Wallet, Eye,
  List, LayoutGrid, Trash2
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, subMonths, addMonths, isBefore, startOfDay, parseISO, addDays
} from "date-fns";
import { id } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, RadialBarChart, RadialBar, PieChart, Pie, Cell
} from "recharts";
import syamsaPrimaryLogo from "../assets/branding/Primary Logo.webp";
import syamsaLogomark from "../assets/branding/Logomark.webp";
import { getReadNotificationMap, buildSystemNotificationItems } from "./utils/notificationUtils";
import { SantriIzinRecord } from "./types/izinSantri";
import { AlarmNotificationManager } from "./components/AlarmNotificationManager";
import type { KegiatanRecord } from "./components/KegiatanAsramaModal";
import { type LogbookStorage, type JurnalLogbookEntry, EMPTY_LOGBOOK } from "./components/JurnalLogbookModal";
import type { MutabaahStorage, MutabaahEntry } from "./components/MutabaahYaumiyahModal";
import type { SantriSakitRecord } from "./components/SantriSakitModal";
import type { PengasuhanKhususRecord } from "./types/pengasuhanKhusus";
import type { Pamong } from "./components/PamongManagerModal";
import type { IzinRequest } from "./components/IzinPengajuanModal";
import { CountdownPerpulanganCard } from "./components/CountdownPerpulanganCard";
import { LogbookGalleryWidget, getTaskDisplayTitle } from "./components/LogbookGalleryWidget";
import { ALL_SANTRI_DATA, SantriData } from "./data/santriData";
import { SantriChangeRequest } from "./types/santriRequest";
import { CloudSyncBadge } from "./components/CloudSyncBadge";
import { AppSkeleton } from "./components/AppSkeleton";
import { useDebouncedPersistence, createDebouncedSave } from "./hooks/useDebouncedPersistence"; // OPTIMIZATION: Efficient persistence

// Dynamic Code Splitting for Heavy Modals & Subpages
const WhatsAppShareModal = lazy(() => import("./components/WhatsAppShareModal").then(m => ({ default: m.WhatsAppShareModal })));
const IzinPengajuanModal = lazy(() => import("./components/IzinPengajuanModal").then(m => ({ default: m.IzinPengajuanModal })));
const PageSantriIzin = lazy(() => import("./components/PageSantriIzin").then(m => ({ default: m.PageSantriIzin })));
const PageNotifikasi = lazy(() => import("./components/PageNotifikasi").then(m => ({ default: m.PageNotifikasi })));
const KegiatanAsramaModal = lazy(() => import("./components/KegiatanAsramaModal").then(m => ({ default: m.KegiatanAsramaModal })));
const JurnalLogbookModal = lazy(() => import("./components/JurnalLogbookModal").then(m => ({ default: m.JurnalLogbookModal })));
const MutabaahYaumiyahModal = lazy(() => import("./components/MutabaahYaumiyahModal").then(m => ({ default: m.MutabaahYaumiyahModal })));
const SantriSakitModal = lazy(() => import("./components/SantriSakitModal").then(m => ({ default: m.SantriSakitModal })));
const PengasuhanKhususModal = lazy(() => import("./components/PengasuhanKhususModal").then(m => ({ default: m.PengasuhanKhususModal })));
const PagePengasuhanSantri = lazy(() => import("./components/PagePengasuhanSantri").then(m => ({ default: m.PagePengasuhanSantri })));
const LeaderboardModal = lazy(() => import("./components/LeaderboardModal").then(m => ({ default: m.LeaderboardModal })));
const RaportSertifikatModal = lazy(() => import("./components/RaportSertifikatModal").then(m => ({ default: m.RaportSertifikatModal })));
const MusyrifManagerModal = lazy(() => import("./components/MusyrifManagerModal").then(m => ({ default: m.MusyrifManagerModal })));
const PamongManagerModal = lazy(() => import("./components/PamongManagerModal").then(m => ({ default: m.PamongManagerModal })));
const PageKalenderHijriah = lazy(() => import("./components/PageKalenderHijriah").then(m => ({ default: m.PageKalenderHijriah })));
const PageKalenderPendidikan = lazy(() => import("./components/PageKalenderPendidikan").then(m => ({ default: m.PageKalenderPendidikan })));
const PageAboutSyamsa = lazy(() => import("./components/PageAboutSyamsa").then(m => ({ default: m.PageAboutSyamsa })));
const PageGaleriLogbook = lazy(() => import("./components/PageGaleriLogbook").then(m => ({ default: m.PageGaleriLogbook })));
const KalenderPendidikanModal = lazy(() => import("./components/KalenderPendidikanModal").then(m => ({ default: m.KalenderPendidikanModal })));
const DataSantriModal = lazy(() => import("./components/DataSantriModal").then(m => ({ default: m.DataSantriModal })));
const SantriMapModal = lazy(() => import("./components/SantriMapModal").then(m => ({ default: m.SantriMapModal })));
const CloudSyncModal = lazy(() => import("./components/CloudSyncModal").then(m => ({ default: m.CloudSyncModal })));
const PagePembinaanSantri = lazy(() => import("./components/PagePembinaanSantri").then(m => ({ default: m.PagePembinaanSantri })));
const PageAgendaRapat = lazy(() => import("./components/PageAgendaRapat").then(m => ({ default: m.PageAgendaRapat })));
import { AgendaRapatRecord, AGENDA_CATEGORIES } from "./types/agendaRapat";
import { googleSyncService } from "./utils/googleSyncService";
import { getTrustedDate, syncServerTime, subscribeTimeSync, TimeSyncState } from "./utils/trustedTime";
import { toHijri, getFastInfo, getUpcomingFasts, HIJRI_MONTHS, getPasaranJawa } from "./utils/khgtCalendar";
import { motion, AnimatePresence } from "motion/react";
import { pageVariants, toastVariants, triggerHaptic, springSmooth, modalBackdropVariants, modalContentVariants } from "./utils/animations";
import { checkAsramaGeofenceBrowser, GeofenceResult } from "./utils/geoUtils";
import { CustomDialogModal } from "./components/CustomDialogModal";
import { appAlert, appConfirm, appUndoToast } from "./utils/customDialog";
import { isDbAdmin as checkDbAdmin, getPamongType, hasFullAccess as checkFullAccess, isFieldMusyrif as checkFieldMusyrif, getPamongAssignedAsramas, canManageKegiatanAsrama } from "./utils/roleAccessUtils";
import { fetchIzinSedayuFromCloud, createIzinSedayuInCloud, updateIzinSedayuStatusInCloud, mapIzinSedayuToRecord } from "./utils/izinSedayuSync";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Role = "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif" | "kaur_kis" | "wadir4";
type PrayerSlot = "subuh" | "maghrib";
type AttendanceStatus = "hadir" | "sakit" | "izin" | "alfa";
type Page = "dashboard" | "subuh" | "maghrib" | "rekap" | "riwayat" | "ibadah" | "logbook" | "galeri-logbook" | "mutabaah" | "santri-sakit" | "pembinaan" | "izin" | "izin-santri" | "kegiatan" | "leaderboard" | "raport" | "musyrif-manager" | "pamong-manager" | "kalender-hijriah" | "kalender-pendidikan" | "data-santri" | "peta-santri" | "notifikasi" | "about-syamsa";

interface AuthUser { id: string; name: string; email: string; role: Role; asrama?: string; musyrifId?: string; picture?: string; phone?: string; }
interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  pamong?: string;
  email?: string;
  phone?: string;
  photo?: string;
  role?: Role;
}
interface AttendanceRecord {
  musyrifId: string; date: string;
  subuh?: AttendanceStatus; maghrib?: AttendanceStatus;
  subuhNote?: string; maghribNote?: string;
  markedBy?: string;
}
interface SunnahFast { id: string; name: string; desc: string; type: "weekly"|"monthly"|"annual"; icon: string; }

type MarkFn    = (mid: string, prayer: PrayerSlot, status: AttendanceStatus, date: string, note?: string) => void;
type MarkAllFn = (asrama: string, prayer: PrayerSlot, status: AttendanceStatus, date: string) => void;

// ─────────────────────────────────────────────────────────────────────────────
// PRAYER TIME CALCULATOR (Muhammadiyah / KHGT Standard)
// ─────────────────────────────────────────────────────────────────────────────
export function calcPrayerTimes(date: Date, lat = -7.807631, lon = 110.350905, tz = 7) {
  const toR = (d: number) => (d * Math.PI) / 180;
  const toD = (r: number) => (r * 180) / Math.PI;
  const fix = (h: number) => ((h % 24) + 24) % 24;

  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d
    + (m <= 2 ? -Math.floor((y+1)/100)+Math.floor((y+1)/400)+1 : -Math.floor(y/100)+Math.floor(y/400)+1) - 1524.5;

  const D  = jd - 2451545.0;
  const g  = toR((357.529 + 0.98560028 * D) % 360);
  const q  = (280.459 + 0.98564736 * D) % 360;
  const L  = toR((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360);
  const e  = toR(23.439 - 0.00000036 * D);
  const RA = toD(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const EqT = q / 15 - ((RA + 360) % 24);

  const transit = 12 + tz - lon / 15 - EqT;
  const latR = toR(lat);

  function ha(angle: number) {
    const c = (Math.sin(toR(angle)) - Math.sin(latR) * Math.sin(dec)) / (Math.cos(latR) * Math.cos(dec));
    if (c < -1 || c > 1) return NaN;
    return toD(Math.acos(c)) / 15;
  }

  // Ashar: bayang-bayang 1 kali panjang benda + bayang-bayang zawal
  const asrAlt = toD(Math.atan(1 / (1 + Math.tan(Math.abs(latR - dec)))));

  const fmt = (h: number) => {
    if (isNaN(h)) return "--:--";
    const hh = Math.floor(fix(h)) % 24;
    const mm = Math.round((fix(h) % 1) * 60);
    return `${String(hh).padStart(2,"0")}:${String(mm % 60).padStart(2,"0")}`;
  };

  const subuhRaw = transit - ha(-18) + 2 / 60; // Muhammadiyah -18° + 2m ihtiyat
  const terbitRaw = transit - ha(-0.8333);
  const dhuhrRaw = transit + 2 / 60;
  const asrRaw = transit + ha(asrAlt) + 2 / 60;
  const maghribRaw = transit + ha(-1) + 2 / 60;
  const ishaRaw = transit + ha(-18) + 2 / 60;

  return [
    { key:"subuh",   name:"Subuh",   time: fmt(subuhRaw),   raw: subuhRaw },
    { key:"terbit",  name:"Terbit",  time: fmt(terbitRaw),  raw: terbitRaw },
    { key:"dhuhr",   name:"Dzuhur",  time: fmt(dhuhrRaw),   raw: dhuhrRaw },
    { key:"asr",     name:"Ashar",   time: fmt(asrRaw),     raw: asrRaw },
    { key:"maghrib", name:"Maghrib", time: fmt(maghribRaw), raw: maghribRaw },
    { key:"isha",    name:"Isya",    time: fmt(ishaRaw),    raw: ishaRaw },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENSI TIME CONFIGURATOR (Dynamic based on Prayer Time)
// ─────────────────────────────────────────────────────────────────────────────
// Konfigurasi waktu presensi: 15 menit SEBELUM waktu sholat
const PRESENSI_OPEN_BEFORE_MINUTES = 15; // Buka 15 menit sebelum sholat
const PRESENSI_CLOSE_HOURS_SUBUH = 6.0;  // Tutup jam 06:00 WIB
const PRESENSI_CLOSE_HOURS_MAGHRIB = 19.5; // Tutup jam 19:30 WIB

export interface PresensiTimeWindow {
  openTime: number;      // Decimal hour (e.g., 4.25 = 04:15)
  closeTime: number;     // Decimal hour (e.g., 6.0 = 06:00)
  openDisplay: string;   // "04:15"
  closeDisplay: string;  // "06:00"
  prayerTime: number;    // Raw prayer time decimal (e.g., 4.5 = 04:30)
  prayerDisplay: string; // "04:30"
}

/**
 * Hitung jendela waktu presensi berdasarkan waktu sholat
 * Buka: 15 menit SEBELUM waktu sholat
 * Tutup: jam 06:00 (Subuh) atau 19:30 (Maghrib)
 */
export function getPresensiTimeWindow(
  slot: PrayerSlot,
  date: Date = new Date()
): PresensiTimeWindow {
  const prayerTimes = calcPrayerTimes(date, -7.807631, 110.350905, 7);
  const prayerObj = prayerTimes.find(p => p.key === slot);

  // Get raw prayer time (decimal hours)
  const prayerRaw = prayerObj?.raw ?? (slot === "subuh" ? 4.5 : 17.75);

  // Open time: 15 minutes before prayer time
  const openTime = prayerRaw - (PRESENSI_OPEN_BEFORE_MINUTES / 60);

  // Close time: fixed hours
  const closeTime = slot === "subuh" ? PRESENSI_CLOSE_HOURS_SUBUH : PRESENSI_CLOSE_HOURS_MAGHRIB;

  // Format helpers
  const fmtHour = (h: number): string => {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  };

  return {
    openTime,
    closeTime,
    openDisplay: fmtHour(openTime),
    closeDisplay: fmtHour(closeTime),
    prayerTime: prayerRaw,
    prayerDisplay: prayerObj?.time ?? fmtHour(prayerRaw),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OTOMATIS ALPA CONFIGURATOR (Mulai 1 September 2026)
// ─────────────────────────────────────────────────────────────────────────────
export const AUTO_ALFA_START_DATE = "2026-09-01";

/**
 * Evaluasi status presensi efektif:
 * - Mengembalikan status aktual jika sudah ada data tersimpan (hadir/sakit/izin/alfa).
 * - Tanggal sebelum 1 September 2026 (< AUTO_ALFA_START_DATE): TIDAK dijadikan alfa (return undefined).
 * - Tanggal >= 1 September 2026:
 *   - Jika tanggal lampau (< hari ini): otomatis "alfa"
 *   - Jika hari ini dan waktu saat ini > jam tutup presensi: otomatis "alfa"
 *   - Selain itu (masih dalam jam buka atau tanggal mendatang): return undefined
 */
export function getEffectiveAttendanceStatus(
  record: AttendanceRecord | undefined,
  slot: PrayerSlot,
  dateStr: string,
  now: Date = new Date()
): AttendanceStatus | undefined {
  if (record?.[slot]) return record[slot];
  if (dateStr < AUTO_ALFA_START_DATE) return undefined;

  const today = format(now, "yyyy-MM-dd");
  if (dateStr > today) return undefined;

  if (dateStr < today) {
    return "alfa";
  }

  // dateStr === today
  const timeWindow = getPresensiTimeWindow(slot, now);
  const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (nowH > timeWindow.closeTime) {
    return "alfa";
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUNNAH FASTING CALCULATOR (KHGT Muhammadiyah)
// ─────────────────────────────────────────────────────────────────────────────
function getSunnahFasts(date: Date): SunnahFast[] {
  const h = toHijri(date);
  const fasts: SunnahFast[] = [];
  const fastInfo = getFastInfo(date);

  if (fastInfo && fastInfo.type === "sunnah") {
    let fastType: "weekly" | "monthly" | "annual" = "annual";
    if (fastInfo.id === "senin" || fastInfo.id === "kamis") fastType = "weekly";
    else if (fastInfo.id === "ayyamul") fastType = "monthly";

    fasts.push({
      id: fastInfo.id,
      name: fastInfo.name,
      desc: fastInfo.desc,
      type: fastType,
      icon: fastInfo.icon === "ban" ? "sparkles" : fastInfo.icon,
    });
  }

  // Also check if Monday/Thursday and Ayyamul Bidh coincide
  const dow = date.getDay();
  if ((dow === 1 || dow === 4) && [13, 14, 15].includes(h.day)) {
    if (!fasts.some(f => f.id === "ayyamul")) {
      fasts.push({
        id: "ayyamul",
        name: `Ayyamul Bidh (${h.day} ${h.monthName})`,
        desc: `${h.day} ${h.monthName} — 3 hari di pertengahan bulan Hijriah`,
        type: "monthly",
        icon: "moon",
      });
    }
  }

  return fasts;
}

function renderFastIcon(iconKey: string, cls = "w-5 h-5") {
  switch (iconKey) {
    case "sun": return <Sun className={`${cls} text-amber-500`} />;
    case "sparkles": return <Sparkles className={`${cls} text-amber-500`} />;
    case "moon": return <Moon className={`${cls} text-emerald-600`} />;
    case "star": return <Star className={`${cls} text-amber-500`} />;
    default: return <Sparkles className={`${cls} text-emerald-600`} />;
  }
}

function getUpcomingSunnahFasts(days = 14): { date: Date; fasts: SunnahFast[] }[] {
  const result: { date: Date; fasts: SunnahFast[] }[] = [];
  const base = addDays(new Date(), 1);
  for (let i = 0; i < days; i++) {
    const d = addDays(base, i);
    const fs = getSunnahFasts(d);
    if (fs.length > 0) result.push({ date: d, fasts: fs });
  }
  return result.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// QIBLA CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
const KAABA = { lat: 21.4225, lon: 39.8262 };

function getQiblaAngle(lat: number, lon: number) {
  const toR = (d: number) => d * Math.PI / 180;
  const kLat = toR(KAABA.lat), kLon = toR(KAABA.lon), uLat = toR(lat), dLon = kLon - toR(lon);
  const y = Math.sin(dLon) * Math.cos(kLat);
  const x = Math.cos(uLat) * Math.sin(kLat) - Math.sin(uLat) * Math.cos(kLat) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function getMeccaDist(lat: number, lon: number) {
  const toR = (d: number) => d * Math.PI / 180;
  const R = 6371, dLat = toR(KAABA.lat - lat), dLon = toR(KAABA.lon - lon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat)) * Math.cos(toR(KAABA.lat)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─────────────────────────────────────────────────────────────────────────────
// NICKNAME / PANGGILAN HELPER (Ust. [CallName])
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOM_CALL_NAMES: Record<string, string> = {
  // ─── Non-Musyrif (Admin, Pamong, Direksi) ───
  "ahmad salim": "Salim",
  "muhammad shaleh": "Shaleh",
  "andi aqillah fadia haswat": "Andi Aqillah",
  "galang putra muhammady": "Galang",
  "aulia abdan idza shalla": "Abdan",
  "anang fathurrahman": "Anang",
  "inggit prabowo": "Inggit",
  "rais yudhistira": "Rais",
  "muh ahnaf lubab": "Ahnaf",
  "m ismail marzuq": "Ismail",
  "ariel amarta dzikrillah": "Dzikril",

  // ─── Musyrif ───
  "rifqi adha pradipa": "Dipa",
  "mukti abdul ghofur": "Ghofur",
  "ayyasy kaizen birruna": "Kaizen",
  "hafidz nawaf fauzil adhim": "Fauzil",
  "mukti abdul ghofar": "Ghofar",
  "fadhl maula fawwas": "Fawwas",
  "muhammad syaqib ridho asy syafiq": "Ridho",
  "muhammad islam al ghozy": "Ghozy",
  "ananda hasan putra rahman": "Hasan",
  "rayhan bachtiar dwi bayu baskara": "Bachtiar",
  "hilmy muwafaq adman": "'Adman",
  "rahmat khoirul anwar": "Anwar",
  "muhammad rafi feriansyah": "Rafi Feri",
  "tajulqayyim royyan": "Royyan",
  "muhammad atqonuddinillah": "Atqon",
  "nur affan muarif": "Affan",
  "ahmad arif kurniawan": "Arif Kurniawan",
  "arif rahman": "Arif Rahman",
  "muhammad rafi": "M. Rafi",
  "muhammad rafi umar rais": "Rafi Umar",
};

export function getMusyrifCallName(rawName?: string | null): string {
  if (!rawName) return "";

  // 1. Remove academic degrees and suffixes after comma, e.g. "Arif Rahman, S.s." -> "Arif Rahman"
  let clean = rawName.split(",")[0].trim();
  
  // Clean standalone degree abbreviations if comma wasn't used
  clean = clean.replace(/\b(S\.Pd|S\.Sos|Lc|S\.s|S\.T|S\.Kom|M\.Pd|M\.Ag|M\.A|S\.Ag|Ph\.D|S\.Psi|S\.Th\.I)\b\.?/gi, "").trim();

  // 2. Remove leading religious title prefix if already included in data (Ustadz / Ustaz / Ustad / Ust.)
  clean = clean.replace(/^(ustadz|ustaz|ustad|ust\.|ust)\s+/i, "").trim();

  // 3. Check custom alias dictionary for preferred nickname (normalize non-alphanumeric chars for flexible matching)
  const normalizedKey = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  for (const [key, val] of Object.entries(CUSTOM_CALL_NAMES)) {
    const normalizedDictKey = key.replace(/[^a-z0-9\s]/g, "");
    if (normalizedKey === normalizedDictKey || normalizedKey.includes(normalizedDictKey) || normalizedDictKey.includes(normalizedKey)) {
      return val;
    }
  }

  // 4. Check for "Andi" prefix (honorific Bugis/Makassar) -> take "Andi" + next word
  const andiMatch = clean.match(/^andi\s+([^\s]+)/i);
  if (andiMatch) {
    return `Andi ${andiMatch[1]}`;
  }

  // 5. Strip common Islamic prefixes/initials (Muhammad, Ahmad, M., Moh., etc.)
  let previous = "";
  while (previous !== clean && /^(muhammad|muhamad|mohammad|mohamad|muh\.|muh|m\.|md\.|moh\.|moh|ahmad|achmad|akhmad|ah\.)\s+/i.test(clean)) {
    previous = clean;
    clean = clean.replace(/^(muhammad|muhamad|mohammad|mohamad|muh\.|muh|m\.|md\.|moh\.|moh|ahmad|achmad|akhmad|ah\.)\s+/i, "").trim();
  }

  // 6. Take the first remaining word
  const words = clean.split(/\s+/).filter(Boolean);
  return words[0] || rawName.split(/\s+/)[0] || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const ASRAMAS = [
  "Asrama 1",
  "Asrama 8A",
  "Asrama 8B",
  "Asrama 8C",
  "Asrama 10",
  "Asrama Sedayu Gedung A",
  "Asrama Sedayu Gedung B",
  "Asrama Sedayu Gedung C",
  "Asrama Sedayu Gedung D",
];

const AUTH_USERS: AuthUser[] = [
  // ─── PIMPINAN & DIREKSI MADRASAH (MONITORING / OVERSIGHT) ───
  { id:"wadir4", name:"Ahmad Salim, S.E.I., Lc.", email:"ahmadsalim91@gmail.com", role:"wadir4", phone:"6281226310736" },
  { id:"kaurkis", name:"Muhammad Shaleh, S.Pd.I., M.S.I.", email:"muhammad.shaleh@muallimin.sch.id", role:"kaur_kis", phone:"6281578968855" },

  // ─── KOORDINATOR MUSYRIF (SUPER ADMIN / FULL SCRUD) ───
  { id:"k1", name:"Andi Aqillah Fadia Haswat, S.A.P.", email:"andiaqillahfadiahaswat@gmail.com", role:"koordinator_musyrif", phone:"6285339213109" },

  // ─── PAMONG ASRAMA ───
  { id:"p1",  name:"Galang Putra Muhammady, S.Pd.",     email:"galangmuhammady@muallimin.sch.id", role:"pamong", asrama:"Asrama 1",                   phone:"6287711559827" },
  { id:"p2",  name:"Aulia Abdan Idza Shalla, S.Th.I.",  email:"auliaabdan@muallimin.sch.id",      role:"pamong", asrama:"Asrama 8A & 8C Kelas 6",      phone:"6285725891945" },
  { id:"p3",  name:"Anang Fathurrahman, Lc.",           email:"abukaysan86@gmail.com",            role:"pamong", asrama:"Asrama 8B & 8C Kelas 5",      phone:"6281804181182" },
  { id:"p4",  name:"Inggit Prabowo, S.Pd.",             email:"inggitprabowo13@gmail.com",        role:"pamong", asrama:"Asrama 10",                   phone:"6285377407742" },
  { id:"p5",  name:"Rais Yudhistira, Lc.",              email:"raiscutis@gmail.com, cutisrais@gmail.com", role:"pamong", asrama:"Asrama Sedayu Gedung A", phone:"6281399548580" },
  { id:"p6",  name:"Muh. Ahnaf Lubab, M.Pd.",           email:"ahnaflubab@muallimin.sch.id",      role:"pamong", asrama:"Asrama Sedayu Gedung B",      phone:"6285779006160" },
  { id:"p7",  name:"M. Ismail Marzuq, S.Sos.",          email:"izmaelpoenya04@gmail.com",         role:"pamong", asrama:"Asrama Sedayu Gedung C",      phone:"6285326693918" },
  { id:"p8",  name:"Ariel Amarta Dzikrillah, S.Sos.",   email:"arilamarta@gmail.com",             role:"pamong", asrama:"Asrama Sedayu Gedung D",      phone:"6285848589328" },
];

const MUSYRIF_LIST: Musyrif[] = [
  // ─── ASRAMA SEDAYU GEDUNG D (Pamong: Ariel Amarta Dzikrillah, S.Sos.) ───
  { id:"m1",  name:"Wahyu Dermawan",               role:"koordinator_gedung", kelas:"1 A",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"wahyudermawan1212@gmail.com",     phone:"6282180998704" },
  { id:"m2",  name:"Afif Nashrul",                 role:"musyrif",            kelas:"1 A",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"afifnashrul06@gmail.com, andiaqillah@muallimin.sch.id", phone:"6281287066297" },
  { id:"m3",  name:"Muhammad Farras Mamduh",       role:"musyrif",            kelas:"1 B",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 B",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"farrasmdh@gmail.com",             phone:"6285117104411" },
  { id:"m4",  name:"Leo Fernando Adnan Muzaki",    role:"musyrif",            kelas:"1 C",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 C",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"leodrfernandofelix@gmail.com",    phone:"6285701209925" },
  { id:"m5",  name:"Husein Nur Alwany",            role:"musyrif",            kelas:"1 D",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 D",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"husennur085@gmail.com",           phone:"6285157379443" },
  { id:"m6",  name:"Arif Rahman, S.s.",            role:"musyrif",            kelas:"1 E",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 E",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"nitikan3321@gmail.com",           phone:"6285129334523" },
  { id:"m7",  name:"M. Fajri",                     role:"musyrif",            kelas:"1 F",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 F",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"fajrhyiee@gmail.com",             phone:"6285189076745" },
  { id:"m8",  name:"Ajie Saptian Hardiyanto",      role:"musyrif",            kelas:"1 G",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 G",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"saptianaji07@gmail.com",          phone:"6285198234739" },
  { id:"m33", name:"Mukti Abdul Ghofur",           role:"musyrif",            kelas:"4 A",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung D", kamar:"4 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"muktighofur75@gmail.com",         phone:"6282322272355" },
  { id:"m37", name:"Rasya Adhar Al Islam",         role:"musyrif",            kelas:"4 E",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung D", kamar:"4 E",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"rasyaadhar3012@gmail.com",        phone:"62895402680315" },

  // ─── ASRAMA SEDAYU GEDUNG A (Pamong: Rais Yudhistira, Lc.) ───
  { id:"m9",  name:"Muhammad Maliq Hakeem",        role:"musyrif",            kelas:"1 Lower A",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower A",   pamong:"Rais Yudhistira, Lc.",                email:"muhammadmaliqhkm@gmail.com",      phone:"6282342754336" },
  { id:"m10", name:"Bryan Mahir Muharram",         role:"musyrif",            kelas:"1 Lower B",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower B",   pamong:"Rais Yudhistira, Lc.",                email:"bryanmuharram06@gmail.com",       phone:"6282140095932" },
  { id:"m11", name:"Auzia Difa Mubarok",           role:"musyrif",            kelas:"1 Lower C",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower C",   pamong:"Rais Yudhistira, Lc.",                email:"difaamubaarak@gmail.com",         phone:"6289526256385" },
  { id:"m20", name:"Muhammad Adhwa Janitra Handoko",role:"musyrif",           kelas:"2 Lower A",   tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung A", kamar:"2 Lower A",   pamong:"Rais Yudhistira, Lc.",                email:"handokohowareyou@gmail.com",      phone:"6287786969082" },
  { id:"m21", name:"Zaky Risky Kurniawan",         role:"musyrif",            kelas:"2 Lower B",   tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung A", kamar:"2 Lower B",   pamong:"Rais Yudhistira, Lc.",                email:"zakyrisky182@gmail.com",          phone:"6288983445038" },
  { id:"m22", name:"Farrel Izham Prayitno, Lc., S.Pd.",role:"musyrif",        kelas:"2 Lower C",   tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung A", kamar:"2 Lower C",   pamong:"Rais Yudhistira, Lc.",                email:"itsmefarrelizhamp@gmail.com",     phone:"6285217017024" },
  { id:"m23", name:"Abdullah, S.Pd.",              role:"musyrif",            kelas:"3 A",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 A",         pamong:"Rais Yudhistira, Lc.",                email:"abdullahmuallimin@muallimin.sch.id",phone:"62881025916368" },
  { id:"m31", name:"Muhammad Akbar Adi Wijaya",    role:"musyrif",            kelas:"3 Upper A",   tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 Upper A",   pamong:"Rais Yudhistira, Lc.",                email:"muhammadakbaarr123@gmail.com",    phone:"6285923336740" },
  { id:"m32", name:"Mouldy Mohammad Zayyed",       role:"musyrif",            kelas:"3 Upper B",   tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 Upper B",   pamong:"Rais Yudhistira, Lc.",                email:"mouldymaz@gmail.com",             phone:"6285155347353" },
  { id:"m39", name:"Ayyasy Kaizen Birruna",        role:"musyrif",            kelas:"4 Upper A",   tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung A", kamar:"4 Upper A",   pamong:"Rais Yudhistira, Lc.",                email:"catatankaizen@gmail.com",         phone:"6285930404552" },
  { id:"m40", name:"Hafidz Nawaf Fauzil Adhim, S.Pd.",role:"koordinator_gedung",kelas:"4 Upper B",tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung A", kamar:"4 Upper B",   pamong:"Rais Yudhistira, Lc.",                email:"fauziladhim2001@gmail.com",       phone:"6282241935414" },

  // ─── ASRAMA SEDAYU GEDUNG C (Pamong: M. Ismail Marzuq, S.Sos.) ───
  { id:"m12", name:"Arhab Syamil Asy Syatori",     role:"musyrif",            kelas:"2 A",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 A",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"arhab.syamil4@gmail.com",         phone:"6282145765850" },
  { id:"m13", name:"Muhammad Dhaim Aruna",         role:"musyrif",            kelas:"2 B",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 B",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"dhaimaruna@gmail.com",            phone:"628156554524" },
  { id:"m14", name:"Ivan Nur Adrian Pratama",      role:"musyrif",            kelas:"2 C",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 C",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"ivannur224@gmail.com",            phone:"6288983127506" },
  { id:"m15", name:"Muhammad Atqonuddinillah",     role:"musyrif",            kelas:"2 D",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 D",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"muhammadatqonuddinnilah@gmail.com",phone:"6281225054570" },
  { id:"m16", name:"Nur Affan Muarif, S.Sos.",     role:"musyrif",            kelas:"2 E",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 E",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"affanmuarif99@gmail.com",         phone:"6282216678182" },
  { id:"m17", name:"Muhammad Rafi Umar Rais",      role:"musyrif",            kelas:"2 F",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 F",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rafiumar420@gmail.com",           phone:"6285854312222" },
  { id:"m18", name:"Muhammad Arfa Burhanuddin Rafif",role:"musyrif",          kelas:"2 G",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 G",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"arfaburhan2008@gmail.com",        phone:"6281233795288" },
  { id:"m19", name:"Imam Tunisi",                  role:"musyrif",            kelas:"2 H",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 H",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"mamtun17@gmail.com",              phone:"62895635128151" },
  { id:"m35", name:"Zahdal Aisy Rahman Averusy",   role:"musyrif",            kelas:"4 C",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 C",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"zedzuhaid@gmail.com",             phone:"6282132910079" },
  { id:"m36", name:"Rifqi Adha Pradipa",           role:"koordinator_gedung", kelas:"4 D",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 D",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rifqipradipa62@gmail.com",        phone:"6287769943357" },
  { id:"m38", name:"Moh. Rival Aldiyansah",        role:"musyrif",            kelas:"4 F",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 F",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rivalaldiyansyah@muallimin.sch.id",phone:"6285706095527" },

  // ─── ASRAMA SEDAYU GEDUNG B (Pamong: Muh. Ahnaf Lubab, M.Pd.) ───
  { id:"m24", name:"Mukti Abdul Ghofar",           role:"musyrif",            kelas:"3 B",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 B",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"muktighofar705@gmail.com",        phone:"6282241379820" },
  { id:"m25", name:"Fadhl Maula Fawwas",           role:"musyrif",            kelas:"3 C",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 C",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"maulafawas@gmail.com",            phone:"6281228679325" },
  { id:"m26", name:"Fauzan Tasykurun Akmal",       role:"musyrif",            kelas:"3 D",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 D",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"fauzanakmaal15@gmail.com",        phone:"6287833527289" },
  { id:"m27", name:"Muhammad Syaqib Ridho Asy Syafiq",role:"musyrif",         kelas:"3 E",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 E",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"idoosakippp@gmail.com",           phone:"628988158493" },
  { id:"m28", name:"Muhammad Islam Al Ghozy",      role:"musyrif",            kelas:"3 F",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 F",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"muhammadislamalghozy2801@gmail.com",phone:"6281233421108" },
  { id:"m29", name:"Ahmad Arif Kurniawan",         role:"musyrif",            kelas:"3 G",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 G",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"ahmadarifkurniawan1809@gmail.com",phone:"6282233624304" },
  { id:"m30", name:"Ananda Hasan Putra Rahman",    role:"musyrif",            kelas:"3 H",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 H",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"primechild597@gmail.com",         phone:"6289509904184" },
  { id:"m34", name:"Rayhan Bachtiar Dwi Bayu Baskara",role:"koordinator_gedung",kelas:"4 B",      tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung B", kamar:"4 B",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"rayhan.baskara68@gmail.com",      phone:"6281225841078" },

  // ─── ASRAMA 8C & 8A KELAS 6 (Pamong: Aulia Abdan Idza Shalla, S.Th.I.) ───
  { id:"m51", name:"Habib Fajar Rohman",           role:"musyrif",            kelas:"6 A",         tingkat:"Kelas 6", asrama:"Asrama 8C",              kamar:"6 A",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"fajarrohman116@gmail.com",        phone:"6281246112790" },
  { id:"m52", name:"Muhammad Rafif Said, S.Pd.",   role:"musyrif",            kelas:"6 B",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 B",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"rafifsaid77@gmail.com",           phone:"62895413221010" },
  { id:"m53", name:"Gilang Cahya Ghufroni",        role:"musyrif",            kelas:"6 C",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 C",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"gilangcahya@muallimin.sch.id",    phone:"6285725379068" },
  { id:"m54", name:"Hilmy Muwafaq 'Adman",         role:"musyrif",            kelas:"6 D",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 D",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"hilmyadman97@gmail.com",          phone:"6281217904326" },
  { id:"m55", name:"Aflah Naufal Nabiih",          role:"musyrif",            kelas:"6 E",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 E",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"aflahnaufal07@gmail.com",         phone:"6281952116819" },

  // ─── ASRAMA 8C & 8B KELAS 5 (Pamong: Anang Fathurrahman, Lc.) ───
  { id:"m41", name:"Wildan Faalul Abror",          role:"musyrif",            kelas:"5 A",         tingkat:"Kelas 5", asrama:"Asrama 8C",              kamar:"5 A",         pamong:"Anang Fathurrahman, Lc.",             email:"wildanabror00@gmail.com",         phone:"6281233318388" },
  { id:"m42", name:"Rahmat Khoirul Anwar, S.Psi.", role:"musyrif",            kelas:"5 B",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 B",         pamong:"Anang Fathurrahman, Lc.",             email:"rahmatkhoirulanwar23@gmail.com",  phone:"6285335241954" },
  { id:"m43", name:"Muhammad Rafi Feriansyah",     role:"musyrif",            kelas:"5 C",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 C",         pamong:"Anang Fathurrahman, Lc.",             email:"cadanganrafi02@gmail.com",        phone:"62881025797090" },
  { id:"m44", name:"Muhammad Syahrul Mubarok",     role:"musyrif",            kelas:"5 D",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 D",         pamong:"Anang Fathurrahman, Lc.",             email:"m.syahrulmobar06@gmail.com",      phone:"6285236300512" },

  // ─── ASRAMA 10 (Pamong: Inggit Prabowo, S.Pd.) ───
  { id:"m45", name:"Dymas Naufal El Fawaz",        role:"musyrif",            kelas:"5 E",         tingkat:"Kelas 5", asrama:"Asrama 10",              kamar:"5 E",         pamong:"Inggit Prabowo, S.Pd.",               email:"dymasn@muallimin.sch.id",         phone:"6285117732302" },
  { id:"m46", name:"Layllan Dzikri Firmansyah",    role:"musyrif",            kelas:"5 F",         tingkat:"Kelas 5", asrama:"Asrama 10",              kamar:"5 F",         pamong:"Inggit Prabowo, S.Pd.",               email:"dzikrilayllan@gmail.com",         phone:"6285728503309" },
  { id:"m56", name:"Muhammad Ilman Khanafi",       role:"musyrif",            kelas:"6 F",         tingkat:"Kelas 6", asrama:"Asrama 10",              kamar:"6 F",         pamong:"Inggit Prabowo, S.Pd.",               email:"ilmankhanafi@muallimin.sch.id",   phone:"62895706160907" },
  { id:"m57", name:"Tajulqayyim Royyan",           role:"musyrif",            kelas:"6 G",         tingkat:"Kelas 6", asrama:"Asrama 10",              kamar:"6 G",         pamong:"Inggit Prabowo, S.Pd.",               email:"tajulqayyim@muallimin.sch.id",    phone:"6281334991879" },

  // ─── ASRAMA 1 (Pamong: Galang Putra Muhammady, S.Pd.) ───
  { id:"m47", name:"Muhammad Rafi",                role:"koordinator_gedung", kelas:"5 Upper A",   tingkat:"Kelas 5", asrama:"Asrama 1",               kamar:"5 Upper A",   pamong:"Galang Putra Muhammady, S.Pd.",       email:"muhammadrafi2246@gmail.com",      phone:"6287894970695" },
  { id:"m48", name:"Ammar Ghozi Al Farisi",        role:"koordinator_gedung", kelas:"5 Upper B",   tingkat:"Kelas 5", asrama:"Asrama 1",               kamar:"5 Upper B",   pamong:"Galang Putra Muhammady, S.Pd.",       email:"ammarghozi12@gmail.com",          phone:"6285725915157" },
  { id:"m49", name:"Ubaidillah Syafiq Atqiya",     role:"musyrif",            kelas:"5 Upper C & 6 Internasional", tingkat:"Kelas 5 & 6", asrama:"Asrama 1", kamar:"5 Upper C & 6 Int.", pamong:"Galang Putra Muhammady, S.Pd.", email:"ubay.syafiq03@gmail.com", phone:"6281284985750" },
];


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function matchesEmail(emailField?: string, inputEmail?: string): boolean {
  if (!emailField || !inputEmail) return false;
  const target = inputEmail.trim().toLowerCase();
  const list = emailField.toLowerCase().split(/[,;/\s]+/).filter(Boolean);
  return list.includes(target);
}

const todayStr = () => format(getTrustedDate(), "yyyy-MM-dd");

const S = {
  hadir: { label:"Hadir", short:"H", dot:"bg-emerald-500", chip:"bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 shadow-2xs font-semibold", btn:"bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500" },
  sakit: { label:"Sakit", short:"S", dot:"bg-amber-500",   chip:"bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 shadow-2xs font-semibold", btn:"bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400" },
  izin:  { label:"Izin",  short:"I", dot:"bg-sky-500",     chip:"bg-sky-50 text-sky-800 ring-1 ring-sky-200/80 shadow-2xs font-semibold", btn:"bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-1 ring-sky-500" },
  alfa:  { label:"Alfa",  short:"A", dot:"bg-rose-500",    chip:"bg-rose-50 text-rose-800 ring-1 ring-rose-200/80 shadow-2xs font-semibold", btn:"bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-1 ring-rose-500" },
} as const;

function Chip({ s }: { s?: AttendanceStatus }) {
  if (!s) return <span className="text-xs text-slate-300 font-mono">–</span>;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] ${S[s].chip}`}>{S[s].label}</span>;
}

const AVATAR_PRESETS = [
  { icon: User,          bg: "bg-emerald-600", text: "text-white" },
  { icon: GraduationCap, bg: "bg-indigo-600",  text: "text-white" },
  { icon: Smile,         bg: "bg-amber-500",   text: "text-white" },
  { icon: Sparkles,      bg: "bg-violet-600",  text: "text-white" },
  { icon: BookOpen,      bg: "bg-teal-600",    text: "text-white" },
  { icon: Crown,         bg: "bg-amber-600",   text: "text-white" },
  { icon: Award,         bg: "bg-rose-500",    text: "text-white" },
  { icon: Heart,         bg: "bg-pink-500",    text: "text-white" },
  { icon: Star,          bg: "bg-yellow-500",  text: "text-white" },
  { icon: Feather,       bg: "bg-cyan-600",    text: "text-white" },
  { icon: ShieldCheck,   bg: "bg-blue-600",    text: "text-white" },
  { icon: Flame,         bg: "bg-orange-500",  text: "text-white" },
  { icon: Compass,       bg: "bg-emerald-700", text: "text-white" },
  { icon: Coffee,        bg: "bg-slate-700",   text: "text-white" },
];

function getAvatarPreset(name: string) {
  if (!name) return AVATAR_PRESETS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PRESETS[Math.abs(hash) % AVATAR_PRESETS.length];
}

function Av({ name, src, sz="md" }: { name: string; src?: string; sz?: "xs"|"sm"|"md"|"lg" }) {
  const [imgError, setImgError] = useState(false);

  const c = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  }[sz];

  const iconSz = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-4.5 h-4.5",
    lg: "w-6 h-6",
  }[sz];

  const preset = getAvatarPreset(name);
  const IconComp = preset.icon;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${c} rounded-full object-cover flex-shrink-0 shadow-md ring-2 ring-white/90 select-none`}
      />
    );
  }

  return (
    <div className={`${c} ${preset.bg} ${preset.text} rounded-full flex-shrink-0 flex items-center justify-center shadow-md ring-2 ring-white/90 select-none transition-transform`}>
      <IconComp className={iconSz} strokeWidth={2.2} />
    </div>
  );
}

function Card({ ch, cls="" }: { ch: React.ReactNode; cls?: string }) {
  return <div className={`bg-white rounded-[24px] shadow-xs ring-1 ring-slate-200/70 border border-slate-100/50 overflow-hidden ${cls}`}>{ch}</div>;
}

function SectionHeader({ 
  title, 
  badge, 
  badgeVariant = "blue", 
  indicatorColor = "bg-[#0C81E4]",
  action,
  className = "mb-2.5" 
}: { 
  title: React.ReactNode; 
  badge?: React.ReactNode; 
  badgeVariant?: "emerald" | "purple" | "rose" | "teal" | "amber" | "indigo" | "slate" | "blue"; 
  indicatorColor?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const badgeStyles: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80",
    teal: "bg-teal-50 text-teal-700 border-teal-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200/80",
  };

  return (
    <div className={`flex items-center justify-between px-1 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-3.5 rounded-full ${indicatorColor} shrink-0`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono truncate">
          {title}
        </span>
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono border shrink-0 ${badgeStyles[badgeVariant] || badgeStyles.blue}`}>
          {badge}
        </span>
      )}
      {action}
    </div>
  );
}

function Label({ ch, cls="mb-2.5", indicatorColor="bg-[#0C81E4]" }: { ch: React.ReactNode; cls?: string; indicatorColor?: string }) {
  return (
    <div className={`flex items-center gap-2 px-1 ${cls}`}>
      <div className={`w-1.5 h-3.5 rounded-full ${indicatorColor} shrink-0`} />
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
        {ch}
      </span>
    </div>
  );
}

// Use centralized role access utilities
function hasFullAccess(u: AuthUser) { return checkFullAccess(u); }
function isDbAdmin(u: AuthUser | null): boolean { return checkDbAdmin(u); }
function isFieldMusyrif(m: { role?: Role | string }): boolean { return checkFieldMusyrif(m); }

function computeStreak(mid: string, records: AttendanceRecord[]) {
  let cur = 0, best = 0, tmp = 0;
  let streakBroken = false;
  const base = new Date(); base.setDate(base.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const r = records.find(x => x.musyrifId === mid && x.date === dateStr);
    const sSub = getEffectiveAttendanceStatus(r, "subuh", dateStr);
    const sMag = getEffectiveAttendanceStatus(r, "maghrib", dateStr);
    if (sSub === "hadir" && sMag === "hadir") { 
      tmp++; 
      if (!streakBroken) {
        cur = tmp;
      }
    } else { 
      streakBroken = true;
      best = Math.max(best, tmp); 
      tmp = 0; 
    }
  }
  return { cur, best: Math.max(best, tmp, cur) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportPDF(records: AttendanceRecord[], month: Date, asramaFilter: string, musyrifListAll?: Musyrif[]) {
  const mk = format(month,"yyyy-MM");
  const days = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
    .filter(d => !isBefore(new Date(),startOfDay(d)) || isToday(d));
  const sourceList = musyrifListAll && musyrifListAll.length > 0 ? musyrifListAll : MUSYRIF_LIST;
  const list = (asramaFilter === "Semua" ? sourceList : sourceList.filter(m => m.asrama === asramaFilter)).filter(isFieldMusyrif);

  const rows = list.map((m,i) => {
    const rs = records.filter(r => r.musyrifId === m.id && r.date.startsWith(mk));
    let sh = 0, ss = 0, si = 0, sa = 0;
    let mh = 0, ms = 0, mi = 0, ma = 0;
    days.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      const r = rs.find(x => x.date === ds);
      const subuhSt = getEffectiveAttendanceStatus(r, "subuh", ds);
      const maghribSt = getEffectiveAttendanceStatus(r, "maghrib", ds);
      if (subuhSt === "hadir") sh++;
      else if (subuhSt === "sakit") ss++;
      else if (subuhSt === "izin") si++;
      else if (subuhSt === "alfa") sa++;

      if (maghribSt === "hadir") mh++;
      else if (maghribSt === "sakit") ms++;
      else if (maghribSt === "izin") mi++;
      else if (maghribSt === "alfa") ma++;
    });
    const pct = days.length ? Math.round(((sh+mh)/(days.length*2))*100) : 0;
    return `<tr><td>${i+1}</td><td><b>${m.name}</b></td><td>${m.kelas}</td><td>${m.pamong||"-"}</td><td>${m.phone||"-"}</td><td style="color:#16a34a">${sh}</td><td style="color:#d97706">${ss}</td><td style="color:#2563eb">${si}</td><td style="color:#dc2626">${sa}</td><td style="color:#16a34a">${mh}</td><td style="color:#d97706">${ms}</td><td style="color:#2563eb">${mi}</td><td style="color:#dc2626">${ma}</td><td><b>${pct}%</b></td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Presensi ${format(month,"MMMM yyyy",{locale:id})}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:2cm;color:#111;font-size:11px}
  h1{font-size:18px;font-weight:700;color:#065f46;margin-bottom:4px}.sub{color:#64748b;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#059669;color:white;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:6px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f0fdf4}
  .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
  @media print{@page{size:A4 landscape;margin:1.5cm}}</style></head><body>
  <h1>Rekap Presensi Musyrif</h1>
  <p class="sub">${format(month,"MMMM yyyy",{locale:id})} · ${asramaFilter} · ${days.length} hari · ${list.length} musyrif</p>
  <table><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Pamong</th><th>No. WA</th><th>Sub.H</th><th>Sub.S</th><th>Sub.I</th><th>Sub.A</th><th>Mag.H</th><th>Mag.S</th><th>Mag.I</th><th>Mag.A</th><th>%</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="foot">Dicetak: ${format(new Date(),"d MMMM yyyy, HH:mm")} · Sistem Presensi Musyrif</p></body></html>`;

  const w = window.open("","_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function PageDashboard({
  records,
  authUser,
  onGoTo,
  onSelectMusyrif,
  onOpenWA,
  onOpenIzin,
  onOpenAlarm,
  onOpenKegiatan,
  onOpenLogbook,
  onNavigateToLogbook,
  onOpenMutabaah,
  onOpenSantriSakit,
  onOpenSantriIzin,
  onOpenLeaderboard,
  onOpenRaport,
  onOpenMusyrifManager,
  onOpenPamongManager,
  onOpenKalenderHijriah,
  onOpenKalenderPendidikan,
  onInstallPWA,
  onLogin,
  onSetTargetAsrama,
  pendingIzinCount = 0,
  activeSantriSakitCount = 0,
  activeSantriIzinCount = 0,
  canInstallPWA = false,
  musyrifList = MUSYRIF_LIST,
  pamongList = [],
  izinList = [],
  santriSakitList = [],
  santriIzinList = [],
  logbookData = {},
  mutabaahData = {},
  kegiatanRecords = [],
  isLoadingIzinSedayu = false,
  agendaRapatList = [],
  canDeletePhoto = false,
  onSaveLogbook,
  showToast
}: {
  records: AttendanceRecord[];
  authUser: AuthUser|null;
  onGoTo: (p: Page) => void;
  onSelectMusyrif?: (id: string) => void;
  onOpenWA: () => void;
  onOpenIzin: () => void;
  onOpenAlarm: () => void;
  onOpenKegiatan: () => void;
  onOpenLogbook: () => void;
  onNavigateToLogbook?: (musyrifId: string, date: string, taskKey: string) => void;
  onOpenMutabaah: () => void;
  onOpenSantriSakit: () => void;
  onOpenSantriIzin?: () => void;
  onOpenLeaderboard: () => void;
  onOpenRaport: () => void;
  onSetTargetAsrama?: (asrama: string) => void;
  onOpenMusyrifManager?: () => void;
  onOpenPamongManager?: () => void;
  onOpenKalenderHijriah?: () => void;
  onOpenKalenderPendidikan?: () => void;
  onInstallPWA?: () => void;
  onLogin?: () => void;
  pendingIzinCount?: number;
  activeSantriSakitCount?: number;
  activeSantriIzinCount?: number;
  canInstallPWA?: boolean;
  musyrifList?: Musyrif[];
  pamongList?: Pamong[];
  izinList?: any[];
  santriSakitList?: any[];
  santriIzinList?: SantriIzinRecord[];
  logbookData?: Record<string, any>;
  mutabaahData?: Record<string, any>;
  kegiatanRecords?: any[];
  isLoadingIzinSedayu?: boolean;
  agendaRapatList?: AgendaRapatRecord[];
  canDeletePhoto?: boolean;
  onSaveLogbook?: (musyrifId: string, date: string, entry: JurnalLogbookEntry) => void;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const allRaw = musyrifList && musyrifList.length > 0 ? musyrifList : MUSYRIF_LIST;
  const mList = allRaw.filter(isFieldMusyrif);
  const today = todayStr();
  const todayRecs = records.filter(r => r.date === today);
  const total = mList.length;

  // Live 1-second interval for real-time MM:SS countdown & status sync
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSubuh = (mid: string) => getEffectiveAttendanceStatus(todayRecs.find(r => r.musyrifId === mid), "subuh", today, liveNow);
  const getMaghrib = (mid: string) => getEffectiveAttendanceStatus(todayRecs.find(r => r.musyrifId === mid), "maghrib", today, liveNow);

  const sh = mList.filter(m => getSubuh(m.id) === "hadir").length;
  const mh = mList.filter(m => getMaghrib(m.id) === "hadir").length;
  const sa = mList.filter(m => getSubuh(m.id) === "alfa").length;
  const ma = mList.filter(m => getMaghrib(m.id) === "alfa").length;
  const belumS = mList.filter(m => !getSubuh(m.id));
  const belumM = mList.filter(m => !getMaghrib(m.id));

  const [detailMusyrif, setDetailMusyrif] = useState<Musyrif | null>(null);
  const [asramaCampus, setAsramaCampus] = useState<"all" | "sparman" | "sedayu">("all");
  const [expandedAsrama, setExpandedAsrama] = useState<string | null>(null);
  const [previewWidgetPhoto, setPreviewWidgetPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const prayerTimes = calcPrayerTimes(liveNow, -7.807631, 110.350905, 7);
  const hijri = toHijri(liveNow);
  const nowH = liveNow.getHours() + liveNow.getMinutes() / 60 + liveNow.getSeconds() / 3600;
  const activeIdx = [...prayerTimes].reduce((best, p, i) => p.raw <= nowH ? i : best, -1);
  const nextPrayer = prayerTimes[(activeIdx + 1) % prayerTimes.length];

  // Calculate exact target time for next prayer
  const targetDate = useMemo(() => {
    if (!nextPrayer) return null;
    const [hStr, mStr] = nextPrayer.time.split(":");
    const target = new Date(liveNow);
    target.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    if (target.getTime() <= liveNow.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }, [nextPrayer, liveNow.toDateString()]);

  const diffSec = targetDate ? Math.max(0, Math.floor((targetDate.getTime() - liveNow.getTime()) / 1000)) : 0;
  const hoursLeft = Math.floor(diffSec / 3600);
  const minsLeft = Math.floor((diffSec % 3600) / 60);
  const secsLeft = diffSec % 60;
  const totalMinsLeft = Math.floor(diffSec / 60);

  // Format digital countdown string (MM:SS or JJ:MM:SS)
  const countdownFormatted = hoursLeft > 0
    ? `${String(hoursLeft).padStart(2, "0")}:${String(minsLeft).padStart(2, "0")}:${String(secsLeft).padStart(2, "0")}`
    : `${String(minsLeft).padStart(2, "0")}:${String(secsLeft).padStart(2, "0")}`;

  const minsDisp = hoursLeft > 0 ? `${hoursLeft}j ${minsLeft}m` : `${minsLeft}m lagi`;

  const todayFasts = getSunnahFasts(liveNow);

  const weekData = Array.from({length:7},(_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = format(d,"yyyy-MM-dd");
    const rs = records.filter(r => r.date === ds);
    return {
      day: format(d,"EEE",{locale:id}).slice(0,2),
      subuh:   total ? Math.round(mList.filter(m=>getEffectiveAttendanceStatus(rs.find(r=>r.musyrifId===m.id), "subuh", ds, liveNow)==="hadir").length/total*100)   : 0,
      maghrib: total ? Math.round(mList.filter(m=>getEffectiveAttendanceStatus(rs.find(r=>r.musyrifId===m.id), "maghrib", ds, liveNow)==="hadir").length/total*100) : 0,
    };
  });

  const streakTop = useMemo(() => mList.map(m=>({...m,...computeStreak(m.id,records)})).sort((a,b)=>b.cur-a.cur).slice(0,5),[mList,records]);

  const now = liveNow;
  const thisMK = format(now,"yyyy-MM");
  const lastMK = format(subMonths(now,1),"yyyy-MM");
  const thisH = records.filter(r=>r.date.startsWith(thisMK)&&(r.subuh==="hadir"||r.maghrib==="hadir")).length;
  const lastH = records.filter(r=>r.date.startsWith(lastMK)&&(r.subuh==="hadir"||r.maghrib==="hadir")).length;
  const delta = lastH ? Math.round((thisH-lastH)/lastH*100) : 0;

  // Who needs attention (most alfa this month)
  const alfaRank = mList.map(m => {
    const rs = records.filter(r=>r.musyrifId===m.id&&r.date.startsWith(thisMK));
    const startD = startOfMonth(now);
    const endD = isBefore(now, endOfMonth(now)) ? now : endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: startD, end: endD });
    let mAlfa = 0;
    daysInMonth.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      const r = rs.find(x => x.date === ds);
      if (getEffectiveAttendanceStatus(r, "subuh", ds, liveNow) === "alfa") mAlfa++;
      if (getEffectiveAttendanceStatus(r, "maghrib", ds, liveNow) === "alfa") mAlfa++;
    });
    return { ...m, alfa: mAlfa };
  }).filter(m=>m.alfa>0).sort((a,b)=>b.alfa-a.alfa).slice(0,5);

  // Overview donut data
  const allTodayPossible = total * 2;
  const todayHadir = sh + mh;
  const todayBelum = belumS.length + belumM.length;
  const todayLain = allTodayPossible - todayHadir - todayBelum;
  const donutData = [
    { name:"Hadir", value: todayHadir, color:"#0C81E4" },
    { name:"Lainnya", value: Math.max(0,todayLain), color:"#17C3D4" },
    { name:"Belum", value: Math.max(0,todayBelum), color:"#e2e8f0" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── BANNER UNDANGAN RAPAT / AGENDA TERJADWAL (COMPACT 1-2 BARIS, MUNCUL 1 JAM SEBELUM RAPAT) ── */}
      {(() => {
        if (!authUser) return null;
        const myId = authUser.musyrifId || authUser.id;
        const myCleanEmail = (authUser.email || "").trim().toLowerCase();
        const matchedMusyrif = musyrifList.find(m => 
          m.id === myId || 
          (m.email && myCleanEmail && m.email.toLowerCase().includes(myCleanEmail))
        );
        const targetId = matchedMusyrif?.id || myId;

        // Current time calculation in minutes
        const currentMinutesOfDay = liveNow.getHours() * 60 + liveNow.getMinutes();

        // Filter agendas: only for today, where musyrif is invited, and time is within 1 hour before meeting until end of meeting day
        const activeAgendas = (agendaRapatList || []).filter(ag => {
          if (!Array.isArray(ag.invitedMusyrifIds) || !ag.invitedMusyrifIds.includes(targetId)) {
            return false;
          }
          // Only show for today
          if (ag.date !== today) {
            return false;
          }

          // Parse start time (e.g. "20:00" -> 1200 mins)
          const [shStr, smStr] = (ag.startTime || "09:00").split(":");
          const startMins = (parseInt(shStr, 10) || 0) * 60 + (parseInt(smStr, 10) || 0);

          // Muncul 1 jam (60 menit) sebelum rapat dimulai
          const appearThresholdMins = startMins - 60;
          return currentMinutesOfDay >= appearThresholdMins;
        }).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

        if (activeAgendas.length === 0) return null;

        const currentAgenda = activeAgendas[0];
        const taskKey = `agenda_${currentAgenda.id}`;
        const dayLogbook = logbookData[targetId]?.[currentAgenda.date];
        const hasPresensi = Boolean(dayLogbook?.[taskKey]?.done);
        const catConfig = AGENDA_CATEGORIES.find(c => c.id === currentAgenda.category) || AGENDA_CATEGORIES[0];

        return (
          <div 
            onClick={() => onNavigateToLogbook ? onNavigateToLogbook(targetId, currentAgenda.date, taskKey) : onGoTo("logbook")}
            className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-2.5 border shadow-2xs transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
              hasPresensi 
                ? "bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-200/80 text-emerald-950" 
                : "bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white hover:border-blue-300 border-blue-200/90 text-blue-950"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                hasPresensi ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
              }`}>
                {hasPresensi ? <CheckCircle2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${
                    hasPresensi ? "bg-emerald-200/80 text-emerald-900" : "bg-blue-600 text-white"
                  }`}>
                    {hasPresensi ? "✓ Hadir" : "Rapat Hari Ini"}
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 font-mono hidden sm:inline">
                    {catConfig.label}
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">
                    {currentAgenda.title}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  <span className="font-mono font-semibold text-slate-700">{currentAgenda.startTime}–{currentAgenda.endTime} WIB</span>
                  <span className="mx-1">•</span>
                  <span>{currentAgenda.locationName}</span>
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              {hasPresensi ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300/80 shadow-2xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Sudah Hadir</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-white bg-blue-600 group-hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Presensi</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Hero card - SYAMSA Brand Deep Blue Gradient */}
      <div 
        className="rounded-[32px] overflow-hidden relative shadow-lg shadow-sky-950/15 ring-1 ring-white/20"
        style={{
          background: "linear-gradient(135deg, #0C4E8C 0%, #0C81E4 100%)",
          minHeight: 235
        }}
      >
        {/* Gradient-Masked Dot Pattern (Left to Right Fade - Clean separation from Supergraphic) */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none z-0"
          style={{
            maskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0) 65%)",
            WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0) 65%)"
          }}
        >
          <svg width="100%" height="100%">
            <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>
        </div>

        {/* Syamsa Logomark Supergraphic Watermark (Pure White - Soft & Subtle on Right Side) */}
        <div className="absolute -right-8 -bottom-10 sm:-right-10 sm:-bottom-14 pointer-events-none select-none opacity-[0.08] z-0">
          <img
            src={syamsaLogomark}
            alt=""
            className="w-60 h-60 sm:w-80 sm:h-80 object-contain brightness-0 invert rotate-[-10deg]"
          />
        </div>
        <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between gap-5 sm:gap-6 min-h-[235px]">
          {/* Top Row: Hijri Date (Left) & Prayer Countdown (Right) - Simplified & Non-wrapping */}
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={onOpenKalenderHijriah}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 transition-all active:scale-95 text-left cursor-pointer group shadow-2xs shrink-0"
              title={`Kalender Hijriah: ${hijri.day} ${hijri.monthName} ${hijri.year} H`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              <span className="text-white text-[11px] font-mono font-bold group-hover:underline">
                {hijri.day} {hijri.monthName}
              </span>
              <Calendar className="w-3 h-3 text-cyan-100 opacity-90 group-hover:opacity-100" />
            </button>

            {nextPrayer ? (
              <button
                type="button"
                onClick={() => onGoTo("ibadah")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 transition-all active:scale-95 cursor-pointer shadow-2xs group shrink-0"
                title={`Jadwal Ibadah: ${nextPrayer.name} (${nextPrayer.time} WIB)`}
              >
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${totalMinsLeft <= 30 ? "bg-amber-300" : "bg-cyan-300"}`} />
                <span className="text-cyan-100 text-[11px] font-mono font-medium">
                  {nextPrayer.name}
                </span>
                <span className="text-white text-[11px] font-mono font-black tracking-tight">
                  -{countdownFormatted}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onGoTo("ibadah")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
              >
                <span className="text-white text-[11px] font-mono font-bold">Jadwal Ibadah</span>
              </button>
            )}
          </div>

          {/* Middle: Full-width Greeting */}
          <div>
            <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              {authUser ? `Ahlan, Ustaz ${getMusyrifCallName(authUser.name)}!` : "SYAMSA Presensi"}
            </h1>
            <p className="text-sky-100/90 text-xs sm:text-sm font-medium mt-0.5">
              {format(now, "EEEE, d MMMM yyyy", { locale: id })}
            </p>
          </div>

          {/* Bottom: 3 Stat Tiles / Quick Actions based on Role */}
          {(() => {
            const isMusyrifOrKoorGedung = authUser && (authUser.role === "musyrif" || authUser.role === "koordinator_gedung");

            if (isMusyrifOrKoorGedung) {
              const myId = authUser.musyrifId || authUser.id;
              const myRec = todayRecs.find(r => r.musyrifId === myId);
              const subuhStatus = getEffectiveAttendanceStatus(myRec, "subuh", today, liveNow);
              const maghribStatus = getEffectiveAttendanceStatus(myRec, "maghrib", today, liveNow);

              // Current time-window logbook session
              const currentHour = liveNow.getHours();
              const currentMinute = liveNow.getMinutes();
              const currentMinutesOfDay = currentHour * 60 + currentMinute;

              // Find active or next logbook task (Day-Aware)
              const dayOfWeek = liveNow.getDay(); // 0 = Ahad, 5 = Jumat, 4 = Kamis, 1 = Senin, 2 = Selasa, 3 = Rabu, 6 = Sabtu
              let activeTaskTitle = "Logbook Harian";
              let activeTaskKey = "tahajjud";
              let activeTaskTime = "Agenda Harian";

              if (currentMinutesOfDay >= 210 && currentMinutesOfDay <= 270) {
                activeTaskTitle = "Tahajjud Pagi";
                activeTaskKey = "tahajjud";
                activeTaskTime = "03:30–04:30 WIB";
              } else if (currentMinutesOfDay > 270 && currentMinutesOfDay <= 360) {
                activeTaskTitle = dayOfWeek === 0 ? "Muhadatsah Pagi" : "Tahfizh / Piket";
                activeTaskKey = "bakdaSubuh";
                activeTaskTime = "05:15–06:00 WIB";
              } else if (dayOfWeek !== 0 && currentMinutesOfDay > 360 && currentMinutesOfDay <= 410) {
                activeTaskTitle = "Cek Santri Sakit";
                activeTaskKey = "cekSakit";
                activeTaskTime = "06:00–06:45 WIB";
              } else if (currentMinutesOfDay > 360 && currentMinutesOfDay <= 450) {
                activeTaskTitle = dayOfWeek === 0 ? "Kerja Bakti Asrama" : "Sisir Sekolah";
                activeTaskKey = dayOfWeek === 0 ? "kerjaBakti" : "sisirSekolah";
                activeTaskTime = dayOfWeek === 0 ? "06:00–07:15 WIB" : "06:45–07:15 WIB";
              } else if (currentMinutesOfDay > 450 && currentMinutesOfDay <= (dayOfWeek === 5 ? 660 : 885)) {
                activeTaskTitle = "Jaga Gerbang";
                activeTaskKey = "jagaGerbang";
                activeTaskTime = "07:00–07:30 WIB";
              } else if (dayOfWeek === 5 && currentMinutesOfDay > 660 && currentMinutesOfDay <= 720) {
                activeTaskTitle = "Oprak Shalat Jum'at";
                activeTaskKey = "oprakJumat";
                activeTaskTime = "11:00–12:00 WIB";
              } else if (currentMinutesOfDay > 885 && currentMinutesOfDay <= 960) {
                activeTaskTitle = "Oprak Ashar";
                activeTaskKey = "oprakAshar";
                activeTaskTime = "14:45–15:45 WIB";
              } else if (currentMinutesOfDay > 960 && currentMinutesOfDay <= 1050) {
                activeTaskTitle = "Oprak Mandi Sore";
                activeTaskKey = "oprakMandi";
                activeTaskTime = "16:45–17:30 WIB";
              } else if (currentMinutesOfDay > 1050 && currentMinutesOfDay <= 1095) {
                activeTaskTitle = "Sisir Maghrib";
                activeTaskKey = "sisirMaghrib";
                activeTaskTime = "17:25–18:15 WIB";
              } else if (currentMinutesOfDay > 1095 && currentMinutesOfDay <= 1150) {
                if (dayOfWeek === 1 || dayOfWeek === 2) {
                  activeTaskTitle = "Belajar Bahasa";
                } else if (dayOfWeek === 3) {
                  activeTaskTitle = "Cek Catatan Santri";
                } else if (dayOfWeek === 4 || dayOfWeek === 5) {
                  activeTaskTitle = "Tahsin Qur'an";
                } else {
                  activeTaskTitle = "Ba'da Maghrib";
                }
                activeTaskKey = "bakdaMaghrib";
                activeTaskTime = "18:00–19:00 WIB";
              } else if (currentMinutesOfDay > 1150 && currentMinutesOfDay <= 1260) {
                activeTaskTitle = dayOfWeek === 4 ? "Baca Surat Al-Kahfi" : "Belajar Malam";
                activeTaskKey = "belajarMalam";
                activeTaskTime = dayOfWeek === 4 ? "19:30–21:00 WIB" : "19:00–20:30 WIB";
              } else {
                activeTaskTitle = "Menyisir Jam Tidur";
                activeTaskKey = "cekTidur";
                activeTaskTime = "20:30–22:00 WIB";
              }

              // Check if user has completed logbook today
              const todayIso = format(liveNow, "yyyy-MM-dd");
              const todayLogEntry = (logbookData && myId) ? (logbookData[myId]?.[todayIso] || {}) : {};
              const logDoneCount = Object.entries(todayLogEntry).filter(([k, v]: [string, any]) => k !== "generalNotes" && v && typeof v === "object" && Boolean(v.done)).length;
              const isLogComplete = logDoneCount >= 11;

              return (
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                  {/* Tile 1: Status Presensi Subuh Pribadi */}
                  <button
                    type="button"
                    onClick={() => onGoTo("subuh")}
                    className="bg-white/18 hover:bg-white/25 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3.5 border border-white/30 shadow-sm shadow-sky-950/10 transition-all text-left group active:scale-95 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-cyan-200 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sun className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-semibold truncate">Subuh</span>
                      </div>
                      {subuhStatus === "hadir" && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
                    </div>
                    <div>
                      <p className={`font-black text-xs sm:text-base tracking-tight leading-tight truncate ${
                        subuhStatus === "hadir" ? "text-cyan-100" :
                        subuhStatus === "sakit" ? "text-amber-200" :
                        subuhStatus === "izin" ? "text-sky-200" :
                        subuhStatus === "alfa" ? "text-rose-300" : "text-white/90"
                      }`}>
                        {subuhStatus === "hadir" ? "✓ Hadir" :
                         subuhStatus === "sakit" ? "Sakit" :
                         subuhStatus === "izin" ? "Izin" :
                         subuhStatus === "alfa" ? "Alfa" : "Belum Presensi"}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/70 truncate font-mono mt-0.5">Presensi Saya</p>
                    </div>
                  </button>

                  {/* Tile 2: Status Presensi Maghrib Pribadi */}
                  <button
                    type="button"
                    onClick={() => onGoTo("maghrib")}
                    className="bg-white/18 hover:bg-white/25 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3.5 border border-white/30 shadow-sm shadow-sky-950/10 transition-all text-left group active:scale-95 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-cyan-200 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Moon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-semibold truncate">Maghrib</span>
                      </div>
                      {maghribStatus === "hadir" && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
                    </div>
                    <div>
                      <p className={`font-black text-xs sm:text-base tracking-tight leading-tight truncate ${
                        maghribStatus === "hadir" ? "text-cyan-100" :
                        maghribStatus === "sakit" ? "text-amber-200" :
                        maghribStatus === "izin" ? "text-sky-200" :
                        maghribStatus === "alfa" ? "text-rose-300" : "text-white/90"
                      }`}>
                        {maghribStatus === "hadir" ? "✓ Hadir" :
                         maghribStatus === "sakit" ? "Sakit" :
                         maghribStatus === "izin" ? "Izin" :
                         maghribStatus === "alfa" ? "Alfa" : "Belum Presensi"}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/70 truncate font-mono mt-0.5">Presensi Saya</p>
                    </div>
                  </button>

                  {/* Tile 3: Logbook Harian */}
                  <button
                    type="button"
                    onClick={() => onGoTo("logbook")}
                    className="bg-white/18 hover:bg-white/25 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3.5 border border-white/30 shadow-sm shadow-sky-950/10 transition-all text-left group active:scale-95 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-cyan-200 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-semibold truncate">Logbook</span>
                      </div>
                      {isLogComplete && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
                    </div>
                    <div>
                      <p className={`font-black text-xs sm:text-base tracking-tight leading-tight truncate ${
                        isLogComplete ? "text-cyan-100" : logDoneCount > 0 ? "text-amber-200" : "text-white/90"
                      }`}>
                        {isLogComplete ? "✓ Lengkap" : logDoneCount > 0 ? `${logDoneCount}/11 Terisi` : "Belum Isi"}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/70 truncate font-mono mt-0.5">11 Tugas Harian</p>
                    </div>
                  </button>
                </div>
              );
            }

            // Mode Pamong / Koordinator / Kaur KIS / Wadir / Publik: Global Aggregates
            return (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                {[
                  { label: "Subuh", val: `${sh}/${total}`, icon: <Sun className="w-3.5 h-3.5" /> },
                  { label: "Maghrib", val: `${mh}/${total}`, icon: <Moon className="w-3.5 h-3.5" /> },
                  { label: "vs bln lalu", val: `${delta > 0 ? "+" : ""}${delta}%`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/18 hover:bg-white/25 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3.5 border border-white/30 shadow-sm shadow-sky-950/10 transition-all"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-200 mb-1.5">
                      {s.icon}
                      <span className="text-[10px] sm:text-[11px] font-semibold">{s.label}</span>
                    </div>
                    <p className="font-black text-base sm:text-xl text-white font-mono tracking-tight">
                      {s.val}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sunnah fast alert */}
      {todayFasts.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50/90 border border-amber-200/80 rounded-3xl p-4 cursor-pointer hover:shadow-xs transition-all active:scale-[0.99]" onClick={()=>onOpenKalenderHijriah ? onOpenKalenderHijriah() : onGoTo("kalender-hijriah")}>
          <div className="w-9 h-9 rounded-2xl bg-amber-100/90 flex items-center justify-center shrink-0">
            {renderFastIcon(todayFasts[0].icon, "w-5 h-5")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900">{todayFasts[0].name}</span>
              <span className="text-[9px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full font-mono">Sunnah</span>
            </div>
            <p className="text-xs text-amber-700 mt-0.5 leading-snug">{todayFasts[0].desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0"/>
        </div>
      )}

      {/* Countdown Perpulangan Santri TA 2026/2027 (Matching UI Hierarchy) */}
      <CountdownPerpulanganCard
        userEmail={authUser?.email}
        userRole={authUser?.role}
        variant="compact"
        onOpenFullCalendar={() => onOpenKalenderPendidikan ? onOpenKalenderPendidikan() : onGoTo("kalender-pendidikan")}
      />

      {/* Action Cards for Authenticated Users (Subuh & Maghrib) */}
      {authUser ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Subuh Action Card */}
          {(() => {
            const subuhWindow = getPresensiTimeWindow("subuh", liveNow);
            const isSubuhLocked = nowH < subuhWindow.openTime;
            const myMid = authUser.musyrifId || authUser.id;
            const mySubuhRec = todayRecs.find(r => r.musyrifId === myMid);
            const mySubuhStatus = getEffectiveAttendanceStatus(mySubuhRec, "subuh", today, liveNow);
            const isMySubuhHadir = mySubuhStatus === "hadir";

            return (
              <button
                type="button"
                onClick={() => onGoTo("subuh")}
                className={`group relative flex flex-col justify-between p-4 sm:p-5 text-white rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left overflow-hidden border ${
                  isSubuhLocked
                    ? "bg-slate-800/95 border-amber-500/30 text-slate-300"
                    : "bg-amber-600 hover:bg-amber-700 border-amber-500/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isSubuhLocked ? "bg-amber-500/20 text-amber-300" : "bg-white/20 text-white"}`}>
                    {isSubuhLocked ? <Lock className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full font-mono">
                    {authUser.role === "musyrif"
                      ? (isMySubuhHadir ? "Hadir ✓" : mySubuhStatus ? mySubuhStatus.toUpperCase() : "Belum")
                      : `${sh}/${total}`}
                  </span>
                </div>

                <div>
                  <p className="font-extrabold text-base leading-tight tracking-tight">Presensi Subuh</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isSubuhLocked
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : authUser.role === "musyrif"
                        ? (isMySubuhHadir ? "bg-emerald-950/30 text-emerald-100" : "bg-amber-950/30 text-amber-100")
                        : belumS.length > 0
                        ? "bg-amber-950/30 text-amber-100"
                        : "bg-emerald-950/30 text-emerald-100"
                    }`}>
                      {isSubuhLocked
                        ? `🔒 Buka ${subuhWindow.openDisplay} WIB`
                        : authUser.role === "musyrif"
                        ? (isMySubuhHadir ? "Sudah Hadir ✓" : "Isi Presensi Subuh →")
                        : belumS.length > 0
                        ? `${belumS.length} belum terisi`
                        : "Lengkap ✓"}
                    </span>
                  </div>
                </div>

                {/* Progress bar inside card */}
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{ width: authUser.role === "musyrif" ? (isMySubuhHadir ? "100%" : "0%") : `${total ? (sh / total) * 100 : 0}%` }}
                  />
                </div>
              </button>
            );
          })()}

          {/* Maghrib Action Card */}
          {(() => {
            const maghribWindow = getPresensiTimeWindow("maghrib", liveNow);
            const isMaghribLocked = nowH < maghribWindow.openTime;
            const myMid = authUser.musyrifId || authUser.id;
            const myMaghribRec = todayRecs.find(r => r.musyrifId === myMid);
            const myMaghribStatus = getEffectiveAttendanceStatus(myMaghribRec, "maghrib", today, liveNow);
            const isMyMaghribHadir = myMaghribStatus === "hadir";

            return (
              <button
                type="button"
                onClick={() => onGoTo("maghrib")}
                className={`group relative flex flex-col justify-between p-4 sm:p-5 text-white rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left overflow-hidden border ${
                  isMaghribLocked
                    ? "bg-[#0C1F3D]/95 border-sky-500/30 text-slate-300"
                    : "bg-[#0C4E8C] hover:bg-[#0A3E70] border-sky-500/40"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isMaghribLocked ? "bg-sky-500/20 text-sky-300" : "bg-white/20 text-white"}`}>
                    {isMaghribLocked ? <Lock className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full font-mono">
                    {authUser.role === "musyrif"
                      ? (isMyMaghribHadir ? "Hadir ✓" : myMaghribStatus ? myMaghribStatus.toUpperCase() : "Belum")
                      : `${mh}/${total}`}
                  </span>
                </div>

                <div>
                  <p className="font-extrabold text-base leading-tight tracking-tight">Presensi Maghrib</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isMaghribLocked
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : authUser.role === "musyrif"
                        ? (isMyMaghribHadir ? "bg-sky-950/40 text-sky-100" : "bg-cyan-950/40 text-cyan-100")
                        : belumM.length > 0
                        ? "bg-cyan-950/40 text-cyan-100"
                        : "bg-sky-950/40 text-sky-100"
                    }`}>
                      {isMaghribLocked
                        ? `🔒 Buka ${maghribWindow.openDisplay} WIB`
                        : authUser.role === "musyrif"
                        ? (isMyMaghribHadir ? "Sudah Hadir ✓" : "Isi Presensi Maghrib →")
                        : belumM.length > 0
                        ? `${belumM.length} belum terisi`
                        : "Lengkap ✓"}
                    </span>
                  </div>
                </div>

                {/* Progress bar inside card */}
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-500" 
                    style={{ width: authUser.role === "musyrif" ? (isMyMaghribHadir ? "100%" : "0%") : `${total ? (mh / total) * 100 : 0}%` }}
                  />
                </div>
              </button>
            );
          })()}
        </div>
      ) : null}

      {/* 📸 WIDGET GALERI LOGBOOK ASRAMA (INSTAGRAM-STYLE GRID) */}
      <LogbookGalleryWidget
        logbookData={logbookData}
        musyrifList={musyrifList}
        canDeletePhoto={canDeletePhoto}
        onSaveLogbook={onSaveLogbook}
        showToast={showToast}
        onOpenLogbook={authUser ? () => onGoTo("logbook") : undefined}
        onOpenFullGallery={() => onGoTo("galeri-logbook")}
      />

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* PUSAT LAYANAN & FITUR INOVASI KEASRAMAAN */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionHeader
          title={!authUser ? "Layanan & Fitur Terbuka" : (authUser.role === "musyrif" || authUser.role === "koordinator_gedung") ? "Layanan & Fitur Musyrif" : "Pusat Layanan & Manajemen Keasramaan"}
          badge={!authUser 
            ? "Akses Publik" 
            : authUser.role === "wadir4"
              ? "Wadir IV"
              : authUser.role === "kaur_kis"
                ? "Kaur KIS"
                : authUser.role === "koordinator_musyrif"
                  ? "Koord. Musyrif"
                  : authUser.role === "pamong"
                    ? "Pamong Asrama"
                    : "Musyrif"}
          badgeVariant="emerald"
          indicatorColor="bg-emerald-500"
          className="mb-2"
        />

        {/* 1. INTERACTIVE RICH WIDGET ROW (Izin Santri & Santri Sakit) - MUNCUL DI SEMUA ROLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Widget 1: Perizinan Santri dengan Real-time Approval Queue & Active Permits */}
          {(() => {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const pamongAsramas = authUser ? getPamongAssignedAsramas(authUser) : [];

            // Scope izin list based on role with flexible fallback
            const scopedSantriIzinList = (() => {
              if (!authUser || checkFullAccess(authUser) || authUser.role === "admin" || authUser.role === "koordinator_musyrif") {
                return santriIzinList || [];
              }
              let filtered: SantriIzinRecord[] = [];
              if (authUser.role === "pamong") {
                filtered = (santriIzinList || []).filter(iz => {
                  if (pamongAsramas.length > 0) {
                    return pamongAsramas.some(pa => !iz.asrama || iz.asrama === "Kampus Asrama" || iz.asrama.toLowerCase().includes(pa.toLowerCase()) || pa.toLowerCase().includes(iz.asrama.toLowerCase()));
                  }
                  return !iz.asrama || iz.asrama === "Kampus Asrama" || !authUser.asrama || iz.asrama.toLowerCase().includes(authUser.asrama.toLowerCase());
                });
              } else if (authUser.role === "koordinator_gedung") {
                filtered = (santriIzinList || []).filter(iz => !iz.asrama || iz.asrama === "Kampus Asrama" || !authUser.asrama || iz.asrama.toLowerCase().includes(authUser.asrama.toLowerCase()));
              } else if (authUser.role === "musyrif") {
                filtered = (santriIzinList || []).filter(iz => 
                  (authUser.asrama && iz.asrama && iz.asrama.toLowerCase().includes(authUser.asrama.toLowerCase())) || 
                  (authUser.kamar && iz.kamar && iz.kamar.toLowerCase().includes(authUser.kamar.toLowerCase())) ||
                  (authUser.kelas && iz.kelas && iz.kelas.toLowerCase().includes(authUser.kelas.toLowerCase())) ||
                  iz.dibuatOleh === authUser.name ||
                  !iz.asrama || iz.asrama === "Kampus Asrama"
                );
              }
              return filtered.length > 0 ? filtered : (santriIzinList || []);
            })();

            const validIzinList = (scopedSantriIzinList || []).filter(iz => Boolean(iz && iz.namaSantri && iz.namaSantri.trim() !== ""));
            const pendingSantriList = validIzinList.filter(iz => String(iz?.statusApproval || "").startsWith("pending"));
            const approvedTodayList = validIzinList.filter(iz => {
              if (String(iz?.statusApproval || "") !== "approved") return false;
              return iz.tglKeluarRencana === todayStr || iz.tglKembaliRencana === todayStr || (iz.tglKeluarRencana <= todayStr && iz.tglKembaliRencana >= todayStr);
            });
            const santriDiLuarList = validIzinList.filter(iz => String(iz?.statusApproval || "") === "approved" && iz?.statusPKM === "di_luar");
            
            // Prioritas tampilan: 1. Pending approval -> 2. Santri di luar -> 3. Izin aktif hari ini -> 4. Izin terbaru (Maksimal 5)
            const displayList = pendingSantriList.length > 0 
              ? pendingSantriList.slice(0, 5)
              : santriDiLuarList.length > 0
              ? santriDiLuarList.slice(0, 5)
              : approvedTodayList.length > 0
              ? approvedTodayList.slice(0, 5)
              : validIzinList.slice(0, 5);

            const pendingCount = pendingSantriList.length;
            const diLuarCount = santriDiLuarList.length;
            const totalActiveCount = approvedTodayList.length;

            return (
              <div
                onClick={() => onGoTo("izin-santri")}
                className="p-4 rounded-3xl bg-white border border-slate-100 ring-1 ring-slate-200/60 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <FileCheck2 className="w-4 h-4"/>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 leading-tight">Perizinan Santri</h4>
                        <span className="text-[10px] text-slate-400">Keluar & Pulang Asrama</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      isLoadingIzinSedayu
                        ? "bg-slate-100 text-slate-500 animate-pulse border border-slate-200"
                        : pendingCount > 0 
                        ? "bg-rose-500 text-white animate-pulse" 
                        : diLuarCount > 0 
                        ? "bg-sky-50 text-sky-800 border border-sky-200"
                        : totalActiveCount > 0
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {isLoadingIzinSedayu
                        ? "Menyinkron..."
                        : pendingCount > 0 
                        ? `${pendingCount} Pending` 
                        : diLuarCount > 0 
                        ? `${diLuarCount} di Luar`
                        : totalActiveCount > 0
                        ? `${totalActiveCount} Hari Ini`
                        : validIzinList.length > 0
                        ? `${validIzinList.length} Izin`
                        : "Nihil ✓"}
                    </span>
                  </div>

                  {isLoadingIzinSedayu ? (
                    <div className="space-y-2 py-1">
                      {/* Shimmer Item 1 */}
                      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-between gap-2.5 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-slate-200/90 shrink-0 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-slate-300 animate-spin" />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-3 bg-slate-200 rounded-md w-3/4"></div>
                          <div className="h-2 bg-slate-200/70 rounded-md w-1/2"></div>
                        </div>
                        <div className="h-4 bg-amber-100/80 rounded-md w-12 shrink-0 border border-amber-200/60"></div>
                      </div>
                      {/* Shimmer Item 2 */}
                      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-between gap-2.5 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-slate-200/90 shrink-0 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-3 bg-slate-200 rounded-md w-2/3"></div>
                          <div className="h-2 bg-slate-200/70 rounded-md w-1/3"></div>
                        </div>
                        <div className="h-4 bg-sky-100/80 rounded-md w-12 shrink-0 border border-sky-200/60"></div>
                      </div>
                    </div>
                  ) : displayList.length > 0 ? (
                    <div className="space-y-1.5">
                      {displayList.map(iz => {
                        const isPending = String(iz?.statusApproval || "").startsWith("pending");
                        const isDiLuar = iz?.statusPKM === "di_luar";

                        return (
                          <div key={iz.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-1.5 hover:bg-blue-50/50 transition">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 truncate">{iz.namaSantri || "Santri"}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {iz.kelas || "Santri"} {iz.keperluan ? `• ${iz.keperluan}` : ""}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isPending 
                                ? "bg-amber-100 text-amber-900 border border-amber-200" 
                                : isDiLuar 
                                ? "bg-sky-100 text-sky-900 border border-sky-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            }`}>
                              {isPending ? "Pending" : isDiLuar ? "Di Luar" : "Disetujui"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
                      <p className="text-[11px] font-medium text-slate-500">Belum ada perizinan santri aktif</p>
                    </div>
                  )}

                  {/* ADAPTIVE PHOTO GRID (Max 5x2 = 10 Foto) */}
                  {(() => {
                    const izinWithPhotos = validIzinList
                      .filter(iz => Boolean(iz.photoUrl || (iz as any).fotoSantriUrl || (iz as any).lampiranUrl))
                      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                      .slice(0, 10);

                    if (izinWithPhotos.length === 0) return null;

                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-100/90">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                            <Camera className="w-3 h-3 text-blue-500" />
                            Dokumentasi Izin ({izinWithPhotos.length}):
                          </span>
                          <span className="text-[9px] font-semibold text-blue-600">Klik lihat</span>
                        </div>
                        <div className={`grid gap-1.5 ${
                          izinWithPhotos.length === 1 ? "grid-cols-2 max-w-[140px]" :
                          izinWithPhotos.length === 2 ? "grid-cols-2 max-w-[180px]" :
                          izinWithPhotos.length === 3 ? "grid-cols-3" :
                          izinWithPhotos.length === 4 ? "grid-cols-4" :
                          "grid-cols-5"
                        }`}>
                          {izinWithPhotos.map((iz) => {
                            const pUrl = iz.photoUrl || (iz as any).fotoSantriUrl || (iz as any).lampiranUrl;
                            return (
                              <div
                                key={iz.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewWidgetPhoto({
                                    url: pUrl!,
                                    title: iz.namaSantri,
                                    subtitle: `${iz.kelas || "Kelas"} • ${iz.asrama || "Asrama"} • ${iz.keperluan || "Izin Santri"}`
                                  });
                                }}
                                className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 group/photo cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-2xs"
                                title={`${iz.namaSantri} (${iz.kelas})`}
                              >
                                <img
                                  src={pUrl}
                                  alt={iz.namaSantri}
                                  className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-300"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:text-blue-700">
                  <span>Buka Perizinan Santri</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })()}

          {/* Widget 2: Pantauan Santri Sakit (UKS & PKU) dengan Daftar Santri */}
          {(() => {
            const pamongAsramas = authUser ? getPamongAssignedAsramas(authUser) : [];
            const rawSakit = (santriSakitList || []).filter(s => s.status === "dalam_perawatan");
            
            // Scope sakit list based on role
            const scopedSakit = (() => {
              if (!authUser || checkFullAccess(authUser) || authUser.role === "admin") {
                return rawSakit;
              }
              if (authUser.role === "pamong") {
                return rawSakit.filter(s => {
                  if (pamongAsramas.length > 0) {
                    return pamongAsramas.includes(s.asrama) || pamongAsramas.some(pa => s.asrama?.toLowerCase().includes(pa.toLowerCase()));
                  }
                  return s.asrama === authUser.asrama;
                });
              }
              if (authUser.role === "koordinator_gedung") {
                return rawSakit.filter(s => s.asrama === authUser.asrama);
              }
              if (authUser.role === "musyrif") {
                const myMusyrifId = authUser.musyrifId || authUser.id;
                const myKelas = (authUser.kelas || "").trim().toLowerCase().replace(/^kelas\s+/i, "");
                return rawSakit.filter(s => {
                  const sKelas = (s.kelasSantri || "").trim().toLowerCase().replace(/^kelas\s+/i, "");
                  const matchId = Boolean(s.musyrifId && s.musyrifId === myMusyrifId);
                  const matchKelas = Boolean(myKelas && (sKelas === myKelas || sKelas.includes(myKelas) || myKelas.includes(sKelas)));
                  const matchKamar = Boolean(authUser.kamar && s.kamar && s.kamar.toLowerCase() === authUser.kamar.toLowerCase());
                  
                  if (myKelas) {
                    return matchKelas || matchId;
                  }
                  return matchId || matchKamar || (authUser.asrama && s.asrama === authUser.asrama);
                });
              }
              return rawSakit;
            })();

            // Urutkan paling atas yang terbaru
            const sortedSakit = [...scopedSakit].sort((a, b) => {
              const timeA = a.createdAt || a.date || "";
              const timeB = b.createdAt || b.date || "";
              if (timeA && timeB && timeA !== timeB) return timeB.localeCompare(timeA);
              return (b.id || "").localeCompare(a.id || "");
            });

            const activeSakit = sortedSakit.slice(0, 5);
            const todayStrVal = todayStr();

            return (
              <div
                onClick={() => onGoTo("santri-sakit")}
                className="p-4 rounded-3xl bg-white border border-slate-100 ring-1 ring-slate-200/60 shadow-xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                        <HeartPulse className="w-4 h-4"/>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 leading-tight">Santri Sakit</h4>
                        <span className="text-[10px] text-slate-400">Kamar & Poskestren</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      scopedSakit.length > 0 ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {scopedSakit.length > 0 ? `${scopedSakit.length} Santri` : "Nihil ✓"}
                    </span>
                  </div>

                  {activeSakit.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeSakit.map(s => {
                        const isNew = s.date === todayStrVal || (s.createdAt && s.createdAt.startsWith(todayStrVal));
                        return (
                          <div key={s.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-1.5 hover:bg-slate-100/80 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-800 truncate">{s.namaSantri}</p>
                                {isNew && (
                                  <span className="bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                                    Baru
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">{s.keluhan || "Gejala Sakit"} • {s.asrama}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              s.lokasiPerawatan === "rs_pku" ? "bg-rose-100 text-rose-800 font-bold" :
                              s.lokasiPerawatan === "uks" ? "bg-amber-100 text-amber-800 font-bold" :
                              s.lokasiPerawatan === "pulang" ? "bg-purple-100 text-purple-800" :
                              "bg-blue-100 text-blue-800"
                            }`}>
                              {s.lokasiPerawatan === "rs_pku" ? "PKU" : s.lokasiPerawatan === "uks" ? "Poskestren" : s.lokasiPerawatan === "pulang" ? "Pulang" : "Kamar"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
                      <p className="text-[11px] font-medium text-slate-500">Semua santri dalam kondisi sehat</p>
                    </div>
                  )}

                  {/* ADAPTIVE PHOTO GRID (Max 5x2 = 10 Foto) */}
                  {(() => {
                    const sakitWithPhotos = scopedSakit
                      .filter(s => Boolean(s.photoUrl))
                      .sort((a, b) => (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || ""))
                      .slice(0, 10);

                    if (sakitWithPhotos.length === 0) return null;

                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-100/90">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                            <Camera className="w-3 h-3 text-rose-500" />
                            Dokumentasi Sakit ({sakitWithPhotos.length}):
                          </span>
                          <span className="text-[9px] font-semibold text-rose-600">Klik lihat</span>
                        </div>
                        <div className={`grid gap-1.5 ${
                          sakitWithPhotos.length === 1 ? "grid-cols-2 max-w-[140px]" :
                          sakitWithPhotos.length === 2 ? "grid-cols-2 max-w-[180px]" :
                          sakitWithPhotos.length === 3 ? "grid-cols-3" :
                          sakitWithPhotos.length === 4 ? "grid-cols-4" :
                          "grid-cols-5"
                        }`}>
                          {sakitWithPhotos.map((s) => (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewWidgetPhoto({
                                  url: s.photoUrl!,
                                  title: s.namaSantri,
                                  subtitle: `${s.kelasSantri ? `Kelas ${s.kelasSantri}` : s.asrama} • ${s.keluhan || "Gejala Sakit"}`
                                });
                              }}
                              className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 group/photo cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all shadow-2xs"
                              title={`${s.namaSantri} (${s.kelasSantri || s.asrama})`}
                            >
                              <img
                                src={s.photoUrl}
                                alt={s.namaSantri}
                                className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-rose-600 group-hover:text-rose-700">
                  <span>Buka Pantauan Sakit</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })()}
        </div>

        {!authUser ? (
          /* Public Mode Services Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* 1. Leaderboard 4 Pilar */}
            <button
              type="button"
              onClick={() => onGoTo("leaderboard")}
              className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Trophy className="w-4 h-4"/>
                </div>
                <span className="text-[10px] font-bold text-purple-700 font-mono">4 Pilar</span>
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 leading-tight">Papan Peringkat</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Musyrif teladan & evaluasi</p>
              </div>
            </button>

            {/* 2. Jadwal & Arah Kiblat */}
            <button
              type="button"
              onClick={() => onGoTo("ibadah")}
              className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Compass className="w-4 h-4"/>
                </div>
                <span className="text-[10px] font-bold text-amber-700 font-mono">Ibadah</span>
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 leading-tight">Jadwal & Kiblat</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Waktu shalat & hisab</p>
              </div>
            </button>

            {/* 3. Kalender Hijriah KHGT */}
            <button
              type="button"
              onClick={onOpenKalenderHijriah}
              className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4"/>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono">KHGT</span>
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Hijriah</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Hisab & puasa sunnah</p>
              </div>
            </button>

            {/* 4. Kalender Pendidikan & Perpulangan */}
            <button
              type="button"
              onClick={() => onOpenKalenderPendidikan ? onOpenKalenderPendidikan() : onGoTo("kalender-pendidikan")}
              className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4"/>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-lg font-mono">2026/27</span>
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Pendidikan</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Countdown & perpulangan</p>
              </div>
            </button>
          </div>
        ) : (authUser.role === "musyrif" || authUser.role === "koordinator_gedung") ? (
          /* Musyrif & Koordinator Gedung Dashboard */
          <div className="space-y-3">
            {/* Quick Status Widgets Banner (Logbook, Mutaba'ah, Agenda) */}
            {(() => {
              const myId = authUser.musyrifId || authUser.id;
              const myLog = (logbookData && myId) ? (logbookData[myId]?.[today] || {}) : {};
              const logDoneCount = Object.entries(myLog).filter(([k, v]: [string, any]) => k !== "generalNotes" && v && typeof v === "object" && Boolean(v.done)).length;
              const isLogComplete = logDoneCount >= 11;

              const myMut = (mutabaahData && myId) ? (mutabaahData[myId]?.[today] as any) : undefined;
              let mutDoneCount = 0;
              if (myMut) {
                if (myMut.tahajjud) mutDoneCount++;
                if (myMut.dhuha) mutDoneCount++;
                if (myMut.rawatib) mutDoneCount++;
                if (myMut.dzikirPagi) mutDoneCount++;
                if (myMut.dzikirPetang) mutDoneCount++;
                if (myMut.puasaSunnah) mutDoneCount++;
                if (myMut.muthalaah) mutDoneCount++;
                if (Number(myMut.tilawahPages) > 0) mutDoneCount++;
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Status Logbook Hari Ini */}
                  <div 
                    onClick={() => onGoTo("logbook")}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isLogComplete ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 truncate">Jurnal Logbook</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {isLogComplete ? "11/11 Tugas ✓" : `${logDoneCount}/11 tugas`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                      isLogComplete ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                    }`}>
                      {isLogComplete ? "Lengkap" : "Isi"}
                    </span>
                  </div>

                  {/* 2. Status Mutaba'ah Hari Ini */}
                  <div 
                    onClick={() => onGoTo("mutabaah")}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${mutDoneCount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 truncate">Mutaba'ah</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {mutDoneCount > 0 ? `${mutDoneCount} amalan ✓` : "Belum diisi"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                      mutDoneCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {mutDoneCount > 0 ? "Aktif" : "Isi"}
                    </span>
                  </div>

                  {/* 3. Tugas Pengasuhan (RS/PKU & Bimbingan) */}
                  <div 
                    onClick={() => onGoTo("pengasuhan-santri")}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-rose-400 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 truncate">Tugas Pengasuhan</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          RS/PKU & Bimbingan
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-rose-100 text-rose-800 shrink-0">
                      Pilar 2
                    </span>
                  </div>

                  {/* 4. Agenda Asrama */}
                  <div 
                    onClick={() => onOpenKegiatan ? onOpenKegiatan() : onGoTo("kegiatan")}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 truncate">Agenda Asrama</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {kegiatanRecords && kegiatanRecords.length > 0 
                            ? `${kegiatanRecords.length} agenda` 
                            : "Kajian & Piket"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-amber-100 text-amber-800 shrink-0">
                      Lihat
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Musyrif Role Services Grid - Fitur Pelengkap Tanpa Duplikasi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {/* 1. Riwayat Presensi Pribadi */}
              <button
                type="button"
                onClick={() => onGoTo("riwayat")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 font-mono">Saya</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Riwayat Presensi</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Kalender kehadiran</p>
                </div>
              </button>

              {/* 1.5. Tugas Pengasuhan (Pilar 2) */}
              <button
                type="button"
                onClick={() => onGoTo("pengasuhan-santri")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-lg font-mono">Pilar 2</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Tugas Pengasuhan</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Antar PKU/RS & Bimbingan</p>
                </div>
              </button>

              {/* 2. Pengajuan Izin Musyrif Pribadi */}
              <button
                type="button"
                onClick={() => onGoTo("izin")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 font-mono">Izin Saya</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Izin Musyrif</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Form izin dinas/pribadi</p>
                </div>
              </button>

              {/* 3. Leaderboard 4 Pilar */}
              <button
                type="button"
                onClick={() => onGoTo("leaderboard")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Trophy className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 font-mono">4 Pilar</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Papan Peringkat</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Musyrif teladan</p>
                </div>
              </button>

              {/* 4. Jadwal Shalat & Arah Kiblat */}
              <button
                type="button"
                onClick={() => onGoTo("ibadah")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Compass className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 font-mono">Ibadah</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Jadwal & Kiblat</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Waktu shalat & arah</p>
                </div>
              </button>

              {/* 5. Kalender Hijriah KHGT */}
              <button
                type="button"
                onClick={onOpenKalenderHijriah}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono">KHGT</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Hijriah</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Hisab & puasa sunnah</p>
                </div>
              </button>

              {/* 6. Kalender Pendidikan & Perpulangan */}
              <button
                type="button"
                onClick={() => onOpenKalenderPendidikan ? onOpenKalenderPendidikan() : onGoTo("kalender-pendidikan")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-lg font-mono">2026/27</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Pendidikan</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Countdown perpulangan</p>
                </div>
              </button>

              {/* 7. Database Santri Kelas Binaan (Musyrif) */}
              <button
                type="button"
                onClick={() => onGoTo("data-santri")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-cyan-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-lg font-mono">Kelas</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Data Santri Kelas</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Biodata & kontak ortu</p>
                </div>
              </button>

              {/* 8. Lembar Pembinaan (Musyrif) */}
              <button
                type="button"
                onClick={() => onGoTo("pembinaan")}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg font-mono">BK / Poin</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800 leading-tight">Lembar Pembinaan</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Poin pelanggaran & apresiasi</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Pamong & Koordinator Dynamic Widgets & Clean Services Grid */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label ch="Menu Layanan & Manajemen" indicatorColor="bg-emerald-600" cls="mb-2" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. Jurnal Logbook - Most Frequent (Daily 11 Tasks) */}
                <button
                  type="button"
                  onClick={() => onGoTo("logbook")}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-indigo-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      11 Tugas
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Jurnal Logbook</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Pantau tugas harian</p>
                  </div>
                </button>

                {/* 1.5. Tugas Pengasuhan & RS (Pilar 2) */}
                <button
                  type="button"
                  onClick={() => onGoTo("pengasuhan-santri")}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-rose-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      Pilar 2
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Tugas Pengasuhan</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Antar PKU/RS & Bimbingan</p>
                  </div>
                </button>

                {/* 2. Mutaba'ah Musyrif - Daily Sunnah */}
                <button
                  type="button"
                  onClick={() => onGoTo("mutabaah")}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      Sunnah
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Mutaba'ah Musyrif</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Pantau amalan sunnah</p>
                  </div>
                </button>

                {/* 3. Kirim WA - Frequent Reporting */}
                <button
                  type="button"
                  onClick={onOpenWA}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Share2 className="w-3.5 h-3.5"/>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      1-Klik
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Rekap WhatsApp</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Kirim laporan resmi grup</p>
                  </div>
                </button>

                {/* 4. Kalender Hijriah KHGT - Frequent Reference */}
                <button
                  type="button"
                  onClick={onOpenKalenderHijriah}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-teal-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      KHGT
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Hijriah</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Hisab & puasa sunnah</p>
                  </div>
                </button>

                {/* 5. Kalender Pendidikan - Occasional */}
                <button
                  type="button"
                  onClick={() => onOpenKalenderPendidikan ? onOpenKalenderPendidikan() : onGoTo("kalender-pendidikan")}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-orange-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      2026/27
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Kalender Pendidikan</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Countdown perpulangan</p>
                  </div>
                </button>

                {/* 6. Database Santri - Occasional */}
                {authUser && (
                  <button
                    type="button"
                    onClick={() => onGoTo("data-santri")}
                    className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-cyan-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200/80 px-1.5 py-0.2 rounded-md font-mono">
                        {authUser.role === "koordinator_musyrif" ? "1.497" : (authUser.role === "pamong" ? "Asrama" : "Santri")}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-tight">
                        {authUser.role === "pamong" ? "Santri Asrama" : "Database Santri"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {authUser.role === "pamong" ? "Biodata santri asrama" : "Biodata & kontak ortu"}
                      </p>
                    </div>
                  </button>
                )}

                {/* 7. Peta Sebaran Santri - Rare */}
                {authUser && (
                  <button
                    type="button"
                    onClick={() => onGoTo("peta-santri")}
                    className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-fuchsia-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-xl bg-fuchsia-50 text-fuchsia-700 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-fuchsia-800 bg-fuchsia-50 border border-fuchsia-200/80 px-1.5 py-0.2 rounded-md font-mono">
                        36 prov
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-tight">Peta Sebaran</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">Asal daerah santri</p>
                    </div>
                  </button>
                )}

                {/* 8. Lembar Pembinaan - Occasional */}
                <button
                  type="button"
                  onClick={() => onGoTo("pembinaan")}
                  className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md font-mono">
                      Poin / BK
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 leading-tight">Lembar Pembinaan</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Poin pelanggaran & sanksi</p>
                  </div>
                </button>

                {/* 9. Agenda Rapat & Pertemuan Musyrif */}
                {authUser && (
                  <button
                    type="button"
                    onClick={() => onGoTo("agenda-rapat")}
                    className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-blue-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-md font-mono">
                        Rapat
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-tight">Agenda Rapat</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">Pertemuan & Pengajian</p>
                    </div>
                  </button>
                )}

                {/* 9. Master Personel - Rare (Koordinator Only) */}
                {authUser?.role === "koordinator_musyrif" && (
                  <button
                    type="button"
                    onClick={() => onOpenMusyrifManager ? onOpenMusyrifManager() : onGoTo("musyrif-manager")}
                    className="group p-3 rounded-2xl bg-white border border-slate-100 ring-1 ring-slate-200/60 hover:border-blue-500 hover:shadow-xs transition-all text-left flex flex-col justify-between active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-md font-mono">
                        SCRUD
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-tight">Master Personel</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">Musyrif, Pamong & Akses</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* High-Utility Compact Asrama Command Matrix for Pamong / Public */}
      {(!authUser || hasFullAccess(authUser)) && (
        <div>
          <SectionHeader
            title="Matriks Presensi Asrama"
            badge={`Hari ini · ${ASRAMAS.length} Asrama`}
            badgeVariant="teal"
            indicatorColor="bg-teal-500"
            className="mb-2"
          />
          <Card ch={<div>
            {/* Header & Filter Tabs */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 border border-teal-200/60">
                  <Users className="w-4 h-4"/>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 leading-tight">Matriks Presensi Asrama</p>
                  <p className="text-[10px] text-slate-400 font-mono">Hari ini · {ASRAMAS.length} Unit Asrama</p>
                </div>
              </div>

              {/* Campus Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl self-start sm:self-auto">
                {[
                  { id: "all", label: "Semua", count: 8 },
                  { id: "sparman", label: "S. Parman", count: 5 },
                  { id: "sedayu", label: "Sedayu", count: 3 }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAsramaCampus(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      asramaCampus === tab.id
                        ? "bg-white text-emerald-800 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Matrix Table */}
            <div className="divide-y divide-slate-50">
              {ASRAMAS.filter(a => {
                if (asramaCampus === "sparman") return !a.toLowerCase().includes("sedayu");
                if (asramaCampus === "sedayu") return a.toLowerCase().includes("sedayu");
                return true;
              }).map(a => {
                const ins = mList.filter(m => m.asrama === a);
                const sh2 = ins.filter(m => getSubuh(m.id) === "hadir").length;
                const mh2 = ins.filter(m => getMaghrib(m.id) === "hadir").length;
                const pct = ins.length ? Math.round(((sh2 + mh2) / (ins.length * 2)) * 100) : 0;
                const isExpanded = expandedAsrama === a;

                return (
                  <div key={a} className="transition-colors">
                    <div 
                      onClick={() => setExpandedAsrama(isExpanded ? null : a)}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer select-none"
                    >
                      {/* Asrama info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300"
                        }`}/>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate leading-tight">{a}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ins.length} musyrif</p>
                        </div>
                      </div>

                      {/* Subuh & Maghrib Pills */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${
                          sh2 === ins.length && ins.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          sh2 > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200/60"
                        }`}>
                          S: {sh2}/{ins.length}
                        </span>

                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${
                          mh2 === ins.length && ins.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          mh2 > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200/60"
                        }`}>
                          M: {mh2}/{ins.length}
                        </span>

                        <span className={`w-11 text-right text-xs font-extrabold font-mono ${
                          pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-slate-400"
                        }`}>
                          {pct}%
                        </span>

                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-emerald-600" : ""}`}/>
                      </div>
                    </div>

                    {/* Expanded Musyrif Roster & Quick Actions */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Daftar Musyrif ({ins.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ins.map(m => {
                            const rec = todayRecs.find(r => r.musyrifId === m.id);
                            const stS = getEffectiveAttendanceStatus(rec, "subuh", today, liveNow);
                            const stM = getEffectiveAttendanceStatus(rec, "maghrib", today, liveNow);
                            return (
                              <div key={m.id} className="bg-white rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Av name={m.name} src={m.photo} sz="xs"/>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{m.kelas}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                    stS === "hadir" ? "bg-emerald-100 text-emerald-800" : stS === "alfa" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"
                                  }`}>S:{stS ? S[stS].short : "–"}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                    stM === "hadir" ? "bg-emerald-100 text-emerald-800" : stM === "alfa" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"
                                  }`}>M:{stM ? S[stM].short : "–"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {authUser && authUser.role !== "musyrif" && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onSetTargetAsrama?.(a);
                                onGoTo(now.getHours() < 12 ? "subuh" : "maghrib");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5"/>
                              <span>Buka Form Presensi {a}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>}/>
        </div>
      )}

      {/* Streak leaderboard Top 5 — HANYA TAMPIL SETELAH LOGIN (Internal Musyrif/Pamong/Koor) */}
      {authUser && (
        <div>
          <SectionHeader
            title="Top 5 Streak Shalat Beruntun"
            badge="Konsistensi Jamaah"
            badgeVariant="purple"
            indicatorColor="bg-purple-500"
            className="mb-2"
          />
          <Card ch={<div>
            {/* Header info */}
            <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200/60">
                  <Flame className="w-4 h-4 text-amber-500"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">Konsistensi Presensi Beruntun</p>
                  <p className="text-[10px] text-slate-400 font-mono">Apresiasi musyrif teladan jamaah</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 rounded-full font-mono shrink-0">
                Top {streakTop.length}
              </span>
            </div>

            {/* Daftar streak - klik buka detail individu */}
            <div className="divide-y divide-slate-50">
              {streakTop.map((m,i)=>(
                <button
                  key={m.id}
                  onClick={()=>setDetailMusyrif(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-6 flex items-center justify-center shrink-0">
                    {i === 0 ? <Crown className="w-4 h-4 text-amber-500" /> :
                     i === 1 ? <Medal className="w-4 h-4 text-slate-400" /> :
                     i === 2 ? <Award className="w-4 h-4 text-amber-700" /> :
                     <span className="text-xs font-bold text-slate-400 font-mono">{i + 1}</span>}
                  </div>
                  <Av name={m.name} src={m.photo} sz="sm"/>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p><p className="text-xs text-slate-500">{m.asrama}</p></div>
                  <div className="text-right"><div className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-500"/><span className="font-bold text-slate-800 font-mono">{m.cur}</span><span className="text-xs text-slate-500">hari</span></div><p className="text-[10px] text-slate-400">terbaik: {m.best}h</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1"/>
                </button>
              ))}
            </div>

            {/* Footer — link ke Leaderboard 4 Pilar */}
            <button
              type="button"
              onClick={()=>onGoTo("leaderboard")}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-100 text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-50/60 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5"/>
                <span>Buka Papan Peringkat 4 Pilar Terpisah</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>}/>
        </div>
      )}

      {/* Perlu perhatian - HANYA TAMPIL SETELAH LOGIN (Pamong / Koor) */}
      {authUser && alfaRank.length > 0 && (
        <div>
          <SectionHeader
            title="Catatan Kehadiran Perlu Perhatian"
            badge="Internal Saja"
            badgeVariant="rose"
            indicatorColor="bg-rose-500"
            className="mb-2"
          />
          <Card ch={<div className="divide-y divide-slate-50">
            {alfaRank.map(m=>(
              <button 
                key={m.id} 
                onClick={()=>setDetailMusyrif(m)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
              >
                <Av name={m.name} src={m.photo} sz="sm"/>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p><p className="text-xs text-slate-500">{m.asrama}</p></div>
                <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl"><AlertCircle className="w-3.5 h-3.5 text-rose-500"/><span className="text-sm font-bold text-rose-700 font-mono">{m.alfa}</span><span className="text-xs text-rose-600 font-semibold">Alfa</span></div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1"/>
              </button>
            ))}
          </div>}/>
        </div>
      )}

      {/* Quick nav */}
      {authUser && (
        <div className="grid grid-cols-3 gap-2">
          {[
            {label:"Rekap",   sub:"Statistik",    page:"rekap"   as Page, icon:<TrendingUp className="w-5 h-5"/>, col:"bg-emerald-50 text-emerald-700"},
            {label:"Riwayat", sub: authUser ? "Kalender" : "Katalog", page:(authUser ? "riwayat" : "rekap") as Page, icon:<Calendar   className="w-5 h-5"/>, col:"bg-teal-50 text-teal-700"},
            {label:"Ibadah",  sub:"Sholat & Kiblat",page:"ibadah"  as Page, icon:<Compass    className="w-5 h-5"/>, col:"bg-amber-50 text-amber-700"},
          ].map(n=>(
            <button key={n.label} onClick={()=>onGoTo(n.page)} className="bg-white ring-1 ring-slate-200/80 rounded-2xl p-3.5 text-left hover:ring-emerald-300 hover:shadow-xs transition-all active:scale-[0.97]">
              <div className={`w-9 h-9 rounded-xl ${n.col} flex items-center justify-center mb-2`}>{n.icon}</div>
              <p className="font-bold text-sm text-slate-800">{n.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{n.sub}</p>
            </button>
          ))}
        </div>
      )}

      {/* Musyrif Detail Modal for Dashboard */}
      {detailMusyrif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" onClick={()=>setDetailMusyrif(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Av name={detailMusyrif.name} sz="lg"/>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-base truncate">{detailMusyrif.name}</h3>
                <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded mt-0.5">{detailMusyrif.kelas}</span>
                <p className="text-xs text-slate-400 mt-1">{detailMusyrif.asrama} · Pamong: {detailMusyrif.pamong || "-"}</p>
              </div>
            </div>

            {(detailMusyrif.phone || detailMusyrif.email) && (
              <div className="flex items-center gap-2 my-4">
                {detailMusyrif.phone && (
                  <a href={`https://wa.me/${detailMusyrif.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all shadow-sm">
                    <MessageCircle className="w-4 h-4"/> Hubungi WhatsApp
                  </a>
                )}
                {detailMusyrif.email && (
                  <a href={`mailto:${detailMusyrif.email}`} className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all">
                    <Mail className="w-4 h-4"/> Email
                  </a>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {authUser && (
                <button 
                  type="button"
                  onClick={()=>{ 
                    onSelectMusyrif?.(detailMusyrif.id);
                    setDetailMusyrif(null); 
                    onGoTo("riwayat"); 
                  }} 
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
                >
                  Lihat di Riwayat
                </button>
              )}
              <button 
                type="button"
                onClick={()=>setDetailMusyrif(null)} 
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Fullscreen Lightbox Modal untuk Foto Widget Beranda */}
      {previewWidgetPhoto && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewWidgetPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <div className="min-w-0 pr-2">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">{previewWidgetPhoto.title}</h4>
                {previewWidgetPhoto.subtitle && (
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{previewWidgetPhoto.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewWidgetPhoto(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative flex-1 bg-black flex items-center justify-center p-2 min-h-[260px] max-h-[65vh] overflow-hidden">
              <img
                src={previewWidgetPhoto.url}
                alt={previewWidgetPhoto.title}
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Dokumentasi Presensi Santri</span>
              <button
                type="button"
                onClick={() => setPreviewWidgetPhoto(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: INPUT PRESENSI (SUBUH / MAGHRIB TERPISAH)
// ─────────────────────────────────────────────────────────────────────────────
function PageInputPrayer({
  initialSlot = "subuh",
  initialAsrama,
  authUser,
  records,
  onMark,
  onMarkAll,
  onResetMark,
  onLogin,
  onSwitchSlot,
  showToast,
  musyrifListAll
}: {
  initialSlot?: PrayerSlot;
  initialAsrama?: string;
  authUser: AuthUser | null;
  records: AttendanceRecord[];
  onMark: MarkFn;
  onMarkAll: MarkAllFn;
  onResetMark?: (mid: string, prayer: PrayerSlot, date: string) => void;
  onLogin: () => void;
  onSwitchSlot?: (slot: PrayerSlot) => void;
  showToast?: (msg: string, type?: "success" | "info" | "error") => void;
  musyrifListAll?: Musyrif[];
}) {
  const [slot, setSlot] = useState<PrayerSlot>(initialSlot);
  const [selDate, setSelDate] = useState(todayStr());
  const [selAsrama, setSelAsrama] = useState(initialAsrama || ASRAMAS[0]);
  const [search, setSearch] = useState("");
  const [noteFor, setNoteFor] = useState<{ id: string; prayer: PrayerSlot } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmAll, setConfirmAll] = useState<PrayerSlot | null>(null);
  const [gpsResult, setGpsResult] = useState<GeofenceResult | null>(null);
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);

  // Sync if initialSlot changed from external navigation
  useEffect(() => {
    if (initialSlot) setSlot(initialSlot);
  }, [initialSlot]);

  if (!authUser) return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center px-4">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center shadow-xs">
        <Lock className="w-8 h-8 text-amber-600"/>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Akses Terbatas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Silakan masuk dengan akun Google Musyrif, Pamong, atau Koordinator untuk mengakses presensi ibadah.
        </p>
      </div>
      <button onClick={onLogin} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all text-xs">
        <LogIn className="w-4 h-4"/> Masuk Akun Google
      </button>
    </div>
  );

  const isMusyrifOnly = authUser.role === "musyrif";
  const isKoordGedung = authUser.role === "koordinator_gedung";
  // Koord. Gedung memiliki batasan sama dengan Musyrif: today only, time window, GPS required
  const isMusyrifOrKoorGedung = isMusyrifOnly || isKoordGedung;
  const fullAccess = hasFullAccess(authUser);
  const { isSedayuPamong, isPamongAnang, isPamongAbdan } = getPamongType(authUser);

  // Determine allowed asramas for this user using centralized utility
  const allowedAsramaList = useMemo(() => {
    if (fullAccess) return ASRAMAS;
    const pamongAsramas = getPamongAssignedAsramas(authUser);
    if (pamongAsramas.length > 0) return pamongAsramas;
    return authUser.asrama ? [authUser.asrama] : [ASRAMAS[0]];
  }, [fullAccess, authUser]);

  // If currently selected asrama is not in allowed list, reset to first allowed
  const activeAsrama = allowedAsramaList.includes(selAsrama) 
    ? selAsrama 
    : (allowedAsramaList[0] || authUser.asrama || ASRAMAS[0]);

  const allM = musyrifListAll && musyrifListAll.length > 0 ? musyrifListAll : MUSYRIF_LIST;
  
  // Musyrif only sees his own record in his dormitory or full building list where only he can edit himself
  const musyrifList = allM.filter(m => {
    if (m.asrama !== activeAsrama || !isFieldMusyrif(m)) return false;
    if (isPamongAnang && activeAsrama === "Asrama 8C") {
      return (m.kelas || "").startsWith("5");
    }
    if (isPamongAbdan && activeAsrama === "Asrama 8C") {
      return (m.kelas || "").startsWith("6");
    }
    return true;
  });
  const filtered = search ? musyrifList.filter(m => m.name.toLowerCase().includes(search.toLowerCase())) : musyrifList;

  // Find logged in musyrif ID
  const myMusyrifId = authUser.musyrifId || authUser.id;

  // Run GPS Check for Musyrif and Koordinator Gedung
  useEffect(() => {
    if (isMusyrifOrKoorGedung && activeAsrama) {
      setIsCheckingGps(true);
      checkAsramaGeofenceBrowser(activeAsrama).then(res => {
        setGpsResult(res);
        setIsCheckingGps(false);
      }).catch(() => {
        setIsCheckingGps(false);
      });
    }
  }, [isMusyrifOrKoorGedung, activeAsrama]);

  const getRecord = (mid: string) => records.find(r => r.musyrifId === mid && r.date === selDate);
  const now = new Date();
  const doneCount = musyrifList.filter(m => Boolean(getEffectiveAttendanceStatus(getRecord(m.id), slot, selDate, now))).length;

  const isSubuh = slot === "subuh";

  // Calculate dynamic presensi time window based on prayer time (15 min before)
  const presensiWindow = getPresensiTimeWindow(slot, parseISO(selDate));
  const openTimeRaw = presensiWindow.openTime;
  const openTimeDisplayStr = presensiWindow.openDisplay;
  const closeTimeRaw = presensiWindow.closeTime;
  const closeTimeDisplayStr = presensiWindow.closeDisplay;
  const prayerTimeStr = presensiWindow.prayerDisplay;
  const curDecimal = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isTodayDate = selDate === todayStr();
  const isFuture = selDate > todayStr();

  const isNotYetTime = isTodayDate && curDecimal < openTimeRaw;
  const isPastTimeMusyrif = isMusyrifOrKoorGedung && isTodayDate && curDecimal > closeTimeRaw;
  const isLocked = !fullAccess && (isFuture || isNotYetTime || (isMusyrifOrKoorGedung && (!isTodayDate || isPastTimeMusyrif)));

  const handleSelectSlot = (s: PrayerSlot) => {
    setSlot(s);
    onSwitchSlot?.(s);
  };

  const mark = (mid: string, p: PrayerSlot, s: AttendanceStatus, note?: string) => {
    if (isFuture && !fullAccess) {
      showToast?.("Tidak dapat mengisi presensi untuk tanggal di masa depan.", "error");
      return;
    }
    if (isNotYetTime && !fullAccess) {
      showToast?.(`Presensi ${p === "subuh" ? "Subuh" : "Maghrib"} baru dibuka mulai pukul ${openTimeDisplayStr} WIB.`, "error");
      return;
    }
    // Musyrif dan Koordinator Gedung memiliki batasan sama: today only, time window, GPS
    if (isMusyrifOrKoorGedung) {
      if (!isTodayDate) {
        showToast?.("Presensi hanya dapat diisi pada hari berjalan (hari ini).", "error");
        return;
      }
      if (curDecimal > closeTimeRaw) {
        showToast?.(`Waktu presensi ${p === "subuh" ? "Subuh" : "Maghrib"} telah ditutup pada pukul ${closeTimeDisplayStr} WIB.`, "error");
        return;
      }
      // Koord. Gedung boleh presensi musyrif di gedungnya (beda asrama), tapi harus GPS
      if (isMusyrifOnly && mid !== myMusyrifId && !matchesEmail(authUser.email, musyrifList.find(m => m.id === mid)?.email || "")) {
        showToast?.("Anda hanya memiliki wewenang untuk mengisi presensi atas nama Anda sendiri.", "error");
        return;
      }
      if (gpsResult && !gpsResult.isInRange) {
        const errorDetail = gpsResult.error ? ` (${gpsResult.error})` : ` (${gpsResult.distanceMeters}m dari radius valid)`;
        showToast?.(`Lokasi Anda belum terverifikasi di ${activeAsrama}${errorDetail}. Harap presensi di lingkungan asrama/masjid.`, "error");
        return;
      }
    }
    triggerHaptic(s === "hadir" ? "light" : "medium");
    onMark(mid, p, s, selDate, note);
    const mName = musyrifList.find(m => m.id === mid)?.name?.split(" ")[0] || "Musyrif";
    showToast?.(`${mName}: ${S[s].label} (${p === "subuh" ? "Subuh" : "Maghrib"})`);
  };
  const hijriSel = toHijri(parseISO(selDate));

  const prevDay = () => {
    // Musyrif dan Koord. Gedung tidak boleh navigasi mundur
    if (isMusyrifOrKoorGedung && selDate <= todayStr()) return;
    const d = parseISO(selDate); d.setDate(d.getDate() - 1);
    setSelDate(format(d, "yyyy-MM-dd"));
  };
  const nextDay = () => {
    if (selDate >= todayStr() && !fullAccess) return;
    const d = parseISO(selDate); d.setDate(d.getDate() + 1);
    setSelDate(format(d, "yyyy-MM-dd"));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
        {/* Top title & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Av name={authUser.name} src={authUser.picture} sz="md" />
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 transition-colors duration-150 ${
                isSubuh ? "bg-amber-500 text-white shadow-amber-500/25" : "bg-[#0C4E8C] text-white shadow-sky-950/25"
              }`}
            >
              {isSubuh ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                  {isSubuh ? "Presensi Subuh" : "Presensi Maghrib"}
                </h2>
                {isNotYetTime && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Terkunci
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {isSubuh ? "Ibadah Shubuh Berjamaah" : "Ibadah Maghrib Berjamaah"} · Waktu: <strong>{prayerTimeStr} WIB</strong>
              </p>
            </div>
          </div>

          {/* Segmented Slot Toggle with Instant Flawless Transition */}
          <div className="grid grid-cols-2 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner sm:w-56">
            <button
              type="button"
              onClick={() => handleSelectSlot("subuh")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                isSubuh 
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25 scale-[1.01]" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Sun className={`w-3.5 h-3.5 ${isSubuh ? "text-white" : "text-amber-500"}`} />
              <span>Subuh</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectSlot("maghrib")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                !isSubuh 
                  ? "bg-[#0C4E8C] text-white shadow-sm shadow-sky-950/25 scale-[1.01]" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Moon className={`w-3.5 h-3.5 ${!isSubuh ? "text-white" : "text-[#0C4E8C]"}`} />
              <span>Maghrib</span>
            </button>
          </div>
        </div>

        {/* Integrated Date Navigation Row */}
        <div className="flex items-center justify-between bg-slate-50/80 rounded-2xl p-1.5 border border-slate-100/80">
          <button 
            onClick={prevDay} 
            title="Hari sebelumnya"
            className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4"/>
          </button>

          <div className="flex-1 text-center px-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-bold text-xs text-slate-800 font-mono">
                {format(parseISO(selDate),"EEE, d MMM yyyy",{locale:id})}
              </span>
              {isToday(parseISO(selDate)) && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-md font-bold font-mono">
                  Hari ini
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {hijriSel.day} {hijriSel.monthName} {hijriSel.year} H
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <label className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer active:scale-95 transition-all relative" title="Pilih tanggal">
              <Calendar className="w-3.5 h-3.5"/>
              <input 
                type="date" 
                value={selDate} 
                onChange={e=>setSelDate(e.target.value)} 
                max={todayStr()} 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <button 
              onClick={nextDay} 
              disabled={selDate >= todayStr()} 
              title="Hari berikutnya"
              className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Asrama Filter Pills (Available for Koordinator and Sedayu Pamongs) */}
        {allowedAsramaList.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
            {allowedAsramaList.map(a => (
              <button
                key={a}
                onClick={() => setSelAsrama(a)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeAsrama === a
                    ? (isSubuh ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25" : "bg-[#0C81E4] text-white shadow-sm shadow-sky-600/25")
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geofence Alert Banner for Musyrif and Koordinator Gedung */}
      {isMusyrifOrKoorGedung && (
        <div className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-xs ${
          isCheckingGps ? "bg-slate-50 border-slate-200 text-slate-600" :
          gpsResult?.isInRange ? "bg-sky-50 border-sky-200 text-[#0C4E8C]" :
          "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              gpsResult?.isInRange ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {isCheckingGps ? "Memeriksa Lokasi GPS..." : gpsResult?.isInRange ? "Lokasi Valid (Di Lingkungan Asrama / Masjid)" : (gpsResult?.error ? "Sinyal GPS / Izin Terkendala" : "Di Luar Jangkauan Asrama")}
              </p>
              <p className="text-[11px] opacity-80">
                {gpsResult?.error ? gpsResult.error : (gpsResult?.matchedBuilding ? `Terdeteksi di area: ${gpsResult.matchedBuilding} (Jarak: ${gpsResult.distanceMeters}m)` : `Radius valid ${activeAsrama}. Jarak Anda: ${gpsResult?.distanceMeters ?? "?"}m`)}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsCheckingGps(true);
              checkAsramaGeofenceBrowser(activeAsrama).then(res => {
                setGpsResult(res);
                setIsCheckingGps(false);
              }).catch(() => setIsCheckingGps(false));
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-[11px] shrink-0"
          >
            Refresh GPS
          </button>
        </div>
      )}

      {isFuture && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0"/>
          <span>Tidak bisa mengisi presensi untuk tanggal yang akan datang.</span>
        </div>
      )}

      {isNotYetTime && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 sm:p-5 flex items-start gap-3 shadow-xs animate-in fade-in">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-rose-900 leading-tight">
                Presensi {isSubuh ? "Subuh" : "Maghrib"} Belum Dibuka
              </h4>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                Terkunci
              </span>
            </div>
            <p className="text-xs text-rose-700/90 mt-1 leading-relaxed">
              Jadwal ibadah {isSubuh ? "Subuh" : "Maghrib"} hari ini adalah pukul <strong>{prayerTimeStr} WIB</strong>. Form pengisian presensi akan otomatis dibuka mulai pukul <strong>{openTimeDisplayStr} WIB</strong> (15 menit sebelum sholat).
            </p>
          </div>
        </div>
      )}

      {/* 2. Compact Progress, Quick Action & Search Container */}
      {!isFuture && (
        <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700">
                  {isMusyrifOnly ? "Status Presensi Mandiri Anda" : "Progress Presensi"}
                </span>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {doneCount} / {musyrifList.length} Musyrif
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSubuh 
                      ? "bg-gradient-to-r from-amber-400 to-amber-500" 
                      : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  }`}
                  style={{ width: `${musyrifList.length > 0 ? (doneCount / musyrifList.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {!isMusyrifOnly && doneCount < musyrifList.length && !isLocked && (
              <button
                onClick={()=>setConfirmAll(slot)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                  isSubuh
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                }`}
              >
                <Zap className="w-3.5 h-3.5"/> Semua Hadir
              </button>
            )}

            {isNotYetTime && !isMusyrifOnly && (
              <span className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 flex items-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5"/> Terkunci
              </span>
            )}
          </div>

          {/* Integrated Search Bar inside container - Hide for Musyrif and Koord. Gedung */}
          {!isMusyrifOrKoorGedung && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input 
                value={search} 
                onChange={e=>setSearch(e.target.value)} 
                placeholder="Cari nama musyrif..." 
                className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-100/80 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white placeholder:text-slate-400 font-medium transition-all"
              />
              {search && (
                <button 
                  onClick={()=>setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all"
                  title="Hapus pencarian"
                >
                  <X className="w-3 h-3"/>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cards: Single prayer focused view */}
      <div className="flex flex-col gap-3">
        {filtered.map(m=>{
          const rec = getRecord(m.id);
          const cur = getEffectiveAttendanceStatus(rec, slot, selDate, now);
          const isAutoAlfa = cur === "alfa" && !rec?.[slot];
          const note = slot === "subuh" ? rec?.subuhNote : rec?.maghribNote;
          const isDone = Boolean(cur);
          const isMe = m.id === myMusyrifId || matchesEmail(authUser.email, m.email || "");
          const isCardDisabled = isLocked || (isMusyrifOnly && !isMe);

          return (
            <Card key={m.id} cls={`${isDone ? "ring-2 ring-emerald-200" : isNotYetTime ? "opacity-75 bg-slate-50/40" : ""} ${isMusyrifOnly && isMe ? "ring-2 ring-amber-400/80 bg-amber-50/10" : ""}`} ch={<div className="p-3.5 sm:p-4">
              <div className="flex items-center gap-3 mb-3">
                <Av name={m.name} src={m.photo}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-slate-800 truncate">{m.name}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold font-mono">{m.kelas}</span>
                    {isMusyrifOnly && isMe && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded-full">
                        Akun Anda
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">Pamong: {m.pamong || "-"}</p>
                </div>
                {isDone ? (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${
                    cur === "hadir" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                    cur === "sakit" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    cur === "izin" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                    "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {cur === "hadir" && <CheckCircle2 className="w-3.5 h-3.5"/>}
                    {isAutoAlfa ? "Alfa (Otomatis)" : S[cur].label}
                  </span>
                ) : isNotYetTime ? (
                  <span className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex-shrink-0 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3"/> Belum Waktunya
                  </span>
                ) : isPastTimeMusyrif ? (
                  <span className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex-shrink-0 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3"/> Waktu Habis
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 flex-shrink-0 font-medium">Belum Presensi</span>
                )}
              </div>

              {/* Note preview if any */}
              {note && (
                <div className="mb-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 italic truncate">"{note}"</span>
                  {!isLocked && (
                    <button onClick={()=>{setNoteFor({id:m.id,prayer:slot});setNoteText(note);}} className="text-emerald-600 font-semibold ml-2 flex-shrink-0 hover:underline">Edit</button>
                  )}
                </div>
              )}

              {/* Action Buttons: Hadir, Sakit, Izin, Alfa */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {(["hadir","sakit","izin","alfa"] as AttendanceStatus[]).map(s=>(
                  <button
                    key={s}
                    disabled={isCardDisabled}
                    onClick={()=>{
                      if (isCardDisabled) {
                        if (isMusyrifOnly && !isMe) {
                          showToast?.("Anda hanya dapat mengisi presensi mandiri atas nama Anda sendiri.", "error");
                        } else if (isNotYetTime) {
                          showToast?.(`Presensi ${isSubuh ? "Subuh" : "Maghrib"} baru dibuka mulai pukul ${openTimeDisplayStr} WIB.`, "error");
                        } else if (isPastTimeMusyrif) {
                          showToast?.(`Waktu presensi mandiri ${isSubuh ? "Subuh" : "Maghrib"} telah ditutup (${closeTimeDisplayStr} WIB).`, "error");
                        } else if (gpsResult && !gpsResult.isInRange) {
                          showToast?.(`Lokasi Anda di luar jangkauan (${gpsResult.distanceMeters}m). Harap presensi di masjid/asrama.`, "error");
                        }
                        return;
                      }
                      // Prevent duplicate clicks on same status
                      if(cur===s) return;
                      mark(m.id,slot,s);
                    }}
                    className={`min-h-[44px] py-2.5 px-1 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                      cur===s
                        ? `${S[s].btn} shadow-xs ring-2 ring-emerald-500/20 scale-[1.02]`
                        : isCardDisabled
                        ? "bg-slate-100/70 text-slate-400 border border-slate-200/50 cursor-not-allowed"
                        : "bg-slate-100/90 text-slate-700 hover:bg-slate-200 active:scale-95 border border-slate-200/50"
                    }`}
                  >
                    {isCardDisabled && cur !== s && <Lock className="w-3 h-3 text-slate-400 mr-0.5" />}
                    <span>{S[s].label}</span>
                  </button>
                ))}
              </div>

              {/* Bottom row: note link only */}
              {cur && !isFuture && (cur==="sakit"||cur==="izin"||cur==="alfa") && !note ? (
                <div className="mt-2">
                  <button onClick={()=>{setNoteFor({id:m.id,prayer:slot});setNoteText("");}} className="text-xs text-emerald-700 font-semibold hover:underline">+ Tambah Catatan</button>
                </div>
              ) : <span/>}
            </div>}/>
          );
        })}
      </div>

      {/* Note modal */}
      {noteFor&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" onClick={()=>setNoteFor(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-1">Catatan Keterangan</h3>
            <p className="text-xs text-slate-400 mb-4">{musyrifList.find(m=>m.id===noteFor.id)?.name || "Musyrif"} · Presensi {noteFor.prayer === "subuh" ? "Subuh" : "Maghrib"}</p>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Contoh: Sakit demam, izin kepulangan, tugas luar, dll." rows={3} className="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"/>
            <div className="flex gap-2 mt-4">
              {getRecord(noteFor.id)?.[noteFor.prayer] && onResetMark && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await appConfirm(
                      "Hapus tanda kehadiran & catatan musyrif ini untuk waktu shalat terpilih?",
                      "Hapus Absensi",
                      { type: "danger", confirmText: "Ya, Hapus", cancelText: "Batal" }
                    );
                    if (ok) {
                      onResetMark(noteFor.id, noteFor.prayer, selDate);
                      showToast?.("Status presensi berhasil di-reset / dihapus", "info");
                      setNoteFor(null);
                      setNoteText("");
                    }
                  }}
                  className="py-2.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-all"
                >
                  Hapus Absensi
                </button>
              )}
              <button onClick={()=>setNoteFor(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-semibold">Batal</button>
              <button onClick={()=>{const r=getRecord(noteFor.id);if(r?.[noteFor.prayer])mark(noteFor.id,noteFor.prayer,r[noteFor.prayer]!,noteText);showToast?.("Catatan keterangan disimpan");setNoteFor(null);setNoteText("");}} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm all modal */}
      {confirmAll&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" onClick={()=>setConfirmAll(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-2xl ${confirmAll === "subuh" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"} flex items-center justify-center mb-4`}>
              <Zap className="w-6 h-6"/>
            </div>
            <h3 className="font-bold text-slate-800">Tandai Semua Hadir?</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">Semua musyrif <b>{activeAsrama}</b> ditandai <b>Hadir</b> untuk <b>Presensi {confirmAll === "subuh" ? "Subuh" : "Maghrib"}</b> · {format(parseISO(selDate),"d MMM yyyy",{locale:id})}</p>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmAll(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-semibold">Batal</button>
              <button onClick={()=>{onMarkAll(activeAsrama,confirmAll,"hadir",selDate);showToast?.(`Semua musyrif ${activeAsrama} ditandai Hadir (${confirmAll === "subuh" ? "Subuh" : "Maghrib"})`);setConfirmAll(null);}} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-all ${confirmAll === "subuh" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>Ya, Tandai Hadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: REKAP
// ─────────────────────────────────────────────────────────────────────────────
function PageRekap({ 
  records, 
  authUser, 
  onSelectMusyrif, 
  onGoTo,
  musyrifListAll
}: { 
  records: AttendanceRecord[]; 
  authUser?: AuthUser | null; 
  onSelectMusyrif?: (id: string) => void; 
  onGoTo?: (p: Page) => void;
  musyrifListAll?: Musyrif[];
}) {
  const allM = musyrifListAll && musyrifListAll.length > 0 ? musyrifListAll : MUSYRIF_LIST;
  const [viewMonth, setViewMonth] = useState(new Date());
  const [filterAsrama, setFilterAsrama] = useState("Semua");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pct"|"name">("pct");
  const [detail, setDetail] = useState<Musyrif|null>(null);
  const [chartSlotFilter, setChartSlotFilter] = useState<"all" | "subuh" | "maghrib">("all");
  const mk = format(viewMonth,"yyyy-MM");

  const days = useMemo(()=>eachDayOfInterval({start:startOfMonth(viewMonth),end:endOfMonth(viewMonth)})
    .filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d)),[viewMonth]);
  const mRecs = records.filter(r=>r.date.startsWith(mk));
  const fMusyrif = useMemo(()=>{
    let l = (filterAsrama==="Semua" ? allM : allM.filter(m=>m.asrama===filterAsrama)).filter(isFieldMusyrif);
    if(search) l=l.filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
    return l;
  },[allM,filterAsrama,search]);

  const now = new Date();

  const rate = (p: PrayerSlot) => {
    if(!fMusyrif.length||!days.length) return 0;
    let totalHadir = 0;
    days.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      fMusyrif.forEach(m => {
        const r = records.find(x => x.musyrifId === m.id && x.date === ds);
        if (getEffectiveAttendanceStatus(r, p, ds, now) === "hadir") totalHadir++;
      });
    });
    return Math.round(totalHadir / (fMusyrif.length * days.length) * 100);
  };

  const ranked = useMemo(()=>fMusyrif.map(m=>{
    let sh = 0, ss = 0, si = 0, sa = 0;
    let mh = 0, ms = 0, mi = 0, ma = 0;
    days.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      const r = mRecs.find(x => x.musyrifId === m.id && x.date === ds);
      const subSt = getEffectiveAttendanceStatus(r, "subuh", ds, now);
      const magSt = getEffectiveAttendanceStatus(r, "maghrib", ds, now);
      if (subSt === "hadir") sh++;
      else if (subSt === "sakit") ss++;
      else if (subSt === "izin") si++;
      else if (subSt === "alfa") sa++;

      if (magSt === "hadir") mh++;
      else if (magSt === "sakit") ms++;
      else if (magSt === "izin") mi++;
      else if (magSt === "alfa") ma++;
    });
    const pct=days.length?Math.round((sh+mh)/(days.length*2)*100):0;
    return {...m,sh,ss,si,sa,mh,ms,mi,ma,pct};
  }).sort((a,b)=>sortBy==="pct"?b.pct-a.pct:a.name.localeCompare(b.name)),[fMusyrif,mRecs,days,sortBy]);

  const weeklyData = Array.from({length:Math.max(1,Math.ceil(days.length/7))},(_,wi)=>{
    const wDays=days.slice(wi*7,wi*7+7);
    let subuhH = 0, maghribH = 0;
    wDays.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      fMusyrif.forEach(m => {
        const r = mRecs.find(x => x.musyrifId === m.id && x.date === ds);
        if (getEffectiveAttendanceStatus(r, "subuh", ds, now) === "hadir") subuhH++;
        if (getEffectiveAttendanceStatus(r, "maghrib", ds, now) === "hadir") maghribH++;
      });
    });
    const den=wDays.length*fMusyrif.length||1;
    return {week:`Mgg ${wi+1}`,subuh:Math.round(subuhH/den*100),maghrib:Math.round(maghribH/den*100)};
  });

  const detailM = detail ? ranked.find(r=>r.id===detail.id) : null;
  const detailRecs = detail ? mRecs.filter(r=>r.musyrifId===detail.id) : [];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* 1. Unified Master Header Card like Halaman Presensi & Riwayat */}
      <div className="bg-white rounded-3xl p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top title & Cetak PDF action button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-[#0C81E4] text-white shadow-sky-600/25">
              <TrendingUp className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                Rekap Presensi
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {format(viewMonth, "MMMM yyyy", {locale: id})} · {fMusyrif.length} Musyrif Terdata
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={()=>exportPDF(records,viewMonth,filterAsrama,musyrifListAll)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 flex-shrink-0 text-[#0C4E8C] ring-sky-200 bg-sky-50 hover:bg-sky-100/80"
          >
            <Printer className="w-3.5 h-3.5 text-[#0C81E4]"/>
            <span>Cetak PDF</span>
          </button>
        </div>

        {/* Integrated Month Navigation Row */}
        <div className="flex items-center justify-between bg-slate-50/80 rounded-2xl p-1.5 border border-slate-100/80">
          <button
            type="button"
            onClick={()=>setViewMonth(subMonths(viewMonth,1))}
            title="Bulan sebelumnya"
            className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono leading-tight">
              {format(viewMonth, "MMMM yyyy", {locale: id})}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {days.length} Hari Aktif Bulan Ini
            </p>
          </div>
          <button
            type="button"
            onClick={()=>setViewMonth(addMonths(viewMonth,1))}
            title="Bulan berikutnya"
            className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4"/>
          </button>
        </div>

        {/* Integrated Rate Summary Cards — Subuh & Maghrib */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-3 border border-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-amber-700">
                <Sun className="w-3.5 h-3.5 text-amber-500"/>
                <span className="text-xs font-bold">Subuh</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded font-mono">
                Pagi
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{rate("subuh")}%</p>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-700" style={{width:`${rate("subuh")}%`}}/>
            </div>
          </div>

          <div className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-3 border border-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-sky-800">
                <Moon className="w-3.5 h-3.5 text-[#0C4E8C]"/>
                <span className="text-xs font-bold">Maghrib</span>
              </div>
              <span className="text-[10px] font-bold text-[#0C4E8C] bg-sky-100/70 px-1.5 py-0.2 rounded font-mono">
                Petang
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{rate("maghrib")}%</p>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#0C4E8C] h-full rounded-full transition-all duration-700" style={{width:`${rate("maghrib")}%`}}/>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Weekly Trend Chart with Interactive Slot Filter */}
      <Card ch={<div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <p className="font-bold text-sm text-slate-800">Tren Kehadiran Mingguan</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Persentase per pekan {filterAsrama !== "Semua" ? `· ${filterAsrama}` : ""}</p>
          </div>
          
          {/* Interactive Slot Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl self-start sm:self-auto">
            {[
              { id: "all", label: "Semua" },
              { id: "subuh", label: "Subuh" },
              { id: "maghrib", label: "Maghrib" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartSlotFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  chartSlotFilter === tab.id
                    ? "bg-white text-[#0C4E8C] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData} barGap={3} barCategoryGap="25%">
            <XAxis dataKey="week" tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"#fff",border:"none",boxShadow:"0 8px 24px rgba(0,0,0,.08)",borderRadius:14,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}} formatter={(v:number,n:string)=>[`${v}%`,n==="subuh"?"Subuh":"Maghrib"]}/>
            {(chartSlotFilter === "all" || chartSlotFilter === "subuh") && (
              <Bar dataKey="subuh" name="subuh" fill="#f59e0b" radius={[4,4,0,0]}/>
            )}
            {(chartSlotFilter === "all" || chartSlotFilter === "maghrib") && (
              <Bar dataKey="maghrib" name="maghrib" fill="#0C4E8C" radius={[4,4,0,0]}/>
            )}
          </BarChart>
        </ResponsiveContainer>

        <div className="flex gap-4 mt-2 justify-center">
          {(chartSlotFilter === "all" || chartSlotFilter === "subuh") && (
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500"/><span className="text-[10px] text-slate-500 font-medium">Subuh</span></div>
          )}
          {(chartSlotFilter === "all" || chartSlotFilter === "maghrib") && (
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#0C4E8C]"/><span className="text-[10px] text-slate-500 font-medium">Maghrib</span></div>
          )}
        </div>
      </div>}/>

      {/* 5. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Cari nama musyrif..." 
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white rounded-2xl ring-1 ring-slate-200/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 font-medium shadow-2xs"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterAsrama} 
            onChange={e=>setFilterAsrama(e.target.value)} 
            className="px-3 py-2.5 text-xs bg-white rounded-2xl ring-1 ring-slate-200/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-700 font-medium shadow-2xs cursor-pointer"
          >
            {["Semua",...ASRAMAS].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button 
            type="button"
            onClick={()=>setSortBy(s=>s==="pct"?"name":"pct")} 
            className="px-3 py-2.5 text-xs bg-white rounded-2xl ring-1 ring-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="Ubah Urutan"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500"/>
            <span>{sortBy==="pct"?"% Kehadiran":"Nama A-Z"}</span>
          </button>
        </div>
      </div>

      {/* 6. Musyrif Ranking Table */}
      <Card ch={<div>
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <p className="font-bold text-sm text-slate-800">Daftar Kehadiran Musyrif</p>
          <span className="text-[11px] text-slate-400 font-mono">{ranked.length} musyrif</span>
        </div>
        <div className="divide-y divide-slate-50">
          {ranked.map((m,i)=>(
            <button key={m.id} type="button" onClick={()=>setDetail(m)} className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/80 transition-colors text-left group">
              <span className="text-xs font-bold text-slate-400 w-5 text-center font-mono">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`}
              </span>
              <Av name={m.name} src={m.photo} sz="sm"/>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{m.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{m.asrama} · {m.kelas}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <span className="text-emerald-600 font-bold">{m.sh+m.mh}H</span>
                  <span>/</span>
                  <span className="text-amber-600 font-bold">{m.ss+m.ms+m.si+m.mi}I</span>
                  <span>/</span>
                  <span className="text-rose-600 font-bold">{m.sa+m.ma}A</span>
                </div>
                <span className={`text-xs sm:text-sm font-bold w-10 text-right font-mono ${m.pct>=80?"text-emerald-600":m.pct>=60?"text-amber-600":"text-rose-600"}`}>{m.pct}%</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"/>
              </div>
            </button>
          ))}
        </div>
      </div>}/>

      {/* 7. Today status */}
      <Card ch={<div>
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <p className="font-bold text-sm text-slate-800">Status Hari Ini</p>
          <span className="text-[11px] text-slate-400 font-mono">{format(new Date(),"d MMM yyyy")}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {fMusyrif.map(m=>{
            const rec=records.find(r=>r.musyrifId===m.id&&r.date===todayStr());
            return (
              <button key={m.id} type="button" onClick={()=>setDetail(m)} className="w-full px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors text-left group">
                <Av name={m.name} src={m.photo} sz="sm"/>
                <span className="flex-1 text-xs sm:text-sm font-medium text-slate-700 truncate group-hover:text-emerald-700 transition-colors">{m.name}</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5"><Chip s={rec?.subuh}/><Chip s={rec?.maghrib}/></div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"/>
                </div>
              </button>
            );
          })}
        </div>
      </div>}/>

      {/* Detail modal with Cross-Navigation to Riwayat */}
      {detail && detailM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-100/80 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100">
              <Av name={detailM.name} sz="lg"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-800">{detailM.name}</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">{detailM.kelas}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Pamong: {detailM.pamong || "-"}</p>
              </div>
              <div className="text-right"><p className="text-2xl font-bold text-slate-800 font-mono">{detailM.pct}%</p><p className="text-[10px] text-slate-400">kehadiran</p></div>
            </div>
            {(detailM.phone || detailM.email) && (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 border-b border-slate-100">
                {detailM.phone && (
                  <a href={`https://wa.me/${detailM.phone}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-sm">
                    <MessageCircle className="w-3.5 h-3.5"/> Hubungi WhatsApp
                  </a>
                )}
                {detailM.email && (
                  <a href={`mailto:${detailM.email}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-all">
                    <Mail className="w-3.5 h-3.5"/> Email
                  </a>
                )}
              </div>
            )}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
              {/* Shalat Subuh Breakdown */}
              <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-200/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold text-amber-900 font-mono uppercase tracking-wider">Shalat Subuh</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-emerald-700">{detailM.sh}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Hadir</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-amber-700">{detailM.ss}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Sakit</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-blue-700">{detailM.si}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Izin</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-rose-700">{detailM.sa}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Alfa</p>
                  </div>
                </div>
              </div>

              {/* Shalat Maghrib Breakdown */}
              <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-200/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <Moon className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-900 font-mono uppercase tracking-wider">Shalat Maghrib</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-emerald-700">{detailM.mh}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Hadir</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-amber-700">{detailM.ms}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Sakit</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-blue-700">{detailM.mi}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Izin</p>
                  </div>
                  <div className="bg-white rounded-xl p-2 text-center border border-slate-100 shadow-2xs">
                    <p className="text-sm font-extrabold font-mono text-rose-700">{detailM.ma}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Alfa</p>
                  </div>
                </div>
              </div>
              <Label ch="10 Hari Terakhir"/>
              <div className="flex flex-col gap-1">
                {detailRecs.slice(-10).reverse().map(r=>(
                  <div key={r.date} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 font-mono">{format(parseISO(r.date),"d MMM",{locale:id})}</span>
                    <div className="flex gap-1.5"><Chip s={r.subuh}/><Chip s={r.maghrib}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 pt-2 flex items-center gap-2">
              {authUser && onGoTo && (
                <button 
                  type="button"
                  onClick={()=>{
                    onSelectMusyrif?.(detail.id);
                    setDetail(null);
                    onGoTo("riwayat");
                  }} 
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                >
                  Lihat di Riwayat
                </button>
              )}
              <button 
                type="button" 
                onClick={()=>setDetail(null)} 
                className={`${authUser && onGoTo ? "py-2.5 px-5" : "flex-1 py-2.5"} bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: RIWAYAT
// ─────────────────────────────────────────────────────────────────────────────
function PageRiwayat({
  records,
  logbookData = {},
  mutabaahData = {},
  izinList = [],
  kegiatanRecords = [],
  agendaRapatList = [],
  pengasuhanList = [],
  authUser,
  onLogin,
  initialMusyrifId,
  onSelectMusyrifId,
  onMark,
  onSaveLogbook,
  showToast,
  musyrifListAll
}: {
  records: AttendanceRecord[];
  logbookData?: LogbookStorage;
  mutabaahData?: MutabaahStorage;
  izinList?: IzinRequest[];
  kegiatanRecords?: KegiatanRecord[];
  agendaRapatList?: AgendaRapatRecord[];
  pengasuhanList?: PengasuhanKhususRecord[];
  authUser: AuthUser | null;
  onLogin: () => void;
  initialMusyrifId?: string | null;
  onSelectMusyrifId?: (id: string) => void;
  onMark?: MarkFn;
  onSaveLogbook?: (musyrifId: string, date: string, entry: JurnalLogbookEntry) => void;
  showToast?: (msg: string, type?: "success" | "info" | "error") => void;
  musyrifListAll?: Musyrif[];
}) {
  const allM = useMemo(() => {
    const list = musyrifListAll && musyrifListAll.length > 0 ? musyrifListAll : MUSYRIF_LIST;
    return list.filter(isFieldMusyrif);
  }, [musyrifListAll]);
  const isPersonalMusyrif = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";
  const isSupervisoryRole = authUser?.role === "pamong" || authUser?.role === "admin" || authUser?.role === "koordinator_musyrif";

  const defaultRiwayatMusyrifId = initialMusyrifId 
    ? initialMusyrifId 
    : isSupervisoryRole 
      ? "" 
      : (authUser?.musyrifId || authUser?.id || allM[0]?.id || "m1");

  const [selId, setSelId] = useState(defaultRiwayatMusyrifId);
  const [activeTab, setActiveTab] = useState<"sholat" | "logbook" | "pengasuhan" | "mutabaah" | "izin" | "kegiatan">("sholat");
  const [selectedDay, setSelectedDay] = useState<{ date: Date; record?: AttendanceRecord } | null>(null);
  const [calendarSlotFilter, setCalendarSlotFilter] = useState<"all" | "subuh" | "maghrib">("all");
  const [showMusyrifPicker, setShowMusyrifPicker] = useState(false);
  const [pickerAsrama, setPickerAsrama] = useState<string>("all");
  const [pickerSearch, setPickerSearch] = useState("");
  const [editingSlot, setEditingSlot] = useState<"subuh" | "maghrib" | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [expandedLogbookDate, setExpandedLogbookDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [previewPhotoModal, setPreviewPhotoModal] = useState<any | null>(null);
  const [photoFilterMonth, setPhotoFilterMonth] = useState<"current" | "all">("all");

  const canDeletePhoto = Boolean(
    authUser && (
      authUser.role === "koordinator_musyrif" ||
      authUser.role === "admin" ||
      authUser.role === "wadir4" ||
      authUser.role === "kaur_kis" ||
      authUser.role === "pamong"
    )
  );

  useEffect(() => {
    if (initialMusyrifId) {
      setSelId(initialMusyrifId);
    }
  }, [initialMusyrifId]);

  if (!authUser) return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center"><BookOpen className="w-9 h-9 text-teal-500"/></div>
      <div><h2 className="text-xl font-bold text-slate-800">Riwayat Presensi</h2><p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">Masuk untuk melihat riwayat lengkap per musyrif.</p></div>
      <button onClick={onLogin} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all"><LogIn className="w-4 h-4"/>Masuk</button>
    </div>
  );

  const isPamongOrKoord = authUser.role === "pamong" || authUser.role === "koordinator_musyrif" || authUser.role === "koordinator_gedung";
  const { isSedayuPamong, isPamongAnang, isPamongAbdan } = getPamongType(authUser);
  const pamongAssignedAsramas = getPamongAssignedAsramas(authUser);

  const allowed = isPersonalMusyrif
    ? allM.filter(m => m.id === authUser.musyrifId || m.id === authUser.id || (m.email && authUser.email && m.email.toLowerCase() === authUser.email.toLowerCase()))
    : hasFullAccess(authUser)
      ? allM
      : pamongAssignedAsramas.length > 0
        ? allM.filter(m => pamongAssignedAsramas.includes(m.asrama))
        : allM.filter(m => m.asrama === authUser.asrama);

  const musyrif = isPersonalMusyrif
    ? (allowed[0] ?? allM.find(m => m.id === authUser.musyrifId || m.id === authUser.id) ?? allM[0])
    : (allowed.find(m=>m.id===selId) || null);

  const mk = format(viewMonth,"yyyy-MM");
  const mRecs = musyrif ? records.filter(r=>r.musyrifId===musyrif.id&&r.date.startsWith(mk)) : [];
  const allRecs = musyrif ? records.filter(r=>r.musyrifId===musyrif.id) : [];
  const days = eachDayOfInterval({start:startOfMonth(viewMonth),end:endOfMonth(viewMonth)});
  const pastDays = days.filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d));
  const adj = (startOfMonth(viewMonth).getDay()||7)-1;
  const getR = (d: Date) => mRecs.find(r=>r.date===format(d,"yyyy-MM-dd"));
  const streak = useMemo(()=>musyrif ? computeStreak(musyrif.id,records) : 0,[musyrif,records]);
  const now = new Date();

  const getEffectiveSubuh = (ds: string) => {
    const r = mRecs.find(x => x.date === ds);
    return getEffectiveAttendanceStatus(r, "subuh", ds, now);
  };
  const getEffectiveMaghrib = (ds: string) => {
    const r = mRecs.find(x => x.date === ds);
    return getEffectiveAttendanceStatus(r, "maghrib", ds, now);
  };

  let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlfa = 0;
  pastDays.forEach(d => {
    const ds = format(d, "yyyy-MM-dd");
    const sSub = getEffectiveSubuh(ds);
    const sMag = getEffectiveMaghrib(ds);
    if (sSub === "hadir") totalHadir++;
    else if (sSub === "sakit") totalSakit++;
    else if (sSub === "izin") totalIzin++;
    else if (sSub === "alfa") totalAlfa++;

    if (sMag === "hadir") totalHadir++;
    else if (sMag === "sakit") totalSakit++;
    else if (sMag === "izin") totalIzin++;
    else if (sMag === "alfa") totalAlfa++;
  });

  const pct = pastDays.length ? Math.round(totalHadir / (pastDays.length * 2) * 100) : 0;

  const trendData = [-2,-1,0].map(off=>{
    const m2=addMonths(viewMonth,off), mk2=format(m2,"yyyy-MM");
    const rs=allRecs.filter(r=>r.date.startsWith(mk2));
    const md=eachDayOfInterval({start:startOfMonth(m2),end:endOfMonth(m2)}).filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d));
    let subuhCount = 0, maghribCount = 0;
    md.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      const r = rs.find(x => x.date === ds);
      if (getEffectiveAttendanceStatus(r, "subuh", ds, now) === "hadir") subuhCount++;
      if (getEffectiveAttendanceStatus(r, "maghrib", ds, now) === "hadir") maghribCount++;
    });
    return {
      month: format(m2,"MMM",{locale:id}),
      subuh: md.length ? Math.round(subuhCount / md.length * 100) : 0,
      maghrib: md.length ? Math.round(maghribCount / md.length * 100) : 0
    };
  });

  const nonHadirRecs = useMemo(() => {
    const list: { date: string; subuh?: AttendanceStatus; maghrib?: AttendanceStatus; subuhNote?: string; maghribNote?: string }[] = [];
    pastDays.forEach(d => {
      const ds = format(d, "yyyy-MM-dd");
      const r = mRecs.find(x => x.date === ds);
      const sSub = getEffectiveAttendanceStatus(r, "subuh", ds, now);
      const sMag = getEffectiveAttendanceStatus(r, "maghrib", ds, now);
      if ((sSub && sSub !== "hadir") || (sMag && sMag !== "hadir")) {
        list.push({
          date: ds,
          subuh: sSub,
          maghrib: sMag,
          subuhNote: r?.subuhNote,
          maghribNote: r?.maghribNote
        });
      }
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [pastDays, mRecs, now]);

  // Logbook data for current musyrif
  const musyrifLogbooks = useMemo(() => {
    return musyrif ? (logbookData[musyrif.id] || {}) : {};
  }, [logbookData, musyrif]);

  const logbookDatesThisMonth = useMemo(() => {
    return Object.keys(musyrifLogbooks).filter(d => d.startsWith(mk)).sort((a, b) => b.localeCompare(a));
  }, [musyrifLogbooks, mk]);

  const logbookMonthStats = useMemo(() => {
    let totalTasksDone = 0;
    let totalSteps = 0;
    let totalGpsVerified = 0;
    const taskKeys = ["tahajjud","bakdaSubuh","cekSakit","sisirSekolah","jagaGerbang","oprakJumat","kerjaBakti","oprakAshar","oprakMandi","sisirMaghrib","bakdaMaghrib","belajarMalam","cekTidur"] as const;

    logbookDatesThisMonth.forEach(d => {
      const dayEntry = musyrifLogbooks[d];
      if (dayEntry) {
        taskKeys.forEach(k => {
          const t = dayEntry[k];
          if (t && t.done) {
            totalTasksDone++;
            if (t.gpsVerified) totalGpsVerified++;
            if (t.stepsCount) totalSteps += t.stepsCount;
          }
        });
      }
    });

    const daysFilled = logbookDatesThisMonth.length;
    const avgPerDay = daysFilled > 0 ? (totalTasksDone / daysFilled).toFixed(1) : "0";

    return { totalTasksDone, totalSteps, totalGpsVerified, daysFilled, avgPerDay };
  }, [musyrifLogbooks, logbookDatesThisMonth]);

  // All uploaded photos for this musyrif across all dates
  const musyrifUploadedPhotos = useMemo<any[]>(() => {
    if (!musyrif) return [];
    const photos: any[] = [];
    const userLogbooks = logbookData[musyrif.id] || {};

    Object.entries(userLogbooks).forEach(([dateStr, dayEntry]) => {
      if (!dayEntry || typeof dayEntry !== "object") return;
      Object.entries(dayEntry).forEach(([key, taskVal]) => {
        if (key === "generalNotes" || !taskVal || typeof taskVal !== "object") return;
        const tItem = taskVal as any;
        if (tItem.photoUrl && typeof tItem.photoUrl === "string" && tItem.photoUrl.trim() !== "") {
          photos.push({
            id: `${musyrif.id}_${dateStr}_${key}`,
            musyrifId: musyrif.id,
            musyrifName: musyrif.name,
            asrama: musyrif.asrama,
            date: dateStr,
            taskKey: key,
            taskTitle: getTaskDisplayTitle ? getTaskDisplayTitle(key) : key,
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

    return photos.sort((a, b) => {
      const timeA = a.photoTakenAt ? new Date(a.photoTakenAt).getTime() : new Date(`${a.date}T${a.completedAt || "12:00"}:00`).getTime();
      const timeB = b.photoTakenAt ? new Date(b.photoTakenAt).getTime() : new Date(`${b.date}T${b.completedAt || "12:00"}:00`).getTime();
      return timeB - timeA;
    });
  }, [logbookData, musyrif]);

  const displayMusyrifPhotos = useMemo(() => {
    if (photoFilterMonth === "current") {
      return musyrifUploadedPhotos.filter(p => p.date.startsWith(mk));
    }
    return musyrifUploadedPhotos;
  }, [musyrifUploadedPhotos, photoFilterMonth, mk]);

  // Handler for Koordinator Musyrif / Admin to delete a photo
  const handleDeleteMusyrifPhoto = async (photoItem: any) => {
    if (!canDeletePhoto) {
      appAlert("Hanya Koordinator Musyrif atau Pamong/Admin yang berwenang menghapus foto dokumentasi ini.", "Akses Ditolak", "warning");
      return;
    }

    const ok = await appConfirm(
      `Apakah Anda yakin ingin menghapus foto dokumentasi "${photoItem.taskTitle}" tanggal ${format(parseISO(photoItem.date), "d MMMM yyyy", { locale: id })} oleh ${photoItem.musyrifName}? Foto akan dihapus secara permanen dari logbook dan server cloud.`,
      "Hapus Foto Logbook",
      "danger"
    );

    if (!ok) return;

    if (onSaveLogbook) {
      const dayEntry = logbookData[photoItem.musyrifId]?.[photoItem.date] || {};
      const currentTask = (dayEntry as any)?.[photoItem.taskKey] || {};
      
      const updatedEntry: JurnalLogbookEntry = {
        ...dayEntry,
        [photoItem.taskKey]: {
          ...currentTask,
          photoUrl: "", // Explicit signal to remove photo
          photoTakenAt: undefined,
          photoSource: undefined,
          photoWatermark: undefined
        }
      };

      onSaveLogbook(photoItem.musyrifId, photoItem.date, updatedEntry);

      try {
        const { deletePhotosBatch } = await import("./utils/photoCacheService");
        const cacheKeys = [
          `logbook_${photoItem.musyrifId}_${photoItem.date}_${photoItem.taskKey}_photoUrl`,
          `photo_logbook_${photoItem.musyrifId}_${photoItem.date}_${photoItem.taskKey}_photoUrl`,
          `photo_${photoItem.musyrifId}_${photoItem.date}_${photoItem.taskKey}_photoUrl`,
          `photo_logbook_${photoItem.musyrifId}_${photoItem.date}_${photoItem.taskKey}`,
          `logbook_${photoItem.musyrifId}_${photoItem.date}_${photoItem.taskKey}`,
          photoItem.id
        ];
        await deletePhotosBatch(cacheKeys);
      } catch (_) {}

      if (previewPhotoModal?.id === photoItem.id) {
        setPreviewPhotoModal(null);
      }

      showToast?.("Foto dokumentasi logbook berhasil dihapus!", "success");
    }
  };

  // Mutabaah data for current musyrif
  const musyrifMutabaah = useMemo(() => {
    return musyrif ? (mutabaahData[musyrif.id] || {}) : {};
  }, [mutabaahData, musyrif]);

  const mutabaahDatesThisMonth = useMemo(() => {
    return Object.keys(musyrifMutabaah).filter(d => d.startsWith(mk)).sort((a, b) => b.localeCompare(a));
  }, [musyrifMutabaah, mk]);

  const mutabaahMonthStats = useMemo(() => {
    let totalPoints = 0;
    let totalTilawah = 0;
    let totalTahajjud = 0;
    let totalPuasa = 0;

    mutabaahDatesThisMonth.forEach(d => {
      const m = musyrifMutabaah[d];
      if (m) {
        if (m.tahajjud) { totalPoints += 5; totalTahajjud++; }
        if (m.dhuha) totalPoints += 3;
        if (m.rawatib) totalPoints += 3;
        if (m.tilawahPages > 0) { totalTilawah += m.tilawahPages; totalPoints += Math.min(m.tilawahPages, 10); }
        if (m.dzikirPagi) totalPoints += 2;
        if (m.dzikirPetang) totalPoints += 2;
        if (m.puasaSunnah) { totalPoints += 10; totalPuasa++; }
        if (m.muthalaah) totalPoints += 5;
      }
    });

    return { totalPoints, totalTilawah, totalTahajjud, totalPuasa, daysFilled: mutabaahDatesThisMonth.length };
  }, [musyrifMutabaah, mutabaahDatesThisMonth]);

  // Pengasuhan Khusus data for current musyrif
  const musyrifPengasuhanList = useMemo(() => {
    return (pengasuhanList || [])
      .filter(p => musyrif && p.musyrifId === musyrif.id)
      .sort((a, b) => (b.date + b.waktu).localeCompare(a.date + a.waktu));
  }, [pengasuhanList, musyrif]);

  const pengasuhanStats = useMemo(() => {
    let totalPoin = 0;
    let antarPku = 0;
    let binaSantri = 0;
    let antarLain = 0;

    musyrifPengasuhanList.forEach(p => {
      totalPoin += (p.poin || (p.kategori === "antar_pku_rs" ? 10 : 5));
      if (p.kategori === "antar_pku_rs") antarPku++;
      else if (p.kategori === "bina_santri") binaSantri++;
      else antarLain++;
    });

    return { total: musyrifPengasuhanList.length, totalPoin, antarPku, binaSantri, antarLain };
  }, [musyrifPengasuhanList]);

  // Izin data for current musyrif
  const musyrifIzinList = useMemo(() => {
    return (izinList || [])
      .filter(i => musyrif && (i.musyrifId === musyrif.id || (i.musyrifName && i.musyrifName.toLowerCase() === musyrif.name.toLowerCase())))
      .sort((a, b) => (b.createdAt || b.startDate).localeCompare(a.createdAt || a.startDate));
  }, [izinList, musyrif]);

  const izinStats = useMemo(() => {
    const approved = musyrifIzinList.filter(i => i.status === "approved").length;
    const pending = musyrifIzinList.filter(i => i.status === "pending").length;
    const rejected = musyrifIzinList.filter(i => i.status === "rejected").length;
    return { total: musyrifIzinList.length, approved, pending, rejected };
  }, [musyrifIzinList]);

  // Kegiatan / Rapat data for current musyrif
  // Merge: kegiatanRecords (manual) + agenda rapat from logbookData (dynamic logbook agenda)
  const musyrifKegiatanList = useMemo(() => {
    const merged: any[] = [];

    // 1. Regular kegiatan records
    (kegiatanRecords || []).forEach(k => {
      if (musyrif && ((k.attendees && musyrif.id in k.attendees) || k.asrama === musyrif.asrama)) {
        merged.push({ ...k, _source: "kegiatan" });
      }
    });

    // 2. Agenda rapat from agendaRapatList + logbookData
    const seenMeetingKeys = new Set<string>();
    (agendaRapatList || []).forEach(ag => {
      if (musyrif && Array.isArray(ag.invitedMusyrifIds) && ag.invitedMusyrifIds.includes(musyrif.id)) {
        const cleanId = ag.id.replace(/^agenda_/, "");
        const dayLogbook = logbookData?.[musyrif.id]?.[ag.date];
        const taskEntry = 
          dayLogbook?.[`agenda_${ag.id}`] ||
          dayLogbook?.[ag.id] ||
          dayLogbook?.[`agenda_${cleanId}`] ||
          dayLogbook?.[cleanId];

        const isDone = Boolean(
          taskEntry?.done === true || 
          taskEntry?.done === "TRUE" || 
          taskEntry?.done === "true" || 
          taskEntry?.done === 1 || 
          taskEntry?.photoUrl ||
          taskEntry?.completedAt
        );

        seenMeetingKeys.add(`agenda_${ag.id}`);
        seenMeetingKeys.add(ag.id);
        seenMeetingKeys.add(`agenda_${cleanId}`);
        seenMeetingKeys.add(cleanId);

        merged.push({
          id: ag.id,
          _source: "agenda_rapat",
          // Normalize fields to match KegiatanRecord shape
          activityType: ag.category === "pengajian" ? "kajian" : ag.category === "briefing" ? "apel" : "kajian",
          activityTitle: ag.title,
          date: ag.date,
          asrama: ag.locationName,
          notes: ag.notes,
          createdByName: ag.createdByName,
          startTime: ag.startTime,
          endTime: ag.endTime,
          // Attendance
          _agendaRapatDone: isDone,
          _agendaRapatPhotoUrl: taskEntry?.photoUrl,
          _agendaRapatCompletedAt: taskEntry?.completedAt,
          _agendaRapatGpsVerified: Boolean(taskEntry?.gpsVerified),
        });
      }
    });

    // 3. Any additional dynamic agenda/meeting tasks present in musyrif's logbookData
    if (musyrif && logbookData?.[musyrif.id]) {
      Object.entries(logbookData[musyrif.id]).forEach(([dt, dayEntry]) => {
        if (dayEntry && typeof dayEntry === "object") {
          Object.entries(dayEntry).forEach(([k, t]: [string, any]) => {
            if (k.startsWith("agenda_") && !seenMeetingKeys.has(k) && t) {
              seenMeetingKeys.add(k);
              const isDone = Boolean(
                t.done === true || 
                t.done === "TRUE" || 
                t.done === "true" || 
                t.done === 1 || 
                t.photoUrl || 
                t.completedAt
              );
              merged.push({
                id: k,
                _source: "agenda_rapat",
                activityType: "kajian",
                activityTitle: t.title || "Agenda Rapat Koordinasi",
                date: dt,
                asrama: t.locationName || "Asrama",
                notes: t.notes,
                createdByName: t.createdByName || "Koordinator",
                startTime: t.startTime || "",
                endTime: t.endTime || "",
                _agendaRapatDone: isDone,
                _agendaRapatPhotoUrl: t.photoUrl,
                _agendaRapatCompletedAt: t.completedAt,
                _agendaRapatGpsVerified: Boolean(t.gpsVerified),
              });
            }
          });
        }
      });
    }

    return merged.sort((a, b) => b.date.localeCompare(a.date));
  }, [kegiatanRecords, agendaRapatList, logbookData, musyrif]);

  const kegiatanStats = useMemo(() => {
    let hadir = 0, izin = 0, sakit = 0, alfa = 0;
    musyrifKegiatanList.forEach(k => {
      let st: string | undefined;
      if (k._source === "agenda_rapat") {
        st = k._agendaRapatDone ? "hadir" : undefined;
      } else {
        st = musyrif ? k.attendees?.[musyrif.id] : undefined;
      }
      if (st === "hadir") hadir++;
      else if (st === "izin") izin++;
      else if (st === "sakit") sakit++;
      else if (st === "alfa") alfa++;
    });
    return { total: musyrifKegiatanList.length, hadir, izin, sakit, alfa };
  }, [musyrifKegiatanList, musyrif?.id]);

  // Handle direct quick status update for Pamong
  const handleQuickMark = (prayer: PrayerSlot, status: AttendanceStatus) => {
    if (!selectedDay || !onMark || !musyrif) return;
    const dStr = format(selectedDay.date, "yyyy-MM-dd");
    onMark(musyrif.id, prayer, status, dStr, editNoteText || undefined);
    
    // Update local modal state
    const currentRec = records.find(r => r.musyrifId === musyrif.id && r.date === dStr) || { musyrifId: musyrif.id, date: dStr };
    setSelectedDay({
      date: selectedDay.date,
      record: {
        ...currentRec,
        [prayer]: status,
        ...(prayer === "subuh" ? { subuhNote: editNoteText || currentRec.subuhNote } : { maghribNote: editNoteText || currentRec.maghribNote })
      }
    });
    setEditingSlot(null);
    setEditNoteText("");
    showToast?.(`Presensi ${prayer === "subuh" ? "Subuh" : "Maghrib"} (${musyrif.name}) diubah ke ${S[status].label}`, "success");
  };

  const LOGBOOK_TASK_DEFS = [
    { key: "tahajjud", title: "Bangunkan Santri Tahajjud", window: "03:30 - 04:30" },
    { key: "bakdaSubuh", title: "Dampingi Santri Bakda Subuh", window: "05:00 - 06:00" },
    { key: "cekSakit", title: "Pengecekan Santri Sakit", window: "06:00 - 06:45" },
    { key: "sisirSekolah", title: "Menyisir Santri ke Sekolah", window: "06:30 - 07:15" },
    { key: "jagaGerbang", title: "Piket Penjagaan Gerbang", window: "07:00 - 09:00" },
    { key: "oprakAshar", title: "Oprak-oprak Shalat Ashar", window: "15:00 - 15:45" },
    { key: "oprakMandi", title: "Oprak-oprak Mandi & Persiapan", window: "16:30 - 17:30" },
    { key: "sisirMaghrib", title: "Menyisir Santri ke Masjid", window: "17:30 - 18:15" },
    { key: "bakdaMaghrib", title: "Mendampingi Bakda Maghrib", window: "18:15 - 19:15" },
    { key: "belajarMalam", title: "Mendampingi Belajar Malam", window: "20:00 - 21:30" },
    { key: "cekTidur", title: "Pengecekan Santri Tidur", window: "21:45 - 22:30" },
  ] as const;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* 1. Unified Master Header Card like Halaman Presensi */}
      <div className="bg-white rounded-3xl p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
        {/* Top title & Action button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-teal-600 text-white shadow-teal-600/25">
              <Calendar className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                {isPersonalMusyrif ? "Riwayat Saya" : "Riwayat Musyrif"}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {isPersonalMusyrif ? "Rekapan lengkap sholat, logbook, amalan & izin" : "Detail presensi, logbook, amalan, izin & agenda"}
              </p>
            </div>
          </div>

          {/* Action Button: Pilih Musyrif */}
          {!isPersonalMusyrif && (
            <button 
              type="button"
              onClick={() => setShowMusyrifPicker(true)} 
              className="px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 flex-shrink-0 text-teal-700 ring-teal-200 bg-teal-50 hover:bg-teal-100/80"
            >
              <Users className="w-3.5 h-3.5 text-teal-600"/>
              <span>{musyrif ? musyrif.name : "Pilih Musyrif"}</span>
              <ChevronDown className="w-3 h-3 text-teal-600/70"/>
            </button>
          )}
        </div>

        {/* Integrated Multi-Category Horizontal Tab Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/80">
          <button
            onClick={() => setActiveTab("sholat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "sholat"
                ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${activeTab === "sholat" ? "text-emerald-600" : "text-slate-400"}`} />
            <span>Shalat & Presensi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-mono">
              {pct}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logbook")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "logbook"
                ? "bg-white text-indigo-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <ClipboardList className={`w-3.5 h-3.5 ${activeTab === "logbook" ? "text-indigo-600" : "text-slate-400"}`} />
            <span>Jurnal Logbook</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-mono">
              {logbookMonthStats.totalTasksDone} Tugas
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pengasuhan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "pengasuhan"
                ? "bg-white text-rose-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <HeartHandshake className={`w-3.5 h-3.5 ${activeTab === "pengasuhan" ? "text-rose-600" : "text-slate-400"}`} />
            <span>Pengasuhan & RS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 font-mono">
              +{pengasuhanStats.totalPoin} Pts ({pengasuhanStats.total})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("mutabaah")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "mutabaah"
                ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === "mutabaah" ? "text-emerald-600" : "text-slate-400"}`} />
            <span>Mutaba'ah Yaumiyah</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-mono">
              {mutabaahMonthStats.totalPoints} Poin
            </span>
          </button>

          <button
            onClick={() => setActiveTab("izin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "izin"
                ? "bg-white text-blue-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileCheck2 className={`w-3.5 h-3.5 ${activeTab === "izin" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Pengajuan Izin</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-mono">
              {izinStats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("kegiatan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "kegiatan"
                ? "bg-white text-teal-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${activeTab === "kegiatan" ? "text-teal-600" : "text-slate-400"}`} />
            <span>Rapat & Agenda</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-50 text-teal-700 font-mono">
              {kegiatanStats.hadir} Hadir
            </span>
          </button>
        </div>
      </div>

      {/* Empty State for PageRiwayat when no musyrif is selected */}
      {!musyrif ? (
        <div className="bg-gradient-to-b from-teal-50/70 via-white to-slate-50 border border-teal-100/80 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 ring-8 ring-teal-50">
            <Calendar className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center text-xs font-black shadow-xs ring-2 ring-white">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-100/80 text-teal-800 border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Mode Pantau Pamong & Pengawas
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
              Pilih Musyrif Terlebih Dahulu
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Silakan pilih salah satu musyrif binaan di bawah ini untuk melihat detail rekap kehadiran shalat berjamaah, jurnal logbook, amalan mutaba'ah, dan izin santri.
            </p>
          </div>

          {/* Quick Cards Grid */}
          <div className="pt-2 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar Musyrif Binaan:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {allowed.map(m => {
                const mRecsCount = records.filter(r => r.musyrifId === m.id && r.date.startsWith(mk) && (r.subuh === "hadir" || r.maghrib === "hadir")).length;
                
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelId(m.id)}
                    className="group p-3.5 rounded-2xl bg-white hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">{m.name}</h4>
                        <span className="text-[10px] text-slate-400 block truncate">{m.asrama}{m.kamar ? ` • Kmr ${m.kamar}` : ""}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        mRecsCount > 0 ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {mRecsCount > 0 ? `${mRecsCount} Shalat Hadir` : "Belum Ada Presensi"}
                      </span>
                      <span className="text-[11px] font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Lihat Riwayat ➔
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Executive Musyrif Profile Hero Card */}
          {isPersonalMusyrif ? (
            <div className="flex items-center gap-3 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl px-4 py-3 text-emerald-800 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight">Riwayat Terpadu Akun Anda</p>
                <p className="text-[11px] text-emerald-600 mt-0.5 truncate">Menampilkan seluruh arsip presensi, tugas harian, mutaba'ah, izin, dan rapat</p>
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/40 rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <Av name={musyrif.name} sz="lg"/>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate leading-tight">
                  {musyrif.name}
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold font-mono">
                  {musyrif.kelas}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate flex items-center gap-1">
                <span className="text-slate-400">Pamong:</span> {musyrif.pamong || "-"}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 truncate">
                {musyrif.asrama} · {musyrif.kamar}
              </p>
            </div>
          </div>

          {/* Attendance Score Badge */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 bg-white p-2.5 rounded-2xl border border-slate-200/60 shadow-2xs">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none">
              {pct}<span className="text-xs font-semibold text-slate-400">%</span>
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 leading-none">Presensi Shalat</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100/90">
          {musyrif.phone && (
            <a 
              href={`https://wa.me/${musyrif.phone}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-2xl transition-all shadow-xs active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5"/> 
              <span>Hubungi WhatsApp</span>
            </a>
          )}
          {musyrif.email && (
            <a 
              href={`mailto:${musyrif.email}`} 
              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-bold py-2.5 px-3 rounded-2xl transition-all shadow-2xs active:scale-95"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500"/> 
              <span>Kirim Email</span>
            </a>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SHALAT & PRESENSI */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "sholat" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Harmonious Monthly Status Breakdown & Streak Cards */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Rekap Presensi Bulan Ini</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Bulan {format(viewMonth, "MMMM yyyy", { locale: id })}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl font-mono">
                {pct}% Kehadiran
              </span>
            </div>

            {/* 4 Clean Metric Pills */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all">
                <div className="flex items-center justify-center gap-1 text-emerald-700 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Hadir</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{totalHadir}</p>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">waktu</span>
              </div>

              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all">
                <div className="flex items-center justify-center gap-1 text-amber-700 mb-1">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Sakit</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{totalSakit}</p>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">hari</span>
              </div>

              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all">
                <div className="flex items-center justify-center gap-1 text-sky-700 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Izin</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{totalIzin}</p>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">hari</span>
              </div>

              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all">
                <div className="flex items-center justify-center gap-1 text-rose-700 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Alpa</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">{totalAlfa}</p>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">waktu</span>
              </div>
            </div>

            {/* 2 Clean Streak Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-black text-amber-950 font-mono leading-none">
                    {streak.cur} <span className="text-xs font-normal font-sans text-amber-800">hari</span>
                  </p>
                  <p className="text-[11px] text-amber-700/90 font-medium mt-1">Streak saat ini</p>
                </div>
              </div>

              <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0C81E4] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-black text-[#0C4E8C] font-mono leading-none">
                    {streak.best} <span className="text-xs font-normal font-sans text-sky-800">hari</span>
                  </p>
                  <p className="text-[11px] text-sky-700/90 font-medium mt-1">Streak terbaik</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3-month trend */}
          <Card ch={<div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Tren 3 Bulan Terakhir</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/><span className="text-[10px] text-slate-400 font-medium">Subuh</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0C4E8C]"/><span className="text-[10px] text-slate-400 font-medium">Maghrib</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={trendData} barGap={4} barCategoryGap="30%">
                <XAxis dataKey="month" tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={28}/>
                <Tooltip contentStyle={{background:"#fff",border:"none",boxShadow:"0 8px 24px rgba(0,0,0,.1)",borderRadius:12,fontSize:12}} formatter={(v:number,n:string)=>[`${v}%`,n==="subuh"?"Subuh":"Maghrib"]}/>
                <Bar dataKey="subuh"   name="subuh"   fill="#f59e0b" radius={[4,4,0,0]}/>
                <Bar dataKey="maghrib" name="maghrib"  fill="#0C4E8C" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>}/>

          {/* Unified All-in-One Calendar & Attendance Hub */}
          <Card ch={<div>
            {/* Top Bar: Month Nav + Quick Jump */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={()=>setViewMonth(subMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 active:scale-95 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5"/>
                </button>
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 font-mono px-1">
                  {format(viewMonth,"MMMM yyyy",{locale:id})}
                </span>
                <button 
                  onClick={()=>setViewMonth(addMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 active:scale-95 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
                >
                  <ChevronRight className="w-3.5 h-3.5"/>
                </button>
              </div>

              {format(viewMonth,"yyyy-MM") !== format(new Date(),"yyyy-MM") && (
                <button 
                  onClick={()=>setViewMonth(new Date())}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-xl transition-all"
                >
                  Bulan Ini
                </button>
              )}
            </div>

            {/* Compact 2-in-1 Slot Selector Ribbon */}
            <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 grid grid-cols-2 gap-2">
              {/* Subuh Tab */}
              <button
                onClick={()=>setCalendarSlotFilter(f=>f==="subuh"?"all":"subuh")}
                className={`p-2 rounded-2xl border text-left transition-all select-none flex items-center justify-between gap-2 ${
                  calendarSlotFilter==="subuh" 
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs" 
                    : "bg-white text-slate-700 border-slate-200/80 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sun className={`w-3.5 h-3.5 flex-shrink-0 ${calendarSlotFilter==="subuh" ? "text-white" : "text-amber-500"}`}/>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[11px] font-bold truncate">Subuh</p>
                    <p className={`text-[9px] font-mono ${calendarSlotFilter==="subuh" ? "text-amber-100" : "text-slate-400"}`}>
                      {mRecs.filter(r=>r.subuh==="hadir").length}/{pastDays.length} Hadir
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold font-mono flex-shrink-0 ${calendarSlotFilter==="subuh" ? "text-white" : "text-amber-700"}`}>
                  {pastDays.length ? Math.round(mRecs.filter(r=>r.subuh==="hadir").length/pastDays.length*100) : 0}%
                </span>
              </button>

              {/* Maghrib Tab */}
              <button
                onClick={()=>setCalendarSlotFilter(f=>f==="maghrib"?"all":"maghrib")}
                className={`p-2 rounded-2xl border text-left transition-all select-none flex items-center justify-between gap-2 ${
                  calendarSlotFilter==="maghrib" 
                    ? "bg-teal-600 text-white border-teal-700 shadow-xs" 
                    : "bg-white text-slate-700 border-slate-200/80 hover:border-teal-300"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Moon className={`w-3.5 h-3.5 flex-shrink-0 ${calendarSlotFilter==="maghrib" ? "text-white" : "text-teal-600"}`}/>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[11px] font-bold truncate">Maghrib</p>
                    <p className={`text-[9px] font-mono ${calendarSlotFilter==="maghrib" ? "text-teal-100" : "text-slate-400"}`}>
                      {mRecs.filter(r=>r.maghrib==="hadir").length}/{pastDays.length} Hadir
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold font-mono flex-shrink-0 ${calendarSlotFilter==="maghrib" ? "text-white" : "text-teal-700"}`}>
                  {pastDays.length ? Math.round(mRecs.filter(r=>r.maghrib==="hadir").length/pastDays.length*100) : 0}%
                </span>
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
              {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d=>(
                <div key={d} className="text-center text-[10px] font-extrabold text-slate-400 py-2 font-mono">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {Array.from({length:adj}).map((_,i)=><div key={`b${i}`} className="border-b border-r border-slate-50 min-h-[44px] bg-slate-50/20"/>)}
              {days.map((day,i)=>{
                const r=getR(day);
                const future=isBefore(new Date(),startOfDay(day))&&!isToday(day);
                const last=(adj+i+1)%7===0;
                const dayStr = format(day, "yyyy-MM-dd");
                const stSub = getEffectiveAttendanceStatus(r, "subuh", dayStr, now);
                const stMag = getEffectiveAttendanceStatus(r, "maghrib", dayStr, now);
                const perfect = stSub === "hadir" && stMag === "hadir";

                return (
                  <div 
                    key={day.toISOString()} 
                    onClick={() => !future && setSelectedDay({ date: day, record: r ? { ...r, subuh: stSub, maghrib: stMag } : { musyrifId: musyrif?.id || "", date: dayStr, subuh: stSub, maghrib: stMag } })}
                    className={`min-h-[44px] border-b border-r border-slate-100/70 p-1 flex flex-col justify-between transition-all select-none ${
                      isToday(day) ? "bg-emerald-50/80 ring-1 ring-emerald-400 inset-0 z-10" : perfect&&!future ? "bg-emerald-50/30" : "bg-white"
                    } ${future ? "opacity-25 cursor-default bg-slate-50/30" : "cursor-pointer hover:bg-emerald-50/60 active:scale-95"} ${last ? "border-r-0" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold font-mono px-1 rounded-full ${
                        isToday(day) ? "bg-emerald-600 text-white px-1.5 shadow-2xs" : "text-slate-600"
                      }`}>
                        {format(day,"d")}
                      </span>
                      {isToday(day) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5"/>}
                    </div>

                    {!future && (
                      <div className="flex flex-col gap-1 my-0.5 px-0.5">
                        {calendarSlotFilter !== "maghrib" && (
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              stSub ? S[stSub].dot : "bg-slate-200"
                            }`} 
                            title={`Subuh: ${stSub ? S[stSub].label : "Belum"}`}
                          />
                        )}
                        {calendarSlotFilter !== "subuh" && (
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              stMag ? S[stMag].dot : "bg-slate-200"
                            }`} 
                            title={`Maghrib: ${stMag ? S[stMag].label : "Belum"}`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Compact Legend */}
            <div className="px-3.5 py-2 border-t border-slate-100 flex gap-2.5 flex-wrap bg-slate-50/60 items-center justify-between text-[10px]">
              <div className="flex items-center gap-2 flex-wrap">
                {[{c:"bg-emerald-500",l:"Hadir"},{c:"bg-amber-500",l:"Sakit"},{c:"bg-sky-500",l:"Izin"},{c:"bg-rose-600",l:"Alfa"}].map(x=>(
                  <div key={x.l} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${x.c}`}/>
                    <span className="text-slate-500">{x.l}</span>
                  </div>
                ))}
              </div>
              <span className="text-emerald-700 font-semibold italic">👆 Klik tgl untuk detail</span>
            </div>
          </div>}/>

          {/* Riwayat Sakit, Izin & Alfa Bulan Ini */}
          <div>
            <Label ch="Catatan Sakit, Izin & Alfa Bulan Ini"/>
            <Card ch={
              nonHadirRecs.length === 0 ? (
                <div className="p-5 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5"/>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Alhamdulillah, Kehadiran Penuh</p>
                  <p className="text-[11px] text-slate-400">Tidak ada catatan sakit, izin, maupun alfa pada bulan {format(viewMonth,"MMMM yyyy",{locale:id})}.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {nonHadirRecs.map((rec) => {
                    const dayDate = parseISO(rec.date);
                    const hasSubuhNonHadir = rec.subuh && rec.subuh !== "hadir";
                    const hasMaghribNonHadir = rec.maghrib && rec.maghrib !== "hadir";

                    return (
                      <div key={rec.date} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {format(dayDate, "EEEE, d MMM yyyy", { locale: id })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {hasSubuhNonHadir && rec.subuh && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                rec.subuh === "sakit" ? "bg-amber-100 text-amber-800" :
                                rec.subuh === "izin"  ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                Subuh: {S[rec.subuh]?.label || rec.subuh}
                              </span>
                            )}
                            {hasMaghribNonHadir && rec.maghrib && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                rec.maghrib === "sakit" ? "bg-amber-100 text-amber-800" :
                                rec.maghrib === "izin"  ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                Maghrib: {S[rec.maghrib]?.label || rec.maghrib}
                              </span>
                            )}
                          </div>
                        </div>

                        {(rec.subuhNote || rec.maghribNote) && (
                          <div className="bg-slate-50 rounded-xl p-2 text-xs text-slate-600 border border-slate-100 flex flex-col gap-1 font-mono">
                            {rec.subuhNote && (
                              <p><strong className="text-slate-700 font-sans">Catatan Subuh:</strong> "{rec.subuhNote}"</p>
                            )}
                            {rec.maghribNote && (
                              <p><strong className="text-slate-700 font-sans">Catatan Maghrib:</strong> "{rec.maghribNote}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }/>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: JURNAL LOGBOOK */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "logbook" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header & Month Filter */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Rekapitulasi Jurnal Logbook</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Bulan {format(viewMonth, "MMMM yyyy", { locale: id })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={()=>setViewMonth(subMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5"/>
                </button>
                <button 
                  onClick={()=>setViewMonth(addMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>

            {/* 4 Clean Metric Pills for Logbook */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-indigo-700 block mb-0.5">Tugas Selesai</span>
                <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">{logbookMonthStats.totalTasksDone}</p>
                <span className="text-[10px] text-indigo-600/80 font-medium block mt-0.5">tugas terlaksana</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">Hari Terisi</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{logbookMonthStats.daysFilled}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">hari aktif</span>
              </div>

              <div className="bg-sky-50/60 border border-sky-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-sky-700 block mb-0.5">Rata-rata/Hari</span>
                <p className="text-xl sm:text-2xl font-black text-sky-950 font-mono">{logbookMonthStats.avgPerDay}<span className="text-xs font-normal">/11</span></p>
                <span className="text-[10px] text-sky-600/80 font-medium block mt-0.5">tugas/hari</span>
              </div>

              <div className="bg-purple-50/60 border border-purple-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-purple-700 block mb-0.5">Langkah Patroli</span>
                <p className="text-xl sm:text-2xl font-black text-purple-950 font-mono">{logbookMonthStats.totalSteps}</p>
                <span className="text-[10px] text-purple-600/80 font-medium block mt-0.5">total steps</span>
              </div>
            </div>
          </div>

          {/* 📸 Galeri Dokumentasi Foto Musyrif */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight truncate">
                    Galeri Dokumentasi Foto Musyrif
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {musyrifUploadedPhotos.length} foto diunggah oleh Ustaz {musyrif ? getMusyrifCallName(musyrif.name) : ""}
                    {canDeletePhoto && <span className="text-rose-600 font-bold ml-1.5">• Akses Hapus Aktif</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setPhotoFilterMonth("current")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    photoFilterMonth === "current"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Bulan Ini ({musyrifUploadedPhotos.filter(p => p.date.startsWith(mk)).length})
                </button>
                <button
                  onClick={() => setPhotoFilterMonth("all")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    photoFilterMonth === "all"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Semua ({musyrifUploadedPhotos.length})
                </button>
              </div>
            </div>

            {displayMusyrifPhotos.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-4">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Foto Terunggah</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                  {photoFilterMonth === "current" ? "Musyrif belum mengunggah foto logbook pada bulan ini." : "Musyrif belum memiliki riwayat foto logbook yang terunggah."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {displayMusyrifPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-slate-200/80 cursor-pointer shadow-2xs select-none"
                    onClick={() => setPreviewPhotoModal(photo)}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.taskTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Top Date Badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white font-mono">
                      {format(parseISO(photo.date), "d MMM", { locale: id })}
                    </div>
                    {/* Delete button for Koordinator Musyrif */}
                    {canDeletePhoto && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMusyrifPhoto(photo);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 active:scale-90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Hapus foto ini (Koordinator Musyrif)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Bottom Title Banner */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-3 text-[10px] text-white font-medium truncate">
                      {photo.taskTitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Logbook Cards */}
          <div className="space-y-3">
            <Label ch={`Catatan Logbook Harian (${logbookDatesThisMonth.length} Hari Terdata)`}/>
            {logbookDatesThisMonth.length === 0 ? (
              <Card ch={
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-1">
                    <ClipboardList className="w-6 h-6"/>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Belum Ada Catatan Logbook</p>
                  <p className="text-xs text-slate-400 max-w-xs">Belum ada data jurnal logbook musyrif yang tercatat pada bulan {format(viewMonth, "MMMM yyyy", { locale: id })}.</p>
                </div>
              }/>
            ) : (
              logbookDatesThisMonth.map(dateStr => {
                const entry = musyrifLogbooks[dateStr];
                if (!entry) return null;
                const isExpanded = expandedLogbookDate === dateStr;
                let dayDoneCount = 0;
                LOGBOOK_TASK_DEFS.forEach(t => {
                  if (entry[t.key]?.done) dayDoneCount++;
                });

                return (
                  <div key={dateStr} className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all">
                    {/* Header */}
                    <div 
                      onClick={() => setExpandedLogbookDate(isExpanded ? null : dateStr)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                          dayDoneCount >= 8 ? "bg-emerald-100 text-emerald-800" :
                          dayDoneCount >= 4 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {dayDoneCount}/11
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                            {format(parseISO(dateStr), "EEEE, d MMMM yyyy", { locale: id })}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {dayDoneCount === 11 ? "✨ Seluruh 11 tugas Melaksanakan" : `${dayDoneCount} Melaksanakan · ${11 - dayDoneCount} Tidak Melaksanakan`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl font-mono ${
                          dayDoneCount >= 8 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70" :
                          dayDoneCount >= 4 ? "bg-amber-50 text-amber-700 border border-amber-200/70" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {Math.round((dayDoneCount / 11) * 100)}%
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* General Notes Banner if available */}
                    {entry.generalNotes && (
                      <div className="px-4 pb-3">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-2.5 text-xs text-indigo-900 flex items-start gap-2">
                          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] text-indigo-700 block">Catatan Tambahan Asrama:</span>
                            <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-line">{entry.generalNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded Task Breakdown */}
                    {isExpanded && (
                      <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 divide-y divide-slate-100">
                        {LOGBOOK_TASK_DEFS.map(tDef => {
                          const tData = entry[tDef.key] || { done: false };
                          const isDone = !!tData.done;
                          const hasPhoto = Boolean(tData.photoUrl && typeof tData.photoUrl === "string" && tData.photoUrl.trim() !== "");

                          const taskPhotoItem = hasPhoto ? {
                            id: `${musyrif.id}_${dateStr}_${tDef.key}`,
                            musyrifId: musyrif.id,
                            musyrifName: musyrif.name,
                            asrama: musyrif.asrama,
                            date: dateStr,
                            taskKey: tDef.key,
                            taskTitle: tDef.title,
                            completedAt: tData.completedAt,
                            photoUrl: tData.photoUrl,
                            photoTakenAt: tData.photoTakenAt,
                            photoSource: tData.photoSource,
                            photoWatermark: tData.photoWatermark,
                            notes: tData.notes,
                            stepsCount: tData.stepsCount,
                            gpsVerified: tData.gpsVerified
                          } : null;

                          return (
                            <div key={tDef.key} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  isDone ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                }`}>
                                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5"/> : <X className="w-3.5 h-3.5"/>}
                                </div>
                                <div className="min-w-0">
                                  <p className={`font-bold text-xs ${isDone ? "text-slate-900" : "text-slate-700"}`}>
                                    {tDef.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                                    <span className="font-mono">{tDef.window}</span>
                                    {isDone && tData.completedAt && (
                                      <span className="text-emerald-700 font-semibold">· Selesai {tData.completedAt} WIB</span>
                                    )}
                                    {isDone && tData.gpsVerified && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.2 rounded font-mono">📍 GPS Valid</span>
                                    )}
                                    {isDone && !!tData.stepsCount && (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.2 rounded font-mono">👣 {tData.stepsCount} langkah</span>
                                    )}
                                  </div>
                                  {tData.notes && (
                                    <p className="text-[11px] text-slate-600 bg-white border border-slate-200/60 rounded-xl p-1.5 mt-1 font-mono">
                                      "{tData.notes}"
                                    </p>
                                  )}

                                  {/* Photo attachment preview inside task */}
                                  {hasPhoto && taskPhotoItem && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <div
                                        onClick={() => setPreviewPhotoModal(taskPhotoItem)}
                                        className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-2xs shrink-0"
                                        title="Lihat foto kegiatan"
                                      >
                                        <img
                                          src={tData.photoUrl}
                                          alt="Bukti Foto"
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                          <Eye className="w-3.5 h-3.5" />
                                        </div>
                                      </div>

                                      {canDeletePhoto && (
                                        <button
                                          onClick={() => handleDeleteMusyrifPhoto(taskPhotoItem)}
                                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                                          title="Hapus foto ini (Khusus Koordinator Musyrif / Admin)"
                                        >
                                          <Trash2 className="w-3 h-3 text-rose-600" />
                                          <span>Hapus Foto</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 font-mono ${
                                isDone ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80" : "bg-rose-50 text-rose-700 border border-rose-200/80"
                              }`}>
                                {isDone ? "Melaksanakan" : "Tidak Melaksanakan"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2.5: PENGASUHAN KHUSUS & RUJUKAN PKU/RS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "pengasuhan" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header & Month Filter */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Riwayat Tugas Pengasuhan & Bimbingan</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Rujukan PKU/RS & Bimbingan Santri Bulan {format(viewMonth, "MMMM yyyy", { locale: id })}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl font-mono">
                +{pengasuhanStats.totalPoin} Poin Akumulasi
              </span>
            </div>

            {/* 4 Clean Metric Pills for Pengasuhan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-rose-700 block mb-0.5">Rujukan PKU/RS</span>
                <p className="text-xl sm:text-2xl font-black text-rose-950 font-mono">{pengasuhanStats.antarPku}</p>
                <span className="text-[10px] text-rose-600/80 font-medium block mt-0.5">penugasan (+10 Pts)</span>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-indigo-700 block mb-0.5">Bimbingan Santri</span>
                <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">{pengasuhanStats.binaSantri}</p>
                <span className="text-[10px] text-indigo-600/80 font-medium block mt-0.5">sesi (+5 Pts)</span>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-amber-700 block mb-0.5">Pengantaran Lain</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{pengasuhanStats.antarLain}</p>
                <span className="text-[10px] text-amber-600/80 font-medium block mt-0.5">kegiatan (+5 Pts)</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">Total Poin</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">+{pengasuhanStats.totalPoin}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">masuk Pilar 2</span>
              </div>
            </div>
          </div>

          {/* List of Pengasuhan Records */}
          <div className="space-y-3">
            <Label ch={`Daftar Penugasan Pengasuhan (${musyrifPengasuhanList.length})`}/>
            {musyrifPengasuhanList.length === 0 ? (
              <Card ch={
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-1">
                    <HeartHandshake className="w-6 h-6"/>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Belum Ada Tugas Pengasuhan</p>
                  <p className="text-xs text-slate-400 max-w-xs">Musyrif belum memiliki catatan rujukan medis ke RS/PKU atau bimbingan santri khusus.</p>
                </div>
              }/>
            ) : (
              musyrifPengasuhanList.map(rec => {
                const isPku = rec.kategori === "antar_pku_rs";
                const isBina = rec.kategori === "bina_santri";
                return (
                  <div key={rec.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {rec.photoUrl ? (
                          <div
                            onClick={() => setPreviewPhotoModal({ id: rec.id, photoUrl: rec.photoUrl, taskTitle: `Pengasuhan: ${rec.namaSantri}` })}
                            className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-2xs shrink-0"
                          >
                            <img src={rec.photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPku ? "bg-rose-100 text-rose-700" : isBina ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {isPku ? <HeartPulse className="w-5 h-5" /> : isBina ? <HeartHandshake className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPku ? "bg-rose-100 text-rose-800" : isBina ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {isPku ? "Rujukan Medis / RS" : isBina ? "Bimbingan Santri" : "Pengantaran Lain"}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              +{rec.poin || (isPku ? 10 : 5)} Poin
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                            {rec.namaSantri} {rec.kelasSantri ? `(Kelas ${rec.kelasSantri})` : ""}
                          </h4>

                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{rec.lokasiTujuan}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {rec.date} • {rec.waktu}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 text-xs text-slate-700 border border-slate-100 space-y-1">
                      <span className="font-bold text-[11px] text-slate-500 block">Keterangan / Hasil Pendampingan:</span>
                      <p className="leading-relaxed">{rec.catatan}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: MUTABAAH YAUMIYAH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "mutabaah" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header & Stats */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Rekap Mutaba'ah Yaumiyah</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Amalan Sunnah Bulan {format(viewMonth, "MMMM yyyy", { locale: id })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={()=>setViewMonth(subMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5"/>
                </button>
                <button 
                  onClick={()=>setViewMonth(addMonths(viewMonth,1))} 
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>

            {/* 4 Clean Metric Pills for Mutabaah */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">Total Skor Mutaba'ah</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{mutabaahMonthStats.totalPoints}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">poin yaumiyah</span>
              </div>

              <div className="bg-teal-50/60 border border-teal-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-teal-700 block mb-0.5">Tilawah Qur'an</span>
                <p className="text-xl sm:text-2xl font-black text-teal-950 font-mono">{mutabaahMonthStats.totalTilawah}</p>
                <span className="text-[10px] text-teal-600/80 font-medium block mt-0.5">halaman / lembar</span>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-indigo-700 block mb-0.5">Qiyamul Lail</span>
                <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">{mutabaahMonthStats.totalTahajjud}</p>
                <span className="text-[10px] text-indigo-600/80 font-medium block mt-0.5">malam tahajjud</span>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-amber-700 block mb-0.5">Puasa Sunnah</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{mutabaahMonthStats.totalPuasa}</p>
                <span className="text-[10px] text-amber-600/80 font-medium block mt-0.5">hari berpuasa</span>
              </div>
            </div>
          </div>

          {/* Daily Mutaba'ah Cards */}
          <div className="space-y-3">
            <Label ch={`Riwayat Amalan Yaumiyah (${mutabaahDatesThisMonth.length} Hari Terdata)`}/>
            {mutabaahDatesThisMonth.length === 0 ? (
              <Card ch={
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-1">
                    <Sparkles className="w-6 h-6"/>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Belum Ada Data Mutaba'ah</p>
                  <p className="text-xs text-slate-400 max-w-xs">Belum ada amalan yaumiyah musyrif yang tercatat pada bulan {format(viewMonth, "MMMM yyyy", { locale: id })}.</p>
                </div>
              }/>
            ) : (
              mutabaahDatesThisMonth.map(dateStr => {
                const mEntry = musyrifMutabaah[dateStr];
                if (!mEntry) return null;

                let completedCount = 0;
                if (mEntry.tahajjud) completedCount++;
                if (mEntry.dhuha) completedCount++;
                if (mEntry.rawatib) completedCount++;
                if (mEntry.tilawahPages > 0) completedCount++;
                if (mEntry.dzikirPagi) completedCount++;
                if (mEntry.dzikirPetang) completedCount++;
                if (mEntry.puasaSunnah) completedCount++;
                if (mEntry.muthalaah) completedCount++;

                return (
                  <div key={dateStr} className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                          {format(parseISO(dateStr), "EEEE, d MMMM yyyy", { locale: id })}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {completedCount} dari 8 amalan sunnah terlaksana
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl font-mono">
                        {completedCount}/8 Selesai
                      </span>
                    </div>

                    {/* 8 Amalan Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.tahajjud ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">🌙</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Tahajjud</p>
                          <p className="text-[10px] opacity-75">{mEntry.tahajjud ? "Dikerjakan" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.dhuha ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">☀️</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Dhuha</p>
                          <p className="text-[10px] opacity-75">{mEntry.dhuha ? "Dikerjakan" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.rawatib ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">🕌</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Rawatib</p>
                          <p className="text-[10px] opacity-75">{mEntry.rawatib ? "Dikerjakan" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.tilawahPages > 0 ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">📖</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Tilawah</p>
                          <p className="text-[10px] opacity-75 font-mono">{mEntry.tilawahPages > 0 ? `${mEntry.tilawahPages} Hal` : "0 Hal"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.dzikirPagi ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">🌅</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Dzikir Pagi</p>
                          <p className="text-[10px] opacity-75">{mEntry.dzikirPagi ? "Dikerjakan" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.dzikirPetang ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">🌆</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Dzikir Petang</p>
                          <p className="text-[10px] opacity-75">{mEntry.dzikirPetang ? "Dikerjakan" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.puasaSunnah ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">🌿</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Puasa Sunnah</p>
                          <p className="text-[10px] opacity-75">{mEntry.puasaSunnah ? "Berpuasa" : "Tidak"}</p>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
                        mEntry.muthalaah ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200/60 text-slate-400"
                      }`}>
                        <span className="text-base">📚</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">Muthala'ah</p>
                          <p className="text-[10px] opacity-75">{mEntry.muthalaah ? "Membaca" : "Tidak"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: PENGAJUAN IZIN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "izin" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Stats */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Riwayat Pengajuan Izin</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Izin Sakit, Pulang & Keperluan Musyrif</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl font-mono">
                {izinStats.total} Pengajuan
              </span>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">Disetujui</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{izinStats.approved}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">disetujui Pamong</span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-amber-700 block mb-0.5">Menunggu</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{izinStats.pending}</p>
                <span className="text-[10px] text-amber-600/80 font-medium block mt-0.5">dalam proses review</span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-rose-700 block mb-0.5">Ditolak</span>
                <p className="text-xl sm:text-2xl font-black text-rose-950 font-mono">{izinStats.rejected}</p>
                <span className="text-[10px] text-rose-600/80 font-medium block mt-0.5">tidak disetujui</span>
              </div>
            </div>
          </div>

          {/* List of Izin */}
          <div className="space-y-3">
            <Label ch={`Daftar Permohonan Izin (${musyrifIzinList.length})`}/>
            {musyrifIzinList.length === 0 ? (
              <Card ch={
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                    <FileCheck2 className="w-6 h-6"/>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Tidak Ada Riwayat Izin</p>
                  <p className="text-xs text-slate-400 max-w-xs">Musyrif belum pernah mengajukan surat izin atau izin sakit.</p>
                </div>
              }/>
            ) : (
              musyrifIzinList.map(req => {
                const isApproved = req.status === "approved";
                const isPending = req.status === "pending";
                const isRejected = req.status === "rejected";

                return (
                  <div key={req.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.type === "sakit" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                          }`}>
                            {req.type === "sakit" ? "🏥 Sakit" : "📋 Izin"}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {req.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          📅 {req.startDate} s/d {req.endDate} {req.prayerSlot !== "all" && `(${req.prayerSlot.toUpperCase()})`}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold shrink-0 font-mono ${
                        isApproved ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        isPending  ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                        "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        {isApproved ? "✓ Disetujui" : isPending ? "⏳ Menunggu" : "✕ Ditolak"}
                      </span>
                    </div>

                    {/* Alasan */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700 block text-[11px] mb-0.5">Alasan Permohonan:</span>
                      <p className="text-slate-600 leading-relaxed font-sans">{req.reason}</p>
                    </div>

                    {/* Reviewer Note if available */}
                    {req.reviewedBy && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Diverifikasi oleh: <strong className="text-slate-700">{req.reviewedBy}</strong></span>
                        {req.reviewedAt && <span>{format(parseISO(req.reviewedAt), "d MMM yyyy, HH:mm", { locale: id })}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: RAPAT & AGENDA ASRAMA */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "kegiatan" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Header Stats */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">Riwayat Rapat & Agenda Asrama</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Tahfidz, Kajian, Apel, Piket & Rapat Koordinasi</p>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl font-mono">
                {kegiatanStats.total} Agenda
              </span>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">Hadir</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{kegiatanStats.hadir}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">kegiatan</span>
              </div>

              <div className="bg-sky-50/70 border border-sky-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-sky-700 block mb-0.5">Izin</span>
                <p className="text-xl sm:text-2xl font-black text-sky-950 font-mono">{kegiatanStats.izin}</p>
                <span className="text-[10px] text-sky-600/80 font-medium block mt-0.5">kegiatan</span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-amber-700 block mb-0.5">Sakit</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{kegiatanStats.sakit}</p>
                <span className="text-[10px] text-amber-600/80 font-medium block mt-0.5">kegiatan</span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-2.5 text-center">
                <span className="text-[11px] font-bold text-rose-700 block mb-0.5">Alpa</span>
                <p className="text-xl sm:text-2xl font-black text-rose-950 font-mono">{kegiatanStats.alfa}</p>
                <span className="text-[10px] text-rose-600/80 font-medium block mt-0.5">kegiatan</span>
              </div>
            </div>
          </div>

          {/* List of Kegiatan */}
          <div className="space-y-3">
            <Label ch={`Daftar Agenda & Rapat Asrama (${musyrifKegiatanList.length})`}/>
            {musyrifKegiatanList.length === 0 ? (
              <Card ch={
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center mb-1">
                    <Building2 className="w-6 h-6"/>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Tidak Ada Agenda Terdaftar</p>
                  <p className="text-xs text-slate-400 max-w-xs">Belum ada catatan agenda, rapat, atau kegiatan asrama untuk musyrif ini.</p>
                </div>
              }/>
            ) : (
              musyrifKegiatanList.map(keg => {
                let myStatus: string;
                let agendaCategory: string = "";
                if (keg._source === "agenda_rapat") {
                  myStatus = keg._agendaRapatDone ? "hadir" : "belum";
                  agendaCategory = keg.activityType === "kajian" ? "Pengajian" : keg.activityType === "apel" ? "Briefing" : "Rapat";
                } else {
                  myStatus = musyrif ? (keg.attendees?.[musyrif.id] || "belum") : "belum";
                }
                const typeLabels: Record<string, string> = {
                  tahfidz: "Tahfidz Al-Qur'an",
                  kajian: agendaCategory || "Kajian & Rapat Asrama",
                  apel: agendaCategory || "Apel / Upacara",
                  piket: "Piket & Gotong Royong"
                };

                return (
                  <div key={keg.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            keg._source === "agenda_rapat"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-teal-100 text-teal-800"
                          }`}>
                            {keg._source === "agenda_rapat" ? agendaCategory : typeLabels[keg.activityType] || keg.activityType}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {keg.activityTitle}
                          </span>
                          {keg._source === "agenda_rapat" && keg.startTime && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {keg.startTime}–{keg.endTime} WIB
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          📅 {format(parseISO(keg.date), "EEEE, d MMMM yyyy", { locale: id })} · 📍 {keg.asrama}
                        </p>
                        {keg._source === "agenda_rapat" && keg._agendaRapatGpsVerified && (
                          <span className="text-[10px] text-blue-600 font-bold mt-0.5 block">✓ GPS Valid</span>
                        )}
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold shrink-0 font-mono ${
                        myStatus === "hadir" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        myStatus === "izin"  ? "bg-sky-100 text-sky-800 border border-sky-200" :
                        myStatus === "sakit" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        myStatus === "alfa"  ? "bg-rose-100 text-rose-800 border border-rose-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {myStatus === "hadir" ? "✓ Hadir" : myStatus === "izin" ? "📋 Izin" : myStatus === "sakit" ? "🏥 Sakit" : myStatus === "alfa" ? "✕ Alpa" : "⏳ Belum Presensi"}
                      </span>
                    </div>

                    {keg.notes && (
                      <div className="bg-slate-50 rounded-2xl p-2.5 text-xs text-slate-600 border border-slate-100 font-mono">
                        <strong className="text-slate-700 font-sans">Catatan:</strong> "{keg.notes}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* Calendar Day Detail Modal with Quick Pamong Status Revision */}
      {selectedDay && musyrif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" onClick={()=>{ setSelectedDay(null); setEditingSlot(null); }}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200 space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{format(selectedDay.date, "EEEE, d MMMM yyyy", {locale:id})}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{musyrif.name} ({musyrif.asrama} - Kmr {musyrif.kamar})</p>
              </div>
              <button 
                type="button"
                onClick={()=>{ setSelectedDay(null); setEditingSlot(null); }} 
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Subuh details & quick edit */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-4 h-4"/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Presensi Subuh</p>
                      <p className="text-[11px] text-slate-500">{selectedDay.record?.subuhNote ? `"${selectedDay.record.subuhNote}"` : "Tidak ada catatan"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Chip s={selectedDay.record?.subuh}/>
                    {isPamongOrKoord && onMark && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlot(editingSlot === "subuh" ? null : "subuh");
                          setEditNoteText(selectedDay.record?.subuhNote || "");
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:underline px-1 py-0.5"
                      >
                        {editingSlot === "subuh" ? "Tutup" : "Ubah"}
                      </button>
                    )}
                  </div>
                </div>

                {editingSlot === "subuh" && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["hadir", "izin", "sakit", "alfa"] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickMark("subuh", st)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                            selectedDay.record?.subuh === st
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st === "hadir" ? "Hadir" : st === "izin" ? "Izin" : st === "sakit" ? "Sakit" : "Alfa"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan keterangan Subuh..."
                      value={editNoteText}
                      onChange={e => setEditNoteText(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Maghrib details & quick edit */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Moon className="w-4 h-4"/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Presensi Maghrib</p>
                      <p className="text-[11px] text-slate-500">{selectedDay.record?.maghribNote ? `"${selectedDay.record.maghribNote}"` : "Tidak ada catatan"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Chip s={selectedDay.record?.maghrib}/>
                    {isPamongOrKoord && onMark && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlot(editingSlot === "maghrib" ? null : "maghrib");
                          setEditNoteText(selectedDay.record?.maghribNote || "");
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:underline px-1 py-0.5"
                      >
                        {editingSlot === "maghrib" ? "Tutup" : "Ubah"}
                      </button>
                    )}
                  </div>
                </div>

                {editingSlot === "maghrib" && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["hadir", "izin", "sakit", "alfa"] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickMark("maghrib", st)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                            selectedDay.record?.maghrib === st
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st === "hadir" ? "Hadir" : st === "izin" ? "Izin" : st === "sakit" ? "Sakit" : "Alfa"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan keterangan Maghrib..."
                      value={editNoteText}
                      onChange={e => setEditNoteText(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <button 
              type="button"
              onClick={()=>{ setSelectedDay(null); setEditingSlot(null); }} 
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Musyrif Picker Command Dialog */}
      {showMusyrifPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200" 
          onClick={()=>setShowMusyrifPicker(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100/80 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" 
            onClick={e=>e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Users className="w-4 h-4"/>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Pilih Musyrif</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Total {allowed.length} musyrif</p>
                </div>
              </div>
              <button 
                onClick={()=>setShowMusyrifPicker(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input 
                  type="text" 
                  value={pickerSearch} 
                  onChange={e=>setPickerSearch(e.target.value)} 
                  placeholder="Cari nama, kelas, atau pamong..." 
                  className="w-full bg-slate-50 ring-1 ring-slate-200/80 rounded-2xl pl-10 pr-9 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
                {pickerSearch && (
                  <button 
                    onClick={()=>setPickerSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 flex items-center justify-center transition-all"
                    title="Hapus pencarian"
                  >
                    <X className="w-3 h-3"/>
                  </button>
                )}
              </div>

              {/* Asrama Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={()=>setPickerAsrama("all")}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                    pickerAsrama === "all" ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Semua Asrama
                </button>
                {ASRAMAS.map(a => (
                  <button
                    key={a}
                    onClick={()=>setPickerAsrama(a)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                      pickerAsrama === a ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Musyrif Roster List */}
            <div className="overflow-y-auto divide-y divide-slate-50 flex-1 p-2">
              {allowed
                .filter(m => {
                  const q = pickerSearch.toLowerCase();
                  const matchSearch = !pickerSearch || 
                    (m.name || "").toLowerCase().includes(q) || 
                    (m.kelas || "").toLowerCase().includes(q) || 
                    (m.pamong && m.pamong.toLowerCase().includes(q));
                  const matchAsrama = pickerAsrama === "all" || m.asrama === pickerAsrama;
                  return matchSearch && matchAsrama;
                })
                .map(m => {
                  const isCurrent = musyrif ? m.id === musyrif.id : false;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelId(m.id);
                        setShowMusyrifPicker(false);
                      }}
                      className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all ${
                        isCurrent ? "bg-emerald-50/80 ring-1 ring-emerald-300" : "hover:bg-slate-50 active:scale-[0.99]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Av name={m.name} src={m.photo} sz="sm"/>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate leading-tight ${isCurrent ? "text-emerald-900" : "text-slate-800"}`}>
                            {m.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {m.kelas} · {m.asrama}
                          </p>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 📸 Full Photo Preview Modal with Delete Action for Koordinator Musyrif */}
      {previewPhotoModal && (
        <div 
          className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {previewPhotoModal.taskTitle}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Ustaz {previewPhotoModal.musyrifName} • {previewPhotoModal.asrama} • {previewPhotoModal.date ? format(parseISO(previewPhotoModal.date), "EEEE, d MMM yyyy", { locale: id }) : ""}
                </p>
              </div>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[260px] max-h-[50vh]">
              <img
                src={previewPhotoModal.photoUrl}
                alt={previewPhotoModal.taskTitle}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Details & Actions Footer */}
            <div className="p-4 space-y-3 bg-white border-t border-slate-100 shrink-0">
              {previewPhotoModal.notes && (
                <div className="bg-slate-50 rounded-2xl p-2.5 text-xs text-slate-700 border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-0.5">Catatan Kegiatan:</span>
                  "{previewPhotoModal.notes}"
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  {previewPhotoModal.completedAt && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200/60 font-semibold">
                      ⏰ {previewPhotoModal.completedAt} WIB
                    </span>
                  )}
                  {previewPhotoModal.stepsCount ? (
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200/60 font-semibold">
                      👣 {previewPhotoModal.stepsCount} langkah
                    </span>
                  ) : null}
                </div>

                {canDeletePhoto && (
                  <button
                    onClick={() => handleDeleteMusyrifPhoto(previewPhotoModal)}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto Ini</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: IBADAH (Prayer + Qibla + Sunnah Fasting)
// ─────────────────────────────────────────────────────────────────────────────
function PageIbadah({ 
  onBack, 
  onOpenKalenderHijriah,
  onOpenKalenderPendidikan 
}: { 
  onBack?: () => void; 
  onOpenKalenderHijriah?: () => void;
  onOpenKalenderPendidikan?: () => void;
}) {
  const [loc, setLoc]         = useState<{lat:number;lon:number;name:string}>({lat:-7.807631,lon:110.350905,name:"Mu'allimin Yogyakarta"});
  const [locLoading, setLocLoading] = useState(false);
  const [heading, setHeading] = useState<number|null>(null);
  const [demoH, setDemoH]     = useState(0);
  const [permDenied, setPermDenied] = useState(false);
  const [tab, setTab]         = useState<"jadwal"|"kiblat">("jadwal");

  const now = new Date();
  const hijri = toHijri(now);
  const prayers = calcPrayerTimes(now, loc.lat, loc.lon, 7);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const activeIdx = [...prayers].reduce((best, p, i) => p.raw <= nowH ? i : best, -1);
  const qibla = getQiblaAngle(loc.lat, loc.lon);
  const dist = getMeccaDist(loc.lat, loc.lon);

  // Countdown to next prayer
  const nextPrayer = prayers[(activeIdx + 1) % prayers.length];
  const countdownMins = Math.round((nextPrayer.raw - nowH) * 60 + (nextPrayer.raw < nowH ? 1440 : 0));

  const getLoc = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(pos => {
      setLoc({lat:pos.coords.latitude,lon:pos.coords.longitude,name:"Lokasi Anda"});
      setLocLoading(false);
    },()=>setLocLoading(false));
  };

  // Request compass sensor permission only when user switches to Kiblat tab
  const [sensorRequested, setSensorRequested] = useState(false);

  useEffect(() => {
    if (tab !== "kiblat" || sensorRequested) return;

    setSensorRequested(true);
    const handler = (e: DeviceOrientationEvent) => {
      const h = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360-e.alpha) : null);
      if (h != null) setHeading(h);
    };
    const req = (DeviceOrientationEvent as any).requestPermission;
    if (typeof req === "function") {
      req().then((p:string)=>{ if(p==="granted") window.addEventListener("deviceorientation",handler); else setPermDenied(true); }).catch(()=>setPermDenied(true));
    } else {
      window.addEventListener("deviceorientation",handler);
    }
    return ()=>{ window.removeEventListener("deviceorientation",handler); };
  },[tab, sensorRequested]);

  // Demo rotation fallback only when viewing Kiblat tab and physical sensor is unavailable
  useEffect(() => {
    if (tab !== "kiblat" || heading !== null) return;
    const iv = setInterval(() => setDemoH(h => (h + 1) % 360), 100);
    return () => clearInterval(iv);
  }, [tab, heading]);

  const activeHeading = heading ?? demoH;
  const relQibla = (qibla - activeHeading + 360) % 360;
  const isAligned = Math.abs(relQibla) < 5 || Math.abs(relQibla - 360) < 5;
  const SIZE = 260, C = SIZE/2, RING = 100;
  const qRad  = (relQibla - 90) * Math.PI / 180;
  const dotX = C + RING * Math.cos(qRad);
  const dotY = C + RING * Math.sin(qRad);

  const pIcons: Record<string,React.ReactNode> = {
    subuh:<Sunrise className="w-4 h-4"/>, terbit:<Sun className="w-4 h-4 opacity-50"/>,
    dhuhr:<Sun className="w-4 h-4"/>, asr:<Sun className="w-4 h-4 opacity-70"/>,
    maghrib:<Sunset className="w-4 h-4"/>, isha:<Moon className="w-4 h-4"/>,
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-16">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top Row: Back button + Icon + Title + Calendar links */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button 
                onClick={onBack} 
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Kembali ke Dasbor"
              >
                <ChevronLeft className="w-4 h-4"/>
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-[#0C81E4] text-white shadow-sky-600/25">
              <Clock className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                Jadwal Ibadah
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {hijri.day} {hijri.monthName} {hijri.year} H · KHGT Muhammadiyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenKalenderHijriah && (
              <button
                type="button"
                onClick={onOpenKalenderHijriah}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0C4E8C] ring-1 ring-sky-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0"
                title="Buka Kalender Hijriah"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0C81E4]" />
                <span className="hidden sm:inline">Kalender Hijriah</span>
              </button>
            )}
            {onOpenKalenderPendidikan && (
              <button
                type="button"
                onClick={onOpenKalenderPendidikan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 ring-1 ring-teal-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0"
                title="Buka Kalender Pendidikan"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden sm:inline">Kaldik</span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated Segmented Tabs */}
        <div className="flex p-1 bg-slate-50/80 rounded-2xl gap-1 border border-slate-100/80">
          {([["jadwal","Jadwal Sholat"],["kiblat","Arah Kiblat"]] as const).map(([t,l])=>(
            <button
              key={t}
              onClick={()=>{
                if(t!=="kiblat"){setHeading(null);setSensorRequested(false);}
                setTab(t);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab===t
                  ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Integrated Location Row */}
        <div className="px-3.5 py-2.5 bg-slate-50/80 rounded-2xl border border-slate-100/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{loc.name}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°</p>
            </div>
          </div>
          <button 
            onClick={getLoc} 
            disabled={locLoading} 
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/80 px-2.5 py-1 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            {locLoading?<RefreshCw className="w-3 h-3 animate-spin"/>:<Navigation className="w-3 h-3"/>}
            <span>Lokasiku</span>
          </button>
        </div>
      </div>

      {/* ── TAB: JADWAL ── */}
      {tab==="jadwal"&&<>

        {/* Next prayer countdown */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-5 py-4 flex items-center gap-4 text-white shadow-lg shadow-emerald-500/20">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">{pIcons[nextPrayer.key]}</div>
          <div className="flex-1"><p className="text-sm opacity-80">Waktu sholat berikutnya</p><p className="text-xl font-bold">{nextPrayer.name}</p></div>
          <div className="text-right"><p className="text-2xl font-bold font-mono">{nextPrayer.time}</p><p className="text-xs opacity-70">{countdownMins < 60 ? `${countdownMins}m lagi` : `${Math.floor(countdownMins/60)}j ${countdownMins%60}m`}</p></div>
        </div>

        {/* Full schedule */}
        <Card ch={<div>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800">Jadwal Sholat — {format(now,"d MMMM yyyy",{locale:id})}</p>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{hijri.day} {hijri.monthName} {hijri.year} H</span>
          </div>
          <div className="divide-y divide-slate-50">
            {prayers.map((p,i)=>{
              const isActive = i === activeIdx;
              const isNext   = i === activeIdx+1;
              return (
                <div key={p.key} className={`flex items-center gap-3 px-5 py-3.5 ${isActive?"bg-emerald-50":isNext?"bg-slate-50/80":""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive?"bg-emerald-600 text-white":isNext?"bg-slate-200 text-slate-600":"bg-slate-100 text-slate-400"}`}>{pIcons[p.key]}</div>
                  <div className="flex-1"><p className={`text-sm font-semibold ${isActive?"text-emerald-700":isNext?"text-slate-700":"text-slate-500"}`}>{p.name}</p>{isNext&&<p className="text-[10px] text-emerald-400">Berikutnya</p>}</div>
                  <p className={`font-bold font-mono ${isActive?"text-emerald-700 text-base":isNext?"text-slate-700":"text-slate-400 text-sm"}`}>{p.time}</p>
                  {isActive&&<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>}
                </div>
              );
            })}
          </div>
        </div>}/>
      </>}

      {/* ── TAB: KIBLAT ── */}
      {tab==="kiblat"&&<>

        <Card ch={<div className="py-8 flex flex-col items-center gap-6">
          <div className="relative">
            <svg width={SIZE} height={SIZE} className="overflow-visible">
              {Array.from({length:72}).map((_,i)=>{
                const a=(i*5-90)*Math.PI/180, r1=RING+18, r2=RING+(i%6===0?26:20);
                return <line key={i} x1={C+r1*Math.cos(a)} y1={C+r1*Math.sin(a)} x2={C+r2*Math.cos(a)} y2={C+r2*Math.sin(a)} stroke={i%6===0?"#94a3b8":"#e2e8f0"} strokeWidth={i%6===0?1.5:1}/>;
              })}
              {[{l:"U",a:-90},{l:"T",a:0},{l:"S",a:90},{l:"B",a:180}].map(({l,a})=>{
                const ar=(a-90)*Math.PI/180;
                return <text key={l} x={C+(RING+36)*Math.cos(ar)} y={C+(RING+36)*Math.sin(ar)} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono',monospace" fill={l==="U"?"#ef4444":"#94a3b8"}>{l}</text>;
              })}
              <circle cx={C} cy={C} r={RING} fill="none" stroke={isAligned ? "#10b981" : "#e2e8f0"} strokeWidth={isAligned ? 3 : 1.5} className="transition-all duration-300"/>
              {/* Inner decor */}
              <circle cx={C} cy={C} r={RING*0.5} fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 6"/>
              {/* Glow halos */}
              <circle cx={dotX} cy={dotY} r={24} fill="rgba(5,150,105,0.06)"/>
              <circle cx={dotX} cy={dotY} r={16} fill="rgba(5,150,105,0.12)"/>
              {/* Line from center */}
              <line x1={C} y1={C} x2={dotX} y2={dotY} stroke="#059669" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.3"/>
              {/* Kaaba dot */}
              <circle cx={dotX} cy={dotY} r={12} fill="#059669"/>
              <text x={dotX} y={dotY} textAnchor="middle" dominantBaseline="central" fontSize="12">🕋</text>
              {/* Center arrow */}
              <g transform={`rotate(${relQibla} ${C} ${C})`}>
                <polygon points={`${C},${C-30} ${C-7},${C+12} ${C+7},${C+12}`} fill={isAligned ? "#10b981" : "#059669"} opacity="0.9"/>
                <polygon points={`${C},${C+30} ${C-7},${C-12} ${C+7},${C-12}`} fill="#d1fae5" opacity="0.6"/>
              </g>
              <circle cx={C} cy={C} r={6} fill="white" stroke="#059669" strokeWidth="2"/>
            </svg>
          </div>
          <div className="text-center px-4">
            {isAligned ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono mb-2 animate-bounce">
                <span>✓ Menghadap Kiblat Tepat!</span>
              </div>
            ) : null}
            <p className="text-3xl font-bold text-slate-800 font-mono">{Math.round(dist).toLocaleString()} <span className="text-base font-normal text-slate-400">km</span></p>
            <p className="text-sm text-slate-400 mt-0.5">dari Ka'bah · Makkah</p>
            <p className="text-xs text-slate-400 mt-2 font-mono">{Math.round(qibla)}° dari Utara</p>
          </div>

          {/* Interactive manual compass tester for desktop / non-sensor */}
          {heading === null && (
            <div className="w-full px-6 pt-3 border-t border-slate-100 flex flex-col gap-2 max-w-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Simulasi Sudut Kompas:</span>
                <span className="font-mono font-bold text-emerald-700">{Math.round(demoH)}°</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={Math.round(demoH)} 
                onChange={e => setDemoH(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0° U</span>
                <span>90° T</span>
                <span>180° S</span>
                <span>270° B</span>
              </div>
            </div>
          )}

          {permDenied&&<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mx-4 text-center"><AlertCircle className="w-4 h-4 flex-shrink-0"/>Izinkan akses kompas di pengaturan browser/perangkat.</div>}
        </div>}/>
      </>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "336443539411-b7uv4udqqhbqpdmeuja54dhfsda4q7cm.apps.googleusercontent.com";

function parseJwt(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Gagal membaca Google JWT:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN MODAL (Google Identity Services + Whitelist Protection)
// ─────────────────────────────────────────────────────────────────────────────
function LoginModal({ 
  onClose, 
  onLogin, 
  authUsers = AUTH_USERS, 
  musyrifList = MUSYRIF_LIST,
  musyrifSource,
  onInjectMaster,
}: { 
  onClose: () => void; 
  onLogin: (u: AuthUser) => void; 
  authUsers?: AuthUser[]; 
  musyrifList?: Musyrif[];
  musyrifSource?: Musyrif[];
  onInjectMaster?: () => void;
}) {
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectDone, setInjectDone] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisInitializedRef = useRef(false);

  const handleInject = () => {
    if (!onInjectMaster || isInjecting) return;
    setIsInjecting(true);
    setInjectDone(false);
    try {
      onInjectMaster();
      setTimeout(() => {
        setIsInjecting(false);
        setInjectDone(true);
        setTimeout(() => setInjectDone(false), 3000);
      }, 1500);
    } catch {
      setIsInjecting(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    wadir4: "Wakil Direktur IV",
    kaur_kis: "Kaur KIS",
    koordinator_musyrif: "Koord. Musyrif",
    pamong: "Pamong Asrama",
    koordinator_gedung: "Koord. Asrama",
    musyrif: "Musyrif Asrama",
  };

  // Whitelist verification handler strictly from Google OAuth JWT
  const handleGoogleCredential = useCallback((inputEmail: string, googlePicture?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const clean = (inputEmail || "").trim().toLowerCase();

    if (!clean) {
      setErrorMsg("Email akun Google tidak terdeteksi.");
      return;
    }

    // 1. Selalu cek hardcoded AUTH_USERS dulu (tidak bergantung cloud)
    const foundAuth = AUTH_USERS.find(u => matchesEmail(u.email, clean));
    if (foundAuth) {
      const userToLogin: AuthUser = {
        ...foundAuth,
        picture: googlePicture || foundAuth.picture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundAuth.name} (${ROLE_LABELS[foundAuth.role] || "Pengelola"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    // 2. Selalu cek hardcoded MUSYRIF_LIST dulu (tidak bergantung cloud)
    const foundInHardcoded = MUSYRIF_LIST.find(m => matchesEmail(m.email, clean));
    if (foundInHardcoded) {
      const assignedRole: Role = (foundInHardcoded.role as Role) || "musyrif";
      const userToLogin: AuthUser = {
        id: foundInHardcoded.id,
        name: foundInHardcoded.name,
        email: clean,
        role: assignedRole,
        asrama: foundInHardcoded.asrama,
        musyrifId: foundInHardcoded.id,
        picture: googlePicture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundInHardcoded.name} (${ROLE_LABELS[assignedRole] || "Musyrif"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    // 3. Fallback: cek cloud data (authUsers & musyrifList dari Google Sheets)
    const cloudAuthList = (authUsers && authUsers.length > 0) ? authUsers : [];
    const foundCloudAuth = cloudAuthList.find(u => matchesEmail(u.email, clean));
    if (foundCloudAuth) {
      const userToLogin: AuthUser = {
        ...foundCloudAuth,
        picture: googlePicture || foundCloudAuth.picture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundCloudAuth.name} (${ROLE_LABELS[foundCloudAuth.role] || "Pengelola"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    const currentList = musyrifSource || musyrifList || [];
    const foundInList = currentList.find(m => matchesEmail(m.email, clean));
    if (foundInList) {
      const assignedRole: Role = (foundInList.role as Role) || "musyrif";
      const userToLogin: AuthUser = {
        id: foundInList.id,
        name: foundInList.name,
        email: clean,
        role: assignedRole,
        asrama: foundInList.asrama,
        musyrifId: foundInList.id,
        picture: googlePicture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundInList.name} (${ROLE_LABELS[assignedRole] || "Musyrif"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    // Rejected - Not in authorized Whitelist
    setErrorMsg(`Akses Ditolak: Akun Google "${inputEmail}" tidak terdaftar dalam database Musyrif maupun Pengelola.`);
  }, [onLogin, onClose, authUsers, musyrifList, musyrifSource]);

  // Initialize official Google Identity Services
  useEffect(() => {
    let active = true;
    const initGis = () => {
      try {
        // @ts-ignore
        if (active && typeof window !== "undefined" && window.google?.accounts?.id && googleBtnRef.current && !gisInitializedRef.current) {
          gisInitializedRef.current = true;
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response?.credential) {
                const payload = parseJwt(response.credential);
                if (payload?.email) {
                  handleGoogleCredential(payload.email, payload.picture);
                } else {
                  setErrorMsg("Gagal membaca profil akun Google.");
                }
              }
            },
            auto_select: false,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = "";
            // @ts-ignore
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left",
              width: 280,
            });
            setIsGisLoaded(true);
          }
        }
      } catch (e) {
        console.warn("GSI notice:", e);
      }
    };

    initGis();
    const timer = setInterval(() => {
      // @ts-ignore
      if (window.google?.accounts?.id && !gisInitializedRef.current) {
        initGis();
        clearInterval(timer);
      }
    }, 300);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [handleGoogleCredential]);

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => { triggerHaptic("light"); onClose(); }}
    >
      <motion.div 
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              P
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 tracking-tight">Presensi Asrama</h2>
              <p className="text-[10px] text-slate-400">Portal Pamong & Koordinator</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }} 
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-2xs active:scale-90"
          >
            <X className="w-4 h-4 text-slate-500"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-slate-50 shadow-xs flex items-center justify-center border border-slate-200/80 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          
          <h3 className="text-base font-bold text-slate-800">Masuk Akun Google</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-[260px] leading-relaxed">
            Gunakan akun Google yang terdaftar sebagai Pamong atau Koordinator
          </p>

          {/* Centered Google Button */}
          <div className="w-full flex items-center justify-center min-h-[48px] overflow-visible">
            <div 
              ref={googleBtnRef} 
              className="flex items-center justify-center [&>div]:!mx-auto [&>iframe]:!mx-auto" 
              style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}
            />
          </div>

          {/* Fallback button if GIS script still loading */}
          {!isGisLoaded && (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  try {
                    // @ts-ignore
                    if (window.google?.accounts?.id) {
                      // @ts-ignore
                      window.google.accounts.id.prompt();
                    } else {
                      setErrorMsg("Sedang memuat Google SDK...");
                    }
                  } catch {
                    setErrorMsg("Gagal memanggil Google Login. Silakan coba lagi.");
                  }
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2.5 shadow-sm transition-all text-xs font-semibold mt-1 active:scale-95"
              >
                <span>Login dengan Google</span>
              </button>
            </div>
          )}

          {/* Error Alert with recovery hint */}
          {errorMsg && (
            <div className="w-full mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col gap-1.5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2 text-rose-700">
                <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-rose-600 leading-relaxed font-medium">{errorMsg}</p>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/60 leading-relaxed">
                💡 <b>Petunjuk:</b> Jika email Anda sudah resmi namun belum terdeteksi, silakan klik tombol <b>"Pulihkan Data"</b> di pojok kanan bawah, lalu coba login kembali.
              </p>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="w-full mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-700 text-left animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-emerald-600 leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> Whitelist Terproteksi
          </span>
          {onInjectMaster && (
            <button
              type="button"
              onClick={handleInject}
              disabled={isInjecting}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
              style={{ background: injectDone ? "#d1fae5" : "#f1f5f9", color: injectDone ? "#065f46" : "#475569" }}
            >
              {isInjecting ? (
                <><RefreshCw className="w-3 h-3 animate-spin"/> Memulihkan...</>
              ) : injectDone ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-600"/> Berhasil!</>
              ) : (
                <><RefreshCw className="w-3 h-3"/> Pulihkan Data</>
              )}
            </button>
          )}
        </div>

      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY_RECORDS = "presensi_attendance_records_v5";
const STORAGE_KEY_IZIN = "presensi_izin_requests_v5";
const STORAGE_KEY_KEGIATAN = "presensi_kegiatan_asrama_v5";
const STORAGE_KEY_LOGBOOK = "presensi_jurnal_logbook_v5";
const STORAGE_KEY_MUTABAAH = "presensi_mutabaah_yaumiyah_v5";
const STORAGE_KEY_SANTRI_SAKIT = "presensi_santri_sakit_v5";
const STORAGE_KEY_PENGASUHAN_KHUSUS = "presensi_pengasuhan_khusus_v5";
const STORAGE_KEY_SANTRI_IZIN = "presensi_santri_izin_v5";
const STORAGE_KEY_SANTRI = "presensi_santri_master_v10";
const STORAGE_KEY_SANTRI_REQUESTS = "presensi_santri_change_requests_v1";
const STORAGE_KEY_MUSYRIF = "presensi_musyrif_master_v5";
const STORAGE_KEY_AUTH_USERS = "presensi_auth_users_master_v5";
const STORAGE_KEY_AGENDA_RAPAT = "presensi_agenda_rapat_v5";
const SYNC_TABLE_AUTH_USERS = "AuthUsers";

const DEFAULT_ALL_PERSONNEL: Musyrif[] = [
  // ─── PIMPINAN & DIREKSI MADRASAH (MONITORING / OVERSIGHT) ───
  {
    id: "wadir4",
    name: "Ahmad Salim, S.E.I., Lc.",
    role: "wadir4",
    asrama: "Semua Asrama",
    kamar: "Direksi Madrasah",
    kelas: "Seluruh Tingkat",
    tingkat: "Semua Tingkat",
    pamong: "Direksi Madrasah",
    email: "ahmadsalim91@gmail.com",
    phone: "6281226310736"
  },
  {
    id: "kaurkis",
    name: "Muhammad Shaleh, S.Pd.I., M.S.I.",
    role: "kaur_kis",
    asrama: "Semua Asrama",
    kamar: "Kantor KIS",
    kelas: "Seluruh Tingkat",
    tingkat: "Semua Tingkat",
    pamong: "Pimpinan Asrama",
    email: "muhammad.shaleh@muallimin.sch.id",
    phone: "6281578968855"
  },

  // ─── KOORDINATOR MUSYRIF (SUPER ADMIN / PIMPINAN) ───
  { 
    id: "k1", 
    name: "Andi Aqillah Fadia Haswat, S.A.P.", 
    role: "koordinator_musyrif", 
    asrama: "Semua Asrama", 
    kamar: "Kantor Koordinator", 
    kelas: "Seluruh Tingkat", 
    tingkat: "Semua Tingkat", 
    pamong: "Pimpinan Asrama", 
    email: "andiaqillahfadiahaswat@gmail.com", 
    phone: "6285339213109" 
  },

  // ─── PAMONG ASRAMA ───
  { 
    id: "p1",  
    name: "Galang Putra Muhammady, S.Pd.",     
    role: "pamong", 
    asrama: "Asrama 1", 
    kamar: "Ruang Pamong 1", 
    kelas: "Kelas 5 & 6", 
    tingkat: "Kelas 5", 
    pamong: "Pimpinan Asrama", 
    email: "galangmuhammady@muallimin.sch.id",          
    phone: "6287711559827" 
  },
  { 
    id: "p2",  
    name: "Aulia Abdan Idza Shalla, S.Th.I.",  
    role: "pamong", 
    asrama: "Asrama 8A & 8C Kelas 6", 
    kamar: "Ruang Pamong 8A & 8C", 
    kelas: "Kelas 6 (6 A - 6 E)", 
    tingkat: "Kelas 6", 
    pamong: "Pimpinan Asrama", 
    email: "auliaabdan@muallimin.sch.id",     
    phone: "6285725891945" 
  },
  { 
    id: "p3",  
    name: "Anang Fathurrahman, Lc.",           
    role: "pamong", 
    asrama: "Asrama 8B & 8C Kelas 5", 
    kamar: "Ruang Pamong 8B & 8C", 
    kelas: "Kelas 5 (5 A - 5 D)", 
    tingkat: "Kelas 5", 
    pamong: "Pimpinan Asrama", 
    email: "abukaysan86@gmail.com",    
    phone: "6281804181182" 
  },
  { 
    id: "p4",  
    name: "Inggit Prabowo, S.Pd.",             
    role: "pamong", 
    asrama: "Asrama 10", 
    kamar: "Ruang Pamong 10", 
    kelas: "Kelas 5 & 6", 
    tingkat: "Kelas 5", 
    pamong: "Pimpinan Asrama", 
    email: "inggitprabowo13@gmail.com",  
    phone: "6285377407742" 
  },
  { 
    id: "p5", 
    name: "Rais Yudhistira, Lc.",              
    role: "pamong", 
    asrama: "Asrama Sedayu Gedung A", 
    kamar: "Ruang Pamong Gedung A", 
    kelas: "Kelas 1 - 4", 
    tingkat: "Kelas 1", 
    pamong: "Pimpinan Asrama", 
    email: "raiscutis@gmail.com, cutisrais@gmail.com",              
    phone: "6281399548580" 
  },
  { 
    id: "p6",  
    name: "Muh. Ahnaf Lubab, M.Pd.",           
    role: "pamong", 
    asrama: "Asrama Sedayu Gedung B", 
    kamar: "Ruang Pamong Gedung B", 
    kelas: "Kelas 1 - 4", 
    tingkat: "Kelas 1", 
    pamong: "Pimpinan Asrama", 
    email: "ahnaflubab@muallimin.sch.id",      
    phone: "6285779006160" 
  },
  { 
    id: "p7",  
    name: "M. Ismail Marzuq, S.Sos.",          
    role: "pamong", 
    asrama: "Asrama Sedayu Gedung C", 
    kamar: "Ruang Pamong Gedung C", 
    kelas: "Kelas 1 - 4", 
    tingkat: "Kelas 2", 
    pamong: "Pimpinan Asrama", 
    email: "izmaelpoenya04@gmail.com",         
    phone: "6285326693918" 
  },
  { 
    id: "p8",  
    name: "Ariel Amarta Dzikrillah, S.Sos.",   
    role: "pamong", 
    asrama: "Asrama Sedayu Gedung D", 
    kamar: "Ruang Pamong Gedung D", 
    kelas: "Kelas 1 - 4", 
    tingkat: "Kelas 1", 
    pamong: "Pimpinan Asrama", 
    email: "arilamarta@gmail.com",             
    phone: "6285848589328" 
  },

  // ─── DAFTAR MUSYRIF (Termasuk Koordinator Gedung yang juga Musyrif) ───
  ...MUSYRIF_LIST
];

const DEPRECATED_PERSONNEL_IDS = new Set([
  "m8b", "m50", "k2", "p5a", "p5b", "g1", "g2", "g3", "g4", "g5", "g6",
  "m_1787054333371",
  "m_1787054789315",
  "m_1787055011646",
  "m_1787034667866"
]);

function sanitizeMusyrifList(rawList: Musyrif[]): Musyrif[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return DEFAULT_ALL_PERSONNEL;

  // 1. Filter out deprecated IDs and test records
  const filtered = rawList.filter(p => {
    if (!p || !p.id) return false;
    const nameLow = (p.name || "").toLowerCase();
    const emailLow = (p.email || "").toLowerCase();
    const isTestItem = nameLow.includes("testing") || nameLow.includes("test ") || emailLow.includes("testing");

    if (
      DEPRECATED_PERSONNEL_IDS.has(p.id) ||
      nameLow.includes("naufal muzakki") ||
      isTestItem ||
      (p.id.startsWith("m_") && (p.role === "pamong" || p.role === "koordinator_musyrif" || !p.name || p.name.trim() === "" || isTestItem)) ||
      (p.id.startsWith("g") && (p.role === "koordinator_gedung" || p.role === "musyrif" || !p.role))
    ) {
      return false;
    }
    return true;
  });

  // 2. Normalization (Cloud & User SCRUD is 100% SSOT)
  const normalized = filtered.map(p => {
    if (p.id === "m49" && (!p.kelas || p.kelas === "5 Upper C")) {
      return { ...p, kelas: "5 Upper C & 6 Internasional", kamar: "5 Upper C & 6 Int.", tingkat: "Kelas 5 & 6" };
    }
    return p;
  });

  // 3. Deduplicate by ID
  const seenIds = new Set<string>();
  const deduped: Musyrif[] = [];

  for (const item of normalized) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduped.push(item);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY_MUSYRIF, JSON.stringify(deduped));
  } catch {}
  
  return deduped;
}

export default function App() {
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);
  const [musyrifList, setMusyrifList] = useState<Musyrif[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUSYRIF);
      if (saved) {
        const parsed: Musyrif[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeMusyrifList(parsed);
        }
      }
    } catch {}
    return DEFAULT_ALL_PERSONNEL;
  });

  const [authUsers, setAuthUsers] = useState<AuthUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return AUTH_USERS;
  });

  const [authUser, setAuthUser] = useState<AuthUser|null>(() => {
    try {
      const saved = localStorage.getItem("presensi_auth_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const cleanEmail = parsed?.email?.toLowerCase();
      if (!cleanEmail) return null;
      
      const validAuth = ((): AuthUser | undefined => {
        try {
          const savedAuthUsers = localStorage.getItem(STORAGE_KEY_AUTH_USERS);
          if (savedAuthUsers) {
            const parsedAuth = JSON.parse(savedAuthUsers);
            if (Array.isArray(parsedAuth)) {
              return parsedAuth.find((u: AuthUser) => matchesEmail(u.email, cleanEmail));
            }
          }
        } catch {}
        return AUTH_USERS.find(u => matchesEmail(u.email, cleanEmail));
      })();
      if (validAuth) return { ...validAuth, picture: parsed.picture || validAuth.picture };

      const validMusyrif = (musyrifList && musyrifList.length > 0 ? musyrifList : MUSYRIF_LIST).find(m => matchesEmail(m.email, cleanEmail));
      if (validMusyrif) {
        const assignedRole: Role = (validMusyrif.role as Role) || "musyrif";
        return {
          id: validMusyrif.id,
          name: validMusyrif.name,
          email: cleanEmail,
          role: assignedRole,
          asrama: validMusyrif.asrama,
          musyrifId: validMusyrif.id,
          picture: parsed.picture,
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // State for Izin Requests
  const [izinList, setIzinList] = useState<IzinRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_IZIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // State for Kegiatan Records (Agenda Khusus Asrama)
  const [kegiatanRecords, setKegiatanRecords] = useState<KegiatanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KEGIATAN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // State for Agenda Rapat & Pertemuan Musyrif (Logbook Dinamis)
  const [agendaRapatList, setAgendaRapatList] = useState<AgendaRapatRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AGENDA_RAPAT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_AGENDA_RAPAT, JSON.stringify(agendaRapatList)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [agendaRapatList]);

  const handleSaveAgendaRapat = useCallback((agenda: AgendaRapatRecord) => {
    setAgendaRapatList(prev => {
      const existingIndex = prev.findIndex(a => a.id === agenda.id);
      let updated: AgendaRapatRecord[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = agenda;
      } else {
        updated = [agenda, ...prev];
      }
      try { localStorage.setItem(STORAGE_KEY_AGENDA_RAPAT, JSON.stringify(updated)); } catch {}
      return updated;
    });
    googleSyncService.enqueue("agenda_rapat", { ...agenda });
  }, []);

  const handleDeleteAgendaRapat = useCallback((agendaId: string) => {
    setAgendaRapatList(prev => {
      const updated = prev.filter(a => a.id !== agendaId);
      try { localStorage.setItem(STORAGE_KEY_AGENDA_RAPAT, JSON.stringify(updated)); } catch {}
      return updated;
    });
    googleSyncService.enqueue("agenda_rapat", { id: agendaId, _deleted: true });
  }, []);

  // State for Jurnal Logbook Harian Musyrif (Dimulai Serentak 18 Agustus 2026)
  const [logbookData, setLogbookData] = useState<LogbookStorage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGBOOK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null) {
          const cleaned: LogbookStorage = {};
          Object.entries(parsed).forEach(([mId, dateEntries]) => {
            if (dateEntries && typeof dateEntries === "object") {
              cleaned[mId] = {};
              Object.entries(dateEntries).forEach(([dt, entry]) => {
                if (dt >= "2026-08-18") {
                  cleaned[mId][dt] = entry as any;
                }
              });
            }
          });
          return cleaned;
        }
      }
    } catch {}
    return {};
  });

  // State for Mutabaah Yaumiyah (Ibadah Sunnah - Dimulai Serentak 18 Agustus 2026)
  const [mutabaahData, setMutabaahData] = useState<MutabaahStorage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUTABAAH);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null) {
          const cleaned: MutabaahStorage = {};
          Object.entries(parsed).forEach(([mId, dateEntries]) => {
            if (dateEntries && typeof dateEntries === "object") {
              cleaned[mId] = {};
              Object.entries(dateEntries).forEach(([dt, entry]) => {
                if (dt >= "2026-08-18") {
                  cleaned[mId][dt] = entry as any;
                }
              });
            }
          });
          return cleaned;
        }
      }
    } catch {}
    return {};
  });

  // State for Santri Sakit Records
  const [santriSakitList, setSantriSakitList] = useState<SantriSakitRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SANTRI_SAKIT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // State for Tugas Pengasuhan Khusus (Antar PKU/RS & Bimbingan Santri)
  const [pengasuhanKhususList, setPengasuhanKhususList] = useState<PengasuhanKhususRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PENGASUHAN_KHUSUS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // State for Perizinan Santri Asrama (SOP Sedayu)
  const [santriIzinList, setSantriIzinList] = useState<SantriIzinRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SANTRI_IZIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Immediately enrich with master santri dataset on boot
          return parsed.map(item => {
            if (!item.namaSantri) return item;
            const rawName = item.namaSantri.trim().toLowerCase();
            const matched = ALL_SANTRI_DATA.find(s => {
              if (!s.nama) return false;
              const sName = s.nama.trim().toLowerCase();
              return sName === rawName || sName.includes(rawName) || rawName.includes(sName);
            });
            return {
              ...item,
              asrama: item.asrama && item.asrama !== "Kampus Asrama" ? item.asrama : (matched?.asrama || (matched?.tingkat && parseInt(matched.tingkat) <= 2 ? "Asrama 1" : "Asrama 2") || "Asrama 1"),
              kamar: item.kamar && item.kamar !== "Kamar" ? item.kamar : (matched?.kamar || "Kamar"),
              kelas: item.kelas && item.kelas !== "Kelas Asrama" ? item.kelas : (matched?.kelasLengkap || "Kelas 1 A"),
              nisn: item.nisn && item.nisn !== "-" ? item.nisn : (matched?.nisn || "-")
            };
          }).filter(x => Boolean(x?.namaSantri && x.namaSantri.trim()));
        }
      }
    } catch {}
    return [];
  });
  const [isLoadingIzinSedayu, setIsLoadingIzinSedayu] = useState<boolean>(true);

  // Master Database Santri (SCRUD by Koordinator Musyrif)
  const [santriList, setSantriList] = useState<SantriData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SANTRI);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy duplicates if present
          return parsed.filter(s => s.id !== "s1007" && s.id !== "s986");
        }
      }
    } catch {}
    return ALL_SANTRI_DATA;
  });

  // Santri Change Requests (Edit/Transfer/Delete approval system)
  const [santriRequests, setSantriRequests] = useState<SantriChangeRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SANTRI_REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Modals Visibility
  const [showWA, setShowWA] = useState(false);
  const [showIzin, setShowIzin] = useState(false);
  const [showSantriIzin, setShowSantriIzin] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showKegiatan, setShowKegiatan] = useState(false);
  const [showLogbook, setShowLogbook] = useState(false);
  const [showMutabaah, setShowMutabaah] = useState(false);
  const [showSantriSakit, setShowSantriSakit] = useState(false);
  const [showPengasuhanKhusus, setShowPengasuhanKhusus] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRaport, setShowRaport] = useState(false);
  const [showMusyrifManager, setShowMusyrifManager] = useState(false);
  const [showPamongManager, setShowPamongManager] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [targetMusyrifId, setTargetMusyrifId] = useState<string | undefined>(undefined);
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);
  const [targetTaskKey, setTargetTaskKey] = useState<string | undefined>(undefined);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      showToast("Untuk memasang aplikasi, buka menu peramban Anda (titik tiga atau tombol bagikan) lalu pilih 'Tambahkan ke Layar Utama'.", "info");
    }
  };

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [page, setPage] = useState<Page>("dashboard");
  const [targetAsramaForPresensi, setTargetAsramaForPresensi] = useState<string | null>(null);
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [now, setNow] = useState(() => getTrustedDate());
  const [timeSyncState, setTimeSyncState] = useState<TimeSyncState | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "info" | "error" } | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<"feed" | "grid">("feed");

  const canDeletePhoto = Boolean(
    authUser && (
      authUser.role === "koordinator_musyrif" ||
      authUser.role === "admin" ||
      authUser.role === "wadir4" ||
      authUser.role === "kaur_kis" ||
      authUser.role === "pamong"
    )
  );

  // Global GPS State - checked once when app loads
  const [globalGpsResult, setGlobalGpsResult] = useState<GeofenceResult | null>(null);
  const [isCheckingGlobalGps, setIsCheckingGlobalGps] = useState(false);

  // Check GPS on app load (for Musyrif role)
  useEffect(() => {
    if (authUser?.role === "musyrif") {
      const asrama = authUser.asrama || "Asrama 1";
      setIsCheckingGlobalGps(true);
      checkAsramaGeofenceBrowser(asrama).then(res => {
        setGlobalGpsResult(res);
        setIsCheckingGlobalGps(false);
      }).catch(() => {
        setGlobalGpsResult(null);
        setIsCheckingGlobalGps(false);
      });
    }
  }, [authUser]);

  // Sync PWA status bar theme-color and html/body background for Explore page
  useEffect(() => {
    const isExplore = page === "galeri-logbook";
    const targetBg = isExplore ? "#ffffff" : "#F4F8FF";
    const targetThemeColor = isExplore ? "#ffffff" : "#0C4E8C";
    
    document.documentElement.style.backgroundColor = targetBg;
    document.body.style.backgroundColor = targetBg;
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", targetThemeColor);
    }
  }, [page]);

  // Clear target asrama when navigating away from presensi pages
  useEffect(() => {
    if (page !== "subuh" && page !== "maghrib") {
      setTargetAsramaForPresensi(null);
    }
  }, [page]);

  // Prayer Calculation for Alarm and Global Widgets
  const rootPrayerTimes = useMemo(() => calcPrayerTimes(now, -7.807631, 110.350905, 7), [now]);
  const rootNowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const rootActiveIdx = [...rootPrayerTimes].reduce((best, p, i) => p.raw <= rootNowH ? i : best, -1);
  const nextPrayer = rootPrayerTimes[(rootActiveIdx + 1) % rootPrayerTimes.length];

  // Dynamic Navigation Items based on Role / Public Mode
  const navItems = useMemo(() => {
    const currentPrayerSlot: Page = getTrustedDate().getHours() < 12 ? "subuh" : "maghrib";
    if (!authUser) {
      return [
        { id: "dashboard" as Page, label: "Dasbor", Icon: LayoutDashboard },
        { id: "galeri-logbook" as Page, label: "Explore", Icon: Compass },
        { id: "ibadah" as Page, label: "Ibadah", Icon: Moon },
      ];
    }
    if (authUser.role === "musyrif") {
      return [
        { id: "dashboard" as Page, label: "Dasbor", Icon: LayoutDashboard },
        { id: "galeri-logbook" as Page, label: "Explore", Icon: Compass },
        { id: currentPrayerSlot, label: "Presensi", Icon: Sun },
        { id: "logbook" as Page, label: "Logbook", Icon: ClipboardList },
        { id: "riwayat" as Page, label: "Riwayat", Icon: BookOpen },
      ];
    }
    return [
      { id: "dashboard" as Page, label: "Dasbor", Icon: LayoutDashboard },
      { id: "galeri-logbook" as Page, label: "Explore", Icon: Compass },
      { id: currentPrayerSlot, label: "Presensi", Icon: Sun },
      { id: "logbook" as Page, label: "Logbook", Icon: ClipboardList },
      { id: "riwayat" as Page, label: "Riwayat", Icon: BookOpen },
    ];
  }, [authUser]);

  // Route Fallback when in public mode or role restrictions
  useEffect(() => {
    if (!authUser) {
      if (page === "subuh" || page === "maghrib" || page === "riwayat" || page === "musyrif-manager" || page === "pamong-manager" || page === "logbook" || page === "notifikasi" || page === "rekap") {
        setPage("dashboard");
      }
    } else if (authUser.role !== "koordinator_musyrif") {
      if (page === "musyrif-manager" || page === "pamong-manager") {
        setPage("dashboard");
        showToast("Akses ditolak: Menu Master Data hanya untuk Koordinator Musyrif.", "error");
      }
    }
  }, [authUser, page]);

  // Always reset scroll position to top whenever page changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [page]);

  useEffect(() => {
    const unsub = subscribeTimeSync((st) => {
      setTimeSyncState(st);
      setNow(st.serverDate);
    });
    return unsub;
  }, []);

  const showToast = useCallback((message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // Save records to local working cache with debounce to avoid blocking UI main thread
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [records]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(izinList)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [izinList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_KEGIATAN, JSON.stringify(kegiatanRecords)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [kegiatanRecords]);

  // OPTIMIZATION: Use debounced persistence with change detection for logbookData
  // This avoids unnecessary JSON.stringify calls when data hasn't changed
  useDebouncedPersistence(STORAGE_KEY_LOGBOOK, logbookData, 400);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_MUTABAAH, JSON.stringify(mutabaahData)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [mutabaahData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_SANTRI_SAKIT, JSON.stringify(santriSakitList)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [santriSakitList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_PENGASUHAN_KHUSUS, JSON.stringify(pengasuhanKhususList)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [pengasuhanKhususList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(santriIzinList)); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [santriIzinList]);

  // Synchronize Perizinan Santri directly with Izin Sedayu Google Sheets
  useEffect(() => {
    let isMounted = true;
    const initialStartTime = Date.now();
    let pollInterval: ReturnType<typeof setInterval>;
    let isSyncing = false; // GUARD: Prevent overlapping sync calls

    const syncIzinSedayu = async (isFirst = false) => {
      // GUARD: Prevent overlapping sync calls
      if (isSyncing) {
        console.log('[App] syncIzinSedayu already running, skipping');
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (isMounted) setIsLoadingIzinSedayu(false);
        return;
      }

      isSyncing = true;
      try {
        if (isFirst && isMounted) {
          setIsLoadingIzinSedayu(true);
        }
        const cloudIzin = await fetchIzinSedayuFromCloud();
        if (isMounted && cloudIzin && cloudIzin.length > 0) {
          setSantriIzinList(prev => {
            const map = new Map<string, SantriIzinRecord>();
            prev.filter(x => Boolean(x?.namaSantri && x.namaSantri.trim())).forEach(item => map.set(item.nomorSurat || item.id, item));
            cloudIzin.filter(x => Boolean(x?.namaSantri && x.namaSantri.trim())).forEach(item => {
              const key = item.nomorSurat || item.id;
              map.set(key, { ...(map.get(key) || {}), ...item });
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          });
        }
      } catch (_) {
      } finally {
        isSyncing = false;
        if (isMounted) {
          if (isFirst) {
            const elapsed = Date.now() - initialStartTime;
            const remaining = Math.max(0, 1500 - elapsed);
            setTimeout(() => {
              if (isMounted) setIsLoadingIzinSedayu(false);
            }, remaining);
          } else {
            setIsLoadingIzinSedayu(false);
          }
        }
      }
    };

    // Delayed start: wait for main sync to settle first
    const startTimeout = setTimeout(() => {
      if (!isMounted) return;
      syncIzinSedayu(true);
      // Slower polling interval (2 min instead of 1 min)
      pollInterval = setInterval(() => syncIzinSedayu(false), 120000);
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_MUSYRIF, JSON.stringify(musyrifList)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [musyrifList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_AUTH_USERS, JSON.stringify(authUsers)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [authUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(santriList)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [santriList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY_SANTRI_REQUESTS, JSON.stringify(santriRequests)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [santriRequests]);

  // Initial Cloud Hydration & Realtime Delta Subscription
  useEffect(() => {
    // 1. Subscribe to incoming delta updates from Google Sheets
    const unsubData = googleSyncService.subscribeDataUpdates((tableName, cloudRecords, isFullReplace) => {
      const tbl = tableName.toLowerCase();

      // Full replace: merge cleanly with local state without wiping un-synced data
      if (isFullReplace) {
        if (tbl === "records" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.musyrifId && cr.date);
          setRecords(prev => {
            const map = new Map<string, AttendanceRecord>();
            prev.filter(r => Boolean(r && r.musyrifId && r.date)).forEach(r => map.set(`${r.musyrifId}_${r.date}`, r));
            validCloud.forEach((cr: any) => {
              const key = `${cr.musyrifId}_${cr.date}`;
              map.set(key, { ...(map.get(key) || {}), ...cr });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if (tbl === "izin" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.id);
          setIzinList(prev => {
            const map = new Map<string, IzinRequest>();
            prev.filter(i => Boolean(i && i.id)).forEach(i => map.set(i.id, i));
            validCloud.forEach((cr: any) => {
              map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if ((tbl === "agenda_rapat" || tbl === "agendarapat") && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && !cr._deleted && cr.id);
          setAgendaRapatList(prev => {
            const map = new Map<string, AgendaRapatRecord>();
            prev.filter(a => Boolean(a && a.id)).forEach(a => map.set(a.id, a));
            validCloud.forEach((cr: any) => {
              let invited = cr.invitedMusyrifIds;
              if (typeof invited === "string") {
                if (invited.trim().startsWith("[")) {
                  try { invited = JSON.parse(invited); } catch (_) { invited = []; }
                } else {
                  invited = invited.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
              }
              if (!Array.isArray(invited)) invited = [];

              let asramaList = cr.targetAsramaList;
              if (typeof asramaList === "string") {
                if (asramaList.trim().startsWith("[")) {
                  try { asramaList = JSON.parse(asramaList); } catch (_) { asramaList = []; }
                } else {
                  asramaList = asramaList.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
              }

              const normalizedAgenda: AgendaRapatRecord = {
                ...cr,
                invitedMusyrifIds: invited,
                targetAsramaList: Array.isArray(asramaList) ? asramaList : undefined,
                locationLat: cr.locationLat ? Number(cr.locationLat) : undefined,
                locationLng: cr.locationLng ? Number(cr.locationLng) : undefined,
                locationRadius: cr.locationRadius ? Number(cr.locationRadius) : undefined
              };
              map.set(cr.id, { ...(map.get(cr.id) || {}), ...normalizedAgenda });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_AGENDA_RAPAT, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if (tbl === "kegiatan" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.id);
          setKegiatanRecords(prev => {
            const map = new Map<string, KegiatanRecord>();
            prev.filter(k => Boolean(k && k.id)).forEach(k => map.set(k.id, k));
            validCloud.forEach((cr: any) => {
              map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_KEGIATAN, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if (tbl === "santrisakit" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.id);
          setSantriSakitList(prev => {
            const map = new Map<string, SantriSakitRecord>();
            prev.filter(s => Boolean(s && s.id)).forEach(s => map.set(s.id, s));
            validCloud.forEach((cr: any) => {
              const existing = map.get(cr.id);
              const finalPhotoUrl = cr.photoUrl || existing?.photoUrl;

              map.set(cr.id, {
                ...(existing || {}),
                ...cr,
                ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {})
              });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_SANTRI_SAKIT, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if ((tbl === "pengasuhankhusus" || tbl === "pengasuhan_khusus") && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.id);
          setPengasuhanKhususList(prev => {
            const map = new Map<string, PengasuhanKhususRecord>();
            prev.filter(p => Boolean(p && p.id)).forEach(p => map.set(p.id, p));
            validCloud.forEach((cr: any) => {
              const existing = map.get(cr.id);
              const finalPhotoUrl = cr.photoUrl || existing?.photoUrl;

              map.set(cr.id, {
                ...(existing || {}),
                ...cr,
                ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {})
              });
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_PENGASUHAN_KHUSUS, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if ((tbl === "dataperizinansantri" || tbl === "santriizin" || tbl === "dataperizinan") && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.namaSantri && cr.namaSantri.trim() !== "");
          if (validCloud.length > 0) {
            setSantriIzinList(prev => {
              const map = new Map<string, SantriIzinRecord>();
              prev.filter(x => Boolean(x?.namaSantri && x.namaSantri.trim())).forEach(item => map.set(item.nomorSurat || item.id, item));
              validCloud.forEach((cr: any) => {
                const mapped = mapIzinSedayuToRecord(cr);
                const key = mapped.nomorSurat || mapped.id;
                map.set(key, { ...(map.get(key) || {}), ...mapped });
              });
              const merged = Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              );
              try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(merged)); } catch {}
              return merged;
            });
          }
        } else if (tbl === "santri" && Array.isArray(cloudRecords) && cloudRecords.length > 0) {
          setSantriList(prev => {
            const map = new Map<string, SantriData>();
            ALL_SANTRI_DATA.forEach(s => map.set(s.id, s));
            cloudRecords.forEach((cr: any) => {
              if (cr.is_deleted) {
                map.delete(cr.id);
              } else {
                map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
              }
            });
            const merged = Array.from(map.values());
            try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(merged)); } catch {}
            return merged;
          });
        } else if (tbl === "musyrif" && Array.isArray(cloudRecords) && cloudRecords.length > 0) {
          setMusyrifList(sanitizeMusyrifList(cloudRecords));
        } else if (tbl === "authusers" && Array.isArray(cloudRecords) && cloudRecords.length > 0) {
          setAuthUsers(cloudRecords);
          // Cascade picture to current authUser from cloud sync
          if (authUser) {
            const myCloudAuth = cloudRecords.find((u: any) => u.id === authUser.id || (u.email && authUser.email && u.email.toLowerCase() === authUser.email.toLowerCase()));
            if (myCloudAuth?.picture) {
              setAuthUser(prev => prev ? { ...prev, picture: myCloudAuth.picture } : prev);
              // Also update localStorage
              try {
                const saved = localStorage.getItem("presensi_auth_user");
                if (saved) {
                  const parsed = JSON.parse(saved);
                  parsed.picture = myCloudAuth.picture;
                  localStorage.setItem("presensi_auth_user", JSON.stringify(parsed));
                }
              } catch {}
            }
          }
          // Cascading sync: propagate updated pamong names to musyrifList
          const pamongsInAuth = cloudRecords.filter((u: any) => u.role === "pamong");
          if (pamongsInAuth.length > 0) {
            setMusyrifList(prev => sanitizeMusyrifList(prev.map(m => {
              const matchingPamong = pamongsInAuth.find((p: any) => p.asrama === m.asrama);
              if (matchingPamong && m.role !== "pamong" && m.role !== "koordinator_musyrif") {
                return { ...m, pamong: matchingPamong.name };
              }
              return m;
            })));
          }
        } else if (tbl === "logbook" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.musyrifId && cr.date && cr.date >= "2026-08-18");
          // Proactively purge any legacy cloud records before official start date 18 Agustus 2026
          cloudRecords.forEach((cr: any) => {
            if (cr.date && cr.date < "2026-08-18" && !cr.is_deleted) {
              googleSyncService.enqueue("Logbook", { id: cr.id }, "delete");
            }
          });
          setLogbookData(prev => {
            const next: LogbookStorage = { ...prev };
            validCloud.forEach((cr: any) => {
              const mId = cr.musyrifId;
              const dt = cr.date;
              if (!next[mId]) next[mId] = {};
              if (!next[mId][dt]) next[mId][dt] = { ...EMPTY_LOGBOOK };

              if (cr.taskKey) {
                if (cr.taskKey === "generalNotes") {
                  next[mId][dt].generalNotes = cr.generalNotes || cr.notes || "";
                } else {
                  let taskObj: any = {};
                  if (typeof cr.taskData === "object" && cr.taskData !== null) {
                    taskObj = { ...cr.taskData };
                  } else if (typeof cr.taskData === "string" && cr.taskData.trim().startsWith("{")) {
                    try { taskObj = JSON.parse(cr.taskData); } catch (_) {}
                  }

                  const isDone = cr.done === true || cr.done === "TRUE" || cr.done === "true" || cr.done === 1 || Boolean(taskObj.done);
                  const isGps = cr.gpsVerified === true || cr.gpsVerified === "TRUE" || cr.gpsVerified === "true" || Boolean(taskObj.gpsVerified);
                  const cloudPhotoUrl = cr.photoUrl || taskObj.photoUrl || undefined;
                  const completedAt = cr.completedAt || taskObj.completedAt || undefined;
                  const photoTakenAt = cr.photoTakenAt || taskObj.photoTakenAt || undefined;
                  const photoWatermark = cr.photoWatermark || taskObj.photoWatermark || undefined;
                  const photoSource = cr.photoSource || taskObj.photoSource || undefined;
                  const notes = cr.notes || taskObj.notes || undefined;
                  const stepsCount = Number(cr.stepsCount || taskObj.stepsCount || 0);
                  const subChoice = cr.subChoice || taskObj.subChoice || undefined;

                  const existingTask = (next[mId][dt] as any)?.[cr.taskKey] || {};
                  let finalPhotoUrl: string | undefined = undefined;
                  if (cloudPhotoUrl && typeof cloudPhotoUrl === "string" && (cloudPhotoUrl.startsWith("data:image") || cloudPhotoUrl.startsWith("http"))) {
                    finalPhotoUrl = cloudPhotoUrl;
                  } else if (cloudPhotoUrl && typeof cloudPhotoUrl === "string" && (cloudPhotoUrl.startsWith("photo:") || cloudPhotoUrl.startsWith("[PHOTO_REF:"))) {
                    finalPhotoUrl = cloudPhotoUrl;
                  } else if (cloudPhotoUrl === undefined && existingTask.photoUrl) {
                    // Retain local photo only if cloud record did not send/clear the photoUrl field
                    finalPhotoUrl = existingTask.photoUrl;
                  }

                  const updatedTaskObj: any = {
                    ...existingTask,
                    ...taskObj,
                    done: isDone,
                    gpsVerified: isGps
                  };

                  if (finalPhotoUrl) {
                    updatedTaskObj.photoUrl = finalPhotoUrl;
                    if (photoTakenAt) updatedTaskObj.photoTakenAt = photoTakenAt;
                    if (photoWatermark) updatedTaskObj.photoWatermark = photoWatermark;
                    if (photoSource) updatedTaskObj.photoSource = photoSource;
                  } else {
                    delete updatedTaskObj.photoUrl;
                    delete updatedTaskObj.photoTakenAt;
                    delete updatedTaskObj.photoWatermark;
                    delete updatedTaskObj.photoSource;
                  }

                  if (completedAt) updatedTaskObj.completedAt = completedAt;
                  if (notes) updatedTaskObj.notes = notes;
                  if (stepsCount) updatedTaskObj.stepsCount = stepsCount;
                  if (subChoice) updatedTaskObj.subChoice = subChoice;

                  (next[mId][dt] as any)[cr.taskKey] = updatedTaskObj;
                }
              } else {
                next[mId][dt] = { ...(next[mId][dt] || {}), ...cr };
              }
            });
            try { localStorage.setItem(STORAGE_KEY_LOGBOOK, JSON.stringify(next)); } catch {}
            return next;
          });
        } else if (tbl === "mutabaah" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && cr.musyrifId && cr.date && cr.date >= "2026-08-18");
          // Proactively purge any legacy cloud records before official start date 18 Agustus 2026
          cloudRecords.forEach((cr: any) => {
            if (cr.date && cr.date < "2026-08-18" && !cr.is_deleted) {
              googleSyncService.enqueue("Mutabaah", { id: cr.id }, "delete");
            }
          });
          setMutabaahData(prev => {
            const next: MutabaahStorage = { ...prev };
            validCloud.forEach((cr: any) => {
              if (!next[cr.musyrifId]) next[cr.musyrifId] = {};
              next[cr.musyrifId][cr.date] = { ...(next[cr.musyrifId][cr.date] || {}), ...cr };
            });
            try { localStorage.setItem(STORAGE_KEY_MUTABAAH, JSON.stringify(next)); } catch {}
            return next;
          });
        } else if (tbl === "galleryinteractions" && Array.isArray(cloudRecords)) {
          const validCloud = cloudRecords.filter((cr: any) => !cr.is_deleted && (cr.postId || cr.id));
          try {
            const raw = localStorage.getItem("syamsa_gallery_interactions_v1");
            const map: Record<string, any> = raw ? JSON.parse(raw) : {};
            validCloud.forEach((cr: any) => {
              const pId = cr.postId || cr.id;
              map[pId] = { ...(map[pId] || {}), ...cr, postId: pId };
            });
            localStorage.setItem("syamsa_gallery_interactions_v1", JSON.stringify(map));
            window.dispatchEvent(new Event("syamsa_gallery_interactions_updated"));
          } catch {}
        }
        return;
      }

      // Delta merge: only called for incremental updates, skip empty arrays
      if (!Array.isArray(cloudRecords) || cloudRecords.length === 0) return;

      if (tbl === "records") {
        setRecords(prev => {
          const map = new Map<string, AttendanceRecord>();
          prev.forEach(r => map.set(`${r.musyrifId}_${r.date}`, r));
          cloudRecords.forEach(cr => {
            const key = `${cr.musyrifId}_${cr.date}`;
            if (cr.is_deleted) {
              map.delete(key);
            } else {
              map.set(key, { ...(map.get(key) || {}), ...cr });
            }
          });
          return Array.from(map.values());
        });
      } else if (tbl === "izin") {
        setIzinList(prev => {
          const map = new Map<string, IzinRequest>();
          prev.forEach(i => map.set(i.id, i));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          return Array.from(map.values());
        });
      } else if (tbl === "agenda_rapat" || tbl === "agendarapat") {
        setAgendaRapatList(prev => {
          const map = new Map<string, AgendaRapatRecord>();
          prev.forEach(a => map.set(a.id, a));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted || cr._deleted) {
              map.delete(cr.id);
            } else {
              let invited = cr.invitedMusyrifIds;
              if (typeof invited === "string") {
                if (invited.trim().startsWith("[")) {
                  try { invited = JSON.parse(invited); } catch (_) { invited = []; }
                } else {
                  invited = invited.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
              }
              if (!Array.isArray(invited)) invited = [];

              let asramaList = cr.targetAsramaList;
              if (typeof asramaList === "string") {
                if (asramaList.trim().startsWith("[")) {
                  try { asramaList = JSON.parse(asramaList); } catch (_) { asramaList = []; }
                } else {
                  asramaList = asramaList.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
              }

              const normalizedAgenda: AgendaRapatRecord = {
                ...cr,
                invitedMusyrifIds: invited,
                targetAsramaList: Array.isArray(asramaList) ? asramaList : undefined,
                locationLat: cr.locationLat ? Number(cr.locationLat) : undefined,
                locationLng: cr.locationLng ? Number(cr.locationLng) : undefined,
                locationRadius: cr.locationRadius ? Number(cr.locationRadius) : undefined
              };
              map.set(cr.id, { ...(map.get(cr.id) || {}), ...normalizedAgenda });
            }
          });
          const updated = Array.from(map.values());
          try { localStorage.setItem(STORAGE_KEY_AGENDA_RAPAT, JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (tbl === "kegiatan") {
        setKegiatanRecords(prev => {
          const map = new Map<string, KegiatanRecord>();
          prev.forEach(k => map.set(k.id, k));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          return Array.from(map.values());
        });
      } else if (tbl === "santrisakit") {
        setSantriSakitList(prev => {
          const map = new Map<string, SantriSakitRecord>();
          prev.forEach(s => map.set(s.id, s));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          return Array.from(map.values());
        });
      } else if (tbl === "dataperizinansantri" || tbl === "santriizin" || tbl === "dataperizinan") {
        setSantriIzinList(prev => {
          const map = new Map<string, SantriIzinRecord>();
          prev.filter(x => Boolean(x?.namaSantri && x.namaSantri.trim())).forEach(s => map.set(s.nomorSurat || s.id, s));
          cloudRecords.forEach(cr => {
            const mapped = mapIzinSedayuToRecord(cr);
            const key = mapped.nomorSurat || mapped.id;
            if (cr.is_deleted) {
              map.delete(key);
              map.delete(cr.id);
            } else if (mapped.namaSantri && mapped.namaSantri.trim()) {
              map.set(key, { ...(map.get(key) || {}), ...mapped });
            }
          });
          const updated = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (tbl === "santri") {
        setSantriList(prev => {
          const map = new Map<string, SantriData>();
          prev.forEach(s => map.set(s.id, s));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          const updated = Array.from(map.values());
          try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (tbl === "santrirequests" || tbl === "santrichangerequest") {
        setSantriRequests(prev => {
          const map = new Map<string, SantriChangeRequest>();
          prev.forEach(r => map.set(r.id, r));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          const updated = Array.from(map.values());
          try { localStorage.setItem(STORAGE_KEY_SANTRI_REQUESTS, JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else if (tbl === "musyrif") {
        setMusyrifList(prev => {
          const map = new Map<string, Musyrif>();
          prev.forEach(m => map.set(m.id, m));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          return sanitizeMusyrifList(Array.from(map.values()));
        });
      } else if (tbl === "authusers") {
        setAuthUsers(prev => {
          const map = new Map<string, AuthUser>();
          prev.forEach(u => map.set(u.id, u));
          cloudRecords.forEach(cr => {
            if (cr.is_deleted) map.delete(cr.id);
            else map.set(cr.id, { ...(map.get(cr.id) || {}), ...cr });
          });
          const updatedUsers = Array.from(map.values());
          // Cascade picture to current authUser
          if (authUser) {
            const myCloudAuth = updatedUsers.find(u => u.id === authUser.id || (u.email && authUser.email && u.email.toLowerCase() === authUser.email.toLowerCase()));
            if (myCloudAuth?.picture) {
              setAuthUser(prev => prev ? { ...prev, picture: myCloudAuth.picture } : prev);
            }
          }
          const pamongs = updatedUsers.filter(u => u.role === "pamong");
          if (pamongs.length > 0) {
            setMusyrifList(mPrev => sanitizeMusyrifList(mPrev.map(m => {
              const matchingPamong = pamongs.find(p => p.asrama === m.asrama);
              if (matchingPamong && m.role !== "pamong" && m.role !== "koordinator_musyrif") {
                return { ...m, pamong: matchingPamong.name };
              }
              return m;
            })));
          }
          return updatedUsers;
        });
      } else if (tbl === "logbook") {
        setLogbookData(prev => {
          const next = { ...prev };
          cloudRecords.forEach(cr => {
            const mId = cr.musyrifId;
            const dt = cr.date;
            if (mId && dt && dt >= "2026-08-18") {
              if (cr.is_deleted) {
                if (next[mId]) {
                  if (cr.taskKey && (next[mId][dt] as any)?.[cr.taskKey]) {
                    delete (next[mId][dt] as any)[cr.taskKey];
                  } else {
                    const copy = { ...next[mId] };
                    delete copy[dt];
                    next[mId] = copy;
                  }
                }
              } else {
                if (!next[mId]) next[mId] = {};
                if (!next[mId][dt]) next[mId][dt] = { ...EMPTY_LOGBOOK };

                if (cr.taskKey) {
                  if (cr.taskKey === "generalNotes") {
                    next[mId][dt].generalNotes = cr.generalNotes || cr.notes || "";
                  } else {
                    let taskObj: any = {};
                    if (typeof cr.taskData === "object" && cr.taskData !== null) {
                      taskObj = { ...cr.taskData };
                    } else if (typeof cr.taskData === "string" && cr.taskData.trim().startsWith("{")) {
                      try { taskObj = JSON.parse(cr.taskData); } catch (_) {}
                    }

                    const isDone = cr.done === true || cr.done === "TRUE" || cr.done === "true" || cr.done === 1 || Boolean(taskObj.done);
                    const isGps = cr.gpsVerified === true || cr.gpsVerified === "TRUE" || cr.gpsVerified === "true" || Boolean(taskObj.gpsVerified);
                    const cloudPhotoUrl = cr.photoUrl || taskObj.photoUrl || undefined;
                    const completedAt = cr.completedAt || taskObj.completedAt || undefined;
                    const photoTakenAt = cr.photoTakenAt || taskObj.photoTakenAt || undefined;
                    const photoWatermark = cr.photoWatermark || taskObj.photoWatermark || undefined;
                    const photoSource = cr.photoSource || taskObj.photoSource || undefined;
                    const notes = cr.notes || taskObj.notes || undefined;
                    const stepsCount = Number(cr.stepsCount || taskObj.stepsCount || 0);
                    const subChoice = cr.subChoice || taskObj.subChoice || undefined;

                    const existingTask = (next[mId][dt] as any)?.[cr.taskKey] || {};
                    let finalPhotoUrl: string | undefined = undefined;
                    if (cloudPhotoUrl && typeof cloudPhotoUrl === "string" && (cloudPhotoUrl.startsWith("data:image") || cloudPhotoUrl.startsWith("http"))) {
                      finalPhotoUrl = cloudPhotoUrl;
                    } else if (cloudPhotoUrl && typeof cloudPhotoUrl === "string" && (cloudPhotoUrl.startsWith("photo:") || cloudPhotoUrl.startsWith("[PHOTO_REF:"))) {
                      finalPhotoUrl = cloudPhotoUrl;
                    } else if (cloudPhotoUrl === undefined && existingTask.photoUrl) {
                      // Retain local photo only if cloud record did not send/clear the photoUrl field
                      finalPhotoUrl = existingTask.photoUrl;
                    }

                    const updatedTaskObj: any = {
                      ...existingTask,
                      ...taskObj,
                      done: isDone,
                      gpsVerified: isGps
                    };

                    if (finalPhotoUrl) {
                      updatedTaskObj.photoUrl = finalPhotoUrl;
                      if (photoTakenAt) updatedTaskObj.photoTakenAt = photoTakenAt;
                      if (photoWatermark) updatedTaskObj.photoWatermark = photoWatermark;
                      if (photoSource) updatedTaskObj.photoSource = photoSource;
                    } else {
                      delete updatedTaskObj.photoUrl;
                      delete updatedTaskObj.photoTakenAt;
                      delete updatedTaskObj.photoWatermark;
                      delete updatedTaskObj.photoSource;
                    }

                    if (completedAt) updatedTaskObj.completedAt = completedAt;
                    if (notes) updatedTaskObj.notes = notes;
                    if (stepsCount) updatedTaskObj.stepsCount = stepsCount;
                    if (subChoice) updatedTaskObj.subChoice = subChoice;

                    (next[mId][dt] as any)[cr.taskKey] = updatedTaskObj;
                  }
                } else {
                  next[mId][dt] = { ...(next[mId][dt] || {}), ...cr };
                }
              }
            }
          });
          try { localStorage.setItem(STORAGE_KEY_LOGBOOK, JSON.stringify(next)); } catch {}
          return next;
        });
      } else if (tbl === "mutabaah") {
        setMutabaahData(prev => {
          const next = { ...prev };
          cloudRecords.forEach(cr => {
            const mId = cr.musyrifId;
            const dt = cr.date;
            if (mId && dt && dt >= "2026-08-18") {
              if (cr.is_deleted) {
                if (next[mId]) {
                  const copy = { ...next[mId] };
                  delete copy[dt];
                  next[mId] = copy;
                }
              } else {
                if (!next[mId]) next[mId] = {};
                next[mId][dt] = { ...(next[mId][dt] || {}), ...cr };
              }
            }
          });
          try { localStorage.setItem(STORAGE_KEY_MUTABAAH, JSON.stringify(next)); } catch {}
          return next;
        });
      } else if (tbl === "galleryinteractions") {
        try {
          const raw = localStorage.getItem("syamsa_gallery_interactions_v1");
          const map: Record<string, any> = raw ? JSON.parse(raw) : {};
          cloudRecords.forEach(cr => {
            const pId = cr.postId || cr.id;
            if (pId) {
              if (cr.is_deleted) delete map[pId];
              else map[pId] = { ...(map[pId] || {}), ...cr, postId: pId };
            }
          });
          localStorage.setItem("syamsa_gallery_interactions_v1", JSON.stringify(map));
          window.dispatchEvent(new Event("syamsa_gallery_interactions_updated"));
        } catch {}
      }
    });

    // 2. Perform initial full cloud pull — this is the Single Source of Truth
    // Always fetch from Sheet on startup; state will be replaced via isFullReplace flag
    const initSync = async () => {
      // GUARD: Prevent multiple concurrent initial syncs
      if ((window as any).__initSyncRunning__) {
        console.log('[App] initSync already running, skipping duplicate call');
        return;
      }
      (window as any).__initSyncRunning__ = true;

      try {
        // Proactively purge deprecated test & ghost records from cloud
        DEPRECATED_PERSONNEL_IDS.forEach(depId => {
          googleSyncService.enqueue("Musyrif", { id: depId }, "delete");
        });

        // Ensure any locally saved agenda tasks with photo/done are queued and flushed to Google Sheets
        try {
          const localLogbookRaw = localStorage.getItem(STORAGE_KEY_LOGBOOK);
          if (localLogbookRaw) {
            const parsed = JSON.parse(localLogbookRaw);
            Object.entries(parsed).forEach(([mId, dateObj]: [string, any]) => {
              if (dateObj && typeof dateObj === "object") {
                Object.entries(dateObj).forEach(([dt, taskEntries]: [string, any]) => {
                  if (taskEntries && typeof taskEntries === "object") {
                    Object.entries(taskEntries).forEach(([tKey, tData]: [string, any]) => {
                      if (tKey.startsWith("agenda_") && tData && (tData.done || tData.photoUrl)) {
                        googleSyncService.enqueue("Logbook", {
                          id: `${mId}_${dt}_${tKey}`,
                          musyrifId: mId,
                          date: dt,
                          taskKey: tKey,
                          done: tData.done ? "TRUE" : "FALSE",
                          completedAt: tData.completedAt || "",
                          photoUrl: tData.photoUrl || "",
                          photoTakenAt: tData.photoTakenAt || "",
                          photoWatermark: tData.photoWatermark || "",
                          photoSource: tData.photoSource || "",
                          notes: tData.notes || "",
                          gpsVerified: tData.gpsVerified ? "TRUE" : "FALSE",
                          stepsCount: tData.stepsCount || 0,
                          subChoice: tData.subChoice || "",
                          updated_at: new Date().toISOString()
                        }, "upsert");
                      }
                    });
                  }
                });
              }
            });
          }
        } catch (_) {}

        if (googleSyncService.getGasUrl() && navigator.onLine) {
          // Stagger sync: flush queue first, then fetch cloud data after
          try {
            // Step 1: Flush pending items (fast, local-first)
            googleSyncService.flushQueue();

            // Step 2: Wait a bit, then fetch cloud data
            await new Promise(resolve => setTimeout(resolve, 500));
            googleSyncService.fetchAllFromCloud();
          } catch (_) {}
        }
      } finally {
        (window as any).__initSyncRunning__ = false;
        setIsInitialSyncing(false);
      }
    };

    initSync();

    return unsubData;
  }, []);

  useEffect(() => {
    // Timer untuk update jam (tidak perlu sync di sini)
    const t = setInterval(() => {
      setNow(getTrustedDate());
    }, 1000);

    // Sync service sekarang handle polling sendiri dengan adaptive interval
    // Tidak perlu interval polling tambahan di sini

    const handleFocus = () => {
      // Trigger poll on focus (tab becomes visible)
      if (navigator.onLine && googleSyncService.getGasUrl()) {
        googleSyncService.pollDelta();
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(t);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // ─── AUTO-INJECT MASTER DATA setiap 10 menit (khusus Koordinator Musyrif) ───
  useEffect(() => {
    if (authUser?.role !== "koordinator_musyrif") return;
    const autoInject = () => {
      DEFAULT_ALL_PERSONNEL.forEach(p => {
        googleSyncService.enqueue("Musyrif", p, "upsert");
      });
      const pamongAuths = DEFAULT_ALL_PERSONNEL.filter(p => p.role === "pamong").map(p => ({
        id: p.id, name: p.name, email: p.email, role: "pamong" as Role, asrama: p.asrama
      }));
      pamongAuths.forEach(pa => {
        googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, pa, "upsert");
      });
      googleSyncService.flushQueue();
      setMusyrifList(DEFAULT_ALL_PERSONNEL);
    };
    autoInject(); // langsung inject saat login
    const t = setInterval(autoInject, 10 * 60 * 1000); // setiap 10 menit
    return () => clearInterval(t);
  }, [authUser?.role]);

  const handleLogin = (u: AuthUser) => {
    setAuthUser(u);
    (window as any).__presensiAuthUserId__ = u.id;
    try {
      localStorage.setItem("presensi_auth_user", JSON.stringify(u));
    } catch {}

    // Auto-update Musyrif Profile with Google Picture so it appears for all other musyrif
    if (u.picture) {
      let matchedMusyrif: Musyrif | undefined;
      setMusyrifList(prev => {
        const updated = prev.map(m => {
          if (m.id === u.musyrifId || m.id === u.id || (m.email && u.email && m.email.toLowerCase() === u.email.toLowerCase())) {
            const upM = { ...m, picture: u.picture, avatar: u.picture };
            matchedMusyrif = upM;
            return upM;
          }
          return m;
        });
        try {
          localStorage.setItem("syamsa_musyrif_list_v4", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (matchedMusyrif) {
        setTimeout(() => {
          googleSyncService.enqueue("Musyrif", matchedMusyrif, "upsert", true);
        }, 0);
      }

      // Sync picture to AuthUsers table for cross-device sync
      setAuthUsers(prev => {
        const updated = prev.map(auth =>
          (auth.id === u.id || (auth.email && u.email && auth.email.toLowerCase() === u.email.toLowerCase()))
            ? { ...auth, picture: u.picture }
            : auth
        );
        try {
          localStorage.setItem(STORAGE_KEY_AUTH_USERS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setTimeout(() => {
        googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, { id: u.id, picture: u.picture }, "upsert", true);
      }, 100);
    }

    showToast(`Selamat datang, Ustaz ${getMusyrifCallName(u.name)}!`);
    setPage(getTrustedDate().getHours() < 12 ? "subuh" : "maghrib");

    // GUARD: Prevent rapid duplicate fetchAllFromCloud calls
    const lastFetch = (window as any).__lastFetchAllFromCloud__ || 0;
    const now = Date.now();
    if (now - lastFetch > 30000) { // Only fetch if last fetch was > 30 seconds ago
      (window as any).__lastFetchAllFromCloud__ = now;
      googleSyncService.fetchAllFromCloud();
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    (window as any).__presensiAuthUserId__ = null;
    try {
      localStorage.removeItem("presensi_auth_user");
    } catch {}
    showToast("Anda telah keluar.", "info");
    setPage("dashboard");
  };

  // Master Data Musyrif SCRUD Handlers (Strictly Restricted to Koordinator Musyrif: Andi Aqillah)
  const handleAddMusyrif = (newM: Omit<Musyrif, "id">) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang menambah data personel.", "error");
      return;
    }
    const newId = `m_${Date.now()}`;
    const created: Musyrif = { ...newM, id: newId };
    setMusyrifList(prev => sanitizeMusyrifList([created, ...prev]));
    googleSyncService.enqueue("Musyrif", created, "upsert", true);
    
    if (created.role === "pamong" || created.role === "koordinator_musyrif") {
      const authItem: AuthUser = {
        id: created.id,
        name: created.name,
        email: (created.email || "").trim().toLowerCase(),
        role: created.role as Role,
        asrama: created.asrama
      };
      setAuthUsers(prev => [authItem, ...prev.filter(u => u.id !== created.id)]);
      googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, authItem, "upsert", true);
    }
    showToast(`Personel ${created.name} berhasil ditambahkan!`, "success");
  };

  const handleUpdateMusyrif = (updated: Musyrif) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang mengubah data personel.", "error");
      return;
    }
    setMusyrifList(prev => sanitizeMusyrifList(prev.map(m => m.id === updated.id ? updated : m)));
    googleSyncService.enqueue("Musyrif", updated, "upsert", true);

    if (updated.role === "pamong" || updated.role === "koordinator_musyrif") {
      const authItem: AuthUser = {
        id: updated.id,
        name: updated.name,
        email: (updated.email || "").trim().toLowerCase(),
        role: updated.role as Role,
        asrama: updated.asrama
      };
      setAuthUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...authItem } : u));
      googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, authItem, "upsert", true);
    }
    showToast(`Data personel ${updated.name} berhasil diperbarui!`, "success");
  };

  const handleDeleteMusyrif = (id: string) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang menghapus data personel.", "error");
      return;
    }
    const target = musyrifList.find(m => m.id === id);
    setMusyrifList(prev => sanitizeMusyrifList(prev.filter(m => m.id !== id)));
    googleSyncService.enqueue("Musyrif", { id }, "delete", true);
    if (target?.role === "pamong" || target?.role === "koordinator_musyrif") {
      setAuthUsers(prev => prev.filter(u => u.id !== id));
      googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, { id }, "delete", true);
    }
    showToast(`Data personel ${target?.name || id} berhasil dihapus.`, "info");
  };

  const pamongList = useMemo<Pamong[]>(
    () => authUsers
      .filter(u => u.role === "pamong")
      .map(u => ({ id: u.id, name: u.name, email: u.email, asrama: u.asrama })),
    [authUsers]
  );

  const handleAddPamong = (newPamong: Omit<Pamong, "id">) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang menambah data pamong.", "error");
      return;
    }
    const pId = `p_${Date.now()}`;
    const cleanEmail = newPamong.email.trim().toLowerCase();
    const createdAuth: AuthUser = {
      id: pId,
      name: newPamong.name.trim(),
      email: cleanEmail,
      role: "pamong",
      asrama: newPamong.asrama,
    };
    const createdMusyrif: Musyrif = {
      id: pId,
      name: newPamong.name.trim(),
      role: "pamong",
      asrama: newPamong.asrama,
      kamar: `Ruang Pamong ${newPamong.asrama.replace("Asrama ", "")}`,
      kelas: "Multi Tingkat",
      tingkat: "Semua Tingkat",
      pamong: "Pimpinan Asrama",
      email: cleanEmail,
    };

    setAuthUsers(prev => [createdAuth, ...prev]);
    setMusyrifList(prev => sanitizeMusyrifList([createdMusyrif, ...prev]));

    // Auto update pamong field in musyrifs of that asrama
    setMusyrifList(prev => sanitizeMusyrifList(prev.map(m => m.asrama === newPamong.asrama && m.role !== "pamong" && m.role !== "koordinator_musyrif" ? { ...m, pamong: newPamong.name.trim() } : m)));

    googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, createdAuth, "upsert", true);
    googleSyncService.enqueue("Musyrif", createdMusyrif, "upsert", true);
    showToast(`Pamong ${createdAuth.name} berhasil ditambahkan!`, "success");
  };

  const handleUpdatePamong = (updatedPamong: Pamong) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang mengubah data pamong.", "error");
      return;
    }
    const cleanEmail = updatedPamong.email.trim().toLowerCase();
    const cleanName = updatedPamong.name.trim();

    setAuthUsers(prev => prev.map(u => (
      u.id === updatedPamong.id
        ? { ...u, name: cleanName, email: cleanEmail, asrama: updatedPamong.asrama, role: "pamong" as Role }
        : u
    )));

    setMusyrifList(prev => sanitizeMusyrifList(prev.map(m => {
      if (m.id === updatedPamong.id) {
        return { ...m, name: cleanName, email: cleanEmail, asrama: updatedPamong.asrama, role: "pamong" };
      }
      if (m.asrama === updatedPamong.asrama && m.role !== "pamong" && m.role !== "koordinator_musyrif") {
        return { ...m, pamong: cleanName };
      }
      return m;
    })));

    const authPayload = { id: updatedPamong.id, name: cleanName, email: cleanEmail, asrama: updatedPamong.asrama, role: "pamong" as Role };
    const musyrifPayload: Musyrif = {
      id: updatedPamong.id,
      name: cleanName,
      role: "pamong",
      asrama: updatedPamong.asrama,
      kamar: `Ruang Pamong ${updatedPamong.asrama.replace("Asrama ", "")}`,
      kelas: "Multi Tingkat",
      tingkat: "Semua Tingkat",
      pamong: "Pimpinan Asrama",
      email: cleanEmail,
    };

    googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, authPayload, "upsert", true);
    googleSyncService.enqueue("Musyrif", musyrifPayload, "upsert", true);
    showToast(`Data pamong ${cleanName} berhasil diperbarui!`, "success");
  };

  const handleDeletePamong = (id: string) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang menghapus data pamong.", "error");
      return;
    }
    const target = authUsers.find(u => u.id === id && u.role === "pamong");
    setAuthUsers(prev => prev.filter(u => u.id !== id));
    setMusyrifList(prev => sanitizeMusyrifList(prev.filter(m => m.id !== id)));
    googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, { id }, "delete", true);
    googleSyncService.enqueue("Musyrif", { id }, "delete", true);
    showToast(`Data pamong ${target?.name || id} berhasil dihapus.`, "info");
  };

  // ─── MASTER DATA SANTRI SCRUD (Strictly Restricted to Koordinator Musyrif) ───
  const handleSaveSantri = (santri: SantriData) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang mengubah data santri.", "error");
      return;
    }
    setSantriList(prev => {
      const exists = prev.some(s => s.id === santri.id);
      const next = exists ? prev.map(s => s.id === santri.id ? santri : s) : [santri, ...prev];
      try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next)); } catch {}
      return next;
    });
    googleSyncService.enqueue("Santri", santri, "upsert");
    showToast(`Data santri ${santri.nama} (${santri.kelasLengkap}) berhasil disimpan dan disinkronkan ke Google Sheets!`, "success");
  };

  const handleDeleteSantri = (id: string) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator Musyrif yang berwenang menghapus data santri.", "error");
      return;
    }
    setSantriList(prev => {
      const next = prev.filter(s => s.id !== id);
      try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next)); } catch {}
      return next;
    });
    googleSyncService.enqueue("Santri", { id }, "delete");
    showToast("Data santri berhasil dihapus dan disinkronkan ke Google Sheets.", "info");
  };

  const handleResetSantri = () => {
    if (authUser?.role !== "koordinator_musyrif") return;
    setSantriList(ALL_SANTRI_DATA);
    try { localStorage.removeItem(STORAGE_KEY_SANTRI); } catch {}
    showToast("Database santri berhasil dipulihkan ke data master Excel (1.499 santri).", "success");
  };

  // ─── SANTRI CHANGE REQUEST APPROVAL WORKFLOW ───
  const handleRequestSantriChange = (reqData: Omit<SantriChangeRequest, "id" | "status" | "requestedAt" | "requestedBy">) => {
    if (!authUser) return;
    const newReq: SantriChangeRequest = {
      id: `req_${Date.now()}`,
      status: "pending",
      requestedAt: new Date().toISOString(),
      requestedBy: {
        id: authUser.id,
        name: authUser.name,
        role: authUser.role,
        email: authUser.email || ""
      },
      ...reqData
    };

    setSantriRequests(prev => {
      const next = [newReq, ...prev];
      try { localStorage.setItem(STORAGE_KEY_SANTRI_REQUESTS, JSON.stringify(next)); } catch {}
      return next;
    });

    googleSyncService.enqueue("SantriRequests", newReq, "upsert");
    showToast("Permohonan berhasil dikirim ke Koordinator Musyrif untuk diverifikasi.", "success");
  };

  const handleApproveSantriRequest = (requestId: string) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator yang dapat menyetujui permohonan.", "error");
      return;
    }

    const req = santriRequests.find(r => r.id === requestId);
    if (!req) return;

    // Apply the change
    if (req.type === "delete") {
      setSantriList(prev => {
        const next = prev.filter(s => s.id !== req.santriId);
        try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next)); } catch {}
        return next;
      });
      googleSyncService.enqueue("Santri", { id: req.santriId }, "delete");
    } else if (req.proposedData) {
      setSantriList(prev => {
        const exists = prev.some(s => s.id === req.santriId);
        const next = exists 
          ? prev.map(s => s.id === req.santriId ? { ...s, ...req.proposedData } as SantriData : s)
          : [{ ...req.proposedData, id: req.santriId } as SantriData, ...prev];
        try { localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next)); } catch {}
        return next;
      });
      googleSyncService.enqueue("Santri", { ...req.proposedData, id: req.santriId }, "upsert");
    }

    // Update request status to approved
    const updatedReq: SantriChangeRequest = {
      ...req,
      status: "approved",
      reviewedBy: { id: authUser.id, name: authUser.name },
      reviewedAt: new Date().toISOString()
    };

    setSantriRequests(prev => {
      const next = prev.map(r => r.id === requestId ? updatedReq : r);
      try { localStorage.setItem(STORAGE_KEY_SANTRI_REQUESTS, JSON.stringify(next)); } catch {}
      return next;
    });

    googleSyncService.enqueue("SantriRequests", updatedReq, "upsert");
    showToast(`Permohonan ${req.type === "delete" ? "hapus" : "perubahan"} santri ${req.santriNama} disetujui (ACC) & disinkronkan ke Sheet!`, "success");
  };

  const handleRejectSantriRequest = (requestId: string, notes?: string) => {
    if (authUser?.role !== "koordinator_musyrif") {
      showToast("Akses ditolak: Hanya Koordinator yang dapat menolak permohonan.", "error");
      return;
    }

    const req = santriRequests.find(r => r.id === requestId);
    if (!req) return;

    const updatedReq: SantriChangeRequest = {
      ...req,
      status: "rejected",
      reviewedBy: { id: authUser.id, name: authUser.name },
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes || "Permohonan ditolak oleh Koordinator Musyrif"
    };

    setSantriRequests(prev => {
      const next = prev.map(r => r.id === requestId ? updatedReq : r);
      try { localStorage.setItem(STORAGE_KEY_SANTRI_REQUESTS, JSON.stringify(next)); } catch {}
      return next;
    });

    googleSyncService.enqueue("SantriRequests", updatedReq, "upsert");
    showToast(`Permohonan santri ${req.santriNama} telah ditolak.`, "info");
  };

  const handleSyncAllOfficialData = async () => {
    if (authUser?.role !== "koordinator_musyrif") return;
    const ok = await appConfirm(
      "Sinkronkan seluruh data Pimpinan (Wadir IV & Kaur KIS), 56 Musyrif, dan 9 Pamong resmi ke Google Sheets sekarang? Ini akan memperbarui seluruh email & nomor WA di Google Sheets.",
      "Sinkronisasi Data Master",
      { type: "info", confirmText: "Ya, Sinkronkan", cancelText: "Batal" }
    );
    if (ok) {
      DEFAULT_ALL_PERSONNEL.forEach(p => {
        googleSyncService.enqueue("Musyrif", p, "upsert");
      });
      const pamongAuths = DEFAULT_ALL_PERSONNEL.filter(p => p.role === "pamong" || p.role === "kaur_kis" || p.role === "wadir4").map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role as Role,
        asrama: p.asrama
      }));
      pamongAuths.forEach(pa => {
        googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, pa, "upsert");
      });
      googleSyncService.flushQueue();
      setMusyrifList(DEFAULT_ALL_PERSONNEL);
      showToast("Data master resmi (Pimpinan, Musyrif & Pamong) berhasil dikirim dan disinkronkan ke Google Sheets!", "success");
    }
  };

  // Versi silent (tanpa dialog & tanpa role guard) — dipakai di tombol login modal
  const handleSilentInjectMaster = () => {
    DEFAULT_ALL_PERSONNEL.forEach(p => {
      googleSyncService.enqueue("Musyrif", p, "upsert");
    });
    const pamongAuths = DEFAULT_ALL_PERSONNEL.filter(p => p.role === "pamong" || p.role === "kaur_kis" || p.role === "wadir4").map(p => ({
      id: p.id, name: p.name, email: p.email, role: p.role as Role, asrama: p.asrama
    }));
    pamongAuths.forEach(pa => {
      googleSyncService.enqueue(SYNC_TABLE_AUTH_USERS, pa, "upsert");
    });
    googleSyncService.flushQueue();
    setMusyrifList(DEFAULT_ALL_PERSONNEL);
    showToast("Data master Pimpinan, Musyrif & Pamong berhasil dipulihkan!", "success");
  };

  const handleMark = useCallback<MarkFn>((mid, prayer, status, date, note) => {
    const nk = prayer==="subuh"?"subuhNote":"maghribNote";
    setRecords(prev => {
      const ex = prev.find(r => r.musyrifId === mid && r.date === date);
      if (ex) {
        const updatedRec: AttendanceRecord = { ...ex, [prayer]: status, ...(note !== undefined ? { [nk]: note } : {}) };
        // Schedule enqueue outside render cycle
        setTimeout(() => googleSyncService.enqueue("Records", { ...updatedRec, id: `${mid}_${date}` }, "upsert"), 0);
        return prev.map(r => r.musyrifId === mid && r.date === date ? updatedRec : r);
      }
      const newRec: AttendanceRecord = { musyrifId: mid, date, [prayer]: status, ...(note ? { [nk]: note } : {}), markedBy: authUser?.id };
      setTimeout(() => googleSyncService.enqueue("Records", { ...newRec, id: `${mid}_${date}` }, "upsert"), 0);
      return [...prev, newRec];
    });
  },[authUser]);

  const handleResetMark = useCallback((mid: string, prayer: PrayerSlot, date: string) => {
    const nk = prayer === "subuh" ? "subuhNote" : "maghribNote";
    setRecords(prev => prev.map(r => {
      if (r.musyrifId === mid && r.date === date) {
        const copy = { ...r };
        delete copy[prayer];
        delete copy[nk];
        // Schedule enqueue outside render cycle
        setTimeout(() => googleSyncService.enqueue("Records", { ...copy, id: `${mid}_${date}` }, "upsert"), 0);
        return copy;
      }
      return r;
    }));
  }, []);

  const handleMarkAll = useCallback<MarkAllFn>((asrama, prayer, status, date) => {
    const list = musyrifList && musyrifList.length > 0 ? musyrifList : MUSYRIF_LIST;
    list.filter(m=>m.asrama===asrama).forEach(m=>handleMark(m.id,prayer,status,date));
  },[handleMark, musyrifList]);

  // Submit Izin Request (Synchronized to Google Sheet)
  const handleSubmitIzin = (req: Omit<IzinRequest, "id" | "status" | "createdAt">) => {
    const newIzin: IzinRequest = {
      ...req,
      id: `izin-${Date.now()}`,
      status: "pending",
      createdAt: format(new Date(), "yyyy-MM-dd HH:mm")
    };
    setIzinList(prev => [newIzin, ...prev]);
    googleSyncService.enqueue("Izin", newIzin, "upsert");
    showToast("Pengajuan izin berhasil dikirim ke Pamong.", "success");
  };

  // Update Izin Request (Synchronized to Google Sheet)
  const handleUpdateIzin = (updated: IzinRequest) => {
    setIzinList(prev => prev.map(i => i.id === updated.id ? updated : i));
    googleSyncService.enqueue("Izin", updated, "upsert");
    showToast(`Data pengajuan izin ${updated.musyrifName} diperbarui!`, "success");
  };

  // Approve / Reject Izin (Synchronized to Google Sheet)
  const handleApproveIzin = (reqId: string, approved: boolean) => {
    const target = izinList.find(i => i.id === reqId);
    if (!target) return;

    const updatedIzin: IzinRequest = {
      ...target,
      status: approved ? "approved" : "rejected",
      reviewedBy: authUser?.name || "Pamong",
      reviewedAt: format(new Date(), "yyyy-MM-dd HH:mm")
    };

    setIzinList(prev => prev.map(i => i.id === reqId ? updatedIzin : i));
    googleSyncService.enqueue("Izin", updatedIzin, "upsert");

    if (approved) {
      let dates: string[] = [];
      try {
        const startD = parseISO(target.startDate);
        const endD = parseISO(target.endDate);
        if (startD <= endD) {
          dates = eachDayOfInterval({ start: startD, end: endD }).map(d => format(d, "yyyy-MM-dd"));
        } else {
          dates = [target.startDate];
        }
      } catch {
        dates = [target.startDate];
        if (target.endDate && target.endDate !== target.startDate) {
          dates.push(target.endDate);
        }
      }

      dates.forEach(d => {
        if (target.prayerSlot === "all" || target.prayerSlot === "subuh") {
          handleMark(target.musyrifId, "subuh", target.type, d, target.reason);
        }
        if (target.prayerSlot === "all" || target.prayerSlot === "maghrib") {
          handleMark(target.musyrifId, "maghrib", target.type, d, target.reason);
        }
      });
      showToast(`Izin ${target.musyrifName} disetujui & presensi otomatis diperbarui (${dates.length} hari)!`, "success");
    } else {
      showToast(`Pengajuan izin ${target.musyrifName} ditolak.`, "info");
    }
  };

  // Delete Izin (Synchronized to Google Sheet)
  const handleDeleteIzin = (reqId: string) => {
    setIzinList(prev => prev.filter(i => i.id !== reqId));
    googleSyncService.enqueue("Izin", { id: reqId }, "delete");
    showToast("Pengajuan izin berhasil dibatalkan/dihapus.", "info");
  };

  // Save Kegiatan (Synchronized to Google Sheet)
  const handleSaveKegiatan = (rec: KegiatanRecord) => {
    if (!canManageKegiatanAsrama(authUser)) {
      showToast("Akses ditolak: Hanya Koordinator Gedung ke atas yang dapat mengisi presensi kegiatan asrama.", "error");
      return;
    }
    setKegiatanRecords(prev => {
      const existingIdx = prev.findIndex(r => r.id === rec.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = rec;
        return next;
      }
      return [rec, ...prev];
    });
    googleSyncService.enqueue("Kegiatan", rec, "upsert");
    showToast("Presensi kegiatan asrama berhasil disimpan!", "success");
  };

  // Delete Kegiatan (Synchronized to Google Sheet)
  const handleDeleteKegiatan = (id: string) => {
    if (!canManageKegiatanAsrama(authUser)) {
      showToast("Akses ditolak: Hanya Koordinator Gedung ke atas yang dapat menghapus data kegiatan asrama.", "error");
      return;
    }
    setKegiatanRecords(prev => prev.filter(k => k.id !== id));
    googleSyncService.enqueue("Kegiatan", { id }, "delete");
    showToast("Data presensi kegiatan berhasil dihapus.", "info");
  };

  // Save Jurnal Logbook (Synchronized to Google Sheet via Granular Per-Task Rows: 1 Orang 1 Foto 1 Sel)
  const handleSaveLogbook = (musyrifId: string, date: string, entry: JurnalLogbookEntry) => {
    setLogbookData(prev => {
      const prevEntry = prev[musyrifId]?.[date] || {};
      const standardKeys = [
        "tahajjud", "bakdaSubuh", "cekSakit", "sisirSekolah", "jagaGerbang",
        "oprakJumat", "kerjaBakti", "oprakAshar", "oprakMandi", "sisirMaghrib",
        "bakdaMaghrib", "belajarMalam", "cekTidur", "muhadatsah", "piketSubuh", "ashar", "maghrib", "bahasa", "sisirMalam", "jumat", "mandiSore"
      ];
      const dynamicKeys = Object.keys({ ...prevEntry, ...entry }).filter(k => k !== "generalNotes");
      const allTaskKeys = Array.from(new Set([...standardKeys, ...dynamicKeys]));

      // Merge tasks deeply so no previous photos or notes are overwritten by subsequent tasks
      const mergedEntry: any = { ...prevEntry, ...entry };
      allTaskKeys.forEach(taskKey => {
        const existingTask = (prevEntry as any)?.[taskKey] || {};
        const incomingTask = (entry as any)?.[taskKey] || {};
        
        let finalPhotoUrl = existingTask.photoUrl;
        let finalPhotoTakenAt = existingTask.photoTakenAt;
        let finalPhotoWatermark = existingTask.photoWatermark;
        let finalPhotoSource = existingTask.photoSource;

        // Check if photo was explicitly removed
        if (incomingTask.photoUrl === "" || incomingTask.photoUrl === null) {
          finalPhotoUrl = undefined;
          finalPhotoTakenAt = undefined;
          finalPhotoWatermark = undefined;
          finalPhotoSource = undefined;

          // Proactively purge local cache keys for this task photo
          import("./utils/photoCacheService").then(({ deletePhotosBatch }) => {
            deletePhotosBatch([
              `logbook_${musyrifId}_${date}_${taskKey}_photoUrl`,
              `photo_logbook_${musyrifId}_${date}_${taskKey}_photoUrl`,
              `photo_${musyrifId}_${date}_${taskKey}_photoUrl`,
              `photo_logbook_${musyrifId}_${date}_${taskKey}`,
              `logbook_${musyrifId}_${date}_${taskKey}`
            ]).catch(() => {});
          }).catch(() => {});
        } else if (incomingTask.photoUrl) {
          finalPhotoUrl = incomingTask.photoUrl;
          finalPhotoTakenAt = incomingTask.photoTakenAt || new Date().toISOString();
          finalPhotoWatermark = incomingTask.photoWatermark || existingTask.photoWatermark;
          finalPhotoSource = incomingTask.photoSource || existingTask.photoSource;
        }

        const taskObj: any = {
          ...existingTask,
          ...incomingTask
        };

        if (finalPhotoUrl) {
          taskObj.photoUrl = finalPhotoUrl;
          taskObj.photoTakenAt = finalPhotoTakenAt;
          taskObj.photoWatermark = finalPhotoWatermark;
          taskObj.photoSource = finalPhotoSource;
        } else {
          delete taskObj.photoUrl;
          delete taskObj.photoTakenAt;
          delete taskObj.photoWatermark;
          delete taskObj.photoSource;
        }

        mergedEntry[taskKey] = taskObj;
      });

      // 1. Enqueue each active task individually to Sheet Logbook (1 Orang 1 Foto 1 Sel)
      allTaskKeys.forEach((taskKey) => {
        const taskData = mergedEntry[taskKey];
        const hasData = taskData && typeof taskData === "object" && (taskData.done || taskData.photoUrl || taskData.notes || taskData.stepsCount);
        if (hasData) {
          googleSyncService.enqueue("Logbook", {
            id: `${musyrifId}_${date}_${taskKey}`,
            musyrifId,
            date,
            taskKey,
            done: taskData.done ? "TRUE" : "FALSE",
            completedAt: taskData.completedAt || "",
            photoUrl: taskData.photoUrl || "",
            photoTakenAt: taskData.photoTakenAt || "",
            photoWatermark: taskData.photoWatermark || "",
            photoSource: taskData.photoSource || "",
            notes: taskData.notes || "",
            gpsVerified: taskData.gpsVerified ? "TRUE" : "FALSE",
            stepsCount: taskData.stepsCount || 0,
            subChoice: taskData.subChoice || "",
            updated_at: new Date().toISOString()
          }, "upsert", Boolean(taskData.photoUrl));
        } else {
          // If task has no photo and no completion/notes, delete/clear granular row in cloud
          googleSyncService.enqueue("Logbook", {
            id: `${musyrifId}_${date}_${taskKey}`
          }, "delete");
        }
      });

      // 2. Save generalNotes separately if present
      if (mergedEntry.generalNotes) {
        googleSyncService.enqueue("Logbook", {
          id: `${musyrifId}_${date}_generalNotes`,
          musyrifId,
          date,
          taskKey: "generalNotes",
          generalNotes: mergedEntry.generalNotes,
          updated_at: new Date().toISOString()
        }, "upsert");
      }

      const next = {
        ...prev,
        [musyrifId]: {
          ...(prev[musyrifId] || {}),
          [date]: mergedEntry
        }
      };
      try { localStorage.setItem(STORAGE_KEY_LOGBOOK, JSON.stringify(next)); } catch {}
      return next;
    });

    showToast("Jurnal logbook berhasil disimpan!", "success");
  };

  // Reset Logbook for musyrif & date
  const handleResetLogbook = (musyrifId: string, date: string) => {
    setLogbookData(prev => {
      const copy = { ...prev };
      if (copy[musyrifId]) {
        const userCopy = { ...copy[musyrifId] };
        delete userCopy[date];
        copy[musyrifId] = userCopy;
      }
      return copy;
    });

    // Delete legacy record and all granular per-task records in cloud
    googleSyncService.enqueue("Logbook", { id: `${musyrifId}_${date}` }, "delete");
    const allTaskKeys = [
      "tahajjud", "bakdaSubuh", "cekSakit", "sisirSekolah", "jagaGerbang",
      "oprakJumat", "kerjaBakti", "oprakAshar", "oprakMandi", "sisirMaghrib",
      "bakdaMaghrib", "belajarMalam", "cekTidur", "generalNotes"
    ];
    allTaskKeys.forEach(k => {
      googleSyncService.enqueue("Logbook", { id: `${musyrifId}_${date}_${k}` }, "delete");
    });

    showToast("Jurnal logbook hari ini berhasil di-reset.", "info");
  };

  // Save Mutabaah (Synchronized to Google Sheet)
  const handleSaveMutabaah = (musyrifId: string, date: string, entry: MutabaahEntry) => {
    setMutabaahData(prev => ({
      ...prev,
      [musyrifId]: {
        ...(prev[musyrifId] || {}),
        [date]: entry
      }
    }));
    googleSyncService.enqueue("Mutabaah", { id: `${musyrifId}_${date}`, musyrifId, date, ...entry }, "upsert");
    showToast("Mutaba'ah yaumiyah berhasil disimpan!", "success");
  };

  // Reset Mutabaah for musyrif & date
  const handleResetMutabaah = (musyrifId: string, date: string) => {
    setMutabaahData(prev => {
      const copy = { ...prev };
      if (copy[musyrifId]) {
        const userCopy = { ...copy[musyrifId] };
        delete userCopy[date];
        copy[musyrifId] = userCopy;
      }
      return copy;
    });
    googleSyncService.enqueue("Mutabaah", { id: `${musyrifId}_${date}` }, "delete");
    showToast("Catatan mutaba'ah hari ini berhasil di-reset.", "info");
  };

  // Handlers for Santri Sakit (Synchronized to Google Sheet)
  const handleSaveSantriSakit = (rec: SantriSakitRecord) => {
    setSantriSakitList(prev => {
      const idx = prev.findIndex(s => s.id === rec.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rec;
        return next;
      }
      return [rec, ...prev];
    });
    googleSyncService.enqueue("SantriSakit", rec, "upsert", true);
    showToast(`Data santri sakit (${rec.namaSantri}) berhasil disimpan!`, "success");
  };

  const handleUpdateStatusSantriSakit = (id: string, newStatus: "dalam_perawatan" | "sembuh") => {
    setSantriSakitList(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    const target = santriSakitList.find(s => s.id === id);
    if (target) {
      googleSyncService.enqueue("SantriSakit", { ...target, status: newStatus }, "upsert");
    }
    showToast(`Status santri diperbarui menjadi ${newStatus === "sembuh" ? "Sembuh" : "Dalam Perawatan"}`, "success");
  };

  const handleDeleteSantriSakit = (id: string) => {
    setSantriSakitList(prev => prev.filter(s => s.id !== id));
    googleSyncService.enqueue("SantriSakit", { id }, "delete");
    showToast("Data santri sakit dihapus", "info");
  };

  // Handlers for Tugas Pengasuhan Khusus (Antar PKU/RS & Bimbingan Santri)
  const handleSavePengasuhanKhusus = (rec: PengasuhanKhususRecord) => {
    setPengasuhanKhususList(prev => {
      const idx = prev.findIndex(p => p.id === rec.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rec;
        return next;
      }
      return [rec, ...prev];
    });
    googleSyncService.enqueue("PengasuhanKhusus", rec, "upsert", true);

    // Auto sync to Santri Sakit if category is "antar_pku_rs" and not yet exists
    if (rec.kategori === "antar_pku_rs") {
      const existingSakit = santriSakitList.find(
        s => s.namaSantri.toLowerCase() === rec.namaSantri.toLowerCase() && s.date === rec.date
      );
      if (!existingSakit) {
        const newSakitRecord: SantriSakitRecord = {
          id: "sakit_pku_" + Date.now(),
          musyrifId: rec.musyrifId,
          musyrifName: rec.musyrifName,
          asrama: rec.asrama,
          kamar: rec.kamar,
          date: rec.date,
          namaSantri: rec.namaSantri,
          kelasSantri: rec.kelasSantri,
          keluhan: rec.catatan,
          lokasiPerawatan: "rs_pku",
          catatanTindakan: `Dirujuk ke ${rec.lokasiTujuan} oleh ${rec.musyrifName}`,
          status: "dalam_perawatan",
          photoUrl: rec.photoUrl,
          createdAt: rec.createdAt
        };
        handleSaveSantriSakit(newSakitRecord);
      }
    }

    showToast(`Tugas pengasuhan (${rec.namaSantri}) berhasil disimpan (+${rec.poin} Poin)!`, "success");
  };

  const handleSaveBatchPengasuhanKhusus = (records: PengasuhanKhususRecord[]) => {
    if (!records || records.length === 0) return;

    // 1. Simpan ke PengasuhanKhususList
    setPengasuhanKhususList(prev => {
      const map = new Map<string, PengasuhanKhususRecord>();
      prev.forEach(p => map.set(p.id, p));
      records.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });

    const nowIso = new Date().toISOString();
    const newIzinListToSave: any[] = [];
    const newPembinaanRecords: any[] = [];

    records.forEach(rec => {
      // Sync to Google Apps Script backend
      googleSyncService.enqueue("PengasuhanKhusus", rec, "upsert", true);

      // SINKRONISASI 1: JURNAL LOGBOOK (Pilar 2)
      // Otomatis tandai tugas logbook 'cekSakit' jika mengantar PKU/RS
      if (rec.kategori === "antar_pku_rs" && rec.musyrifId) {
        const dayEntry = logbookData[rec.musyrifId]?.[rec.date] || {};
        const existingTask = (dayEntry as any)?.cekSakit || {};
        if (!existingTask.done) {
          const updatedEntry: JurnalLogbookEntry = {
            ...dayEntry,
            cekSakit: {
              ...existingTask,
              done: true,
              completedAt: rec.waktu || format(new Date(), "HH:mm"),
              notes: `Rujukan Medis PKU/RS: ${rec.namaSantri} ke ${rec.lokasiTujuan}`,
              photoUrl: rec.photoUrl || existingTask.photoUrl
            }
          };
          handleSaveLogbook(rec.musyrifId, rec.date, updatedEntry);
        }
      }

      // SINKRONISASI 2: IZIN SAKIT / PANTAUAN SANTRI SAKIT
      if (rec.kategori === "antar_pku_rs") {
        const existingSakit = santriSakitList.find(
          s => s.namaSantri.toLowerCase() === rec.namaSantri.toLowerCase() && s.date === rec.date
        );
        if (!existingSakit) {
          const newSakitRecord: SantriSakitRecord = {
            id: "sakit_pku_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            musyrifId: rec.musyrifId,
            musyrifName: rec.musyrifName,
            asrama: rec.asrama,
            kamar: rec.kamar,
            date: rec.date,
            namaSantri: rec.namaSantri,
            kelasSantri: rec.kelasSantri,
            keluhan: rec.catatan,
            lokasiPerawatan: "rs_pku",
            catatanTindakan: `Dirujuk ke ${rec.lokasiTujuan} oleh ${rec.musyrifName}`,
            status: "dalam_perawatan",
            photoUrl: rec.photoUrl,
            createdAt: rec.createdAt
          };
          handleSaveSantriSakit(newSakitRecord);
        }

        // SINKRONISASI 3: SANTRI IZIN KELUAR (Kategori Kesehatan / Berobat)
        const idSurat = `IZN-MED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        newIzinListToSave.push({
          id: idSurat,
          nomorSurat: idSurat,
          santriId: rec.santriId,
          nisn: rec.nisn || "-",
          namaSantri: rec.namaSantri,
          kelas: rec.kelasSantri,
          asrama: rec.asrama,
          kamar: rec.kamar || "Kamar",
          jenisIzin: "kesehatan_berobat",
          keperluan: `Rujukan Medis: ${rec.lokasiTujuan} (${rec.catatan})`,
          tujuan: rec.lokasiTujuan,
          startDate: rec.date,
          endDate: rec.date,
          jamKeluarRencana: rec.waktu,
          jamKembaliRencana: "21:00",
          namaPenjemput: rec.musyrifName,
          hubunganPenjemput: "Pihak Sekolah / Guru",
          statusApproval: "approved",
          status: "APPROVED",
          disetujuiOleh: rec.musyrifName,
          catatanPamong: `Didampingi musyrif ${rec.musyrifName}`,
          photoUrl: rec.photoUrl,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }

      // SINKRONISASI 4: LEMBAR PEMBINAAN (Jika kategori bina_santri)
      if (rec.kategori === "bina_santri") {
        newPembinaanRecords.push({
          id: "bina_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          tanggal: rec.date,
          waktu: rec.waktu,
          santriId: rec.santriId,
          nisn: rec.nisn,
          namaSantri: rec.namaSantri,
          kelasSantri: rec.kelasSantri,
          asrama: rec.asrama,
          kamar: rec.kamar,
          jenis: "prestasi",
          kategori: "akhlak_adab",
          tingkat: "prestasi",
          poin: 5,
          judulPeristiwa: `Bimbingan & Konseling Bersama Musyrif di ${rec.lokasiTujuan}`,
          deskripsi: rec.catatan,
          lokasiKejadian: rec.lokasiTujuan,
          tindakanPembinaan: "Sesi bimbingan, konseling motivasi, dan evaluasi adab",
          status: "selesai",
          pelaporId: rec.musyrifId,
          pelaporName: rec.musyrifName,
          pelaporRole: "Musyrif",
          createdAt: nowIso
        });
      }
    });

    // Jalankan simpan batch izin keluar santri
    if (newIzinListToSave.length > 0) {
      setSantriIzinList(prev => {
        const next = [...newIzinListToSave, ...prev];
        try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(next)); } catch {}
        return next;
      });
      newIzinListToSave.forEach(r => googleSyncService.enqueue("SantriIzin", r, "upsert"));
    }

    // Jalankan simpan ke lembar pembinaan
    if (newPembinaanRecords.length > 0) {
      try {
        const raw = localStorage.getItem("syamsa_lembar_pembinaan_v1");
        const existing = raw ? JSON.parse(raw) : [];
        const merged = [...newPembinaanRecords, ...(Array.isArray(existing) ? existing : [])];
        localStorage.setItem("syamsa_lembar_pembinaan_v1", JSON.stringify(merged));
      } catch {}
    }

    const totalPts = records.reduce((acc, curr) => acc + curr.poin, 0);
    showToast(`Tugas pengasuhan ${records.length} santri tersimpan & tersinkron ke Logbook, Sakit, Izin Keluar & Pembinaan (+${totalPts} Poin)!`, "success");
  };

  const handleDeletePengasuhanKhusus = (id: string) => {
    setPengasuhanKhususList(prev => prev.filter(p => p.id !== id));
    googleSyncService.enqueue("PengasuhanKhusus", { id }, "delete");
    showToast("Catatan tugas pengasuhan dihapus", "info");
  };

  const activeSantriSakitCount = (() => {
    const active = santriSakitList.filter(s => s.status === "dalam_perawatan");
    if (authUser?.role === "koordinator_musyrif") return active.length;
    if (authUser?.role === "pamong") return active.filter(s => s.asrama === authUser?.asrama).length;
    if (authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung") {
      return active.filter(s => s.musyrifId === (authUser?.musyrifId || authUser?.id)).length;
    }
    return active.length;
  })();

  // Handlers for Perizinan Santri Asrama (SOP Sedayu & Seluruh Asrama)
  const handleSaveSantriIzin = async (
    recOrList: Omit<SantriIzinRecord, "id" | "nomorSurat" | "createdAt" | "updatedAt"> | Array<Omit<SantriIzinRecord, "id" | "nomorSurat" | "createdAt" | "updatedAt">>
  ) => {
    const list = Array.isArray(recOrList) ? recOrList : [recOrList];
    if (list.length === 0) return;

    const now = new Date();
    const newRecords: SantriIzinRecord[] = list.map((rec, idx) => {
      const idUnik = `IZN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${idx > 0 ? `-${idx + 1}` : ""}`;
      const foto = rec.fotoSantriUrl || rec.lampiranUrl || (rec as any).photoUrl || "";

      return {
        ...rec,
        id: idUnik,
        nomorSurat: idUnik,
        statusApproval: rec.statusApproval || "approved",
        status: (rec.status || (rec.statusApproval === "rejected" ? "REJECTED" : "APPROVED")).toUpperCase(),
        disetujuiOleh: rec.disetujuiOleh || authUser?.name || "Musyrif / Pamong",
        photoUrl: foto || undefined,
        fotoSantriUrl: undefined,
        lampiranUrl: undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
    });

    setSantriIzinList(prev => {
      const next = [...newRecords, ...prev];
      try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(next)); } catch {}
      return next;
    });

    // Push each new record ke Database Presensi via googleSyncService with single consolidated batch flush
    newRecords.forEach((r, idx) => {
      googleSyncService.enqueue("SantriIzin", r, "upsert", idx === newRecords.length - 1);
    });

    if (newRecords.length === 1) {
      showToast(`Izin ${newRecords[0].namaSantri} (${newRecords[0].nomorSurat}) berhasil diterbitkan!`, "success");
    } else {
      showToast(`Izin rombongan untuk ${newRecords.length} santri berhasil diterbitkan serentak!`, "success");
    }
  };

  const handleApproveSantriIzin = (id: string, approved: boolean, catatan?: string) => {
    const nowIso = new Date().toISOString();
    const approvedStatus = approved ? "approved" : "rejected";
    const statusUpper = approved ? "APPROVED" : "REJECTED";

    setSantriIzinList(prev => {
      const next = prev.map(item => {
        if (item.id === id || item.nomorSurat === id) {
          const updated: SantriIzinRecord = {
            ...item,
            statusApproval: approvedStatus,
            status: statusUpper,
            pemberiIzin: authUser?.name || "Pamong Asrama",
            disetujuiOleh: authUser?.name || "Pamong Asrama",
            rolePenyetuju: authUser?.role || "pamong",
            waktuPenyetujuan: nowIso,
            catatanPenolakan: catatan || item.catatanPenolakan,
            updatedAt: nowIso
          };

          // Push update status ke Database Presensi via unified googleSyncService
          googleSyncService.enqueue("SantriIzin", updated, "upsert", true);
          return updated;
        }
        return item;
      });

      try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(next)); } catch {}
      return next;
    });

    showToast(approved ? "Izin santri disetujui & tersimpan permanen" : "Izin santri ditolak", approved ? "success" : "warning");
  };

  const handlePKMTap = (id: string, type: "keluar" | "kembali", petugasName: string) => {
    const now = new Date();
    const nowIso = now.toISOString();

    setSantriIzinList(prev => {
      const next = prev.map(item => {
        if (item.id === id || item.nomorSurat === id) {
          let updated: SantriIzinRecord;
          if (type === "keluar") {
            updated = {
              ...item,
              statusPKM: "di_luar",
              status: "CHECKED_OUT",
              tglKeluarAktual: nowIso,
              petugasPKMKeluar: petugasName,
              updatedAt: nowIso
            };
            googleSyncService.enqueue("SantriIzin", updated, "upsert", true);
            showToast(`Check-Out gerbang: ${item.namaSantri} tercatat KELUAR`, "info");
          } else {
            const batasKembali = new Date(`${item.tglKembaliRencana}T${item.jamKembaliRencana}:00`);
            const isLate = now > batasKembali;
            const statusPKM = isLate ? "terlambat" : "kembali_tepat_waktu";
            updated = {
              ...item,
              statusPKM: statusPKM,
              status: "RETURNED",
              tglKembaliAktual: nowIso,
              petugasPKMKembali: petugasName,
              updatedAt: nowIso
            };
            googleSyncService.enqueue("SantriIzin", updated, "upsert", true);
            showToast(
              isLate 
                ? `Check-In gerbang: ${item.namaSantri} tercatat KEMBALI (TERLAMBAT)` 
                : `Check-In gerbang: ${item.namaSantri} tercatat KEMBALI TEPAT WAKTU`,
              isLate ? "warning" : "success"
            );
          }
          return updated;
        }
        return item;
      });

      try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleUpdateSantriIzin = (updatedRecord: SantriIzinRecord) => {
    setSantriIzinList(prev => {
      const next = prev.map(item => {
        if (item.id === updatedRecord.id || item.nomorSurat === updatedRecord.nomorSurat) {
          return {
            ...item,
            ...updatedRecord,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      try { localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(next)); } catch {}
      return next;
    });
    googleSyncService.enqueue("SantriIzin", updatedRecord, "upsert", true);
  };

  const handleDeleteSantriIzin = (id: string) => {
    setSantriIzinList(prev => prev.filter(item => item.id !== id && item.nomorSurat !== id));
    googleSyncService.enqueue("SantriIzin", { id }, "delete", true);
    showToast("Data perizinan santri dihapus", "info");
  };

  const activeSantriIzinCount = (() => {
    return santriIzinList.filter(i => {
      if (!i) return false;
      const status = String(i.statusApproval || "");
      const pkm = String(i.statusPKM || "");
      return status.startsWith("pending") || (status === "approved" && pkm === "di_luar");
    }).length;
  })();

  // Reset All System Data (Wipe local states and clear Google Sheet tabs)
  const handleResetAll = async () => {
    setRecords([]);
    setIzinList([]);
    setKegiatanRecords([]);
    setLogbookData({});
    setMutabaahData({});
    setSantriSakitList([]);
    setMusyrifList(MUSYRIF_LIST);
    await googleSyncService.resetAllData();
    showToast("Seluruh database & cache berhasil di-reset bersih!", "info");
  };

  // Records map for quick lookup in modals
  const recordsMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach(r => {
      map[`${r.musyrifId}_${r.date}`] = r;
    });
    return map;
  }, [records]);

  // Notification state synchronization for Header Bell badge
  const [notifReadVersion, setNotifReadVersion] = useState(0);

  useEffect(() => {
    const handleNotifUpdate = () => setNotifReadVersion(v => v + 1);
    window.addEventListener("presensi_notif_read_updated", handleNotifUpdate);
    window.addEventListener("storage", handleNotifUpdate);
    return () => {
      window.removeEventListener("presensi_notif_read_updated", handleNotifUpdate);
      window.removeEventListener("storage", handleNotifUpdate);
    };
  }, []);

  // Notification count calculation for Header Bell badge
  const notificationBadgeCount = useMemo(() => {
    if (!authUser) return 0;
    const allNotifs = buildSystemNotificationItems({
      authUser,
      musyrifList,
      recordsMap,
      santriSakitList,
      santriIzinList,
      santriRequests,
      izinList,
      kegiatanRecords,
      logbookData,
      mutabaahData,
      now,
    });
    const readMap = getReadNotificationMap();
    return allNotifs.filter(n => !readMap[n.id]).length;
  }, [
    authUser, musyrifList, recordsMap, santriSakitList, santriIzinList, santriRequests,
    izinList, kegiatanRecords, logbookData, mutabaahData, now, notifReadVersion
  ]);

  const pendingIzinCount = izinList.filter(i => i.status === "pending").length;
  const todayRecs = records.filter(r=>r.date===todayStr());
  const allFieldM = (musyrifList && musyrifList.length > 0 ? musyrifList : MUSYRIF_LIST).filter(isFieldMusyrif);
  const pendingSubuh = allFieldM.filter(m=>{ const r=todayRecs.find(x=>x.musyrifId===m.id); return !r?.subuh; }).length;
  const pendingMaghrib = allFieldM.filter(m=>{ const r=todayRecs.find(x=>x.musyrifId===m.id); return !r?.maghrib; }).length;
  const hijri = toHijri(now);

  // ─── PULL TO REFRESH LOGIC ───
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const REFRESH_THRESHOLD = 75;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Refresh server-synchronized clock & anti-spoofing
    const syncRes = await syncServerTime();
    setNow(syncRes.serverDate);

    // Flush pending queue then force full re-fetch from Sheet (Single Source of Truth)
    await googleSyncService.flushQueue();
    await googleSyncService.fetchAllFromCloud();

    // Simulated network sync delay for smooth microinteraction
    await new Promise(res => setTimeout(res, 600));
    setIsRefreshing(false);
    setPullDistance(0);
    showToast(
      syncRes.status === "drift_detected"
        ? `Presensi dikalibrasi ke Waktu Server resmi (${syncRes.driftMinutes}m drift)`
        : "Data & Waktu Sheet berhasil disinkronkan!",
      syncRes.status === "drift_detected" ? "info" : "success"
    );
  }, [showToast]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;
    if (window.scrollY > 0) {
      isDragging.current = false;
      setPullDistance(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      // Apply rubber-band friction only when pulling down from the top
      const dist = Math.min(80, diff * 0.4);
      setPullDistance(dist);
    } else {
      isDragging.current = false;
      setPullDistance(0);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  if (isInitialSyncing) {
    return <AppSkeleton />;
  }

  return (
    <div 
      className={`min-h-screen ${page === "galeri-logbook" ? "bg-white" : "bg-[#F4F8FF]"} text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white relative overflow-x-hidden`} 
      style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <CustomDialogModal />

      {/* Pull to Refresh Animated Indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${isRefreshing ? 64 : Math.min(pullDistance, 85)}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-sky-100 text-xs font-semibold text-slate-700">
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
              <span className="text-sky-700">Memperbarui data...</span>
            </>
          ) : pullDistance >= REFRESH_THRESHOLD ? (
            <>
              <RefreshCw className="w-4 h-4 text-sky-600 transition-transform duration-200 rotate-180" />
              <span className="text-sky-700 font-bold">Lepaskan untuk memuat ulang</span>
            </>
          ) : (
            <>
              <ArrowDown 
                className="w-4 h-4 text-slate-400 transition-transform duration-150" 
                style={{ transform: `rotate(${Math.min(180, (pullDistance / REFRESH_THRESHOLD) * 180)}deg)` }}
              />
              <span className="text-slate-500">Tarik untuk memuat ulang</span>
            </>
          )}
        </div>
      </div>
      
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in duration-300">
          <WifiOff className="w-4 h-4" />
          <span>Mode Offline Aktif — Presensi tetap tersimpan lokal dan akan sinkron saat terhubung kembali.</span>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2.5 max-w-[90vw] sm:max-w-sm w-auto backdrop-blur-md"
            style={{
              backgroundColor: toast.type === "error" ? "rgba(254, 242, 242, 0.95)" : toast.type === "info" ? "rgba(240, 249, 255, 0.95)" : "rgba(240, 248, 255, 0.95)",
              borderColor: toast.type === "error" ? "#fecaca" : toast.type === "info" ? "#bae6fd" : "#bfdbfe",
              color: toast.type === "error" ? "#991b1b" : toast.type === "info" ? "#0369a1" : "#0c4e8c"
            }}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : toast.type === "info" ? (
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seamless Header - Non-sticky & Natural Scroll */}
      <header className={`w-full transition-colors ${page === "galeri-logbook" ? "bg-white pt-[max(env(safe-area-inset-top),0.875rem)] pb-2.5 border-b border-slate-100" : "pt-[max(env(safe-area-inset-top),1.25rem)] pb-1"}`}>
        <div className={`${page === "galeri-logbook" ? "max-w-lg" : "max-w-2xl"} mx-auto px-4 flex items-center justify-between gap-3`}>

          {/* Pure Logo SYAMSA Primary - Aligned with Hero Card */}
          <div 
            className="cursor-pointer select-none flex items-center active:scale-95 transition-transform" 
            onClick={() => {
              triggerHaptic("medium");
              if (page === "about-syamsa") {
                setPage("dashboard");
              } else {
                setPage("about-syamsa");
              }
            }}
            title="syamsa - Madrasah Mu'allimin Muhammadiyah Yogyakarta"
          >
            <img 
              src={syamsaPrimaryLogo} 
              alt="Logo syamsa" 
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-xs" 
            />
          </div>

          {/* Header Quick Action Icons - Role & Public Aware */}
          <div className="flex items-center gap-1.5 pr-0">
            {page === "galeri-logbook" ? (
              /* Feed/Grid Toggle for Gallery Page */
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setGalleryViewMode("feed")}
                  className={`p-2 rounded-lg transition-all ${
                    galleryViewMode === "feed"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Feed View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGalleryViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    galleryViewMode === "grid"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Realtime Cloud Sync Badge — Only visible for logged-in users */}
                {authUser && <CloudSyncBadge onClick={() => setShowCloudSync(true)} />}

                {/* Notification Center Bell Button — Only visible for logged-in users */}
                {authUser && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setPage("notifikasi");
                    }}
                    title="Pusat Notifikasi & Update Data"
                    className={`w-8 h-8 rounded-full relative flex items-center justify-center transition-all active:scale-95 ${
                      page === "galeri-logbook"
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        : "bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-sky-50 hover:text-sky-700 text-slate-600 shadow-xs"
                    } ${page === "notifikasi" ? "bg-sky-100 text-sky-800 ring-2 ring-sky-500/30" : ""}`}
                  >
                    <Bell className="w-4 h-4"/>
                    {notificationBadgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                        {notificationBadgeCount > 9 ? "9+" : notificationBadgeCount}
                      </span>
                    )}
                  </button>
                )}

                {authUser ? (
                  <div className={`flex items-center gap-1.5 rounded-full p-1 pl-1 ${
                    page === "galeri-logbook"
                      ? "bg-slate-100"
                      : "bg-white/90 backdrop-blur-xl border border-white/80 shadow-xs shadow-2xs"
                  }`}>
                    <div title={authUser.name} className="flex items-center justify-center cursor-default">
                      <Av name={authUser.name} src={authUser.picture} sz="xs" />
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title={`Keluar akun (${authUser.name})`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                        page === "galeri-logbook"
                          ? "bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500"
                          : "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                      }`}
                    >
                      <LogOut className="w-3 h-3"/>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={()=>setShowLogin(true)}
                    className="flex items-center gap-1.5 bg-[#0C81E4] hover:bg-[#0C4E8C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md shadow-sky-600/25 active:scale-95 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5"/>
                    <span>Masuk</span>
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main */}
      <main className={page === "galeri-logbook" ? "w-full max-w-lg mx-auto px-0 py-0 pb-24 flex-1" : "max-w-2xl mx-auto px-4 py-5 pb-24 w-full flex-1"}>
        {/* Anti Time-Spoofing & Drift Alert Banner */}
        {timeSyncState?.status === "drift_detected" && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md flex items-start gap-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-900">Perbedaan Jam Terdeteksi ({timeSyncState.driftMinutes} menit)</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Jam perangkat Anda tidak sinkron. Sistem otomatis menggunakan <strong>Waktu Server ({timeSyncState.source})</strong> untuk memastikan validitas presensi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRefresh()}
              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] shrink-0 active:scale-95 transition-all shadow-xs"
            >
              Sinkronkan
            </button>
          </div>
        )}

        <Suspense fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-8 h-8 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-medium text-slate-500">Memuat halaman...</p>
          </div>
        }>
          <AnimatePresence mode="wait">
            {page==="dashboard" && (
            <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageDashboard 
                records={records} 
                authUser={authUser} 
                onGoTo={setPage} 
                onSelectMusyrif={setSelectedMusyrifId}
                onOpenWA={() => setShowWA(true)}
                onOpenIzin={() => setShowIzin(true)}
                onOpenAlarm={() => setShowAlarm(true)}
                onOpenKegiatan={() => setShowKegiatan(true)}
                onOpenLogbook={() => {
                  setTargetMusyrifId(undefined);
                  setTargetDate(undefined);
                  setTargetTaskKey(undefined);
                  setPage("logbook");
                }}
                onNavigateToLogbook={(mId, d, tKey) => {
                  setSelectedMusyrifId(mId);
                  setTargetMusyrifId(mId);
                  setTargetDate(d);
                  setTargetTaskKey(tKey);
                  setPage("logbook");
                }}
                onOpenMutabaah={() => setShowMutabaah(true)}
                onOpenSantriSakit={() => setShowSantriSakit(true)}
                onOpenSantriIzin={() => setPage("izin-santri")}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
                onOpenRaport={() => setShowRaport(true)}
                onOpenMusyrifManager={() => setPage("musyrif-manager")}
                onOpenPamongManager={() => setPage("pamong-manager")}
                onOpenKalenderHijriah={() => setPage("kalender-hijriah")}
                onOpenKalenderPendidikan={() => setPage("kalender-pendidikan")}
                onInstallPWA={handleInstallPWA}
                onLogin={() => setShowLogin(true)}
                onSetTargetAsrama={setTargetAsramaForPresensi}
                pendingIzinCount={pendingIzinCount}
                activeSantriSakitCount={activeSantriSakitCount}
                activeSantriIzinCount={activeSantriIzinCount}
                canInstallPWA={!!deferredPrompt}
                musyrifList={musyrifList}
                izinList={izinList}
                santriSakitList={santriSakitList}
                santriIzinList={santriIzinList}
                logbookData={logbookData}
                mutabaahData={mutabaahData}
                kegiatanRecords={kegiatanRecords}
                isLoadingIzinSedayu={isLoadingIzinSedayu}
                canDeletePhoto={canDeletePhoto}
                onSaveLogbook={handleSaveLogbook}
                showToast={showToast}
              />
            </motion.div>
          )}
          {(page==="subuh" || page==="maghrib") && (
            <motion.div key="presensi-input" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageInputPrayer
                initialSlot={page}
                initialAsrama={targetAsramaForPresensi || undefined}
                authUser={authUser}
                records={records}
                onMark={handleMark}
                onMarkAll={handleMarkAll}
                onResetMark={handleResetMark}
                onLogin={()=>setShowLogin(true)}
                onSwitchSlot={(s)=>setPage(s)}
                showToast={showToast}
                musyrifListAll={musyrifList}
              />
            </motion.div>
          )}
          {page==="rekap" && (
            <motion.div key="rekap" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageRekap 
                records={records} 
                authUser={authUser} 
                onSelectMusyrif={setSelectedMusyrifId} 
                onGoTo={setPage}
                musyrifListAll={musyrifList}
              />
            </motion.div>
          )}
          {page==="riwayat" && (
            <motion.div key="riwayat" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageRiwayat
                records={records}
                logbookData={logbookData}
                mutabaahData={mutabaahData}
                izinList={izinList}
                kegiatanRecords={kegiatanRecords}
                agendaRapatList={agendaRapatList}
                pengasuhanList={pengasuhanKhususList}
                authUser={authUser} 
                onLogin={()=>setShowLogin(true)} 
                initialMusyrifId={selectedMusyrifId} 
                onSelectMusyrifId={setSelectedMusyrifId}
                onMark={handleMark}
                onSaveLogbook={handleSaveLogbook}
                showToast={showToast}
                musyrifListAll={musyrifList}
              />
            </motion.div>
          )}
          {page==="ibadah" && (
            <motion.div key="ibadah" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageIbadah 
                onBack={()=>setPage("dashboard")} 
                onOpenKalenderHijriah={() => setPage("kalender-hijriah")}
              />
            </motion.div>
          )}
          {page==="logbook" && (
            <motion.div key="logbook" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <JurnalLogbookModal
                isPage={true}
                onClose={() => {
                  setPage("dashboard");
                  setTargetMusyrifId(undefined);
                  setTargetDate(undefined);
                  setTargetTaskKey(undefined);
                }}
                authUser={authUser}
                musyrifList={musyrifList}
                logbookData={logbookData}
                agendaList={agendaRapatList}
                initialMusyrifId={targetMusyrifId}
                initialDate={targetDate}
                initialTaskKey={targetTaskKey}
                initialGpsResult={globalGpsResult}
                onSaveLogbook={handleSaveLogbook}
                onResetLogbook={handleResetLogbook}
                onOpenSantriSakit={() => setPage("santri-sakit")}
                onOpenAgendaRapat={() => setPage("agenda-rapat")}
                onOpenMutabaah={() => setPage("mutabaah")}
                onOpenPengasuhanKhusus={() => setPage("pengasuhan-santri")}
              />
            </motion.div>
          )}
          {page==="galeri-logbook" && (
            <motion.div key="galeri-logbook" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageGaleriLogbook
                onBack={() => setPage("dashboard")}
                onOpenLogbook={() => setPage("logbook")}
                logbookData={logbookData}
                musyrifList={musyrifList}
                authUsers={authUsers}
                authUser={authUser}
                onLogin={() => setShowLogin(true)}
                viewMode={galleryViewMode}
                onViewModeChange={setGalleryViewMode}
                onSaveLogbook={handleSaveLogbook}
                showToast={showToast}
              />
            </motion.div>
          )}
          {page==="mutabaah" && (
            <motion.div key="mutabaah" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <MutabaahYaumiyahModal
                isPage={true}
                onClose={() => {
                  setPage("dashboard");
                  setTargetMusyrifId(undefined);
                  setTargetDate(undefined);
                }}
                authUser={authUser}
                musyrifList={musyrifList}
                mutabaahData={mutabaahData}
                initialMusyrifId={targetMusyrifId}
                initialDate={targetDate}
                onSaveMutabaah={handleSaveMutabaah}
                onResetMutabaah={handleResetMutabaah}
                onOpenLogbook={() => setPage("logbook")}
              />
            </motion.div>
          )}
          {page==="santri-sakit" && (
            <motion.div key="santri-sakit" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <SantriSakitModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                santriList={santriList}
                santriSakitList={santriSakitList}
                onSaveSantriSakit={handleSaveSantriSakit}
                onUpdateStatus={handleUpdateStatusSantriSakit}
                onDeleteSantriSakit={handleDeleteSantriSakit}
              />
            </motion.div>
          )}
          {page==="izin" && (
            <motion.div key="izin" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <IzinPengajuanModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                izinList={izinList}
                onSubmitIzin={handleSubmitIzin}
                onUpdateIzin={handleUpdateIzin}
                onApproveIzin={handleApproveIzin}
                onDeleteIzin={handleDeleteIzin}
              />
            </motion.div>
          )}
          {(page === "izin-santri" || (page as any) === "santri-izin") && (
            <motion.div key="izin-santri" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageSantriIzin
                onBack={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                asramaList={ASRAMAS}
                santriList={santriList}
                santriIzinList={santriIzinList}
                onSaveSantriIzin={handleSaveSantriIzin}
                onUpdateSantriIzin={handleUpdateSantriIzin}
                onApproveSantriIzin={handleApproveSantriIzin}
                onPKMTap={handlePKMTap}
                onDeleteSantriIzin={handleDeleteSantriIzin}
              />
            </motion.div>
          )}
          {page==="kegiatan" && (
            <motion.div key="kegiatan" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <KegiatanAsramaModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                musyrifList={musyrifList}
                asramaList={ASRAMAS}
                kegiatanRecords={kegiatanRecords}
                onSaveKegiatan={handleSaveKegiatan}
                onDeleteKegiatan={handleDeleteKegiatan}
                authUser={authUser}
              />
            </motion.div>
          )}
          {page==="leaderboard" && (
            <motion.div key="leaderboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <LeaderboardModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                musyrifList={musyrifList}
                records={recordsMap}
                logbookData={logbookData}
                kegiatanRecords={kegiatanRecords}
                mutabaahData={mutabaahData}
                onSelectMusyrif={(mid, mode) => {
                  setSelectedMusyrifId(mid);
                  if (mode === "raport" || !authUser) {
                    setPage("raport");
                  } else {
                    setPage("riwayat");
                  }
                }}
              />
            </motion.div>
          )}
          {page==="raport" && (
            <motion.div key="raport" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <RaportSertifikatModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                musyrifList={musyrifList}
                records={recordsMap}
                logbookData={logbookData}
                kegiatanRecords={kegiatanRecords}
                mutabaahData={mutabaahData}
              />
            </motion.div>
          )}
          {page==="musyrif-manager" && (
            <motion.div key="musyrif-manager" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <MusyrifManagerModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                musyrifList={musyrifList}
                asramaList={ASRAMAS}
                pamongList={pamongList}
                onAddMusyrif={handleAddMusyrif}
                onUpdateMusyrif={handleUpdateMusyrif}
                onDeleteMusyrif={handleDeleteMusyrif}
                onSyncAllOfficialData={handleSyncAllOfficialData}
                authUser={authUser}
              />
            </motion.div>
          )}
          {page==="kalender-hijriah" && (
            <motion.div key="kalender-hijriah" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageKalenderHijriah 
                onBack={()=>setPage("dashboard")} 
                initialDate={now}
              />
            </motion.div>
          )}
          {page==="kalender-pendidikan" && (
            <motion.div key="kalender-pendidikan" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageKalenderPendidikan 
                onBack={()=>setPage("dashboard")} 
                userEmail={authUser?.email}
                userRole={authUser?.role}
              />
            </motion.div>
          )}
          {page==="pamong-manager" && (
            <motion.div key="pamong-manager" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PamongManagerModal
                isPage={true}
                onClose={() => setPage("dashboard")}
                pamongList={pamongList}
                asramaList={ASRAMAS}
                onAddPamong={handleAddPamong}
                onUpdatePamong={handleUpdatePamong}
                onDeletePamong={handleDeletePamong}
                authUser={authUser}
              />
            </motion.div>
          )}
          {page==="data-santri" && authUser && (
            <motion.div key="data-santri" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <DataSantriModal
                onClose={() => setPage("dashboard")}
                isPage={true}
                authUser={authUser}
                musyrifList={musyrifList}
                santriList={santriList}
                santriRequests={santriRequests}
                onSaveSantri={handleSaveSantri}
                onDeleteSantri={handleDeleteSantri}
                onResetSantri={handleResetSantri}
                onRequestChange={handleRequestSantriChange}
                onApproveRequest={handleApproveSantriRequest}
                onRejectRequest={handleRejectSantriRequest}
                onSelectSantriForIzin={() => setPage("izin-santri")}
                onSelectSantriForSakit={() => setPage("santri-sakit")}
              />
            </motion.div>
          )}
          {page==="peta-santri" && authUser && (
            <motion.div key="peta-santri" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <SantriMapModal
                onClose={() => setPage("dashboard")}
                isPage={true}
                santriList={santriList}
              />
            </motion.div>
          )}
          {page==="about-syamsa" && (
            <motion.div key="about-syamsa" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageAboutSyamsa
                onBack={() => setPage("dashboard")}
                authUser={authUser}
                onGoTo={setPage}
              />
            </motion.div>
          )}
          {page==="notifikasi" && (
            <motion.div key="notifikasi" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageNotifikasi
                onBack={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                recordsMap={recordsMap}
                santriSakitList={santriSakitList}
                santriIzinList={santriIzinList}
                santriRequests={santriRequests}
                izinList={izinList}
                kegiatanRecords={kegiatanRecords}
                logbookData={logbookData}
                mutabaahData={mutabaahData}
                now={now}
                onGoTo={setPage}
                onOpenSantriSakit={() => setShowSantriSakit(true)}
                onOpenSantriIzin={() => setPage("izin-santri")}
                onOpenDataSantri={() => setPage("data-santri")}
                onOpenIzinMusyrif={() => setPage("izin")}
                onOpenKegiatan={() => setPage("kegiatan")}
                onOpenLogbook={(musyrifId, date, taskKey) => {
                  if (musyrifId) {
                    setSelectedMusyrifId(musyrifId);
                    setTargetMusyrifId(musyrifId);
                  }
                  if (date) setTargetDate(date);
                  if (taskKey) setTargetTaskKey(taskKey);
                  setPage("logbook");
                }}
                onOpenMutabaah={(musyrifId, date) => {
                  if (musyrifId) {
                    setSelectedMusyrifId(musyrifId);
                    setTargetMusyrifId(musyrifId);
                  }
                  if (date) setTargetDate(date);
                  setPage("mutabaah");
                }}
                onOpenAlarm={() => setShowAlarm(true)}
                onOpenCloudSync={() => setShowCloudSync(true)}
              />
            </motion.div>
          )}
          {page==="pembinaan" && (
            <motion.div key="pembinaan" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PagePembinaanSantri
                onBack={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                santriList={santriList}
              />
            </motion.div>
          )}
          {page==="agenda-rapat" && (
            <motion.div key="agenda-rapat" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PageAgendaRapat
                onGoBack={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                asramaList={ASRAMAS}
                agendaList={agendaRapatList}
                logbookData={logbookData}
                onSaveAgenda={handleSaveAgendaRapat}
                onDeleteAgenda={handleDeleteAgendaRapat}
              />
            </motion.div>
          )}
          {page==="pengasuhan-santri" && (
            <motion.div key="pengasuhan-santri" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <PagePengasuhanSantri
                onBack={() => setPage("dashboard")}
                authUser={authUser}
                musyrifList={musyrifList}
                santriList={santriList}
                pengasuhanList={pengasuhanKhususList}
                onSavePengasuhan={handleSavePengasuhanKhusus}
                onSaveBatchPengasuhan={handleSaveBatchPengasuhanKhusus}
                onDeletePengasuhan={handleDeletePengasuhanKhusus}
                initialMusyrifId={selectedMusyrifId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </main>

      {/* Floating Bottom Nav Dock - Role & Public Aware with Fluid Spring Pill */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-1 pointer-events-none flex justify-center">
        <nav className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-full shadow-[0_12px_36px_-8px_rgba(12,78,140,0.18),0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 px-2 py-1.5 flex items-center justify-around border border-white/60">
          {navItems.map(nav=>{
            const isPresensiItem = nav.label === "Presensi";
            const active = isPresensiItem ? (page === "subuh" || page === "maghrib") : page === nav.id;

            return (
              <button 
                key={nav.id} 
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  if (isPresensiItem) {
                    if (page !== "subuh" && page !== "maghrib") {
                      setPage(getTrustedDate().getHours() < 12 ? "subuh" : "maghrib");
                    }
                  } else {
                    setPage(nav.id);
                  }
                }} 
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-full relative active:scale-90 select-none transition-colors duration-200 ${
                  active 
                    ? (page === "subuh" ? "text-amber-800 font-bold" : "text-[#0C81E4] font-bold") 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={springSmooth}
                    className={`absolute inset-0 rounded-full ${
                      page === "subuh" ? "bg-amber-100/80 shadow-2xs" : "bg-sky-100/80 shadow-2xs"
                    }`}
                  />
                )}
                <div className="relative z-10">
                  <nav.Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}/>
                </div>
                <span className="text-[10px] tracking-tight relative z-10">{nav.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <LoginModal
            onClose={()=>setShowLogin(false)}
            onLogin={handleLogin}
            authUsers={authUsers}
            musyrifList={musyrifList}
            onInjectMaster={handleSilentInjectMaster}
          />
        )}
      </AnimatePresence>

      {/* ─── MODALS (LAZY LOADED) ─── */}
      <Suspense fallback={null}>
        {/* 1. WhatsApp Generator Modal */}
        <AnimatePresence>
          {showWA && (
          <WhatsAppShareModal
            onClose={() => setShowWA(false)}
            musyrifList={musyrifList}
            records={recordsMap}
            asramaList={ASRAMAS}
            authUser={authUser}
          />
        )}
      </AnimatePresence>

      {/* 2. Izin & Sakit Modal */}
      <AnimatePresence>
        {showIzin && (
          <IzinPengajuanModal
            onClose={() => setShowIzin(false)}
            authUser={authUser}
            musyrifList={musyrifList}
            izinList={izinList}
            onSubmitIzin={handleSubmitIzin}
            onUpdateIzin={handleUpdateIzin}
            onApproveIzin={handleApproveIzin}
            onDeleteIzin={handleDeleteIzin}
          />
        )}
      </AnimatePresence>

      {/* 3. Alarm & Web Notification Modal */}
      <AnimatePresence>
        {showAlarm && (
          <AlarmNotificationManager
            onClose={() => setShowAlarm(false)}
            nextPrayerName={nextPrayer?.name || "Subuh"}
            nextPrayerTime={nextPrayer?.time || "04:38"}
          />
        )}
      </AnimatePresence>

      {/* 4. Agenda Non-Shalat Modal */}
      <AnimatePresence>
        {showKegiatan && (
          <KegiatanAsramaModal
            onClose={() => setShowKegiatan(false)}
            musyrifList={musyrifList}
            asramaList={ASRAMAS}
            kegiatanRecords={kegiatanRecords}
            onSaveKegiatan={handleSaveKegiatan}
            onDeleteKegiatan={handleDeleteKegiatan}
            authUser={authUser}
          />
        )}
      </AnimatePresence>

      {/* 5. Mutaba'ah Yaumiyah Modal */}
      <AnimatePresence>
        {showMutabaah && (
          <MutabaahYaumiyahModal
            onClose={() => {
              setShowMutabaah(false);
              setTargetMusyrifId(undefined);
              setTargetDate(undefined);
            }}
            authUser={authUser}
            musyrifList={musyrifList}
            mutabaahData={mutabaahData}
            initialMusyrifId={targetMusyrifId}
            initialDate={targetDate}
            onSaveMutabaah={handleSaveMutabaah}
            onResetMutabaah={handleResetMutabaah}
          />
        )}
      </AnimatePresence>

      {/* 7. Pantauan Santri Sakit Modal */}
      <AnimatePresence>
        {showSantriSakit && (
          <SantriSakitModal
            onClose={() => setShowSantriSakit(false)}
            authUser={authUser}
            musyrifList={musyrifList}
            santriList={santriList}
            santriSakitList={santriSakitList}
            onSaveSantriSakit={handleSaveSantriSakit}
            onUpdateStatus={handleUpdateStatusSantriSakit}
            onDeleteSantriSakit={handleDeleteSantriSakit}
          />
        )}
      </AnimatePresence>

      {/* 7.5. Tugas Pengasuhan Khusus & Bimbingan Santri Modal */}
      <AnimatePresence>
        {showPengasuhanKhusus && (
          <PengasuhanKhususModal
            onClose={() => setShowPengasuhanKhusus(false)}
            authUser={authUser}
            musyrifList={musyrifList}
            santriList={santriList}
            pengasuhanList={pengasuhanKhususList}
            onSavePengasuhan={handleSavePengasuhanKhusus}
            onDeletePengasuhan={handleDeletePengasuhanKhusus}
            initialMusyrifId={selectedMusyrifId}
          />
        )}
      </AnimatePresence>

      {/* 8. Leaderboard Modal (4 Pilar Terpadu) */}
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardModal
            onClose={() => setShowLeaderboard(false)}
            musyrifList={musyrifList}
            records={recordsMap}
            logbookData={logbookData}
            kegiatanRecords={kegiatanRecords}
            mutabaahData={mutabaahData}
            pengasuhanList={pengasuhanKhususList}
            onSelectMusyrif={(mid, mode) => {
              setSelectedMusyrifId(mid);
              setShowLeaderboard(false);
              if (mode === "raport" || !authUser) {
                setShowRaport(true);
              } else {
                setPage("riwayat");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 9. Raport & E-Sertifikat Modal */}
      <AnimatePresence>
        {showRaport && (
          <RaportSertifikatModal
            onClose={() => setShowRaport(false)}
            musyrifList={musyrifList}
            records={recordsMap}
            logbookData={logbookData}
            kegiatanRecords={kegiatanRecords}
            mutabaahData={mutabaahData}
            pengasuhanList={pengasuhanKhususList}
          />
        )}
      </AnimatePresence>

      {/* 10. Master Data Musyrif Modal (SCRUD) */}
      <AnimatePresence>
        {showMusyrifManager && (
          <MusyrifManagerModal
            onClose={() => setShowMusyrifManager(false)}
            musyrifList={musyrifList}
            asramaList={ASRAMAS}
            pamongList={pamongList}
            onAddMusyrif={handleAddMusyrif}
            onUpdateMusyrif={handleUpdateMusyrif}
            onDeleteMusyrif={handleDeleteMusyrif}
            onSyncAllOfficialData={handleSyncAllOfficialData}
            authUser={authUser}
          />
        )}
      </AnimatePresence>

      {/* 11. Master Data Pamong Modal (SCRUD) */}
      <AnimatePresence>
        {showPamongManager && (
          <PamongManagerModal
            onClose={() => setShowPamongManager(false)}
            pamongList={pamongList}
            asramaList={ASRAMAS}
            onAddPamong={handleAddPamong}
            onUpdatePamong={handleUpdatePamong}
            onDeletePamong={handleDeletePamong}
            authUser={authUser}
          />
        )}
      </AnimatePresence>

      {/* 12. Google Sheets Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={showCloudSync}
        onClose={() => setShowCloudSync(false)}
        onResetAll={handleResetAll}
        onInjectMaster={handleSyncAllOfficialData}
        isKoordinator={authUser?.role === "koordinator_musyrif"}
        isDbAdmin={isDbAdmin(authUser)}
        stats={{
          records: records.length,
          izin: izinList.length,
          kegiatan: kegiatanRecords.length,
          logbook: Object.keys(logbookData).length,
          mutabaah: Object.keys(mutabaahData).length,
          santriSakit: santriSakitList.length,
          musyrif: musyrifList.length
        }}
      />
      </Suspense>

      {/* Global Custom Dialog Modal (Alert, Confirm, Prompt & Undo Toast) */}
      <CustomDialogModal />

    </div>
  );
}
