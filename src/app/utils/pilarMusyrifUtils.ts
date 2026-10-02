import { LogbookStorage, isLogbookTaskCompleted } from "../components/JurnalLogbookModal";
import { KegiatanRecord } from "../components/KegiatanAsramaModal";
import { MutabaahStorage } from "../components/MutabaahYaumiyahModal";
import { PengasuhanKhususRecord } from "../types/pengasuhanKhusus";
import { AgendaRapatRecord } from "../types/agendaRapat";

export interface MusyrifBasic {
  id: string;
  name: string;
  kelas?: string;
  tingkat?: string;
  asrama?: string;
  kamar?: string;
  role?: string;
  photo?: string;
  [key: string]: any;
}

export interface AttendanceRecordBasic {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  ashar?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
  [key: string]: any;
}

export interface PilarScores {
  // 1. Kepengasuhan: Cek Sakit, Cek Tidur, Rujukan RS, Bimbingan Santri
  kepengasuhanScore: number;
  pengasuhanCount: number;
  pengasuhanPoints: number;

  // 2. Al-Qur'an: Halaqah Tahfizh, Tahsin Ba'da Maghrib, Al-Kahfi, Tilawah Mutaba'ah
  quranScore: number;
  quranDone: number;

  // 3. Ibadah: Shalat Fardhu Berjamaah (Subuh, Ashar, Maghrib), Shalat Jumat, Amalan Sunnah Mutaba'ah
  ibadahScore: number;
  hadirCount: number;
  subuhCount: number;
  asharCount: number;
  maghribCount: number;
  alfaCount: number;
  sunnahPoints: number;

  // 4. Bahasa: Pembelajaran Bahasa (Senin-Selasa), Muhadatsah Pagi (Ahad)
  bahasaScore: number;
  bahasaDone: number;

  // 5. Kebersihan: Piket Asrama, Kerja Bakti Ahad, Oprak Mandi Sore
  kebersihanScore: number;
  kebersihanDone: number;

  // 6. Kedisiplinan: Bangun Pagi, Berangkat Sekolah, Jaga Gerbang, Oprak Ashar, Sisir Maghrib, Belajar Malam, Agenda Rapat/Kegiatan
  kedisiplinanScore: number;
  kedisiplinanDone: number;
  kegiatanDone: number;

  // Total Keseluruhan 6 Pilar
  totalScore: number;
  totalLogbookDone: number;
}

export interface MusyrifWith6Pilar extends MusyrifBasic, PilarScores {
  score: number; // alias untuk totalScore (kompatibilitas)
}

function isTruthyFlag(val: any): boolean {
  if (val === true || val === 1) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "ya" || s === "hadir";
  }
  return false;
}

/**
 * Menghitung rincian 6 Pilar Musyrif secara akurat dan dinamis:
 * (1) Kepengasuhan
 * (2) Al-Qur'an
 * (3) Ibadah
 * (4) Bahasa
 * (5) Kebersihan
 * (6) Kedisiplinan
 */
