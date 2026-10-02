import { LogbookStorage, isLogbookTaskCompleted } from "../components/JurnalLogbookModal";
import { KegiatanRecord } from "../components/KegiatanAsramaModal";
import { MutabaahStorage } from "../components/MutabaahYaumiyahModal";
import { calculate6PilarScores } from "./pilarMusyrifUtils";

function isTruthyFlag(val: any): boolean {
  if (val === true || val === 1) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "ya" || s === "hadir";
  }
  return false;
}

interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  pamong: string;
  email?: string;
  phone?: string;
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
}

export function exportComprehensiveReportCSV({
  musyrifList,
  records,
  logbookData = {},
  kegiatanRecords = [],
  mutabaahData = {},
  asramaFilter = "all",
  startDate,
  endDate,
}: {
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
  logbookData?: LogbookStorage;
  kegiatanRecords?: KegiatanRecord[];
  mutabaahData?: MutabaahStorage;
  asramaFilter?: string;
  startDate?: string;
  endDate?: string;
}) {
  const filteredMusyrifs = musyrifList.filter(
    m => asramaFilter === "all" || m.asrama === asramaFilter
  );

  // CSV Headers
  const headers = [
    "No",
    "Nama Musyrif",
    "Asrama",
    "Kamar",
    "Kelas Binaan",
    "Pamong Asrama",
    "Subuh Hadir",
    "Subuh Izin",
    "Subuh Sakit",
    "Subuh Alfa",
    "Ashar Hadir",
    "Ashar Izin",
    "Ashar Sakit",
    "Ashar Alfa",
    "Maghrib Hadir",
    "Maghrib Izin",
    "Maghrib Sakit",
    "Maghrib Alfa",
    "Total Shalat Hadir",
    "Persentase Shalat (%)",
    "Skor 1. Kepengasuhan",
    "Skor 2. Al-Qur'an",
    "Skor 3. Ibadah",
    "Skor 4. Bahasa",
    "Skor 5. Kebersihan",
    "Skor 6. Kedisiplinan",
    "Total Skor 6 Pilar",
    "Predikat Musyrif",
  ];

  const rows = filteredMusyrifs.map((m, idx) => {
    let subuhHadir = 0;
    let subuhIzin = 0;
    let subuhSakit = 0;
    let subuhAlfa = 0;

    let asharHadir = 0;
    let asharIzin = 0;
    let asharSakit = 0;
    let asharAlfa = 0;

    let maghribHadir = 0;
    let maghribIzin = 0;
    let maghribSakit = 0;
    let maghribAlfa = 0;

    Object.entries(records).forEach(([_, rec]) => {
      if (rec.musyrifId === m.id) {
        if (startDate && rec.date < startDate) return;
        if (endDate && rec.date > endDate) return;

        if (rec.subuh === "hadir") subuhHadir++;
        else if (rec.subuh === "izin") subuhIzin++;
        else if (rec.subuh === "sakit") subuhSakit++;
        else if (rec.subuh === "alfa") subuhAlfa++;

        if (rec.ashar === "hadir") asharHadir++;
        else if (rec.ashar === "izin") asharIzin++;
        else if (rec.ashar === "sakit") asharSakit++;
        else if (rec.ashar === "alfa") asharAlfa++;

        if (rec.maghrib === "hadir") maghribHadir++;
        else if (rec.maghrib === "izin") maghribIzin++;
        else if (rec.maghrib === "sakit") maghribSakit++;
        else if (rec.maghrib === "alfa") maghribAlfa++;
      }
    });

    const totalSlotShalat = (subuhHadir + subuhIzin + subuhSakit + subuhAlfa) + 
                            (asharHadir + asharIzin + asharSakit + asharAlfa) +
                            (maghribHadir + maghribIzin + maghribSakit + maghribAlfa);
    const totalHadirShalat = subuhHadir + asharHadir + maghribHadir;
    const pctShalat = totalSlotShalat > 0 ? Math.round((totalHadirShalat / totalSlotShalat) * 100) : 0;

    const pilarScores = calculate6PilarScores(
      m,
      records as any,
      logbookData,
      kegiatanRecords,
      mutabaahData,
      [],
      [],
      "all"
    );

    let predikat = "Maqbul (Cukup)";
    if (pilarScores.totalScore >= 350 || pctShalat >= 90) predikat = "Mumtaz (Istimewa)";
    else if (pilarScores.totalScore >= 200 || pctShalat >= 75) predikat = "Jayyid Jiddan (Sangat Baik)";
    else if (pilarScores.totalScore >= 100 || pctShalat >= 60) predikat = "Jayyid (Baik)";

    return [
      idx + 1,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.asrama}"`,
      `"${m.kamar}"`,
      `"${m.kelas}"`,
      `"${(m.pamong || '').replace(/"/g, '""')}"`,
      subuhHadir,
      subuhIzin,
      subuhSakit,
      subuhAlfa,
      asharHadir,
      asharIzin,
      asharSakit,
      asharAlfa,
      maghribHadir,
      maghribIzin,
      maghribSakit,
      maghribAlfa,
      totalHadirShalat,
      `${pctShalat}%`,
      pilarScores.kepengasuhanScore,
      pilarScores.quranScore,
      pilarScores.ibadahScore,
      pilarScores.bahasaScore,
      pilarScores.kebersihanScore,
      pilarScores.kedisiplinanScore,
      pilarScores.totalScore,
      `"${predikat}"`,
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `Rekap_6Pilar_Musyrif_Muallimin_${format(new Date(), "yyyyMMdd")}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
