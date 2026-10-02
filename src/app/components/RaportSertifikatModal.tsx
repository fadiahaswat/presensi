import React, { useState, useMemo } from "react";
import { 
  X, Printer, Award, FileText, Download, CheckCircle, 
  Crown, Star, ShieldCheck, Calendar, User, Building2, Table,
  ChevronLeft, GraduationCap, Sun, ClipboardList, Sparkles,
  HeartHandshake, BookCheck, Languages
} from "lucide-react";
import { motion } from "motion/react";
import mualliminLogo from "../muallimin-logo.png";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { LogbookStorage, isLogbookTaskCompleted } from "./JurnalLogbookModal";
import { KegiatanRecord } from "./KegiatanAsramaModal";
import { MutabaahStorage } from "./MutabaahYaumiyahModal";
import { PengasuhanKhususRecord } from "../types/pengasuhanKhusus";
import { AgendaRapatRecord } from "../types/agendaRapat";
import { isFieldMusyrif } from "../utils/roleAccessUtils";
import { calculate6PilarScores } from "../utils/pilarMusyrifUtils";

interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  role?: string;
  pamong?: string;
  email?: string;
  phone?: string;
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
}

interface RaportSertifikatModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
  logbookData?: LogbookStorage;
  kegiatanRecords?: KegiatanRecord[];
  mutabaahData?: MutabaahStorage;
  pengasuhanList?: PengasuhanKhususRecord[];
  agendaList?: AgendaRapatRecord[];
  isPage?: boolean;
}

function isTruthyFlag(val: any): boolean {
  if (val === true || val === 1) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "ya" || s === "hadir";
  }
  return false;
}

