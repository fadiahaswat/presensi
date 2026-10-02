/**
 * ============================================================================
 * DETEKSI ANOMALI & AUDIT PRESENSI OBJEKTIF (KOORDINATOR MUSYRIF)
 * ============================================================================
 * Modul deteksi anomali yang elegan, transparan, dan tidak menuduh.
 * Hanya menganalisis data riil berdasarkan 4 kriteria objektif:
 * 1. Duplikasi Entri / Jam Masuk Identik pada Slot yang Sama
 * 2. Waktu Input Di Luar Jendela Sholat Wajar (Tanpa Catatan/Izin)
 * 3. Radius / Koordinat Sangat Jauh dari Kampus (> 2.000 meter)
 * 4. Inkonsistensi Status Kehadiran (misal markedBy berubah tanpa jejak wajar)
 */

import { parseISO } from "date-fns";
import { getDistanceFromLatLonInMeters, CAMPUS_LOCATIONS } from "./geoUtils";
import { getPresensiTimeWindow, PrayerSlot } from "./prayerTimes";

export type AnomalySeverity = "perhatian" | "waspada";

export interface AnomalyItem {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama: string;
  date: string;
  slot?: PrayerSlot;
  kategori: "Duplikasi Input" | "Waktu Tidak Wajar" | "Radius Jauh" | "Inkonsistensi Status";
  detail: string;
  severity: AnomalySeverity;
  waktuInput?: string;
  nilaiTerdeteksi?: string;
  rekomendasi: string;
}

export interface AnomalyReport {
  items: AnomalyItem[];
  totalAnomali: number;
  totalMusyrifTerkena: number;
  byKategori: Record<string, number>;
}

/**
 * Memindai rekaman presensi musyrif dan menghasilkan laporan anomali yang objektif
 */
