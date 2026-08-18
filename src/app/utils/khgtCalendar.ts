/**
 * Kalender Hijriah Global Tunggal (KHGT) Majelis Tarjih & Tajdid Pimpinan Pusat Muhammadiyah
 * Berdasarkan Keputusan Munas Tarjih ke-32 di Pekalongan & Keputusan PP Muhammadiyah No. 120/KEP/I.0/B/2024
 * Diberlakukan resmi mulai 1 Muharram 1446 H (Ahad, 7 Juli 2024 M)
 * 
 * Prinsip: Satu hari satu tanggal di seluruh dunia (Universal Sighting / Kriteria Istanbul 2016)
 */

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameShort: string;
  dayName: string;
  pasaran: string;
  gregorianDate: Date;
  isToday: boolean;
  events: HijriEvent[];
  fastType?: FastInfo;
}

export interface HijriEvent {
  id: string;
  name: string;
  type: "wajib" | "sunnah" | "haram" | "peringatan" | "informasi";
  desc: string;
  dalil?: string;
}

export interface FastInfo {
  id: string;
  name: string;
  type: "wajib" | "sunnah" | "haram";
  desc: string;
  reward?: string;
  dalil?: string;
  icon: "sun" | "moon" | "star" | "sparkles" | "ban";
}

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

export const HIJRI_MONTHS_SHORT = [
  "Muh",
  "Saf",
  "Rab.I",
  "Rab.II",
  "Jum.I",
  "Jum.II",
  "Raj",
  "Sya",
  "Ram",
  "Syaw",
  "Dzul.Q",
  "Dzul.H",
];

export const PASARAN_JAWA = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];

/**
 * Data Resmi Awal Bulan Kalender Hijriah Global Tunggal (KHGT)
 * Ditetapkan oleh Majelis Tarjih dan Tajdid PP Muhammadiyah
 * Format key: `${year}-${month}` (misal: "1446-1" = 1 Muharram 1446)
 * Nilai: Tanggal Masehi (yyyy-mm-dd) untuk tanggal 1 bulan tersebut & jumlah hari dalam bulan tersebut (29/30).
 */
export interface KHGTMonthEntry {
  year: number;
  month: number;
  startDate: string; // YYYY-MM-DD
  daysCount: number; // 29 atau 30 hari
}