export function RaportSertifikatModal({
  onClose,
  musyrifList,
  records,
  logbookData = {},
  kegiatanRecords = [],
  mutabaahData = {},
  pengasuhanList = [],
  agendaList = [],
  isPage = false
}: RaportSertifikatModalProps) {
  const activeMusyrifList = useMemo(() => {
    return (musyrifList || []).filter(m => Boolean(m && m.id && m.name && m.name.trim() !== "" && isFieldMusyrif(m)));
  }, [musyrifList]);
  const [activeTab, setActiveTab] = useState<"raport" | "sertifikat">("raport");
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedAsramaFilter, setSelectedAsramaFilter] = useState<string>("all");
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(activeMusyrifList[0]?.id || musyrifList[0]?.id || "");
  const [periodName, setPeriodName] = useState<string>(`Bulan ${format(new Date(), "MMMM yyyy", { locale: id })}`);

  // Discover available months
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);
    Object.values(records).forEach(r => {
      if (r?.date && r.date.length >= 7) monthSet.add(r.date.substring(0, 7));
    });
    Object.values(logbookData).forEach(userMap => {
      if (userMap) Object.keys(userMap).forEach(d => { if (d.length >= 7) monthSet.add(d.substring(0, 7)); });
    });
    kegiatanRecords.forEach(k => {
      if (k?.date && k.date.length >= 7) monthSet.add(k.date.substring(0, 7));
    });
    Object.values(mutabaahData).forEach(userMap => {
      if (userMap) Object.keys(userMap).forEach(d => { if (d.length >= 7) monthSet.add(d.substring(0, 7)); });
    });
    pengasuhanList.forEach(p => {
      if (p?.date && p.date.length >= 7) monthSet.add(p.date.substring(0, 7));
    });
    agendaList.forEach(a => {
      if (a?.date && a.date.length >= 7) monthSet.add(a.date.substring(0, 7));
    });
    return Array.from(monthSet).filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
  }, [records, logbookData, kegiatanRecords, mutabaahData, pengasuhanList, agendaList, currentMonthKey]);

  const getMonthLabel = (mKey: string) => {
    if (mKey === "all") return "Semua Periode (Akumulasi)";
    try {
      const [year, month] = mKey.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      return format(d, "MMMM yyyy", { locale: id });
    } catch {
      return mKey;
    }
  };

  const handleMonthChange = (mKey: string) => {
    setSelectedMonth(mKey);
    if (mKey === "all") {
      setPeriodName("Semua Periode (Akumulasi)");
    } else {
      setPeriodName(`Bulan ${getMonthLabel(mKey)}`);
    }
  };

  // Filter musyrif list by selected asrama
  const filteredMusyrifList = activeMusyrifList.filter(m => 
    selectedAsramaFilter === "all" ? true : m.asrama === selectedAsramaFilter
  );

  // Auto-adjust selected musyrif if filtered out
  const musyrif = filteredMusyrifList.find(m => m.id === selectedMusyrifId) || filteredMusyrifList[0] || activeMusyrifList[0] || musyrifList[0];

  // Extract unique asrama list
  const asramaOptions = Array.from(new Set(activeMusyrifList.map(m => m.asrama)));

  // 1. Shalat Fardhu Statistics
  let totalSubuhHadir = 0, totalSubuhIzin = 0, totalSubuhSakit = 0, totalSubuhAlfa = 0;
  let totalAsharHadir = 0, totalAsharIzin = 0, totalAsharSakit = 0, totalAsharAlfa = 0;
  let totalMaghribHadir = 0, totalMaghribIzin = 0, totalMaghribSakit = 0, totalMaghribAlfa = 0;

  if (musyrif) {
    Object.values(records).forEach(rec => {
      if (rec.musyrifId === musyrif.id) {
        if (selectedMonth !== "all" && !rec.date.startsWith(selectedMonth)) return;
        if (rec.subuh === "hadir") totalSubuhHadir++;
        else if (rec.subuh === "izin") totalSubuhIzin++;
        else if (rec.subuh === "sakit") totalSubuhSakit++;
        else if (rec.subuh === "alfa") totalSubuhAlfa++;

        if (rec.ashar === "hadir") totalAsharHadir++;
        else if (rec.ashar === "izin") totalAsharIzin++;
        else if (rec.ashar === "sakit") totalAsharSakit++;
        else if (rec.ashar === "alfa") totalAsharAlfa++;

        if (rec.maghrib === "hadir") totalMaghribHadir++;
        else if (rec.maghrib === "izin") totalMaghribIzin++;
        else if (rec.maghrib === "sakit") totalMaghribSakit++;
        else if (rec.maghrib === "alfa") totalMaghribAlfa++;
      }
    });
  }

  const totalSlots = (totalSubuhHadir + totalSubuhIzin + totalSubuhSakit + totalSubuhAlfa) +
                     (totalAsharHadir + totalAsharIzin + totalAsharSakit + totalAsharAlfa) +
                     (totalMaghribHadir + totalMaghribIzin + totalMaghribSakit + totalMaghribAlfa);
  const totalHadir = totalSubuhHadir + totalAsharHadir + totalMaghribHadir;
  const attendanceRate = totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0;

  // 6 Pilar Musyrif Holistic Scoring
  const pilarScores = useMemo(() => {
    if (!musyrif) {
      return {
        kepengasuhanScore: 0,
        pengasuhanCount: 0,
        pengasuhanPoints: 0,
        quranScore: 0,
        quranDone: 0,
        ibadahScore: 0,
        hadirCount: 0,
        subuhCount: 0,
        asharCount: 0,
        maghribCount: 0,
        alfaCount: 0,
        sunnahPoints: 0,
        bahasaScore: 0,
        bahasaDone: 0,
        kebersihanScore: 0,
        kebersihanDone: 0,
        kedisiplinanScore: 0,
        kedisiplinanDone: 0,
        kegiatanDone: 0,
        totalScore: 0,
        totalLogbookDone: 0
      };
    }
    return calculate6PilarScores(
      musyrif,
      records,
      logbookData,
      kegiatanRecords,
      mutabaahData,
      pengasuhanList,
      agendaList,
      selectedMonth
    );
  }, [musyrif, records, logbookData, kegiatanRecords, mutabaahData, pengasuhanList, agendaList, selectedMonth]);

  // Holistic Grade Calculation
  let gradeLetter = "A";
  let gradeDesc = "Mumtaz (Istimewa)";
  let gradeColor = "text-emerald-700 bg-emerald-50 border-emerald-300";

  if (attendanceRate < 60 || pilarScores.totalScore < 100) {
    gradeLetter = "D";
    gradeDesc = "Dha'if (Perlu Evaluasi)";
    gradeColor = "text-rose-700 bg-rose-50 border-rose-300";
  } else if (attendanceRate < 75 || pilarScores.totalScore < 200) {
    gradeLetter = "C";
    gradeDesc = "Maqbul (Cukup)";
    gradeColor = "text-amber-700 bg-amber-50 border-amber-300";
  } else if (attendanceRate < 90 || pilarScores.totalScore < 350) {
    gradeLetter = "B";
    gradeDesc = "Jayyid (Baik)";
    gradeColor = "text-blue-700 bg-blue-50 border-blue-300";
  }

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-[#0C4E8C] text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Kembali ke Dashboard"
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              isPage ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
          <div>
            <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Raport Evaluasi & Sertifikat Musyrif
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Rekapitulasi holistik kepengasuhan & penghargaan musyrif teladan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Musyrif, Periode, & Tab Switcher Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Periode Bulan Filter */}
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Periode Evaluasi
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              aria-label="Pilih Periode Bulan Raport"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <optgroup label="Periode Bulanan">
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Lainnya">
                <option value="all">🌐 Semua Periode (Akumulasi Total)</option>
              </optgroup>
            </select>
          </div>

          {/* Asrama Filter */}
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Filter Asrama
            </label>
            <select
              value={selectedAsramaFilter}
              onChange={(e) => {
                const newAsr = e.target.value;
                setSelectedAsramaFilter(newAsr);
                const nextList = musyrifList.filter(m => newAsr === "all" ? true : m.asrama === newAsr);
                if (nextList.length > 0 && !nextList.some(m => m.id === selectedMusyrifId)) {
                  setSelectedMusyrifId(nextList[0].id);
                }
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="all">Semua Asrama ({musyrifList.length})</option>
              {asramaOptions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Musyrif Selector */}
          <div className="sm:col-span-4">
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Pilih Musyrif ({filteredMusyrifList.length})
            </label>
            <select
              value={selectedMusyrifId}
              onChange={(e) => setSelectedMusyrifId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              {filteredMusyrifList.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.asrama} - Kmr {m.kamar})</option>
              ))}
            </select>
          </div>

          {/* Tab Switcher */}
          <div className="sm:col-span-2 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("raport")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "raport" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Raport
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sertifikat")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "sertifikat" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Piagam
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="pb-8">
        {!musyrif ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">Tidak Ada Musyrif Terpilih</h3>
            <p className="text-xs text-slate-400 mt-1">Silakan sesuaikan filter asrama atau tambahkan musyrif pada sistem.</p>
          </div>
        ) : activeTab === "raport" ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            {/* Header Raport Resmi */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <img src={mualliminLogo} alt="Logo Madrasah Mu'allimin" className="h-12 w-auto object-contain" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    MADRASAH MU'ALLIMIN MUHAMMADIYAH YOGYAKARTA
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lembaga Kepengasuhan & Pembinaan Asrama</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xl sm:text-2xl font-black px-4 py-1.5 rounded-2xl border ${gradeColor} font-mono block`}>
                  Nilai: {gradeLetter}
                </span>
                <span className="text-[11px] font-bold text-slate-500 mt-1 block">{gradeDesc}</span>
              </div>
            </div>

            {/* Musyrif Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nama Musyrif:</span>
                <span className="font-bold text-slate-900">{musyrif.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Kelas / Tingkat:</span>
                <span className="font-bold text-slate-800">{musyrif.kelas} ({musyrif.tingkat})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Asrama & Kamar:</span>
                <span className="font-bold text-slate-800">{musyrif.asrama} · Kmr {musyrif.kamar}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Pamong Asrama:</span>
                <span className="font-bold text-slate-800">{musyrif.pamong || "Ustadz Pamong"}</span>
              </div>
            </div>

            {/* 6 Pillars Evaluation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Kepengasuhan */}
              <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-rose-600" />
                    <h4 className="font-bold text-xs text-rose-950">1. Kepengasuhan</h4>
                  </div>
                  <span className="text-xs font-bold text-rose-700 font-mono">{pilarScores.kepengasuhanScore} Pts</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-rose-200/60">
                  <div className="flex justify-between"><span>Rujukan PKU/RS:</span><span className="font-bold font-mono">{pilarScores.pengasuhanCount}x ({pilarScores.pengasuhanPoints} Pts)</span></div>
                  <div className="flex justify-between"><span>Patroli Sakit & Tidur:</span><span className="font-bold font-mono">Tercatat</span></div>
                </div>
              </div>

              {/* 2. Al-Qur'an */}
              <div className="p-3.5 bg-sky-50/40 rounded-2xl border border-sky-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookCheck className="w-4 h-4 text-sky-600" />
                    <h4 className="font-bold text-xs text-sky-950">2. Al-Qur'an</h4>
                  </div>
                  <span className="text-xs font-bold text-sky-700 font-mono">{pilarScores.quranScore} Pts</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-sky-200/60">
                  <div className="flex justify-between"><span>Halaqah & Tahsin:</span><span className="font-bold font-mono">{pilarScores.quranDone} Sesi Tuntas</span></div>
                  <div className="flex justify-between"><span>Surat Al-Kahfi:</span><span className="font-bold font-mono">Malam Jum'at</span></div>
                </div>
              </div>

              {/* 3. Ibadah */}
              <div className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs text-amber-950">3. Ibadah</h4>
                  </div>
                  <span className="text-xs font-bold text-amber-700 font-mono">{attendanceRate}% Kehadiran</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-amber-200/60">
                  <div className="flex justify-between"><span>Total Shalat Hadir:</span><span className="font-bold font-mono">{totalHadir} kali</span></div>
                  <div className="flex justify-between"><span>Skor Ibadah & Sunnah:</span><span className="font-bold font-mono">{pilarScores.ibadahScore} Pts</span></div>
                </div>
              </div>

              {/* 4. Bahasa */}
              <div className="p-3.5 bg-teal-50/40 rounded-2xl border border-teal-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-teal-600" />
                    <h4 className="font-bold text-xs text-teal-950">4. Bahasa</h4>
                  </div>
                  <span className="text-xs font-bold text-teal-700 font-mono">{pilarScores.bahasaScore} Pts</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-teal-200/60">
                  <div className="flex justify-between"><span>Bina Bahasa & Muhadatsah:</span><span className="font-bold font-mono">{pilarScores.bahasaDone} Sesi</span></div>
                  <div className="flex justify-between"><span>Fokus:</span><span className="font-bold font-mono">Arab & Inggris</span></div>
                </div>
              </div>

              {/* 5. Kebersihan */}
              <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-emerald-950">5. Kebersihan</h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 font-mono">{pilarScores.kebersihanScore} Pts</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-emerald-200/60">
                  <div className="flex justify-between"><span>Piket & Kerja Bakti:</span><span className="font-bold font-mono">{pilarScores.kebersihanDone} Tugas</span></div>
                  <div className="flex justify-between"><span>Sanitasi Asrama:</span><span className="font-bold font-mono">Terkontrol</span></div>
                </div>
              </div>

              {/* 6. Kedisiplinan */}
              <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-xs text-indigo-950">6. Kedisiplinan</h4>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 font-mono">{pilarScores.kedisiplinanScore} Pts</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-indigo-200/60">
                  <div className="flex justify-between"><span>Patroli Ketertiban:</span><span className="font-bold font-mono">{pilarScores.kedisiplinanDone} Tugas</span></div>
                  <div className="flex justify-between"><span>Agenda & Rapat Asrama:</span><span className="font-bold font-mono">{pilarScores.kegiatanDone} Sesi</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Piagam Sertifikat */
          <div className="bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/50 rounded-3xl p-8 sm:p-12 border-4 border-amber-300 shadow-lg text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl" />
            <img src={mualliminLogo} alt="Logo" className="h-16 w-auto mx-auto mb-3 object-contain" />
            <h2 className="text-lg sm:text-xl font-extrabold tracking-wider text-slate-900 font-serif">
              PIAGAM PENGHARGAAN KEPENGASUHAN
            </h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">
              MADRASAH MU'ALLIMIN MUHAMMADIYAH YOGYAKARTA
            </p>

            <div className="my-8">
              <p className="text-xs text-slate-500 italic mb-2">Diberikan sebagai apresiasi keteladanan kepada:</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-800 font-serif tracking-tight underline decoration-amber-400 decoration-2 underline-offset-8">
                {musyrif.name}
              </h3>
              <p className="text-xs font-bold text-slate-700 mt-3">
                Musyrif {musyrif.asrama} · Kelas {musyrif.kelas}
              </p>
            </div>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Atas dedikasi, kedisiplinan shalat berjamaah, pembimbingan ibadah santri, dan pelaksanaan amanah kepengasuhan asrama dengan predikat <strong>{gradeDesc} ({gradeLetter})</strong>.
            </p>

            <div className="flex justify-between items-end mt-12 pt-6 border-t border-slate-200 text-xs">
              <div className="text-center">
                <p className="text-slate-400 text-[11px]">Koordinator Musyrif</p>
                <div className="h-12" />
                <p className="font-bold text-slate-800">Ustadz Koordinator</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-[11px]">Yogyakarta, {format(new Date(), "d MMMM yyyy", { locale: id })}</p>
                <div className="h-12" />
                <p className="font-bold text-slate-800">{musyrif.pamong || "Ustadz Pamong Asrama"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isPage) {
    return content;
  }

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => { triggerHaptic("light"); onClose(); }}
    >
      <motion.div 
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
