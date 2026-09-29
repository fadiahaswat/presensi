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
  Info
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import {
  calculateRekapSolatBulanan,
  printRekapSolatKoordinatorPDF,
  RekapMusyrifRow,
  CampusRekapData
} from "../utils/exportRekapSolatKoordinator";

interface RekapSolatKoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: any[];
  musyrifList: any[];
  currentUserName?: string;
}

export const RekapSolatKoordinatorModal: React.FC<RekapSolatKoordinatorModalProps> = ({
  isOpen,
  onClose,
  records,
  musyrifList,
  currentUserName = "Andi Aqillah Fadia Haswat, S.A.P."
}) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"sparman" | "sedayu" | "overview">("sparman");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState<"all" | "green" | "yellow" | "red">("all");

  // Hitung data rekap bulanan
  const rekapData = useMemo(() => {
    return calculateRekapSolatBulanan(records, selectedMonth, musyrifList);
  }, [records, selectedMonth, musyrifList]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
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

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS BAR: PILIH BULAN & NAVIGASI */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
              title="Bulan sebelumnya"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 text-center min-w-[170px] justify-center">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-slate-800 capitalize">
                {format(selectedMonth, "MMMM yyyy", { locale: id })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
              title="Bulan berikutnya"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Info & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-sky-50/80 border border-sky-100 text-sky-800 text-xs rounded-xl font-medium">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>Hari Aktif Evaluasi: <b>{rekapData.activeDaysCount} Hari</b></span>
            </div>

            <button
              type="button"
              onClick={handlePrintBoth}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm shadow-sky-600/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF (2 Halaman: Sparman & Sedayu)</span>
            </button>
          </div>
        </div>

        {/* CAMPUS TAB NAVIGASI */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("sparman")}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "sparman"
                  ? "border-sky-600 text-sky-700 bg-sky-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Kampus S. Parman</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200/70 text-slate-700 font-mono">
                {rekapData.sparman.musyrifCount} Musyrif · {rekapData.sparman.avgPct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sedayu")}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "sedayu"
                  ? "border-sky-600 text-sky-700 bg-sky-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Kampus Terpadu Sedayu</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200/70 text-slate-700 font-mono">
                {rekapData.sedayu.musyrifCount} Musyrif · {rekapData.sedayu.avgPct}%
              </span>
            </button>
          </div>

          {/* Cetak Tab Tertentu */}
          <button
            type="button"
            onClick={() => handlePrintCurrent(activeTab === "sedayu" ? "sedayu" : "sparman")}
            className="text-xs text-sky-700 font-semibold hover:underline flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Khusus {activeTab === "sedayu" ? "Sedayu" : "Sparman"} (1 Lembar)</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
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

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau asrama musyrif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Filter Status:</span>
              <button
                type="button"
                onClick={() => setFilterDiscipline("all")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  filterDiscipline === "all"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({currentCampusData.rows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("green")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  filterDiscipline === "green"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Hijau ({currentCampusData.highCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("yellow")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  filterDiscipline === "yellow"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Kuning ({currentCampusData.midCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterDiscipline("red")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  filterDiscipline === "red"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
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
              Tutup
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
    </div>
  );
};
