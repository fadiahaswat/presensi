import { format } from "date-fns";
import { id } from "date-fns/locale";
import { LOGBOOK_TASKS, LogbookStorage } from "../components/JurnalLogbookModal";
import { KegiatanRecord } from "../components/KegiatanAsramaModal";
import { MutabaahStorage } from "../components/MutabaahYaumiyahModal";

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
    "Maghrib Hadir",
    "Maghrib Izin",
    "Maghrib Sakit",
    "Maghrib Alfa",
    "Total Shalat Hadir",
    "Persentase Shalat (%)",
    "Logbook Tugas Selesai",
    "Agenda Asrama Hadir",
    "Mutabaah Sunnah Selesai",
    "Total Skor 4 Pilar",
    "Predikat Disiplin",
  ];

  const rows = filteredMusyrifs.map((m, idx) => {
    let subuhHadir = 0;
    let subuhIzin = 0;
    let subuhSakit = 0;
    let subuhAlfa = 0;

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

        if (rec.maghrib === "hadir") maghribHadir++;
        else if (rec.maghrib === "izin") maghribIzin++;
        else if (rec.maghrib === "sakit") maghribSakit++;
        else if (rec.maghrib === "alfa") maghribAlfa++;
      }
    });

    const totalSlotShalat = (subuhHadir + subuhIzin + subuhSakit + subuhAlfa) + 
                            (maghribHadir + maghribIzin + maghribSakit + maghribAlfa);
    const totalHadirShalat = subuhHadir + maghribHadir;
    const pctShalat = totalSlotShalat > 0 ? Math.round((totalHadirShalat / totalSlotShalat) * 100) : 0;
    const sholatScore = Math.max(0, (totalHadirShalat * 10) + ((subuhIzin + maghribIzin + subuhSakit + maghribSakit) * 3) - ((subuhAlfa + maghribAlfa) * 10));

    // Logbook 11 Tasks
    let logbookDone = 0;
    const mLogbook = logbookData[m.id] || {};
    Object.entries(mLogbook).forEach(([d, entry]) => {
      if (startDate && d < startDate) return;
      if (endDate && d > endDate) return;
      LOGBOOK_TASKS.forEach(t => {
        if (entry[t.key]?.done) logbookDone++;
      });
    });
    const logbookScore = logbookDone * 2;

    // Agenda Asrama & Pertemuan Rapat
    let kegiatanHadir = 0;
    kegiatanRecords.forEach(k => {
      if (startDate && k.date < startDate) return;
      if (endDate && k.date > endDate) return;
      if (k.attendees?.[m.id] === "hadir") kegiatanHadir++;
    });
    // Dynamic agenda meeting tasks from logbook
    const mLogbook = (logbookData as any)?.[m.id] || {};
    Object.entries(mLogbook).forEach(([d, entry]: [string, any]) => {
      if (startDate && d < startDate) return;
      if (endDate && d > endDate) return;
      if (entry && typeof entry === "object") {
        Object.entries(entry).forEach(([key, task]: [string, any]) => {
          if (key.startsWith("agenda_") && (task?.done === true || task?.done === "TRUE" || task?.done === "true" || task?.photoUrl || task?.completedAt)) {
            kegiatanHadir++;
          }
        });
      }
    });
    const kegiatanScore = kegiatanHadir * 5;

    // Mutaba'ah Sunnah
    let mutabaahDone = 0;
    const mMutabaah = mutabaahData[m.id] || {};
    Object.entries(mMutabaah).forEach(([d, entry]) => {
      if (startDate && d < startDate) return;
      if (endDate && d > endDate) return;
      if (entry.tahajjud) mutabaahDone++;
      if (entry.dhuha) mutabaahDone++;
      if (entry.rawatib) mutabaahDone++;
      if (entry.tilawahPages > 0) mutabaahDone++;
      if (entry.dzikirPagi) mutabaahDone++;
      if (entry.dzikirPetang) mutabaahDone++;
      if (entry.puasaSunnah || entry.muthalaah) mutabaahDone++;
    });
    const mutabaahScore = mutabaahDone * 2;

    const totalSkor = sholatScore + logbookScore + kegiatanScore + mutabaahScore;

    let predikat = "Maqbul (Cukup)";
    if (totalSkor >= 200 || pctShalat >= 90) predikat = "Mumtaz (Istimewa)";
    else if (totalSkor >= 120 || pctShalat >= 75) predikat = "Jayyid Jiddan (Sangat Baik)";
    else if (totalSkor >= 60 || pctShalat >= 60) predikat = "Jayyid (Baik)";

    return [
      idx + 1,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.asrama}"`,
      `"${m.kamar}"`,
      `"${m.kelas}"`,
      `"${m.pamong.replace(/"/g, '""')}"`,
      subuhHadir,
      subuhIzin,
      subuhSakit,
      subuhAlfa,
      maghribHadir,
      maghribIzin,
      maghribSakit,
      maghribAlfa,
      totalHadirShalat,
      `${pctShalat}%`,
      logbookDone,
      kegiatanHadir,
      mutabaahDone,
      totalSkor,
      `"${predikat}"`,
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `Rekap_4Pilar_Musyrif_Muallimin_${format(new Date(), "yyyyMMdd")}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
