/**
 * IZIN SEDAYU REAL-TIME CLOUD SYNC ADAPTER
 * Sinkronisasi Dua Arah Langsung ke Google Sheet Izin Sedayu Backend (Code.gs)
 * Optimized for reliability and efficiency
 */

import { SantriIzinRecord, JenisIzinSantri, StatusApprovalSantri, StatusPKM } from "../types/izinSantri";
import { ALL_SANTRI_DATA } from "../data/santriData";

export const IZIN_SEDAYU_GAS_URL = "https://script.google.com/macros/s/AKfycbzulnnHPTuqMZ6FwkLb1_3ZKgH5HzYvm1zgG1MaxYeXKKoT0BL6W89q8hDmChB5S94aHQ/exec";
export const STORAGE_KEY_SANTRI_IZIN = "presensi_santri_izin_v5";
export const STORAGE_KEY_LAST_FETCH = "izin_last_fetch_time";

// === OPTIMIZED CONFIG ===
const FETCH_TIMEOUT = 20000; // 20 detik - lebih lama untuk data izin
const MAX_RETRIES = 3; // More retries for reliability
const RETRY_BASE_DELAY = 1000; // Slightly longer initial retry
const HEALTH_CHECK_TIMEOUT = 5000;

// === CONNECTION HEALTH ===
let isHealthy: boolean = true;
let consecutiveFailures: number = 0;
const maxConsecutiveFailures: number = 3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quick connectivity check
 */