export const KHGT_OFFICIAL_TABLE: KHGTMonthEntry[] = [
  // ─── TAHUN 1446 H ───
  { year: 1446, month: 1,  startDate: "2024-07-07", daysCount: 30 }, // Muharram
  { year: 1446, month: 2,  startDate: "2024-08-06", daysCount: 29 }, // Safar
  { year: 1446, month: 3,  startDate: "2024-09-04", daysCount: 30 }, // Rabiul Awal
  { year: 1446, month: 4,  startDate: "2024-10-04", daysCount: 30 }, // Rabiul Akhir
  { year: 1446, month: 5,  startDate: "2024-11-03", daysCount: 30 }, // Jumadil Awal
  { year: 1446, month: 6,  startDate: "2024-12-03", daysCount: 29 }, // Jumadil Akhir
  { year: 1446, month: 7,  startDate: "2025-01-01", daysCount: 30 }, // Rajab
  { year: 1446, month: 8,  startDate: "2025-01-31", daysCount: 29 }, // Sya'ban
  { year: 1446, month: 9,  startDate: "2025-03-01", daysCount: 29 }, // Ramadan
  { year: 1446, month: 10, startDate: "2025-03-30", daysCount: 30 }, // Syawal (Idul Fitri 30 Mar)
  { year: 1446, month: 11, startDate: "2025-04-29", daysCount: 29 }, // Dzulqa'dah
  { year: 1446, month: 12, startDate: "2025-05-28", daysCount: 29 }, // Dzulhijjah (Arafah 5 Jun, Idul Adha 6 Jun)

  // ─── TAHUN 1447 H ───
  { year: 1447, month: 1,  startDate: "2025-06-26", daysCount: 30 }, // Muharram
  { year: 1447, month: 2,  startDate: "2025-07-26", daysCount: 29 }, // Safar
  { year: 1447, month: 3,  startDate: "2025-08-24", daysCount: 30 }, // Rabiul Awal
  { year: 1447, month: 4,  startDate: "2025-09-23", daysCount: 29 }, // Rabiul Akhir
  { year: 1447, month: 5,  startDate: "2025-10-22", daysCount: 30 }, // Jumadil Awal
  { year: 1447, month: 6,  startDate: "2025-11-21", daysCount: 29 }, // Jumadil Akhir
  { year: 1447, month: 7,  startDate: "2025-12-20", daysCount: 30 }, // Rajab
  { year: 1447, month: 8,  startDate: "2026-01-19", daysCount: 30 }, // Sya'ban
  { year: 1447, month: 9,  startDate: "2026-02-18", daysCount: 30 }, // Ramadan
  { year: 1447, month: 10, startDate: "2026-03-20", daysCount: 29 }, // Syawal (Idul Fitri 20 Mar)
  { year: 1447, month: 11, startDate: "2026-04-18", daysCount: 30 }, // Dzulqa'dah
  { year: 1447, month: 12, startDate: "2026-05-18", daysCount: 29 }, // Dzulhijjah (Arafah 26 Mei, Idul Adha 27 Mei)

  // ─── TAHUN 1448 H (Sumber Resmi: khgt.muhammadiyah.or.id) ───
  { year: 1448, month: 1,  startDate: "2026-06-16", daysCount: 29 }, // Muharram
  { year: 1448, month: 2,  startDate: "2026-07-15", daysCount: 30 }, // Safar (15 Jul - 13 Agt)
  { year: 1448, month: 3,  startDate: "2026-08-14", daysCount: 29 }, // Rabiul Awal (18 Agt 2026 = 5 Rabiulawal, 25 Agt = 12 Rabiulawal Maulid Nabi)
  { year: 1448, month: 4,  startDate: "2026-09-12", daysCount: 30 }, // Rabiul Akhir
  { year: 1448, month: 5,  startDate: "2026-10-12", daysCount: 29 }, // Jumadil Awal
  { year: 1448, month: 6,  startDate: "2026-11-10", daysCount: 30 }, // Jumadil Akhir
  { year: 1448, month: 7,  startDate: "2026-12-10", daysCount: 30 }, // Rajab (27 Rajab = 5 Jan 2027 Isra Mi'raj)
  { year: 1448, month: 8,  startDate: "2027-01-09", daysCount: 30 }, // Sya'ban
  { year: 1448, month: 9,  startDate: "2027-02-08", daysCount: 29 }, // Ramadan (Awal Ramadan 8 Feb 2027)
  { year: 1448, month: 10, startDate: "2027-03-09", daysCount: 30 }, // Syawal (Idul Fitri 9 Mar 2027)
  { year: 1448, month: 11, startDate: "2027-04-08", daysCount: 29 }, // Dzulqa'dah
  { year: 1448, month: 12, startDate: "2027-05-07", daysCount: 29 }, // Dzulhijjah (Arafah 15 Mei, Idul Adha 16 Mei 2027)

  // ─── TAHUN 1449 H ───
  { year: 1449, month: 1,  startDate: "2027-06-06", daysCount: 30 },
  { year: 1449, month: 2,  startDate: "2027-07-06", daysCount: 29 },
  { year: 1449, month: 3,  startDate: "2027-08-04", daysCount: 30 },
  { year: 1449, month: 4,  startDate: "2027-09-03", daysCount: 29 },
  { year: 1449, month: 5,  startDate: "2027-10-02", daysCount: 30 },
  { year: 1449, month: 6,  startDate: "2027-11-01", daysCount: 29 },
  { year: 1449, month: 7,  startDate: "2027-11-30", daysCount: 30 },
  { year: 1449, month: 8,  startDate: "2027-12-30", daysCount: 29 },
  { year: 1449, month: 9,  startDate: "2028-01-28", daysCount: 30 },
  { year: 1449, month: 10, startDate: "2028-02-27", daysCount: 29 },
  { year: 1449, month: 11, startDate: "2028-03-27", daysCount: 30 },
  { year: 1449, month: 12, startDate: "2028-04-26", daysCount: 29 },
];

