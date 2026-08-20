// Data Kalender Pendidikan dan Jadwal Perpulangan
// Madrasah Mu'allimin Muhammadiyah Yogyakarta
// Tahun Ajaran 2026/2027

import { ADMIN_SCRUD_EMAILS as CONFIG_ADMIN_EMAILS } from "../config/envConfig";

export interface JadwalPerpulangan {
  id: string;
  no: number;
  nama: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (default 12:30 WIB)
  endTime: string; // HH:mm (default 17:00 WIB)
  targetKelas: "I-VI" | "II-VI" | "I" | "Semua";
  keterangan: string;
  isLiburPanjang?: boolean;
}

export interface AgendaPendidikan {
  id: string;
  nama: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  kategori: "libur" | "ujian" | "perpulangan" | "milad" | "akademik" | "lainnya";
  semester: 1 | 2;
  peserta?: string;
  penanggungJawab?: string;
  lokasi?: string;
  keterangan?: string;
  warnaBadge?: string;
}

export interface KetentuanPerpulangan {
  jamKeluarAsrama: string;
  batasMasukKembali: string;
  standarRambut: string;
  aturanTahfidz: string;
  aturanElektronik: string;
  catatanKelas1: string;
}

export const DEFAULT_KETENTUAN_PERPULANGAN: KetentuanPerpulangan = {
  jamKeluarAsrama: "12:30 WIB",
  batasMasukKembali: "17:00 WIB",
  standarRambut: "Rambut dan kuku rapi sesuai standar madrasah (4-2-2)",
  aturanTahfidz: "Murid telah menuntaskan capaian materi Tahfidz Al-Qur'an",
  aturanElektronik: "Dilarang membawa HP dan alat elektronik lainnya ke asrama",
  catatanKelas1: "Khusus Siswa Baru Kelas I: Selama 3 bulan pertama (Juli - September 2026) belum diperkenankan pulang ke rumah demi masa adaptasi dan disiplin berasrama. Orang tua diperkenankan menjenguk pada libur awal bulan.",
};

export const DEFAULT_JADWAL_PERPULANGAN: JadwalPerpulangan[] = [
  {
    id: "perpulangan-1",
    no: 1,
    nama: "Libur Perpulangan Awal Bulan",
    startDate: "2026-08-16",
    endDate: "2026-08-17",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "II-VI",
    keterangan: "Ahad - Senin (Kelas II - VI). Kelas I masa adaptasi asrama, orang tua boleh menjenguk.",
  },
  {
    id: "perpulangan-2",
    no: 2,
    nama: "Libur Perpulangan Awal Bulan",
    startDate: "2026-09-06",
    endDate: "2026-09-06",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "II-VI",
    keterangan: "Ahad (Kelas II - VI). Kelas I masa adaptasi asrama, orang tua boleh menjenguk.",
  },
  {
    id: "perpulangan-3",
    no: 3,
    nama: "Libur Perpulangan Awal Bulan",
    startDate: "2026-10-04",
    endDate: "2026-10-04",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Ahad (Seluruh Murid Kelas I - VI).",
  },
  {
    id: "perpulangan-4",
    no: 4,
    nama: "Libur Perpulangan Awal Bulan",
    startDate: "2026-11-01",
    endDate: "2026-11-01",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Ahad (Seluruh Murid Kelas I - VI).",
  },
  {
    id: "perpulangan-5",
    no: 5,
    nama: "Libur Semester 1 (Ganjil)",
    startDate: "2026-12-20",
    endDate: "2027-01-05",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Ahad - Selasa (Seluruh Murid Kelas I - VI). Kembali ke asrama maks. 5 Jan 2027 pukul 17:00 WIB.",
    isLiburPanjang: true,
  },
  {
    id: "perpulangan-6",
    no: 6,
    nama: "Libur Awal Ramadan 1448 H",
    startDate: "2027-02-06",
    endDate: "2027-02-09",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Sabtu - Selasa (Seluruh Murid, Guru, dan Karyawan).",
    isLiburPanjang: true,
  },
  {
    id: "perpulangan-7",
    no: 7,
    nama: "Libur Hari Raya Idul Fitri 1448 H",
    startDate: "2027-02-26",
    endDate: "2027-03-24",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Jumat - Rabu (Seluruh Murid Kelas I - VI). 1 Syawal jatuh pada 9 Maret 2027.",
    isLiburPanjang: true,
  },
  {
    id: "perpulangan-8",
    no: 8,
    nama: "Libur Hari Raya Idul Adha & Hari Tasyrik",
    startDate: "2027-05-15",
    endDate: "2027-05-19",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Sabtu - Rabu (Seluruh Murid Kelas I - VI). 10 Dzulhijjah jatuh pada 16 Mei 2027.",
    isLiburPanjang: true,
  },
  {
    id: "perpulangan-9",
    no: 9,
    nama: "Libur Semester 2 (Genap)",
    startDate: "2027-06-27",
    endDate: "2027-07-10",
    startTime: "12:30",
    endTime: "17:00",
    targetKelas: "I-VI",
    keterangan: "Ahad - Sabtu (Seluruh Murid Kelas I - VI). Awal semester 1 TA 2027/2028: 12 Juli 2027.",
    isLiburPanjang: true,
  },
];

