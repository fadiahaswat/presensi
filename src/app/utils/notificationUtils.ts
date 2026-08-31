import { format, isToday, parseISO } from "date-fns";
import { getPamongAssignedAsramas, isFieldMusyrif } from "./roleAccessUtils";
import { SantriSakitRecord } from "../components/SantriSakitModal";
import { SantriIzinRecord } from "../types/izinSantri";
import { IzinRequest } from "../components/IzinPengajuanModal";
import { KegiatanRecord } from "../components/KegiatanAsramaModal";
import { SantriChangeRequest } from "../types/santriRequest";

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
  iconType?: string;
  timestamp?: number;
}

export const CUSTOM_CALL_NAMES: Record<string, string> = {
  // ─── Non-Musyrif (Admin, Pamong, Direksi) ───
  "ahmad salim": "Salim",
  "muhammad shaleh": "Shaleh",
  "andi aqillah fadia haswat": "Andi Aqillah",
  "galang putra muhammady": "Galang",
  "aulia abdan idza shalla": "Abdan",
  "anang fathurrahman": "Anang",
  "inggit prabowo": "Inggit",
  "rais yudhistira": "Rais",
  "muh ahnaf lubab": "Ahnaf",
  "m ismail marzuq": "Ismail",
  "ariel amarta dzikrillah": "Dzikril",

  // ─── Musyrif ───
  "rifqi adha pradipa": "Dipa",
  "mukti abdul ghofur": "Ghofur",
  "ayyasy kaizen birruna": "Kaizen",
  "hafidz nawaf fauzil adhim": "Fauzil",
  "mukti abdul ghofar": "Ghofar",
  "fadhl maula fawwas": "Fawwas",
  "muhammad syaqib ridho asy syafiq": "Ridho",
  "muhammad islam al ghozy": "Ghozy",
  "ananda hasan putra rahman": "Hasan",
  "rayhan bachtiar dwi bayu baskara": "Bachtiar",
  "hilmy muwafaq adman": "'Adman",
  "rahmat khoirul anwar": "Anwar",
  "muhammad rafi feriansyah": "Rafi Feri",
  "tajulqayyim royyan": "Royyan",
  "muhammad atqonuddinillah": "Atqon",
  "nur affan muarif": "Affan",
  "ahmad arif kurniawan": "Arif Kurniawan",
  "muhammad fabian fath anarda": "Fabian",
  "muhammad fabian fath ananda": "Fabian",
  "muhammad rafi": "M. Rafi",
  "muhammad rafi umar rais": "Rafi Umar",
};

export function getMusyrifCallName(rawName?: string | null): string {
  if (!rawName) return "";
  let clean = rawName.split(",")[0].trim();
  clean = clean.replace(/\b(S\.Pd|S\.Sos|Lc|S\.s|S\.T|S\.Kom|M\.Pd|M\.Ag|M\.A|S\.Ag|Ph\.D|S\.Psi|S\.Th\.I)\b\.?/gi, "").trim();
  clean = clean.replace(/^(ustadz|ustaz|ustad|ust\.|ust)\s+/i, "").trim();

  // Check custom alias dictionary for preferred nickname (normalize non-alphanumeric chars for flexible matching)
  const normalizedKey = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  for (const [key, val] of Object.entries(CUSTOM_CALL_NAMES)) {
    const normalizedDictKey = key.replace(/[^a-z0-9\s]/g, "");
    if (normalizedKey === normalizedDictKey || normalizedKey.includes(normalizedDictKey) || normalizedDictKey.includes(normalizedKey)) {
      return val;
    }
  }

  const andiMatch = clean.match(/^andi\s+([^\s]+)/i);
  if (andiMatch) return `Andi ${andiMatch[1]}`;
  let previous = "";
  while (previous !== clean && /^(muhammad|muhamad|mohammad|mohamad|muh\.|muh|m\.|md\.|moh\.|moh|ahmad|achmad|akhmad|ah\.)\s+/i.test(clean)) {
    previous = clean;
    clean = clean.replace(/^(muhammad|muhamad|mohammad|mohamad|muh\.|muh|m\.|md\.|moh\.|moh|ahmad|achmad|akhmad|ah\.)\s+/i, "").trim();
  }
  const words = clean.split(/\s+/).filter(Boolean);
  return words[0] || rawName.split(/\s+/)[0] || "";
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
  oprakJumat: "Telah mengoprak-oprak sholat Jum'at",
  kerjaBakti: "Telah mendampingi kerja bakti asrama",
  oprakAshar: "Telah mengoprak-oprak sholat Ashar",
  oprakMandi: "Telah mengoprak-oprak mandi sore",
  sisirMaghrib: "Telah menyisir sholat Maghrib",
  bakdaMaghrib: "Telah mendampingi bakda Maghrib",
  belajarMalam: "Telah mengawasi belajar malam",
  cekTidur: "Telah mengecek jam tidur malam",
};

