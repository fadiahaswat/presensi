import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { appConfirm } from "../utils/customDialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  MapPin,
  User,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import {
  JadwalPerpulangan,
  AgendaPendidikan,
  KetentuanPerpulangan,
  getSavedJadwalPerpulangan,
  saveJadwalPerpulangan,
  getSavedAgendaPendidikan,
  saveAgendaPendidikan,
  getSavedKetentuanPerpulangan,
  saveKetentuanPerpulangan,
  resetAllKalenderData,
  canUserScrudKalender,
  DEFAULT_JADWAL_PERPULANGAN,
  DEFAULT_AGENDA_PENDIDIKAN,
} from "../data/kalenderPendidikanData";
import { CountdownPerpulanganCard } from "./CountdownPerpulanganCard";

interface PageKalenderPendidikanProps {
  onBack: () => void;
  userEmail?: string | null;
  userRole?: string | null;
}

const MONTHS_TA = [
  { year: 2026, month: 6, label: "Juli 2026", semester: 1, weeksEff: 2, daysEff: 15 },
  { year: 2026, month: 7, label: "Agustus 2026", semester: 1, weeksEff: 4, daysEff: 24 },
  { year: 2026, month: 8, label: "September 2026", semester: 1, weeksEff: 4, daysEff: 26 },
  { year: 2026, month: 9, label: "Oktober 2026", semester: 1, weeksEff: 4, daysEff: 26 },
  { year: 2026, month: 10, label: "November 2026", semester: 1, weeksEff: 4, daysEff: 24 },
  { year: 2026, month: 11, label: "Desember 2026", semester: 1, weeksEff: 3, daysEff: 15 },
  { year: 2027, month: 0, label: "Januari 2027", semester: 2, weeksEff: 3, daysEff: 21 },
  { year: 2027, month: 1, label: "Februari 2027", semester: 2, weeksEff: 2, daysEff: 10 },
  { year: 2027, month: 2, label: "Maret 2027", semester: 2, weeksEff: 1, daysEff: 5 },
  { year: 2027, month: 3, label: "April 2027", semester: 2, weeksEff: 4, daysEff: 25 },
  { year: 2027, month: 4, label: "Mei 2027", semester: 2, weeksEff: 3, daysEff: 21 },
  { year: 2027, month: 5, label: "Juni 2027", semester: 2, weeksEff: 3, daysEff: 21 },
  { year: 2027, month: 6, label: "Juli 2027", semester: 2, weeksEff: 3, daysEff: 17 },
];

const DAY_NAMES_HEADER = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];

