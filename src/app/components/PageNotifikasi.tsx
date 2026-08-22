import React, { useState, useMemo, useEffect } from "react";
import { 
  ChevronLeft, Bell, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, FileCheck2, Calendar, UserCheck, 
  CheckCheck, Building2, ChevronRight, Volume2, 
  Sun, Moon, Sparkles, BookOpen, User, Flame,
  ShieldCheck, Inbox
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { getPamongAssignedAsramas, isFieldMusyrif } from "../utils/roleAccessUtils";
import { CloudSyncBadge } from "./CloudSyncModal";
import { SantriSakitRecord } from "./SantriSakitModal";
import { SantriIzinRecord } from "../types/izinSantri";
import { IzinRequest } from "./IzinPengajuanModal";
import { KegiatanRecord } from "./KegiatanAsramaModal";

export type NotificationCategory = "all" | "unread" | "presensi" | "santri" | "asrama";

export interface SystemNotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  category: "presensi" | "santri" | "asrama" | "system";
  priority: "urgent" | "warning" | "success" | "info";
  onAction: () => void;
  badgeText?: string;
  iconType?: "clock" | "pulse" | "building" | "sparkles" | "check" | "alert" | "book";
  timestamp?: number;
}

interface PageNotifikasiProps {
  onBack: () => void;
  authUser: any;
  musyrifList: any[];
  recordsMap: Record<string, any>;
  santriSakitList: SantriSakitRecord[];
  santriIzinList: SantriIzinRecord[];
  izinList: IzinRequest[];
  kegiatanRecords: KegiatanRecord[];
  logbookData?: Record<string, any>;
  mutabaahData?: Record<string, any>;
  now: Date;
  onGoTo: (page: string) => void;
  onOpenSantriSakit: () => void;
  onOpenSantriIzin: () => void;
  onOpenIzinMusyrif: () => void;
  onOpenKegiatan: () => void;
  onOpenLogbook: () => void;
  onOpenMutabaah: () => void;
  onOpenAlarm: () => void;
  onOpenCloudSync?: () => void;
}

export const STORAGE_KEY_READ_NOTIFS = "presensi_notification_reads_v8";

export function getReadNotificationMap(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_READ_NOTIFS);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function markNotificationsAsRead(ids: string[]): Record<string, boolean> {
  const current = getReadNotificationMap();
  ids.forEach(id => {
    current[id] = true;
  });
  try {
    localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(current));
    window.dispatchEvent(new Event("presensi_notif_read_updated"));
  } catch {}
  return current;
}

export function formatLocationShort(asrama?: string): string {
  if (!asrama) return "";
  let s = asrama.trim();
  s = s.replace(/^Asrama Sedayu\s+/i, "");
  s = s.replace(/^Sedayu\s+/i, "");
  s = s.replace(/^Asrama\s+Gedung\s+/i, "Gedung ");
  if (/^Gedung\s+/i.test(s)) {
    return `di ${s}`;
  }
  if (/^Asrama\s+/i.test(s)) {
    return `di ${s}`;
  }
  if (/^\d+[A-Za-z]?$/.test(s)) {
    return `di Asrama ${s}`;
  }
  if (!s.startsWith("di ")) {
    return `di ${s}`;
  }
  return s;
}

export const LOGBOOK_TASK_ACTION_NAMES: Record<string, string> = {
  tahajjud: "Telah mengoprak-oprak Tahajjud",
  bakdaSubuh: "Telah mendampingi bakda Subuh",
  cekSakit: "Telah mengecek santri sakit",
  sisirSekolah: "Telah menyisir santri berangkat sekolah",
  jagaGerbang: "Telah piket jaga gerbang",
  oprakAshar: "Telah mengoprak-oprak sholat Ashar",
  oprakMandi: "Telah mengoprak-oprak mandi sore",
  sisirMaghrib: "Telah menyisir sholat Maghrib",
  bakdaMaghrib: "Telah mendampingi bakda Maghrib",
  belajarMalam: "Telah mengawasi belajar malam",
  cekTidur: "Telah mengecek jam tidur malam",
};

