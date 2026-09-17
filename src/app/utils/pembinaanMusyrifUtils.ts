import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore } from "date-fns";
import { isKampusInduk, isSedayuAsrama } from "./geoUtils";

export type CampusType = "kampus_induk" | "kampus_terpadu";

export interface MusyrifAttendanceStats {
  musyrifId: string;
  name: string;
  campus: CampusType;
  asrama: string;
  totalPossibleSlots: number;
  totalHadir: number;
  hadirRate: number; // 0 - 100 (%)
  rankInCampus: number;
  totalMusyrifInCampus: number;
  isBottom25Percent: boolean;
  isUnder75Percent: boolean;
  needsPembinaan: boolean; // isBottom25Percent && isUnder75Percent
}

export interface DynamicAnnouncement {
  id: string;
  title: string;
  content: string;
  category: "pembinaan" | "pengumuman" | "info" | "urgent";
  author: string;
  createdAt: string;
  targetCampus?: "all" | CampusType;
  active: boolean;
}

export const DYNAMIC_ANNOUNCEMENTS_STORAGE_KEY = "syamsa_dynamic_announcements_v1";

export function loadDynamicAnnouncements(): DynamicAnnouncement[] {
  try {
    const raw = localStorage.getItem(DYNAMIC_ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) {
      // Default announcements from Koordinator Musyrif
      const defaults: DynamicAnnouncement[] = [
        {
          id: "ann_default_1",
          title: "Himbauan Evaluasi Akhir Bulan",
          content: "Musyrif wajib kehadiran shalat minimal 75% agar tidak masuk pembinaan khusus.",
          category: "urgent",
          author: "Koordinator Musyrif",
          createdAt: new Date().toISOString(),
          targetCampus: "all",
          active: true,
        },
      ];
      localStorage.setItem(DYNAMIC_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load announcements:", err);
    return [];
  }
}

export function saveDynamicAnnouncements(announcements: DynamicAnnouncement[]) {
  try {
    localStorage.setItem(DYNAMIC_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(announcements));
  } catch (err) {
    console.error("Failed to save announcements:", err);
  }
}

/**
 * Menentukan kampus dari nama asrama musyrif
 */
export function getMusyrifCampus(asrama: string): CampusType {
  if (isKampusInduk(asrama)) return "kampus_induk";
  if (isSedayuAsrama(asrama)) return "kampus_terpadu";
  // Fallback heuristik
  const lower = (asrama || "").toLowerCase();
  if (lower.includes("sedayu")) return "kampus_terpadu";
  return "kampus_induk";
}

/**
 * Menghitung evaluasi kehadiran shalat bulanan tiap musyrif per kampus
 */
export function calculateMonthlyPembinaanStats(
  musyrifList: Array<{ id: string; name: string; asrama: string; role?: string }>,
  records: Array<{ musyrifId: string; date: string; subuh?: string; ashar?: string; maghrib?: string }>,
  currentDate: Date,
  getEffectiveAttendanceStatus: (record: any, slot: "subuh" | "ashar" | "maghrib", date: string, now: Date) => string | undefined
): {
  allStats: MusyrifAttendanceStats[];
  indukBottomMusyrif: MusyrifAttendanceStats[];
  sedayuBottomMusyrif: MusyrifAttendanceStats[];
  musyrifMap: Map<string, MusyrifAttendanceStats>;
} {
  const monthKey = format(currentDate, "yyyy-MM");
  const startD = startOfMonth(currentDate);
  const endD = isBefore(currentDate, endOfMonth(currentDate)) ? currentDate : endOfMonth(currentDate);
  const daysInInterval = eachDayOfInterval({ start: startD, end: endD });
  const totalDays = daysInInterval.length;
  const totalPossibleSlots = totalDays * 3; // Subuh, Ashar, Maghrib

  // Hanya hitung musyrif atau koordinator gedung lapangan
  const activeMusyrif = musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");

  // Kelompokkan per kampus
  const statsList: MusyrifAttendanceStats[] = activeMusyrif.map(m => {
    const campus = getMusyrifCampus(m.asrama);
    const musyrifRecs = records.filter(r => r.musyrifId === m.id && r.date.startsWith(monthKey));

    let hadirCount = 0;
    daysInInterval.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const rec = musyrifRecs.find(r => r.date === dateStr);
      if (getEffectiveAttendanceStatus(rec, "subuh", dateStr, currentDate) === "hadir") hadirCount++;
      if (getEffectiveAttendanceStatus(rec, "ashar", dateStr, currentDate) === "hadir") hadirCount++;
      if (getEffectiveAttendanceStatus(rec, "maghrib", dateStr, currentDate) === "hadir") hadirCount++;
    });

    const hadirRate = totalPossibleSlots > 0 ? Math.round((hadirCount / totalPossibleSlots) * 100) : 100;

    return {
      musyrifId: m.id,
      name: m.name,
      campus,
      asrama: m.asrama,
      totalPossibleSlots,
      totalHadir: hadirCount,
      hadirRate,
      rankInCampus: 0,
      totalMusyrifInCampus: 0,
      isBottom25Percent: false,
      isUnder75Percent: hadirRate < 75,
      needsPembinaan: false,
    };
  });

  // Proses per kampus: Induk & Sedayu
  const campuses: CampusType[] = ["kampus_induk", "kampus_terpadu"];
  const finalStats: MusyrifAttendanceStats[] = [];

  campuses.forEach(c => {
    const group = statsList.filter(s => s.campus === c);
    const count = group.length;
    if (count === 0) return;

    // Urutkan dari kehadiran terendah ke tertinggi (ascending)
    group.sort((a, b) => a.hadirRate - b.hadirRate);

    // Kuartil terbawah (25%)
    // Misalnya jika ada 20 musyrif, 25% = 5 orang terbawah (index 0 s.d 4)
    const bottomCutoff = Math.max(1, Math.ceil(count * 0.25));

    group.forEach((item, index) => {
      item.rankInCampus = index + 1; // 1 = terendah
      item.totalMusyrifInCampus = count;
      item.isBottom25Percent = index < bottomCutoff;
      item.needsPembinaan = item.isBottom25Percent && item.isUnder75Percent;
      finalStats.push(item);
    });
  });

  const musyrifMap = new Map<string, MusyrifAttendanceStats>();
  finalStats.forEach(s => musyrifMap.set(s.musyrifId, s));

  const indukBottom = finalStats.filter(s => s.campus === "kampus_induk" && s.needsPembinaan);
  const sedayuBottom = finalStats.filter(s => s.campus === "kampus_terpadu" && s.needsPembinaan);

  return {
    allStats: finalStats,
    indukBottomMusyrif: indukBottom,
    sedayuBottomMusyrif: sedayuBottom,
    musyrifMap,
  };
}
