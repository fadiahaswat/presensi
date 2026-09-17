import React, { useState, useEffect, useMemo } from "react";
import { 
  AlertTriangle, 
  Megaphone, 
  Moon, 
  ChevronRight, 
  Plus, 
  Trash2, 
  X, 
  ShieldAlert,
  Calendar,
  ClipboardList,
  BookOpen,
  Stethoscope,
  DoorOpen,
  Trophy,
  Users
} from "lucide-react";
import { 
  DynamicAnnouncement, 
  MusyrifAttendanceStats, 
  loadDynamicAnnouncements, 
  saveDynamicAnnouncements 
} from "../utils/pembinaanMusyrifUtils";
import { 
  JadwalPerpulangan, 
  getSavedJadwalPerpulangan 
} from "../data/kalenderPendidikanData";
import { getTrustedDate } from "../utils/trustedTime";
import { AgendaRapatRecord } from "../types/agendaRapat";

interface DynamicDashboardBannerProps {
  myPembinaanStats?: MusyrifAttendanceStats;
  isKoorMusyrif?: boolean;
  todayFasts: Array<{ id: string; name: string; desc: string; type: string; icon: string }>;
  onOpenKalenderHijriah?: () => void;
  onOpenKalenderPendidikan?: () => void;
  onGoTo?: (page: any) => void;
  renderFastIconFn?: (iconName: string, className?: string) => React.ReactNode;
  
  // Kontekstual pengasuhan & asrama
  userRole?: string;
  myMusyrifId?: string;
  myAsrama?: string;
  todayLogDoneCount?: number; // dari 11 tugas
  isMutabaahDoneToday?: boolean;
  santriSakitCountAsrama?: number;
  santriIzinKeluarActiveCount?: number;
  activeAgendas?: AgendaRapatRecord[];
  topMusyrifStreakName?: string;
}

