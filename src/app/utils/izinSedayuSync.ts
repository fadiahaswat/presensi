/**
 * IZIN SEDAYU REAL-TIME CLOUD SYNC ADAPTER
 * Sinkronisasi Dua Arah Langsung ke Google Sheet Izin Sedayu Backend (Code.gs)
 * Endpoint: https://script.google.com/macros/s/AKfycbwQnacuM2ZsgWYP20M9Gjwi--adZsNxzJk14IyH2l8iBuv_tKZCPPrYKdLeJhZhU7iz/exec
 */

import { SantriIzinRecord, JenisIzinSantri, StatusApprovalSantri, StatusPKM } from "../types/izinSantri";

export const IZIN_SEDAYU_GAS_URL = "https://script.google.com/macros/s/AKfycbwQnacuM2ZsgWYP20M9Gjwi--adZsNxzJk14IyH2l8iBuv_tKZCPPrYKdLeJhZhU7iz/exec";
const STORAGE_KEY_IZIN_LIST = "local_izin_list";
const STORAGE_KEY_LAST_FETCH = "izin_last_fetch_time";

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
  status: string; // PENDING, APPROVED, REJECTED, RETURNED, CHECKED_OUT
  catatanAdmin?: string;
  userEmail?: string;
  userRole?: string;
  timestampUpdate?: string;
}

// Convert Izin Sedayu raw row to Presensi SantriIzinRecord
export function mapIzinSedayuToRecord(row: IzinSedayuRow): SantriIzinRecord {
  const normalizeStatusApproval = (st: string): StatusApprovalSantri => {
    const s = (st || "").toUpperCase();
    if (s === "APPROVED" || s === "RETURNED" || s === "CHECKED_OUT") return "approved";
    if (s === "REJECTED") return "rejected";
    return "pending_musyrif";
  };

  const normalizeStatusPKM = (st: string): StatusPKM => {
    const s = (st || "").toUpperCase();
    if (s === "CHECKED_OUT") return "di_luar";
    if (s === "RETURNED") return "kembali_tepat_waktu";
    if (s === "APPROVED") return "menunggu_keluar";
    return "menunggu_keluar";
  };

  const normalizeJenisIzin = (j: string): JenisIzinSantri => {
    const s = (j || "").toLowerCase();
    if (s.includes("rutin") || s.includes("sabtu") || s.includes("ahad")) return "rutin_sabtu_ahad";
    if (s.includes("dokter") || s.includes("kesehatan") || s.includes("berobat") || s.includes("sakit") || s.includes("poskestren")) return "kesehatan_berobat";
    if (s.includes("pulang") || s.includes("menginap") || s.includes("bermalam")) return "pulang_menginap";
    return "keluar_biasa";
  };

  // Format date helper
  const cleanDate = (d?: string): string => {
    if (!d || d.includes("1899-12-30")) return new Date().toISOString().split("T")[0];
    if (d.includes("T")) return d.split("T")[0];
    return d;
  };

  // Format time helper
  const cleanTime = (t?: string): string => {
    if (!t) return "17:00";
    if (t.includes("1899-12-30")) {
      const m = t.match(/T(\d{2}:\d{2})/);
      return m ? m[1] : "17:00";
    }
    const m = t.match(/(\d{1,2}:\d{2})/);
    return m ? m[1].padStart(5, "0") : t;
  };

  return {
    id: row.idIzin || `izin-${Date.now()}`,
    nomorSurat: row.idIzin || `IZN/${new Date().getFullYear()}/000`,
    santriId: `santri-${(row.namaSantri || "").toLowerCase().replace(/\s+/g, "_")}`,
    nisn: "-",
    namaSantri: row.namaSantri || "Santri",
    kelas: row.kelas || "Kelas Asrama",
    asrama: "Kampus Asrama",
    kamar: "Kamar",
    namaWali: row.namaWali || "",
    alamatWali: row.alamatWali || "",
    namaPenjemput: row.namaPenjemput || row.namaWali || "",
    hubunganPenjemput: row.hubunganPenjemput || "Orang Tua (Ayah/Ibu)",
    rekomendasiPoskestren: row.rekomendasiPoskestren || "",
    jenisIzin: normalizeJenisIzin(row.jenisIzin),
    keperluan: row.keperluan || "Keperluan Santri",
    alasanDetail: row.catatanAdmin || "",
    tujuanLokasi: row.tujuan || row.tempatTujuan || "Tujuan Santri",
    tglKeluarRencana: cleanDate(row.tanggalKeluar),
    jamKeluarRencana: cleanTime(row.jamKeluar),
    tglKembaliRencana: cleanDate(row.tanggalKembali),
    jamKembaliRencana: cleanTime(row.jamKembali),
    statusApproval: normalizeStatusApproval(row.status),
    statusPKM: normalizeStatusPKM(row.status),
    disetujuiOleh: row.pemberiIzin && row.pemberiIzin !== "-" ? row.pemberiIzin : undefined,
    dibuatOleh: row.namaWali || "Wali Santri",
    rolePembuat: "wali",
    userEmail: row.userEmail || "",
    createdAt: row.waktuPengajuan || new Date().toISOString(),
    updatedAt: row.timestampUpdate || new Date().toISOString()
  };
}

// Convert Presensi SantriIzinRecord to Izin Sedayu raw row payload
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
    userRole: rec.rolePembuat || "MUSYRIF"
  };
}

// Fetch all permissions directly from Izin Sedayu Google Sheet with timeout & resilient fallback
export async function fetchIzinSedayuFromCloud(): Promise<SantriIzinRecord[]> {
  const getCachedRecords = (): SantriIzinRecord[] => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_IZIN_LIST);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((r: IzinSedayuRow) => mapIzinSedayuToRecord(r));
        }
      }
    } catch (_) {}
    return [];
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return getCachedRecords();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${IZIN_SEDAYU_GAS_URL}?action=read`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return getCachedRecords();
    }

    const json = await res.json();
    if (json && json.data && Array.isArray(json.data)) {
      const mapped = json.data.map((r: IzinSedayuRow) => mapIzinSedayuToRecord(r));
      try {
        localStorage.setItem(STORAGE_KEY_IZIN_LIST, JSON.stringify(json.data));
        if (json.meta?.lastModified) {
          localStorage.setItem(STORAGE_KEY_LAST_FETCH, String(json.meta.lastModified));
        }
      } catch (_) {}
      return mapped;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // Graceful silent fallback to cached records without throwing
    return getCachedRecords();
  }
  return getCachedRecords();
}

// Create new permission in Izin Sedayu Google Sheet
export async function createIzinSedayuInCloud(rec: SantriIzinRecord): Promise<boolean> {
  const payload = mapRecordToIzinSedayuPayload(rec);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(IZIN_SEDAYU_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return false;
    const json = await res.json();
    return json.status === "success";
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

// Update status in Izin Sedayu Google Sheet
export async function updateIzinSedayuStatusInCloud(
  idIzin: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_OUT" | "RETURNED",
  catatan?: string,
  pemberiIzin?: string,
  userEmail?: string,
  userRole?: string
): Promise<boolean> {
  const payload = {
    action: "update",
    idIzin: idIzin,
    status: status,
    catatan: catatan || "",
    pemberiIzin: pemberiIzin || "Ustadz Pembina",
    userEmail: userEmail || "musyrif.muallimin@gmail.com",
    userRole: userRole || "MUSYRIF"
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(IZIN_SEDAYU_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return false;
    const json = await res.json();
    return json.status === "success";
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}
