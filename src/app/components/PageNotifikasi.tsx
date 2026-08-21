import React, { useState, useMemo } from "react";
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

const STORAGE_KEY_READ_NOTIFS = "presensi_notification_reads_v7";

export const PageNotifikasi: React.FC<PageNotifikasiProps> = ({
  onBack,
  authUser,
  musyrifList,
  recordsMap,
  santriSakitList,
  santriIzinList,
  izinList,
  kegiatanRecords,
  logbookData = {},
  mutabaahData = {},
  now,
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
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_READ_NOTIFS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const todayStr = useMemo(() => format(now, "yyyy-MM-dd"), [now]);
  const currentHour = now.getHours();

  // Mark all as read
  const handleMarkAllAsRead = (ids: string[]) => {
    triggerHaptic("medium");
    const updated = { ...readIds };
    ids.forEach(id => {
      updated[id] = true;
    });
    setReadIds(updated);
    try {
      localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(updated));
    } catch {}
  };

  const handleItemClick = (item: SystemNotificationItem) => {
    triggerHaptic("light");
    if (!readIds[item.id]) {
      const updated = { ...readIds, [item.id]: true };
      setReadIds(updated);
      try {
        localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(updated));
      } catch {}
    }
    item.onAction();
  };

  // Compile Dynamic Individual Notifications by Specific Role
  const notifications = useMemo(() => {
    const items: SystemNotificationItem[] = [];

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
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `kg_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh • ${m.asrama} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
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
            message: `Keluhan: ${s.keluhan} • Dirawat di: ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
            time: "Kesehatan",
            category: "santri",
            priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
            badgeText: s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "Sakit",
            iconType: "pulse",
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
            message: `Izin: ${iz.tujuanLokasi} (${iz.keperluan}) • Menunggu persetujuan Pamong`,
            time: "Pamong",
            category: "santri",
            priority: "urgent",
            badgeText: "Approval",
            iconType: "alert",
            onAction: onOpenSantriIzin
          });
        });

      safeIzin
        .filter(iz => iz && iz.status === "pending" && (pamongAsramas.includes(iz.asrama) || iz.asrama === userAsrama))
        .forEach(iz => {
          items.push({
            id: `pamong_musyrif_izin_${iz.id}`,
            title: `Ust. ${iz.musyrifName} (${iz.asrama})`,
            message: `Pengajuan izin ${iz.category} (${iz.startDate} s/d ${iz.endDate}) • Alasan: "${iz.reason}"`,
            time: "Izin Musyrif",
            category: "asrama",
            priority: "urgent",
            badgeText: "Izin Musyrif",
            iconType: "alert",
            onAction: onOpenIzinMusyrif
          });
        });

      scopedMusyrifs.forEach(m => {
        const rec = recordsMap[`${m.id}_${todayStr}`];
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `pamong_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh • ${m.asrama} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
            onAction: () => onGoTo("rekap")
          });
        }
        if (currentHour >= 18 && !rec?.maghrib) {
          items.push({
            id: `pamong_no_maghrib_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Maghrib • ${m.asrama} (Kamar ${m.kamar || "-"})`,
            time: "Malam ini",
            category: "presensi",
            priority: "warning",
            badgeText: "Belum Maghrib",
            iconType: "clock",
            onAction: () => onGoTo("rekap")
          });
        }

        const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
        if (logbook) {
          items.push({
            id: `pamong_logbook_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Telah menyelesaikan Jurnal Logbook harian keasramaan (${m.asrama})`,
            time: "Hari ini",
            category: "asrama",
            priority: "success",
            badgeText: "Logbook",
            iconType: "check",
            onAction: onOpenLogbook
          });
        } else if (currentHour >= 19) {
          items.push({
            id: `pamong_logbook_missing_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum mengisi Jurnal Logbook malam ini • ${m.asrama}`,
            time: "Malam ini",
            category: "asrama",
            priority: "warning",
            badgeText: "Logbook Kosong",
            iconType: "clock",
            onAction: onOpenLogbook
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
        if (currentHour >= 5 && !rec?.subuh) {
          items.push({
            id: `km_no_subuh_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Belum presensi Subuh • ${m.asrama} (Kamar ${m.kamar || "-"})`,
            time: "Pagi ini",
            category: "presensi",
            priority: "urgent",
            badgeText: "Belum Subuh",
            iconType: "clock",
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
            onAction: onOpenIzinMusyrif
          });
        });

      scopedMusyrifs.forEach(m => {
        const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
        if (logbook) {
          items.push({
            id: `km_logbook_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Telah mengisi Jurnal Logbook patroli keasramaan (${m.asrama})`,
            time: "Hari ini",
            category: "asrama",
            priority: "success",
            badgeText: "Logbook",
            iconType: "check",
            onAction: onOpenLogbook
          });
        }
        const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
        if (mutabaah) {
          items.push({
            id: `km_mutabaah_done_${m.id}_${todayStr}`,
            title: `Ust. ${m.name}`,
            message: `Telah memperbarui amalan harian Mutaba'ah (${m.asrama})`,
            time: "Hari ini",
            category: "asrama",
            priority: "success",
            badgeText: "Mutaba'ah",
            iconType: "sparkles",
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
  }, [
    authUser, musyrifList, recordsMap, santriSakitList, santriIzinList, 
    izinList, kegiatanRecords, logbookData, mutabaahData, todayStr, currentHour, now,
    onGoTo, onOpenSantriSakit, onOpenSantriIzin, onOpenIzinMusyrif, 
    onOpenKegiatan, onOpenLogbook, onOpenMutabaah
  ]);

  // Filtered Notifications based on selected tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") return notifications.filter(n => !readIds[n.id]);
    if (activeTab === "presensi") return notifications.filter(n => n.category === "presensi");
    if (activeTab === "santri") return notifications.filter(n => n.category === "santri");
    if (activeTab === "asrama") return notifications.filter(n => n.category === "asrama" || n.category === "system");
    return notifications;
  }, [notifications, activeTab, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds[n.id]).length;
  }, [notifications, readIds]);

  return (
    <div className="w-full pb-28">
      {/* Seamless Containerless Header — Matching Dashboard & Other Pages */}
      <div className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          
          {/* Left Title & Circular Back Button */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 shadow-xs flex items-center justify-center transition-all shrink-0 active:scale-95"
              title="Kembali ke Dasbor"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
                  Pusat Notifikasi
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0 shadow-2xs">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {authUser ? `${authUser.name.split(" ")[0]} (${authUser.role.replace(/_/g, " ")})` : "Update data keasramaan"}
              </p>
            </div>
          </div>

          {/* Right Action Floating Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mark All Read Button */}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => handleMarkAllAsRead(notifications.map(n => n.id))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-emerald-50 text-emerald-800 shadow-2xs transition-all active:scale-95"
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
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-amber-50 hover:text-amber-700 text-slate-600 shadow-xs flex items-center justify-center transition-all active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Segmented Filter Control Container (Wadah) */}
        <div className="mt-3.5 p-1 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("all");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Semua ({notifications.length})
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("unread");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 hover:bg-rose-50/80"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Belum Dibaca ({unreadCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("presensi");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "presensi"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Presensi Shalat
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("santri");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "santri"
                ? "bg-sky-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Santri & Izin
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("asrama");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "asrama"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Asrama & Rapat
          </button>
        </div>
      </div>

      {/* Main Unified Feed Card */}
      <main className="max-w-2xl mx-auto px-4 pt-2">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">Semua Sudah Terpantau</p>
            <p className="text-xs text-slate-400 mt-0.5">Tidak ada notifikasi baru pada kategori ini.</p>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs divide-y divide-slate-100/90 overflow-hidden">
            {filteredNotifications.map((item) => {
              const isRead = !!readIds[item.id];
              const isUrgent = item.priority === "urgent";
              const isWarning = item.priority === "warning";
              const isSuccess = item.priority === "success";

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 transition-colors cursor-pointer select-none ${
                    !isRead
                      ? "bg-white hover:bg-emerald-50/40"
                      : "bg-slate-50/40 hover:bg-slate-50 opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Left Subtle Icon Avatar */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      isUrgent
                        ? "bg-rose-50 text-rose-600"
                        : isWarning
                        ? "bg-amber-50 text-amber-600"
                        : isSuccess
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-sky-50 text-sky-600"
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
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {item.badgeText && (
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                              isUrgent
                                ? "bg-rose-50 text-rose-700 border border-rose-200/70"
                                : isWarning
                                ? "bg-amber-50 text-amber-700 border border-amber-200/70"
                                : isSuccess
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                : "bg-sky-50 text-sky-700 border border-sky-200/70"
                            }`}
                          >
                            {item.badgeText}
                          </span>
                        )}
                        <span className={`text-xs sm:text-sm font-bold truncate ${!isRead ? "text-slate-900" : "text-slate-700"}`}>
                          {item.title}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                        {item.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate leading-snug">
                      {item.message}
                    </p>
                  </div>

                  {/* Right Indicator (Unread dot or chevron) */}
                  <div className="shrink-0 flex items-center gap-1 pl-1">
                    {!isRead ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs block animate-pulse" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
