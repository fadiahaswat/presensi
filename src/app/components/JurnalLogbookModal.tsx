import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Check, Clock, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, FileText, Sparkles, Building2, User, Eye, ShieldCheck,
  MapPin, Footprints, Navigation, RefreshCw, AlertTriangle, Play, ChevronLeft, Lock,
  Moon, BookOpen, Stethoscope, DoorClosed, Sun, Bed, GraduationCap, Award,
  Sunrise, Sunset, Star
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { checkAsramaGeofenceBrowser, GeofenceResult } from "../utils/geoUtils";
import { PatroliStepsModal } from "./PatroliStepsModal";
import { LogbookStravaStickerModal } from "./LogbookStravaStickerModal";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";

export interface LogbookTaskItem {
  done: boolean;
  completedAt?: string;
  notes?: string;
  stepsCount?: number;
  gpsVerified?: boolean;
}

export interface JurnalLogbookEntry {
  tahajjud: LogbookTaskItem;
  bakdaSubuh: LogbookTaskItem;
  cekSakit: LogbookTaskItem;
  sisirSekolah: LogbookTaskItem;
  jagaGerbang: LogbookTaskItem;
  oprakAshar: LogbookTaskItem;
  oprakMandi: LogbookTaskItem;
  sisirMaghrib: LogbookTaskItem;
  bakdaMaghrib: LogbookTaskItem;
  belajarMalam: LogbookTaskItem;
  cekTidur: LogbookTaskItem;
  generalNotes?: string;
}

export type LogbookStorage = Record<string, Record<string, JurnalLogbookEntry>>; // musyrifId -> date -> entry

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
}

interface JurnalLogbookModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  logbookData: LogbookStorage;
  onSaveLogbook: (musyrifId: string, date: string, entry: JurnalLogbookEntry) => void;
  onResetLogbook?: (musyrifId: string, date: string) => void;
  onOpenSantriSakit?: () => void;
  isPage?: boolean;
  initialMusyrifId?: string;
  initialDate?: string;
  initialTaskKey?: string;
}

export interface TaskDefinition {
  key: keyof Omit<JurnalLogbookEntry, "generalNotes">;
  number: number;
  title: string;
  shortDesc: string;
  timeWindow: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  icon: string;
  category: "Pagi" | "Siang" | "Sore" | "Malam";
  isPatrol?: boolean;
  targetSteps?: number;
}