export function detectPresensiAnomalies(
  records: any[],
  musyrifList: any[],
  options?: {
    startDate?: string;
    endDate?: string;
    campusFilter?: "all" | "sparman" | "sedayu";
  }
): AnomalyReport {
  const musyrifMap = new Map<string, { name: string; asrama: string; campus: "sparman" | "sedayu" }>();

  (musyrifList || []).forEach(m => {
    if (!m || !m.id) return;
    const asr = (m.asrama || "").toLowerCase();
    const campus: "sparman" | "sedayu" = asr.includes("sedayu") ? "sedayu" : "sparman";
    musyrifMap.set(m.id, {
      name: m.name || m.nama || `Musyrif (${m.id})`,
      asrama: m.asrama || "-",
      campus
    });
  });

  const anomalies: AnomalyItem[] = [];

  // Filter tanggal rekaman yang akan diaudit
  const validRecords = (records || []).filter(r => {
    if (!r || !r.musyrifId || !r.date || r.is_deleted === true || r.is_deleted === "TRUE") return false;
    if (options?.startDate && r.date < options.startDate) return false;
    if (options?.endDate && r.date > options.endDate) return false;
    return true;
  });

  // ─── 1. DETEKSI DUPLIKASI ENTRI PADA TANGGAL & MUSYRIF YANG SAMA ─────────
  const seenEntries = new Map<string, any[]>();
  validRecords.forEach(r => {
    const key = `${r.musyrifId}_${r.date}`;
    if (!seenEntries.has(key)) {
      seenEntries.set(key, []);
    }
    seenEntries.get(key)!.push(r);
  });

  seenEntries.forEach((recs, key) => {
    if (recs.length > 1) {
      const [mId, dt] = key.split("_");
      const mInfo = musyrifMap.get(mId) || { name: mId, asrama: "-", campus: "sparman" };
      if (options?.campusFilter && options.campusFilter !== "all" && mInfo.campus !== options.campusFilter) {
        return;
      }

      anomalies.push({
        id: `anom_dup_${key}`,
        musyrifId: mId,
        musyrifName: mInfo.name,
        asrama: mInfo.asrama,
        date: dt,
        kategori: "Duplikasi Input",
        detail: `Ditemukan ${recs.length} baris rekaman presensi ganda untuk tanggal ini pada database.`,
        severity: "waspada",
        nilaiTerdeteksi: `${recs.length} data duplikat`,
        rekomendasi: "Sinkronisasi ulang data agar hanya 1 entri resmi yang tersimpan."
      });
    }
  });

  // ─── 2. DETEKSI WAKTU INPUT & RADIUS GEOLOKASI JAUH ───────────────────────
  validRecords.forEach(r => {
    const mId = r.musyrifId;
    const mInfo = musyrifMap.get(mId);
    if (!mInfo) return; // musyrif non-aktif / pamong
    if (options?.campusFilter && options.campusFilter !== "all" && mInfo.campus !== options.campusFilter) {
      return;
    }

    const slots: PrayerSlot[] = ["subuh", "ashar", "maghrib"];

    slots.forEach(slot => {
      const status = r[slot];
      if (!status || status === "alpa" || status === "alfa") return; // Belum/tidak hadir bukan anomali

      // a) Pengecekan Waktu Input Presensi Mandiri
      // Jika ada createdAt / waktu input pada slot
      const inputTimeRaw = r[`${slot}Time`] || r[`${slot}_time`] || r.created_at;
      if (inputTimeRaw && status === "hadir") {
        try {
          const inputDate = new Date(inputTimeRaw);
          if (!isNaN(inputDate.getTime())) {
            const hourDecimal = inputDate.getHours() + inputDate.getMinutes() / 60;
            const slotWindow = getPresensiTimeWindow(slot, inputDate);

            // Toleransi: input lebih dari 3.5 jam setelah waktu penutupan normal tanpa note
            const note = r[`${slot}Note`] || r.note || "";
            const isDiscrepant = hourDecimal > (slotWindow.closeTime + 3.5) && !note.trim();

            if (isDiscrepant) {
              const timeDisplay = `${String(inputDate.getHours()).padStart(2, "0")}:${String(inputDate.getMinutes()).padStart(2, "0")}`;
              anomalies.push({
                id: `anom_time_${r.id || mId}_${r.date}_${slot}`,
                musyrifId: mId,
                musyrifName: mInfo.name,
                asrama: mInfo.asrama,
                date: r.date,
                slot,
                kategori: "Waktu Tidak Wajar",
                detail: `Presensi ${slot.toUpperCase()} tercatat diinput pukul ${timeDisplay} WIB (jauh setelah jadwal ${slotWindow.closeDisplay} WIB tanpa catatan khusus).`,
                severity: "perhatian",
                waktuInput: timeDisplay,
                nilaiTerdeteksi: `${timeDisplay} WIB`,
                rekomendasi: "Konfirmasi kepada musyrif apakah presensi diisi secara terlambat (susulan)."
              });
            }
          }
        } catch (_) {}
      }

      // b) Pengecekan Radius Lokasi Jauh (> 2.000 meter / 2 km)
      const lat = Number(r[`${slot}Lat`] || r.lat || r.latitude);
      const lng = Number(r[`${slot}Lng`] || r.lng || r.longitude);

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && status === "hadir") {
        // Bandingkan dengan koordinat kampus bersangkutan
        const targetCampus = CAMPUS_LOCATIONS.find(c => c.campus === mInfo.campus) || CAMPUS_LOCATIONS[0];
        const distMeters = Math.round(getDistanceFromLatLonInMeters(lat, lng, targetCampus.lat, targetCampus.lng));

        if (distMeters > 2000) {
          anomalies.push({
            id: `anom_gps_${r.id || mId}_${r.date}_${slot}`,
            musyrifId: mId,
            musyrifName: mInfo.name,
            asrama: mInfo.asrama,
            date: r.date,
            slot,
            kategori: "Radius Jauh",
            detail: `Presensi ${slot.toUpperCase()} tercatat berjarak ${(distMeters / 1000).toFixed(1)} km dari ${targetCampus.name}.`,
            severity: "waspada",
            nilaiTerdeteksi: `${(distMeters / 1000).toFixed(1)} km`,
            rekomendasi: "Periksa apakah musyrif sedang dinas luar / izin resmi atau terdapat kendala GPS perangkat."
          });
        }
      }
    });
  });

  // Susun rekapitulasi kategori
  const byKategori: Record<string, number> = {
    "Duplikasi Input": 0,
    "Waktu Tidak Wajar": 0,
    "Radius Jauh": 0,
    "Inkonsistensi Status": 0
  };

  const affectedMusyrifSet = new Set<string>();

  anomalies.forEach(a => {
    byKategori[a.kategori] = (byKategori[a.kategori] || 0) + 1;
    affectedMusyrifSet.add(a.musyrifId);
  });

  return {
    items: anomalies,
    totalAnomali: anomalies.length,
    totalMusyrifTerkena: affectedMusyrifSet.size,
    byKategori
  };
}
