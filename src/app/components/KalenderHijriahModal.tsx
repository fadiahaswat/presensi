import React, { useState, useMemo } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Moon,
  Sun,
  Sparkles,
  Star,
  Info,
  Clock,
  BookOpen,
  CheckCircle2,
  Ban,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  toHijri,
  getHijriMonthDetails,
  getHijriEvents,
  getFastInfo,
  HIJRI_MONTHS,
  HijriDate,
  fromHijriToGregorian,
  getPasaranJawa,
} from "../utils/khgtCalendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface KalenderHijriahModalProps {
  onClose: () => void;
  onSelectDate?: (date: Date) => void;
  initialDate?: Date;
}

const DAY_NAMES = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Simple calculation for prayer times on any date at specific coordinates (Yogyakarta / default)
function getPrayerTimesForDate(date: Date) {
  const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  const jd = d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  const d2 = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d2) % 360;
  const q = (280.459 + 0.98564736 * d2) % 360;
  const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.02 * Math.sin(2 * g * Math.PI / 180)) % 360;
  const e = 23.439 - 0.00000036 * d2;
  const ra = Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI / 15;
  const eq = q / 15 - ((ra + 24) % 24);
  const dec = Math.asin(Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)) * 180 / Math.PI;

  const lat = -7.807631;
  const lon = 110.350905;
  const tz = 7;
  const transit = 12 + tz - lon / 15 - eq;
  const ha = (alt: number) => {
    const cosHA = (Math.sin(alt * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(dec * Math.PI / 180)) /
      (Math.cos(lat * Math.PI / 180) * Math.cos(dec * Math.PI / 180));
    if (cosHA < -1 || cosHA > 1) return 0;
    return Math.acos(cosHA) * 180 / Math.PI / 15;
  };

  const fmt = (t: number) => {
    const hours = Math.floor(((t % 24) + 24) % 24);
    const mins = Math.floor((((t % 24) + 24) % 24 - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const asrAlt = Math.atan(1 + Math.tan(Math.abs(lat - dec) * Math.PI / 180)) * 180 / Math.PI;

  return [
    { name: "Subuh", time: fmt(transit - ha(-18) + 2 / 60) },
    { name: "Dzuhur", time: fmt(transit + 2 / 60) },
    { name: "Ashar", time: fmt(transit + ha(asrAlt) + 2 / 60) },
    { name: "Maghrib", time: fmt(transit + ha(-1) + 2 / 60) },
    { name: "Isya", time: fmt(transit + ha(-18) + 2 / 60) },
  ];
}

export const KalenderHijriahModal: React.FC<KalenderHijriahModalProps> = ({
  onClose,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl border border-slate-200/80 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div
          className="relative px-6 py-5 text-white overflow-hidden shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-15">
            <svg width="100%" height="100%">
              <pattern
                id="khgt-pattern"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#khgt-pattern)" />
            </svg>
          </div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/30 text-[11px] font-semibold font-mono text-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  KHGT Majelis Tarjih PP Muhammadiyah
                </span>
                <span className="text-[10px] bg-white/15 px-2.5 py-0.5 rounded-full text-emerald-100 font-mono">
                  Satu Hari Satu Tanggal Global
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-emerald-300" />
                Kalender Hijriah Global Tunggal
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Penanggalan hisab resmi Muhammadiyah & jadwal puasa sunnah terpadu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowKHGTInfo(!showKHGTInfo)}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition-all text-xs font-semibold flex items-center gap-1.5"
                title="Tentang KHGT Muhammadiyah"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Info KHGT</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Scrollable Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Info Banner KHGT Collapsible */}
          {showKHGTInfo && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  Prinsip Kalender Hijriah Global Tunggal (KHGT)
                </p>
                <button
                  type="button"
                  onClick={() => setShowKHGTInfo(false)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                >
                  Tutup
                </button>
              </div>
              <p className="leading-relaxed text-slate-700">
                Berdasarkan keputusan <strong>Munas Tarjih ke-32 Pekalongan</strong> dan <strong>Keputusan PP Muhammadiyah No. 120/KEP/I.0/B/2024</strong>, Muhammadiyah resmi memberlakukan KHGT mulai <strong>1 Muharram 1446 H (7 Juli 2024 M)</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li><strong>Prinsip Kesatuan Matla&apos; Global:</strong> Satu hari satu tanggal di seluruh dunia (kriteria Istanbul 2016).</li>
                <li><strong>Hisab Hakiki Imkanur Rukyat Global:</strong> Menjamin kepastian awal Ramadan, Syawal, dan Dzulhijjah bertahun-tahun ke depan tanpa menunggu sidang isbat lokal.</li>
                <li><strong>Keseragaman Hari Ibadah:</strong> Puasa Arafah (9 Dzulhijjah) bersamaan dengan jamaah haji wukuf di Arafah.</li>
              </ul>
            </div>
          )}

          {/* Month Navigator & Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
            {/* Month-Year Selector */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 shadow-xs transition-all"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center px-3 min-w-[170px]">
                <h3 className="font-extrabold text-base text-slate-900 leading-none">
                  {HIJRI_MONTHS[selectedMonth - 1]} {selectedYear} H
                </h3>
                {daysInMonth.length > 0 && (
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {format(daysInMonth[0].gregorianDate, "MMM yyyy", { locale: id })} —{" "}
                    {format(daysInMonth[daysInMonth.length - 1].gregorianDate, "MMM yyyy", { locale: id })}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 shadow-xs transition-all"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleGoToday}
                className="ml-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs active:scale-95 shadow-xs transition-all"
              >
                Hari Ini
              </button>
            </div>

            {/* Quick Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "Semua Hari" },
                { id: "sunnah", label: "Puasa Sunnah" },
                { id: "event", label: "Hari Besar" },
                { id: "haram", label: "Larangan Puasa" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterType === f.id
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid: Calendar on Left (2/3), Details on Right (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Calendar Grid Container */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs">
              {/* Day Headers (Ahad - Sabtu) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                {DAY_NAMES.map((name, idx) => (
                  <div
                    key={name}
                    className={`py-1.5 text-xs font-black uppercase tracking-wider rounded-xl ${
                      idx === 0
                        ? "text-rose-600 bg-rose-50/70"
                        : idx === 5
                        ? "text-emerald-700 bg-emerald-50/70"
                        : "text-slate-600 bg-slate-50"
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[64px] sm:min-h-[76px] rounded-2xl bg-slate-50/50 border border-slate-100/80 opacity-40"
                  />
                ))}

                {/* Actual Hijri Month Days */}
                {daysInMonth.map((d) => {
                  const isSelected = d.day === selectedHijriDay;
                  const hasFast = !!d.fastType;
                  const isSunnah = d.fastType?.type === "sunnah";
                  const isWajib = d.fastType?.type === "wajib";
                  const isHaram = d.fastType?.type === "haram";
                  const hasEvent = d.events.length > 0;
                  const isAyyamulBidh = [13, 14, 15].includes(d.day);

                  // Filter check
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
                      className={`relative min-h-[64px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-2xl text-left transition-all flex flex-col justify-between border ${
                        isSelected
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-500/25 border-emerald-600 shadow-md scale-[1.02] z-10"
                          : d.isToday
                          ? "bg-emerald-50 text-slate-900 border-emerald-400 ring-2 ring-emerald-300 shadow-xs"
                          : isHaram
                          ? "bg-rose-50/70 border-rose-200 text-slate-900 hover:bg-rose-100/70"
                          : isSunnah || isAyyamulBidh
                          ? "bg-amber-50/70 border-amber-200 text-slate-900 hover:bg-amber-100/70"
                          : isWajib
                          ? "bg-emerald-50/60 border-emerald-200 text-slate-900 hover:bg-emerald-100/60"
                          : "bg-white border-slate-100 hover:border-slate-300 text-slate-800 hover:bg-slate-50"
                      } ${!matchesFilter ? "opacity-35 grayscale" : ""}`}
                    >
                      {/* Top Row: Hijri Day & Badge Icon */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`font-black text-sm sm:text-base font-mono ${
                            isSelected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {d.day}
                        </span>

                        {/* Status Icon */}
                        {isHaram ? (
                          <Ban
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "text-rose-200" : "text-rose-500"
                            }`}
                          />
                        ) : isSunnah || isAyyamulBidh ? (
                          <Moon
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "text-amber-200" : "text-amber-500"
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
                              isSelected ? "text-purple-200" : "text-purple-500"
                            }`}
                          />
                        ) : null}
                      </div>

                      {/* Bottom Row: Gregorian Date & Pasaran */}
                      <div className="mt-1">
                        <div
                          className={`text-[9px] sm:text-[10px] font-bold leading-none ${
                            isSelected ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          {format(d.gregorianDate, "d MMM", { locale: id })}
                        </div>
                        <div
                          className={`text-[8px] sm:text-[9px] font-medium leading-tight mt-0.5 truncate ${
                            isSelected ? "text-emerald-200" : "text-slate-400"
                          }`}
                        >
                          {d.pasaran}
                        </div>
                      </div>

                      {/* Today indicator dot */}
                      {d.isToday && !isSelected && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend Badges */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span>Hari Ini / Pilihan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-300" />
                  <span>Puasa Sunnah</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-200 border border-rose-300" />
                  <span>Haram Puasa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-100 border border-purple-300" />
                  <span>Hari Besar</span>
                </div>
              </div>
            </div>

            {/* Selected Date Detail Panel */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {selectedDayInfo ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                  {/* Selected Day Card */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full font-mono">
                        {selectedDayInfo.dayName} {selectedDayInfo.pasaran}
                      </span>
                      {selectedDayInfo.isToday && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">
                      {selectedDayInfo.day} {selectedDayInfo.monthName} {selectedDayInfo.year} H
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(selectedDayInfo.gregorianDate, "EEEE, d MMMM yyyy", { locale: id })}
                    </p>
                  </div>

                  {/* Fasting & Event Status */}
                  {selectedDayInfo.fastType ? (
                    <div
                      className={`rounded-2xl p-4 border ${
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
                        <p className="font-bold text-xs">
                          {selectedDayInfo.fastType.name}
                        </p>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedDayInfo.fastType.desc}
                      </p>
                      {selectedDayInfo.fastType.reward && (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-800 bg-white/70 p-2 rounded-xl border border-emerald-100">
                          ✨ Fadhilah: {selectedDayInfo.fastType.reward}
                        </div>
                      )}
                      {selectedDayInfo.fastType.dalil && (
                        <p className="mt-1.5 text-[10px] text-slate-500 font-mono">
                          Dalil: {selectedDayInfo.fastType.dalil}
                        </p>
                      )}
                    </div>
                  ) : selectedDayInfo.events.length > 0 ? (
                    <div className="rounded-2xl p-4 bg-purple-50 border border-purple-200 text-purple-950">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <p className="font-bold text-xs">
                          {selectedDayInfo.events[0].name}
                        </p>
                      </div>
                      <p className="text-xs text-purple-900 leading-relaxed">
                        {selectedDayInfo.events[0].desc}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
                      <p className="text-xs text-slate-500">
                        Tidak ada agenda khusus puasa atau hari besar.
                      </p>
                    </div>
                  )}

                  {/* Prayer Times on this Date */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Jadwal Sholat (Hisab Muhammadiyah)
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">WIB</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {prayerTimes.map((p) => (
                        <div
                          key={p.name}
                          className="bg-slate-50 rounded-xl p-1.5 border border-slate-100"
                        >
                          <p className="text-[9px] text-slate-500 font-medium">
                            {p.name}
                          </p>
                          <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">
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
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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
                              className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
                                d.day === selectedHijriDay
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                                  : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-700 w-5">
                                  {d.day}
                                </span>
                                <span className="truncate max-w-[180px]">
                                  {ev?.name ?? (isAB ? "Ayyamul Bidh" : "")}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kriteria KHGT: Imkanur Rukyat Global (Tinggi Bulan ≥ 5°, Elongasi ≥ 8° / Konjungsi UTC).</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            Tutup Kalender
          </button>
        </div>
      </div>
    </div>
  );
};
