import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Check, Clock, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, FileText, Sparkles, Building2, User, Eye, ShieldCheck,
  MapPin, Footprints, Navigation, RefreshCw, AlertTriangle, Play, ChevronLeft, Lock,
  Moon, BookOpen, Stethoscope, DoorClosed, Sun, Bed, GraduationCap, Award,
  Sunrise, Sunset, Star, Camera, Image as ImageIcon, Trash2, Maximize2, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { checkAsramaGeofenceBrowser, GeofenceResult } from "../utils/geoUtils";
import { PatroliStepsModal } from "./PatroliStepsModal";
import { LogbookStravaStickerModal } from "./LogbookStravaStickerModal";
import { compressAndWatermarkImage } from "../utils/imageCompressor";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";
import { AgendaRapatRecord } from "../types/agendaRapat";

export interface LogbookTaskItem {
  done: boolean;
  completedAt?: string;
  notes?: string;
  stepsCount?: number;
  gpsVerified?: boolean;
  subChoice?: "tahfizh" | "piket";
  photoUrl?: string;
  photoTakenAt?: string;
  photoSource?: "camera" | "preset" | "gallery";
  photoWatermark?: string;
  photoUserAvatar?: string;
}

export interface JurnalLogbookEntry {
  tahajjud: LogbookTaskItem;
  bakdaSubuh: LogbookTaskItem;
  cekSakit: LogbookTaskItem;
  sisirSekolah?: LogbookTaskItem;
  jagaGerbang?: LogbookTaskItem;
  oprakJumat?: LogbookTaskItem;
  kerjaBakti?: LogbookTaskItem;
  oprakAshar: LogbookTaskItem;
  oprakMandi: LogbookTaskItem;
  sisirMaghrib: LogbookTaskItem;
  bakdaMaghrib: LogbookTaskItem;
  belajarMalam: LogbookTaskItem;
  cekTidur: LogbookTaskItem;
  generalNotes?: string;
  [key: string]: any;
}

export type LogbookStorage = Record<string, Record<string, JurnalLogbookEntry>>; // musyrifId -> date -> entry

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  role?: string;
  kamar?: string;
  email?: string;
}

interface JurnalLogbookModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  logbookData: LogbookStorage;
  onSaveLogbook: (musyrifId: string, date: string, entry: JurnalLogbookEntry) => void;
  onResetLogbook?: (musyrifId: string, date: string) => void;
  onOpenSantriSakit?: () => void;
  onOpenAgendaRapat?: () => void;
  agendaList?: AgendaRapatRecord[];
  isPage?: boolean;
  initialMusyrifId?: string;
  initialDate?: string;
  initialTaskKey?: string;
}

export interface TaskDefinition {
  key: string;
  number: number;
  title: string;
  shortDesc: string;
  timeWindow: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  icon: string;
  category: "Pagi" | "Siang" | "Sore" | "Malam" | "Agenda Rapat";
  isPatrol?: boolean;
  targetSteps?: number;
  allowSubChoice?: boolean;
  photoRequirement?: "mandatory" | "optional";
  isDynamicAgenda?: boolean;
  agendaVenue?: { lat?: number; lng?: number; radius?: number; name?: string };
}

/**
 * Mendapatkan daftar tugas logbook dinamis berdasarkan hari dalam sepekan (Senin - Ahad).
 * - Senin - Sabtu Subuh: Pilihan Tahfizh (standar) vs Piket Asrama (wajib patroli 200 langkah).
 * - Senin & Selasa Maghrib: Pembelajaran Bahasa (wajib patroli 200 langkah).
 * - Rabu Maghrib: Pengecekan Catatan Santri (standar).
 * - Kamis Maghrib: Tahsin & Ba'da Isya: Baca Surat Al-Kahfi (wajib patroli 200 langkah).
 * - Jumat 11:00: Mengoprak-oprak Shalat Jum'at (wajib patroli 200 langkah) & Maghrib Tahsin.
 * - Ahad Subuh: Mendampingi Muhadatsah (wajib patroli 200 langkah).
 * - Ahad 06:00 - 07:15: Mendampingi Kerja Bakti Asrama (wajib patroli 200 langkah).
 */