export const LOGBOOK_TASK_ICONS: Record<string, string> = {
  tahajjud: "moon",
  bakdaSubuh: "sunrise",
  cekSakit: "pulse",
  sisirSekolah: "school",
  jagaGerbang: "door",
  oprakJumat: "sun",
  kerjaBakti: "sparkles",
  oprakAshar: "sun",
  oprakMandi: "droplet",
  sisirMaghrib: "sunset",
  bakdaMaghrib: "book",
  belajarMalam: "book",
  cekTidur: "bed",
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
      timestamp: refDate.getTime(),
      iconType: "check",
      taskKey: "tahajjud"
    };
  }

  const completedKeys = Object.keys(LOGBOOK_TASK_ACTION_NAMES).filter(
    k => logbook[k]?.done || logbook[k]?.completedAt
  );

  if (completedKeys.length === 0) {
    return {
      message: `Telah mengisi Jurnal Logbook ${locStr}`.trim(),
      time: "Hari ini",
      timestamp: refDate.getTime(),
      iconType: "check",
      taskKey: "tahajjud"
    };
  }

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
  const taskIcon = LOGBOOK_TASK_ICONS[latestTaskKey] || "check";

  return {
    message: actionText,
    time: formattedTime,
    timestamp: taskTimestamp,
    iconType: taskIcon,
    taskKey: latestTaskKey
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

  if (!mutabaah || typeof mutabaah !== "object") {
    return {
      message: `Telah memperbarui Mutaba'ah yaumiyah ${locStr}`.trim(),
      time: formattedTime,
      timestamp,
      iconType: "sparkles"
    };
  }

  const completedActivities: { label: string; icon: string }[] = [];
  if (mutabaah.tahajjud) completedActivities.push({ label: "Telah melaksanakan Tahajjud", icon: "moon" });
  if (mutabaah.witir || mutabaah.rawatib) completedActivities.push({ label: "Telah shalat Witir", icon: "sparkles" });
  if (mutabaah.dzikirPagi) completedActivities.push({ label: "Telah membaca Dzikir Pagi", icon: "sunrise" });
  if (mutabaah.dhuha) completedActivities.push({ label: "Telah shalat Dhuha", icon: "sun" });
  if (mutabaah.infaq) completedActivities.push({ label: "Telah berinfaq / sedekah", icon: "sparkles" });
  if (mutabaah.tilawahPages && Number(mutabaah.tilawahPages) > 0) {
    completedActivities.push({ label: `Telah tilawah Al-Qur'an (${mutabaah.tilawahPages} lembar)`, icon: "book" });
  }
  if (mutabaah.dzikirPetang) completedActivities.push({ label: "Telah membaca Dzikir Petang", icon: "sunset" });
  if (mutabaah.puasaSunnah) completedActivities.push({ label: "Telah menunaikan Puasa Sunnah", icon: "sparkles" });
  if (mutabaah.muthalaah) completedActivities.push({ label: "Telah muthala'ah kitab", icon: "book" });

  if (completedActivities.length === 0) {
    return {
      message: `Telah memperbarui Mutaba'ah yaumiyah ${locStr}`.trim(),
      time: formattedTime,
      timestamp,
      iconType: "sparkles"
    };
  }

  const first = completedActivities[0];
  const othersCount = completedActivities.length - 1;
  const message = othersCount > 0
    ? `${first.label} (+${othersCount} amalan) ${locStr}`.trim()
    : `${first.label} ${locStr}`.trim();

  return {
    message,
    time: formattedTime,
    timestamp,
    iconType: first.icon
  };
}