export const PageKalenderPendidikan: React.FC<PageKalenderPendidikanProps> = ({
  onBack,
  userEmail,
  userRole,
}) => {
  const canScrud = canUserScrudKalender(userEmail, userRole);

  // States
  const [activeTab, setActiveTab] = useState<"kalender" | "perpulangan" | "agenda" | "maklumat">("kalender");
  const [jadwalList, setJadwalList] = useState<JadwalPerpulangan[]>(getSavedJadwalPerpulangan);
  const [agendaList, setAgendaList] = useState<AgendaPendidikan[]>(getSavedAgendaPendidikan);
  const [ketentuan, setKetentuan] = useState<KetentuanPerpulangan>(getSavedKetentuanPerpulangan);

  // Calendar month selection
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(1); // Default Agustus 2026
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: (AgendaPendidikan | JadwalPerpulangan)[] } | null>(null);

  // Agenda list filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState<"all" | "1" | "2">("all");
  const [filterKategori, setFilterKategori] = useState<string>("all");

  // Perpulangan class filter
  const [filterKelasPerpulangan, setFilterKelasPerpulangan] = useState<"Semua" | "I" | "II-VI">("Semua");

  // Modals for SCRUD
  const [editingJadwal, setEditingJadwal] = useState<JadwalPerpulangan | null>(null);
  const [isAddingJadwal, setIsAddingJadwal] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaPendidikan | null>(null);
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync back to storage when changed
  const updateJadwalState = (newList: JadwalPerpulangan[]) => {
    setJadwalList(newList);
    saveJadwalPerpulangan(newList);
    window.dispatchEvent(new Event("muallimin_kalender_updated"));
  };

  const updateAgendaState = (newList: AgendaPendidikan[]) => {
    setAgendaList(newList);
    saveAgendaPendidikan(newList);
    window.dispatchEvent(new Event("muallimin_kalender_updated"));
  };

  const handleResetData = () => {
    resetAllKalenderData();
    setJadwalList(DEFAULT_JADWAL_PERPULANGAN);
    setAgendaList(DEFAULT_AGENDA_PENDIDIKAN);
    setShowResetConfirm(false);
    showToast("Data Kalender Pendidikan & Jadwal Perpulangan berhasil direset ke standar resmi!");
    window.dispatchEvent(new Event("muallimin_kalender_updated"));
  };

  // Calendar calculations for the active month
  const activeMonthData = MONTHS_TA[currentMonthIndex] || MONTHS_TA[0];
  const daysInActiveMonth = useMemo(() => {
    const y = activeMonthData.year;
    const m = activeMonthData.month;
    const firstDay = new Date(y, m, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(y, m + 1, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: (AgendaPendidikan | JadwalPerpulangan)[];
      colorType: "merah" | "kuning" | "hijau" | "biru" | "normal";
    }[] = [];

    // Prepend empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push({
        day: 0,
        dateStr: "",
        isCurrentMonth: false,
        events: [],
        colorType: "normal",
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      // Match agendas and perpulangan
      const matchedEvents: (AgendaPendidikan | JadwalPerpulangan)[] = [];

      // Perpulangan match
      for (const jp of jadwalList) {
        if (dateStr >= jp.startDate && dateStr <= jp.endDate) {
          matchedEvents.push(jp);
        }
      }

      // Agenda match
      for (const ag of agendaList) {
        const agEnd = ag.endDate || ag.startDate;
        if (dateStr >= ag.startDate && dateStr <= agEnd) {
          matchedEvents.push(ag);
        }
      }

      // Determine color type
      let colorType: "merah" | "kuning" | "hijau" | "biru" | "normal" = "normal";
      const dayOfWeek = new Date(y, m, d).getDay();

      if (dayOfWeek === 0) {
        colorType = "merah"; // Ahad default merah
      }

      for (const ev of matchedEvents) {
        if ("kategori" in ev) {
          if (ev.kategori === "libur") colorType = "merah";
          else if (ev.kategori === "ujian") colorType = "kuning";
          else if (ev.kategori === "perpulangan") colorType = "hijau";
          else if (ev.kategori === "akademik" || ev.kategori === "milad") {
            if (colorType === "normal") colorType = "biru";
          }
        } else {
          // Jadwal perpulangan
          if (ev.isLiburPanjang) colorType = "merah";
          else colorType = "hijau";
        }
      }

      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        events: matchedEvents,
        colorType,
      });
    }

    return days;
  }, [activeMonthData, jadwalList, agendaList]);

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return agendaList.filter((item) => {
      if (filterSemester !== "all" && item.semester.toString() !== filterSemester) {
        return false;
      }
      if (filterKategori !== "all" && item.kategori !== filterKategori) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nama.toLowerCase().includes(q);
        const matchDesc = (item.keterangan || "").toLowerCase().includes(q);
        const matchPeserta = (item.peserta || "").toLowerCase().includes(q);
        const matchDate = item.startDate.includes(q) || (item.endDate && item.endDate.includes(q));
        if (!matchName && !matchDesc && !matchPeserta && !matchDate) return false;
      }
      return true;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [agendaList, filterSemester, filterKategori, searchQuery]);

  // Filtered Perpulangan
  const filteredJadwalPerpulangan = useMemo(() => {
    return jadwalList.filter((item) => {
      if (filterKelasPerpulangan === "Semua") return true;
      if (filterKelasPerpulangan === "I") {
        return item.targetKelas === "I" || item.targetKelas === "I-VI" || item.targetKelas === "Semua";
      }
      if (filterKelasPerpulangan === "II-VI") {
        return item.targetKelas === "II-VI" || item.targetKelas === "I-VI" || item.targetKelas === "Semua";
      }
      return true;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [jadwalList, filterKelasPerpulangan]);

  // SCRUD handlers for Perpulangan
  const handleSaveJadwal = (formData: JadwalPerpulangan) => {
    if (editingJadwal) {
      const updated = jadwalList.map((j) => (j.id === editingJadwal.id ? formData : j));
      updateJadwalState(updated);
      showToast(`Jadwal "${formData.nama}" berhasil diperbarui.`);
    } else {
      const newItem: JadwalPerpulangan = {
        ...formData,
        id: `perpulangan-${Date.now()}`,
        no: jadwalList.length + 1,
      };
      updateJadwalState([...jadwalList, newItem]);
      showToast(`Jadwal perpulangan baru berhasil ditambahkan.`);
    }
    setEditingJadwal(null);
    setIsAddingJadwal(false);
  };

  const handleDeleteJadwal = async (id: string, nama: string) => {
    const ok = await appConfirm(
      `Apakah Anda yakin ingin menghapus jadwal "${nama}"?`,
      "Hapus Jadwal Perpulangan",
      { type: "danger", confirmText: "Ya, Hapus", cancelText: "Batal" }
    );
    if (!ok) return;
    const updated = jadwalList.filter((j) => j.id !== id);
    updateJadwalState(updated);
    showToast(`Jadwal "${nama}" telah dihapus.`);
  };

  // SCRUD handlers for Agenda
  const handleSaveAgenda = (formData: AgendaPendidikan) => {
    if (editingAgenda) {
      const updated = agendaList.map((a) => (a.id === editingAgenda.id ? formData : a));
      updateAgendaState(updated);
      showToast(`Agenda "${formData.nama}" berhasil diperbarui.`);
    } else {
      const newItem: AgendaPendidikan = {
        ...formData,
        id: `agenda-${Date.now()}`,
      };
      updateAgendaState([...agendaList, newItem]);
      showToast(`Agenda baru berhasil ditambahkan.`);
    }
    setEditingAgenda(null);
    setIsAddingAgenda(false);
  };

  const handleDeleteAgenda = async (id: string, nama: string) => {
    const ok = await appConfirm(
      `Apakah Anda yakin ingin menghapus agenda "${nama}"?`,
      "Hapus Agenda Madrasah",
      { type: "danger", confirmText: "Ya, Hapus", cancelText: "Batal" }
    );
    if (!ok) return;
    const updated = agendaList.filter((a) => a.id !== id);
    updateAgendaState(updated);
    showToast(`Agenda "${nama}" telah dihapus.`);
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-16 px-3 sm:px-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-emerald-300 border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-white">{notification}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition active:scale-95"
            title="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Kalender Pendidikan & Perpulangan
              </h1>
              {canScrud ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Mode SCRUD Admin Aktif
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  Mode Lihat
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Tahun Ajaran 2026/2027 • Madrasah Mu'allimin Muhammadiyah Yogyakarta
            </p>
          </div>
        </div>

        {/* Action Buttons for Admin */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canScrud && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              title="Reset ke data default resmi"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Countdown Card */}
      <CountdownPerpulanganCard
        userEmail={userEmail}
        userRole={userRole}
        variant="full"
        filterKelas={filterKelasPerpulangan}
        onFilterChange={setFilterKelasPerpulangan}
        onOpenScrudModal={() => {
          setActiveTab("perpulangan");
          setIsAddingJadwal(true);
        }}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("kalender")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === "kalender"
              ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Kalender Bulanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("perpulangan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === "perpulangan"
              ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jadwal Perpulangan ({jadwalList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agenda")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === "agenda"
              ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Agenda Madrasah ({agendaList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("maklumat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === "maklumat"
              ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Maklumat & Ketentuan</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: KALENDER BULANAN INTERAKTIF */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "kalender" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Month Selector Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {activeMonthData.label}
                  </h2>
                  <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                    Semester {activeMonthData.semester} ({activeMonthData.semester === 1 ? "Ganjil" : "Genap"})
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px]">
                    <strong>{activeMonthData.weeksEff}</strong> Minggu Efektif
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px]">
                    <strong>{activeMonthData.daysEff}</strong> Hari Efektif
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Month Dropdown Select & Prev/Next */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentMonthIndex === 0}
                  className="w-8 h-8 rounded-xl bg-white disabled:opacity-30 disabled:hover:bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-2xs transition active:scale-95"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => Math.min(MONTHS_TA.length - 1, prev + 1))}
                  disabled={currentMonthIndex === MONTHS_TA.length - 1}
                  className="w-8 h-8 rounded-xl bg-white disabled:opacity-30 disabled:hover:bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-2xs transition active:scale-95"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <select
                value={currentMonthIndex}
                onChange={(e) => setCurrentMonthIndex(Number(e.target.value))}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                {MONTHS_TA.map((m, idx) => (
                  <option key={m.label} value={idx}>
                    {m.label} (Sem. {m.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color Legend */}
          <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-700">
            <span className="font-bold text-slate-900 text-xs mr-1">Keterangan Warna:</span>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="w-3 h-3 rounded-md bg-rose-500 shadow-2xs" />
              <span className="text-[11px] font-medium">Libur Nasional / Semester / Hari Raya</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="w-3 h-3 rounded-md bg-amber-400 shadow-2xs" />
              <span className="text-[11px] font-medium">Asesmen / Ujian / TKA / ASAS</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
              <span className="text-[11px] font-medium">Libur Perpulangan Awal Bulan</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="w-3 h-3 rounded-md bg-blue-500 shadow-2xs" />
              <span className="text-[11px] font-medium">Awal Semester / Upacara / Rapor</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-center text-xs font-bold text-slate-700 py-3">
              {DAY_NAMES_HEADER.map((dayName, idx) => (
                <div key={dayName} className={idx === 0 ? "text-rose-600 font-black" : "text-slate-700"}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
              {daysInActiveMonth.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={`empty-${idx}`} className="min-h-[85px] sm:min-h-[110px] bg-slate-50/30 p-2" />
                  );
                }

                // Tile styles according to colorType
                let badgeClass = "bg-slate-100 text-slate-800";
                let dayBg = "hover:bg-slate-50/90";

                if (cell.colorType === "merah") {
                  badgeClass = "bg-rose-500 text-white font-black shadow-xs";
                  dayBg = "bg-rose-50/40 hover:bg-rose-50/80";
                } else if (cell.colorType === "kuning") {
                  badgeClass = "bg-amber-400 text-slate-900 font-black shadow-xs";
                  dayBg = "bg-amber-50/40 hover:bg-amber-50/80";
                } else if (cell.colorType === "hijau") {
                  badgeClass = "bg-emerald-500 text-white font-black shadow-xs";
                  dayBg = "bg-emerald-50/40 hover:bg-emerald-50/80";
                } else if (cell.colorType === "biru") {
                  badgeClass = "bg-blue-600 text-white font-black shadow-xs";
                  dayBg = "bg-blue-50/40 hover:bg-blue-50/80";
                }

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      if (cell.events.length > 0) {
                        setSelectedDayEvents({ dateStr: cell.dateStr, events: cell.events });
                      }
                    }}
                    className={`min-h-[85px] sm:min-h-[110px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all relative cursor-pointer ${dayBg}`}
                  >
                    {/* Date Number Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center text-xs sm:text-sm font-mono ${badgeClass}`}
                      >
                        {cell.day}
                      </span>
                      {cell.events.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse sm:hidden" />
                      )}
                    </div>

                    {/* Events snippet preview */}
                    <div className="space-y-1 overflow-hidden mt-1">
                      {cell.events.slice(0, 2).map((ev, evIdx) => (
                        <div
                          key={evIdx}
                          className="text-[9px] sm:text-[10px] font-bold leading-tight truncate px-1.5 py-0.5 rounded-md bg-white/95 border border-slate-200/80 shadow-2xs text-slate-800"
                          title={ev.nama}
                        >
                          {ev.nama}
                        </div>
                      ))}
                      {cell.events.length > 2 && (
                        <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 pl-0.5">
                          +{cell.events.length - 2} lainnya
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda Highlight for Active Month */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span>Agenda & Libur Bulan {activeMonthData.label}</span>
            </h3>

            {/* List of events occurring this month */}
            {(() => {
              const y = activeMonthData.year;
              const m = String(activeMonthData.month + 1).padStart(2, "0");
              const monthPrefix = `${y}-${m}`;

              const currentMonthAgendas = agendaList.filter(
                (a) => a.startDate.startsWith(monthPrefix) || (a.endDate && a.endDate.startsWith(monthPrefix))
              );
              const currentMonthPerpulangan = jadwalList.filter(
                (j) => j.startDate.startsWith(monthPrefix) || j.endDate.startsWith(monthPrefix)
              );

              if (currentMonthAgendas.length === 0 && currentMonthPerpulangan.length === 0) {
                return (
                  <p className="text-xs text-slate-400 italic py-2">
                    Tidak ada agenda khusus terjadwal pada bulan ini. KBM berjalan normal sesuai kalender efektif.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentMonthPerpulangan.map((jp) => (
                    <div
                      key={jp.id}
                      className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                        Libur
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-950 truncate">{jp.nama}</span>
                          <span className="text-[10px] font-semibold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded">
                            Kelas {jp.targetKelas}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 font-medium mt-0.5 leading-relaxed">
                          {new Date(jp.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{" "}
                          {jp.startDate !== jp.endDate &&
                            `– ${new Date(jp.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                          {" • "}Keluar: {jp.startTime || "12:30"} WIB, Kembali: {jp.endTime || "17:00"} WIB
                        </p>
                      </div>
                    </div>
                  ))}

                  {currentMonthAgendas.map((ag) => {
                    let badgeColor = "bg-blue-50 text-blue-900 border-blue-200/80";
                    let badgeIconBg = "bg-blue-600 text-white";
                    if (ag.kategori === "ujian") {
                      badgeColor = "bg-amber-50 text-amber-950 border-amber-200/80";
                      badgeIconBg = "bg-amber-500 text-white";
                    } else if (ag.kategori === "libur") {
                      badgeColor = "bg-rose-50 text-rose-950 border-rose-200/80";
                      badgeIconBg = "bg-rose-500 text-white";
                    }

                    return (
                      <div
                        key={ag.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 shadow-2xs ${badgeColor}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs ${badgeIconBg}`}>
                          {ag.kategori.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{ag.nama}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                            {new Date(ag.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{" "}
                            {ag.endDate &&
                              `– ${new Date(ag.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                            {ag.peserta && ` • ${ag.peserta}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: JADWAL PERPULANGAN & KETENTUAN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "perpulangan" && (
        <div className="space-y-5">
          {/* Header controls & Admin SCRUD button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Jadwal Resmi Perpulangan Santri TA 2026/2027
              </h2>
              <p className="text-xs text-slate-500">
                Maklumat Direktur No. 147/MLM/I.Min/F/2026
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Class Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterKelasPerpulangan("Semua")}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterKelasPerpulangan === "Semua" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKelasPerpulangan("I")}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterKelasPerpulangan === "I" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Kelas I
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKelasPerpulangan("II-VI")}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterKelasPerpulangan === "II-VI" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Kelas II-VI
                </button>
              </div>

              {canScrud && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingJadwal(null);
                    setIsAddingJadwal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Jadwal</span>
                </button>
              )}
            </div>
          </div>

          {/* Perpulangan Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJadwalPerpulangan.map((item, idx) => {
              const dStart = new Date(item.startDate);
              const dEnd = new Date(item.endDate);
              const isSameDate = item.startDate === item.endDate;

              const optDate: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
              const formattedDateStr = isSameDate
                ? dStart.toLocaleDateString("id-ID", optDate)
                : `${dStart.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} – ${dEnd.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between relative group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold">
                        #{item.no || idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Kelas {item.targetKelas}
                        </span>
                        {item.isLiburPanjang && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Libur Panjang
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 mb-1">
                      {item.nama}
                    </h3>
                    <p className="text-xs text-emerald-700 font-semibold mb-3 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{formattedDateStr}</span>
                    </p>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 text-slate-600 mb-3">
                      <div className="flex justify-between">
                        <span>Jam Keluar Asrama:</span>
                        <strong className="text-slate-900">{item.startTime || "12:30"} WIB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Batas Masuk Kembali:</span>
                        <strong className="text-slate-900">Maks. {item.endTime || "17:00"} WIB</strong>
                      </div>
                    </div>

                    {item.keterangan && (
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        "{item.keterangan}"
                      </p>
                    )}
                  </div>

                  {/* Admin SCRUD Action Buttons */}
                  {canScrud && (
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJadwal(item);
                          setIsAddingJadwal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition"
                        title="Edit Jadwal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJadwal(item.id, item.nama)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: SEMUA AGENDA MADRASAH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "agenda" && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari agenda, ujian, asesmen, atau perpulangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Semester & Kategori */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Semester</option>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>

              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                <option value="ujian">Ujian & Asesmen</option>
                <option value="libur">Libur Nasional / Semester</option>
                <option value="perpulangan">Perpulangan Santri</option>
                <option value="akademik">Akademik & KBM</option>
                <option value="milad">Milad & Upacara</option>
              </select>

              {canScrud && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgenda(null);
                    setIsAddingAgenda(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Agenda</span>
                </button>
              )}
            </div>
          </div>

          {/* Agenda List Table / Cards */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredAgendas.map((item) => {
                const isRange = !!item.endDate && item.endDate !== item.startDate;
                const dStart = new Date(item.startDate);
                const dEnd = item.endDate ? new Date(item.endDate) : null;

                let categoryBadge = "bg-slate-100 text-slate-700 border-slate-200";
                if (item.kategori === "ujian") categoryBadge = "bg-amber-100 text-amber-800 border-amber-300";
                else if (item.kategori === "libur") categoryBadge = "bg-rose-100 text-rose-800 border-rose-300";
                else if (item.kategori === "perpulangan") categoryBadge = "bg-emerald-100 text-emerald-800 border-emerald-300";
                else if (item.kategori === "milad") categoryBadge = "bg-purple-100 text-purple-800 border-purple-300";
                else if (item.kategori === "akademik") categoryBadge = "bg-blue-100 text-blue-800 border-blue-300";

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200 font-mono">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                          {dStart.toLocaleDateString("id-ID", { month: "short" })}
                        </span>
                        <span className="text-sm font-black text-slate-900 leading-none">
                          {dStart.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                            {item.nama}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryBadge}`}>
                            {item.kategori.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            Sem. {item.semester}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>
                            {dStart.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            {isRange && dEnd && ` s.d. ${dEnd.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
                          </span>
                          {item.peserta && (
                            <>
                              <span>•</span>
                              <span>Peserta: <strong>{item.peserta}</strong></span>
                            </>
                          )}
                          {item.penanggungJawab && (
                            <>
                              <span>•</span>
                              <span>PJ: {item.penanggungJawab}</span>
                            </>
                          )}
                        </p>

                        {item.keterangan && (
                          <p className="text-xs text-slate-600 italic">
                            {item.keterangan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Admin SCRUD Action Buttons */}
                    {canScrud && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAgenda(item);
                            setIsAddingAgenda(true);
                          }}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition"
                          title="Edit Agenda"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgenda(item.id, item.nama)}
                          className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredAgendas.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Tidak ada agenda yang cocok dengan kata kunci pencarian / filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: MAKLUMAT RESMI & KETENTUAN ASRAMA */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "maklumat" && (
        <div className="space-y-6">
          {/* Maklumat Jadwal Perpulangan */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Maklumat Jadwal & Ketentuan Libur Perpulangan
                </h3>
                <p className="text-xs text-slate-500">Nomor: 147/MLM/I.Min/F/2026</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <p>
                Diberitahukan kepada seluruh murid Madrasah Mu'allimin Muhammadiyah Yogyakarta bahwa jadwal dan ketentuan libur perpulangan murid pada Tahun Ajaran 2026/2027 diatur sebagai berikut:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ketuntasan Tahfidz</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Murid telah menuntaskan target capaian materi Tahfidz Al-Qur'an sebelum diizinkan pulang.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Standar Rambut & Kuku 4-2-2</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Murid berpenampilan rapi, telah merapikan rambut (standar 4-2-2) dan kuku sebelum keluar asrama dan sebelum masuk kembali setelah libur.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-800 font-bold">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Waktu Keluar & Masuk Asrama</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Keluar asrama diizinkan pukul <strong>12.30 WIB</strong>. Masuk kembali ke asrama paling lambat pukul <strong>17.00 WIB</strong> pada hari yang ditentukan.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Larangan Barang Terlarang</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Murid dilarang membawa ke asrama barang-barang terlarang seperti handphone (HP) dan alat elektronik lainnya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Maklumat Siswa Kelas I */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Maklumat Siswa Kelas I Tahun Ajaran 2026/2027
                </h3>
                <p className="text-xs text-slate-500">Nomor: 77/MLM/I.Min/F/2026</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2">
                <h4 className="font-bold text-purple-950">
                  Ketentuan Khusus Masa Adaptasi Siswa Baru (Juli – September 2026)
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-purple-900 text-xs sm:text-sm">
                  <li>
                    Selama <strong>tiga bulan pertama (bulan Juli hingga September 2026)</strong>, siswa Kelas I <strong>belum diperkenankan pulang ke rumah</strong>. Hal ini bertujuan untuk memberikan waktu adaptasi, pembinaan awal, dan penanaman kedisiplinan dalam kehidupan berasrama dan pendidikan madrasah.
                  </li>
                  <li>
                    Orang tua / wali santri <strong>diperbolehkan menjenguk putra-putranya</strong> pada setiap liburan awal bulan, sesuai dengan jadwal resmi yang telah ditetapkan.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DETAIL EVENT DI TANGGAL TERPILIH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Detail Agenda Tanggal</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {new Date(selectedDayEvents.dateStr).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {selectedDayEvents.events.map((ev, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{ev.nama}</span>
                  </div>
                  {"targetKelas" in ev ? (
                    <div className="text-xs text-emerald-800 space-y-0.5">
                      <p>Target: <strong>Kelas {ev.targetKelas}</strong></p>
                      <p>Keluar: {ev.startTime || "12:30"} WIB • Kembali: {ev.endTime || "17:00"} WIB</p>
                      {ev.keterangan && <p className="text-slate-500 italic mt-1">{ev.keterangan}</p>}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>Kategori: <strong className="capitalize">{ev.kategori}</strong> (Sem. {ev.semester})</p>
                      {ev.peserta && <p>Peserta: {ev.peserta}</p>}
                      {ev.penanggungJawab && <p>PJ: {ev.penanggungJawab}</p>}
                      {ev.keterangan && <p className="text-slate-500 italic mt-1">{ev.keterangan}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TAMBAH / EDIT JADWAL PERPULANGAN (SCRUD ADMIN) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddingJadwal && (
        <FormJadwalPerpulanganModal
          initialData={editingJadwal}
          onClose={() => {
            setIsAddingJadwal(false);
            setEditingJadwal(null);
          }}
          onSave={handleSaveJadwal}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TAMBAH / EDIT AGENDA MADRASAH (SCRUD ADMIN) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddingAgenda && (
        <FormAgendaPendidikanModal
          initialData={editingAgenda}
          onClose={() => {
            setIsAddingAgenda(false);
            setEditingAgenda(null);
          }}
          onSave={handleSaveAgenda}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: KONFIRMASI RESET DATA */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Reset Data Kalender?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Semua penambahan atau perubahan manual akan dihapus dan dikembalikan ke data standar resmi TA 2026/2027 Madrasah Mu'allimin.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODAL FORM SCRUD: PERPULANGAN
// ─────────────────────────────────────────────────────────────────────────────
function FormJadwalPerpulanganModal({
  initialData,
  onClose,
  onSave,
}: {
  initialData: JadwalPerpulangan | null;
  onClose: () => void;
  onSave: (data: JadwalPerpulangan) => void;
}) {
  const [nama, setNama] = useState(initialData?.nama || "Libur Perpulangan Awal Bulan");
  const [startDate, setStartDate] = useState(initialData?.startDate || "2026-08-16");
  const [endDate, setEndDate] = useState(initialData?.endDate || "2026-08-17");
  const [startTime, setStartTime] = useState(initialData?.startTime || "12:30");
  const [endTime, setEndTime] = useState(initialData?.endTime || "17:00");
  const [targetKelas, setTargetKelas] = useState<"I-VI" | "II-VI" | "I" | "Semua">(
    initialData?.targetKelas || "II-VI"
  );
  const [keterangan, setKeterangan] = useState(initialData?.keterangan || "");
  const [isLiburPanjang, setIsLiburPanjang] = useState(initialData?.isLiburPanjang || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !startDate || !endDate) return;

    onSave({
      id: initialData?.id || `perpulangan-${Date.now()}`,
      no: initialData?.no || 1,
      nama,
      startDate,
      endDate,
      startTime: startTime || "12:30",
      endTime: endTime || "17:00",
      targetKelas,
      keterangan,
      isLiburPanjang,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {initialData ? "Edit Jadwal Perpulangan" : "Tambah Jadwal Perpulangan"}
              </h3>
              <p className="text-xs text-slate-500">Panel Admin SCRUD</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Jadwal / Keterangan Libur</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Libur Perpulangan Awal Bulan"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jam Keluar Asrama (WIB)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batas Kembali Asrama (WIB)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sasaran Kelas</label>
              <select
                value={targetKelas}
                onChange={(e) => setTargetKelas(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="II-VI">Kelas II - VI</option>
                <option value="I-VI">Kelas I - VI (Semua)</option>
                <option value="I">Khusus Kelas I</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Jenis Libur</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLiburPanjang}
                  onChange={(e) => setIsLiburPanjang(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700">Tandai Libur Panjang / Semester</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan ketentuan khusus atau informasi penjemputan..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODAL FORM SCRUD: AGENDA MADRASAH
// ─────────────────────────────────────────────────────────────────────────────
function FormAgendaPendidikanModal({
  initialData,
  onClose,
  onSave,
}: {
  initialData: AgendaPendidikan | null;
  onClose: () => void;
  onSave: (data: AgendaPendidikan) => void;
}) {
  const [nama, setNama] = useState(initialData?.nama || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "2026-08-18");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [kategori, setKategori] = useState<AgendaPendidikan["kategori"]>(initialData?.kategori || "akademik");
  const [semester, setSemester] = useState<1 | 2>(initialData?.semester || 1);
  const [peserta, setPeserta] = useState(initialData?.peserta || "");
  const [penanggungJawab, setPenanggungJawab] = useState(initialData?.penanggungJawab || "");
  const [lokasi, setLokasi] = useState(initialData?.lokasi || "");
  const [keterangan, setKeterangan] = useState(initialData?.keterangan || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !startDate) return;

    onSave({
      id: initialData?.id || `agenda-${Date.now()}`,
      nama,
      startDate,
      endDate: endDate || undefined,
      kategori,
      semester,
      peserta: peserta || undefined,
      penanggungJawab: penanggungJawab || undefined,
      lokasi: lokasi || undefined,
      keterangan: keterangan || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {initialData ? "Edit Agenda Madrasah" : "Tambah Agenda Madrasah"}
              </h3>
              <p className="text-xs text-slate-500">Panel Admin SCRUD</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Agenda / Kegiatan</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Asesmen Sumatif Akhir Semester 1"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai (Opsional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="akademik">Akademik & KBM</option>
                <option value="ujian">Ujian & Asesmen</option>
                <option value="libur">Libur Nasional / Semester</option>
                <option value="perpulangan">Perpulangan Santri</option>
                <option value="milad">Milad & Upacara</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={1}>Semester 1 (Ganjil)</option>
                <option value={2}>Semester 2 (Genap)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Peserta</label>
              <input
                type="text"
                value={peserta}
                onChange={(e) => setPeserta(e.target.value)}
                placeholder="Contoh: Seluruh Murid Kelas I - VI"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Penanggung Jawab / PJ</label>
              <input
                type="text"
                value={penanggungJawab}
                onChange={(e) => setPenanggungJawab(e.target.value)}
                placeholder="Contoh: Urusan Kurikulum"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Keterangan / Rincian</label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan untuk agenda..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            >
              Simpan Agenda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