/**
 * Menghitung Pasaran Jawa (Legi, Pahing, Pon, Wage, Kliwon)
 * Patokan: 1 Januari 1970 M = Kamis Wage (indeks 3 di siklus [Legi(0), Pahing(1), Pon(2), Wage(3), Kliwon(4)])
 */
export function getPasaranJawa(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const utc1 = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const utc0 = Date.UTC(1970, 0, 1);
  const diffDays = Math.floor((utc1 - utc0) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 5) + 5 + 3) % 5;
  return PASARAN_JAWA[idx];
}

/**
 * Fallback konversi menggunakan Intl.DateTimeFormat 'islamic-umalqura'
 * Digunakan jika tanggal berada di luar jangkauan tabel KHGT official.
 */
function convertViaIntl(date: Date): { day: number; month: number; year: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10);
    const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10);
    const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "1446", 10);
    return { day, month, year };
  } catch {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d - 1524.5;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hm = Math.floor((24 * l3) / 709);
    const hd = Math.floor(l3 - Math.floor((709 * hm) / 24));
    const hy = 30 * n + j - 30;
    return { day: Math.max(1, hd), month: Math.max(1, Math.min(12, hm)), year: hy };
  }
}

/**
 * Konversi tanggal Masehi ke Kalender Hijriah Global Tunggal (KHGT) Muhammadiyah
 */
export function toHijri(date: Date): { day: number; month: number; year: number; monthName: string; monthNameShort: string } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Cari di tabel KHGT
  for (let i = 0; i < KHGT_OFFICIAL_TABLE.length; i++) {
    const entry = KHGT_OFFICIAL_TABLE[i];
    const start = new Date(entry.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + entry.daysCount - 1);

    const startStr = entry.startDate;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    if (dateStr >= startStr && dateStr <= endStr) {
      const utc1 = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      const utc0 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
      const diffDays = Math.floor((utc1 - utc0) / (1000 * 60 * 60 * 24));
      const day = diffDays + 1;
      const month = entry.month;
      const year = entry.year;

      return {
        day,
        month,
        year,
        monthName: HIJRI_MONTHS[month - 1] ?? "",
        monthNameShort: HIJRI_MONTHS_SHORT[month - 1] ?? "",
      };
    }
  }

  // Jika di luar rentang tabel resmi, gunakan fallback
  const fb = convertViaIntl(date);
  return {
    day: fb.day,
    month: fb.month,
    year: fb.year,
    monthName: HIJRI_MONTHS[fb.month - 1] ?? "",
    monthNameShort: HIJRI_MONTHS_SHORT[fb.month - 1] ?? "",
  };
}

/**
 * Konversi tanggal Hijriah (Tahun, Bulan, Hari) ke Tanggal Masehi
 */
export function fromHijriToGregorian(year: number, month: number, day: number): Date {
  const entry = KHGT_OFFICIAL_TABLE.find((e) => e.year === year && e.month === month);
  if (entry) {
    const [y, m, d] = entry.startDate.split("-").map(Number);
    const res = new Date(y, m - 1, d);
    res.setDate(res.getDate() + (day - 1));
    return res;
  }

  // Fallback aproksimasi
  const refYear = 1446;
  const refMonth = 1;
  const refDate = new Date(2024, 6, 7); // 7 Juli 2024 = 1 Muharram 1446
  const totalMonths = (year - refYear) * 12 + (month - refMonth);
  const estDays = Math.round(totalMonths * 29.530588) + (day - 1);
  const result = new Date(refDate);
  result.setDate(result.getDate() + estDays);
  return result;
}

/**
 * Mendapatkan jumlah hari dalam satu bulan Hijriyah (29 atau 30 hari)
 */
export function getHijriMonthDaysCount(year: number, month: number): number {
  const entry = KHGT_OFFICIAL_TABLE.find((e) => e.year === year && e.month === month);
  if (entry) return entry.daysCount;
  return month % 2 === 1 ? 30 : 29;
}

/**
 * Mendapatkan daftar Hari Besar Islam & Peristiwa Penting pada tanggal Hijriah
 */
