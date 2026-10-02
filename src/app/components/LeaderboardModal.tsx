import React, { useState, useMemo } from "react";
import { 
  X, Trophy, Crown, Award, 
  Sparkles, Medal, BookOpen, Calendar,
  ChevronLeft, ChevronRight, Sun, ClipboardList, Building2,
  RotateCcw, HeartHandshake, BookCheck, Languages, Sparkles as SparklesIcon, ShieldCheck
} from "lucide-react";
import { motion } from "motion/react";
import { format, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { LogbookStorage, isLogbookTaskCompleted } from "./JurnalLogbookModal";
import { KegiatanRecord } from "./KegiatanAsramaModal";
import { MutabaahStorage } from "./MutabaahYaumiyahModal";
import { PengasuhanKhususRecord } from "../types/pengasuhanKhusus";
import { AgendaRapatRecord } from "../types/agendaRapat";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { getEffectiveAttendanceStatus } from "../App";
import { isFieldMusyrif } from "../utils/roleAccessUtils";
import { calculate6PilarScores, PILAR_METADATA, PilarId } from "../utils/pilarMusyrifUtils";

interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  role?: string;
  photo?: string;
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
}

interface LeaderboardModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
  logbookData?: LogbookStorage;
  kegiatanRecords?: KegiatanRecord[];
  mutabaahData?: MutabaahStorage;
  pengasuhanList?: PengasuhanKhususRecord[];
  agendaList?: AgendaRapatRecord[];
  onSelectMusyrif?: (id: string, mode?: "raport" | "riwayat") => void;
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

