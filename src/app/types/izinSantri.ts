export type JenisIzinSantri = 
  | "keluar_biasa"         // Izin Keluar Biasa (urgent/keperluan penting, pulang hari yg sama)
  | "rutin_sabtu_ahad"     // Izin Rutin (Sabtu sore 15:30-17:00 / Ahad pagi 06:30-11:00)
  | "kesehatan_berobat"    // Izin Berobat / Rawat Sakit / Poskestren / RS PKU
  | "pulang_menginap";     // Izin Pulang / Menginap ke Rumah

export type StatusApprovalSantri = 
  | "pending_musyrif"      // Menunggu persetujuan Musyrif Kamar/Kelas
  | "pending_pamong"       // Menunggu persetujuan Pamong Asrama
  | "pending_wadir"        // Menunggu persetujuan Wadir (untuk izin khusus/menginap lama)
  | "approved"             // Disetujui
  | "rejected";            // Ditolak

export type StatusPKM = 
  | "menunggu_keluar"      // Izin disetujui, santri belum lewat gerbang PKM
  | "di_luar"              // Santri sudah check-out gerbang PKM
  | "kembali_tepat_waktu"  // Santri sudah kembali sebelum batas waktu
  | "terlambat";           // Santri kembali melewati batas waktu atau belum kembali saat batas waktu habis

export interface SantriIzinRecord {
  id: string;
  nomorSurat: string;
  santriId: string;
  nisn: string;
  nis?: string;
  namaSantri: string;
  kelas: string;
  asrama: string;
  kamar: string;
  
  // Data Wali & Kontak
  namaWali?: string;
  alamatWali?: string;
  noHpWali?: string;

  // Data Penjemput & Medis (Identik dengan Izin Sedayu)
  namaPenjemput?: string;
  hubunganPenjemput?: string;
  rekomendasiPoskestren?: string; // Khusus sakit/berobat
  
  jenisIzin: JenisIzinSantri;
  keperluan: string;
  alasanDetail: string;
  tujuanLokasi: string;
  
  // Waktu Rencana
  tglKeluarRencana: string;   // YYYY-MM-DD
  jamKeluarRencana: string;   // HH:mm
  tglKembaliRencana: string;  // YYYY-MM-DD
  jamKembaliRencana: string;  // HH:mm
  
  // Realisasi PKM (Gerbang Keamanan)
  tglKeluarAktual?: string;   // ISO string saat tap keluar di gerbang
  tglKembaliAktual?: string;  // ISO string saat tap kembali di gerbang
  petugasPKMKeluar?: string;
  petugasPKMKembali?: string;
  
  // Approval
  statusApproval: StatusApprovalSantri;
  statusPKM: StatusPKM;
  disetujuiOleh?: string;
  rolePenyetuju?: string;
  waktuPenyetujuan?: string;
  catatanPenolakan?: string;
  
  // Lampiran / Bukti
  lampiranUrl?: string;
  dibuatOleh: string;
  rolePembuat: string;
  userEmail?: string;
  
  createdAt: string;
  updatedAt: string;
}