export function calculate6PilarScores(
  musyrif: MusyrifBasic,
  records: Record<string, AttendanceRecordBasic>,
  logbookData: LogbookStorage = {},
  kegiatanRecords: KegiatanRecord[] = [],
  mutabaahData: MutabaahStorage = {},
  pengasuhanList: PengasuhanKhususRecord[] = [],
  agendaList: AgendaRapatRecord[] = [],
  selectedMonth: string = "all"
): PilarScores {
  // ── 1. Presensi Shalat Fardhu ──
  let hadirCount = 0;
  let subuhCount = 0;
  let asharCount = 0;
  let maghribCount = 0;
  let alfaCount = 0;

  Object.entries(records).forEach(([_, rec]) => {
    if (!rec || rec.musyrifId !== musyrif.id) return;
    const rDate = rec.date || "";
    if (selectedMonth !== "all" && !rDate.startsWith(selectedMonth)) return;

    if (rDate >= "2026-08-18") {
      const subSt = rec.subuh;
      const ashSt = (rec as any).ashar;
      const magSt = rec.maghrib;

      if (subSt === "hadir") { hadirCount++; subuhCount++; }
      else if (subSt === "alfa") alfaCount++;

      if (ashSt === "hadir") { hadirCount++; asharCount++; }
      else if (ashSt === "alfa") alfaCount++;

      if (magSt === "hadir") { hadirCount++; maghribCount++; }
      else if (magSt === "alfa") alfaCount++;
    }
  });

  const sholatScore = Math.max(0, hadirCount * 10 - alfaCount * 15);

  // ── 2. Logbook Tasks Categorization (6 Pilar) ──
  let kepengasuhanLogbookDone = 0;
  let quranLogbookDone = 0;
  let ibadahLogbookDone = 0;
  let bahasaLogbookDone = 0;
  let kebersihanLogbookDone = 0;
  let kedisiplinanLogbookDone = 0;
  let totalLogbookDone = 0;

  const musyrifLogbooks = logbookData[musyrif.id] || {};
  Object.entries(musyrifLogbooks).forEach(([dt, dayEntry]) => {
    if (selectedMonth !== "all" && !dt.startsWith(selectedMonth)) return;
    if (dt >= "2026-08-18" && dayEntry && typeof dayEntry === "object") {
      const dObj = new Date(dt + "T12:00:00");
      const dayOfWeek = dObj.getDay(); // 0: Ahad, 1: Senin, ..., 4: Kamis, 5: Jumat, 6: Sabtu

      Object.entries(dayEntry).forEach(([taskKey, taskVal]) => {
        if (taskKey === "generalNotes" || taskKey.startsWith("agenda_")) return;
        if (!isLogbookTaskCompleted(taskVal)) return;

        totalLogbookDone++;

        switch (taskKey) {
          case "cekSakit":
          case "cekTidur":
            kepengasuhanLogbookDone++;
            break;

          case "bakdaSubuh":
            if (dayOfWeek === 0) {
              // Ahad: Muhadatsah Bahasa
              bahasaLogbookDone++;
            } else {
              // Cek apakah memilih piket asrama atau halaqah tahfizh
              const isPiket = (taskVal as any)?.subChoice === "piket";
              if (isPiket) {
                kebersihanLogbookDone++;
              } else {
                quranLogbookDone++;
              }
            }
            break;

          case "bakdaMaghrib":
            if (dayOfWeek === 1 || dayOfWeek === 2) {
              // Senin & Selasa: Pembelajaran Bahasa
              bahasaLogbookDone++;
            } else if (dayOfWeek === 3) {
              // Rabu: Pengecekan Catatan Santri (Kedisiplinan)
              kedisiplinanLogbookDone++;
            } else {
              // Kamis, Jumat, Sabtu, Ahad: Tahsin / Tilawah Al-Qur'an
              quranLogbookDone++;
            }
            break;

          case "belajarMalam":
            if (dayOfWeek === 4) {
              // Kamis malam: Al-Kahfi
              quranLogbookDone++;
            } else {
              // Belajar Mandiri: Kedisiplinan
              kedisiplinanLogbookDone++;
            }
            break;

          case "oprakJumat":
            // Ibadah shalat Jum'at
            ibadahLogbookDone++;
            break;

          case "kerjaBakti":
          case "oprakMandi":
            kebersihanLogbookDone++;
            break;

          case "bangunPagi":
          case "sisirSekolah":
          case "jagaGerbang":
          case "oprakAshar":
          case "sisirMaghrib":
          default:
            kedisiplinanLogbookDone++;
            break;
        }
      });
    }
  });

  // ── 3. Pengasuhan Khusus (Pilar 1: Kepengasuhan) ──
  let pengasuhanPoints = 0;
  let pengasuhanCount = 0;
  pengasuhanList.forEach(p => {
    if (p.musyrifId === musyrif.id) {
      if (selectedMonth !== "all" && !p.date.startsWith(selectedMonth)) return;
      if (p.date >= "2026-08-18") {
        pengasuhanCount++;
        pengasuhanPoints += (Number(p.poin) || (p.kategori === "antar_pku_rs" ? 10 : 5));
      }
    }
  });

  // ── 4. Agenda Rapat & Kegiatan Asrama (Pilar 6: Kedisiplinan) ──
  let kegiatanDone = 0;
  const seenKegiatanKeys = new Set<string>();

  kegiatanRecords.forEach(keg => {
    if (selectedMonth !== "all" && !keg.date?.startsWith(selectedMonth)) return;
    const kegId = keg.id || `${keg.date}_${keg.title || keg.namaKegiatan}`;
    const attVal = keg.attendees?.[musyrif.id];
    if (attVal === "hadir" || attVal === true || String(attVal).toLowerCase() === "hadir") {
      seenKegiatanKeys.add(kegId);
      kegiatanDone++;
    }
  });

  // Dynamic agenda meeting tasks from logbook
  Object.entries(musyrifLogbooks).forEach(([dt, dayEntry]) => {
    if (selectedMonth !== "all" && !dt.startsWith(selectedMonth)) return;
    if (dt >= "2026-08-18" && dayEntry && typeof dayEntry === "object") {
      Object.entries(dayEntry).forEach(([key, task]) => {
        if (key.startsWith("agenda_") && isLogbookTaskCompleted(task)) {
          const agendaUniqueKey = `${dt}_${key}`;
          if (!seenKegiatanKeys.has(agendaUniqueKey)) {
            seenKegiatanKeys.add(agendaUniqueKey);
            kegiatanDone++;
          }
        }
      });
    }
  });

  // Agenda Rapat from agendaList
  (agendaList || []).forEach(ag => {
    if (selectedMonth !== "all" && !ag.date?.startsWith(selectedMonth)) return;
    if (Array.isArray(ag.invitedMusyrifIds) && ag.invitedMusyrifIds.includes(musyrif.id)) {
      const agendaUniqueKey = `${ag.date}_agenda_${ag.id.replace(/^agenda_/, "")}`;
      if (!seenKegiatanKeys.has(agendaUniqueKey)) {
        const dayEntry = musyrifLogbooks[ag.date];
        const cleanId = ag.id.replace(/^agenda_/, "");
        const task = dayEntry?.[`agenda_${ag.id}`] || dayEntry?.[ag.id] || dayEntry?.[`agenda_${cleanId}`] || dayEntry?.[cleanId];
        if (isLogbookTaskCompleted(task)) {
          seenKegiatanKeys.add(agendaUniqueKey);
          kegiatanDone++;
        }
      }
    }
  });

  // ── 5. Mutaba'ah Yaumiyah (Pilar 2: Al-Qur'an & Pilar 3: Ibadah) ──
  let sunnahPoints = 0;
  let quranMutabaahPages = 0;
  const musyrifMutabaah = mutabaahData[musyrif.id] || {};

  Object.entries(musyrifMutabaah).forEach(([dt, dayEntry]) => {
    if (selectedMonth !== "all" && !dt.startsWith(selectedMonth)) return;
    if (dt >= "2026-08-18" && dayEntry && typeof dayEntry === "object") {
      // Ibadah Sunnah
      if (isTruthyFlag(dayEntry.tahajjud)) sunnahPoints += 3;
      if (isTruthyFlag(dayEntry.witir || dayEntry.rawatib)) sunnahPoints += 2;
      if (isTruthyFlag(dayEntry.dhuha)) sunnahPoints += 2;
      if (isTruthyFlag(dayEntry.infaq)) sunnahPoints += 1;
      if (isTruthyFlag(dayEntry.dzikirPagi)) sunnahPoints += 1;
      if (isTruthyFlag(dayEntry.dzikirPetang)) sunnahPoints += 1;
      if (isTruthyFlag(dayEntry.puasaSunnah)) sunnahPoints += 5;
      if (isTruthyFlag(dayEntry.muthalaah)) sunnahPoints += 2;

      // Tilawah Al-Qur'an Mandiri
      const tilawah = Number(dayEntry.tilawahPages || 0);
      if (tilawah > 0) {
        quranMutabaahPages += tilawah;
      }
    }
  });

  // ── 6. Kompilasi Skor 6 Pilar ──
  // Pilar 1: Kepengasuhan (Logbook cek sakit/tidur: 5 pts + Poin Pengasuhan Khusus)
  const kepengasuhanScore = (kepengasuhanLogbookDone * 5) + pengasuhanPoints;

  // Pilar 2: Al-Qur'an (Tahfizh/Tahsin/Al-Kahfi: 5 pts + Tilawah Mandiri max 3 pts/hari)
  const quranScore = (quranLogbookDone * 5) + Math.min(quranMutabaahPages * 2, 60);

  // Pilar 3: Ibadah (Shalat Fardhu Berjamaah + Shalat Jumat Logbook: 5 pts + Amalan Sunnah)
  const ibadahScore = sholatScore + (ibadahLogbookDone * 5) + sunnahPoints;

  // Pilar 4: Bahasa (Pendampingan Bahasa & Muhadatsah: 5 pts)
  const bahasaScore = bahasaLogbookDone * 5;

  // Pilar 5: Kebersihan (Piket Asrama, Kerja Bakti, Oprak Mandi: 5 pts)
  const kebersihanScore = kebersihanLogbookDone * 5;

  // Pilar 6: Kedisiplinan (Patroli Logbook: 5 pts + Agenda Rapat & Asrama: 15 pts)
  const kedisiplinanScore = (kedisiplinanLogbookDone * 5) + (kegiatanDone * 15);

  const totalScore = kepengasuhanScore + quranScore + ibadahScore + bahasaScore + kebersihanScore + kedisiplinanScore;

  return {
    kepengasuhanScore,
    pengasuhanCount,
    pengasuhanPoints,

    quranScore,
    quranDone: quranLogbookDone,

    ibadahScore,
    hadirCount,
    subuhCount,
    asharCount,
    maghribCount,
    alfaCount,
    sunnahPoints,

    bahasaScore,
    bahasaDone: bahasaLogbookDone,

    kebersihanScore,
    kebersihanDone: kebersihanLogbookDone,

    kedisiplinanScore,
    kedisiplinanDone: kedisiplinanLogbookDone,
    kegiatanDone,

    totalScore,
    totalLogbookDone
  };
}

export const PILAR_METADATA = [
  { id: "all", label: "Total 6 Pilar", name: "Semua Pilar", color: "emerald" },
  { id: "kepengasuhan", label: "1. Kepengasuhan", name: "Kepengasuhan & Pembinaan", color: "rose" },
  { id: "quran", label: "2. Al-Qur'an", name: "Al-Qur'an & Halaqah", color: "sky" },
  { id: "ibadah", label: "3. Ibadah", name: "Ibadah & Ruhiyah", color: "amber" },
  { id: "bahasa", label: "4. Bahasa", name: "Bahasa & Komunikasi", color: "teal" },
  { id: "kebersihan", label: "5. Kebersihan", name: "Kebersihan & Kerapian", color: "emerald" },
  { id: "kedisiplinan", label: "6. Kedisiplinan", name: "Kedisiplinan & Tata Tertib", color: "indigo" },
] as const;

export type PilarId = typeof PILAR_METADATA[number]["id"];
