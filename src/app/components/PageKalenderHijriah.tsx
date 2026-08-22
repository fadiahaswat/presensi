import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Moon,
  Sparkles,
  Star,
  Info,
  Clock,
  BookOpen,
  Ban,
  ArrowRight,
  Heart,
  CheckCircle2,
} from "lucide-react";
import {
  toHijri,
  getHijriMonthDetails,
  HIJRI_MONTHS,
  HijriDate,
} from "../utils/khgtCalendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PageKalenderHijriahProps {
  onBack: () => void;
  onSelectDate?: (date: Date) => void;
  initialDate?: Date;
}

const DAY_NAMES = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Calculation for prayer times on any date at Yogyakarta coordinates
import { calcPrayerTimes } from "../App";

function getPrayerTimesForDate(date: Date) {
  const prayers = calcPrayerTimes(date, -7.807631, 110.350905, 7);
  return prayers.filter(p => p.key !== "terbit").map(p => ({
    name: p.name,
    time: p.time
  }));
}

export const PageKalenderHijriah: React.FC<PageKalenderHijriahProps> = ({
  onBack,
  onSelectDate,
  initialDate = new Date(),
}) => {
  const currentHijri = useMemo(() => toHijri(initialDate), [initialDate]);

  const [selectedYear, setSelectedYear] = useState(currentHijri.year);
  const [selectedMonth, setSelectedMonth] = useState(currentHijri.month);
  const [selectedHijriDay, setSelectedHijriDay] = useState<number>(currentHijri.day);
  const [filterType, setFilterType] = useState<"all" | "sunnah" | "event" | "haram">("all");
  const [showKHGTInfo, setShowKHGTInfo] = useState(false);

  // Month days list
  const daysInMonth = useMemo(() => {
    return getHijriMonthDetails(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // First day of month day of week (0 = Sunday, 1 = Monday...)
  const firstDayOfWeek = useMemo(() => {
    if (daysInMonth.length === 0) return 0;
    return daysInMonth[0].gregorianDate.getDay();
  }, [daysInMonth]);

  // Selected Day Details
  const selectedDayInfo = useMemo(() => {
    return (
      daysInMonth.find((d) => d.day === selectedHijriDay) ||
      daysInMonth[0] ||
      null
    );
  }, [daysInMonth, selectedHijriDay]);

  const prayerTimes = useMemo(() => {
    if (!selectedDayInfo) return [];
    return getPrayerTimesForDate(selectedDayInfo.gregorianDate);
  }, [selectedDayInfo]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedHijriDay(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedHijriDay(1);
  };

  const handleGoToday = () => {
    const todayH = toHijri(new Date());
    setSelectedYear(todayH.year);
    setSelectedMonth(todayH.month);
    setSelectedHijriDay(todayH.day);
  };

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto pb-10">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top Row: Back button + KHGT Icon + Title + Kriteria button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs flex items-center justify-center transition-all shrink-0 active:scale-95"
              title="Kembali ke Dasbor"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-emerald-600 text-white shadow-emerald-600/25">
              <CalendarIcon className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  KHGT Majelis Tarjih
                </span>
                <span className="text-[10px] text-slate-400 font-mono">PP Muhammadiyah</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate mt-0.5">
                Kalender Hijriah Global
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowKHGTInfo(!showKHGTInfo)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all shadow-2xs shrink-0 active:scale-95 ${
              showKHGTInfo
                ? "bg-emerald-700 text-white ring-emerald-800"
                : "text-emerald-700 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100/80"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kriteria KHGT</span>
            <span className="sm:hidden">Kriteria</span>
          </button>
        </div>

        {/* Collapsible Info Banner if expanded */}
        {showKHGTInfo && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-950 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                Prinsip Kalender Hijriah Global Tunggal (KHGT) Muhammadiyah
              </p>
              <button
                type="button"
                onClick={() => setShowKHGTInfo(false)}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
            <p className="leading-relaxed text-slate-700 text-[11.5px]">
              Berdasarkan keputusan <strong>Munas Tarjih ke-32 Pekalongan</strong> dan <strong>Keputusan PP Muhammadiyah No. 120/KEP/I.0/B/2024</strong>, Muhammadiyah resmi memberlakukan KHGT mulai <strong>1 Muharram 1446 H (7 Juli 2024 M)</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-0.5">
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <p className="font-bold text-emerald-900 mb-0.5 text-[11px]">1. Kesatuan Matla&apos; Global</p>
                <p className="text-[10.5px] text-slate-600">Satu hari satu tanggal di seluruh penjuru dunia dengan parameter kesepakatan Istanbul 2016.</p>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <p className="font-bold text-emerald-900 mb-0.5 text-[11px]">2. Kepastian Kalender Jauh Hari</p>
                <p className="text-[10.5px] text-slate-600">Awal Ramadan, Syawal, & Dzulhijjah dapat dihitung pasti bertahun-tahun sebelumnya.</p>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <p className="font-bold text-emerald-900 mb-0.5 text-[11px]">3. Keselarasan Ibadah Global</p>
                <p className="text-[10.5px] text-slate-600">Puasa Arafah (9 Dzulhijjah) selaras secara global dengan hari wukuf di padang Arafah.</p>
              </div>
            </div>
          </div>
        )}

        {/* Integrated Hijri Month Navigator */}
        <div className="flex items-center justify-between bg-slate-50/80 rounded-2xl p-1.5 border border-slate-100/80">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono leading-tight">
              {HIJRI_MONTHS[selectedMonth - 1]} {selectedYear} H
            </p>
            {daysInMonth.length > 0 && (
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {format(daysInMonth[0].gregorianDate, "d MMM yyyy", { locale: id })} — {format(daysInMonth[daysInMonth.length - 1].gregorianDate, "d MMM yyyy", { locale: id })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 shadow-2xs transition-all font-mono"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-white shadow-2xs hover:bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integrated Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/80">
          {[
            { id: "all", label: "Semua" },
            { id: "sunnah", label: "Puasa Sunnah" },
            { id: "event", label: "Hari Besar" },
            { id: "haram", label: "Haram Puasa" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === f.id
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: Grid (8 cols) + Detail Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Calendar Grid Container */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
              {DAY_NAMES.map((name, idx) => (
                <div
                  key={name}
                  className={`py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl ${
                    idx === 0
                      ? "text-rose-700 bg-rose-50 border border-rose-100"
                      : idx === 5
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                      : "text-slate-600 bg-slate-50 border border-slate-100"
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar Grid Days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {/* Empty prefix cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="h-14 sm:h-16 md:h-18 rounded-xl bg-slate-50/40 border border-slate-100/60 opacity-25"
                />
              ))}

              {/* Hijri Month Days */}
              {daysInMonth.map((d) => {
                const isSelected = d.day === selectedHijriDay;
                const hasFast = !!d.fastType;
                const isSunnah = d.fastType?.type === "sunnah";
                const isWajib = d.fastType?.type === "wajib";
                const isHaram = d.fastType?.type === "haram";
                const hasEvent = d.events.length > 0;
                const isAyyamulBidh = [13, 14, 15].includes(d.day);

                const matchesFilter =
                  filterType === "all" ||
                  (filterType === "sunnah" && isSunnah) ||
                  (filterType === "event" && hasEvent) ||
                  (filterType === "haram" && isHaram);

                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => {
                      setSelectedHijriDay(d.day);
                      if (onSelectDate) onSelectDate(d.gregorianDate);
                    }}
                    className={`relative h-14 sm:h-16 md:h-18 p-1.5 sm:p-2 rounded-xl text-left transition-all flex flex-col justify-between border ${
                      isSelected
                        ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-500/30 border-emerald-600 shadow-md scale-[1.02] z-10"
                        : d.isToday
                        ? "bg-emerald-50 text-slate-900 border-emerald-400 ring-2 ring-emerald-300 shadow-2xs"
                        : isHaram
                        ? "bg-rose-50/70 border-rose-200/90 text-slate-900 hover:bg-rose-100"
                        : isSunnah || isAyyamulBidh
                        ? "bg-amber-50/70 border-amber-200/90 text-slate-900 hover:bg-amber-100"
                        : isWajib
                        ? "bg-emerald-50/70 border-emerald-200/90 text-slate-900 hover:bg-emerald-100"
                        : "bg-white border-slate-200/70 hover:border-slate-300 text-slate-800 hover:bg-slate-50"
                    } ${!matchesFilter ? "opacity-20 grayscale" : ""}`}
                  >
                    {/* Top Row: Hijri Day Number & Status Icon */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`font-black text-sm sm:text-base font-mono leading-none ${
                          isSelected ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {d.day}
                      </span>

                      {isHaram ? (
                        <Ban
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-rose-200" : "text-rose-500"
                          }`}
                        />
                      ) : isSunnah || isAyyamulBidh ? (
                        <Moon
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-amber-200" : "text-amber-600"
                          }`}
                        />
                      ) : isWajib ? (
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-emerald-200" : "text-emerald-600"
                          }`}
                        />
                      ) : hasEvent ? (
                        <Sparkles
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-purple-200" : "text-purple-600"
                          }`}
                        />
                      ) : null}
                    </div>

                    {/* Bottom Row: Gregorian Date & Pasaran */}
                    <div className="w-full">
                      <div
                        className={`text-[10px] sm:text-xs font-bold leading-tight truncate ${
                          isSelected ? "text-emerald-100" : "text-slate-700"
                        }`}
                      >
                        {format(d.gregorianDate, "d MMM", { locale: id })}
                      </div>
                      <div
                        className={`text-[9px] sm:text-[10px] font-medium leading-none mt-0.5 truncate ${
                          isSelected ? "text-emerald-200" : "text-slate-400"
                        }`}
                      >
                        {d.pasaran}
                      </div>
                    </div>

                    {/* Today Ping Dot */}
                    {d.isToday && !isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend Badges Bar */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-600 shadow-2xs" />
              <span className="text-[11px]">Hari Ini / Terpilih</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-300" />
              <span className="text-[11px]">Puasa Sunnah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-200 border border-rose-300" />
              <span className="text-[11px]">Haram Puasa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-200 border border-purple-300" />
              <span className="text-[11px]">Hari Besar Islam</span>
            </div>
          </div>
        </div>

        {/* Selected Date Detail Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {selectedDayInfo ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              {/* Selected Day Hero Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full font-mono">
                    {selectedDayInfo.dayName} {selectedDayInfo.pasaran}
                  </span>
                  {selectedDayInfo.isToday && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                      Hari Ini
                    </span>
                  )}
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {selectedDayInfo.day} {selectedDayInfo.monthName} {selectedDayInfo.year} H
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {format(selectedDayInfo.gregorianDate, "EEEE, d MMMM yyyy", { locale: id })}
                </p>
              </div>

              {/* Fasting & Event Info */}
              {selectedDayInfo.fastType ? (
                <div
                  className={`rounded-2xl p-4 border shadow-2xs ${
                    selectedDayInfo.fastType.type === "haram"
                      ? "bg-rose-50 border-rose-200 text-rose-950"
                      : selectedDayInfo.fastType.type === "wajib"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-amber-50 border-amber-200 text-amber-950"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {selectedDayInfo.fastType.type === "haram" ? (
                      <Ban className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Moon className="w-4 h-4 text-amber-600" />
                    )}
                    <p className="font-bold text-sm">
                      {selectedDayInfo.fastType.name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedDayInfo.fastType.desc}
                  </p>
                  {selectedDayInfo.fastType.reward && (
                    <div className="mt-2 text-xs font-semibold text-emerald-800 bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      ✨ Fadhilah: {selectedDayInfo.fastType.reward}
                    </div>
                  )}
                  {selectedDayInfo.fastType.dalil && (
                    <p className="mt-2 text-[10px] text-slate-500 font-mono">
                      Dalil: {selectedDayInfo.fastType.dalil}
                    </p>
                  )}
                </div>
              ) : selectedDayInfo.events.length > 0 ? (
                <div className="rounded-2xl p-4 bg-purple-50 border border-purple-200 text-purple-950 shadow-2xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <p className="font-bold text-sm">
                      {selectedDayInfo.events[0].name}
                    </p>
                  </div>
                  <p className="text-xs text-purple-900 leading-relaxed">
                    {selectedDayInfo.events[0].desc}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 text-center shadow-2xs">
                  <p className="text-xs text-slate-500">
                    Tidak ada agenda khusus puasa atau hari besar pada hari ini.
                  </p>
                </div>
              )}

              {/* Prayer Times Card */}
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Jadwal Sholat Hisab
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">WIB</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {prayerTimes.map((p) => (
                    <div
                      key={p.name}
                      className="bg-slate-50 rounded-xl py-1.5 px-1 border border-slate-100"
                    >
                      <p className="text-[9px] text-slate-500 font-medium truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] sm:text-xs font-black text-slate-800 font-mono mt-0.5">
                        {p.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary of Month Important Events */}
              <div className="space-y-2">
                <p className="font-bold text-xs text-slate-700">
                  Agenda Bulan {HIJRI_MONTHS[selectedMonth - 1]}:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {daysInMonth
                    .filter((d) => d.events.length > 0 || [13, 14, 15].includes(d.day))
                    .map((d) => {
                      const ev = d.events[0];
                      const isAB = [13, 14, 15].includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => setSelectedHijriDay(d.day)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            d.day === selectedHijriDay
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-emerald-700 w-5 shrink-0">
                              {d.day}
                            </span>
                            <span className="truncate">
                              {ev?.name ?? (isAB ? "Ayyamul Bidh" : "")}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {format(d.gregorianDate, "d MMM", { locale: id })}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
