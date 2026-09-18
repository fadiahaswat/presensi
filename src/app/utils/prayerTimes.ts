import { format } from "date-fns";

export type PrayerSlot = "subuh" | "ashar" | "maghrib";
export type AttendanceStatus = "hadir" | "sakit" | "izin" | "alfa";

export interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: AttendanceStatus;
  ashar?: AttendanceStatus;
  maghrib?: AttendanceStatus;
  subuhNote?: string;
  asharNote?: string;
  maghribNote?: string;
  markedBy?: string;
}

export interface PrayerTimeItem {
  key: string;
  name: string;
  time: string;
  raw: number;
}

/**
 * PRAYER TIME CALCULATOR (Muhammadiyah / KHGT Standard)
 */
export function calcPrayerTimes(date: Date, lat = -7.807631, lon = 110.350905, tz = 7): PrayerTimeItem[] {
  const toR = (d: number) => (d * Math.PI) / 180;
  const toD = (r: number) => (r * 180) / Math.PI;
  const fix = (h: number) => ((h % 24) + 24) % 24;

  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d
    + (m <= 2 ? -Math.floor((y+1)/100)+Math.floor((y+1)/400)+1 : -Math.floor(y/100)+Math.floor(y/400)+1) - 1524.5;

  const D  = jd - 2451545.0;
  const g  = toR((357.529 + 0.98560028 * D) % 360);
  const q  = (280.459 + 0.98564736 * D) % 360;
  const L  = toR((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360);
  const e  = toR(23.439 - 0.00000036 * D);
  const RA = toD(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const EqT = q / 15 - ((RA + 360) % 24);

  const transit = 12 + tz - lon / 15 - EqT;
  const latR = toR(lat);

  function ha(angle: number) {
    const c = (Math.sin(toR(angle)) - Math.sin(latR) * Math.sin(dec)) / (Math.cos(latR) * Math.cos(dec));
    if (c < -1 || c > 1) return NaN;
    return toD(Math.acos(c)) / 15;
  }

  // Ashar: bayang-bayang 1 kali panjang benda + bayang-bayang zawal
  const asrAlt = toD(Math.atan(1 / (1 + Math.tan(Math.abs(latR - dec)))));

  const fmt = (h: number) => {
    if (isNaN(h)) return "--:--";
    const hh = Math.floor(fix(h)) % 24;
    const mm = Math.round((fix(h) % 1) * 60);
    return `${String(hh).padStart(2,"0")}:${String(mm % 60).padStart(2,"0")}`;
  };

  const subuhRaw = transit - ha(-18) + 2 / 60; // Muhammadiyah -18° + 2m ihtiyat
  const terbitRaw = transit - ha(-0.8333);
  const dhuhrRaw = transit + 2 / 60;
  const asrRaw = transit + ha(asrAlt) + 2 / 60;
  const maghribRaw = transit + ha(-1) + 2 / 60;
  const ishaRaw = transit + ha(-18) + 2 / 60;

  return [
    { key:"subuh",   name:"Subuh",   time: fmt(subuhRaw),   raw: subuhRaw },
    { key:"terbit",  name:"Terbit",  time: fmt(terbitRaw),  raw: terbitRaw },
    { key:"dhuhr",   name:"Dzuhur",  time: fmt(dhuhrRaw),   raw: dhuhrRaw },
    { key:"asr",     name:"Ashar",   time: fmt(asrRaw),     raw: asrRaw },
    { key:"maghrib", name:"Maghrib", time: fmt(maghribRaw), raw: maghribRaw },
    { key:"isha",    name:"Isya",    time: fmt(ishaRaw),    raw: ishaRaw },
  ];
}

export const PRESENSI_OPEN_BEFORE_MINUTES = 0;
export const PRESENSI_CLOSE_HOURS_SUBUH = 5.5;  // 05:30 WIB
export const PRESENSI_CLOSE_HOURS_ASHAR = 15.5; // 15:30 WIB
export const PRESENSI_CLOSE_HOURS_MAGHRIB = 19.0; // 19:00 WIB

export interface PresensiTimeWindow {
  openTime: number;      // Decimal hour (e.g., 4.5 = 04:30)
  closeTime: number;     // Decimal hour (e.g., 5.5 = 05:30)
  openDisplay: string;   // "04:30"
  closeDisplay: string;  // "05:30"
  prayerTime: number;    // Raw prayer time decimal (e.g., 4.5 = 04:30)
  prayerDisplay: string; // "04:30"
}

/**
 * Hitung jendela waktu presensi berdasarkan waktu sholat
 */
export function getPresensiTimeWindow(
  slot: PrayerSlot,
  date: Date = new Date()
): PresensiTimeWindow {
  const prayerTimes = calcPrayerTimes(date, -7.807631, 110.350905, 7);
  const prayerKey = slot === "ashar" ? "asr" : slot;
  const prayerObj = prayerTimes.find(p => p.key === prayerKey);

  const defaultPrayerRaw = slot === "subuh" ? 4.5 : slot === "ashar" ? 15.2 : 17.75;
  const prayerRaw = prayerObj?.raw ?? defaultPrayerRaw;
  const openTime = prayerRaw;

  const closeTime = slot === "subuh" 
    ? PRESENSI_CLOSE_HOURS_SUBUH 
    : slot === "ashar" 
    ? PRESENSI_CLOSE_HOURS_ASHAR 
    : PRESENSI_CLOSE_HOURS_MAGHRIB;

  const fmtHour = (h: number): string => {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  };

  return {
    openTime,
    closeTime,
    openDisplay: fmtHour(openTime),
    closeDisplay: fmtHour(closeTime),
    prayerTime: prayerRaw,
    prayerDisplay: prayerObj?.time ?? fmtHour(prayerRaw),
  };
}

export const AUTO_ALFA_START_DATE = "2026-09-01";
export const AUTO_ALFA_ASHAR_START_DATE = "2026-09-18";

/**
 * Evaluasi status presensi efektif
 */
export function getEffectiveAttendanceStatus(
  record: AttendanceRecord | undefined,
  slot: PrayerSlot,
  dateStr: string,
  now: Date = new Date()
): AttendanceStatus | undefined {
  if (record?.[slot]) return record[slot];
  
  const effectiveStartDate = slot === "ashar" ? AUTO_ALFA_ASHAR_START_DATE : AUTO_ALFA_START_DATE;
  if (dateStr < effectiveStartDate) return undefined;

  const today = format(now, "yyyy-MM-dd");
  if (dateStr > today) return undefined;

  if (dateStr < today) {
    return "alfa";
  }

  const timeWindow = getPresensiTimeWindow(slot, now);
  const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (nowH > timeWindow.closeTime) {
    return "alfa";
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// QIBLA & MECCA DISTANCE
// ─────────────────────────────────────────────────────────────────────────────
export const KAABA = { lat: 21.4225, lon: 39.8262 };

export function getQiblaAngle(lat: number, lon: number): number {
  const toR = (d: number) => d * Math.PI / 180;
  const kLat = toR(KAABA.lat), kLon = toR(KAABA.lon), uLat = toR(lat), dLon = kLon - toR(lon);
  const y = Math.sin(dLon) * Math.cos(kLat);
  const x = Math.cos(uLat) * Math.sin(kLat) - Math.sin(uLat) * Math.cos(kLat) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

export function getMeccaDist(lat: number, lon: number): number {
  const toR = (d: number) => d * Math.PI / 180;
  const R = 6371, dLat = toR(KAABA.lat - lat), dLon = toR(KAABA.lon - lon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat)) * Math.cos(toR(KAABA.lat)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