export function parseTimeToTimestamp(timeStr?: string, refDate = new Date()): number {
  if (!timeStr) return refDate.getTime();
  if (timeStr.includes("T") || (timeStr.includes("-") && timeStr.length > 10)) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  if (/^\d{1,2}[:.]\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(/[:.]/).map(Number);
    const d = new Date(refDate);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  return refDate.getTime();
}

export function formatNotificationRelativeTime(timeStr?: string, fallback = "Hari ini", refDate = new Date()): string {
  if (!timeStr) return fallback;
  
  if (timeStr.includes("lalu") || timeStr.includes("Baru saja")) return timeStr;

  let dateObj: Date | null = null;
  let exactClock = "";

  if (timeStr.includes("T") || (timeStr.includes("-") && timeStr.length > 10)) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      dateObj = d;
      exactClock = format(d, "HH.mm");
    }
  } else if (/^\d{1,2}[:.]\d{2}/.test(timeStr)) {
    exactClock = timeStr.replace(":", ".");
    const [h, m] = timeStr.split(/[:.]/).map(Number);
    dateObj = new Date(refDate);
    dateObj.setHours(h, m, 0, 0);
  }

  if (dateObj) {
    const diffMs = refDate.getTime() - dateObj.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    let rel = "";
    if (diffMins < 2) {
      rel = "Baru saja";
    } else if (diffMins < 60) {
      rel = `${diffMins} menit lalu`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      rel = `${hours} jam lalu`;
    } else {
      const days = Math.floor(diffMins / 1440);
      rel = `${days} hari lalu`;
    }

    return exactClock ? `${rel} - ${exactClock}` : rel;
  }

  return timeStr;
}

export function getLogbookNotificationDetails(logbook: any, asramaName: string, refDate = new Date()) {
  const locStr = formatLocationShort(asramaName);
  if (!logbook || typeof logbook !== "object") {
    return {
      message: `Telah mengisi Jurnal Logbook ${locStr}`.trim(),
      time: "Hari ini",
      timestamp: refDate.getTime()
    };
  }

  const completedKeys = Object.keys(LOGBOOK_TASK_ACTION_NAMES).filter(
    k => logbook[k]?.done || logbook[k]?.completedAt
  );

  if (completedKeys.length === 0) {
    return {
      message: `Telah mengisi Jurnal Logbook ${locStr}`.trim(),
      time: "Hari ini",
      timestamp: refDate.getTime()
    };
  }

  // Determine latest completed task by timestamp if available
  let latestTaskKey = completedKeys[0];
  let latestCompletedAt = logbook[latestTaskKey]?.completedAt;

  for (const k of completedKeys) {
    const itemTime = logbook[k]?.completedAt;
    if (itemTime) {
      latestTaskKey = k;
      latestCompletedAt = itemTime;
    }
  }

  if (!latestCompletedAt) {
    latestTaskKey = completedKeys[completedKeys.length - 1];
  }

  const baseAction = LOGBOOK_TASK_ACTION_NAMES[latestTaskKey] || "Telah mengisi logbook";
  const otherCount = completedKeys.length - 1;
  const actionText = otherCount > 0 
    ? `${baseAction} (+${otherCount} tugas) ${locStr}`.trim()
    : `${baseAction} ${locStr}`.trim();

  const formattedTime = formatNotificationRelativeTime(latestCompletedAt, "Hari ini", refDate);
  const taskTimestamp = parseTimeToTimestamp(latestCompletedAt, refDate);

  return {
    message: actionText,
    time: formattedTime,
    timestamp: taskTimestamp
  };
}

export function getMutabaahNotificationDetails(mutabaah: any, asramaName: string, refDate = new Date(), indexOffset = 0) {
  const locStr = formatLocationShort(asramaName);
  const updatedAt = mutabaah?.updatedAt;
  
  let targetTimeStr = updatedAt;
  if (!targetTimeStr) {
    const simulatedDate = new Date(refDate.getTime() - (indexOffset * 5 + 3) * 60 * 1000);
    targetTimeStr = simulatedDate.toISOString();
  }

  const formattedTime = formatNotificationRelativeTime(targetTimeStr, undefined, refDate);
  const timestamp = parseTimeToTimestamp(targetTimeStr, refDate);

  return {
    message: `Telah memperbarui Mutaba'ah harian ${locStr}`.trim(),
    time: formattedTime,
    timestamp
  };
}