export const LOGBOOK_TASKS: TaskDefinition[] = [
  {
    key: "tahajjud",
    number: 1,
    title: "Membangunkan Pagi & Shalat Tahajjud",
    shortDesc: "Membangunkan santri di kamar untuk Qiyamul Lail & shalat malam",
    timeWindow: "03:30 – 04:30 WIB",
    startHour: 3,
    startMinute: 30,
    endHour: 4,
    endMinute: 30,
    icon: "moon",
    category: "Pagi",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "bakdaSubuh",
    number: 2,
    title: "Pembelajaran Ba'da Shubuh / Piket Asrama",
    shortDesc: "Halaqah Al-Qur'an ba'da subuh atau kontrol piket kebersihan pagi",
    timeWindow: "05:15 – 06:00 WIB",
    startHour: 5,
    startMinute: 15,
    endHour: 6,
    endMinute: 0,
    icon: "book",
    category: "Pagi",
    isPatrol: false
  },
  {
    key: "cekSakit",
    number: 3,
    title: "Memeriksa Santri yang Sakit",
    shortDesc: "Pengecekan kamar santri yang sakit, pemberian obat / lapor pamong",
    timeWindow: "06:00 – 06:45 WIB",
    startHour: 6,
    startMinute: 0,
    endHour: 6,
    endMinute: 45,
    icon: "stethoscope",
    category: "Pagi",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "sisirSekolah",
    number: 4,
    title: "Menyisir Kamar saat Berangkat Sekolah",
    shortDesc: "Memastikan semua santri berangkat ke madrasah & kamar terkunci rapi",
    timeWindow: "06:45 – 07:15 WIB",
    startHour: 6,
    startMinute: 45,
    endHour: 7,
    endMinute: 15,
    icon: "door",
    category: "Pagi",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "jagaGerbang",
    number: 5,
    title: "Menjaga Gerbang Asrama",
    shortDesc: "Menjaga ketertiban keluar-masuk santri dan tamu asrama",
    timeWindow: "07:00 – 07:30 WIB",
    startHour: 7,
    startMinute: 0,
    endHour: 7,
    endMinute: 30,
    icon: "shield",
    category: "Pagi",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "oprakAshar",
    number: 6,
    title: "Menyisir Kamar untuk Shalat Ashar",
    shortDesc: "Mengoprak-oprak santri di kamar untuk shalat Ashar (H-30 s/d H+15 adzan)",
    timeWindow: "14:45 – 15:45 WIB",
    startHour: 14,
    startMinute: 45,
    endHour: 15,
    endMinute: 45,
    icon: "sun",
    category: "Sore",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "oprakMandi",
    number: 7,
    title: "Mengoprak-oprak Mandi Sore",
    shortDesc: "Memastikan santri tertib mandi sore, berpakaian rapi dan siap ke masjid",
    timeWindow: "16:45 – 17:30 WIB",
    startHour: 16,
    startMinute: 45,
    endHour: 17,
    endMinute: 30,
    icon: "sparkles",
    category: "Sore",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "sisirMaghrib",
    number: 8,
    title: "Menyisir Kamar Menjelang Maghrib",
    shortDesc: "Menyisir kamar santri jelang shalat Maghrib (H-30 s/d H+15 adzan)",
    timeWindow: "17:25 – 18:15 WIB",
    startHour: 17,
    startMinute: 25,
    endHour: 18,
    endMinute: 15,
    icon: "moon",
    category: "Sore",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "bakdaMaghrib",
    number: 9,
    title: "Mendampingi Pembelajaran Ba'da Maghrib",
    shortDesc: "Mendampingi tahsin, tilawah Qur'an, dan pembelajaran malam santri",
    timeWindow: "18:00 – 19:00 WIB",
    startHour: 18,
    startMinute: 0,
    endHour: 19,
    endMinute: 0,
    icon: "book",
    category: "Malam",
    isPatrol: false
  },
  {
    key: "belajarMalam",
    number: 10,
    title: "Mendampingi Belajar Malam Mandiri",
    shortDesc: "Mendampingi jam belajar malam santri dan kedisiplinan asrama",
    timeWindow: "19:00 – 20:30 WIB",
    startHour: 19,
    startMinute: 0,
    endHour: 20,
    endMinute: 30,
    icon: "graduation",
    category: "Malam",
    isPatrol: true,
    targetSteps: 150
  },
  {
    key: "cekTidur",
    number: 11,
    title: "Menyisir Kamar untuk Tidur",
    shortDesc: "Memastikan lampu kamar dimatikan, pintu terkunci, dan santri tidur tertib",
    timeWindow: "20:30 – 22:00 WIB",
    startHour: 20,
    startMinute: 30,
    endHour: 22,
    endMinute: 0,
    icon: "bed",
    category: "Malam",
    isPatrol: true,
    targetSteps: 150
  }
];

export function getTaskIconComponent(icon: string) {
  switch (icon) {
    case "moon": return <Moon className="w-4 h-4 text-emerald-600" />;
    case "book": return <BookOpen className="w-4 h-4 text-emerald-600" />;
    case "stethoscope": return <Stethoscope className="w-4 h-4 text-rose-600" />;
    case "door": return <DoorClosed className="w-4 h-4 text-slate-600" />;
    case "shield": return <ShieldCheck className="w-4 h-4 text-sky-600" />;
    case "sun": return <Sun className="w-4 h-4 text-amber-500" />;
    case "sparkles": return <Sparkles className="w-4 h-4 text-emerald-600" />;
    case "graduation": return <GraduationCap className="w-4 h-4 text-indigo-600" />;
    case "bed": return <Bed className="w-4 h-4 text-purple-600" />;
    default: return <Sparkles className="w-4 h-4 text-emerald-600" />;
  }
}

const EMPTY_LOGBOOK: JurnalLogbookEntry = {
  tahajjud: { done: false },
  bakdaSubuh: { done: false },
  cekSakit: { done: false },
  sisirSekolah: { done: false },
  jagaGerbang: { done: false },
  oprakAshar: { done: false },
  oprakMandi: { done: false },
  sisirMaghrib: { done: false },
  bakdaMaghrib: { done: false },
  belajarMalam: { done: false },
  cekTidur: { done: false }
};