export const DEFAULT_AGENDA_PENDIDIKAN: AgendaPendidikan[] = [
  // Semester 1
  {
    id: "agenda-1",
    nama: "Upacara Awal Tahun Ajaran 2026/2027",
    startDate: "2026-07-13",
    kategori: "akademik",
    semester: 1,
    peserta: "Seluruh Murid & Guru",
    penanggungJawab: "Kepala Urusan Kader dan Alumni",
    lokasi: "Kampus Induk & Terpadu",
    keterangan: "Upacara pembukaan kegiatan belajar mengajar TA 2026/2027.",
  },
  {
    id: "agenda-2",
    nama: "Orientasi Wali Kelas dan BK",
    startDate: "2026-07-13",
    endDate: "2026-07-14",
    kategori: "akademik",
    semester: 1,
    peserta: "Wali Kelas & Guru BK",
  },
  {
    id: "agenda-3",
    nama: "Libur Perpulangan Awal Bulan (Kelas II - VI)",
    startDate: "2026-08-16",
    endDate: "2026-08-17",
    kategori: "perpulangan",
    semester: 1,
    peserta: "Murid Kelas II - VI",
    keterangan: "Siswa Kelas I adaptasi asrama, wali santri diperbolehkan menjenguk.",
  },
  {
    id: "agenda-4",
    nama: "HUT ke-81 Proklamasi Kemerdekaan RI",
    startDate: "2026-08-17",
    kategori: "libur",
    semester: 1,
    peserta: "Seluruh Civitas Akademika",
    keterangan: "Hari Libur Nasional & Upacara Bendera.",
  },
  {
    id: "agenda-5",
    nama: "Libur Maulid Nabi Muhammad SAW (12 Rabiul Awal 1448 H)",
    startDate: "2026-08-25",
    kategori: "libur",
    semester: 1,
    peserta: "Seluruh Civitas Akademika",
  },
  {
    id: "agenda-6",
    nama: "Libur Perpulangan Awal Bulan (Kelas II - VI)",
    startDate: "2026-09-06",
    kategori: "perpulangan",
    semester: 1,
    peserta: "Murid Kelas II - VI",
  },
  {
    id: "agenda-7",
    nama: "Remidial Asesmen Formatif Semester 1",
    startDate: "2026-09-21",
    endDate: "2026-10-03",
    kategori: "ujian",
    semester: 1,
    peserta: "Seluruh Murid MTs & MA",
  },
  {
    id: "agenda-8",
    nama: "Libur Perpulangan Awal Bulan (Kelas I - VI)",
    startDate: "2026-10-04",
    kategori: "perpulangan",
    semester: 1,
    peserta: "Seluruh Murid Kelas I - VI",
  },
  {
    id: "agenda-9",
    nama: "Pelaksanaan TKA Aliyah (Kelas VI)",
    startDate: "2026-10-26",
    endDate: "2026-11-07",
    kategori: "ujian",
    semester: 1,
    peserta: "Murid Aliyah (Kelas IV - VI)",
    penanggungJawab: "Kurikulum & Pengajaran",
  },
  {
    id: "agenda-10",
    nama: "Libur Perpulangan Awal Bulan (Kelas I - VI)",
    startDate: "2026-11-01",
    kategori: "perpulangan",
    semester: 1,
    peserta: "Seluruh Murid Kelas I - VI",
  },
  {
    id: "agenda-11",
    nama: "Milad Muhammadiyah ke-114",
    startDate: "2026-11-18",
    kategori: "milad",
    semester: 1,
    peserta: "Seluruh Civitas Akademika",
    keterangan: "Peringatan Milad Muhammadiyah 18 November 1912 - 2026.",
  },
  {
    id: "agenda-12",
    nama: "Asesmen Sumatif Akhir Semester 1 (ASAS 1)",
    startDate: "2026-11-23",
    endDate: "2026-12-05",
    kategori: "ujian",
    semester: 1,
    peserta: "Seluruh Murid MTs & MA (Kelas I - VI)",
  },
  {
    id: "agenda-13",
    nama: "Milad Madrasah Mu'allimin Muhammadiyah ke-108",
    startDate: "2026-12-08",
    kategori: "milad",
    semester: 1,
    peserta: "Seluruh Civitas Akademika & Alumni",
    keterangan: "Peringatan Berdirinya Madrasah Mu'allimin 8 Desember 1918.",
  },
  {
    id: "agenda-14",
    nama: "Remidial Asesmen Sumatif Semester 1",
    startDate: "2026-12-09",
    endDate: "2026-12-16",
    kategori: "ujian",
    semester: 1,
    peserta: "Murid yang remidial",
  },
  {
    id: "agenda-15",
    nama: "Pembagian Laporan Hasil Belajar (Rapor) Semester 1",
    startDate: "2026-12-19",
    kategori: "akademik",
    semester: 1,
    peserta: "Wali Murid Kelas I - VI",
  },
  {
    id: "agenda-16",
    nama: "Libur Semester 1 (Ganjil)",
    startDate: "2026-12-21",
    endDate: "2027-01-04",
    kategori: "libur",
    semester: 1,
    peserta: "Seluruh Murid & Guru",
    keterangan: "Libur akhir semester ganjil.",
  },

  // Semester 2
  {
    id: "agenda-17",
    nama: "Libur Isra' Mi'raj Nabi Muhammad SAW 1448 H",
    startDate: "2027-01-05",
    kategori: "libur",
    semester: 2,
    peserta: "Seluruh Civitas Akademika",
  },
  {
    id: "agenda-18",
    nama: "Awal Masuk KBM Semester 2 (Genap)",
    startDate: "2027-01-06",
    kategori: "akademik",
    semester: 2,
    peserta: "Seluruh Murid & Guru",
  },
  {
    id: "agenda-19",
    nama: "Libur Awal Ramadhan 1448 H",
    startDate: "2027-02-06",
    endDate: "2027-02-09",
    kategori: "libur",
    semester: 2,
    peserta: "Seluruh Murid, Guru, dan Karyawan",
    keterangan: "1 Ramadhan 1448 H bertepatan pada Senin, 8 Februari 2027 (KHGT).",
  },
  {
    id: "agenda-20",
    nama: "Ujian Madrasah / Cambridge Subject Exam",
    startDate: "2027-02-15",
    endDate: "2027-02-25",
    kategori: "ujian",
    semester: 2,
    peserta: "Murid Tingkat Akhir / Cambridge Class",
  },
  {
    id: "agenda-21",
    nama: "Libur Hari Raya Idul Fitri 1448 H (Murid)",
    startDate: "2027-02-26",
    endDate: "2027-03-24",
    kategori: "perpulangan",
    semester: 2,
    peserta: "Seluruh Murid Kelas I - VI",
    keterangan: "1 Syawal 1448 H bertepatan pada Selasa, 9 Maret 2027.",
  },
  {
    id: "agenda-22",
    nama: "Remidial Asesmen Formatif Semester 2",
    startDate: "2027-04-12",
    endDate: "2027-04-24",
    kategori: "ujian",
    semester: 2,
    peserta: "Seluruh Murid MTs & MA",
  },
  {
    id: "agenda-23",
    nama: "Ujian Madrasah MTs / TKA / TKAD",
    startDate: "2027-04-26",
    endDate: "2027-05-08",
    kategori: "ujian",
    semester: 2,
    peserta: "Murid MTs & Aliyah",
  },
  {
    id: "agenda-24",
    nama: "Libur Hari Buruh Internasional",
    startDate: "2027-05-01",
    kategori: "libur",
    semester: 2,
    peserta: "Seluruh Civitas Akademika",
  },
  {
    id: "agenda-25",
    nama: "Libur Hari Raya Idul Adha 1448 H & Hari Tasyrik",
    startDate: "2027-05-15",
    endDate: "2027-05-19",
    kategori: "perpulangan",
    semester: 2,
    peserta: "Seluruh Murid Kelas I - VI",
    keterangan: "10 Dzulhijjah 1448 H bertepatan pada Ahad, 16 Mei 2027.",
  },
  {
    id: "agenda-26",
    nama: "Asesmen Sumatif Akhir Semester 2 (ASAS 2)",
    startDate: "2027-05-31",
    endDate: "2027-06-12",
    kategori: "ujian",
    semester: 2,
    peserta: "Seluruh Murid MTs & MA",
  },
  {
    id: "agenda-27",
    nama: "Libur Hari Lahir Pancasila",
    startDate: "2027-06-01",
    kategori: "libur",
    semester: 2,
    peserta: "Seluruh Civitas Akademika",
  },
  {
    id: "agenda-28",
    nama: "Remidial Asesmen Sumatif Semester 2",
    startDate: "2027-06-14",
    endDate: "2027-06-25",
    kategori: "ujian",
    semester: 2,
    peserta: "Murid yang remidial",
  },
  {
    id: "agenda-29",
    nama: "Pembagian Laporan Hasil Belajar (Rapor) Semester 2",
    startDate: "2027-06-26",
    kategori: "akademik",
    semester: 2,
    peserta: "Wali Murid Kelas I - VI",
  },
  {
    id: "agenda-30",
    nama: "Libur Semester 2 (Genap)",
    startDate: "2027-06-28",
    endDate: "2027-07-10",
    kategori: "libur",
    semester: 2,
    peserta: "Seluruh Murid & Guru",
  },
  {
    id: "agenda-31",
    nama: "Awal Semester 1 Tahun Ajaran 2027/2028",
    startDate: "2027-07-12",
    kategori: "akademik",
    semester: 1,
    peserta: "Seluruh Civitas Akademika",
  },
];