export function buildSystemNotificationItems({
  authUser,
  musyrifList = [],
  recordsMap = {},
  santriSakitList = [],
  santriIzinList = [],
  izinList = [],
  kegiatanRecords = [],
  logbookData = {},
  mutabaahData = {},
  now = new Date(),
  onGoTo = () => {},
  onOpenSantriSakit = () => {},
  onOpenSantriIzin = () => {},
  onOpenIzinMusyrif = () => {},
  onOpenKegiatan = () => {},
  onOpenLogbook = () => {},
  onOpenMutabaah = () => {}
}: {
  authUser: any;
  musyrifList?: any[];
  recordsMap?: Record<string, any>;
  santriSakitList?: SantriSakitRecord[];
  santriIzinList?: SantriIzinRecord[];
  izinList?: IzinRequest[];
  kegiatanRecords?: KegiatanRecord[];
  logbookData?: Record<string, any>;
  mutabaahData?: Record<string, any>;
  now?: Date;
  onGoTo?: (page: any) => void;
  onOpenSantriSakit?: () => void;
  onOpenSantriIzin?: () => void;
  onOpenIzinMusyrif?: () => void;
  onOpenKegiatan?: () => void;
  onOpenLogbook?: () => void;
  onOpenMutabaah?: () => void;
}): SystemNotificationItem[] {
  const items: SystemNotificationItem[] = [];
  const todayStr = format(now, "yyyy-MM-dd");
  const currentHour = now.getHours();

  const role = authUser?.role;
  const isMusyrif = role === "musyrif";
  const isKoordinatorGedung = role === "koordinator_gedung";
  const isPamong = role === "pamong";
  const isKoordinatorMusyrif = role === "koordinator_musyrif";
  const isKaurKis = role === "kaur_kis";
  const isWadir4 = role === "wadir4";

  const userMusyrifProfile = (musyrifList || []).find(m => m.id === authUser?.musyrifId || m.name === authUser?.name);
  const userAsrama = authUser?.asrama || userMusyrifProfile?.asrama || "";
  const pamongAsramas = isPamong ? getPamongAssignedAsramas(authUser) : [];

  const safeMusyrifList = Array.isArray(musyrifList) ? musyrifList : [];
  const safeSantriSakit = Array.isArray(santriSakitList) ? santriSakitList : [];
  const safeSantriIzin = Array.isArray(santriIzinList) ? santriIzinList : [];
  const safeIzin = Array.isArray(izinList) ? izinList : [];
  const safeKegiatan = Array.isArray(kegiatanRecords) ? kegiatanRecords : [];

  const scopedMusyrifs = isMusyrif
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (m.id === userMusyrifProfile?.id || (m.asrama === userAsrama && m.asrama)))
    : isKoordinatorGedung
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (m.asrama === userAsrama || m.tingkat === userMusyrifProfile?.tingkat))
    : isPamong
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (pamongAsramas.includes(m.asrama) || m.asrama === userAsrama))
    : safeMusyrifList.filter(isFieldMusyrif);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ROLE: MUSYRIF BIASA
    // ─────────────────────────────────────────────────────────────────────────
    if (isMusyrif && userMusyrifProfile && isFieldMusyrif(userMusyrifProfile)) {
      const myRecord = recordsMap[`${userMusyrifProfile.id}_${todayStr}`];
      const hasSubuh = !!myRecord?.subuh;
      const hasMaghrib = !!myRecord?.maghrib;

      if (currentHour >= 4 && currentHour <= 12 && !hasSubuh) {
        items.push({
          id: `my_presensi_subuh_${todayStr}`,
          title: `Kamar Anda Belum Presensi Subuh`,
          message: `Ketuk untuk mengisi presensi Subuh santri kamar ${userMusyrifProfile.kamar || "-"}`,
          time: "Pagi ini",
          category: "presensi",
          priority: "urgent",
          badgeText: "Subuh",
          iconType: "clock",
          onAction: () => onGoTo("subuh")
        });
      }

      if (currentHour >= 17 && currentHour <= 22 && !hasMaghrib) {
        items.push({
          id: `my_presensi_maghrib_${todayStr}`,
          title: `Kamar Anda Belum Presensi Maghrib`,
          message: `Waktu Maghrib tiba. Isi presensi Maghrib santri kamar ${userMusyrifProfile.kamar || "-"}`,
          time: "Malam ini",
          category: "presensi",
          priority: "urgent",
          badgeText: "Maghrib",
          iconType: "clock",
          onAction: () => onGoTo("maghrib")
        });
      }

      safeSantriSakit
        .filter(s => s && s.status === "dalam_perawatan" && (s.asrama === userAsrama || s.musyrifId === userMusyrifProfile.id))
        .forEach(s => {
          items.push({
            id: `musyrif_santri_sakit_${s.id}`,
            title: `${s.namaSantri} (Kamar ${s.kamar || "-"})`,
            message: `Sakit: ${s.keluhan} • Dirawat di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
            time: s.date || "Hari ini",
            category: "santri",
            priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
            badgeText: s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "Sakit",
            iconType: "pulse",
            onAction: onOpenSantriSakit
          });
        });

      safeSantriIzin
        .filter(iz => iz && iz.asrama === userAsrama)
        .forEach(iz => {
          if (iz.statusApproval === "pending_musyrif" || (iz as any).status === "pending_musyrif") {
            items.push({
              id: `musyrif_santri_izin_rec_${iz.id}`,
              title: `${iz.namaSantri} (Kamar ${iz.kamar || "-"})`,
              message: `Pengajuan izin: ${iz.tujuanLokasi} (${iz.keperluan}) • Butuh rekomendasi Musyrif`,
              time: "Menunggu",
              category: "santri",
              priority: "warning",
              badgeText: "Rekomendasi",
              iconType: "alert",
              onAction: onOpenSantriIzin
            });
          }
          if (iz.statusPKM === "di_luar" || (iz as any).status === "di_luar") {
            items.push({
              id: `musyrif_santri_diluar_${iz.id}`,
              title: `${iz.namaSantri} (Sedang di Luar)`,
              message: `Lokasi: ${iz.tujuanLokasi} • Batas kembali: ${iz.jamKembaliRencana || "17:00"} WIB`,
              time: "PKM",
              category: "santri",
              priority: "warning",
              badgeText: "Di Luar",
              iconType: "building",
              onAction: onOpenSantriIzin
            });
          }
        });

      safeIzin
        .filter(iz => iz && (iz.musyrifId === userMusyrifProfile.id || iz.musyrifName === userMusyrifProfile.name))
        .forEach(iz => {
          if (iz.status === "pending") {
            items.push({
              id: `my_izin_pending_${iz.id}`,
              title: `Izin Pribadi: ${iz.category}`,
              message: `Tanggal: ${iz.startDate} s/d ${iz.endDate} • Menunggu persetujuan Pamong`,
              time: "Menunggu",
              category: "asrama",
              priority: "info",
              badgeText: "Izin Anda",
              iconType: "clock",
              onAction: onOpenIzinMusyrif
            });
          } else if (iz.status === "approved") {
            items.push({
              id: `my_izin_approved_${iz.id}`,
              title: `Izin Pribadi Disetujui: ${iz.category}`,
              message: `Permohonan izin tanggal ${iz.startDate} telah disetujui`,
              time: "Disetujui",
              category: "asrama",
              priority: "success",
              badgeText: "Disetujui",
              iconType: "check",
              onAction: onOpenIzinMusyrif
            });
          }
        });

      const myLogbook = logbookData[userMusyrifProfile.id]?.[todayStr] || logbookData[`${userMusyrifProfile.id}_${todayStr}`];
      if (currentHour >= 19 && !myLogbook) {
        items.push({
          id: `my_logbook_missing_${todayStr}`,
          title: `Jurnal Logbook Belum Diisi`,
          message: `Lengkapi catatan patroli malam dan kondisi santri kamar Anda`,
          time: "Malam ini",
          category: "asrama",
          priority: "warning",
          badgeText: "Logbook",
          iconType: "clock",
          onAction: onOpenLogbook
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ROLE: KOORDINATOR GEDUNG
    // ─────────────────────────────────────────────────────────────────────────
    if (isKoordinatorGedung) {
      scopedMusyrifs.forEach(m => {
        const rec = recordsMap[`${m.id}_${todayStr}`];
        const locStr = formatLocationShort(m.asrama);
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `kg_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh ${locStr} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
            timestamp: now.getTime(),
            onAction: () => onGoTo("rekap")
          });
        }
      });

      safeSantriSakit
        .filter(s => s && s.status === "dalam_perawatan" && (s.asrama === userAsrama || scopedMusyrifs.some(m => m.asrama === s.asrama)))
        .forEach(s => {
          items.push({
            id: `kg_sakit_${s.id}`,
            title: `${s.namaSantri} (${s.asrama})`,
            message: `Sakit: ${s.keluhan} • Di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
            time: "Kesehatan",
            category: "santri",
            priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
            badgeText: s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "Sakit",
            iconType: "pulse",
            timestamp: parseTimeToTimestamp(s.date, now),
            onAction: onOpenSantriSakit
          });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ROLE: PAMONG
    // ─────────────────────────────────────────────────────────────────────────
    if (isPamong) {
      safeSantriIzin
        .filter(iz => iz && (iz.statusApproval === "pending_pamong" || (iz as any).status === "pending_pamong") && (pamongAsramas.includes(iz.asrama) || iz.asrama === userAsrama))
        .forEach(iz => {
          items.push({
            id: `pamong_santri_izin_${iz.id}`,
            title: `${iz.namaSantri} (${iz.kelas || iz.asrama})`,
            message: `Pengajuan izin ke ${iz.tujuanLokasi} (${iz.keperluan})`,
            time: "Pamong",
            category: "santri",
            priority: "urgent",
            badgeText: "Approval",
            iconType: "alert",
            timestamp: now.getTime(),
            onAction: onOpenSantriIzin
          });
        });

      safeIzin
        .filter(iz => iz && iz.status === "pending" && (pamongAsramas.includes(iz.asrama) || iz.asrama === userAsrama))
        .forEach(iz => {
          items.push({
            id: `pamong_musyrif_izin_${iz.id}`,
            title: `Ust. ${iz.musyrifName} (${iz.asrama})`,
            message: `Pengajuan izin ${iz.category} (${iz.startDate} s/d ${iz.endDate})`,
            time: "Izin Musyrif",
            category: "asrama",
            priority: "urgent",
            badgeText: "Izin Musyrif",
            iconType: "alert",
            timestamp: now.getTime(),
            onAction: onOpenIzinMusyrif
          });
        });

      scopedMusyrifs.forEach(m => {
        const rec = recordsMap[`${m.id}_${todayStr}`];
        const locStr = formatLocationShort(m.asrama);
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `pamong_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh ${locStr} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
            timestamp: now.getTime(),
            onAction: () => onGoTo("rekap")
          });
        }
        if (currentHour >= 18 && !rec?.maghrib) {
          items.push({
            id: `pamong_no_maghrib_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Maghrib ${locStr} (Kamar ${m.kamar || "-"})`,
            time: "Malam ini",
            category: "presensi",
            priority: "warning",
            badgeText: "Belum Maghrib",
            iconType: "clock",
            timestamp: now.getTime(),
            onAction: () => onGoTo("rekap")
          });
        }

        const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
        if (logbook) {
          const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
          items.push({
            id: `pamong_logbook_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: detail.message,
            time: detail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Logbook",
            iconType: "check",
            timestamp: detail.timestamp,
            onAction: onOpenLogbook
          });
        }
        const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
        if (mutabaah) {
          const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now);
          items.push({
            id: `pamong_mutabaah_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: mDetail.message,
            time: mDetail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Mutaba'ah",
            iconType: "sparkles",
            timestamp: mDetail.timestamp,
            onAction: onOpenMutabaah
          });
        }
      });

      safeSantriSakit
        .filter(s => s && s.status === "dalam_perawatan" && (pamongAsramas.includes(s.asrama) || s.asrama === userAsrama))
        .forEach(s => {
          items.push({
            id: `pamong_sakit_${s.id}`,
            title: `${s.namaSantri} (${s.asrama})`,
            message: `Keluhan: ${s.keluhan} • Dirawat di: ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
            time: "Kesehatan",
            category: "santri",
            priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
            badgeText: s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "Sakit",
            iconType: "pulse",
            timestamp: parseTimeToTimestamp(s.date, now),
            onAction: onOpenSantriSakit
          });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ROLE: KOORDINATOR MUSYRIF
    // ─────────────────────────────────────────────────────────────────────────
    if (isKoordinatorMusyrif) {
      scopedMusyrifs.forEach(m => {
        const rec = recordsMap[`${m.id}_${todayStr}`];
        const locStr = formatLocationShort(m.asrama);
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `km_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh ${locStr} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
            timestamp: now.getTime(),
            onAction: () => onGoTo("rekap")
          });
        }
      });

      safeIzin
        .filter(iz => iz && iz.status === "pending")
        .forEach(iz => {
          items.push({
            id: `km_izin_pending_${iz.id}`,
            title: `Ust. ${iz.musyrifName}`,
            message: `Pengajuan izin ${iz.category} (${iz.startDate} s/d ${iz.endDate}) • ${iz.asrama}`,
            time: "Review",
            category: "asrama",
            priority: "urgent",
            badgeText: "Izin Musyrif",
            iconType: "alert",
            timestamp: now.getTime(),
            onAction: onOpenIzinMusyrif
          });
        });

      scopedMusyrifs.forEach((m, idx) => {
        const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
        if (logbook) {
          const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
          items.push({
            id: `km_logbook_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: detail.message,
            time: detail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Logbook",
            iconType: "check",
            timestamp: detail.timestamp,
            onAction: onOpenLogbook
          });
        }
        const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
        if (mutabaah) {
          const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now, idx);
          items.push({
            id: `km_mutabaah_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: mDetail.message,
            time: mDetail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Mutaba'ah",
            iconType: "sparkles",
            timestamp: mDetail.timestamp,
            onAction: onOpenMutabaah
          });
        }
      });

      safeKegiatan.forEach(k => {
        if (k.date === todayStr || isToday(parseISO(k.date))) {
          const absentCount = Object.values(k.attendees || {}).filter(st => st === "alfa").length;
          if (absentCount > 0) {
            items.push({
              id: `km_kegiatan_absent_${k.id}`,
              title: `${k.activityTitle}`,
              message: `Terdapat ${absentCount} musyrif belum presensi (${k.asrama || "Asrama"})`,
              time: "Hari ini",
              category: "asrama",
              priority: "warning",
              badgeText: "Rapat",
              iconType: "alert",
              timestamp: now.getTime(),
              onAction: onOpenKegiatan
            });
          }
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. ROLE: KAUR KIS
    // ─────────────────────────────────────────────────────────────────────────
    if (isKaurKis) {
      scopedMusyrifs.forEach(m => {
        const rec = recordsMap[`${m.id}_${todayStr}`];
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `kis_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum menginput presensi Shalat Subuh berjamaah (${m.asrama})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Disiplin",
            iconType: "clock",
            onAction: () => onGoTo("rekap")
          });
        }
      });

      safeSantriSakit
        .filter(s => s && s.status === "dalam_perawatan" && (s.lokasiPerawatan === "rs_pku" || s.lokasiPerawatan === "uks"))
        .forEach(s => {
          items.push({
            id: `kis_sakit_${s.id}`,
            title: `${s.namaSantri} (${s.asrama})`,
            message: `Keluhan: ${s.keluhan} • Dirawat di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "UKS"}`,
            time: "Kesehatan",
            category: "santri",
            priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
            badgeText: s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "UKS",
            iconType: "pulse",
            onAction: onOpenSantriSakit
          });
        });

      safeSantriIzin
        .filter(iz => iz && (iz.statusPKM === "di_luar" || (iz as any).status === "di_luar"))
        .forEach(iz => {
          items.push({
            id: `kis_diluar_${iz.id}`,
            title: `${iz.namaSantri} (${iz.asrama})`,
            message: `Sedang di luar (${iz.tujuanLokasi}) • Batas kembali: ${iz.jamKembaliRencana || "17:00"} WIB`,
            time: "PKM",
            category: "santri",
            priority: "info",
            badgeText: "PKM",
            iconType: "building",
            onAction: onOpenSantriIzin
          });
        });

      scopedMusyrifs.forEach((m, idx) => {
        const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
        if (logbook) {
          const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
          items.push({
            id: `kis_logbook_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: detail.message,
            time: detail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Logbook",
            iconType: "check",
            timestamp: detail.timestamp,
            onAction: onOpenLogbook
          });
        }
        const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
        if (mutabaah) {
          const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now, idx);
          items.push({
            id: `kis_mutabaah_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: mDetail.message,
            time: mDetail.time,
            category: "asrama",
            priority: "success",
            badgeText: "Mutaba'ah",
            iconType: "sparkles",
            timestamp: mDetail.timestamp,
            onAction: onOpenMutabaah
          });
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. ROLE: WADIR 4
    // ─────────────────────────────────────────────────────────────────────────
    if (isWadir4) {
      safeSantriIzin
        .filter(iz => iz && (iz.statusApproval === "pending_wadir" || iz.jenisIzin === "pulang_menginap"))
        .forEach(iz => {
          items.push({
            id: `wadir_izin_khusus_${iz.id}`,
            title: `${iz.namaSantri} (${iz.kelas || iz.asrama})`,
            message: `Disposisi izin khusus: ${iz.tujuanLokasi} (${iz.keperluan})`,
            time: "Wadir",
            category: "santri",
            priority: "urgent",
            badgeText: "Disposisi",
            iconType: "alert",
            onAction: onOpenSantriIzin
          });
        });

      safeSantriSakit
        .filter(s => s && s.status === "dalam_perawatan" && s.lokasiPerawatan === "rs_pku")
        .forEach(s => {
          items.push({
            id: `wadir_rs_${s.id}`,
            title: `${s.namaSantri} (${s.asrama})`,
            message: `Laporan Rawat Inap RS PKU Muhammadiyah. Keluhan: "${s.keluhan}".`,
            time: "RS PKU",
            category: "santri",
            priority: "urgent",
            badgeText: "RS PKU",
            iconType: "pulse",
            onAction: onOpenSantriSakit
          });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PUBLIC / GUEST FALLBACK
    // ─────────────────────────────────────────────────────────────────────────
    if (!authUser) {
      items.push({
        id: "public_welcome_info",
        title: "Portal Presensi Madrasah Mu'allimin",
        message: "Masuk dengan akun Google Madrasah atau NBM untuk akses data lengkap",
        time: "Publik",
        category: "system",
        priority: "info",
        badgeText: "Akun",
        iconType: "sparkles",
        onAction: () => onGoTo("dashboard")
      });
    }

    return items;
}

export const PageNotifikasi: React.FC<PageNotifikasiProps> = ({
  onBack,
  authUser,
  musyrifList = [],
  recordsMap = {},
  santriSakitList = [],
  santriIzinList = [],
  izinList = [],
  kegiatanRecords = [],
  logbookData = {},
  mutabaahData = {},
  now = new Date(),
  onGoTo,
  onOpenSantriSakit,
  onOpenSantriIzin,
  onOpenIzinMusyrif,
  onOpenKegiatan,
  onOpenLogbook,
  onOpenMutabaah,
  onOpenAlarm,
  onOpenCloudSync
}) => {
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() => getReadNotificationMap());

  useEffect(() => {
    const handleSync = () => {
      setReadIds(getReadNotificationMap());
    };
    window.addEventListener("presensi_notif_read_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("presensi_notif_read_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Compile Dynamic Individual Notifications by Specific Role
  const notifications = useMemo(() => {
    return buildSystemNotificationItems({
      authUser,
      musyrifList,
      recordsMap,
      santriSakitList,
      santriIzinList,
      izinList,
      kegiatanRecords,
      logbookData,
      mutabaahData,
      now,
      onGoTo,
      onOpenSantriSakit,
      onOpenSantriIzin,
      onOpenIzinMusyrif,
      onOpenKegiatan,
      onOpenLogbook,
      onOpenMutabaah
    });
  }, [
    authUser, musyrifList, recordsMap, santriSakitList, santriIzinList,
    izinList, kegiatanRecords, logbookData, mutabaahData, now,
    onGoTo, onOpenSantriSakit, onOpenSantriIzin, onOpenIzinMusyrif,
    onOpenKegiatan, onOpenLogbook, onOpenMutabaah
  ]);

  // Mark all as read
  const handleMarkAllAsRead = (ids: string[]) => {
    triggerHaptic("medium");
    const updated = markNotificationsAsRead(ids);
    setReadIds(updated);
  };

  const handleItemClick = (item: SystemNotificationItem) => {
    triggerHaptic("light");
    if (!readIds[item.id]) {
      const updated = markNotificationsAsRead([item.id]);
      setReadIds(updated);
    }
    item.onAction();
  };

  // Filtered Notifications based on selected tab & sorted NEWEST on TOP
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeTab === "unread") list = list.filter(n => !readIds[n.id]);
    else if (activeTab === "presensi") list = list.filter(n => n.category === "presensi");
    else if (activeTab === "santri") list = list.filter(n => n.category === "santri");
    else if (activeTab === "asrama") list = list.filter(n => n.category === "asrama" || n.category === "system");

    return [...list].sort((a, b) => {
      // 1. Newest timestamp first
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      if (timeA !== timeB) return timeB - timeA;

      // 2. Unread items on top
      const isUnreadA = !readIds[a.id] ? 1 : 0;
      const isUnreadB = !readIds[b.id] ? 1 : 0;
      if (isUnreadA !== isUnreadB) return isUnreadB - isUnreadA;

      // 3. Priority weight
      const prioWeight = { urgent: 4, warning: 3, success: 2, info: 1 };
      return (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0);
    });
  }, [notifications, activeTab, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds[n.id]).length;
  }, [notifications, readIds]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-20">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top row: back button + bell icon + title + actions */}
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
              <Bell className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                  Pusat Notifikasi
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0 font-mono">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {authUser ? `${authUser.name.split(" ")[0]} (${authUser.role.replace(/_/g, " ")})` : "Update data keasramaan"}
              </p>
            </div>
          </div>

          {/* Right Action Floating Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => handleMarkAllAsRead(notifications.map(n => n.id))}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all flex items-center gap-1 shadow-2xs active:scale-95 text-emerald-700 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100/80"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Tandai Dibaca</span>
              </button>
            )}

            {/* Sound / Alarm button */}
            <button
              type="button"
              onClick={onOpenAlarm}
              title="Pengaturan Alarm & Notifikasi Shalat"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 shadow-2xs flex items-center justify-center transition-all active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integrated Segmented Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/80">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("all");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Semua</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono font-bold">
              {notifications.length}
            </span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("unread");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "unread"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-600 hover:bg-rose-50/80"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-200" />
              <span>Belum Dibaca</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                activeTab === "unread" ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-800"
              }`}>
                {unreadCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("presensi");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "presensi"
                ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Presensi Shalat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("santri");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "santri"
                ? "bg-white text-sky-800 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Santri & Izin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("asrama");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "asrama"
                ? "bg-white text-amber-800 shadow-xs ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <span>Asrama & Rapat</span>
          </button>
        </div>
      </div>

      {/* 2. Main Unified Feed Card */}
      {filteredNotifications.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl ring-1 ring-slate-200/70 border border-slate-100/50 shadow-sm p-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-sm">Semua Sudah Terpantau</p>
          <p className="text-xs text-slate-400 mt-0.5">Tidak ada notifikasi baru pada kategori ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 border border-slate-100/50 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.map((item) => {
            const isRead = !!readIds[item.id];
            const isUrgent = item.priority === "urgent";
            const isWarning = item.priority === "warning";
            const isSuccess = item.priority === "success";

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group flex items-center gap-3 px-4 py-3 sm:py-3.5 transition-all cursor-pointer select-none ${
                  !isRead
                    ? "bg-white hover:bg-emerald-50/30"
                    : "bg-slate-50/50 hover:bg-slate-50 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Left Icon Indicator */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUrgent
                      ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                      : isWarning
                      ? "bg-amber-50 text-amber-600 border border-amber-200/60"
                      : isSuccess
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                      : "bg-sky-50 text-sky-600 border border-sky-200/60"
                  }`}
                >
                  {item.category === "presensi" ? (
                    <Clock className="w-4 h-4" />
                  ) : item.category === "santri" ? (
                    <HeartPulse className="w-4 h-4" />
                  ) : item.category === "asrama" ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>

                {/* Body Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.badgeText && (
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 border ${
                            isUrgent
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isWarning
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isSuccess
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {item.badgeText}
                        </span>
                      )}
                      <span className={`text-xs sm:text-sm font-bold truncate ${!isRead ? "text-slate-800" : "text-slate-600"}`}>
                        {item.title}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-500 truncate leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