export function getHijriEvents(day: number, month: number, year: number): HijriEvent[] {
  const events: HijriEvent[] = [];

  // Muharram (1)
  if (month === 1 && day === 1) {
    events.push({
      id: "tahun-baru-islam",
      name: "Tahun Baru Islam",
      type: "peringatan",
      desc: `1 Muharram ${year} H — Awal Tahun Kalender Hijriah Global Tunggal (KHGT)`,
    });
  }
  if (month === 1 && day === 9) {
    events.push({
      id: "tasua",
      name: "Hari Tasu'a",
      type: "sunnah",
      desc: "Hari ke-9 Muharram — Puasa Sunnah Tasu'a mendampingi Asyura.",
      dalil: "HR. Muslim no. 1134",
    });
  }
  if (month === 1 && day === 10) {
    events.push({
      id: "asyura",
      name: "Hari Asyura",
      type: "sunnah",
      desc: "Hari ke-10 Muharram — Puasa Sunnah Asyura yang menghapus dosa setahun lalu.",
      dalil: "HR. Muslim no. 1162",
    });
  }

  // Rabiul Awal (3)
  if (month === 3 && day === 12) {
    events.push({
      id: "maulid-nabi",
      name: "Maulid Nabi Muhammad ﷺ",
      type: "peringatan",
      desc: "12 Rabiul Awal — Peringatan hari kelahiran Rasulullah Muhammad ﷺ.",
    });
  }

  // Rajab (7)
  if (month === 7 && day === 27) {
    events.push({
      id: "isra-miraj",
      name: "Isra Mi'raj Nabi Muhammad ﷺ",
      type: "peringatan",
      desc: "27 Rajab — Perjalanan agung Rasulullah ﷺ & pensyariatan shalat 5 waktu.",
    });
  }

  // Sya'ban (8)
  if (month === 8 && day === 15) {
    events.push({
      id: "nisfu-syaban",
      name: "Malam Nisfu Sya'ban",
      type: "informasi",
      desc: "15 Sya'ban — Pertengahan bulan Sya'ban & persiapan menyambut Ramadan.",
    });
  }

  // Ramadan (9)
  if (month === 9) {
    if (day === 1) {
      events.push({
        id: "awal-ramadan",
        name: "1 Ramadan — Awal Puasa",
        type: "wajib",
        desc: "Hari pertama ibadah puasa wajib Ramadan.",
        dalil: "QS. Al-Baqarah: 183-185",
      });
    }
    if (day === 17) {
      events.push({
        id: "nuzulul-quran",
        name: "Nuzulul Qur'an",
        type: "peringatan",
        desc: "17 Ramadan — Peringatan diturunkannya permulaan Al-Qur'an.",
        dalil: "QS. Al-Baqarah: 185",
      });
    }
    if (day >= 21 && day % 2 === 1) {
      events.push({
        id: `lailatul-qadar-${day}`,
        name: `Malam ${day} Ramadan`,
        type: "sunnah",
        desc: `Malam ganjil 10 hari terakhir Ramadan — Memburu keutamaan Lailatul Qadar.`,
        dalil: "HR. Bukhari no. 2017",
      });
    }
  }

  // Syawal (10)
  if (month === 10 && day === 1) {
    events.push({
      id: "idul-fitri",
      name: "Hari Raya Idul Fitri",
      type: "haram",
      desc: "1 Syawal — Hari Raya Idul Fitri (Diharamkan berpuasa).",
      dalil: "HR. Bukhari no. 1991",
    });
  }

  // Dzulhijjah (12)
  if (month === 12 && day === 8) {
    events.push({
      id: "tarwiyah",
      name: "Hari Tarwiyah",
      type: "sunnah",
      desc: "8 Dzulhijjah — Hari Tarwiyah bagi jamaah haji dan sunnah berpuasa.",
    });
  }
  if (month === 12 && day === 9) {
    events.push({
      id: "arafah",
      name: "Hari Arafah",
      type: "sunnah",
      desc: "9 Dzulhijjah — Puasa Sunnah Arafah menghapuskan dosa 2 tahun.",
      dalil: "HR. Muslim no. 1162",
    });
  }
  if (month === 12 && day === 10) {
    events.push({
      id: "idul-adha",
      name: "Hari Raya Idul Adha",
      type: "haram",
      desc: "10 Dzulhijjah — Hari Raya Kurban (Diharamkan berpuasa).",
      dalil: "HR. Bukhari no. 1990",
    });
  }
  if (month === 12 && (day === 11 || day === 12 || day === 13)) {
    events.push({
      id: `tasyrik-${day}`,
      name: `Hari Tasyrik (${day} Dzulhijjah)`,
      type: "haram",
      desc: "Hari Tasyrik — Hari makan & minum serta dzikir kepada Allah (Diharamkan berpuasa).",
      dalil: "HR. Muslim no. 1141",
    });
  }

  return events;
}