export async function checkIzinConnection(): Promise<boolean> {
  if (!navigator.onLine) {
    isHealthy = false;
    return false;
  }

  try {
    const pingUrl = `${IZIN_SEDAYU_GAS_URL}?action=ping&_t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const res = await fetch(pingUrl, { method: "GET", mode: "cors", signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      isHealthy = true;
      consecutiveFailures = 0;
      return true;
    }
  } catch (_) {}

  consecutiveFailures++;
  isHealthy = consecutiveFailures < maxConsecutiveFailures;
  return isHealthy;
}

/**
 * Get current connection health status
 */
export function getIzinConnectionHealth(): "good" | "degraded" | "poor" {
  return isHealthy ? "good" : consecutiveFailures < 3 ? "degraded" : "poor";
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  operation: string,
  timeoutMs: number = FETCH_TIMEOUT,
  maxAttempts: number = MAX_RETRIES
): Promise<Response | null> {
  // Skip if unhealthy
  if (!isHealthy && consecutiveFailures >= maxConsecutiveFailures) {
    console.debug(`[IzinSync] Skipping ${operation} - poor connection health`);
    return null;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`[IzinSync] ${operation} - retry ${attempt + 1}/${maxAttempts} in ${delay}ms...`);
        await sleep(delay);
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        consecutiveFailures = 0;
        isHealthy = true;
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      throw new Error(`HTTP ${response.status}`);

    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.name === 'AbortError') {
        console.warn(`[IzinSync] ${operation} - timeout after ${timeoutMs}ms`);
        if (attempt === maxAttempts - 1) {
          handleFailure();
          break;
        }
      } else if (attempt === maxAttempts - 1) {
        handleFailure();
        break;
      }
    }
  }

  return null;
}

function handleFailure() {
  consecutiveFailures++;
  isHealthy = consecutiveFailures < maxConsecutiveFailures;
}

export interface IzinSedayuRow {
  idIzin: string;
  waktuPengajuan?: string;
  namaWali?: string;
  alamatWali?: string;
  namaSantri: string;
  kelas: string;
  jenisIzin: string;
  keperluan?: string;
  tujuan?: string;
  tempatTujuan?: string;
  tanggalKeluar?: string;
  tanggalKembali?: string;
  jamKeluar?: string;
  jamKembali?: string;
  namaPenjemput?: string;
  hubunganPenjemput?: string;
  rekomendasiPoskestren?: string;
  pemberiIzin?: string;
  status: string;
  catatanAdmin?: string;
  userEmail?: string;
  userRole?: string;
  timestampUpdate?: string;
}

export function mapIzinSedayuToRecord(row: any): SantriIzinRecord {
  const normalizeStatusApproval = (st?: string): StatusApprovalSantri => {
    const s = String(st || "").trim().toLowerCase();
    if (s === "approved" || s === "disetujui" || s === "returned" || s === "checked_out" || s === "selesai") return "approved";
    if (s === "rejected" || s === "ditolak") return "rejected";
    if (s.includes("pamong")) return "pending_pamong";
    return "pending_musyrif";
  };

  const normalizeStatusPKM = (st?: string, pkm?: string): StatusPKM => {
    const s = String(pkm || st || "").trim().toLowerCase();
    if (s === "checked_out" || s === "di_luar") return "di_luar";
    if (s === "returned" || s === "kembali_tepat_waktu" || s === "kembali") return "kembali_tepat_waktu";
    if (s === "terlambat") return "terlambat";
    return "menunggu_keluar";
  };

  const rawStatus = row.statusApproval || row.status || row.status_approval || row.Status || row.StatusApproval || "";
  const resolvedStatusApproval = normalizeStatusApproval(rawStatus);
  const resolvedStatusPKM = normalizeStatusPKM(row.status, row.statusPKM);

  if (row.tglKeluarRencana || row.santriId) {
    const foto = row.photoUrl || row.fotoSantriUrl || row.lampiranUrl || "";
    return {
      ...row,
      statusApproval: resolvedStatusApproval,
      statusPKM: resolvedStatusPKM,
      status: resolvedStatusApproval === "approved" ? "APPROVED" : (resolvedStatusApproval === "rejected" ? "REJECTED" : "PENDING"),
      photoUrl: foto,
      fotoSantriUrl: foto,
      lampiranUrl: foto
    } as SantriIzinRecord;
  }

  const normalizeJenisIzin = (j: string): JenisIzinSantri => {
    const s = (j || "").toLowerCase();
    if (s.includes("rutin") || s.includes("sabtu") || s.includes("ahad")) return "rutin_sabtu_ahad";
    if (s.includes("dokter") || s.includes("kesehatan") || s.includes("berobat") || s.includes("sakit") || s.includes("poskestren")) return "kesehatan_berobat";
    if (s.includes("pulang") || s.includes("menginap") || s.includes("bermalam")) return "pulang_menginap";
    return "keluar_biasa";
  };

  const cleanDate = (d?: string): string => {
    if (!d || d.includes("1899-12-30")) return new Date().toISOString().split("T")[0];
    if (d.includes("T")) return d.split("T")[0];
    return d;
  };

  const cleanTime = (t?: string): string => {
    if (!t) return "17:00";
    if (t.includes("1899-12-30")) {
      const m = t.match(/T(\d{2}:\d{2})/);
      return m ? m[1] : "17:00";
    }
    const m = t.match(/(\d{1,2}:\d{2})/);
    return m ? m[1].padStart(5, "0") : t;
  };

  const rawName = (row.namaSantri || "").trim().toLowerCase();
  const matchedSantri = ALL_SANTRI_DATA.find(s => {
    if (!s.nama) return false;
    const sName = s.nama.trim().toLowerCase();
    return sName === rawName || sName.includes(rawName) || rawName.includes(sName);
  });

  const resolvedAsrama = matchedSantri?.asrama || (matchedSantri?.tingkat && parseInt(matchedSantri.tingkat) <= 2 ? "Asrama 1" : "Asrama 2") || "Asrama 1";
  const resolvedKamar = matchedSantri?.kamar || "Kamar";
  const resolvedKelas = row.kelas || matchedSantri?.kelasLengkap || "Kelas 1 A";
  const resolvedNisn = matchedSantri?.nisn || "-";

  return {
    id: row.idIzin || row.id || `IZN-${Date.now()}`,
    nomorSurat: row.idIzin || row.nomorSurat || row.id || `IZN/${new Date().getFullYear()}/000`,
    santriId: matchedSantri?.id || `santri-${(row.namaSantri || "").toLowerCase().replace(/\s+/g, "_")}`,
    nisn: resolvedNisn,
    namaSantri: row.namaSantri || matchedSantri?.nama || "Santri",
    kelas: resolvedKelas,
    asrama: resolvedAsrama,
    kamar: resolvedKamar,
    namaWali: row.namaWali || matchedSantri?.namaAyah || matchedSantri?.namaIbu || "",
    alamatWali: row.alamatWali || matchedSantri?.alamat || "",
    namaPenjemput: row.namaPenjemput || row.namaWali || matchedSantri?.namaAyah || "Mandiri",
    hubunganPenjemput: row.hubunganPenjemput || "Orang Tua (Ayah/Ibu)",
    rekomendasiPoskestren: row.rekomendasiPoskestren || "",
    jenisIzin: normalizeJenisIzin(row.jenisIzin),
    keperluan: row.keperluan || "Keperluan Santri",
    alasanDetail: row.catatanAdmin || row.alasanDetail || "",
    tujuanLokasi: row.tujuan || row.tempatTujuan || row.tujuanLokasi || "Tujuan Santri",
    tglKeluarRencana: cleanDate(row.tanggalKeluar || row.tglKeluarRencana),
    jamKeluarRencana: cleanTime(row.jamKeluar || row.jamKeluarRencana),
    tglKembaliRencana: cleanDate(row.tanggalKembali || row.tglKembaliRencana),
    jamKembaliRencana: cleanTime(row.jamKembali || row.jamKembaliRencana),
    statusApproval: normalizeStatusApproval(row.status || row.statusApproval),
    statusPKM: normalizeStatusPKM(row.status || row.statusPKM),
    disetujuiOleh: row.pemberiIzin && row.pemberiIzin !== "-" ? row.pemberiIzin : row.disetujuiOleh,
    lampiranUrl: row.fotoSantriUrl || row.lampiranUrl || row.photoUrl || "",
    fotoSantriUrl: row.fotoSantriUrl || row.lampiranUrl || row.photoUrl || "",
    photoUrl: row.fotoSantriUrl || row.lampiranUrl || row.photoUrl || "",
    dibuatOleh: row.namaWali || row.dibuatOleh || "Wali Santri",
    rolePembuat: row.rolePembuat || "wali",
    userEmail: row.userEmail || "",
    createdAt: row.waktuPengajuan || row.createdAt || new Date().toISOString(),
    updatedAt: row.timestampUpdate || row.updatedAt || new Date().toISOString()
  };
}

export function mapRecordToIzinSedayuPayload(rec: SantriIzinRecord): any {
  const mapJenisLabel = (j: JenisIzinSantri): string => {
    switch (j) {
      case "keluar_biasa": return "Izin Keluar Biasa (Kembali Hari Sama)";
      case "rutin_sabtu_ahad": return "Izin Rutin (Sabtu/Ahad)";
      case "kesehatan_berobat": return "Ke Dokter / RS (Kesehatan)";
      case "pulang_menginap": return "Pulang / Menginap";
      default: return "Izin Keluar Biasa (Kembali Hari Sama)";
    }
  };

  const mapStatusLabel = (s: StatusApprovalSantri, pkm: StatusPKM): string => {
    if (pkm === "kembali_tepat_waktu" || pkm === "terlambat") return "RETURNED";
    if (pkm === "di_luar") return "CHECKED_OUT";
    if (s === "approved") return "APPROVED";
    if (s === "rejected") return "REJECTED";
    return "PENDING";
  };

  const fotoUrl = rec.fotoSantriUrl || rec.lampiranUrl || rec.photoUrl || "";

  return {
    action: "create",
    idIzin: rec.nomorSurat || rec.id,
    namaSantri: rec.namaSantri,
    kelas: rec.kelas,
    namaWali: rec.namaWali || "Orang Tua / Wali",
    alamatWali: rec.alamatWali || "Yogyakarta",
    jenisIzin: mapJenisLabel(rec.jenisIzin),
    keperluan: rec.keperluan,
    tujuan: rec.tujuanLokasi,
    tanggalKeluar: rec.tglKeluarRencana,
    tanggalKembali: rec.tglKembaliRencana,
    jamKeluar: rec.jamKeluarRencana,
    jamKembali: rec.jamKembaliRencana,
    namaPenjemput: rec.namaPenjemput || rec.namaWali || "Mandiri",
    hubunganPenjemput: rec.hubunganPenjemput || "Orang Tua (Ayah/Ibu)",
    rekomendasiPoskestren: rec.rekomendasiPoskestren || "",
    pemberiIzin: rec.disetujuiOleh || "-",
    status: mapStatusLabel(rec.statusApproval, rec.statusPKM),
    catatanAdmin: rec.alasanDetail || "Diajukan via Aplikasi Presensi",
    userEmail: rec.userEmail || "musyrif.muallimin@gmail.com",
    userRole: rec.rolePembuat || "MUSYRIF",
    lampiranUrl: fotoUrl,
    fotoSantriUrl: fotoUrl,
    photoUrl: fotoUrl
  };
}

export async function fetchIzinSedayuFromCloud(): Promise<SantriIzinRecord[]> {
  const getCachedRecords = (): SantriIzinRecord[] => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_SANTRI_IZIN);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          console.log(`[IzinSync] Using ${parsed.length} cached izin records`);
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.log('[IzinSync] Offline - using cached data');
    return getCachedRecords();
  }

  try {
    // OPTIMIZATION: Use lastModified from cache to avoid unnecessary fetches
    const lastFetch = localStorage.getItem(STORAGE_KEY_LAST_FETCH);
    const url = `${IZIN_SEDAYU_GAS_URL}?action=get_table&table=SantriIzin${lastFetch ? `&since=${encodeURIComponent(lastFetch)}` : ''}`;
    console.log(`[IzinSync] fetchIzinSedayu - fetching from cloud...`);
    const res = await fetchWithRetry(url, { method: "GET", redirect: "follow" }, 'fetchIzinSedayu', FETCH_TIMEOUT);

    if (!res) {
      // Return cached on failure
      console.warn('[IzinSync] fetchIzinSedayu - no response, using cached');
      return getCachedRecords();
    }

    const json = await res.json();
    if (json && json.data && Array.isArray(json.data)) {
      const mapped = json.data
        .filter((r: any) => !r.is_deleted)
        .map((r: any) => mapIzinSedayuToRecord(r))
        .filter((x: SantriIzinRecord) => Boolean(x.namaSantri && x.namaSantri.trim() !== ""));

      if (mapped.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY_SANTRI_IZIN, JSON.stringify(mapped));
          if (json.meta?.lastModified) {
            localStorage.setItem(STORAGE_KEY_LAST_FETCH, String(json.meta.lastModified));
          }
          console.log(`[IzinSync] fetchIzinSedayu - success, ${mapped.length} records cached`);
        } catch (_) {}
        return mapped;
      }
    }
  } catch (err: any) {
    console.warn(`[IzinSync] fetchIzinSedayu - error: ${err.message}, using cached`);
  }
  return getCachedRecords();
}

export async function createIzinSedayuInCloud(rec: SantriIzinRecord): Promise<boolean> {
  const res = await fetchWithRetry(
    IZIN_SEDAYU_GAS_URL,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "batch_upsert",
        table: "SantriIzin",
        records: [rec]
      }),
      redirect: "follow"
    },
    'createIzin'
  );

  if (!res) return false;

  try {
    const json = await res.json();
    return json.status === "success";
  } catch (err) {
    console.warn('[IzinSync] createIzinSedayuInCloud failed:', err);
    return false;
  }
}

export async function updateIzinSedayuStatusInCloud(
  idIzin: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_OUT" | "RETURNED",
  catatan?: string,
  pemberiIzin?: string,
  userEmail?: string,
  userRole?: string
): Promise<boolean> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_SANTRI_IZIN);
    let targetRecord: SantriIzinRecord | null = null;
    if (cached) {
      const parsed = JSON.parse(cached);
      targetRecord = Array.isArray(parsed) ? parsed.find((x: any) => x.id === idIzin || x.nomorSurat === idIzin) : null;
    }

    const payloadRecord = targetRecord ? {
      ...targetRecord,
      statusApproval: (status === "APPROVED" || status === "RETURNED" || status === "CHECKED_OUT") ? "approved" : status === "REJECTED" ? "rejected" : "pending_musyrif",
      statusPKM: status === "CHECKED_OUT" ? "di_luar" : status === "RETURNED" ? "kembali_tepat_waktu" : "menunggu_keluar",
      disetujuiOleh: pemberiIzin || targetRecord.disetujuiOleh,
      updatedAt: new Date().toISOString()
    } : {
      id: idIzin,
      statusApproval: status === "APPROVED" ? "approved" : "rejected",
      updatedAt: new Date().toISOString()
    };

    const res = await fetchWithRetry(
      IZIN_SEDAYU_GAS_URL,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "batch_upsert",
          table: "SantriIzin",
          records: [payloadRecord]
        }),
        redirect: "follow"
      },
      'updateStatus'
    );

    if (!res) return false;

    const json = await res.json();
    return json.status === "success";
  } catch (err) {
    console.warn('[IzinSync] updateIzinSedayuStatusInCloud failed:', err);
    return false;
  }
}
