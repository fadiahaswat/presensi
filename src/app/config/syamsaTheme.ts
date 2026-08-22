// SYAMSA Design System Tokens & Color Configuration
// Berdasarkan brandUIUXsyamsa.tsx (Design System v2.0)

export const SYAMSA_COLORS = {
  brand: {
    deep: "#0C4E8C",
    blue: "#0C81E4",
    cyan: "#17C3D4",
    mint: "#4FE7AF",
  },
  surface: {
    background: "#F4F8FF",
    muted: "#EEF3FB",
    card: "#FFFFFF",
    mutedForeground: "#5B7099",
  },
  status: {
    hadir: "#10B981",
    ya: "#10B981",
    telat: "#17C3D4",
    sakit: "#F59E0B",
    izin: "#3B82F6",
    pulang: "#A855F7",
    alpa: "#EF4444",
    tidak: "#64748B",
  },
  sesi: {
    shubuh: "#22C55E",
    sekolah: "#17C3D4",
    ashar: "#EAB308",
    maghrib: "#FB923C",
    isya: "#8B5CF6",
  },
  domain: {
    attendance: "#10B981",
    tahfizh: "#F97316",
    laporan: "#3B82F6",
    profil: "#A855F7",
  },
} as const;

export type StatusKey = "H" | "T" | "S" | "I" | "P" | "A" | "Y" | "-";

export interface StatusMetaItem {
  label: string;
  color: string;
  bg: string;
  score: number;
}

export const STATUS_META: Record<StatusKey, StatusMetaItem> = {
  H: { label: "Hadir", color: "#10B981", bg: "rgba(16,185,129,0.12)", score: 100 },
  Y: { label: "Ya", color: "#10B981", bg: "rgba(16,185,129,0.12)", score: 100 },
  T: { label: "Telat", color: "#17C3D4", bg: "rgba(23,195,212,0.12)", score: 80 },
  S: { label: "Sakit", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", score: 75 },
  I: { label: "Izin", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", score: 75 },
  P: { label: "Pulang", color: "#A855F7", bg: "rgba(168,85,247,0.12)", score: 0 },
  A: { label: "Alpa", color: "#EF4444", bg: "rgba(239,68,68,0.12)", score: -50 },
  "-": { label: "Tidak", color: "#64748B", bg: "rgba(100,116,139,0.12)", score: 0 },
};

export const SESI_META = [
  { id: "shubuh", label: "Shubuh", time: "04:00–06:00", color: "#22C55E", bg: "rgba(34,197,94,0.12)", cssVar: "--color-sesi-shubuh", desc: "Fardu, sunnah, tahfizh" },
  { id: "sekolah", label: "Sekolah", time: "06:00–15:00", color: "#17C3D4", bg: "rgba(23,195,212,0.12)", cssVar: "--color-sesi-sekolah", desc: "KBM sekolah" },
  { id: "ashar", label: "Ashar", time: "15:00–17:00", color: "#EAB308", bg: "rgba(234,179,8,0.12)", cssVar: "--color-sesi-ashar", desc: "Fardu, dzikir" },
  { id: "maghrib", label: "Maghrib", time: "18:00–19:00", color: "#FB923C", bg: "rgba(251,146,60,0.12)", cssVar: "--color-sesi-maghrib", desc: "Fardu, sunnah, KBM mahad" },
  { id: "isya", label: "Isya", time: "19:00–21:00", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", cssVar: "--color-sesi-isya", desc: "Fardu, sunnah, Al-Kahfi" },
] as const;

export const RADIUS_TOKENS = {
  chip: "0.5rem", // 8px
  control: "0.875rem", // 14px
  panel: "1.5rem", // 24px
  full: "9999px",
} as const;
