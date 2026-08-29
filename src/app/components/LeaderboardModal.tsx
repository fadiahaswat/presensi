import React, { useState } from "react";
import { 
  X, Trophy, Crown, Flame, Award, Star, 
  Sparkles, Medal, TrendingUp, ShieldCheck, CheckCircle2, User, BookOpen, Clock, Calendar,
  ChevronLeft, ChevronRight, Sun, ClipboardList, Building2
} from "lucide-react";
import { motion } from "motion/react";
import { LogbookStorage, LOGBOOK_TASKS } from "./JurnalLogbookModal";
import { KegiatanRecord } from "./KegiatanAsramaModal";
import { MutabaahStorage } from "./MutabaahYaumiyahModal";
import { PengasuhanKhususRecord } from "../types/pengasuhanKhusus";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

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
  onSelectMusyrif?: (id: string, mode?: "raport" | "riwayat") => void;
  isPage?: boolean;
}

export function LeaderboardModal({
  onClose,
  musyrifList,
  records,
  logbookData = {},
  kegiatanRecords = [],
  mutabaahData = {},
  pengasuhanList = [],
  onSelectMusyrif,
  isPage = false
}: LeaderboardModalProps) {
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [selectedPillar, setSelectedPillar] = useState<"all" | "sholat" | "logbook" | "kegiatan" | "mutabaah">("all");
  const [selectedDetailMusyrif, setSelectedDetailMusyrif] = useState<any | null>(null);

  // Calculate scores across the 4 Pillars for each musyrif
  const activeMusyrifList = musyrifList.filter(m => m.role !== "pamong" && m.role !== "koordinator_musyrif");
  const leaderboardData = activeMusyrifList.map(m => {
    // 1. Shalat Fardhu Score (Subuh & Maghrib)
    let hadirCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alfaCount = 0;
    let subuhCount = 0;
    let maghribCount = 0;

    Object.entries(records).forEach(([_, rec]) => {
      if (rec.musyrifId === m.id) {
        if (rec.subuh === "hadir") { hadirCount++; subuhCount++; }
        else if (rec.subuh === "izin") izinCount++;
        else if (rec.subuh === "sakit") sakitCount++;
        else if (rec.subuh === "alfa") alfaCount++;

        if (rec.maghrib === "hadir") { hadirCount++; maghribCount++; }
        else if (rec.maghrib === "izin") izinCount++;
        else if (rec.maghrib === "sakit") sakitCount++;
        else if (rec.maghrib === "alfa") alfaCount++;
      }
    });

    const sholatScore = Math.max(0, hadirCount * 10 - alfaCount * 15);

    // 2. Logbook Harian Score & Pengasuhan Khusus (Hanya dihitung serentak mulai 18 Agustus 2026)
    let logbookTasksDone = 0;
    const musyrifLogbooks = logbookData[m.id] || {};
    Object.entries(musyrifLogbooks).forEach(([dt, dayEntry]) => {
      if (dt >= "2026-08-18") {
        LOGBOOK_TASKS.forEach(t => {
          if (dayEntry[t.key]?.done) logbookTasksDone++;
        });
      }
    });

    let pengasuhanPoints = 0;
    let pengasuhanCount = 0;
    pengasuhanList.forEach(p => {
      if (p.musyrifId === m.id && p.date >= "2026-08-18") {
        pengasuhanCount++;
        pengasuhanPoints += (p.poin || (p.kategori === "antar_pku_rs" ? 10 : 5));
      }
    });

    const logbookScore = (logbookTasksDone * 5) + pengasuhanPoints;

    // 3. Agenda Asrama & Pertemuan Score (Kegiatan Asrama + Logbook Dinamis Rapat)
    let kegiatanDone = 0;
    kegiatanRecords.forEach(keg => {
      if (keg.attendees?.[m.id] === "hadir") kegiatanDone++;
    });
    // Dynamic agenda meeting tasks from logbook
    Object.entries(musyrifLogbooks).forEach(([dt, dayEntry]) => {
      if (dt >= "2026-08-18") {
        Object.entries(dayEntry).forEach(([key, task]) => {
          if (key.startsWith("agenda_") && (task as any)?.done) {
            kegiatanDone++;
          }
        });
      }
    });
    const kegiatanScore = kegiatanDone * 15;

    // 4. Mutaba'ah Yaumiyah Score (Hanya dihitung serentak mulai 18 Agustus 2026)
    let mutabaahPoints = 0;
    const musyrifMutabaah = mutabaahData[m.id] || {};
    Object.entries(musyrifMutabaah).forEach(([dt, dayEntry]) => {
      if (dt >= "2026-08-18") {
        if (dayEntry.tahajjud) mutabaahPoints += 5;
        if (dayEntry.dhuha) mutabaahPoints += 3;
        if (dayEntry.rawatib) mutabaahPoints += 3;
        if (dayEntry.tilawahPages > 0) mutabaahPoints += Math.min(dayEntry.tilawahPages, 10);
        if (dayEntry.dzikirPagi) mutabaahPoints += 2;
        if (dayEntry.dzikirPetang) mutabaahPoints += 2;
        if (dayEntry.puasaSunnah) mutabaahPoints += 10;
        if (dayEntry.muthalaah) mutabaahPoints += 5;
      }
    });

    const totalScore = sholatScore + logbookScore + kegiatanScore + mutabaahPoints;

    return {
      ...m,
      score: totalScore,
      sholatScore,
      logbookScore,
      pengasuhanCount,
      pengasuhanPoints,
      kegiatanScore,
      mutabaahScore: mutabaahPoints,
      hadirCount,
      subuhCount,
      maghribCount,
      alfaCount,
      logbookTasksDone,
      kegiatanDone
    };
  })
  .filter(m => selectedAsrama === "all" || m.asrama === selectedAsrama)
  .sort((a, b) => {
    if (selectedPillar === "sholat") return b.sholatScore - a.sholatScore;
    if (selectedPillar === "logbook") return b.logbookScore - a.logbookScore;
    if (selectedPillar === "kegiatan") return b.kegiatanScore - a.kegiatanScore;
    if (selectedPillar === "mutabaah") return b.mutabaahScore - a.mutabaahScore;
    return b.score - a.score || b.hadirCount - a.hadirCount;
  });

  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

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
              Papan Peringkat & Musyrif Teladan
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Presensi Shalat, Jurnal Logbook, Agenda Asrama, & Mutaba'ah
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars Filter */}
      <div className="bg-white rounded-2xl p-2 sm:p-3 border border-slate-200/70 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: "all", label: "Total 4 Pilar", icon: <Trophy className="w-3.5 h-3.5" /> },
          { id: "sholat", label: "Shalat Fardhu", icon: <Sun className="w-3.5 h-3.5" /> },
          { id: "logbook", label: "Logbook Tugas", icon: <ClipboardList className="w-3.5 h-3.5" /> },
          { id: "kegiatan", label: "Agenda Asrama", icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: "mutabaah", label: "Mutaba'ah", icon: <Sparkles className="w-3.5 h-3.5" /> }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPillar(p.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
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
                {selectedPillar === "all" ? `${top3[1].score} Poin` : 
                 selectedPillar === "sholat" ? `${top3[1].sholatScore} Poin` :
                 selectedPillar === "logbook" ? `${top3[1].logbookScore} Poin` :
                 selectedPillar === "kegiatan" ? `${top3[1].kegiatanScore} Poin` : `${top3[1].mutabaahScore} Poin`}
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
                {selectedPillar === "all" ? `${top3[0].score} Poin` : 
                 selectedPillar === "sholat" ? `${top3[0].sholatScore} Poin` :
                 selectedPillar === "logbook" ? `${top3[0].logbookScore} Poin` :
                 selectedPillar === "kegiatan" ? `${top3[0].kegiatanScore} Poin` : `${top3[0].mutabaahScore} Poin`}
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
                {selectedPillar === "all" ? `${top3[2].score} Poin` : 
                 selectedPillar === "sholat" ? `${top3[2].sholatScore} Poin` :
                 selectedPillar === "logbook" ? `${top3[2].logbookScore} Poin` :
                 selectedPillar === "kegiatan" ? `${top3[2].kegiatanScore} Poin` : `${top3[2].mutabaahScore} Poin`}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Rest Leaderboard List */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-700">Daftar Peringkat Musyrif</h4>
          <span className="text-[11px] text-slate-400">Klik baris untuk rincian skor</span>
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
                <h5 className="font-bold text-xs text-slate-900 truncate">{m.name}</h5>
                <p className="text-[11px] text-slate-500">{m.asrama} · Kamar {m.kamar}</p>
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-lg">
                {selectedPillar === "all" ? `${m.score} Pts` :
                 selectedPillar === "sholat" ? `${m.sholatScore} Pts` :
                 selectedPillar === "logbook" ? `${m.logbookScore} Pts` :
                 selectedPillar === "kegiatan" ? `${m.kegiatanScore} Pts` : `${m.mutabaahScore} Pts`}
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

            {/* Total Points Badge */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Skor 4 Pilar</span>
                <p className="text-xl font-extrabold text-emerald-900 font-mono leading-none mt-1">{selectedDetailMusyrif.score} Poin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {/* 4 Pillars Breakdown Grid */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Shalat Subuh & Maghrib:
                </span>
                <span className="font-bold font-mono text-slate-900">{selectedDetailMusyrif.sholatScore} Pts ({selectedDetailMusyrif.hadirCount}x Hadir)</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Logbook & Pengasuhan:
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedDetailMusyrif.logbookScore} Pts ({selectedDetailMusyrif.logbookTasksDone} Tugas{selectedDetailMusyrif.pengasuhanCount > 0 ? ` + ${selectedDetailMusyrif.pengasuhanCount} Pengasuhan` : ""})
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-teal-500" /> Agenda Khusus Asrama:
                </span>
                <span className="font-bold font-mono text-slate-900">{selectedDetailMusyrif.kegiatanScore} Pts ({selectedDetailMusyrif.kegiatanDone} Sesi)</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Mutaba'ah Sunnah:
                </span>
                <span className="font-bold font-mono text-slate-900">{selectedDetailMusyrif.mutabaahScore} Pts</span>
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
