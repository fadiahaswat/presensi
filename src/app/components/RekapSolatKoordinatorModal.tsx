import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Users,
  Award,
  Sparkles,
  Info,
  AlertCircle,
  MapPin,
  Clock
} from "lucide-react";
import { format, subMonths, addMonths, subWeeks, addWeeks, subYears, addYears } from "date-fns";
import { id } from "date-fns/locale";
import {
  calculateRekapSolatBulanan,
  printRekapSolatKoordinatorPDF,
  RekapMusyrifRow,
  CampusRekapData,
  RekapPeriodType,
  getRekapPeriodInterval
} from "../utils/exportRekapSolatKoordinator";
import { detectPresensiAnomalies, AnomalyItem } from "../utils/anomalyService";

interface RekapSolatKoordinatorModalProps {
  isOpen?: boolean;
  isPage?: boolean;
  onClose: () => void;
  records: any[];
  musyrifList: any[];
  currentUserName?: string;
}

export const RekapSolatKoordinatorModal: React.FC<RekapSolatKoordinatorModalProps> = ({
  isOpen = true,
  isPage = false,
  onClose,
  records,
  musyrifList,
  currentUserName = "Andi Aqillah Fadia Haswat, S.A.P."
}) => {
  const [periodType, setPeriodType] = useState<RekapPeriodType>("bulan");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [semesterNumber, setSemesterNumber] = useState<1 | 2>(() => {
    const m = new Date().getMonth(); // 0-11
    return m >= 6 ? 1 : 2; // Juli-Desember = Sem 1, Jan-Juni = Sem 2
  });
  const [academicYearStart, setAcademicYearStart] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  });

  const [activeTab, setActiveTab] = useState<"sparman" | "sedayu" | "anomali">("sparman");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState<"all" | "green" | "yellow" | "red">("all");
  const [anomalyFilterKategori, setAnomalyFilterKategori] = useState<string>("all");

  // Hitung data rekap sesuai periode
  const rekapData = useMemo(() => {
    return calculateRekapSolatBulanan(records, selectedDate, musyrifList, {
      periodType,
      semesterNumber,
      academicYearStart
    });
  }, [records, selectedDate, musyrifList, periodType, semesterNumber, academicYearStart]);

  // Hitung data deteksi anomali objektif untuk periode terpilih
  const anomalyReport = useMemo(() => {
    const { start, end } = getRekapPeriodInterval(periodType, selectedDate, semesterNumber, academicYearStart);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    return detectPresensiAnomalies(records, musyrifList, {
      startDate: startStr,
      endDate: endStr
    });
  }, [records, musyrifList, periodType, selectedDate, semesterNumber, academicYearStart]);

  if (!isPage && !isOpen) return null;

  const currentCampusData: CampusRekapData =
    activeTab === "sedayu" ? rekapData.sedayu : rekapData.sparman;

  const filteredRows = currentCampusData.rows.filter((r) => {
    const matchSearch =
      (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.asrama || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterDiscipline === "all" || r.statusColor === filterDiscipline;
    return matchSearch && matchFilter;
  });

  const handlePrintBoth = () => {
    printRekapSolatKoordinatorPDF({
      sparman: rekapData.sparman,
      sedayu: rekapData.sedayu,
      periodLabel: rekapData.periodLabel,
      activeDaysCount: rekapData.activeDaysCount,
      mode: "both",
      koordinatorName: currentUserName,
    });
  };

  const handlePrintCurrent = (mode: "sparman" | "sedayu") => {
    printRekapSolatKoordinatorPDF({
      sparman: rekapData.sparman,
      sedayu: rekapData.sedayu,
      periodLabel: rekapData.periodLabel,
      activeDaysCount: rekapData.activeDaysCount,
      mode,
      koordinatorName: currentUserName,
    });
  };

  const content = (
    <div className={`bg-white w-full ${isPage ? "rounded-3xl border border-slate-200/80 shadow-xs" : "max-w-5xl rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"} flex flex-col overflow-hidden`}>
      
      {/* HEADER */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-blue-50/40">
        <div className="flex items-center gap-3">
          {isPage ? (
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all shadow-2xs active:scale-95 shrink-0"
              title="Kembali"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}
          <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                Rekap Presensi Salat Musyrif
              </h2>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono">
                Khusus Koordinator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi tertib ibadah musyrif · Ekspor cetak PDF 1 halaman Sparman & Sedayu
            </p>
          </div>
        </div>

        {!isPage && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* PERIOD TYPE SELECTOR & NAVIGASI */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Segmented Pill: Pekan / Bulan / Semester / Tahun Ajaran */}
            <div className="flex items-center p-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => setPeriodType("pekan")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  periodType === "pekan"
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pekan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("bulan")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  periodType === "bulan"
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("semester")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  periodType === "semester"
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semester
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("tahun_ajaran")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  periodType === "tahun_ajaran"
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tahun Ajaran
              </button>
            </div>

            {/* Date/Interval Navigator sesuai PeriodType */}
            {periodType === "bulan" && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedDate(prev => subMonths(prev, 1))}
                  title="Bulan sebelumnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2.5 text-center min-w-[140px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 capitalize">
                    {format(selectedDate, "MMMM yyyy", { locale: id })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
                  title="Bulan berikutnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {periodType === "pekan" && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedDate(prev => subWeeks(prev, 1))}
                  title="Pekan sebelumnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2.5 text-center min-w-[150px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    {rekapData.periodLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(prev => addWeeks(prev, 1))}
                  title="Pekan berikutnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {periodType === "semester" && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center p-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xs gap-1">
                  <button
                    type="button"
                    onClick={() => setSemesterNumber(1)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                      semesterNumber === 1
                        ? "bg-sky-100 text-sky-800 font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sem 1 (Ganjil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemesterNumber(2)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                      semesterNumber === 2
                        ? "bg-sky-100 text-sky-800 font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sem 2 (Genap)
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(prev => subYears(prev, 1))}
                    title="Tahun sebelumnya"
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2">
                    {selectedDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(prev => addYears(prev, 1))}
                    title="Tahun berikutnya"
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {periodType === "tahun_ajaran" && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAcademicYearStart(prev => prev - 1)}
                  title="Tahun Ajaran sebelumnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-3 text-center min-w-[150px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    TA {academicYearStart}/{academicYearStart + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAcademicYearStart(prev => prev + 1)}
                  title="Tahun Ajaran berikutnya"
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Info & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-sky-50/90 border border-sky-200/70 text-sky-800 text-xs rounded-xl font-medium shadow-2xs">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Hari Aktif Evaluasi: <b className="font-bold text-sky-900">{rekapData.activeDaysCount} Hari</b></span>
            </div>

            <button
              type="button"
              onClick={handlePrintBoth}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm shadow-sky-600/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF Lengkap (2 Hal)</span>
            </button>
          </div>
        </div>

        {/* CAMPUS TAB NAVIGASI - CLEAN SEGMENTED PILL */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 gap-1 w-full sm:w-auto overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("sparman")}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === "sparman"
                  ? "bg-white text-sky-700 shadow-xs ring-1 ring-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Kampus S. Parman</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap ${
                activeTab === "sparman" ? "bg-sky-50 text-sky-700 font-bold" : "bg-slate-200/70 text-slate-600"
              }`}>
                {rekapData.sparman.musyrifCount} Musyrif · {rekapData.sparman.avgPct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sedayu")}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === "sedayu"
                  ? "bg-white text-sky-700 shadow-xs ring-1 ring-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Kampus Terpadu Sedayu</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap ${
                activeTab === "sedayu" ? "bg-sky-50 text-sky-700 font-bold" : "bg-slate-200/70 text-slate-600"
              }`}>
                {rekapData.sedayu.musyrifCount} Musyrif · {rekapData.sedayu.avgPct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("anomali")}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === "anomali"
                  ? "bg-white text-amber-700 shadow-xs ring-1 ring-amber-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === "anomali" ? "text-amber-600" : "text-slate-400"} shrink-0`} />
              <span>Audit Anomali</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap ${
                anomalyReport.totalAnomali > 0
                  ? activeTab === "anomali" ? "bg-amber-100 text-amber-800" : "bg-amber-100/80 text-amber-700"
                  : "bg-emerald-100/70 text-emerald-700"
              }`}>
                {anomalyReport.totalAnomali} Temuan
              </span>
            </button>
          </div>

          {/* Cetak Tab Tertentu */}
          <button
            type="button"
            onClick={() => handlePrintCurrent(activeTab === "sedayu" ? "sedayu" : "sparman")}
            className="px-3 py-1.5 text-xs text-sky-700 bg-sky-50/80 hover:bg-sky-100 border border-sky-200/80 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all self-end sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Cetak Khusus {activeTab === "sedayu" ? "Sedayu" : "Sparman"} (1 Lembar)</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {activeTab === "anomali" ? (
            /* TAB AUDIT ANOMALI & VALIDASI PRESENSI OBJEKTIF */
            <div className="space-y-4">
              {/* HEADER RINGKASAN ANOMALI */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="p-1.5 rounded-xl bg-amber-500 text-white shadow-xs">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-base text-slate-800">
                        Audit Integritas & Deteksi Anomali Presensi
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                        Periode: {rekapData.periodLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl">
                      Sistem memindai rekaman secara otomatis untuk mendeteksi potensi duplikasi input, waktu pengisian di luar batas wajar, dan anomali jarak tanpa prasangka atau penalti otomatis.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-center shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Temuan</p>
                      <p className="text-lg font-black text-amber-700 font-mono">
                        {anomalyReport.totalAnomali}
                      </p>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Musyrif Terkait</p>
                      <p className="text-lg font-black text-slate-800 font-mono">
                        {anomalyReport.totalMusyrifTerkena}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KPI KATEGORI ANOMALI PILLS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-amber-200/60">
                  {[
                    { label: "Duplikasi Input", count: anomalyReport.byKategori["Duplikasi Input"] || 0, icon: <Users className="w-3.5 h-3.5" /> },
                    { label: "Waktu Tidak Wajar", count: anomalyReport.byKategori["Waktu Tidak Wajar"] || 0, icon: <Clock className="w-3.5 h-3.5" /> },
                    { label: "Radius Jauh", count: anomalyReport.byKategori["Radius Jauh"] || 0, icon: <MapPin className="w-3.5 h-3.5" /> },
                    { label: "Inkonsistensi Status", count: anomalyReport.byKategori["Inkonsistensi Status"] || 0, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ].map(cat => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setAnomalyFilterKategori(prev => prev === cat.label ? "all" : cat.label)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        anomalyFilterKategori === cat.label
                          ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                          : "bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-slate-500">{cat.icon}</span>
                        <span className="text-xs font-black font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700">
                          {cat.count}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 truncate">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* DAFTAR TEMUAN ANOMALI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Daftar Anomali Terdeteksi ({
                        anomalyReport.items.filter(item => {
                          const matchCat = anomalyFilterKategori === "all" || item.kategori === anomalyFilterKategori;
                          const matchSearch = !searchQuery.trim() || item.musyrifName.toLowerCase().includes(searchQuery.toLowerCase()) || item.asrama.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchCat && matchSearch;
                        }).length
                      })
                    </h4>
                  </div>
                  {anomalyFilterKategori !== "all" && (
                    <button
                      type="button"
                      onClick={() => setAnomalyFilterKategori("all")}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 underline"
                    >
                      Tampilkan Semua Kategori
                    </button>
                  )}
                </div>

                {anomalyReport.items.length === 0 ? (
                  <div className="p-8 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-emerald-900">
                      Tidak Ditemukan Anomali Presensi
                    </p>
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      Seluruh data kehadiran pada periode <b>{rekapData.periodLabel}</b> tersimpan secara wajar, konsisten, dan sesuai ketentuan waktu serta lokasi kampus.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {anomalyReport.items
                      .filter(item => {
                        const matchCat = anomalyFilterKategori === "all" || item.kategori === anomalyFilterKategori;
                        const matchSearch = !searchQuery.trim() || item.musyrifName.toLowerCase().includes(searchQuery.toLowerCase()) || item.asrama.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchCat && matchSearch;
                      })
                      .map(item => {
                        const isSevere = item.severity === "waspada";
                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border transition-all bg-white ${
                              isSevere
                                ? "border-amber-300 hover:border-amber-400 shadow-2xs"
                                : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    item.kategori === "Duplikasi Input"
                                      ? "bg-rose-100 text-rose-800"
                                      : item.kategori === "Waktu Tidak Wajar"
                                      ? "bg-amber-100 text-amber-800"
                                      : item.kategori === "Radius Jauh"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}>
                                    {item.kategori}
                                  </span>

                                  <span className="text-xs font-bold text-slate-800 font-mono">
                                    {item.date} {item.slot ? `· ${item.slot.toUpperCase()}` : ""}
                                  </span>

                                  <span className="text-[11px] text-slate-400">
                                    • {item.asrama}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-slate-900">
                                  {item.musyrifName}
                                </p>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {item.detail}
                                </p>
                              </div>

                              <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-xl text-right shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Nilai Terdeteksi</p>
                                <p className="text-xs font-black text-slate-700 font-mono">
                                  {item.nilaiTerdeteksi || "-"}
                                </p>
                              </div>
                            </div>

                            {/* REKOMENDASI PENANGANAN OBJEKTIF */}
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50/70 -mx-3.5 -mb-3.5 p-2.5 rounded-b-2xl">
                              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="font-medium text-slate-700">Rekomendasi Tindakan:</span>
                              <span className="text-slate-600">{item.rekomendasi}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB KAMPUS SPARMAN & SEDAYU REKAP TABLE */
            <>
              {/* KPI STATS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
              <p className="text-[11px] font-medium text-slate-500">Rata-rata Presensi</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {currentCampusData.avgPct}%
                </span>
                <span className="text-[10px] text-slate-400">kehadiran salat</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-emerald-800">Mumtaz / Jayyid Jiddan</p>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {currentCampusData.highCount}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Musyrif (≥75%)</span>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-amber-800">Jayyid / Maqbul</p>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-700 font-mono">
                  {currentCampusData.midCount}
                </span>
                <span className="text-[10px] text-amber-600 font-medium">Musyrif (50-74%)</span>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-rose-800">Naqish (Pembinaan)</p>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-rose-700 font-mono">
                  {currentCampusData.lowCount}
                </span>
                <span className="text-[10px] text-rose-600 font-medium">Musyrif (&lt;50%)</span>
              </div>
            </div>
          </div>

          {/* PERLU PERHATIAN ALERT (Musyrif dengan Alfa Terbanyak) */}
          {currentCampusData.rows.filter(r => r.totalAlpa > 0).length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 rounded-full bg-rose-500"></span>
                  <p className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                    Catatan Kehadiran Perlu Perhatian
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full font-mono">
                  {currentCampusData.rows.filter(r => r.totalAlpa >= 3).length > 0 ? "Prioritas Pembinaan (≥3 Alfa)" : "Tercatat Alfa"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {currentCampusData.rows
                  .filter(r => r.totalAlpa > 0)
                  .sort((a, b) => b.totalAlpa - a.totalAlpa)
                  .slice(0, 6)
                  .map(m => (
                    <div 
                      key={m.id}
                      className="bg-white rounded-xl p-2.5 border border-rose-100 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.asrama} · {m.kamar}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg shrink-0">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span className="text-xs font-bold text-rose-700 font-mono">{m.totalAlpa}</span>
                        <span className="text-[10px] text-rose-600 font-semibold">Alfa</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau asrama musyrif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white shadow-2xs placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold px-2 shrink-0">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterDiscipline("all")}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 ${
                  filterDiscipline === "all"
                    ? "bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({currentCampusData.rows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("green")}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 ${
                  filterDiscipline === "green"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-emerald-700 hover:bg-emerald-50/70"
                }`}
              >
                Hijau ({currentCampusData.highCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("yellow")}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 ${
                  filterDiscipline === "yellow"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-700 hover:bg-amber-50/70"
                }`}
              >
                Kuning ({currentCampusData.midCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("red")}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 ${
                  filterDiscipline === "red"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-rose-700 hover:bg-rose-50/70"
                }`}
              >
                Merah ({currentCampusData.lowCount})
              </button>
            </div>
          </div>

          {/* TABLE PREVIEW */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 z-10 text-[11px] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3">Nama Musyrif</th>
                    <th className="py-2.5 px-3 text-center">Asrama</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700 bg-emerald-50/50">Shubuh</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700 bg-emerald-50/50">Ashar</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700 bg-emerald-50/50">Maghrib</th>
                    <th className="py-2.5 px-2 text-center font-bold text-sky-800 bg-sky-50/60">Total Hadir</th>
                    <th className="py-2.5 px-2 text-center text-blue-700 bg-blue-50/40">Izin</th>
                    <th className="py-2.5 px-2 text-center text-amber-700 bg-amber-50/40">Sakit</th>
                    <th className="py-2.5 px-2 text-center text-rose-700 bg-rose-50/40">Alpa</th>
                    <th className="py-2.5 px-3 text-center font-bold text-teal-800 bg-teal-50/60">% Hadir</th>
                    <th className="py-2.5 px-3 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        Tidak ada data musyrif yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const isTop3 = r.rank <= 3;
                      let badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
                      if (r.statusColor === "green") badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      else if (r.statusColor === "yellow") badgeBg = "bg-amber-50 text-amber-700 border-amber-200";

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center font-mono">
                            {r.rank === 1 ? "🥇 1" : r.rank === 2 ? "🥈 2" : r.rank === 3 ? "🥉 3" : r.rank}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {r.name}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 whitespace-nowrap text-[11px]">
                            {r.asrama}
                          </td>
                          <td className="py-2 px-2 text-center text-emerald-600 font-medium font-mono">
                            {r.subuhHadir}
                          </td>
                          <td className="py-2 px-2 text-center text-emerald-600 font-medium font-mono">
                            {r.asharHadir}
                          </td>
                          <td className="py-2 px-2 text-center text-emerald-600 font-medium font-mono">
                            {r.maghribHadir}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-sky-800 bg-sky-50/40 font-mono">
                            {r.totalHadir}
                          </td>
                          <td className="py-2 px-2 text-center text-blue-600 font-mono">
                            {r.totalIzin}
                          </td>
                          <td className="py-2 px-2 text-center text-amber-600 font-mono">
                            {r.totalSakit}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-rose-600 font-mono">
                            {r.totalAlpa}
                          </td>
                          <td className="py-2 px-3 text-center font-black text-teal-800 bg-teal-50/40 font-mono text-[13px]">
                            {r.pct}%
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                              {r.statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Data diurutkan secara otomatis dari kehadiran/persentase tertinggi ke terendah. Saat mencetak ke PDF, dokumen otomatis diformat 1 lembar A4 portrait untuk Kampus S. Parman dan 1 lembar A4 portrait untuk Kampus Sedayu.
          </p>
        </>
      )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Personel Aktif: <b>{rekapData.sparman.musyrifCount + rekapData.sedayu.musyrifCount} Musyrif</b> ({rekapData.sparman.musyrifCount} Sparman · {rekapData.sedayu.musyrifCount} Sedayu)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              {isPage ? "Kembali ke Dasbor" : "Tutup"}
            </button>

            <button
              type="button"
              onClick={handlePrintBoth}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm shadow-sky-600/25 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Lengkap PDF</span>
            </button>
          </div>
        </div>

      </div>
  );

  if (isPage) {
    return <div className="w-full pb-20">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};