export const STORAGE_KEY_JADWAL_PERPULANGAN = "muallimin_jadwal_perpulangan_v1";
export const STORAGE_KEY_AGENDA_PENDIDIKAN = "muallimin_kalender_agenda_v1";
export const STORAGE_KEY_KETENTUAN_PERPULANGAN = "muallimin_ketentuan_perpulangan_v1";

// Admin SCRUD emails from config (imported at top of file)
export const ADMIN_SCRUD_EMAILS = CONFIG_ADMIN_EMAILS;

export function canUserScrudKalender(email?: string | null, role?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return (
    ADMIN_SCRUD_EMAILS.some((adm) => adm.toLowerCase() === cleanEmail) ||
    role === "koordinator_musyrif"
  );
}

export function getSavedJadwalPerpulangan(): JadwalPerpulangan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JADWAL_PERPULANGAN);
    if (!raw) return DEFAULT_JADWAL_PERPULANGAN;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_JADWAL_PERPULANGAN;
  } catch {
    return DEFAULT_JADWAL_PERPULANGAN;
  }
}

export function saveJadwalPerpulangan(data: JadwalPerpulangan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_JADWAL_PERPULANGAN, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save Jadwal Perpulangan to localStorage", e);
  }
}

export function getSavedAgendaPendidikan(): AgendaPendidikan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENDA_PENDIDIKAN);
    if (!raw) return DEFAULT_AGENDA_PENDIDIKAN;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_AGENDA_PENDIDIKAN;
  } catch {
    return DEFAULT_AGENDA_PENDIDIKAN;
  }
}

export function saveAgendaPendidikan(data: AgendaPendidikan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AGENDA_PENDIDIKAN, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save Agenda Pendidikan to localStorage", e);
  }
}

export function getSavedKetentuanPerpulangan(): KetentuanPerpulangan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KETENTUAN_PERPULANGAN);
    if (!raw) return DEFAULT_KETENTUAN_PERPULANGAN;
    return { ...DEFAULT_KETENTUAN_PERPULANGAN, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_KETENTUAN_PERPULANGAN;
  }
}

export function saveKetentuanPerpulangan(data: KetentuanPerpulangan): void {
  try {
    localStorage.setItem(STORAGE_KEY_KETENTUAN_PERPULANGAN, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save Ketentuan Perpulangan to localStorage", e);
  }
}

export function resetAllKalenderData(): void {
  localStorage.removeItem(STORAGE_KEY_JADWAL_PERPULANGAN);
  localStorage.removeItem(STORAGE_KEY_AGENDA_PENDIDIKAN);
  localStorage.removeItem(STORAGE_KEY_KETENTUAN_PERPULANGAN);
}
