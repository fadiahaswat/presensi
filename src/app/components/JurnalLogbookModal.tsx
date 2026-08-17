import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Check, Clock, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, FileText, Sparkles, Building2, User, Eye, ShieldCheck,
  MapPin, Footprints, Navigation, RefreshCw, AlertTriangle, Play, ChevronLeft,
  Moon, BookOpen, Stethoscope, DoorClosed, Sun, Bed, GraduationCap, Award
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { checkAsramaGeofenceBrowser, GeofenceResult } from "../utils/geoUtils";
import { PatroliStepsModal } from "./PatroliStepsModal";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

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
  onOpenSantriSakit?: () => void;
  isPage?: boolean;
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
    targetSteps: 60
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
    targetSteps: 30
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
    targetSteps: 80
  },
  {
    key: "jagaGerbang",
    number: 5,
    title: "Menjaga Gerbang Asrama",
    shortDesc: "Menjaga ketertiban keluar-masuk santri dan tamu asrama",
    timeWindow: "07:00 – 07:30 & 14:00 – 15:00 WIB",
    startHour: 7,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    icon: "shield",
    category: "Siang",
    isPatrol: true,
    targetSteps: 40
  },
  {
    key: "oprakAshar",
    number: 6,
    title: "Menyisir Kamar untuk Shalat Ashar",
    shortDesc: "Mengoprak-oprak santri di kamar untuk shalat Ashar berjamaah di masjid",
    timeWindow: "15:00 – 15:30 WIB",
    startHour: 15,
    startMinute: 0,
    endHour: 15,
    endMinute: 30,
    icon: "sun",
    category: "Sore",
    isPatrol: true,
    targetSteps: 60
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
    targetSteps: 50
  },
  {
    key: "sisirMaghrib",
    number: 8,
    title: "Menyisir Kamar Menjelang Maghrib",
    shortDesc: "Memastikan tidak ada santri tertinggal di kamar saat adzan Maghrib berkumandang",
    timeWindow: "17:30 – 18:00 WIB",
    startHour: 17,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
    icon: "moon",
    category: "Sore",
    isPatrol: true,
    targetSteps: 70
  },
  {
    key: "bakdaMaghrib",
    number: 9,
    title: "Mendampingi Pembelajaran Ba'da Maghrib",
    shortDesc: "Mendampingi tahsin, tilawah Qur'an, dan kultum malam santri",
    timeWindow: "18:20 – 19:15 WIB",
    startHour: 18,
    startMinute: 20,
    endHour: 19,
    endMinute: 15,
    icon: "book",
    category: "Malam",
    isPatrol: false
  },
  {
    key: "belajarMalam",
    number: 10,
    title: "Mendampingi Belajar Malam Mandiri",
    shortDesc: "Mendampingi jam belajar malam santri dan kedisiplinan asrama",
    timeWindow: "20:00 – 21:30 WIB",
    startHour: 20,
    startMinute: 0,
    endHour: 21,
    endMinute: 30,
    icon: "graduation",
    category: "Malam",
    isPatrol: true,
    targetSteps: 50
  },
  {
    key: "cekTidur",
    number: 11,
    title: "Menyisir Kamar & Memastikan Santri Tidur",
    shortDesc: "Memastikan lampu kamar dimatikan, pintu terkunci, dan santri tidur tertib",
    timeWindow: "22:00 – 22:30 WIB",
    startHour: 22,
    startMinute: 0,
    endHour: 22,
    endMinute: 30,
    icon: "bed",
    category: "Malam",
    isPatrol: true,
    targetSteps: 60
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
  onOpenSantriSakit,
  isPage = false
}: JurnalLogbookModalProps) {
  const isMusyrifUser = authUser?.role === "musyrif";
  const isPamongOrKoord = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";

  const defaultMusyrifId = isMusyrifUser 
    ? (authUser?.musyrifId || authUser?.id || musyrifList[0]?.id || "") 
    : (musyrifList[0]?.id || "");

  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [filterCategory, setFilterCategory] = useState<"all" | "Pagi" | "Siang" | "Sore" | "Malam">("all");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Active Patrol Modal Tracker State
  const [activePatrolTask, setActivePatrolTask] = useState<TaskDefinition | null>(null);

  // GPS Geofence Check State
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);
  const [gpsResult, setGpsResult] = useState<GeofenceResult | null>(null);

  const selectedMusyrif = musyrifList.find(m => m.id === selectedMusyrifId) || musyrifList[0];
  const asramaTarget = selectedMusyrif?.asrama || "Asrama 1";

  // Form State initialized from storage
  const [formState, setFormState] = useState<JurnalLogbookEntry>(() => {
    return logbookData[selectedMusyrifId]?.[selectedDate] || EMPTY_LOGBOOK;
  });

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

  // Handle task toggling
  const toggleTask = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">) => {
    if (!isMusyrifUser) return;
    setFormState(prev => {
      const cur = prev[key] || { done: false };
      const nextDone = !cur.done;
      return {
        ...prev,
        [key]: {
          ...cur,
          done: nextDone,
          completedAt: nextDone ? format(new Date(), "HH:mm") : undefined,
          gpsVerified: nextDone ? (gpsResult?.isInRange ?? false) : false
        }
      };
    });
  };

  // Handle note updates
  const updateTaskNotes = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, notes: string) => {
    setFormState(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { done: false }),
        notes
      }
    }));
  };

  // Save complete logbook
  const handleSave = () => {
    onSaveLogbook(selectedMusyrifId, selectedDate, formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Complete Patrol Task with Step count
  const handlePatrolSuccess = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, steps: number) => {
    setFormState(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { done: false }),
        done: true,
        stepsCount: steps,
        completedAt: format(new Date(), "HH:mm"),
        gpsVerified: gpsResult?.isInRange ?? false
      }
    }));
  };

  // Summary Metrics
  const completedTasks = LOGBOOK_TASKS.filter(t => formState[t.key]?.done).length;
  const totalTasks = LOGBOOK_TASKS.length;
  const scorePct = Math.round((completedTasks / totalTasks) * 100);

  // Time Window Helpers
  const getTaskTimeStatus = (task: TaskDefinition) => {
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const curTotal = curH * 60 + curM;
    const startTotal = task.startHour * 60 + task.startMinute;
    const endTotal = task.endHour * 60 + task.endMinute;

    const isToday = selectedDate === format(now, "yyyy-MM-dd");
    if (!isToday) return { status: "normal", label: "Tersimpan", badgeClass: "bg-slate-100 text-slate-700" };

    if (curTotal >= startTotal && curTotal <= endTotal) {
      return { status: "active", label: "Waktu Tugas", badgeClass: "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse font-bold" };
    } else if (curTotal > endTotal) {
      return { status: "passed", label: "Waktu Lewat", badgeClass: "bg-slate-100 text-slate-500" };
    } else {
      return { status: "upcoming", label: "Akan Datang", badgeClass: "bg-blue-50 text-blue-700" };
    }
  };

  const filteredTasks = LOGBOOK_TASKS.filter(t => {
    if (filterCategory === "all") return true;
    return t.category === filterCategory;
  });

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"
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
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
                Jurnal & Logbook Harian Musyrif
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                isMusyrifUser ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {isMusyrifUser ? "Pengisian Mandiri" : "Supervisi Pamong"}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-slate-300"}`}>
              11 agenda kedisiplinan asrama & sensor langkah patroli
            </p>
          </div>
        </div>

        {isMusyrifUser && (
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Jurnal</span>
          </button>
        )}
      </div>

      {/* GPS Geofence Status Banner */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        gpsResult?.isInRange
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : "bg-amber-50 text-amber-900 border-amber-200"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className={`w-4 h-4 shrink-0 ${gpsResult?.isInRange ? "text-emerald-600" : "text-amber-600"}`} />
          <div className="min-w-0">
            <p className="font-bold text-xs leading-tight truncate">
              {isCheckingGps ? (
                "Memeriksa koordinat GPS asrama..."
              ) : !gpsResult ? (
                `Validasi Geofence GPS Asrama (${asramaTarget})`
              ) : gpsResult.isInRange ? (
                `Terverifikasi di ${asramaTarget} (Jarak: ${gpsResult.distanceMeters}m)`
              ) : (
                `Di Luar Area ${asramaTarget} (${gpsResult.distanceMeters}m dari radius)`
              )}
            </p>
            <p className="text-[11px] opacity-75 truncate">
              {gpsResult?.closestCampus 
                ? `${gpsResult.closestCampus.name} · Radius Valid: ${gpsResult.closestCampus.radiusMeters}m` 
                : "Verifikasi koordinat GPS mandiri untuk pencatatan patroli"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isCheckingGps}
          onClick={checkCurrentLocation}
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGps ? "animate-spin text-emerald-600" : ""}`} />
          <span>Cek GPS</span>
        </button>
      </div>

      {/* Date & Musyrif Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Tugas
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              {isMusyrifUser ? "Akun Musyrif (Mandiri)" : "Pilih Musyrif Dipantau"}
            </label>
            {isMusyrifUser ? (
              <div className="w-full text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-2 font-bold truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{authUser?.name} ({authUser?.asrama ? `Asrama ${authUser.asrama}` : "Musyrif"})</span>
              </div>
            ) : (
              <select
                value={selectedMusyrifId}
                onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                {musyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.asrama})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Progress Banner */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold font-mono ${
              scorePct === 100 ? "bg-emerald-600 text-white" : scorePct >= 60 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}>
              <span className="text-xs">{scorePct}%</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                {scorePct === 100 ? "Seluruh Tugas Selesai" : scorePct >= 70 ? "Disiplin Sangat Baik" : "Sedang Berjalan"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                <strong>{completedTasks}</strong> dari <strong>{totalTasks}</strong> agenda terlaksana
              </p>
            </div>
          </div>

          <div className="w-24 sm:w-32 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${scorePct}%` }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: "all", label: "Semua Waktu" },
            { id: "Pagi", label: "Pagi" },
            { id: "Siang", label: "Siang" },
            { id: "Sore", label: "Sore" },
            { id: "Malam", label: "Malam" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id as any)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterCategory === tab.id
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3 pb-6">
        {filteredTasks.map((t) => {
          const taskData = formState[t.key] || { done: false };
          const isDone = taskData.done;
          const timeInfo = getTaskTimeStatus(t);
          const isExpanded = expandedTask === t.key;

          return (
            <div 
              key={t.key}
              className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                isDone 
                  ? "border-emerald-300 ring-1 ring-emerald-100" 
                  : timeInfo.status === "active"
                  ? "border-amber-300 ring-1 ring-amber-100"
                  : "border-slate-200/70"
              }`}
            >
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!isMusyrifUser}
                    onClick={() => toggleTask(t.key)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isMusyrifUser ? "active:scale-90 cursor-pointer" : "cursor-default"
                    } ${
                      isDone 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                        : "border-slate-300 bg-slate-50 text-transparent"
                    }`}
                    title={isMusyrifUser ? (isDone ? "Tandai belum" : "Tandai selesai") : "Status ceklist mandiri musyrif"}
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {t.number}. {t.title}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {t.shortDesc}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {t.timeWindow}
                      </span>

                      <span className={`font-semibold px-2.5 py-0.5 rounded-lg font-mono ${timeInfo.badgeClass}`}>
                        {timeInfo.label}
                      </span>

                      {isDone && taskData.completedAt && (
                        <span className="font-semibold font-mono text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg">
                          ✓ Selesai {taskData.completedAt} WIB
                        </span>
                      )}

                      {taskData.stepsCount && (
                        <span className="font-semibold font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Footprints className="w-3.5 h-3.5" /> {taskData.stepsCount} Langkah
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                  {t.isPatrol && isMusyrifUser && !isDone && (
                    <button
                      type="button"
                      onClick={() => setActivePatrolTask(t)}
                      className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      <span>Mulai Patroli ({t.targetSteps || 50} Langkah)</span>
                    </button>
                  )}

                  {t.key === "cekSakit" && onOpenSantriSakit && (
                    <button
                      type="button"
                      onClick={onOpenSantriSakit}
                      className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Data Sakit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedTask(isExpanded ? null : t.key)}
                    className="text-xs font-semibold text-slate-500 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{taskData.notes ? "Catatan ✓" : isMusyrifUser ? "+ Catatan" : "Catatan"}</span>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/70">
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Catatan Pelaksanaan {t.title}:
                  </label>
                  {isMusyrifUser ? (
                    <input
                      type="text"
                      value={taskData.notes || ""}
                      onChange={(e) => updateTaskNotes(t.key, e.target.value)}
                      placeholder="Misal: Santri kamar 102 dipanggil, semua rapi, 2 santri di UKS..."
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium">
                      {taskData.notes || <em className="text-slate-400">Tidak ada catatan dari musyrif.</em>}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-white rounded-3xl p-4 border border-slate-200/70 shadow-xs space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" /> Catatan Tambahan / Kejadian Khusus Hari Ini
          </label>
          {isMusyrifUser ? (
            <textarea
              rows={2}
              value={formState.generalNotes || ""}
              onChange={(e) => setFormState(prev => ({ ...prev, generalNotes: e.target.value }))}
              placeholder="Catatan umum keasramaan, kendala piket, atau pesan penting untuk Pamong..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
            />
          ) : (
            <div className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-700 font-medium leading-relaxed min-h-[50px]">
              {formState.generalNotes || <em className="text-slate-400">Tidak ada catatan tambahan untuk hari ini.</em>}
            </div>
          )}
        </div>
      </div>

      {/* Live Patrol Tracker Modal */}
      {activePatrolTask && (
        <PatroliStepsModal
          onClose={() => setActivePatrolTask(null)}
          taskTitle={activePatrolTask.title}
          taskIcon={activePatrolTask.icon}
          targetSteps={activePatrolTask.targetSteps || 60}
          initialSteps={formState[activePatrolTask.key]?.stepsCount || 0}
          onConfirmSteps={(steps) => {
            handlePatrolSuccess(activePatrolTask.key, steps);
            setActivePatrolTask(null);
          }}
        />
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