function calculateTimeRemaining(targetDate: Date) {
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

export function DynamicDashboardBanner({
  myPembinaanStats,
  isKoorMusyrif,
  todayFasts,
  onOpenKalenderHijriah,
  onOpenKalenderPendidikan,
  onGoTo,
  renderFastIconFn,
  userRole,
  todayLogDoneCount = 0,
  isMutabaahDoneToday = false,
  santriSakitCountAsrama = 0,
  santriIzinKeluarActiveCount = 0,
  activeAgendas = [],
  topMusyrifStreakName,
}: DynamicDashboardBannerProps) {
  const [announcements, setAnnouncements] = useState<DynamicAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"urgent" | "pengumuman" | "pembinaan" | "info">("pengumuman");

  // Kalender Pendidikan Jadwal & Live Counter
  const [jadwalList, setJadwalList] = useState<JadwalPerpulangan[]>(getSavedJadwalPerpulangan);
  const [now, setNow] = useState<Date>(getTrustedDate);

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

  useEffect(() => {
    setAnnouncements(loadDynamicAnnouncements().filter(a => a.active));
  }, []);

  // Perhitungan jadwal perpulangan santri
  const { activeJadwal, isCurrentlyOngoing, formattedCountdown, dateLabel } = useMemo(() => {
    const sorted = [...jadwalList].sort((a, b) => a.startDate.localeCompare(b.startDate));
    let ongoing: JadwalPerpulangan | null = null;
    let upcoming: JadwalPerpulangan | null = null;

    for (const item of sorted) {
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

    if (!ongoing && !upcoming && sorted.length > 0) {
      upcoming = sorted[sorted.length - 1];
    }

    const item = ongoing || upcoming || sorted[0] || null;
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
    const formatted = `${remaining.days > 0 ? `${remaining.days}h ` : ""}${String(
      remaining.hours
    ).padStart(2, "0")}:${String(remaining.minutes).padStart(2, "0")}:${String(
      remaining.seconds
    ).padStart(2, "0")}`;

    let dLabel = "";
    if (item) {
      const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      const dStart = new Date(item.startDate).toLocaleDateString("id-ID", opt);
      const dEnd = new Date(item.endDate).toLocaleDateString("id-ID", opt);
      dLabel = item.startDate === item.endDate ? dStart : `${dStart} - ${dEnd}`;
    }

    return {
      activeJadwal: item,
      isCurrentlyOngoing: !!ongoing,
      formattedCountdown: formatted,
      dateLabel: dLabel,
    };
  }, [jadwalList, now]);

  // Kumpulkan slides yang berotasi dinamis (Rutinitas Asrama & Pengasuhan SYAMSA)
  const slides: Array<{
    id: string;
    type: string;
    title: string;
    badge: string;
    desc: string;
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
    badgeColor: string;
    textColor: string;
    onClick?: () => void;
  }> = [];

  // 1. Peringatan Pembinaan (Jika musyrif masuk 25% terbawah dan kehadiran < 75%)
  if (myPembinaanStats && myPembinaanStats.needsPembinaan) {
    slides.push({
      id: "slide_pembinaan_warning",
      type: "pembinaan",
      title: "Peringatan Pembinaan",
      badge: "Kuartil Bawah",
      desc: `Kehadiran Anda ${myPembinaanStats.hadirRate}% (${myPembinaanStats.campus === "kampus_induk" ? "Kampus Induk" : "Kampus Sedayu"}). Minimal 75% sebelum akhir bulan.`,
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      bgColor: "bg-gradient-to-r from-rose-50/95 via-rose-50/70 to-white hover:from-rose-100/90 hover:to-rose-50/60",
      borderColor: "border-rose-200/90",
      badgeColor: "bg-rose-500/15 text-rose-700 border border-rose-200/70",
      textColor: "text-rose-950",
      onClick: () => onGoTo && onGoTo("subuh"),
    });
  }

  // 2. Pengumuman Dinamis Koordinator Musyrif
  announcements.forEach((ann, idx) => {
    const isUrgent = ann.category === "urgent" || ann.category === "pembinaan";
    slides.push({
      id: `slide_ann_${ann.id || idx}`,
      type: "announcement",
      title: ann.title,
      badge: ann.author || "Koor Musyrif",
      desc: ann.content,
      icon: isUrgent ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Megaphone className="w-4 h-4 text-blue-600" />,
      bgColor: isUrgent 
        ? "bg-gradient-to-r from-amber-50/95 via-amber-50/70 to-white hover:from-amber-100/90 hover:to-amber-50/60" 
        : "bg-gradient-to-r from-blue-50/95 via-indigo-50/50 to-white hover:from-blue-100/90 hover:to-blue-50/60",
      borderColor: isUrgent ? "border-amber-200/90" : "border-blue-200/90",
      badgeColor: isUrgent 
        ? "bg-amber-500/15 text-amber-800 border border-amber-300/70" 
        : "bg-blue-500/15 text-blue-800 border border-blue-300/70",
      textColor: isUrgent ? "text-amber-950" : "text-blue-950",
      onClick: () => {
        if (isKoorMusyrif) setShowManageModal(true);
      },
    });
  });

  // 3. Agenda Rapat Terjadwal Hari Ini (Jika ada undangan rapat)
  if (activeAgendas && activeAgendas.length > 0) {
    const nextAg = activeAgendas[0];
    slides.push({
      id: `slide_agenda_${nextAg.id}`,
      type: "agenda",
      title: nextAg.title,
      badge: "Rapat Hari Ini",
      desc: `${nextAg.startTime || "09:00"}–${nextAg.endTime || "11:00"} WIB • ${nextAg.locationName || "Kompleks Madrasah"}`,
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      bgColor: "bg-gradient-to-r from-indigo-50/95 via-blue-50/50 to-white hover:from-indigo-100/90 hover:to-indigo-50/60",
      borderColor: "border-indigo-200/90",
      badgeColor: "bg-indigo-500/15 text-indigo-800 border border-indigo-300/70",
      textColor: "text-indigo-950",
      onClick: () => onGoTo && onGoTo("logbook"),
    });
  }

  // 4. Pengingat Kelengkapan Logbook Harian Musyrif (Jika belum lengkap 11 tugas)
  const isMusyrifField = userRole === "musyrif" || userRole === "koordinator_gedung";
  if (isMusyrifField && todayLogDoneCount < 11) {
    const hour = now.getHours();
    const isNight = hour >= 19;
    slides.push({
      id: "slide_logbook_reminder",
      type: "logbook",
      title: isNight ? "Evaluasi Logbook" : "Logbook Harian",
      badge: `${todayLogDoneCount}/11 Terisi`,
      desc: isNight 
        ? `Baru terisi ${todayLogDoneCount}/11. Lengkapi catatan santri sebelum istirahat.`
        : `Lengkapi 11 agenda tugas pengasuhan hari ini untuk poin keaktifan.`,
      icon: <ClipboardList className="w-4 h-4 text-amber-600" />,
      bgColor: "bg-gradient-to-r from-amber-50/95 via-orange-50/40 to-white hover:from-amber-100/90 hover:to-amber-50/60",
      borderColor: "border-amber-200/90",
      badgeColor: "bg-amber-500/15 text-amber-800 border border-amber-300/70",
      textColor: "text-amber-950",
      onClick: () => onGoTo && onGoTo("logbook"),
    });
  }

  // 5. Pengingat Mutaba'ah Yaumiyah Personal
  if (isMusyrifField && !isMutabaahDoneToday) {
    slides.push({
      id: "slide_mutabaah_reminder",
      type: "mutabaah",
      title: "Mutaba'ah Yaumiyah",
      badge: "Ibadah Personal",
      desc: "Hisab Tahajjud, Dhuha, Dzikir & Tilawah Qur'an 1 Juz hari ini.",
      icon: <BookOpen className="w-4 h-4 text-teal-600" />,
      bgColor: "bg-gradient-to-r from-teal-50/95 via-emerald-50/40 to-white hover:from-teal-100/90 hover:to-teal-50/60",
      borderColor: "border-teal-200/90",
      badgeColor: "bg-teal-500/15 text-teal-800 border border-teal-300/70",
      textColor: "text-teal-950",
      onClick: () => onGoTo && onGoTo("mutabaah"),
    });
  }

  // 6. Pantauan Santri Sakit di Asrama
  if (santriSakitCountAsrama > 0) {
    slides.push({
      id: "slide_santri_sakit",
      type: "santri_sakit",
      title: "Santri Sakit Asrama",
      badge: `${santriSakitCountAsrama} Santri`,
      desc: `Ada ${santriSakitCountAsrama} santri sakit di asrama. Pantau obat & rujukan faskes.`,
      icon: <Stethoscope className="w-4 h-4 text-rose-600" />,
      bgColor: "bg-gradient-to-r from-rose-50/95 via-red-50/40 to-white hover:from-rose-100/90 hover:to-rose-50/60",
      borderColor: "border-rose-200/90",
      badgeColor: "bg-rose-500/15 text-rose-700 border border-rose-200/70",
      textColor: "text-rose-950",
      onClick: () => onGoTo && onGoTo("santri-sakit"),
    });
  }

  // 7. Monitoring Izin Keluar Santri Aktif (Akhir Pekan)
  if (santriIzinKeluarActiveCount > 0) {
    slides.push({
      id: "slide_santri_izin",
      type: "santri_izin",
      title: "Izin Keluar Santri",
      badge: `${santriIzinKeluarActiveCount} Aktif`,
      desc: `${santriIzinKeluarActiveCount} santri sedang izin keluar. Batas kembali asrama 17:00 WIB.`,
      icon: <DoorOpen className="w-4 h-4 text-sky-600" />,
      bgColor: "bg-gradient-to-r from-sky-50/95 via-blue-50/40 to-white hover:from-sky-100/90 hover:to-sky-50/60",
      borderColor: "border-sky-200/90",
      badgeColor: "bg-sky-500/15 text-sky-800 border border-sky-300/70",
      textColor: "text-sky-950",
      onClick: () => onGoTo && onGoTo("izin-santri"),
    });
  }

  // 8. Countdown Libur Perpulangan Santri
  if (activeJadwal) {
    slides.push({
      id: "slide_perpulangan_santri",
      type: "perpulangan",
      title: activeJadwal.nama,
      badge: isCurrentlyOngoing ? "Sedang Libur" : dateLabel,
      desc: isCurrentlyOngoing
        ? `Santri sedang libur perpulangan. Batas kembali maks. ${activeJadwal.endTime || "17:00"} WIB.`
        : `Menuju perpulangan: -${formattedCountdown} (Mulai ${activeJadwal.startTime || "12:30"} WIB)`,
      icon: <Calendar className={`w-4 h-4 ${isCurrentlyOngoing ? "text-rose-600 animate-pulse" : "text-[#0C81E4]"}`} />,
      bgColor: isCurrentlyOngoing 
        ? "bg-gradient-to-r from-rose-50/95 via-rose-50/60 to-white hover:from-rose-100/90 hover:to-rose-50/60" 
        : "bg-gradient-to-r from-sky-50/95 via-blue-50/40 to-white hover:from-sky-100/90 hover:to-sky-50/60",
      borderColor: isCurrentlyOngoing ? "border-rose-200/90" : "border-sky-200/90",
      badgeColor: isCurrentlyOngoing 
        ? "bg-rose-500/15 text-rose-700 border border-rose-200/70" 
        : "bg-[#0C81E4]/10 text-[#0C4E8C] border border-[#0C81E4]/20",
      textColor: isCurrentlyOngoing ? "text-rose-950" : "text-sky-950",
      onClick: onOpenKalenderPendidikan,
    });
  }

  // 9. Puasa Sunnah (jika ada hari ini)
  if (todayFasts && todayFasts.length > 0) {
    const fast = todayFasts[0];
    slides.push({
      id: "slide_fast_today",
      type: "fast",
      title: fast.name,
      badge: "Sunnah",
      desc: fast.desc,
      icon: renderFastIconFn ? renderFastIconFn(fast.icon, "w-4 h-4") : <Moon className="w-4 h-4 text-amber-600" />,
      bgColor: "bg-gradient-to-r from-amber-50/95 via-orange-50/40 to-white hover:from-amber-100/90 hover:to-amber-50/60",
      borderColor: "border-amber-200/80",
      badgeColor: "bg-amber-500/15 text-amber-800 border border-amber-300/70",
      textColor: "text-amber-950",
      onClick: onOpenKalenderHijriah,
    });
  }

  // 10. Apresiasi Musyrif Berprestasi (Leaderboard Streak)
  if (topMusyrifStreakName) {
    slides.push({
      id: "slide_leaderboard_top",
      type: "leaderboard",
      title: "Musyrif Terdisiplin",
      badge: "Top Streak",
      desc: `Apresiasi pekan ini kepada Ust. ${topMusyrifStreakName} atas keteladanan presensi shalat!`,
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
      bgColor: "bg-gradient-to-r from-amber-50/95 via-yellow-50/40 to-white hover:from-amber-100/90 hover:to-amber-50/60",
      borderColor: "border-amber-200/90",
      badgeColor: "bg-amber-500/15 text-amber-800 border border-amber-300/70",
      textColor: "text-amber-950",
      onClick: () => onGoTo && onGoTo("leaderboard"),
    });
  }

  // Autoplay slider jika ada lebih dari 1 slide
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Handle slide index bounds
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  const handleAddAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newAnn: DynamicAnnouncement = {
      id: `ann_${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      author: "Koordinator Musyrif",
      createdAt: new Date().toISOString(),
      targetCampus: "all",
      active: true,
    };
    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    saveDynamicAnnouncements(updated);
    setNewTitle("");
    setNewContent("");
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    saveDynamicAnnouncements(updated);
  };

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <>
      {/* DYNAMIC BANNER (SUPER COMPACT & SLEEK 1-BARIS, SYAMSA HARMONY) */}
      <div 
        onClick={() => {
          if (currentSlide.onClick) {
            currentSlide.onClick();
          } else if (isKoorMusyrif) {
            setShowManageModal(true);
          }
        }}
        className={`group relative flex items-center justify-between gap-2.5 sm:gap-3 border rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-[0.99] select-none ${currentSlide.bgColor} ${currentSlide.borderColor}`}
      >
        {/* Left Icon */}
        <div className="w-8 h-8 rounded-xl bg-white/95 border border-white/80 flex items-center justify-center shrink-0 shadow-2xs">
          {currentSlide.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono tracking-tight shrink-0 ${currentSlide.badgeColor}`}>
              {currentSlide.badge}
            </span>
            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
              {currentSlide.title}
            </h4>
          </div>
          <p className={`text-[11px] truncate mt-0.5 leading-tight font-medium opacity-85 ${currentSlide.textColor}`}>
            {currentSlide.desc}
          </p>
        </div>

        {/* Right side: Dots indicator & Chevron */}
        <div className="flex items-center gap-1.5 shrink-0 self-center">
          {slides.length > 1 && (
            <div className="flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded-full border border-black/5 shadow-2xs">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    currentIndex === idx 
                      ? "w-3.5 h-1 bg-[#0C81E4]" 
                      : "w-1 h-1 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* MODAL KELOLA PENGUMUMAN KOORDINATOR MUSYRIF */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kelola Pengumuman Banner</h3>
                  <p className="text-[11px] text-slate-500">Dinamis muncul di banner ringkas dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
              {/* Form Tambah */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Tambah Pengumuman Baru
                </p>
                <input
                  type="text"
                  placeholder="Judul Pengumuman (singkat)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <textarea
                  placeholder="Isi pengumuman / instruksi..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Kategori:</span>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700"
                    >
                      <option value="pengumuman">Pengumuman Biasa</option>
                      <option value="urgent">Penting / Urgent</option>
                      <option value="pembinaan">Evaluasi / Pembinaan</option>
                      <option value="info">Info Umum</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAnnouncement}
                    disabled={!newTitle.trim() || !newContent.trim()}
                    className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
                  >
                    Terbitkan
                  </button>
                </div>
              </div>

              {/* Daftar Pengumuman Aktif */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Pengumuman Aktif ({announcements.length})</p>
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Belum ada pengumuman.</p>
                ) : (
                  <div className="space-y-2">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{ann.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                              {ann.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">{ann.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus Pengumuman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
