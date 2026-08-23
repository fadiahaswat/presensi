/**
 * IZIN SEDAYU REAL-TIME CLOUD SYNC ADAPTER
 * Sinkronisasi Dua Arah Langsung ke Google Sheet Izin Sedayu Backend (Code.gs)
 * Endpoint: https://script.google.com/macros/s/AKfycbwQnacuM2ZsgWYP20M9Gjwi--adZsNxzJk14IyH2l8iBuv_tKZCPPrYKdLeJhZhU7iz/exec
 */

import { SantriIzinRecord, JenisIzinSantri, StatusApprovalSantri, StatusPKM } from "../types/izinSantri";
import { ALL_SANTRI_DATA } from "../data/santriData";

export const IZIN_SEDAYU_GAS_URL = "https://script.google.com/macros/s/AKfycbzulnnHPTuqMZ6FwkLb1_3ZKgH5HzYvm1zgG1MaxYeXKKoT0BL6W89q8hDmChB5S94aHQ/exec";
export const STORAGE_KEY_SANTRI_IZIN = "presensi_santri_izin_v5";
export const STORAGE_KEY_LAST_FETCH = "izin_last_fetch_time";

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

  // If already in Presensi SantriIzinRecord format
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

  // Lookup in master santri dataset for accurate room/dormitory resolution
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

// Fetch all permissions directly from Izin Sedayu Google Sheet with timeout & resilient fallback
// Fetch all permissions directly from Google Sheet with timeout & resilient fallback
export async function fetchIzinSedayuFromCloud(): Promise<SantriIzinRecord[]> {
  const getCachedRecords = (): SantriIzinRecord[] => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_SANTRI_IZIN);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
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
    const res = await fetch(`${IZIN_SEDAYU_GAS_URL}?action=get_table&table=SantriIzin`, {
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
        } catch (_) {}
        return mapped;
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // Graceful silent fallback to cached records without throwing
    return getCachedRecords();
  }
  return getCachedRecords();
}

// Create new permission in Google Sheet
export async function createIzinSedayuInCloud(rec: SantriIzinRecord): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(IZIN_SEDAYU_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "batch_upsert",
        table: "SantriIzin",
        records: [rec]
      }),
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

// Update status in Google Sheet
export async function updateIzinSedayuStatusInCloud(
  idIzin: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_OUT" | "RETURNED",
  catatan?: string,
  pemberiIzin?: string,
  userEmail?: string,
  userRole?: string
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    const res = await fetch(IZIN_SEDAYU_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "batch_upsert",
        table: "SantriIzin",
        records: [payloadRecord]
      }),
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