export function getLogbookTasksForDate(
  dateStr?: string,
  subChoiceMap?: Record<string, "tahfizh" | "piket">,
  musyrifId?: string,
  agendaList?: AgendaRapatRecord[]
): TaskDefinition[] {
  let dayOfWeek = 1; // Default Senin
  if (dateStr) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    }
  } else {
    dayOfWeek = new Date().getDay();
  }

  const isAhad = dayOfWeek === 0;
  const isSeninOrSelasa = dayOfWeek === 1 || dayOfWeek === 2;
  const isRabu = dayOfWeek === 3;
  const isKamis = dayOfWeek === 4;
  const isJumat = dayOfWeek === 5;

  const currentSubChoice = subChoiceMap?.["bakdaSubuh"] || "tahfizh";
  const isSubuhPiket = currentSubChoice === "piket";

  const tasks: TaskDefinition[] = [];
  let num = 1;

  // 1. Membangunkan Pagi & Shalat Tahajjud (Setiap Hari - Wajib Patroli 200 Lkg, Opsional Foto)
  tasks.push({
    key: "tahajjud",
    number: num++,
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
    targetSteps: 200,
    photoRequirement: "mandatory"
  });

  // 2. Sesi Ba'da Shubuh
  if (isAhad) {
    tasks.push({
      key: "bakdaSubuh",
      number: num++,
      title: "Mendampingi Muhadatsah Pagi",
      shortDesc: "Mendampingi latihan percakapan bahasa Arab/Inggris santri di asrama",
      timeWindow: "05:15 – 06:15 WIB",
      startHour: 5,
      startMinute: 15,
      endHour: 6,
      endMinute: 15,
      icon: "book",
      category: "Pagi",
      isPatrol: true,
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  } else {
    tasks.push({
      key: "bakdaSubuh",
      number: num++,
      title: isSubuhPiket ? "Piket Kebersihan Asrama Ba'da Subuh" : "Halaqah Tahfizh Ba'da Subuh",
      shortDesc: isSubuhPiket
        ? "Kontrol & penyisiran piket kebersihan pagi asrama (Wajib Patroli 200 Langkah)"
        : "Mendampingi halaqah Al-Qur'an & setoran tahfizh santri ba'da Subuh",
      timeWindow: "05:15 – 06:00 WIB",
      startHour: 5,
      startMinute: 15,
      endHour: 6,
      endMinute: 0,
      icon: isSubuhPiket ? "sparkles" : "book",
      category: "Pagi",
      isPatrol: isSubuhPiket,
      targetSteps: isSubuhPiket ? 200 : undefined,
      allowSubChoice: true,
      photoRequirement: isSubuhPiket ? "mandatory" : "optional"
    });
  }

  // 3. Memeriksa Santri yang Sakit (Senin - Sabtu: Wajib Foto & Wajib Patroli, Ahad Libur/Tidak Ada)
  if (!isAhad) {
    tasks.push({
      key: "cekSakit",
      number: num++,
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
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  }

  // 4 & 5. Agenda Pagi: Kerja Bakti (Ahad) vs Berangkat Sekolah & Jaga Gerbang (Senin-Sabtu)
  if (isAhad) {
    tasks.push({
      key: "kerjaBakti",
      number: num++,
      title: "Mendampingi Kerja Bakti Asrama",
      shortDesc: "Mendampingi dan mengontrol kerja bakti gotong royong kebersihan akbar asrama & kamar",
      timeWindow: "06:00 – 07:15 WIB",
      startHour: 6,
      startMinute: 0,
      endHour: 7,
      endMinute: 15,
      icon: "sparkles",
      category: "Pagi",
      isPatrol: true,
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  } else {
    tasks.push({
      key: "sisirSekolah",
      number: num++,
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
      targetSteps: 200,
      photoRequirement: "mandatory"
    });

    tasks.push({
      key: "jagaGerbang",
      number: num++,
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
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  }

  // Khusus Hari Jumat: Mengoprak-oprak Shalat Jum'at (11:00 - 12:00 WIB - Wajib Foto)
  if (isJumat) {
    tasks.push({
      key: "oprakJumat",
      number: num++,
      title: "Mengoprak-oprak Shalat Jum'at",
      shortDesc: "Menyisir kamar santri agar segera mandi, berpakaian muslim bersih, dan berangkat ke masjid",
      timeWindow: "11:00 – 12:00 WIB",
      startHour: 11,
      startMinute: 0,
      endHour: 12,
      endMinute: 0,
      icon: "sun",
      category: "Siang",
      isPatrol: true,
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  }

  // 6. Menyisir Kamar untuk Shalat Ashar (Setiap Hari - Wajib Patroli 200 Lkg, Opsional Foto)
  tasks.push({
    key: "oprakAshar",
    number: num++,
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
    targetSteps: 200,
    photoRequirement: "mandatory"
  });

  // 7. Mengoprak-oprak Mandi Sore (Setiap Hari - Wajib Foto & Patroli)
  tasks.push({
    key: "oprakMandi",
    number: num++,
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
    targetSteps: 200,
    photoRequirement: "mandatory"
  });

  // 8. Menyisir Kamar Menjelang Maghrib (Setiap Hari - Wajib Patroli 200 Lkg, Opsional Foto)
  tasks.push({
    key: "sisirMaghrib",
    number: num++,
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
    targetSteps: 200,
    photoRequirement: "mandatory"
  });

  // 9. Agenda Ba'da Maghrib
  if (isSeninOrSelasa) {
    tasks.push({
      key: "bakdaMaghrib",
      number: num++,
      title: "Mendampingi Pembelajaran Bahasa",
      shortDesc: "Mendampingi dan mengontrol pembinaan kosa kata/mufradat & percakapan bahasa santri",
      timeWindow: "18:00 – 19:00 WIB",
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 0,
      icon: "book",
      category: "Malam",
      isPatrol: true,
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  } else if (isRabu) {
    tasks.push({
      key: "bakdaMaghrib",
      number: num++,
      title: "Pengecekan Catatan Santri",
      shortDesc: "Pemeriksaan kelengkapan buku catatan pelajaran dan kedisiplinan belajar santri",
      timeWindow: "18:00 – 19:00 WIB",
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 0,
      icon: "book",
      category: "Malam",
      isPatrol: false,
      photoRequirement: "mandatory"
    });
  } else if (isKamis || isJumat) {
    tasks.push({
      key: "bakdaMaghrib",
      number: num++,
      title: "Mendampingi Pembelajaran Tahsin Al-Qur'an",
      shortDesc: "Mendampingi tahsin, talaqqi, dan perbaikan tajwid bacaan Al-Qur'an santri",
      timeWindow: "18:00 – 19:00 WIB",
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 0,
      icon: "book",
      category: "Malam",
      isPatrol: false,
      photoRequirement: "mandatory"
    });
  } else {
    // Sabtu & Ahad
    tasks.push({
      key: "bakdaMaghrib",
      number: num++,
      title: "Mendampingi Pembelajaran Ba'da Maghrib",
      shortDesc: "Mendampingi tahsin, tilawah Qur'an, dan pembelajaran malam santri",
      timeWindow: "18:00 – 19:00 WIB",
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 0,
      icon: "book",
      category: "Malam",
      isPatrol: false,
      photoRequirement: "mandatory"
    });
  }

  // 10. Agenda Ba'da Isya / Belajar Malam
  if (isKamis) {
    tasks.push({
      key: "belajarMalam",
      number: num++,
      title: "Mendampingi Pembacaan Surat Al-Kahfi",
      shortDesc: "Menyisir dan mendampingi santri membaca Surat Al-Kahfi bersama di malam Jum'at",
      timeWindow: "19:30 – 21:00 WIB",
      startHour: 19,
      startMinute: 30,
      endHour: 21,
      endMinute: 0,
      icon: "book",
      category: "Malam",
      isPatrol: true,
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  } else {
    tasks.push({
      key: "belajarMalam",
      number: num++,
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
      targetSteps: 200,
      photoRequirement: "mandatory"
    });
  }

  // 11. Menyisir Kamar untuk Tidur (Setiap Hari - Wajib Foto & Patroli)
  tasks.push({
    key: "cekTidur",
    number: num++,
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
    targetSteps: 200,
    photoRequirement: "mandatory"
  });

  // Dynamic Agenda & Meeting Tasks Injection (Only for invited musyrif on the event date)
  if (dateStr && musyrifId && Array.isArray(agendaList) && agendaList.length > 0) {
    const matchingAgendas = agendaList.filter(ag => 
      ag.date === dateStr && Array.isArray(ag.invitedMusyrifIds) && ag.invitedMusyrifIds.includes(musyrifId)
    );

    matchingAgendas.forEach(ag => {
      const [sH, sM] = (ag.startTime || "09:00").split(":").map(Number);
      const [eH, eM] = (ag.endTime || "11:30").split(":").map(Number);
      tasks.push({
        key: `agenda_${ag.id}`,
        number: num++,
        title: ag.title,
        shortDesc: `${ag.category === "rapat" ? "Rapat Koordinasi" : ag.category === "pengajian" ? "Pengajian & Kajian" : "Pertemuan Musyrif"} • ${ag.locationName} (${ag.startTime} – ${ag.endTime} WIB)`,
        timeWindow: `${ag.startTime} – ${ag.endTime} WIB`,
        startHour: isNaN(sH) ? 9 : sH,
        startMinute: isNaN(sM) ? 0 : sM,
        endHour: isNaN(eH) ? 11 : eH,
        endMinute: isNaN(eM) ? 30 : eM,
        icon: "users",
        category: "Agenda Rapat",
        isPatrol: false,
        targetSteps: 0,
        photoRequirement: "mandatory",
        isDynamicAgenda: true,
        agendaVenue: {
          lat: ag.locationLat,
          lng: ag.locationLng,
          radius: ag.locationRadius || 150,
          name: ag.locationName
        }
      });
    });
  }

  return tasks;
}

export const LOGBOOK_TASKS: TaskDefinition[] = getLogbookTasksForDate();

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
    case "users": return <Users className="w-4 h-4 text-blue-600" />;
    default: return <Sparkles className="w-4 h-4 text-emerald-600" />;
  }
}

export const EMPTY_LOGBOOK: JurnalLogbookEntry = {
  tahajjud: { done: false },
  bakdaSubuh: { done: false, subChoice: "tahfizh" },
  cekSakit: { done: false },
  sisirSekolah: { done: false },
  jagaGerbang: { done: false },
  oprakJumat: { done: false },
  kerjaBakti: { done: false },
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
  onOpenAgendaRapat,
  agendaList = [],
  isPage = false,
  initialMusyrifId,
  initialDate,
  initialTaskKey
}: JurnalLogbookModalProps) {
  const isKoordinatorMusyrif = authUser?.role === "koordinator_musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isPamong = authUser?.role === "pamong";
  const isAdmin = authUser?.role === "admin";
  const isSpecialBypassUser = Boolean(
    authUser?.email?.toLowerCase().includes("andiaqillah@muallimin.sch.id") ||
    authUser?.email?.toLowerCase().includes("afifnashrul") ||
    authUser?.name?.toLowerCase().includes("afif nashrul") ||
    authUser?.musyrifId === "m2" ||
    authUser?.id === "m2"
  );

  // Yang berwenang bypass jadwal (masa depan, masa lalu, dan input tanpa batasan waktu): Pamong, Koordinator Musyrif, Admin, serta akun khusus (Ustaz Afif Nashrul / andiaqillah@muallimin.sch.id)
  const isCanBypass = isPamong || isKoordinatorMusyrif || isAdmin || isSpecialBypassUser;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const activeMusyrifList = useMemo(() => {
    if (isKoordinatorMusyrif || isAdmin || isSpecialBypassUser) {
      return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    }
    if (isKoorGedung) {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    if (isPamong) {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
  }, [musyrifList, authUser, isKoordinatorMusyrif, isKoorGedung, isPamong, isAdmin, isSpecialBypassUser]);

  // Find the musyrif record matching logged-in user (including Koordinator Gedung)
  const mySelfMusyrif = useMemo(() => {
    if (!authUser) return null;
    const authClean = (authUser.email || "").trim().toLowerCase();
    return musyrifList.find(m => 
      m.id === authUser.musyrifId || 
      m.id === authUser.id || 
      (m.email && authClean && m.email.toLowerCase().split(/[\s,]+/).includes(authClean)) ||
      (m.email && authUser.email && m.email.toLowerCase() === authUser.email.toLowerCase())
    ) || null;
  }, [authUser, musyrifList]);

  // Check supervisory role (Pamong / Admin / Koordinator Musyrif)
  const isSupervisoryRole = authUser?.role === "pamong" || authUser?.role === "admin" || authUser?.role === "koordinator_musyrif";

  const defaultMusyrifId = initialMusyrifId 
    ? initialMusyrifId 
    : isSupervisoryRole 
      ? "" 
      : (mySelfMusyrif?.id || authUser?.musyrifId || authUser?.id || activeMusyrifList[0]?.id || "");

  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), "yyyy-MM-dd"));
  const [filterCategory, setFilterCategory] = useState<"all" | "Pagi" | "Siang" | "Sore" | "Malam" | "patrol" | "Agenda Rapat">("all");
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
  ) || authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";

  const isMusyrifUser = isEditingSelf;

  // Active Patrol Modal Tracker State
  const [activePatrolTask, setActivePatrolTask] = useState<TaskDefinition | null>(null);
  const [showStravaSticker, setShowStravaSticker] = useState<boolean>(false);
  
  // Active Camera Task State & Fullscreen Photo Preview
  const [activeCameraTask, setActiveCameraTask] = useState<TaskDefinition | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string; watermark?: string } | null>(null);

  // GPS Geofence Check State
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);
  const [gpsResult, setGpsResult] = useState<GeofenceResult | null>(null);

  const selectedMusyrif = musyrifList.find(m => m.id === selectedMusyrifId) || null;
  const asramaTarget = selectedMusyrif?.asrama || "Asrama 1";

  // Form State initialized from storage
  const [formState, setFormState] = useState<JurnalLogbookEntry>(() => {
    return selectedMusyrifId ? (logbookData[selectedMusyrifId]?.[selectedDate] || EMPTY_LOGBOOK) : EMPTY_LOGBOOK;
  });

  // Keep form in sync when props/cloud data, musyrif, or date changes (preserving active local photos during background sync)
  useEffect(() => {
    const existing = selectedMusyrifId ? (logbookData[selectedMusyrifId]?.[selectedDate] || EMPTY_LOGBOOK) : EMPTY_LOGBOOK;
    setFormState(prev => {
      // If previous form state already had a photo that incoming sync data hasn't received yet, preserve local photo!
      const merged: any = { ...existing };
      for (const k in prev) {
        const prevTask = (prev as any)[k];
        const existTask = (existing as any)[k];
        if (prevTask && typeof prevTask === "object" && prevTask.photoUrl && (!existTask || !existTask.photoUrl)) {
          merged[k] = { ...existTask, ...prevTask };
        }
      }
      return merged;
    });
  }, [logbookData, selectedMusyrifId, selectedDate]);

  // SubChoice Map for dynamic tasks
  const subChoiceMap = useMemo(() => {
    return {
      bakdaSubuh: (formState.bakdaSubuh?.subChoice || "tahfizh") as "tahfizh" | "piket"
    };
  }, [formState.bakdaSubuh?.subChoice]);

  // Dynamic Tasks for Selected Date (including injected Agenda Rapat)
  const activeDateTasks = useMemo(() => {
    return getLogbookTasksForDate(selectedDate, subChoiceMap, selectedMusyrifId, agendaList);
  }, [selectedDate, subChoiceMap, selectedMusyrifId, agendaList]);

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

  // SubChoice Change Handler (e.g. Tahfizh vs Piket on Subuh)
  const handleSubChoiceChange = (key: "bakdaSubuh", choice: "tahfizh" | "piket") => {
    const cur = formState[key] || { done: false };
    if (cur.done && !isCanBypass) {
      appAlert("Tugas telah diselesaikan, pilihan aktivitas tidak dapat diubah kembali.", "Tugas Selesai", "info");
      return;
    }
    const updatedEntry: JurnalLogbookEntry = {
      ...formState,
      [key]: {
        ...cur,
        subChoice: choice
      }
    };
    setFormState(updatedEntry);
    onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
  };

  // Handle task toggling with strict validations (Date, Geofence, Time window, Patrol)
  const toggleTask = (taskDef: TaskDefinition) => {
    if (!isMusyrifUser && !isCanBypass) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isToday = selectedDate === todayStr;
    const isFuture = selectedDate > todayStr;
    const isPast = selectedDate < todayStr;
    
    // 1. Must be today (Strict: only Pamong/Admin can bypass)
    if (isFuture && !isCanBypass) {
      appAlert("Pengisian dan pencentangan logbook untuk tanggal masa depan tidak diizinkan. Silakan pilih tanggal hari ini.", "Tanggal Belum Tiba", "warning");
      return;
    }
    if (isPast && !isCanBypass) {
      appAlert("Pengisian dan pencentangan logbook untuk tanggal selain hari ini telah terkunci secara otomatis. Hanya Pamong yang berwenang mengubah catatan lampau.", "Waktu Terkunci", "warning");
      return;
    }

    // 2. Must be in Asrama (Geofencing check if GPS available, for standard musyrif & koor gedung)
    if (gpsResult && !gpsResult.isInRange && !isCanBypass) {
      appAlert(`Anda terdeteksi berada di luar area ${asramaTarget} (${gpsResult.distanceMeters}m dari radius valid). Pencatatan tugas logbook hanya diizinkan saat Anda berada di lingkungan asrama.`, "Di Luar Asrama", "warning");
      return;
    }

    const timeInfo = getTaskTimeStatus(taskDef);
    const cur = formState[taskDef.key] || { done: false };

    // 3. Strict Patrol Enforcement (Must do patrol modal, cannot directly click check)
    if (taskDef.isPatrol && !isCanBypass && !cur.done) {
      if (timeInfo.status === "upcoming") {
        appAlert(`Tugas "${taskDef.title}" belum masuk waktu pelaksanaan.\nJadwal tugas: ${taskDef.timeWindow}.\n\nSilakan mulai patroli saat jam tugas aktif tiba.`, "Belum Masuk Waktu", "info");
        return;
      }
      if (timeInfo.status === "passed") {
        appAlert(`Jadwal tugas "${taskDef.title}" (${taskDef.timeWindow}) telah BERAKHIR dan TERKUNCI secara otomatis oleh sistem.\n\nTugas yang tidak dilaksanakan pada jamnya tidak dapat dicentang susulan.`, "Jadwal Terkunci", "danger");
        return;
      }
      setActivePatrolTask(taskDef);
      return;
    }

    // 4. Strict Mandatory Photo Enforcement (Must take live photo first if mandatory)
    if (taskDef.photoRequirement === "mandatory" && !cur.photoUrl && !cur.done && !isCanBypass) {
      appAlert(`Tugas "${taskDef.title}" mewajibkan bukti foto kegiatan langsung dari kamera asrama.\n\nSilakan ambil foto langsung terlebih dahulu untuk menyelesaikan tugas (Melaksanakan).`, "Wajib Foto Dokumentasi", "warning");
      setActiveCameraTask(taskDef);
      return;
    }

    // 5. Strict Locking for standard Musyrif & Koor Gedung:
    if (!isCanBypass) {
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
        gpsVerified: nextDone ? (isCanBypass ? true : (gpsResult?.isInRange ?? false)) : false
      }
    };
    setFormState(updatedEntry);
    // Instant Auto-Save & Cloud Sync on toggle
    onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
  };

  // Handle Direct Photo Capture (Kamera & Galeri - Sama seperti Santri Sakit & Izin)
  const handleDirectTaskPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file || !activeCameraTask) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Pengunggahan foto hanya diizinkan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
      return;
    }

    const taskDef = activeCameraTask;
    const key = taskDef.key;
    const cur = formState[key] || { done: false };

    setIsCompressingPhoto(true);
    triggerHaptic("light");

    try {
      const nowIso = new Date().toISOString();
      
      // Compress with ultra-HD engine (768px Ultra-HD, quality 80%, guaranteed <= 40,000 chars, no watermark)
      const base64 = await compressAndWatermarkImage(file, null, 768, 0.80);
      if (!base64) throw new Error("Gagal mengompresi foto.");

      const isPatrolRequired = Boolean(taskDef.isPatrol);
      const hasEnoughSteps = (cur.stepsCount || 0) >= (taskDef.targetSteps || 200);
      const isFullyCompleted = !isPatrolRequired || hasEnoughSteps;

      const updatedEntry: JurnalLogbookEntry = {
        ...formState,
        [key]: {
          ...cur,
          done: isFullyCompleted,
          completedAt: isFullyCompleted ? (cur.completedAt || format(new Date(), "HH:mm")) : (cur.completedAt || format(new Date(), "HH:mm")),
          gpsVerified: isFullyCompleted ? (gpsResult?.isInRange ?? false) : cur.gpsVerified,
          photoUrl: base64,
          photoTakenAt: nowIso,
          photoSource: source,
          photoUserAvatar: authUser?.picture
        }
      };

      setFormState(updatedEntry);
      onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
      setActiveCameraTask(null);
      triggerHaptic("success");

      if (isPatrolRequired && !hasEnoughSteps) {
        appAlert(`Foto bukti kegiatan berhasil disimpan! Tugas "${taskDef.title}" masih memerlukan patroli langkah (minimal ${taskDef.targetSteps || 200} langkah).`, "Wajib Patroli Langkah", "info");
      }
    } catch (err: any) {
      appAlert("Gagal memproses foto: " + (err?.message || "Format tidak didukung"), "Error Foto", "danger");
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = "";
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Penghapusan foto hanya diizinkan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
      return;
    }

    appConfirm("Apakah Anda yakin ingin menghapus foto dokumentasi tugas ini?", "Hapus Foto", "danger").then(ok => {
      if (!ok) return;
      const cur = formState[key];
      if (!cur) return;
      const taskDef = activeDateTasks.find(t => t.key === key);
      const isPhotoMandatory = taskDef?.photoRequirement === "mandatory";

      const updatedEntry: JurnalLogbookEntry = {
        ...formState,
        [key]: {
          ...cur,
          // If photo was mandatory, removing the photo returns status to NOT completed (done: false)
          done: isPhotoMandatory ? false : cur.done,
          completedAt: isPhotoMandatory ? undefined : cur.completedAt,
          photoUrl: "", // Explicit signal to remove photo
          photoTakenAt: undefined,
          photoSource: undefined,
          photoWatermark: undefined
        }
      };
      setFormState(updatedEntry);
      onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);
    });
  };

  // Handle note updates
  const updateTaskNotes = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, notes: string) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate !== todayStr && !isCanBypass) {
      return;
    }

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
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Penyimpanan logbook untuk tanggal lampau terkunci secara otomatis. Hanya Pamong/Admin yang berwenang mengubah catatan lampau.", "Tanggal Terkunci", "warning");
      return;
    }

    onSaveLogbook(selectedMusyrifId, selectedDate, formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Complete Patrol Task with Step count
  const handlePatrolSuccess = (key: keyof Omit<JurnalLogbookEntry, "generalNotes">, steps: number) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Patroli hanya dapat dilakukan pada tanggal hari ini.", "Tanggal Terkunci", "warning");
      return;
    }

    const taskDef = activeDateTasks.find(t => t.key === key);
    const isPhotoMandatory = taskDef?.photoRequirement === "mandatory";
    const existingPhoto = formState[key]?.photoUrl;

    // If photo is mandatory and not yet taken, do NOT mark as done yet!
    const isFullyCompleted = !isPhotoMandatory || Boolean(existingPhoto);

    const updatedEntry: JurnalLogbookEntry = {
      ...formState,
      [key]: {
        ...(formState[key] || { done: false }),
        done: isFullyCompleted,
        stepsCount: steps,
        completedAt: isFullyCompleted ? format(new Date(), "HH:mm") : undefined,
        gpsVerified: isFullyCompleted ? (gpsResult?.isInRange ?? false) : false
      }
    };
    setFormState(updatedEntry);
    onSaveLogbook(selectedMusyrifId, selectedDate, updatedEntry);

    if (isPhotoMandatory && !existingPhoto) {
      if (taskDef) {
        appAlert(`Patroli ${steps} langkah berhasil tercatat! Tugas "${taskDef.title}" mewajibkan foto bukti kegiatan untuk menyelesaikan tugas (Melaksanakan).\n\nSilakan ambil foto bukti sekarang.`, "Wajib Ambil Foto", "info");
        setActiveCameraTask(taskDef);
      }
    } else {
      triggerHaptic("medium");
    }
  };

  // Summary Metrics
  const completedTasks = activeDateTasks.filter(t => formState[t.key]?.done).length;
  const totalTasks = activeDateTasks.length;
  const scorePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
        label: "🔴 Tidak Melaksanakan (Tanggal Lewat)", 
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold" 
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
        label: "🟢 Waktu Aktif (Wajib Melaksanakan)", 
        badgeClass: "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold animate-pulse" 
      };
    } else if (curTotal > endTotal) {
      return { 
        status: "passed" as const, 
        isLocked: true,
        label: "🔴 Tidak Melaksanakan (Jadwal Terlewat)", 
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 font-semibold" 
      };
    } else {
      return { 
        status: "upcoming" as const, 
        isLocked: true,
        label: "⏳ Menunggu Jam (Wajib Melaksanakan)", 
        badgeClass: "bg-amber-50 text-amber-800 border border-amber-200 font-semibold" 
      };
    }
  };

  // Filtered Tasks:
  // For today: by default show active tasks OR completed tasks. User can toggle showAllScheduled to see the full list with locked indicators.
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const filteredTasks = activeDateTasks.filter(t => {
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
    if (isToday && !showAllScheduled && isMusyrifUser && !isCanBypass && !searchTaskQuery) {
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
            <h2 className={`font-black text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>Jurnal Tugas Logbook Musyrif</h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-400" : "text-slate-300"}`}>Monitoring kedisiplinan dan checklist tugas harian asrama</p>
          </div>
        </div>
        {isMusyrifUser && isGpsVerified && (
          <button type="button" onClick={handleSave} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all">
            <Check className="w-4 h-4" /> <span>Simpan Jurnal</span>
          </button>
        )}
      </div>

      {/* GPS Status Banner (Only for standard Musyrif & Koor Gedung doing self-input) */}
      {!isCanBypass && selectedMusyrif && (
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

      {/* Form & Selection Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
        {/* Date & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Tugas</label>
            <input type="date" min="2026-08-18" value={selectedDate} onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{authUser?.role === "musyrif" ? "Akun Musyrif (Mandiri)" : "Pilih Personel"}</span>
              {isKoorGedung && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  {isEditingSelf ? "Mode Mengisi Pribadi (Wajib Patroli & Hari Ini)" : "Mode Pantau Musyrif"}
                </span>
              )}
              {isSupervisoryRole && (
                <span className="text-[10px] text-indigo-600 font-bold">
                  Mode Pengawas Pamong
                </span>
              )}
            </label>
            {authUser?.role === "musyrif" ? (
              <div className="w-full text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-2xl px-3.5 py-2.5 font-bold truncate flex items-center gap-1.5 shadow-2xs"><User className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> {authUser?.name}</div>
            ) : (
              <select value={selectedMusyrifId} onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)} className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 outline-none cursor-pointer shadow-2xs">
                {isSupervisoryRole && <option value="">-- Silakan Pilih Musyrif --</option>}
                {activeMusyrifList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id === mySelfMusyrif?.id ? `${m.name} (Saya Sendiri - Logbook & Patroli)` : `${m.name} (${m.asrama}${m.kamar ? ` - Kmr ${m.kamar}` : ""})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Mode Read-Only Alert Banner for Non-Bypass Users on Past/Future Dates */}
        {!isCanBypass && selectedDate !== format(new Date(), "yyyy-MM-dd") && (
          <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="leading-tight">
              <strong>Mode Riwayat (Hanya Baca):</strong> Anda sedang melihat tanggal lampau ({format(parseISO(selectedDate), "dd MMMM yyyy", { locale: id })}). Pengisian, pencentangan, foto, dan perubahan logbook terkunci otomatis.
            </p>
          </div>
        )}
      </div>

      {/* Empty State when no musyrif is selected (for Pamong/Koordinator) */}
      {!selectedMusyrif ? (
        <div className="bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          {/* Hero Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-8 ring-indigo-50">
            <ClipboardList className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center text-xs font-black shadow-xs ring-2 ring-white">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100/80 text-indigo-800 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Mode Pantau & Pengawasan
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
              Pilih Musyrif Terlebih Dahulu
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Silakan pilih salah satu musyrif binaan di bawah ini atau gunakan dropdown di atas untuk melihat lembar jurnal harian, status pelaksanaan, dan dokumentasi foto.
            </p>
          </div>

          {/* Quick Cards Grid */}
          <div className="pt-2 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar Musyrif Binaan:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {activeMusyrifList.map(m => {
                const mLogsToday = logbookData[m.id]?.[selectedDate] || {};
                const doneCount = Object.values(mLogsToday).filter((t: any) => t?.done).length;
                
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleDateOrMusyrifChange(m.id, selectedDate)}
                    className="group p-3.5 rounded-2xl bg-white hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">{m.name}</h4>
                        <span className="text-[10px] text-slate-400 block truncate">{m.asrama}{m.kamar ? ` • Kmr ${m.kamar}` : ""}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        doneCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {doneCount > 0 ? `${doneCount} Melaksanakan` : "Belum Mengisi"}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Buka ➔
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
            {/* Progress Box */}
            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center font-black font-mono shadow-2xs ${scorePct === 100 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900 border border-emerald-200/80"}`}><span className="text-xs">{scorePct}%</span></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{scorePct === 100 ? "Seluruh Tugas Terlaksana ✓" : `${completedTasks} Melaksanakan · ${totalTasks - completedTasks} Tidak Melaksanakan`}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5"><strong>{completedTasks}</strong> Melaksanakan · <strong>{totalTasks - completedTasks}</strong> Tidak Melaksanakan</p>
                  </div>
                </div>
                {isCanBypass && (
                  <button
                    type="button"
                    onClick={handleResetLogbook}
                    title="Reset Isian Logbook Tanggal Ini"
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                  >
                    Reset Logbook
                  </button>
                )}
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
                  <div 
                    onClick={() => {
                      if (isCanBypass) {
                        triggerHaptic("medium");
                        setShowStravaSticker(true);
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-500 text-[11px] font-semibold flex items-center justify-between gap-2 select-none ${
                      isCanBypass ? "cursor-pointer active:scale-[0.99] transition-all" : ""
                    }`}
                    title={isCanBypass ? "Akses Pamong/Admin: Klik untuk buka Stiker Strava" : undefined}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Stiker Story Ala Strava terbuka setelah seluruh tugas ({totalTasks}/{totalTasks}) tuntas</span>
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
              { id: "Agenda Rapat", label: "Agenda Rapat", icon: Users },
              { id: "Pagi", label: "Pagi", icon: Sunrise },
              { id: "Siang", label: "Siang", icon: Sun },
              { id: "Sore", label: "Sore", icon: Sunset },
              { id: "Malam", label: "Malam", icon: Moon },
              { id: "patrol", label: "Patroli Langkah (200 Lkg)", icon: Footprints }
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

      {/* Only block standard field musyrifs if GPS not verified; Pamong & Admins NEVER blocked */}
      {(!isCanBypass && isMusyrifUser && !isGpsVerified) ? (
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
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-600" /> <span>Tugas Jadwal ({filteredTasks.length})</span></h4>
            <button type="button" onClick={() => setShowAllScheduled(!showAllScheduled)} className="text-[11px] font-bold text-emerald-700 hover:underline">{showAllScheduled ? "Tampilkan Hanya Jam Aktif" : `Lihat Seluruh ${activeDateTasks.length} Jadwal`}</button>
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
              const isLocked = (!isDone && timeInfo.isLocked && !isCanBypass) || (selectedDate !== todayStr && !isCanBypass);
              const isPassed = (timeInfo.status === "passed" || timeInfo.status === "past_date") && !isDone;
              const isUpcoming = (timeInfo.status === "upcoming" || timeInfo.status === "future_date") && !isDone;
              const isExpanded = expandedTask === t.key;

              return (
                <div
                  key={t.key}
                  id={`task-card-${t.key}`}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-2xs ${
                    isDone
                      ? "border-emerald-300 ring-1 ring-emerald-100 bg-emerald-50/15"
                      : timeInfo.status === "active" && selectedDate === todayStr
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
                        disabled={!isCanBypass && (isLocked || !isMusyrifUser || isDone || selectedDate !== todayStr)}
                        onClick={() => {
                          if (selectedDate !== todayStr && !isCanBypass) {
                            appAlert("Pengisian logbook hanya dapat dilakukan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
                            return;
                          }
                          if (t.isPatrol && !isCanBypass && isMusyrifUser && !isDone) {
                            if (isLocked) {
                              appAlert(`Jadwal tugas "${t.title}" telah lewat dan terkunci.`, "Jadwal Terkunci", "warning");
                              return;
                            }
                            const hasEnoughSteps = (taskData.stepsCount || 0) >= (t.targetSteps || 200);
                            if (!hasEnoughSteps) {
                              setActivePatrolTask(t);
                              return;
                            }
                            if (t.photoRequirement === "mandatory" && !taskData.photoUrl) {
                              appAlert(`Patroli langkah telah selesai (${taskData.stepsCount} langkah). Tugas "${t.title}" mewajibkan foto bukti untuk menyelesaikan tugas (Melaksanakan).\n\nSilakan ambil foto bukti sekarang.`, "Wajib Foto Dokumentasi", "info");
                              setActiveCameraTask(t);
                              return;
                            }
                            toggleTask(t);
                          } else if (t.photoRequirement === "mandatory" && !taskData.photoUrl && !isDone && !isCanBypass && isMusyrifUser) {
                            if (isLocked) {
                              appAlert(`Jadwal tugas "${t.title}" telah lewat dan terkunci.`, "Jadwal Terkunci", "warning");
                              return;
                            }
                            appAlert(`Tugas "${t.title}" mewajibkan foto bukti kegiatan.\n\nSilakan ambil foto bukti sekarang untuk menyelesaikan tugas (Melaksanakan).`, "Wajib Foto Dokumentasi", "info");
                            setActiveCameraTask(t);
                          } else {
                            toggleTask(t);
                          }
                        }}
                        className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs " + (isCanBypass ? "cursor-pointer hover:opacity-85" : "cursor-default")
                            : isPassed && !isCanBypass
                            ? "border-rose-200 bg-rose-50/80 text-rose-400 cursor-not-allowed"
                            : isUpcoming && !isCanBypass
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : (t.photoRequirement === "mandatory" && !taskData.photoUrl && (taskData.stepsCount || 0) >= (t.targetSteps || 200))
                            ? "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 active:scale-95 cursor-pointer shadow-2xs"
                            : "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-transparent hover:text-emerald-600 active:scale-95 cursor-pointer shadow-2xs"
                        }`}
                        title={
                          isDone
                            ? (isCanBypass ? "Tugas Selesai (Klik untuk ubah/batal)" : "Tugas Selesai")
                            : isPassed && !isCanBypass
                            ? "Jadwal Terlewat / Tanggal Lampau (Terkunci)"
                            : isUpcoming && !isCanBypass
                            ? "Belum Masuk Waktu"
                            : (t.photoRequirement === "mandatory" && !taskData.photoUrl && (taskData.stepsCount || 0) >= (t.targetSteps || 200))
                            ? "Patroli Selesai • Wajib Ambil Foto"
                            : "Klik untuk Selesaikan Tugas"
                        }
                      >
                        {isDone ? (
                          <Check className="w-4 h-4" />
                        ) : isPassed && !isCanBypass ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        ) : isUpcoming && !isCanBypass ? (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        ) : (t.photoRequirement === "mandatory" && !taskData.photoUrl && (taskData.stepsCount || 0) >= (t.targetSteps || 200)) ? (
                          <Camera className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-bold leading-tight ${
                              isDone ? "text-slate-900" : isPassed ? "text-slate-500" : "text-slate-800"
                            }`}
                          >
                            {t.number}. {t.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.shortDesc}</p>

                        {/* Interactive SubChoice Pills for Subuh (Senin - Sabtu) */}
                        {t.allowSubChoice && (
                          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600">Pilih Sesi Subuh:</span>
                            <button
                              type="button"
                              disabled={isDone && !isCanBypass}
                              onClick={() => handleSubChoiceChange("bakdaSubuh", "tahfizh")}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                                (taskData.subChoice || "tahfizh") === "tahfizh"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Tahfizh (Halaqah)</span>
                            </button>
                            <button
                              type="button"
                              disabled={isDone && !isCanBypass}
                              onClick={() => handleSubChoiceChange("bakdaSubuh", "piket")}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                                taskData.subChoice === "piket"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Piket Asrama (Patroli 200 Lkg)</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Meta row - Minimal & Clean */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          {/* Time window */}
                          <span className="inline-flex items-center gap-1 font-medium font-mono text-slate-500 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" /> {t.timeWindow}
                          </span>

                          {/* Completion / Missed Status */}
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Melaksanakan{taskData.completedAt ? ` • ${taskData.completedAt} WIB` : ""}</span>
                            </span>
                          ) : (!isDone && (taskData.stepsCount || 0) >= (t.targetSteps || 200) && t.photoRequirement === "mandatory" && !taskData.photoUrl) ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                              <Footprints className="w-3 h-3 text-amber-600" />
                              <span>Patroli Selesai ({taskData.stepsCount} Lkg) • Wajib Foto</span>
                            </span>
                          ) : isPassed ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                              <span>Tidak Melaksanakan</span>
                            </span>
                          ) : null}

                          {/* Photo Badge: Only show if photo is uploaded */}
                          {taskData.photoUrl && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                              <Camera className="w-3 h-3 text-emerald-600" /> Foto ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end flex-wrap">
                      {/* Photo Thumbnail / Camera Button */}
                      {taskData.photoUrl ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto({
                              url: taskData.photoUrl!,
                              title: t.title,
                              subtitle: `${selectedMusyrif?.name || "Musyrif"} • ${asramaTarget}`,
                              watermark: taskData.photoWatermark
                            })}
                            className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/60 group hover:opacity-90 transition-opacity"
                            title="Lihat Foto Dokumentasi"
                          >
                            <img src={taskData.photoUrl} alt="Bukti Foto" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center text-white">
                              <Eye className="w-3 h-3" />
                            </div>
                          </button>

                          {isMusyrifUser && !isLocked && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(t.key)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-colors"
                              title="Hapus / Ganti Foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        isMusyrifUser && !isLocked && (
                          <button
                            type="button"
                            onClick={() => setActiveCameraTask(t)}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                              t.photoRequirement === "mandatory"
                                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-2xs font-bold"
                                : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
                            }`}
                            title={t.photoRequirement === "mandatory" ? "Ambil Foto Bukti (Wajib)" : "Lampirkan Foto Bukti"}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{t.photoRequirement === "mandatory" ? "Foto (Wajib)" : "+ Foto"}</span>
                          </button>
                        )
                      )}

                      {/* Patrol CTA button for active patrol task */}
                      {t.isPatrol && isMusyrifUser && !isDone && (
                        timeInfo.status === "active" ? (
                          (taskData.stepsCount || 0) >= (t.targetSteps || 200) && t.photoRequirement === "mandatory" && !taskData.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setActiveCameraTask(t)}
                              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                            >
                              <Camera className="w-3.5 h-3.5" /> <span>Ambil Foto Wajib</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isToday && !isCanBypass) {
                                  appAlert("Patroli hanya dapat dilakukan pada tanggal hari ini.", "Patroli Asrama", "warning");
                                  return;
                                }
                                setActivePatrolTask(t);
                              }}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                            >
                              <Footprints className="w-3.5 h-3.5" /> <span>Patroli (200 Lkg)</span>
                            </button>
                          )
                        ) : isPassed ? (
                          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl flex items-center gap-1 opacity-80 cursor-not-allowed">
                            <Lock className="w-3 h-3" /> <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl flex items-center gap-1 opacity-80 cursor-not-allowed">
                            <Clock className="w-3 h-3" /> <span>Menunggu</span>
                          </span>
                        )
                      )}

                      {t.key === "cekSakit" && onOpenSantriSakit && (
                        <button
                          type="button"
                          onClick={onOpenSantriSakit}
                          className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> <span>Data Sakit</span>
                        </button>
                      )}

                      {/* Notes Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedTask(isExpanded ? null : t.key)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                          taskData.notes
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                            : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
                        }`}
                        title="Catatan Tugas"
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
                          onBlur={() => onSaveLogbook(selectedMusyrifId, selectedDate, formState)}
                          placeholder="Tuliskan catatan pelaksanaan tugas (otomatis tersimpan)..."
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
        </div>
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
    </>
  )}
      {activePatrolTask && (
        <PatroliStepsModal
          onClose={() => setActivePatrolTask(null)}
          taskTitle={activePatrolTask.title}
          taskIcon={activePatrolTask.icon}
          targetSteps={activePatrolTask.targetSteps || 200}
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
      {/* MODAL FOTO DOKUMENTASI TUGAS (SAMA DENGAN SANTRI SAKIT & SANTRI IZIN) */}
      {activeCameraTask && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 leading-tight">Foto Bukti Tugas</h4>
                  <p className="text-[10px] text-slate-500">{activeCameraTask.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCameraTask(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isCompressingPhoto ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Sedang memproses & mengompresi foto...</p>
                <p className="text-[10px] text-slate-400">Menyematkan identitas ustadz & waktu secara otomatis</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lampirkan 1 foto bukti dokumentasi aktivitas tugas <strong>"{activeCameraTask.title}"</strong>:
                </p>
                
                <label className="flex items-center justify-center gap-2.5 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl cursor-pointer text-xs font-bold transition-all shadow-md active:scale-95">
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto Kamera (Live)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={(e) => handleDirectTaskPhotoSelected(e, "camera")} 
                  />
                </label>

                <label className="flex items-center justify-center gap-2.5 p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl cursor-pointer text-xs font-semibold transition-all active:scale-95 border border-slate-200">
                  <ImageIcon className="w-4 h-4 text-slate-600" />
                  <span>Pilih dari Galeri HP</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleDirectTaskPhotoSelected(e, "gallery")} 
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewPhoto(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">{previewPhoto.title}</h4>
                <p className="text-[11px] text-slate-400">{previewPhoto.subtitle}</p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center overflow-auto max-h-[70vh]">
              <img src={previewPhoto.url} alt={previewPhoto.title} className="w-full h-auto max-h-[66vh] object-contain rounded-lg" />
            </div>
            {previewPhoto.watermark && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">Metadata:</span> {previewPhoto.watermark}
              </div>
            )}
          </motion.div>
        </div>
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
