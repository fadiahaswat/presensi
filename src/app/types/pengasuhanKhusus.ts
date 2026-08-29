export type KategoriPengasuhan = "antar_pku_rs" | "bina_santri" | "pengantaran_lain";

export interface PengasuhanKhususRecord {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama: string;
  kamar: string;
  date: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  kategori: KategoriPengasuhan;
  santriId?: string;
  nisn?: string;
  namaSantri: string;
  kelasSantri: string;
  lokasiTujuan: string; // e.g. "RS PKU Muhammadiyah Kota", "Kamar Konseling", dll.
  catatan: string; // Deskripsi keluhan / pembinaan
  photoUrl?: string; // Foto murni tanpa watermark
  poin: number; // 10 untuk antar_pku_rs, 5 untuk bina_santri & pengantaran_lain
  createdAt: string;
  statusSantriSakitSync?: boolean;
}

export const KATEGORI_PENGASUHAN_CONFIG: Record<
  KategoriPengasuhan,
  {
    label: string;
    shortLabel: string;
    icon: string;
    badgeColor: string;
    defaultPoints: number;
    description: string;
    placeholderTujuan: string;
    placeholderCatatan: string;
  }
> = {
  antar_pku_rs: {
    label: "Rujukan Medis / Mengantar ke PKU / RS / Klinik",
    shortLabel: "Antar ke RS / PKU",
    icon: "Stethoscope",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    defaultPoints: 10,
    description: "Pendampingan rujukan medis santri sakit ke fasilitas kesehatan",
    placeholderTujuan: "Contoh: RS PKU Muhammadiyah Yogyakarta (Kota)",
    placeholderCatatan: "Keluhan sakit, diagnosa awal, atau resep/tindakan dokter...",
  },
  bina_santri: {
    label: "Bimbingan & Pembinaan / Konseling Santri",
    shortLabel: "Bimbingan Santri",
    icon: "HeartHandshake",
    badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    defaultPoints: 5,
    description: "Sesi konseling, motivasi, evaluasi kamar, atau bimbingan adab santri",
    placeholderTujuan: "Contoh: Kamar Musyrif / Serambi Masjid / Ruang Pembinaan",
    placeholderCatatan: "Topik bimbingan, kendala yang dihadapi, dan arahan pembinaan...",
  },
  pengantaran_lain: {
    label: "Pengantaran / Penjemputan Resmi Santri (Dinas/Lomba/Izin)",
    shortLabel: "Pengantaran Lain",
    icon: "Car",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    defaultPoints: 5,
    description: "Mendampingi atau mengantar santri untuk keperluan dinas/lomba/izin resmi",
    placeholderTujuan: "Contoh: Stasiun Tugu / Lokasi Lomba / Bandara YIA",
    placeholderCatatan: "Keterangan penugasan dan pendampingan santri...",
  },
};