/**
 * Mengecek apakah tanggal tertentu memiliki puasa (Wajib, Sunnah, atau Diharamkan)
 */
export function getFastInfo(date: Date): FastInfo | null {
  const h = toHijri(date);
  const dow = date.getDay(); // 0 = Ahad, 1 = Senin, ..., 4 = Kamis, ..., 6 = Sabtu

  // 1. HARI DIHARAMKAN PUASA
  if (h.month === 10 && h.day === 1) {
    return {
      id: "haram-idul-fitri",
      name: "Haram Puasa (Idul Fitri)",
      type: "haram",
      desc: "Diharamkan berpuasa pada Hari Raya Idul Fitri (1 Syawal).",
      dalil: "HR. Bukhari no. 1991",
      icon: "ban",
    };
  }
  if (h.month === 12 && h.day === 10) {
    return {
      id: "haram-idul-adha",
      name: "Haram Puasa (Idul Adha)",
      type: "haram",
      desc: "Diharamkan berpuasa pada Hari Raya Idul Adha (10 Dzulhijjah).",
      dalil: "HR. Bukhari no. 1990",
      icon: "ban",
    };
  }
  if (h.month === 12 && (h.day === 11 || h.day === 12 || h.day === 13)) {
    return {
      id: "haram-tasyrik",
      name: `Haram Puasa (Hari Tasyrik ${h.day} Dzulhijjah)`,
      type: "haram",
      desc: "Hari Tasyrik adalah hari makan, minum, dan mengingat Allah.",
      dalil: "HR. Muslim no. 1141",
      icon: "ban",
    };
  }

  // 2. PUASA WAJIB RAMADAN
  if (h.month === 9) {
    return {
      id: "wajib-ramadan",
      name: `Puasa Ramadan (Hari ke-${h.day})`,
      type: "wajib",
      desc: "Kewajiban puasa sebulan penuh bagi kaum beriman.",
      reward: "Diampuni dosa-dosa yang telah lalu",
      dalil: "QS. Al-Baqarah: 183 & HR. Bukhari no. 38",
      icon: "moon",
    };
  }

  // 3. PUASA SUNNAH TAHUNAN KHUSUS
  if (h.month === 1 && h.day === 9) {
    return {
      id: "tasua",
      name: "Puasa Tasu'a",
      type: "sunnah",
      desc: "Puasa sunnah 9 Muharram yang dianjurkan untuk menyelisihi kaum Yahudi.",
      reward: "Melengkapi keutamaan Asyura",
      dalil: "HR. Muslim no. 1134",
      icon: "moon",
    };
  }
  if (h.month === 1 && h.day === 10) {
    return {
      id: "asyura",
      name: "Puasa Asyura",
      type: "sunnah",
      desc: "Puasa sunnah 10 Muharram untuk mensyukuri diselamatkannya Nabi Musa AS.",
      reward: "Menghapus dosa setahun yang lalu",
      dalil: "HR. Muslim no. 1162",
      icon: "star",
    };
  }
  if (h.month === 12 && h.day === 8) {
    return {
      id: "tarwiyah",
      name: "Puasa Tarwiyah",
      type: "sunnah",
      desc: "Puasa sunnah hari ke-8 bulan Dzulhijjah.",
      reward: "Keutamaan 10 hari pertama Dzulhijjah",
      dalil: "HR. Bukhari no. 969",
      icon: "sparkles",
    };
  }
  if (h.month === 12 && h.day === 9) {
    return {
      id: "arafah",
      name: "Puasa Arafah",
      type: "sunnah",
      desc: "Puasa sunnah bagi yang tidak wukuf di Arafah (9 Dzulhijjah).",
      reward: "Menghapus dosa 2 tahun (setahun lalu & setahun mendatang)",
      dalil: "HR. Muslim no. 1162",
      icon: "star",
    };
  }
  if (h.month === 10 && h.day >= 2 && h.day <= 7) {
    return {
      id: "syawal",
      name: "Puasa 6 Hari Syawal",
      type: "sunnah",
      desc: `Puasa sunnah di bulan Syawal (Hari ke-${h.day} Syawal).`,
      reward: "Pahalanya seperti berpuasa sepanjang tahun",
      dalil: "HR. Muslim no. 1164",
      icon: "sparkles",
    };
  }

  // 4. PUASA SUNNAH BULANAN (AYYAMUL BIDH: 13, 14, 15)
  if ([13, 14, 15].includes(h.day)) {
    return {
      id: "ayyamul",
      name: `Puasa Ayyamul Bidh (${h.day} ${h.monthName})`,
      type: "sunnah",
      desc: "Puasa tiga hari di pertengahan bulan Hijriyah saat bulan purnama sempurna.",
      reward: "Setara dengan puasa sepanjang masa",
      dalil: "HR. Bukhari no. 1981 & Tirmidzi no. 761",
      icon: "moon",
    };
  }

  // 5. PUASA SUNNAH MINGGUAN (SENIN & KAMIS)
  if (dow === 1) {
    return {
      id: "senin",
      name: "Puasa Sunnah Senin",
      type: "sunnah",
      desc: "Hari dibukanya pintu surga, amalan dihadapkan, & hari kelahiran Rasulullah ﷺ.",
      reward: "Amalan dicatat dalam keadaan berpuasa",
      dalil: "HR. Muslim no. 1162",
      icon: "sun",
    };
  }
  if (dow === 4) {
    return {
      id: "kamis",
      name: "Puasa Sunnah Kamis",
      type: "sunnah",
      desc: "Hari amalan-amalan hamba diangkat kepada Allah Ta'ala.",
      reward: "Rasulullah ﷺ menyukai berpuasa saat amal diangkat",
      dalil: "HR. Tirmidzi no. 747",
      icon: "sparkles",
    };
  }

  return null;
}