export function LeaderboardModal({
  onClose,
  musyrifList,
  records,
  logbookData = {},
  kegiatanRecords = [],
  mutabaahData = {},
  pengasuhanList = [],
  agendaList = [],
  onSelectMusyrif,
  isPage = false
}: LeaderboardModalProps) {
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [selectedPillar, setSelectedPillar] = useState<PilarId>("all");
  const [selectedDetailMusyrif, setSelectedDetailMusyrif] = useState<any | null>(null);

  // Discover all months present across all data sources
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);

    // Records
    Object.values(records).forEach(r => {
      if (r?.date && r.date.length >= 7) {
        monthSet.add(r.date.substring(0, 7));
      }
    });

    // Logbook
    Object.values(logbookData).forEach(userMap => {
      if (userMap) {
        Object.keys(userMap).forEach(d => {
          if (d.length >= 7) monthSet.add(d.substring(0, 7));
        });
      }
    });

    // Kegiatan
    kegiatanRecords.forEach(k => {
      if (k?.date && k.date.length >= 7) {
        monthSet.add(k.date.substring(0, 7));
      }
    });

    // Mutabaah
    Object.values(mutabaahData).forEach(userMap => {
      if (userMap) {
        Object.keys(userMap).forEach(d => {
          if (d.length >= 7) monthSet.add(d.substring(0, 7));
        });
      }
    });

    // Pengasuhan Khusus
    pengasuhanList.forEach(p => {
      if (p?.date && p.date.length >= 7) {
        monthSet.add(p.date.substring(0, 7));
      }
    });

    // Agenda Rapat
    agendaList.forEach(a => {
      if (a?.date && a.date.length >= 7) {
        monthSet.add(a.date.substring(0, 7));
      }
    });

    return Array.from(monthSet)
      .filter(m => /^\d{4}-\d{2}$/.test(m))
      .sort((a, b) => b.localeCompare(a));
  }, [records, logbookData, kegiatanRecords, mutabaahData, pengasuhanList, agendaList, currentMonthKey]);

  // Format month name in Indonesian
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

  const handlePrevMonth = () => {
    triggerHaptic("light");
    if (selectedMonth === "all") {
      setSelectedMonth(currentMonthKey);
      return;
    }
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      const prev = subMonths(d, 1);
      setSelectedMonth(format(prev, "yyyy-MM"));
    } catch {
      setSelectedMonth(currentMonthKey);
    }
  };

  const handleNextMonth = () => {
    triggerHaptic("light");
    if (selectedMonth === "all") {
      setSelectedMonth(currentMonthKey);
      return;
    }
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      const next = addMonths(d, 1);
      setSelectedMonth(format(next, "yyyy-MM"));
    } catch {
      setSelectedMonth(currentMonthKey);
    }
  };

  // Calculate scores across the 4 Pillars strictly for field Musyrif (Wadir, Kaur KIS, Pamong, Koordinator Musyrif are excluded)
  const activeMusyrifList = useMemo(() => {
    return (musyrifList || []).filter(m => Boolean(m && m.id && m.name && m.name.trim() !== "" && isFieldMusyrif(m)));
  }, [musyrifList]);

  const leaderboardData = useMemo(() => {
    return activeMusyrifList.map(m => {
      const pilarScores = calculate6PilarScores(
        m,
        records,
        logbookData,
        kegiatanRecords,
        mutabaahData,
        pengasuhanList,
        agendaList,
        selectedMonth
      );

      return {
        ...m,
        ...pilarScores,
        score: pilarScores.totalScore
      };
    })
    .filter(m => selectedAsrama === "all" || m.asrama === selectedAsrama)
    .sort((a, b) => {
      if (selectedPillar === "kepengasuhan") return b.kepengasuhanScore - a.kepengasuhanScore;
      if (selectedPillar === "quran") return b.quranScore - a.quranScore;
      if (selectedPillar === "ibadah") return b.ibadahScore - a.ibadahScore;
      if (selectedPillar === "bahasa") return b.bahasaScore - a.bahasaScore;
      if (selectedPillar === "kebersihan") return b.kebersihanScore - a.kebersihanScore;
      if (selectedPillar === "kedisiplinan") return b.kedisiplinanScore - a.kedisiplinanScore;
      return b.score - a.score || b.hadirCount - a.hadirCount;
    });
  }, [activeMusyrifList, records, logbookData, kegiatanRecords, mutabaahData, pengasuhanList, agendaList, selectedMonth, selectedAsrama, selectedPillar]);

  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);
  const isCurrentMonthActive = selectedMonth === currentMonthKey;

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-emerald-800 text-white rounded-t-3xl sm:rounded-t-[28px]"
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
              Papan Peringkat Musyrif
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Presensi Shalat, Jurnal Logbook, Agenda Asrama, & Mutaba'ah
            </p>
          </div>
        </div>
      </div>

      {/* Unified Period & 4 Pillars Filter Bar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Month Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
              className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-xs flex items-center justify-center text-slate-600 transition-all active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 absolute left-2 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={e => {
                  triggerHaptic("light");
                  setSelectedMonth(e.target.value);
                }}
                aria-label="Pilih Periode Bulan"
                className="text-xs font-bold bg-transparent pl-7 pr-4 py-1 text-slate-800 focus:outline-hidden cursor-pointer text-center"
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

            <button
              type="button"
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
              className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-xs flex items-center justify-center text-slate-600 transition-all active:scale-95 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonthActive && selectedMonth !== "all" && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSelectedMonth(currentMonthKey);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
              title="Kembali ke Bulan Berjalan"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Bulan Ini</span>
            </button>
          )}
        </div>

        {/* 6 Pillars Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "Total 6 Pilar", icon: <Trophy className="w-3.5 h-3.5" /> },
            { id: "kepengasuhan", label: "1. Kepengasuhan", icon: <HeartHandshake className="w-3.5 h-3.5" /> },
            { id: "quran", label: "2. Al-Qur'an", icon: <BookCheck className="w-3.5 h-3.5" /> },
            { id: "ibadah", label: "3. Ibadah", icon: <Sun className="w-3.5 h-3.5" /> },
            { id: "bahasa", label: "4. Bahasa", icon: <Languages className="w-3.5 h-3.5" /> },
            { id: "kebersihan", label: "5. Kebersihan", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: "kedisiplinan", label: "6. Kedisiplinan", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSelectedPillar(p.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                selectedPillar === p.id 
                  ? "bg-[#0C81E4] text-white shadow-xs" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6 Pilar KPI Aggregate Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-rose-50/70 rounded-2xl p-2.5 border border-rose-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">1. Asuh</span>
            <HeartHandshake className="w-3.5 h-3.5 text-rose-600"/>
          </div>
          <p className="text-base font-black text-rose-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.kepengasuhanScore, 0)} <span className="text-[10px] font-normal text-rose-700">pts</span>
          </p>
          <p className="text-[9px] text-rose-700 mt-0.5 truncate">Medis & Bimbingan</p>
        </div>

        <div className="bg-sky-50/70 rounded-2xl p-2.5 border border-sky-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">2. Qur'an</span>
            <BookCheck className="w-3.5 h-3.5 text-sky-600"/>
          </div>
          <p className="text-base font-black text-sky-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.quranScore, 0)} <span className="text-[10px] font-normal text-sky-700">pts</span>
          </p>
          <p className="text-[9px] text-sky-700 mt-0.5 truncate">Tahfizh & Tahsin</p>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-2.5 border border-amber-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">3. Ibadah</span>
            <Sun className="w-3.5 h-3.5 text-amber-600"/>
          </div>
          <p className="text-base font-black text-amber-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.ibadahScore, 0)} <span className="text-[10px] font-normal text-amber-700">pts</span>
          </p>
          <p className="text-[9px] text-amber-700 mt-0.5 truncate">Shalat & Sunnah</p>
        </div>

        <div className="bg-teal-50/70 rounded-2xl p-2.5 border border-teal-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">4. Bahasa</span>
            <Languages className="w-3.5 h-3.5 text-teal-600"/>
          </div>
          <p className="text-base font-black text-teal-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.bahasaScore, 0)} <span className="text-[10px] font-normal text-teal-700">pts</span>
          </p>
          <p className="text-[9px] text-teal-700 mt-0.5 truncate">Bina & Muhadatsah</p>
        </div>

        <div className="bg-emerald-50/70 rounded-2xl p-2.5 border border-emerald-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">5. Bersih</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600"/>
          </div>
          <p className="text-base font-black text-emerald-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.kebersihanScore, 0)} <span className="text-[10px] font-normal text-emerald-700">pts</span>
          </p>
          <p className="text-[9px] text-emerald-700 mt-0.5 truncate">Piket & Kerapian</p>
        </div>

        <div className="bg-indigo-50/70 rounded-2xl p-2.5 border border-indigo-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">6. Disiplin</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600"/>
          </div>
          <p className="text-base font-black text-indigo-950 font-mono mt-1">
            {leaderboardData.reduce((acc, m) => acc + m.kedisiplinanScore, 0)} <span className="text-[10px] font-normal text-indigo-700">pts</span>
          </p>
          <p className="text-[9px] text-indigo-700 mt-0.5 truncate">Patroli & Agenda</p>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
        <div className="flex items-end justify-center gap-3 pt-2">
          {/* Rank 2 */}
          {top3[1] && (
            <button
              type="button"
              onClick={() => setSelectedDetailMusyrif(top3[1])}
              className="flex-1 flex flex-col items-center text-center group cursor-pointer active:scale-95 transition-all p-2 rounded-2xl hover:bg-slate-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-700 shadow-xs relative mb-1.5 group-hover:scale-105 transition-transform">
                <Medal className="w-6 h-6 text-slate-500" />
                <span className="absolute -bottom-2 bg-slate-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">#2</span>
              </div>
              <div className="font-bold text-xs text-slate-900 truncate max-w-[100px]">{top3[1].name.split(" ")[0]}</div>
              <div className="text-[11px] text-slate-500">{top3[1].asrama}</div>
              <div className="text-xs font-bold text-emerald-700 font-mono mt-1">
                {selectedPillar === "all" ? `${top3[1].score} Pts` : 
                 selectedPillar === "kepengasuhan" ? `${top3[1].kepengasuhanScore} Pts` :
                 selectedPillar === "quran" ? `${top3[1].quranScore} Pts` :
                 selectedPillar === "ibadah" ? `${top3[1].ibadahScore} Pts` :
                 selectedPillar === "bahasa" ? `${top3[1].bahasaScore} Pts` :
                 selectedPillar === "kebersihan" ? `${top3[1].kebersihanScore} Pts` : `${top3[1].kedisiplinanScore} Pts`}
              </div>
            </button>
          )}

          {/* Rank 1 */}
          {top3[0] && (
            <button
              type="button"
              onClick={() => setSelectedDetailMusyrif(top3[0])}
              className="flex-1 flex flex-col items-center text-center -translate-y-2 group cursor-pointer active:scale-95 transition-all p-2 rounded-2xl hover:bg-amber-50/50"
            >
              <div className="relative mb-1.5 group-hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-700 shadow-sm">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
                <span className="absolute -top-2 -right-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider font-mono">
                  Juara 1
                </span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[120px]">{top3[0].name}</div>
              <div className="text-xs font-semibold text-emerald-700">{top3[0].asrama}</div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-800 font-mono mt-1 bg-amber-100/70 border border-amber-300 px-3 py-0.5 rounded-full">
                {selectedPillar === "all" ? `${top3[0].score} Pts` : 
                 selectedPillar === "kepengasuhan" ? `${top3[0].kepengasuhanScore} Pts` :
                 selectedPillar === "quran" ? `${top3[0].quranScore} Pts` :
                 selectedPillar === "ibadah" ? `${top3[0].ibadahScore} Pts` :
                 selectedPillar === "bahasa" ? `${top3[0].bahasaScore} Pts` :
                 selectedPillar === "kebersihan" ? `${top3[0].kebersihanScore} Pts` : `${top3[0].kedisiplinanScore} Pts`}
              </div>
            </button>
          )}

          {/* Rank 3 */}
          {top3[2] && (
            <button
              type="button"
              onClick={() => setSelectedDetailMusyrif(top3[2])}
              className="flex-1 flex flex-col items-center text-center group cursor-pointer active:scale-95 transition-all p-2 rounded-2xl hover:bg-slate-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center font-bold text-amber-800 shadow-xs relative mb-1.5 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6 text-amber-700" />
                <span className="absolute -bottom-2 bg-amber-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">#3</span>
              </div>
              <div className="font-bold text-xs text-slate-900 truncate max-w-[100px]">{top3[2].name.split(" ")[0]}</div>
              <div className="text-[11px] text-slate-500">{top3[2].asrama}</div>
              <div className="text-xs font-bold text-emerald-700 font-mono mt-1">
                {selectedPillar === "all" ? `${top3[2].score} Pts` : 
                 selectedPillar === "kepengasuhan" ? `${top3[2].kepengasuhanScore} Pts` :
                 selectedPillar === "quran" ? `${top3[2].quranScore} Pts` :
                 selectedPillar === "ibadah" ? `${top3[2].ibadahScore} Pts` :
                 selectedPillar === "bahasa" ? `${top3[2].bahasaScore} Pts` :
                 selectedPillar === "kebersihan" ? `${top3[2].kebersihanScore} Pts` : `${top3[2].kedisiplinanScore} Pts`}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Rest Leaderboard List */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-700">
            Daftar Peringkat Musyrif • {getMonthLabel(selectedMonth)}
          </h4>
          <span className="text-[11px] text-slate-400">Klik baris untuk rincian 6 pilar</span>
        </div>
        {rest.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedDetailMusyrif(m)}
            className="w-full p-3 bg-white border border-slate-200/70 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-emerald-300 hover:bg-slate-50/50 cursor-pointer transition-all active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-6 text-xs font-bold text-slate-400 font-mono text-center shrink-0">
                #{idx + 4}
              </span>
              <div className="min-w-0">
                <h5 className="font-bold text-xs text-slate-900 truncate">{m.name || "Musyrif"}</h5>
                <p className="text-[11px] text-slate-500">
                  {m.asrama ? `${m.asrama}${m.kamar ? ` · Kamar ${m.kamar}` : ""}` : (m.kamar ? `Kamar ${m.kamar}` : "-")}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-lg">
                {selectedPillar === "all" ? `${m.score} Pts` :
                 selectedPillar === "kepengasuhan" ? `${m.kepengasuhanScore} Pts` :
                 selectedPillar === "quran" ? `${m.quranScore} Pts` :
                 selectedPillar === "ibadah" ? `${m.ibadahScore} Pts` :
                 selectedPillar === "bahasa" ? `${m.bahasaScore} Pts` :
                 selectedPillar === "kebersihan" ? `${m.kebersihanScore} Pts` : `${m.kedisiplinanScore} Pts`}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>
        ))}
      </div>

      {/* Detail Breakdown Modal for Selected Musyrif */}
      {selectedDetailMusyrif && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDetailMusyrif(null)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100/80 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{selectedDetailMusyrif.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Musyrif {selectedDetailMusyrif.asrama} · Kamar {selectedDetailMusyrif.kamar}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedDetailMusyrif(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Points Badge & Selected Period */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Periode {getMonthLabel(selectedMonth)}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Skor 6 Pilar</span>
                <p className="text-xl font-extrabold text-emerald-900 font-mono leading-none mt-1">{selectedDetailMusyrif.score} Poin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {/* 6 Pillars Breakdown Grid */}
            <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> 1. Kepengasuhan:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.kepengasuhanScore} Pts
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <BookCheck className="w-3.5 h-3.5 text-sky-500" /> 2. Al-Qur'an:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.quranScore} Pts
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> 3. Ibadah:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.ibadahScore} Pts ({selectedDetailMusyrif.hadirCount}x Shalat)
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Languages className="w-3.5 h-3.5 text-teal-500" /> 4. Bahasa:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.bahasaScore} Pts
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> 5. Kebersihan:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.kebersihanScore} Pts
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> 6. Kedisiplinan:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.kedisiplinanScore} Pts
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const mId = selectedDetailMusyrif.id;
                  setSelectedDetailMusyrif(null);
                  onSelectMusyrif?.(mId, "raport");
                }}
                className="flex-1 py-2.5 bg-[#0C81E4] hover:bg-[#0C4E8C] text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Lihat Raport</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const mId = selectedDetailMusyrif.id;
                  setSelectedDetailMusyrif(null);
                  onSelectMusyrif?.(mId, "riwayat");
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lihat Riwayat</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