export function JurnalLogbookModal({
  onClose,
  authUser,
  musyrifList,
  logbookData,
  onSaveLogbook,
  onResetLogbook,
  onOpenSantriSakit,
  isPage = false,
  initialMusyrifId,
  initialDate,
  initialTaskKey
}: JurnalLogbookModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isPamong = authUser?.role === "pamong";
  const isPamongOrKoord = isPamong || isKoordinator || isKoorGedung;

  const activeMusyrifList = useMemo(() => {
    if (isKoordinator) {
      return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    }
    if (isKoorGedung) {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    if (isPamong) {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
  }, [musyrifList, authUser, isKoordinator, isKoorGedung, isPamong]);

  // Find the musyrif record matching logged-in user (including Koordinator Gedung)
  const mySelfMusyrif = useMemo(() => {
    if (!authUser) return null;
    return musyrifList.find(m => 
      m.id === authUser.musyrifId || 
      m.id === authUser.id || 
      (m.email && authUser.email && m.email.toLowerCase() === authUser.email.toLowerCase())
    ) || null;
  }, [authUser, musyrifList]);

  const defaultMusyrifId = initialMusyrifId || mySelfMusyrif?.id || authUser?.musyrifId || authUser?.id || activeMusyrifList[0]?.id || musyrifList[0]?.id || "";

  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), "yyyy-MM-dd"));
  const [filterCategory, setFilterCategory] = useState<"all" | "Pagi" | "Siang" | "Sore" | "Malam" | "patrol">("all");
  const [searchTaskQuery, setSearchTaskQuery] = useState<string>("");
  const [expandedTask, setExpandedTask] = useState<string | null>(initialTaskKey || null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showAllScheduled, setShowAllScheduled] = useState(Boolean(initialTaskKey));

  useEffect(() => {
    if (initialMusyrifId) {
      setSelectedMusyrifId(initialMusyrifId);
    }
    if (initialDate) {
      setSelectedDate(initialDate);
    }
    if (initialTaskKey) {
      setExpandedTask(initialTaskKey);
      setShowAllScheduled(true);
      setFilterCategory("all");
      setTimeout(() => {
        const el = document.getElementById(`task-card-${initialTaskKey}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [initialMusyrifId, initialDate, initialTaskKey]);

  // Check if currently active selected musyrif is logged-in user himself
  const isEditingSelf = Boolean(
    mySelfMusyrif && selectedMusyrifId === mySelfMusyrif.id
  ) || authUser?.role === "musyrif";

  const isMusyrifUser = isEditingSelf;

  // Active Patrol Modal Tracker State
  const [activePatrolTask, setActivePatrolTask] = useState<TaskDefinition | null>(null);
  const [showStravaSticker, setShowStravaSticker] = useState<boolean>(false);

  // GPS Geofence Check State
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);
  const [gpsResult, setGpsResult] = useState<GeofenceResult | null>(null);

  const selectedMusyrif = musyrifList.find(m => m.id === selectedMusyrifId) || musyrifList[0];
  const asramaTarget = selectedMusyrif?.asrama || "Asrama 1";

  // Form State initialized from storage
  const [formState, setFormState] = useState<JurnalLogbookEntry>(() => {
    return logbookData[selectedMusyrifId]?.[selectedDate] || EMPTY_LOGBOOK;
  });

  // Keep form in sync when props/cloud data, musyrif, or date changes
  useEffect(() => {
    const existing = logbookData[selectedMusyrifId]?.[selectedDate] || EMPTY_LOGBOOK;
    setFormState(existing);
  }, [logbookData, selectedMusyrifId, selectedDate]);

  // Reset logbook entries for selected date
  const handleResetLogbook = async () => {
    const ok = await appConfirm(
      `Yakin ingin mengosongkan/reset catatan logbook tanggal ${selectedDate} untuk ${selectedMusyrif?.name}?`,
      "Reset Catatan Logbook",
      { type: "danger", confirmText: "Ya, Reset Logbook", cancelText: "Batal" }
    );
    if (ok) {
      setFormState(EMPTY_LOGBOOK);
      if (onResetLogbook) {
        onResetLogbook(selectedMusyrifId, selectedDate);
      } else {
        onSaveLogbook(selectedMusyrifId, selectedDate, EMPTY_LOGBOOK);
      }
      triggerHaptic("medium");
      appAlert("Catatan logbook berhasil di-reset.", "Reset Selesai", "info");
    }
  };

  // Keep form in sync when date or musyrif changes
  const handleDateOrMusyrifChange = (mId: string, date: string) => {
    setSelectedMusyrifId(mId);
    setSelectedDate(date);
    const existing = logbookData[mId]?.[date] || EMPTY_LOGBOOK;
    setFormState(existing);
  };

  // Perform GPS Geofence Check on load
  const checkCurrentLocation = () => {
    setIsCheckingGps(true);
    checkAsramaGeofenceBrowser(asramaTarget).then((res) => {
      setGpsResult(res);
      setIsCheckingGps(false);
    }).catch(() => {
      setIsCheckingGps(false);
    });
  };

  useEffect(() => {
    if (isMusyrifUser) {
      checkCurrentLocation();
    }
  }, [asramaTarget]);

  // Handle task toggling with strict validations (Date, Geofence, Time window)
  const toggleTask = (taskDef: TaskDefinition) => {
    if (!isMusyrifUser && !isPamongOrKoord) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isToday = selectedDate === todayStr;
    
    // 1. Must be today (for standard musyrif only)
    if (!isToday && !isPamongOrKoord) {
      appAlert("Pengisian dan pencentangan logbook hanya dapat dilakukan pada hari berjalan (tanggal hari ini). Tanggal selain hari ini telah terkunci.", "Waktu Terkunci", "warning");
      return;
    }

    // 2. Must be in Asrama (Geofencing check if GPS available, for standard musyrif only)
    if (gpsResult && !gpsResult.isInRange && !isPamongOrKoord) {
      appAlert(`Anda terdeteksi berada di luar area ${asramaTarget} (${gpsResult.distanceMeters}m dari radius valid). Pencatatan tugas logbook hanya diizinkan saat Anda berada di lingkungan asrama.`, "Di Luar Asrama", "warning");
      return;
    }

    const timeInfo = getTaskTimeStatus(taskDef);
    const cur = formState[taskDef.key] || { done: false };

    // 3. Strict Locking for standard Musyrif only:
    if (!isPamongOrKoord) {
      if (cur.done) {
        appAlert(`Tugas "${taskDef.title}" telah diverifikasi selesai pada ${cur.completedAt || "-"} WIB.`, "Tugas Selesai", "info");
        return;
      }
      if (timeInfo.status === "upcoming") {
        appAlert(`Tugas "${taskDef.title}" belum masuk waktu pelaksanaan.\nJadwal tugas: ${taskDef.timeWindow}.\n\nSilakan isi saat waktu tugas aktif tiba.`, "Belum Masuk Waktu", "info");
        return;
      }
      if (timeInfo.status === "passed") {
        appAlert(`Jadwal tugas "${taskDef.title}" (${taskDef.timeWindow}) telah BERAKHIR dan TERKUNCI secara otomatis oleh sistem.\n\nTugas yang tidak dilaksanakan pada jamnya tidak dapat dicentang susulan.`, "Jadwal Terkunci", "danger");
        return;
      }
    }

    const nextDone = !cur.done;
    const updatedEntry: JurnalLogbookEntry = {
      ...formState,
      [taskDef.key]: {
        ...cur,
        done: nextDone,
        completedAt: nextDone ? (cur.completedAt || format(new Date(), "HH:mm")) : undefined,
        gpsVerified: nextDone ? (isPamongOrKoord ? true : (gpsResult?.isInRange ?? false)) : false
      }
    };
    setFormState(updatedEntry);
    // Instant Auto-Save & Cloud Sync on toggle
    onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
  };

  // Handle note updates
  const updateTaskNotes = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, notes: string) => {
    const updatedEntry: JurnalLogbookEntry = {
      ...formState,
      [key]: {
        ...(formState[key] || { done: false }),
        notes
      }
    };
    setFormState(updatedEntry);
  };

  // Save complete logbook
  const handleSave = () => {
    onSaveLogbook(selectedMusyrifId, selectedDate, formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Complete Patrol Task with Step count
  const handlePatrolSuccess = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, steps: number) => {
    const updatedEntry: JurnalLogbookEntry = {
      ...formState,
      [key]: {
        ...(formState[key] || { done: false }),
        done: true,
        stepsCount: steps,
        completedAt: format(new Date(), "HH:mm"),
        gpsVerified: gpsResult?.isInRange ?? false
      }
    };
    setFormState(updatedEntry);
    onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
  };

  // Summary Metrics
  const completedTasks = LOGBOOK_TASKS.filter(t => formState[t.key]?.done).length;
  const totalTasks = LOGBOOK_TASKS.length;
  const scorePct = Math.round((completedTasks / totalTasks) * 100);

  // Time Window Helpers & Strict Status
  const getTaskTimeStatus = (task: TaskDefinition) => {
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const curTotal = curH * 60 + curM;
    const startTotal = task.startHour * 60 + task.startMinute;
    const endTotal = task.endHour * 60 + task.endMinute;

    const todayStr = format(now, "yyyy-MM-dd");
    const isToday = selectedDate === todayStr;
    const isPastDate = selectedDate < todayStr;
    const isFutureDate = selectedDate > todayStr;

    if (isPastDate) {
      return { 
        status: "past_date" as const, 
        isLocked: true,
        label: "Tanggal Lewat", 
        badgeClass: "bg-slate-100 text-slate-500 border border-slate-200" 
      };
    }
    if (isFutureDate) {
      return { 
        status: "future_date" as const, 
        isLocked: true,
        label: "Belum Tiba", 
        badgeClass: "bg-slate-100 text-slate-400 border border-slate-200" 
      };
    }

    if (curTotal >= startTotal && curTotal <= endTotal) {
      return { 
        status: "active" as const, 
        isLocked: false,
        label: "🟢 Waktu Tugas (Aktif)", 
        badgeClass: "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold animate-pulse" 
      };
    } else if (curTotal > endTotal) {
      return { 
        status: "passed" as const, 
        isLocked: true,
        label: "🔒 Jadwal Terlewat (Terkunci)", 
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold" 
      };
    } else {
      return { 
        status: "upcoming" as const, 
        isLocked: true,
        label: "⏳ Belum Waktunya", 
        badgeClass: "bg-amber-50 text-amber-800 border border-amber-200 font-semibold" 
      };
    }
  };

  // Filtered Tasks:
  // For today: by default show active tasks OR completed tasks. User can toggle showAllScheduled to see the full list with locked indicators.
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const filteredTasks = LOGBOOK_TASKS.filter(t => {
    // Search Filter
    if (searchTaskQuery.trim()) {
      const q = searchTaskQuery.toLowerCase();
      const match = t.title.toLowerCase().includes(q) || t.shortDesc.toLowerCase().includes(q) || t.timeWindow.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category Filter
    if (filterCategory === "patrol") {
      if (!t.isPatrol) return false;
    } else if (filterCategory !== "all" && t.category !== filterCategory) {
      return false;
    }

    // Time status filtering when isToday and not explicitly showing all
    if (isToday && !showAllScheduled && isMusyrifUser && !searchTaskQuery) {
      const taskData = formState[t.key] || { done: false };
      const timeInfo = getTaskTimeStatus(t);
      // Only show if active right now OR already marked done
      return timeInfo.status === "active" || taskData.done;
    }

    return true;
  });

  const isGpsVerified = gpsResult?.isInRange ?? false;

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${isPage ? "bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60" : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"}`}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-2xs ${isPage ? "bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"}`}>
            {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
          <div>
            <h2 className={`font-black text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>Jurnal 11 Tugas Musyrif</h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-400" : "text-slate-300"}`}>Monitoring kedisiplinan dan checklist tugas harian asrama</p>
          </div>
        </div>
        {isMusyrifUser && isGpsVerified && (
          <button type="button" onClick={handleSave} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all">
            <Check className="w-4 h-4" /> <span>Simpan Jurnal</span>
          </button>
        )}
      </div>

      {/* GPS Status Banner (Only for standard Musyrif doing self-input) */}
      {!isPamongOrKoord && (
        <div className={`p-3.5 sm:p-4 rounded-3xl border flex items-center justify-between gap-3 text-xs shadow-2xs ${isGpsVerified ? "bg-emerald-50/80 text-emerald-950 border-emerald-200/80" : "bg-rose-50/80 text-rose-950 border-rose-200/80"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${isGpsVerified ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs leading-tight truncate">
                {isCheckingGps ? "Memeriksa koordinat GPS asrama..." : !gpsResult ? `GPS Belum Diperiksa (${asramaTarget})` : isGpsVerified ? `Terverifikasi di ${asramaTarget} (Jarak: ${gpsResult.distanceMeters}m)` : `Di Luar Area ${asramaTarget} (${gpsResult.distanceMeters === 99999 ? "GPS Tidak Terdeteksi / Ditolak" : `${gpsResult.distanceMeters}m dari radius`})`}
              </p>
              <p className="text-[11px] opacity-75 truncate mt-0.5">{isGpsVerified ? "Lokasi valid. Seluruh tugas aktif dapat dicatat dan divalidasi." : "Wajib verifikasi GPS di area asrama sebelum membuka daftar tugas."}</p>
            </div>
          </div>
          <button type="button" disabled={isCheckingGps} onClick={checkCurrentLocation} className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0 ${isGpsVerified ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-rose-600 text-white hover:bg-rose-700"}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGps ? "animate-spin" : ""}`} /> <span>{isCheckingGps ? "Mengecek..." : isGpsVerified ? "Perbarui GPS" : "Cek GPS Sekarang"}</span>
          </button>
        </div>
      )}

      {/* Form & Progress Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
        {/* Date & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Tugas</label>
            <input type="date" value={selectedDate} onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{authUser?.role === "musyrif" ? "Akun Musyrif (Mandiri)" : "Pilih Personel"}</span>
              {isKoorGedung && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  {isEditingSelf ? "Mode Mengisi Pribadi (Strava Aktif)" : "Mode Pantau Musyrif"}
                </span>
              )}
            </label>
            {authUser?.role === "musyrif" ? (
              <div className="w-full text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-2xl px-3.5 py-2.5 font-bold truncate flex items-center gap-1.5 shadow-2xs"><User className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> {authUser?.name}</div>
            ) : (
              <select value={selectedMusyrifId} onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)} className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 outline-none cursor-pointer shadow-2xs">
                {activeMusyrifList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id === mySelfMusyrif?.id ? `${m.name} (Saya Sendiri - Logbook & Patroli)` : `${m.name} (${m.asrama}${m.kamar ? ` - Kmr ${m.kamar}` : ""})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Progress Box */}
        <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center font-black font-mono shadow-2xs ${scorePct === 100 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900 border border-emerald-200/80"}`}><span className="text-xs">{scorePct}%</span></div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">{scorePct === 100 ? "Seluruh Tugas Selesai ✓" : "Sedang Berjalan"}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5"><strong>{completedTasks}</strong> dari <strong>{totalTasks}</strong> agenda terlaksana</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetLogbook}
              title="Reset Isian Logbook Tanggal Ini"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-[11px] font-bold transition-all shadow-2xs active:scale-95"
            >
              Reset Logbook
            </button>
          </div>

          {/* Full-width clean progress bar */}
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${scorePct}%` }} />
          </div>

          {/* Strava Story Sticker Unlock Banner */}
          {scorePct === 100 ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                setShowStravaSticker(true);
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Buka Stiker Story Ala Strava (PNG Transparan)</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <div className="w-full py-2 px-3 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-500 text-[11px] font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Stiker Story Ala Strava terbuka setelah 11/11 tugas tuntas</span>
                </div>
                <span className="font-bold text-slate-600 shrink-0 font-mono text-[10px]">Tersisa {totalTasks - completedTasks} tugas</span>
              </div>
            </div>
          )}
        </div>

        {/* Task Search & Category Filter Pills */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="relative">
            <input
              type="text"
              value={searchTaskQuery}
              onChange={(e) => setSearchTaskQuery(e.target.value)}
              placeholder="Cari agenda tugas logbook..."
              className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl pl-3.5 pr-8 py-2.5 font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-2xs"
            />
            {searchTaskQuery && (
              <button
                type="button"
                onClick={() => setSearchTaskQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: "all", label: "Semua Kategori", icon: null },
              { id: "Pagi", label: "Pagi", icon: Sunrise },
              { id: "Siang", label: "Siang", icon: Sun },
              { id: "Sore", label: "Sore", icon: Sunset },
              { id: "Malam", label: "Malam", icon: Moon },
              { id: "patrol", label: "Patroli Langkah", icon: Footprints }
            ].map(cat => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs inline-flex items-center gap-1.5 ${
                    filterCategory === cat.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  {IconComp && <IconComp className="w-3.5 h-3.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Only block standard field musyrifs if GPS not verified; Super Admins & Pamong NEVER blocked */}
      {(!isKoordinator && !isPamong && isMusyrifUser && !isGpsVerified) ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-rose-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner"><MapPin className="w-8 h-8" /></div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Verifikasi Lokasi Asrama Diperlukan</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">Daftar tugas logbook harian terkunci. Anda harus berada di lingkungan <strong>{asramaTarget}</strong> dan mengaktifkan GPS perangkat untuk membuka lembar tugas.</p>
          </div>
          <button type="button" disabled={isCheckingGps} onClick={checkCurrentLocation} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/25 active:scale-95 transition-all inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isCheckingGps ? "animate-spin" : ""}`} /> <span>{isCheckingGps ? "Sedang Mendeteksi Lokasi..." : "Verifikasi Lokasi GPS Sekarang"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 pb-6">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-600" /> <span>Tugas yang Aktif Saat Ini ({filteredTasks.length})</span></h4>
            <button type="button" onClick={() => setShowAllScheduled(!showAllScheduled)} className="text-[11px] font-bold text-emerald-700 hover:underline">{showAllScheduled ? "Tampilkan Hanya Jam Aktif" : "Lihat Seluruh 11 Jadwal"}</button>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/70 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2.5"><Clock className="w-6 h-6" /></div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Tugas yang Sedang Aktif</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">Saat ini belum ada tugas dalam jendela waktu aktif. Kartu tugas akan otomatis muncul ketika jam pelaksanaannya tiba.</p>
              <button type="button" onClick={() => setShowAllScheduled(true)} className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-all">Lihat Jadwal Keseluruhan</button>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const taskData = formState[t.key] || { done: false };
              const isDone = taskData.done;
              const timeInfo = getTaskTimeStatus(t);
              const isLocked = !isDone && timeInfo.isLocked && !isPamongOrKoord;
              const isPassed = timeInfo.status === "passed" && !isDone;
              const isUpcoming = timeInfo.status === "upcoming" && !isDone;
              const isExpanded = expandedTask === t.key;

              return (
                <div
                  key={t.key}
                  id={`task-card-${t.key}`}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-2xs ${
                    isDone
                      ? "border-emerald-300 ring-1 ring-emerald-100 bg-emerald-50/15"
                      : timeInfo.status === "active"
                      ? "border-emerald-500 ring-2 ring-emerald-300/40 bg-white shadow-xs"
                      : isPassed
                      ? "border-slate-200 bg-slate-50/70 opacity-60"
                      : "border-slate-200/70 bg-slate-50/40 opacity-70"
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        disabled={!isPamongOrKoord && (isLocked || !isMusyrifUser || isDone)}
                        onClick={() => {
                          if (t.isPatrol && !isPamongOrKoord && isMusyrifUser && !isDone) {
                            if (isLocked) {
                              appAlert(`Jadwal tugas "${t.title}" telah lewat dan terkunci.`, "Jadwal Terkunci", "warning");
                              return;
                            }
                            setActivePatrolTask(t);
                          } else {
                            toggleTask(t);
                          }
                        }}
                        className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs " + (isPamongOrKoord ? "cursor-pointer hover:opacity-85" : "cursor-default")
                            : isPassed && !isPamongOrKoord
                            ? "border-rose-200 bg-rose-50/80 text-rose-400 cursor-not-allowed"
                            : isUpcoming && !isPamongOrKoord
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-transparent hover:text-emerald-600 active:scale-95 cursor-pointer shadow-2xs"
                        }`}
                        title={
                          isDone
                            ? (isPamongOrKoord ? "Tugas Selesai (Klik untuk ubah/batal)" : "Tugas Selesai")
                            : isPassed && !isPamongOrKoord
                            ? "Jadwal Terlewat (Terkunci)"
                            : isUpcoming && !isPamongOrKoord
                            ? "Belum Masuk Waktu"
                            : "Klik untuk Selesaikan Tugas"
                        }
                      >
                        {isDone ? (
                          <Check className="w-4 h-4" />
                        ) : isPassed && !isPamongOrKoord ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        ) : isUpcoming && !isPamongOrKoord ? (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-bold leading-tight ${
                              isDone ? "text-slate-900" : isPassed ? "text-slate-400 line-through" : "text-slate-800"
                            }`}
                          >
                            {t.number}. {t.title}
                          </span>
                          {!isDone && isPassed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md font-mono">
                              <Lock className="w-2.5 h-2.5" /> Terkunci
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.shortDesc}</p>
                        
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold font-mono text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/60 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" /> {t.timeWindow}
                          </span>

                          {/* Only show time status (e.g. Selesai Jamnya / Terlewat) if NOT done */}
                          {!isDone && (
                            <span className={`font-semibold px-2.5 py-1 rounded-lg font-mono text-[11px] border ${timeInfo.badgeClass}`}>
                              {timeInfo.label}
                            </span>
                          )}

                          {/* Clean Emerald Completed Badge */}
                          {isDone && (
                            <span className="inline-flex items-center gap-1 font-semibold font-mono text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs">
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>Selesai{taskData.completedAt ? ` • ${taskData.completedAt} WIB` : ""}</span>
                            </span>
                          )}

                          {taskData.stepsCount && (
                            <span className="font-semibold font-mono text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs">
                              <Footprints className="w-3 h-3 text-sky-600" /> {taskData.stepsCount} Langkah
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                      {t.isPatrol && isMusyrifUser && !isDone && (
                        timeInfo.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isToday && !isPamongOrKoord) {
                                appAlert("Patroli hanya dapat dilakukan pada tanggal hari ini.", "Patroli Asrama", "warning");
                                return;
                              }
                              setActivePatrolTask(t);
                            }}
                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                          >
                            <Footprints className="w-3.5 h-3.5" /> <span>Mulai Patroli ({t.targetSteps || 100} Langkah)</span>
                          </button>
                        ) : isPassed ? (
                          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 opacity-80 cursor-not-allowed">
                            <Lock className="w-3 h-3" /> <span>Jadwal Terlewat</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 opacity-80 cursor-not-allowed">
                            <Clock className="w-3 h-3" /> <span>Menunggu Jam</span>
                          </span>
                        )
                      )}

                      {t.key === "cekSakit" && onOpenSantriSakit && (
                        <button
                          type="button"
                          onClick={onOpenSantriSakit}
                          className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> <span>Data Sakit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedTask(isExpanded ? null : t.key)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border flex items-center gap-1 transition-all shadow-2xs ${
                          taskData.notes
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> <span>{taskData.notes ? "Catatan ✓" : "+ Catatan"}</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-slate-100 bg-slate-50/70 space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Catatan Pelaksanaan {t.title}:
                      </label>
                      {isMusyrifUser && !isLocked ? (
                        <input
                          type="text"
                          value={taskData.notes || ""}
                          onChange={(e) => updateTaskNotes(t.key, e.target.value)}
                          placeholder="Tuliskan catatan pelaksanaan tugas..."
                          className="w-full text-xs bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                        />
                      ) : (
                        <p className="text-xs bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-700 font-medium">
                          {taskData.notes || (
                            <em className="text-slate-400">
                              {isLocked ? "Terkunci (tidak dapat menambahkan catatan pada jadwal terlewat)" : "Tidak ada catatan dari musyrif."}
                            </em>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Catatan Tambahan Hari Ini */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-2.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-600" /> Catatan Tambahan Hari Ini</label>
            {isMusyrifUser ? (
              <textarea rows={2} value={formState.generalNotes || ""} onChange={(e) => setFormState(prev => ({ ...prev, generalNotes: e.target.value }))} placeholder="Tuliskan catatan tambahan mengenai kondisi asrama hari ini..." className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs resize-none" />
            ) : (
              <div className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-slate-700 font-medium">{formState.generalNotes || <em className="text-slate-400">Tidak ada catatan tambahan.</em>}</div>
            )}
          </div>
        </div>
      )}
      {activePatrolTask && (
        <PatroliStepsModal
          onClose={() => setActivePatrolTask(null)}
          taskTitle={activePatrolTask.title}
          taskIcon={activePatrolTask.icon}
          targetSteps={activePatrolTask.targetSteps || 150}
          initialSteps={formState[activePatrolTask.key]?.stepsCount || 0}
          onConfirmSteps={(steps) => { handlePatrolSuccess(activePatrolTask.key, steps); setActivePatrolTask(null); }}
        />
      )}
      {showStravaSticker && (
        <LogbookStravaStickerModal
          onClose={() => setShowStravaSticker(false)}
          musyrifName={selectedMusyrif?.name || authUser?.name || "Musyrif Asrama"}
          asramaName={asramaTarget}
          date={selectedDate}
          logbookEntry={formState}
        />
      )}
    </div>
  );

  if (isPage) return content;
  return (
    <motion.div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4" variants={modalBackdropVariants} initial="initial" animate="animate" exit="exit" onClick={() => { onClose(); }}>
      <motion.div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" variants={modalContentVariants} onClick={e=>e.stopPropagation()}>
        {content}
      </motion.div>
    </motion.div>
  );
}