/**
 * Mendapatkan daftar lengkap informasi hari untuk satu bulan Hijriah penuh (1 s/d 29/30)
 */
export function getHijriMonthDetails(year: number, month: number): HijriDate[] {
  const daysCount = getHijriMonthDaysCount(year, month);
  const list: HijriDate[] = [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let day = 1; day <= daysCount; day++) {
    const gDate = fromHijriToGregorian(year, month, day);
    const gDateStr = `${gDate.getFullYear()}-${String(gDate.getMonth() + 1).padStart(2, "0")}-${String(gDate.getDate()).padStart(2, "0")}`;
    const isToday = gDateStr === todayStr;

    const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(gDate);
    const pasaran = getPasaranJawa(gDate);
    const events = getHijriEvents(day, month, year);
    const fastType = getFastInfo(gDate) || undefined;

    list.push({
      day,
      month,
      year,
      monthName: HIJRI_MONTHS[month - 1] ?? "",
      monthNameShort: HIJRI_MONTHS_SHORT[month - 1] ?? "",
      dayName,
      pasaran,
      gregorianDate: gDate,
      isToday,
      events,
      fastType,
    });
  }

  return list;
}

/**
 * Mendapatkan daftar puasa sunnah mendatang (dalam N hari ke depan)
 */
export function getUpcomingFasts(daysAhead = 30): { date: Date; hijri: ReturnType<typeof toHijri>; fast: FastInfo }[] {
  const list: { date: Date; hijri: ReturnType<typeof toHijri>; fast: FastInfo }[] = [];
  const base = new Date();

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const fast = getFastInfo(d);
    if (fast && fast.type !== "haram") {
      const hijri = toHijri(d);
      list.push({ date: d, hijri, fast });
    }
  }

  return list;
}