export function buildSystemNotificationItems({
  authUser,
  musyrifList = [],
  recordsMap = {},
  santriSakitList = [],
  santriIzinList = [],
  santriRequests = [],
  izinList = [],
  kegiatanRecords = [],
  logbookData = {},
  mutabaahData = {},
  now = new Date(),
  onGoTo = () => {},
  onOpenSantriSakit = () => {},
  onOpenSantriIzin = () => {},
  onOpenDataSantri = () => {},
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
  santriRequests?: SantriChangeRequest[];
  izinList?: IzinRequest[];
  kegiatanRecords?: KegiatanRecord[];
  logbookData?: Record<string, any>;
  mutabaahData?: Record<string, any>;
  now?: Date;
  onGoTo?: (page: any) => void;
  onOpenSantriSakit?: (santriId?: string) => void;
  onOpenSantriIzin?: (izinId?: string) => void;
  onOpenDataSantri?: () => void;
  onOpenIzinMusyrif?: (izinId?: string) => void;
  onOpenKegiatan?: (kegiatanId?: string) => void;
  onOpenLogbook?: (musyrifId?: string, date?: string, taskKey?: string) => void;
  onOpenMutabaah?: (musyrifId?: string, date?: string) => void;
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
  const isAdmin = role === "admin" || role === "superadmin";

  const userMusyrifProfile = (musyrifList || []).find(m => m.id === authUser?.musyrifId || m.name === authUser?.name);
  const userAsrama = authUser?.asrama || userMusyrifProfile?.asrama || "";
  const pamongAsramas = isPamong ? getPamongAssignedAsramas(authUser) : [];

  const safeMusyrifList = Array.isArray(musyrifList) ? musyrifList : [];
  const safeSantriSakit = Array.isArray(santriSakitList) ? santriSakitList : [];
  const safeSantriIzin = Array.isArray(santriIzinList) ? santriIzinList : [];
  const safeSantriRequests = Array.isArray(santriRequests) ? santriRequests : [];
  const safeIzin = Array.isArray(izinList) ? izinList : [];
  const safeKegiatan = Array.isArray(kegiatanRecords) ? kegiatanRecords : [];

  const scopedMusyrifs = isMusyrif
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (m.id === userMusyrifProfile?.id || (m.asrama === userAsrama && m.asrama)))
    : isKoordinatorGedung
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (m.asrama === userAsrama || m.tingkat === userMusyrifProfile?.tingkat))
    : isPamong
    ? safeMusyrifList.filter(m => isFieldMusyrif(m) && (pamongAsramas.includes(m.asrama) || m.asrama === userAsrama))
    : safeMusyrifList.filter(isFieldMusyrif);

  // A. PRESENSI SHALAT ANOMALIES
  scopedMusyrifs.forEach(m => {
    const rec = recordsMap[`${m.id}_${todayStr}`];
    if (rec) {
      const subuhTimeStr = rec.subuhTimestamp || `${todayStr}T04:45:00`;
      const subuhTimestamp = parseTimeToTimestamp(subuhTimeStr, now);
      const subuhTimeFormatted = formatNotificationRelativeTime(subuhTimeStr, "04.45", now);

      if (rec.subuh === "izin") {
        items.push({
          id: `presensi_subuh_izin_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Izin pada Shalat Subuh ${formatLocationShort(m.asrama)}`,
          time: subuhTimeFormatted,
          category: "presensi",
          priority: "warning",
          iconType: "file",
          timestamp: subuhTimestamp,
          onAction: () => onGoTo("subuh")
        });
      } else if (rec.subuh === "sakit") {
        items.push({
          id: `presensi_subuh_sakit_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Sakit pada pelaksanaan Shalat Subuh ${formatLocationShort(m.asrama)}`,
          time: subuhTimeFormatted,
          category: "presensi",
          priority: "urgent",
          iconType: "pulse",
          timestamp: subuhTimestamp,
          onAction: () => onGoTo("subuh")
        });
      } else if (rec.subuh === "alfa") {
        items.push({
          id: `presensi_subuh_alfa_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Alpa (tidak hadir) pada Shalat Subuh ${formatLocationShort(m.asrama)}`,
          time: subuhTimeFormatted,
          category: "presensi",
          priority: "urgent",
          iconType: "door",
          timestamp: subuhTimestamp,
          onAction: () => onGoTo("subuh")
        });
      } else if (rec.subuh === "terlambat") {
        items.push({
          id: `presensi_subuh_terlambat_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Hadir terlambat pada Shalat Subuh ${formatLocationShort(m.asrama)}`,
          time: subuhTimeFormatted,
          category: "presensi",
          priority: "warning",
          iconType: "clock",
          timestamp: subuhTimestamp,
          onAction: () => onGoTo("subuh")
        });
      }

      const maghribTimeStr = rec.maghribTimestamp || `${todayStr}T18:05:00`;
      const maghribTimestamp = parseTimeToTimestamp(maghribTimeStr, now);
      const maghribTimeFormatted = formatNotificationRelativeTime(maghribTimeStr, "18.05", now);

      if (rec.maghrib === "izin") {
        items.push({
          id: `presensi_maghrib_izin_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Izin pada Shalat Maghrib ${formatLocationShort(m.asrama)}`,
          time: maghribTimeFormatted,
          category: "presensi",
          priority: "warning",
          iconType: "file",
          timestamp: maghribTimestamp,
          onAction: () => onGoTo("maghrib")
        });
      } else if (rec.maghrib === "sakit") {
        items.push({
          id: `presensi_maghrib_sakit_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Sakit pada pelaksanaan Shalat Maghrib ${formatLocationShort(m.asrama)}`,
          time: maghribTimeFormatted,
          category: "presensi",
          priority: "urgent",
          iconType: "pulse",
          timestamp: maghribTimestamp,
          onAction: () => onGoTo("maghrib")
        });
      } else if (rec.maghrib === "alfa") {
        items.push({
          id: `presensi_maghrib_alfa_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Alpa (tidak hadir) pada Shalat Maghrib ${formatLocationShort(m.asrama)}`,
          time: maghribTimeFormatted,
          category: "presensi",
          priority: "urgent",
          iconType: "door",
          timestamp: maghribTimestamp,
          onAction: () => onGoTo("maghrib")
        });
      } else if (rec.maghrib === "terlambat") {
        items.push({
          id: `presensi_maghrib_terlambat_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: `Hadir terlambat pada Shalat Maghrib ${formatLocationShort(m.asrama)}`,
          time: maghribTimeFormatted,
          category: "presensi",
          priority: "warning",
          iconType: "clock",
          timestamp: maghribTimestamp,
          onAction: () => onGoTo("maghrib")
        });
      }
    }
  });

  // B. SANTRI REQUESTS
  if (isPamong || isKoordinatorMusyrif || isAdmin) {
    safeSantriRequests
      .filter(r => r && r.status === "pending")
      .forEach(req => {
        const reqTime = req.requestedAt || now.toISOString();
        items.push({
          id: `santri_request_pending_${req.id}`,
          title: `Ust. ${getMusyrifCallName(req.requestedBy?.name)}`,
          message: `Permohonan edit database: ${req.santriNama} (${req.reason || "Pembaruan data"})`,
          time: formatNotificationRelativeTime(reqTime, "Hari ini", now),
          category: "santri",
          priority: "urgent",
          iconType: "file",
          timestamp: parseTimeToTimestamp(reqTime, now),
          onAction: () => onOpenDataSantri ? onOpenDataSantri() : onGoTo("data-santri")
        });
      });
  }

  // 1. ROLE: MUSYRIF
  if (isMusyrif && userMusyrifProfile && isFieldMusyrif(userMusyrifProfile)) {
    safeSantriSakit
      .filter(s => s && s.status === "dalam_perawatan" && (s.asrama === userAsrama || s.musyrifId === userMusyrifProfile.id))
      .forEach(s => {
        items.push({
          id: `musyrif_santri_sakit_${s.id}`,
          title: `${s.namaSantri} (Kamar ${s.kamar || "-"})`,
          message: `Sakit: ${s.keluhan} • Di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
          time: formatNotificationRelativeTime(s.date, "Hari ini", now),
          category: "santri",
          priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
          iconType: s.lokasiPerawatan === "rs_pku" ? "pulse" : "stethoscope",
          timestamp: parseTimeToTimestamp(s.date, now),
          onAction: () => onOpenSantriSakit(s.id)
        });
      });

    safeSantriIzin
      .filter(iz => iz && iz.asrama === userAsrama)
      .forEach(iz => {
        const izTime = iz.tanggalPengajuan || (iz as any).createdAt || `${todayStr}T08:00:00`;
        if (iz.statusApproval === "pending_musyrif" || (iz as any).status === "pending_musyrif") {
          items.push({
            id: `musyrif_santri_izin_rec_${iz.id}`,
            title: `${iz.namaSantri} (Kamar ${iz.kamar || "-"})`,
            message: `Pengajuan izin: ${iz.tujuanLokasi} (${iz.keperluan}) • Butuh rekomendasi`,
            time: formatNotificationRelativeTime(izTime, "Hari ini", now),
            category: "santri",
            priority: "warning",
            iconType: "file",
            timestamp: parseTimeToTimestamp(izTime, now),
            onAction: () => onOpenSantriIzin(iz.id)
          });
        }
        if (iz.statusPKM === "di_luar" || (iz as any).status === "di_luar") {
          const outTime = iz.jamKeluar ? `${todayStr}T${iz.jamKeluar}:00` : izTime;
          items.push({
            id: `musyrif_santri_diluar_${iz.id}`,
            title: `${iz.namaSantri} (Sedang di Luar)`,
            message: `Lokasi: ${iz.tujuanLokasi} • Batas: ${iz.jamKembaliRencana || "17:00"} WIB`,
            time: formatNotificationRelativeTime(outTime, "Hari ini", now),
            category: "santri",
            priority: "warning",
            iconType: "navigation",
            timestamp: parseTimeToTimestamp(outTime, now),
            onAction: () => onOpenSantriIzin(iz.id)
          });
        }
      });

    safeSantriRequests
      .filter(r => r && (r.requestedBy?.id === userMusyrifProfile.id || r.requestedBy?.name === userMusyrifProfile.name))
      .forEach(req => {
        if (req.status === "approved") {
          items.push({
            id: `my_santri_request_approved_${req.id}`,
            title: `Data Santri Disetujui: ${req.santriNama}`,
            message: `Permohonan pembaruan data telah disetujui Pamong`,
            time: formatNotificationRelativeTime(req.reviewedAt || req.requestedAt, "Hari ini", now),
            category: "santri",
            priority: "success",
            iconType: "check",
            timestamp: parseTimeToTimestamp(req.reviewedAt || req.requestedAt, now),
            onAction: () => onOpenDataSantri ? onOpenDataSantri() : onGoTo("data-santri")
          });
        } else if (req.status === "rejected") {
          items.push({
            id: `my_santri_request_rejected_${req.id}`,
            title: `Data Santri Ditolak: ${req.santriNama}`,
            message: `Permohonan ditolak: ${req.reviewNotes || "Data tidak sesuai"}`,
            time: formatNotificationRelativeTime(req.reviewedAt || req.requestedAt, "Hari ini", now),
            category: "santri",
            priority: "warning",
            iconType: "file",
            timestamp: parseTimeToTimestamp(req.reviewedAt || req.requestedAt, now),
            onAction: () => onOpenDataSantri ? onOpenDataSantri() : onGoTo("data-santri")
          });
        }
      });

    safeIzin
      .filter(iz => iz && (iz.musyrifId === userMusyrifProfile.id || iz.musyrifName === userMusyrifProfile.name))
      .forEach(iz => {
        const izTime = iz.createdAt || iz.startDate || `${todayStr}T08:00:00`;
        if (iz.status === "pending") {
          items.push({
            id: `my_izin_pending_${iz.id}`,
            title: `Izin Pribadi: ${iz.category}`,
            message: `Tanggal: ${iz.startDate} s/d ${iz.endDate} • Menunggu persetujuan Pamong`,
            time: formatNotificationRelativeTime(izTime, "Hari ini", now),
            category: "asrama",
            priority: "info",
            iconType: "file",
            timestamp: parseTimeToTimestamp(izTime, now),
            onAction: () => onOpenIzinMusyrif(iz.id)
          });
        } else if (iz.status === "approved") {
          items.push({
            id: `my_izin_approved_${iz.id}`,
            title: `Izin Pribadi Disetujui: ${iz.category}`,
            message: `Permohonan izin tanggal ${iz.startDate} telah disetujui`,
            time: formatNotificationRelativeTime(izTime, "Hari ini", now),
            category: "asrama",
            priority: "success",
            iconType: "check",
            timestamp: parseTimeToTimestamp(izTime, now),
            onAction: () => onOpenIzinMusyrif(iz.id)
          });
        }
      });

    const myLogbook = logbookData[userMusyrifProfile.id]?.[todayStr] || logbookData[`${userMusyrifProfile.id}_${todayStr}`];
    if (currentHour >= 19 && !myLogbook) {
      items.push({
        id: `my_logbook_missing_${todayStr}`,
        title: `Jurnal Logbook Belum Diisi`,
        message: `Lengkapi catatan patroli malam dan kondisi santri kamar Anda`,
        time: formatNotificationRelativeTime(`${todayStr}T19:00:00`, "Malam ini", now),
        category: "asrama",
        priority: "warning",
        iconType: "bed",
        timestamp: parseTimeToTimestamp(`${todayStr}T19:00:00`, now),
        onAction: () => onOpenLogbook(userMusyrifProfile.id, todayStr)
      });
    }
  }

  // 2. ROLE: KOORDINATOR GEDUNG
  if (isKoordinatorGedung) {
    safeSantriSakit
      .filter(s => s && s.status === "dalam_perawatan" && (s.asrama === userAsrama || scopedMusyrifs.some(m => m.asrama === s.asrama)))
      .forEach(s => {
        items.push({
          id: `kg_sakit_${s.id}`,
          title: `${s.namaSantri} (${s.asrama})`,
          message: `Sakit: ${s.keluhan} • Di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : s.lokasiPerawatan === "uks" ? "UKS" : "Kamar"}`,
          time: formatNotificationRelativeTime(s.date, "Hari ini", now),
          category: "santri",
          priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
          iconType: s.lokasiPerawatan === "rs_pku" ? "pulse" : "stethoscope",
          timestamp: parseTimeToTimestamp(s.date, now),
          onAction: () => onOpenSantriSakit(s.id)
        });
      });
  }

  // 3. ROLE: PAMONG
  if (isPamong) {
    safeSantriIzin
      .filter(iz => iz && (iz.statusApproval === "pending_pamong" || (iz as any).status === "pending_pamong") && (pamongAsramas.includes(iz.asrama) || iz.asrama === userAsrama))
      .forEach(iz => {
        const izTime = iz.tanggalPengajuan || (iz as any).createdAt || `${todayStr}T08:00:00`;
        items.push({
          id: `pamong_santri_izin_${iz.id}`,
          title: `${iz.namaSantri} (${iz.kelas || iz.asrama})`,
          message: `Pengajuan izin ke ${iz.tujuanLokasi} (${iz.keperluan})`,
          time: formatNotificationRelativeTime(izTime, "Hari ini", now),
          category: "santri",
          priority: "urgent",
          iconType: "file",
          timestamp: parseTimeToTimestamp(izTime, now),
          onAction: () => onOpenSantriIzin(iz.id)
        });
      });

    safeIzin
      .filter(iz => iz && iz.status === "pending" && (pamongAsramas.includes(iz.asrama) || iz.asrama === userAsrama))
      .forEach(iz => {
        const izTime = iz.createdAt || iz.startDate || `${todayStr}T08:00:00`;
        items.push({
          id: `pamong_musyrif_izin_${iz.id}`,
          title: `Ust. ${getMusyrifCallName(iz.musyrifName)} (${iz.asrama})`,
          message: `Pengajuan izin ${iz.category} (${iz.startDate} s/d ${iz.endDate})`,
          time: formatNotificationRelativeTime(izTime, "Hari ini", now),
          category: "asrama",
          priority: "urgent",
          iconType: "file",
          timestamp: parseTimeToTimestamp(izTime, now),
          onAction: () => onOpenIzinMusyrif(iz.id)
        });
      });

    scopedMusyrifs.forEach((m, idx) => {
      const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
      if (logbook) {
        const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
        items.push({
          id: `pamong_logbook_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: detail.message,
          time: detail.time,
          category: "asrama",
          priority: "success",
          iconType: detail.iconType,
          timestamp: detail.timestamp,
          onAction: () => onOpenLogbook(m.id, todayStr, detail.taskKey)
        });
      }
      const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
      if (mutabaah) {
        const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now, idx);
        items.push({
          id: `pamong_mutabaah_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: mDetail.message,
          time: mDetail.time,
          category: "asrama",
          priority: "success",
          iconType: mDetail.iconType,
          timestamp: mDetail.timestamp,
          onAction: () => onOpenMutabaah(m.id, todayStr)
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
          time: formatNotificationRelativeTime(s.date, "Hari ini", now),
          category: "santri",
          priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
          iconType: s.lokasiPerawatan === "rs_pku" ? "pulse" : "stethoscope",
          timestamp: parseTimeToTimestamp(s.date, now),
          onAction: () => onOpenSantriSakit(s.id)
        });
      });
  }

  // 4. ROLE: KOORDINATOR MUSYRIF
  if (isKoordinatorMusyrif) {
    safeIzin
      .filter(iz => iz && iz.status === "pending")
      .forEach(iz => {
        const izTime = iz.createdAt || iz.startDate || `${todayStr}T08:00:00`;
        items.push({
          id: `km_izin_pending_${iz.id}`,
          title: `Ust. ${getMusyrifCallName(iz.musyrifName)}`,
          message: `Pengajuan izin ${iz.category} (${iz.startDate} s/d ${iz.endDate}) • ${iz.asrama}`,
          time: formatNotificationRelativeTime(izTime, "Hari ini", now),
          category: "asrama",
          priority: "urgent",
          iconType: "file",
          timestamp: parseTimeToTimestamp(izTime, now),
          onAction: () => onOpenIzinMusyrif(iz.id)
        });
      });

    scopedMusyrifs.forEach((m, idx) => {
      const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
      if (logbook) {
        const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
        items.push({
          id: `km_logbook_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: detail.message,
          time: detail.time,
          category: "asrama",
          priority: "success",
          iconType: detail.iconType,
          timestamp: detail.timestamp,
          onAction: () => onOpenLogbook(m.id, todayStr, detail.taskKey)
        });
      }
      const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
      if (mutabaah) {
        const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now, idx);
        items.push({
          id: `km_mutabaah_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: mDetail.message,
          time: mDetail.time,
          category: "asrama",
          priority: "success",
          iconType: mDetail.iconType,
          timestamp: mDetail.timestamp,
          onAction: () => onOpenMutabaah(m.id, todayStr)
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
            time: formatNotificationRelativeTime(`${k.date}T${k.time || "20:00"}:00`, "Hari ini", now),
            category: "asrama",
            priority: "warning",
            iconType: "users",
            timestamp: parseTimeToTimestamp(`${k.date}T${k.time || "20:00"}:00`, now),
            onAction: () => onOpenKegiatan(k.id)
          });
        }
      }
    });
  }

  // 5. ROLE: KAUR KIS
  if (isKaurKis) {
    safeSantriSakit
      .filter(s => s && s.status === "dalam_perawatan" && (s.lokasiPerawatan === "rs_pku" || s.lokasiPerawatan === "uks"))
      .forEach(s => {
        items.push({
          id: `kis_sakit_${s.id}`,
          title: `${s.namaSantri} (${s.asrama})`,
          message: `Keluhan: ${s.keluhan} • Dirawat di ${s.lokasiPerawatan === "rs_pku" ? "RS PKU" : "UKS"}`,
          time: formatNotificationRelativeTime(s.date, "Hari ini", now),
          category: "santri",
          priority: s.lokasiPerawatan === "rs_pku" ? "urgent" : "warning",
          iconType: s.lokasiPerawatan === "rs_pku" ? "pulse" : "stethoscope",
          timestamp: parseTimeToTimestamp(s.date, now),
          onAction: () => onOpenSantriSakit(s.id)
        });
      });

    safeSantriIzin
      .filter(iz => iz && (iz.statusPKM === "di_luar" || (iz as any).status === "di_luar"))
      .forEach(iz => {
        const outTime = iz.jamKeluar ? `${todayStr}T${iz.jamKeluar}:00` : `${todayStr}T14:00:00`;
        items.push({
          id: `kis_diluar_${iz.id}`,
          title: `${iz.namaSantri} (${iz.asrama})`,
          message: `Sedang di luar (${iz.tujuanLokasi}) • Batas kembali: ${iz.jamKembaliRencana || "17:00"} WIB`,
          time: formatNotificationRelativeTime(outTime, "Hari ini", now),
          category: "santri",
          priority: "info",
          iconType: "navigation",
          timestamp: parseTimeToTimestamp(outTime, now),
          onAction: () => onOpenSantriIzin(iz.id)
        });
      });

    scopedMusyrifs.forEach((m, idx) => {
      const logbook = logbookData[m.id]?.[todayStr] || logbookData[`${m.id}_${todayStr}`];
      if (logbook) {
        const detail = getLogbookNotificationDetails(logbook, m.asrama, now);
        items.push({
          id: `kis_logbook_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: detail.message,
          time: detail.time,
          category: "asrama",
          priority: "success",
          iconType: detail.iconType,
          timestamp: detail.timestamp,
          onAction: () => onOpenLogbook(m.id, todayStr, detail.taskKey)
        });
      }
      const mutabaah = mutabaahData[m.id]?.[todayStr] || mutabaahData[`${m.id}_${todayStr}`];
      if (mutabaah) {
        const mDetail = getMutabaahNotificationDetails(mutabaah, m.asrama, now, idx);
        items.push({
          id: `kis_mutabaah_done_${m.id}_${todayStr}`,
          title: `Ust. ${getMusyrifCallName(m.name)}`,
          message: mDetail.message,
          time: mDetail.time,
          category: "asrama",
          priority: "success",
          iconType: mDetail.iconType,
          timestamp: mDetail.timestamp,
          onAction: () => onOpenMutabaah(m.id, todayStr)
        });
      }
    });
  }

  // 6. ROLE: WADIR 4
  if (isWadir4) {
    safeSantriIzin
      .filter(iz => iz && (iz.statusApproval === "pending_wadir" || iz.jenisIzin === "pulang_menginap"))
      .forEach(iz => {
        const izTime = iz.tanggalPengajuan || (iz as any).createdAt || `${todayStr}T08:00:00`;
        items.push({
          id: `wadir_izin_khusus_${iz.id}`,
          title: `${iz.namaSantri} (${iz.kelas || iz.asrama})`,
          message: `Disposisi izin khusus: ${iz.tujuanLokasi} (${iz.keperluan})`,
          time: formatNotificationRelativeTime(izTime, "Hari ini", now),
          category: "santri",
          priority: "urgent",
          iconType: "file",
          timestamp: parseTimeToTimestamp(izTime, now),
          onAction: () => onOpenSantriIzin(iz.id)
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
          iconType: "pulse",
          timestamp: parseTimeToTimestamp(s.date, now),
          onAction: () => onOpenSantriSakit(s.id)
        });
      });
  }

  // 7. PUBLIC / GUEST FALLBACK
  if (!authUser) {
    items.push({
      id: "public_welcome_info",
      title: "Portal Presensi Madrasah Mu'allimin",
      message: "Masuk dengan akun Google Madrasah atau NBM untuk akses data lengkap",
      time: "Publik",
      category: "system",
      priority: "info",
      iconType: "sparkles",
      timestamp: now.getTime(),
      onAction: () => onGoTo("dashboard")
    });
  }

  return items;
}
