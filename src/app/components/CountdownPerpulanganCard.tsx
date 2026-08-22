import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  Edit3,
} from "lucide-react";
import {
  JadwalPerpulangan,
  KetentuanPerpulangan,
  getSavedJadwalPerpulangan,
  getSavedKetentuanPerpulangan,
  canUserScrudKalender,
} from "../data/kalenderPendidikanData";
import { getTrustedDate } from "../utils/trustedTime";

interface CountdownPerpulanganCardProps {
  userEmail?: string | null;
  userRole?: string | null;
  onOpenFullCalendar?: () => void;
  onOpenScrudModal?: () => void;
  variant?: "compact" | "full";
  filterKelas?: "Semua" | "I" | "II-VI";
  onFilterChange?: (filter: "Semua" | "I" | "II-VI") => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalMs: number;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = getTrustedDate();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalMs: 0 };
  }

  const seconds = Math.floor((diffMs / 1000) % 60);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isPast: false, totalMs: diffMs };
}

export const CountdownPerpulanganCard: React.FC<CountdownPerpulanganCardProps> = ({
  userEmail,
  userRole,
  onOpenFullCalendar,
  onOpenScrudModal,
  variant = "compact",
  filterKelas: propFilterKelas,
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<"Semua" | "I" | "II-VI">("Semua");
  const activeFilter = propFilterKelas ?? internalFilter;

  const [jadwalList, setJadwalList] = useState<JadwalPerpulangan[]>(getSavedJadwalPerpulangan);
  const [now, setNow] = useState<Date>(getTrustedDate);

  const canScrud = canUserScrudKalender(userEmail, userRole);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getTrustedDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setJadwalList(getSavedJadwalPerpulangan());
    };
    window.addEventListener("muallimin_kalender_updated", handleStorageChange);
    return () => window.removeEventListener("muallimin_kalender_updated", handleStorageChange);
  }, []);

  const handleSetFilter = (val: "Semua" | "I" | "II-VI", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onFilterChange) {
      onFilterChange(val);
    } else {
      setInternalFilter(val);
    }
  };

  const { activeDisplayItem, isCurrentlyOngoing, timeRemaining } = useMemo(() => {
    const sorted = [...jadwalList].sort((a, b) => a.startDate.localeCompare(b.startDate));

    const filtered = sorted.filter((item) => {
      if (activeFilter === "Semua") return true;
      if (activeFilter === "I") {
        return item.targetKelas === "I" || item.targetKelas === "I-VI" || item.targetKelas === "Semua";
      }
      if (activeFilter === "II-VI") {
        return item.targetKelas === "II-VI" || item.targetKelas === "I-VI" || item.targetKelas === "Semua";
      }
      return true;
    });

    let ongoing: JadwalPerpulangan | null = null;
    let upcoming: JadwalPerpulangan | null = null;

    for (const item of filtered) {
      const [sh, sm] = (item.startTime || "12:30").split(":").map(Number);
      const [eh, em] = (item.endTime || "17:00").split(":").map(Number);

      const startDateTime = new Date(`${item.startDate}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`);
      const endDateTime = new Date(`${item.endDate}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`);

      if (now >= startDateTime && now <= endDateTime) {
        ongoing = item;
        break;
      } else if (now < startDateTime) {
        if (!upcoming) {
          upcoming = item;
        }
      }
    }

    if (!ongoing && !upcoming && filtered.length > 0) {
      upcoming = filtered[filtered.length - 1];
    }

    const item = ongoing || upcoming || filtered[0] || null;
    let targetDate = new Date();

    if (item) {
      if (ongoing) {
        const [eh, em] = (ongoing.endTime || "17:00").split(":").map(Number);
        targetDate = new Date(`${ongoing.endDate}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`);
      } else {
        const [sh, sm] = (item.startTime || "12:30").split(":").map(Number);
        targetDate = new Date(`${item.startDate}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`);
      }
    }

    const remaining = calculateTimeRemaining(targetDate);

    return {
      activeDisplayItem: item,
      isCurrentlyOngoing: !!ongoing,
      timeRemaining: remaining,
    };
  }, [jadwalList, activeFilter, now]);

  if (!activeDisplayItem) return null;

  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const dStart = new Date(activeDisplayItem.startDate).toLocaleDateString("id-ID", opt);
  const dEnd = new Date(activeDisplayItem.endDate).toLocaleDateString("id-ID", opt);
  const dateLabel = activeDisplayItem.startDate === activeDisplayItem.endDate ? dStart : `${dStart} - ${dEnd}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPACT BANNER (Live Digital Countdown) - Syamsa Brand Harmony
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === "compact") {
    const formattedCountdown = `${timeRemaining.days > 0 ? `${timeRemaining.days}h ` : ""}${String(
      timeRemaining.hours
    ).padStart(2, "0")}:${String(timeRemaining.minutes).padStart(2, "0")}:${String(
      timeRemaining.seconds
    ).padStart(2, "0")}`;

    return (
      <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isCurrentlyOngoing 
              ? "bg-rose-50 border-rose-200 text-rose-600" 
              : "bg-blue-50 border-blue-100 text-[#0C81E4]"
          }`}>
            <Calendar className={`w-4 h-4 ${isCurrentlyOngoing ? "animate-pulse" : ""}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
              <span className="truncate">{activeDisplayItem.nama}</span>
              <span className="text-[10px] text-slate-400 shrink-0 font-mono">({dateLabel})</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`font-mono text-sm sm:text-base font-black tracking-wider leading-none ${
                  isCurrentlyOngoing ? "text-rose-600" : "text-[#0C4E8C]"
                }`}
              >
                -{formattedCountdown}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFullCalendar}
          className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 ${
            isCurrentlyOngoing ? "bg-rose-600 hover:bg-rose-500" : "bg-[#0C81E4] hover:bg-[#0C4E8C]"
          }`}
        >
          <span>Kalender</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FULL EXPANDED CARD (Untuk di dalam PageKalenderPendidikan) - Syamsa Brand Harmony
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 shadow-sm p-3.5 sm:p-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Filter & Event Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 text-[11px]">
              {(["Semua", "I", "II-VI"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={(e) => handleSetFilter(f, e)}
                  className={`px-2.5 py-0.5 rounded-lg transition font-medium ${
                    activeFilter === f
                      ? "bg-white text-[#0C4E8C] shadow-2xs font-bold border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {f === "Semua" ? "Semua" : `Kelas ${f}`}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Target: Kelas {activeDisplayItem.targetKelas}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate">
            {activeDisplayItem.nama}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {dateLabel} • Keluar: {activeDisplayItem.startTime || "12:30"} WIB • Kembali: Maks. {activeDisplayItem.endTime || "17:00"} WIB
          </p>
        </div>

        {/* Right: Counter Grid + SCRUD */}
        <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[42px] shadow-2xs">
              <span className="text-sm sm:text-base font-black font-mono text-[#0C4E8C] block leading-none">
                {String(timeRemaining.days).padStart(2, "0")}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mt-1 leading-none">Hari</span>
            </div>
            <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[42px] shadow-2xs">
              <span className="text-sm sm:text-base font-black font-mono text-[#0C4E8C] block leading-none">
                {String(timeRemaining.hours).padStart(2, "0")}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mt-1 leading-none">Jam</span>
            </div>
            <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[42px] shadow-2xs">
              <span className="text-sm sm:text-base font-black font-mono text-[#0C4E8C] block leading-none">
                {String(timeRemaining.minutes).padStart(2, "0")}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mt-1 leading-none">Menit</span>
            </div>
            <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[42px] shadow-2xs">
              <span className="text-sm sm:text-base font-black font-mono text-[#0C81E4] block leading-none">
                {String(timeRemaining.seconds).padStart(2, "0")}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mt-1 leading-none">Detik</span>
            </div>
          </div>

          {canScrud && onOpenScrudModal && (
            <button
              type="button"
              onClick={onOpenScrudModal}
              title="Kelola Jadwal"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center transition active:scale-95 shadow-2xs shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
