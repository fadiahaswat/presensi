import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Plus, ShieldAlert, ShieldCheck, Award, AlertTriangle, 
  Search, Filter, Share2, Calendar, User, Phone, CheckCircle2, 
  Trash2, Edit3, ChevronRight, ChevronLeft, FileText, Check, Clock, 
  Sparkles, MessageSquare, Info, TrendingDown, TrendingUp,
  AlertOctagon, Printer, BarChart2, BookOpen, HeartHandshake, Eye,
  ArrowLeft, Download, SlidersHorizontal, Layers, CheckCheck, Send,
  Building2, School, HelpCircle, Star, Sparkle, Flame
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";
import { searchSantri, SantriData, ALL_SANTRI_DATA } from "../data/santriData";
import { appAlert, appConfirm } from "../utils/customDialog";
import { PengasuhanKhususRecord } from "../types/pengasuhanKhusus";
import syamsaLogomark from "../../assets/branding/Logomark.webp";

export type JenisCatatan = "pelanggaran" | "prestasi";
export type TingkatPelanggaran = "ringan" | "sedang" | "berat" | "prestasi";
export type StatusPembinaan = "perlu_tindakan" | "sedang_berjalan" | "selesai";

export type KategoriPembinaan = 
  | "kedisiplinan" 
  | "ibadah" 
  | "kebersihan_kerapian" 
  | "akhlak_adab" 
  | "akademik_bahasa" 
  | "prestasi_khidmah";

export interface PembinaanRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  santriId?: string;
  nisn?: string;
  namaSantri: string;
  kelasSantri: string;
  asrama: string;
  kamar?: string;
  jenis: JenisCatatan;
  kategori: KategoriPembinaan;
  tingkat: TingkatPelanggaran;
  poin: number; // Negatif untuk pelanggaran, Positif untuk prestasi
  judulPeristiwa: string;
  deskripsi: string;
  lokasiKejadian: string;
  tindakanPembinaan: string; // Sanksi edukatif atau apresiasi
  status: StatusPembinaan;
  pelaporId: string;
  pelaporName: string;
  pelaporRole: string;
  catatanPamong?: string;
  createdAt: string;
  updatedAt?: string;
}

// Helper untuk konversi otomatis catatan Tugas Pengasuhan (Pilar 2) ke Lembar Pembinaan
export function convertPengasuhanToPembinaan(rec: PengasuhanKhususRecord): PembinaanRecord {
  const noteLower = (rec.catatan || "").toLowerCase().trim();
  
  // Cari data santri lengkap di database jika kelas belum terisi spesifik
  const matchedSantri = ALL_SANTRI_DATA.find(s => 
    (rec.santriId && (s.id === rec.santriId || s.nisn === rec.nisn)) || 
    (s.nama && rec.namaSantri && s.nama.trim().toLowerCase() === rec.namaSantri.trim().toLowerCase())
  );
  const resolvedKelas = (rec.kelasSantri && rec.kelasSantri !== "Mu'allimin" && rec.kelasSantri.trim() !== "")
    ? rec.kelasSantri.trim()
    : (matchedSantri?.kelasLengkap || "Santri Mu'allimin");
  const resolvedAsrama = (rec.asrama && rec.asrama.trim() !== "")
    ? rec.asrama.trim()
    : (matchedSantri?.asrama || "Asrama Mu'allimin");

  // Deteksi kata-kata pelanggaran / kedisiplinan vs prestasi / bimbingan
  const isTelat = noteLower.includes("telat") || noteLower.includes("lambat") || noteLower.includes("terlambat");
  const isKamar = noteLower.includes("kamar") || noteLower.includes("kasur") || noteLower.includes("berantakan") || noteLower.includes("sampah") || noteLower.includes("jemuran");
  const isIbadah = noteLower.includes("sholat") || noteLower.includes("solat") || noteLower.includes("masjid") || noteLower.includes("subuh") || noteLower.includes("maghrib") || noteLower.includes("ashar") || noteLower.includes("isya") || noteLower.includes("dzuhur") || noteLower.includes("jamaah") || noteLower.includes("masbuq");
  const isDisiplin = isTelat || noteLower.includes("bolos") || noteLower.includes("keluar") || noteLower.includes("izin") || noteLower.includes("seragam") || noteLower.includes("hp") || noteLower.includes("gadget") || noteLower.includes("tidur");
  const isPelanggaran = isTelat || isKamar || isIbadah || isDisiplin || noteLower.includes("langgar") || noteLower.includes("sanksi") || noteLower.includes("hukuman");

  let jenis: JenisCatatan = isPelanggaran ? "pelanggaran" : "prestasi";
  let kategori: KategoriPembinaan = "kedisiplinan";
  let tingkat: TingkatPelanggaran = "ringan";
  let poin = isPelanggaran ? -5 : 5;
  let judulPeristiwa = "Bimbingan & Konseling Santri";
  let deskripsi = rec.catatan || "Sesi bimbingan santri bersama musyrif";
  let tindakanPembinaan = "Bimbingan, konseling motivasi, dan evaluasi adab";

  if (isTelat) {
    kategori = "kedisiplinan";
    tingkat = "ringan";
    poin = -5;
    judulPeristiwa = "Terlambat Apel / Kegiatan Asrama";
    const rawNote = (rec.catatan || "").trim();
    deskripsi = (rawNote.toLowerCase() === "telat" || rawNote.toLowerCase() === "terlambat")
      ? "Terlambat hadir pada agenda asrama / apel santri"
      : rawNote;
    tindakanPembinaan = "Nasihat musyrif & pembinaan kedisiplinan asrama";
  } else if (isIbadah) {
    kategori = "ibadah";
    tingkat = "ringan";
    poin = -5;
    judulPeristiwa = "Pembinaan Ibadah & Halaqah";
    deskripsi = rec.catatan || "Evaluasi ketertiban ibadah & halaqah";
    tindakanPembinaan = "Pendampingan sholat berjamaah & evaluasi mutabaah";
  } else if (isKamar) {
    kategori = "kebersihan_kerapian";
    tingkat = "ringan";
    poin = -5;
    judulPeristiwa = "Ketertiban & Kerapian Kamar";
    deskripsi = rec.catatan || "Evaluasi kebersihan kamar dan kasur asrama";
    tindakanPembinaan = "Edukasi kerapian kamar & piket mandiri";
  } else if (isPelanggaran) {
    kategori = "kedisiplinan";
    tingkat = "ringan";
    poin = -5;
    judulPeristiwa = "Pembinaan Tata Tertib Santri";
    deskripsi = rec.catatan || "Pembinaan kedisiplinan santri asrama";
    tindakanPembinaan = "Konseling edukatif & pembinaan musyrif";
  } else {
    // Sesi apresiasi / bimbingan karakter
    jenis = "prestasi";
    kategori = "akhlak_adab";
    tingkat = "prestasi";
    poin = 5;
    judulPeristiwa = "Bimbingan Karakter & Konseling";
    deskripsi = rec.catatan || "Sesi pembinaan santri dan bimbingan akhlak";
    tindakanPembinaan = "Sesi motivasi, konseling, dan pembinaan karakter";
  }

  return {
    id: "pembinaan_sync_" + (rec.id || Math.random().toString(36).substring(2, 8)),
    tanggal: rec.date || new Date().toISOString().split("T")[0],
    waktu: rec.waktu || "07:00",
    santriId: rec.santriId || matchedSantri?.id || "",
    nisn: rec.nisn || matchedSantri?.nisn || "",
    namaSantri: (rec.namaSantri || matchedSantri?.nama || "Santri").trim(),
    kelasSantri: resolvedKelas,
    asrama: resolvedAsrama,
    kamar: rec.kamar || matchedSantri?.kamar || "",
    jenis,
    kategori,
    tingkat,
    poin,
    judulPeristiwa,
    deskripsi,
    lokasiKejadian: rec.lokasiTujuan || "Asrama",
    tindakanPembinaan,
    status: "selesai",
    pelaporId: rec.musyrifId || "musyrif",
    pelaporName: rec.musyrifName || "Musyrif",
    pelaporRole: "Musyrif",
    catatanPamong: "Otomatis tersinkron dari Tugas Pengasuhan (Pilar 2)",
    createdAt: rec.createdAt || new Date().toISOString()
  };
}

// Preset Kamus Aturan & Poin Edukatif Mu'allimin
export interface PresetAturan {
  judul: string;
  jenis: JenisCatatan;
  kategori: KategoriPembinaan;
  tingkat: TingkatPelanggaran;
  poin: number;
  sanksiDefault: string;
}

export const PRESET_ATURAN_LIST: PresetAturan[] = [
  // Pelanggaran Ringan
  { judul: "Terlambat Apel / Kegiatan Asrama", jenis: "pelanggaran", kategori: "kedisiplinan", tingkat: "ringan", poin: -5, sanksiDefault: "Nasihat musyrif & membaca doa kafaratul majlis" },
  { judul: "Kamar / Kasur / Loker Berantakan", jenis: "pelanggaran", kategori: "kebersihan_kerapian", tingkat: "ringan", poin: -5, sanksiDefault: "Piket mandiri membersihkan lorong/kamar 1 hari" },
  { judul: "Terlambat Sholat Berjamaah di Masjid", jenis: "pelanggaran", kategori: "ibadah", tingkat: "ringan", poin: -5, sanksiDefault: "Membaca Al-Qur'an 1 'Ain di serambi masjid" },
  { judul: "Pakaian / Seragam Tidak Rapi / Tidak Sesuai", jenis: "pelanggaran", kategori: "kedisiplinan", tingkat: "ringan", poin: -5, sanksiDefault: "Merapikan seragam & menghafal 5 kosakata bahasa Arab" },
  
  // Pelanggaran Sedang
  { judul: "Tidak Sholat Berjamaah Tanpa Udzur Syar'i", jenis: "pelanggaran", kategori: "ibadah", tingkat: "sedang", poin: -15, sanksiDefault: "Adzan/Iqomah sholat berikutnya & murojaah 1/2 juz" },
  { judul: "Keluar Kompleks Kampus Tanpa Izin Pamong", jenis: "pelanggaran", kategori: "kedisiplinan", tingkat: "sedang", poin: -25, sanksiDefault: "Surat peringatan lisan & menghafal Surat As-Sajdah" },
  { judul: "Menyimpan / Menggunakan Gadget Tanpa Izin", jenis: "pelanggaran", kategori: "kedisiplinan", tingkat: "sedang", poin: -25, sanksiDefault: "Penyitaan barang & membuat resume buku keislaman" },
  { judul: "Berbicara Kasar / Tidak Sopan Kepada Teman/Musyrif", jenis: "pelanggaran", kategori: "akhlak_adab", tingkat: "sedang", poin: -20, sanksiDefault: "Permintaan maaf terbuka & kultum adab ba'da Isya" },
  
  // Pelanggaran Berat
  { judul: "Merokok / Vaping di Lingkungan Asrama", jenis: "pelanggaran", kategori: "akhlak_adab", tingkat: "berat", poin: -50, sanksiDefault: "Pemanggilan orang tua & Sidang Kehormatan Pamong" },
  { judul: "Berkelahi / Tindak Kekerasan / Bullying", jenis: "pelanggaran", kategori: "akhlak_adab", tingkat: "berat", poin: -50, sanksiDefault: "Penerbitan SP 2 / SP 3 & konseling intensif BK" },
  { judul: "Meninggalkan Asrama Malam Hari (Kabur)", jenis: "pelanggaran", kategori: "kedisiplinan", tingkat: "berat", poin: -50, sanksiDefault: "Sidang Dewan Pamong & Skorsing Edukatif" },

  // Prestasi & Khidmah
  { judul: "Juara Lomba / Kompetisi Tingkat Kota/Nasional", jenis: "prestasi", kategori: "prestasi_khidmah", tingkat: "prestasi", poin: 30, sanksiDefault: "Piagam penghargaan & apresiasi di apel asrama" },
  { judul: "Khatam Hafalan Al-Qur'an / Ziyadah Mumtaz", jenis: "prestasi", kategori: "ibadah", tingkat: "prestasi", poin: 25, sanksiDefault: "Apresiasi khusus & pengalungan selempang tahfidz" },
  { judul: "Santri Teladan Kebersihan & Kerapian Kamar", jenis: "prestasi", kategori: "kebersihan_kerapian", tingkat: "prestasi", poin: 15, sanksiDefault: "Bintang kamar terbaik bulan ini" },
  { judul: "Khidmah Aktif / Relawan Kegiatan Madrasah", jenis: "prestasi", kategori: "prestasi_khidmah", tingkat: "prestasi", poin: 15, sanksiDefault: "Poin apresiasi kepemimpinan santri" },
  { judul: "Imam / Muadzin / MC Resmi Bahasa Arab-Inggris", jenis: "prestasi", kategori: "akademik_bahasa", tingkat: "prestasi", poin: 10, sanksiDefault: "Poin apresiasi bahasa & ibadah" },
];

const ASRAMA_OPTIONS = [
  "Semua",
  "Asrama 1",
  "Asrama 8A",
  "Asrama 8B",
  "Asrama 8C",
  "Asrama 10",
  "Asrama Sedayu Gedung A",
  "Asrama Sedayu Gedung B",
  "Asrama Sedayu Gedung C",
  "Asrama Sedayu Gedung D",
];

const STORAGE_KEY = "syamsa_lembar_pembinaan_v1";

export function loadPembinaanRecords(): PembinaanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Failed to load pembinaan records", err);
  }
  return [];
}

export function savePembinaanRecords(records: PembinaanRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save pembinaan records", err);
  }
}

interface PagePembinaanSantriProps {
  onBack: () => void;
  authUser: any;
  musyrifList?: any[];
  santriList?: SantriData[];
  pengasuhanList?: PengasuhanKhususRecord[];
  onSavePengasuhan?: (record: PengasuhanKhususRecord) => void;
  onDeletePengasuhan?: (id: string) => void;
}

export function PagePembinaanSantri({
  onBack,
  authUser,
  musyrifList = [],
  santriList = ALL_SANTRI_DATA,
  pengasuhanList = [],
  onSavePengasuhan,
  onDeletePengasuhan
}: PagePembinaanSantriProps) {
  const [localRecords, setLocalRecords] = useState<PembinaanRecord[]>(() => loadPembinaanRecords());
  const [deletedSyncIds, setDeletedSyncIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("syamsa_deleted_bina_sync_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Gabungkan catatan lokal dengan catatan Tugas Pengasuhan (kategori bina_santri)
  const records = useMemo(() => {
    const map = new Map<string, PembinaanRecord>();

    // 1. Data dari Tugas Pengasuhan & RS (Pilar 2)
    (pengasuhanList || [])
      .filter(p => p && p.kategori === "bina_santri" && p.id)
      .forEach(p => {
        if (deletedSyncIds.includes(p.id) || deletedSyncIds.includes("pembinaan_sync_" + p.id)) return;
        if (typeof p.id === "string" && p.id.startsWith("pengasuhan_from_bina_")) {
          const originalId = p.id.replace("pengasuhan_from_bina_", "");
          if (localRecords.some(r => r && r.id === originalId)) return;
        }
        const converted = convertPengasuhanToPembinaan(p);
        if (converted && converted.id) {
          map.set(converted.id, converted);
        }
      });

    // 2. Data lokal Lembar Pembinaan (prioritas jika ada edit/update)
    (localRecords || []).forEach(r => {
      if (r && r.id) {
        map.set(r.id, r);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateComp = (b.tanggal || "").localeCompare(a.tanggal || "");
      if (dateComp !== 0) return dateComp;
      return (b.waktu || "").localeCompare(a.waktu || "");
    });
  }, [localRecords, pengasuhanList, deletedSyncIds]);

  const [activeTab, setActiveTab] = useState<"daftar" | "tambah" | "rekap" | "panduan">("daftar");
  
  // Scope & Filters
  const [scopeFilter, setScopeFilter] = useState<"semua" | "perlu_tindakan" | "pelanggaran" | "prestasi" | "sp">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAsrama, setFilterAsrama] = useState<string>("Semua");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [filterTingkat, setFilterTingkat] = useState<string>("all");

  // Selected for detail modal
  const [selectedRecord, setSelectedRecord] = useState<PembinaanRecord | null>(null);

  // Form State
  const [formTanggal, setFormTanggal] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formWaktu, setFormWaktu] = useState(format(new Date(), "HH:mm"));
  const [formNamaSantri, setFormNamaSantri] = useState("");
  const [formNisn, setFormNisn] = useState("");
  const [formKelasSantri, setFormKelasSantri] = useState(authUser?.kelas || "");
  const [formAsrama, setFormAsrama] = useState(authUser?.asrama || "Asrama Sedayu Gedung A");
  const [formKamar, setFormKamar] = useState(authUser?.kamar || "");
  const [formJenis, setFormJenis] = useState<JenisCatatan>("pelanggaran");
  const [formKategori, setFormKategori] = useState<KategoriPembinaan>("kedisiplinan");
  const [formTingkat, setFormTingkat] = useState<TingkatPelanggaran>("ringan");
  const [formPoin, setFormPoin] = useState<number>(-5);
  const [formJudul, setFormJudul] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formLokasi, setFormLokasi] = useState("Lingkungan Asrama");
  const [formTindakan, setFormTindakan] = useState("");
  const [formStatus, setFormStatus] = useState<StatusPembinaan>("perlu_tindakan");

  // Autocomplete Santri
  const [santriSuggestions, setSantriSuggestions] = useState<SantriData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync to localstorage
  useEffect(() => {
    savePembinaanRecords(localRecords);
  }, [localRecords]);

  // Handle Autocomplete Search
  const handleSearchSantriChange = (val: string) => {
    setFormNamaSantri(val);
    if (val.trim().length >= 2) {
      const hits = searchSantri(val).slice(0, 6);
      setSantriSuggestions(hits);
      setShowSuggestions(true);
    } else {
      setSantriSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSantri = (santri: SantriData) => {
    triggerHaptic("light");
    setFormNamaSantri(santri.nama);
    setFormNisn(santri.nisn || santri.nis || "");
    setFormKelasSantri(santri.kelasLengkap || "");
    setShowSuggestions(false);
  };

  // Apply Preset
  const handleApplyPreset = (preset: PresetAturan) => {
    triggerHaptic("light");
    setFormJenis(preset.jenis);
    setFormKategori(preset.kategori);
    setFormTingkat(preset.tingkat);
    setFormPoin(preset.poin);
    setFormJudul(preset.judul);
    setFormTindakan(preset.sanksiDefault);
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaSantri.trim()) {
      appAlert("Nama santri wajib diisi.", "Peringatan");
      return;
    }
    if (!formJudul.trim()) {
      appAlert("Judul catatan/peristiwa wajib diisi.", "Peringatan");
      return;
    }

    const newRecord: PembinaanRecord = {
      id: `PB-${Date.now().toString(36).toUpperCase()}`,
      tanggal: formTanggal,
      waktu: formWaktu,
      nisn: formNisn,
      namaSantri: formNamaSantri.trim(),
      kelasSantri: formKelasSantri.trim() || "Mu'allimin",
      asrama: formAsrama,
      kamar: formKamar.trim(),
      jenis: formJenis,
      kategori: formKategori,
      tingkat: formTingkat,
      poin: formPoin,
      judulPeristiwa: formJudul.trim(),
      deskripsi: formDeskripsi.trim(),
      lokasiKejadian: formLokasi.trim(),
      tindakanPembinaan: formTindakan.trim(),
      status: formStatus,
      pelaporId: authUser?.id || "musyrif",
      pelaporName: authUser?.name || "Musyrif / Pamong",
      pelaporRole: authUser?.role || "musyrif",
      createdAt: new Date().toISOString()
    };

    setLocalRecords(prev => [newRecord, ...prev]);
    triggerHaptic("success");

    // Sinkronisasi otomatis ke Tugas Pengasuhan & RS (Pilar 2) jika ada handler
    if (onSavePengasuhan) {
      onSavePengasuhan({
        id: "pengasuhan_from_bina_" + newRecord.id,
        musyrifId: newRecord.pelaporId,
        musyrifName: newRecord.pelaporName,
        asrama: newRecord.asrama,
        kamar: newRecord.kamar,
        date: newRecord.tanggal,
        waktu: newRecord.waktu,
        kategori: "bina_santri",
        santriId: newRecord.santriId,
        nisn: newRecord.nisn,
        namaSantri: newRecord.namaSantri,
        kelasSantri: newRecord.kelasSantri,
        lokasiTujuan: newRecord.lokasiKejadian || "Asrama",
        catatan: `${newRecord.judulPeristiwa} (${newRecord.deskripsi || newRecord.tindakanPembinaan})`,
        poin: 5,
        createdAt: newRecord.createdAt
      });
    }

    appAlert(`Catatan ${formJenis === "pelanggaran" ? "pembinaan" : "prestasi"} untuk "${newRecord.namaSantri}" berhasil disimpan dan disinkronkan ke Tugas Pengasuhan (+5 Pts Musyrif)!`, "Berhasil Disimpan");

    // Reset Form
    setFormNamaSantri("");
    setFormNisn("");
    setFormJudul("");
    setFormDeskripsi("");
    setFormTindakan("");
    setFormPoin(-5);
    setActiveTab("daftar");
  };

  // Delete Record
  const handleDelete = (id: string) => {
    appConfirm("Hapus catatan pembinaan ini secara permanen?", () => {
      setLocalRecords(prev => prev.filter(r => r.id !== id));
      if (id.startsWith("pembinaan_sync_")) {
        const origId = id.replace("pembinaan_sync_", "");
        setDeletedSyncIds(prev => {
          const next = [...prev, id, origId];
          try { localStorage.setItem("syamsa_deleted_bina_sync_v1", JSON.stringify(next)); } catch {}
          return next;
        });
        if (onDeletePengasuhan) onDeletePengasuhan(origId);
      }
      if (selectedRecord?.id === id) setSelectedRecord(null);
      triggerHaptic("medium");
    });
  };

  // Update Status
  const handleUpdateStatus = (id: string, newStatus: StatusPembinaan) => {
    setLocalRecords(prev => {
      const existing = prev.find(r => r.id === id);
      if (existing) {
        return prev.map(r => r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r);
      }
      const fromMerged = records.find(r => r.id === id);
      if (fromMerged) {
        return [{ ...fromMerged, status: newStatus, updatedAt: new Date().toISOString() }, ...prev];
      }
      return prev;
    });
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(prev => prev ? { ...prev, status: newStatus } : null);
    }
    triggerHaptic("light");
  };

  // Akumulasi Poin per Santri
  const santriSummaryList = useMemo(() => {
    const map: Record<string, {
      nama: string;
      kelas: string;
      asrama: string;
      totalPoinPelanggaran: number;
      totalPoinPrestasi: number;
      netPoin: number;
      countPelanggaran: number;
      countPrestasi: number;
      pendingTindakanCount: number;
    }> = {};

    records.forEach(r => {
      if (!r) return;
      const nama = (r.namaSantri || "Santri").trim();
      const kelas = (r.kelasSantri || "-").trim();
      const key = `${nama}_${kelas}`;
      if (!map[key]) {
        map[key] = {
          nama,
          kelas,
          asrama: r.asrama || "-",
          totalPoinPelanggaran: 0,
          totalPoinPrestasi: 0,
          netPoin: 0,
          countPelanggaran: 0,
          countPrestasi: 0,
          pendingTindakanCount: 0
        };
      }
      if (r.jenis === "pelanggaran") {
        map[key].totalPoinPelanggaran += Math.abs(r.poin || 0);
        map[key].countPelanggaran += 1;
        if (r.status === "perlu_tindakan") map[key].pendingTindakanCount += 1;
      } else {
        map[key].totalPoinPrestasi += Math.abs(r.poin || 0);
        map[key].countPrestasi += 1;
      }
      map[key].netPoin = map[key].totalPoinPrestasi - map[key].totalPoinPelanggaran;
    });

    return Object.values(map);
  }, [records]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalRecords = records.length;
    const pelanggaranCount = records.filter(r => r.jenis === "pelanggaran").length;
    const prestasiCount = records.filter(r => r.jenis === "prestasi").length;
    const pendingCount = records.filter(r => r.status === "perlu_tindakan").length;
    const spCount = santriSummaryList.filter(s => s.totalPoinPelanggaran >= 20).length;
    return { totalRecords, pelanggaranCount, prestasiCount, pendingCount, spCount };
  }, [records, santriSummaryList]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Scope Filter
      if (scopeFilter === "perlu_tindakan" && r.status !== "perlu_tindakan") return false;
      if (scopeFilter === "pelanggaran" && r.jenis !== "pelanggaran") return false;
      if (scopeFilter === "prestasi" && r.jenis !== "prestasi") return false;
      
      // Secondary Filters
      if (filterAsrama !== "Semua" && r.asrama !== filterAsrama) return false;
      if (filterKategori !== "all" && r.kategori !== filterKategori) return false;
      if (filterTingkat !== "all" && r.tingkat !== filterTingkat) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = (searchQuery || "").toLowerCase();
        const matchNama = (r.namaSantri || "").toLowerCase().includes(q);
        const matchJudul = (r.judulPeristiwa || "").toLowerCase().includes(q);
        const matchKelas = (r.kelasSantri || "").toLowerCase().includes(q);
        const matchAsrama = (r.asrama || "").toLowerCase().includes(q);
        if (!matchNama && !matchJudul && !matchKelas && !matchAsrama) return false;
      }
      return true;
    });
  }, [records, scopeFilter, filterAsrama, filterKategori, filterTingkat, searchQuery]);

  // Function to determine SP Level
  const getSPBadge = (poinPelanggaran: number) => {
    if (poinPelanggaran >= 75) {
      return { label: "SP 3 (Sidang Dewan)", bg: "bg-rose-50 text-rose-700 border border-rose-200", icon: AlertOctagon };
    }
    if (poinPelanggaran >= 45) {
      return { label: "SP 2 (Peringatan Tertulis)", bg: "bg-amber-50 text-amber-800 border border-amber-200", icon: AlertTriangle };
    }
    if (poinPelanggaran >= 20) {
      return { label: "SP 1 (Peringatan Lisan)", bg: "bg-amber-50 text-amber-700 border border-amber-200", icon: AlertTriangle };
    }
    return { label: "Terbina Baik", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 };
  };

  // WhatsApp Share Builder
  const handleShareWA = (rec: PembinaanRecord) => {
    const isPelanggaran = rec.jenis === "pelanggaran";
    const headerEmoji = isPelanggaran ? "🛡️" : "🏆";
    const text = 
`*${headerEmoji} LEMBAR PEMBINAAN SANTRI MU'ALLIMIN*
────────────────────────
👤 *Nama Santri:* ${rec.namaSantri}
🏫 *Kelas / Asrama:* ${rec.kelasSantri} / ${rec.asrama} ${rec.kamar ? `(Kamar ${rec.kamar})` : ""}
📅 *Waktu:* ${format(new Date(rec.tanggal), "EEEE, dd MMMM yyyy", { locale: id })} (${rec.waktu} WIB)
📍 *Lokasi:* ${rec.lokasiKejadian}

📋 *Peristiwa:* ${rec.judulPeristiwa}
🏷️ *Kategori:* ${rec.kategori.replace("_", " ").toUpperCase()} (${rec.tingkat.toUpperCase()})
🔢 *Poin ${isPelanggaran ? "Pelanggaran" : "Apresiasi"}:* ${rec.poin > 0 ? `+${rec.poin}` : rec.poin} Poin

🛠️ *Bentuk Tindakan Edukatif / Apresiasi:*
${rec.tindakanPembinaan || "-"}

📌 *Status Penanganan:* ${rec.status === "selesai" ? "✅ Selesai Ditangani" : rec.status === "sedang_berjalan" ? "⏳ Sedang Berjalan" : "⚠️ Perlu Ditindaklanjuti"}
✍️ *Dicatat Oleh:* ${rec.pelaporName} (${rec.pelaporRole})
────────────────────────
_Sistem Informasi Pengasuhan & Asrama (Syamsa Mu'allimin)_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── TOP HEADER CARD ── */}
      <div className="bg-white/90 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/80 shadow-sm ring-1 ring-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onBack();
            }}
            className="w-9 h-9 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs shrink-0"
            title="Kembali ke Dasbor"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Lembar Pembinaan
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Madrasah Mu'allimin · Tata tertib, poin pelanggaran, SP & reward
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(activeTab === "panduan" ? "daftar" : "panduan");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
              activeTab === "panduan"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Kamus Aturan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(activeTab === "tambah" ? "daftar" : "tambah");
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-600/20 active:scale-95 transition-all whitespace-nowrap"
          >
            {activeTab === "tambah" ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{activeTab === "tambah" ? "Tutup Form" : "Catat Kasus"}</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED FILTER BAR & SEARCH CONTAINER ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-2.5">
        {/* Ringkas Metric Chips / Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setScopeFilter("semua");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === "daftar" && scopeFilter === "semua"
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Semua ({stats.totalRecords})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("perlu_tindakan");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === "daftar" && scopeFilter === "perlu_tindakan"
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200/80"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tindakan ({stats.pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("pelanggaran");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === "daftar" && scopeFilter === "pelanggaran"
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-rose-50/80 hover:bg-rose-100 text-rose-900 border-rose-200/80"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Pelanggaran ({stats.pelanggaranCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("prestasi");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === "daftar" && scopeFilter === "prestasi"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Apresiasi ({stats.prestasiCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("rekap");
              triggerHaptic("light");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === "rekap"
                ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                : "bg-purple-50/80 hover:bg-purple-100 text-purple-900 border-purple-200/80"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Status SP ({stats.spCount})</span>
          </button>
        </div>

        {/* Integrated Search & Filter Row */}
        {activeTab === "daftar" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama santri, kelas, kasus..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-medium"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <select
                value={filterAsrama}
                onChange={(e) => setFilterAsrama(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-medium cursor-pointer"
              >
                <option value="Semua">Semua Asrama</option>
                {ASRAMA_OPTIONS.filter(a => a !== "Semua").map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-medium cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                <option value="kedisiplinan">Kedisiplinan</option>
                <option value="ibadah">Ibadah & Halaqah</option>
                <option value="kebersihan_kerapian">Kebersihan</option>
                <option value="akhlak_adab">Akhlak & Adab</option>
                <option value="akademik_bahasa">Bahasa & Akademik</option>
                <option value="prestasi_khidmah">Prestasi & Khidmah</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: DAFTAR CATATAN KASUS & REWARD ── */}
      {activeTab === "daftar" && (
        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-sm text-slate-800">Tidak Ada Catatan yang Sesuai</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Kondisi asrama aman dan kondusif atau belum ada data sesuai filter pencarian yang Anda pilih.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("tambah")}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Kasus / Apresiasi Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRecords.map(rec => {
                const isPelanggaran = rec.jenis === "pelanggaran";
                return (
                  <div
                    key={rec.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60 hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isPelanggaran 
                              ? "bg-rose-50 text-rose-700 border border-rose-200" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {isPelanggaran ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 leading-snug truncate">
                              {rec.namaSantri}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">
                                {rec.kelasSantri} • {rec.asrama}
                              </span>
                              {rec.id.startsWith("pembinaan_sync_") && (
                                <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.2 rounded-md font-mono whitespace-nowrap shrink-0">
                                  Pilar 1
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl font-mono shrink-0 whitespace-nowrap shadow-2xs ${
                          isPelanggaran 
                            ? "bg-rose-100 text-rose-800 border border-rose-200/80" 
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200/80"
                        }`}>
                          {rec.poin > 0 ? `+${rec.poin}` : rec.poin} Poin
                        </span>
                      </div>

                      {/* Content Box */}
                      <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 text-xs space-y-1.5 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider shrink-0 ${
                            isPelanggaran ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {rec.kategori.replace("_", " ")}
                          </span>
                          <p className="font-bold text-xs text-slate-800 truncate flex-1">
                            {rec.judulPeristiwa}
                          </p>
                        </div>
                        
                        {rec.deskripsi && rec.deskripsi.toLowerCase() !== rec.judulPeristiwa.toLowerCase() && (
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {rec.deskripsi}
                          </p>
                        )}

                        {rec.tindakanPembinaan && (
                          <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-amber-950 font-medium">
                            <HeartHandshake className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span className="leading-snug">{rec.tindakanPembinaan}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Footer Row */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] gap-2">
                      <div className="flex items-center gap-2 text-slate-500 min-w-0">
                        <span className="flex items-center gap-1 whitespace-nowrap shrink-0 font-mono text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {rec.tanggal}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`font-bold px-2 py-0.5 rounded-lg whitespace-nowrap text-[10px] border ${
                          rec.status === "selesai" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : rec.status === "sedang_berjalan" 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {rec.status === "selesai" ? "Selesai" : rec.status === "sedang_berjalan" ? "Berjalan" : "Perlu Tindakan"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleShareWA(rec)}
                          title="Kirim ke WhatsApp"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Kirim WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          title="Detail & Update"
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 transition-all active:scale-95 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          title="Hapus"
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 transition-all active:scale-95 shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FORM CATAT KASUS / APRESIASI ── */}
      {activeTab === "tambah" && (
        <form onSubmit={handleSaveRecord} className="space-y-4 max-w-3xl mx-auto bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800">Formulir Catatan Pembinaan Santri</h4>
              <p className="text-xs text-slate-400">Pilih template aturan cepat atau isi manual secara fleksibel</p>
            </div>
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setFormJenis("pelanggaran"); setFormPoin(-5); }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  formJenis === "pelanggaran" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-600"
                }`}
              >
                Pelanggaran
              </button>
              <button
                type="button"
                onClick={() => { setFormJenis("prestasi"); setFormPoin(15); }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  formJenis === "prestasi" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600"
                }`}
              >
                Prestasi / Reward
              </button>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              ⚡ Pilih Cepat dari Kamus Aturan & Poin ({formJenis === "pelanggaran" ? "Pelanggaran" : "Prestasi"})
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {PRESET_ATURAN_LIST.filter(p => p.jenis === formJenis).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] border shrink-0 text-left transition-all active:scale-95 ${
                    formJudul === preset.judul 
                      ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs" 
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold mr-1">{preset.poin > 0 ? `+${preset.poin}` : preset.poin}</span>
                  <span>{preset.judul}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Santri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Santri <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ketik nama santri..."
                value={formNamaSantri}
                onChange={e => handleSearchSantriChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              {showSuggestions && santriSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-slate-200 z-30 max-h-48 overflow-y-auto">
                  {santriSuggestions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSantri(s)}
                      className="p-2.5 hover:bg-amber-50 cursor-pointer text-xs border-b border-slate-100 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{s.nama}</p>
                        <p className="text-[10px] text-slate-400">{s.kelasLengkap} • NISN: {s.nisn || "-"}</p>
                      </div>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">Pilih</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Santri</label>
              <input
                type="text"
                placeholder="Contoh: 1 A, 2 B, 4 IPA 1..."
                value={formKelasSantri}
                onChange={e => setFormKelasSantri(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Asrama & Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Asrama</label>
              <select
                value={formAsrama}
                onChange={e => setFormAsrama(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
              >
                {ASRAMA_OPTIONS.filter(a => a !== "Semua").map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kamar / Lokasi Kejadian</label>
              <input
                type="text"
                placeholder="Contoh: Kamar 102 / Masjid / Kantin..."
                value={formLokasi}
                onChange={e => setFormLokasi(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Waktu & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={formTanggal}
                onChange={e => setFormTanggal(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
              <select
                value={formKategori}
                onChange={e => setFormKategori(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
              >
                <option value="kedisiplinan">Kedisiplinan & Tata Tertib</option>
                <option value="ibadah">Ibadah & Halaqah</option>
                <option value="kebersihan_kerapian">Kebersihan & Kerapian</option>
                <option value="akhlak_adab">Akhlak & Adab Asrama</option>
                <option value="akademik_bahasa">Bahasa & Akademik</option>
                <option value="prestasi_khidmah">Prestasi & Khidmah</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skor Poin ({formPoin})
              </label>
              <input
                type="number"
                value={formPoin}
                onChange={e => setFormPoin(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Judul & Detail */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Peristiwa / Kasus <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ringkasan kejadian..."
              value={formJudul}
              onChange={e => setFormJudul(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kronologi / Uraian Detail</label>
            <textarea
              rows={3}
              placeholder="Keterangan tambahan mengenai peristiwa yang terjadi..."
              value={formDeskripsi}
              onChange={e => setFormDeskripsi(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          {/* Tindakan / Sanksi Edukatif */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bentuk Pembinaan / Sanksi Edukatif / Apresiasi
            </label>
            <input
              type="text"
              placeholder="Contoh: Menghafal Surat As-Sajdah, Piket lorong asrama, Nasihat musyrif..."
              value={formTindakan}
              onChange={e => setFormTindakan(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status Penanganan</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormStatus("perlu_tindakan")}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  formStatus === "perlu_tindakan" 
                    ? "bg-amber-50 border-amber-400 text-amber-800 shadow-2xs" 
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                ⚠️ Perlu Tindakan
              </button>
              <button
                type="button"
                onClick={() => setFormStatus("sedang_berjalan")}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  formStatus === "sedang_berjalan" 
                    ? "bg-blue-50 border-blue-400 text-blue-800 shadow-2xs" 
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                ⏳ Sedang Berjalan
              </button>
              <button
                type="button"
                onClick={() => setFormStatus("selesai")}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  formStatus === "selesai" 
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs" 
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                ✅ Selesai
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("daftar")}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Simpan Catatan Pembinaan
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 3: REKAP POIN & SP TRACKER ── */}
      {activeTab === "rekap" && (
        <div className="space-y-3">
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-3xl flex items-start gap-3 text-xs text-amber-950 shadow-xs ring-1 ring-amber-500/20">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Standar Operasional Prosedur (SOP) Surat Peringatan (SP) Mu'allimin:</p>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                • <b>20 – 44 Poin Minus:</b> <b>SP 1</b> (Peringatan Lisan & Bimbingan Khusus Musyrif/Pamong)<br/>
                • <b>45 – 74 Poin Minus:</b> <b>SP 2</b> (Peringatan Tertulis Resmi & Pemanggilan Orang Tua/Wali)<br/>
                • <b>≥ 75 Poin Minus:</b> <b>SP 3</b> (Sidang Kehormatan Dewan Pamong & Skorsing Edukatif)
              </p>
            </div>
          </div>

          {santriSummaryList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60">
              <p className="text-xs text-slate-400">Belum ada data akumulasi poin santri.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs ring-1 ring-slate-200/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5">Santri & Kelas</th>
                      <th className="p-3.5">Asrama</th>
                      <th className="p-3.5 text-center">Poin Minus</th>
                      <th className="p-3.5 text-center">Poin Plus</th>
                      <th className="p-3.5 text-center">Net Skor</th>
                      <th className="p-3.5">Status Pembinaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {santriSummaryList
                      .sort((a, b) => b.totalPoinPelanggaran - a.totalPoinPelanggaran)
                      .map((s, idx) => {
                        const sp = getSPBadge(s.totalPoinPelanggaran);
                        const IconComponent = sp.icon;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900">{s.nama}</p>
                              <p className="text-[10px] text-slate-400">{s.kelas}</p>
                            </td>
                            <td className="p-3.5 text-slate-600">{s.asrama}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                              -{s.totalPoinPelanggaran}
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-emerald-600">
                              +{s.totalPoinPrestasi}
                            </td>
                            <td className="p-3.5 text-center font-mono font-extrabold text-slate-800">
                              {s.netPoin}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full ${sp.bg}`}>
                                <IconComponent className="w-3 h-3" />
                                {sp.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: KAMUS ATURAN & POIN ── */}
      {activeTab === "panduan" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_ATURAN_LIST.map((aturan, idx) => (
              <div key={idx} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                    aturan.jenis === "pelanggaran" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {aturan.poin > 0 ? `+${aturan.poin}` : aturan.poin} Poin ({aturan.tingkat.toUpperCase()})
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 capitalize">
                    {aturan.kategori.replace("_", " ")}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-800">{aturan.judul}</h4>
                <p className="text-[11px] text-slate-500">
                  <b>Sanksi / Apresiasi:</b> {aturan.sanksiDefault}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL OVERLAY ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-800">Detail Lembar Pembinaan</h4>
                <p className="text-[10px] text-slate-400">{selectedRecord.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-900">{selectedRecord.namaSantri}</p>
                  <p className="text-[10px] text-slate-500">{selectedRecord.kelasSantri} • {selectedRecord.asrama}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs h-fit ${
                  selectedRecord.jenis === "pelanggaran" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {selectedRecord.poin > 0 ? `+${selectedRecord.poin}` : selectedRecord.poin} Poin
                </span>
              </div>

              <div className="p-3 border border-slate-100 rounded-2xl space-y-1">
                <p className="font-bold text-slate-800">{selectedRecord.judulPeristiwa}</p>
                <p className="text-slate-600 text-[11px]">{selectedRecord.deskripsi || "Tidak ada rincian tambahan."}</p>
                <p className="text-[10px] text-slate-400 pt-1">
                  Lokasi: {selectedRecord.lokasiKejadian} • Waktu: {selectedRecord.tanggal} ({selectedRecord.waktu} WIB)
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900">
                <p className="font-bold text-[11px]">Bentuk Tindakan / Apresiasi:</p>
                <p className="text-xs mt-0.5">{selectedRecord.tindakanPembinaan || "Belum ada tindakan spesifik."}</p>
              </div>

              {selectedRecord.catatanPamong && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-800 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{selectedRecord.catatanPamong}</span>
                </div>
              )}

              {/* Status Updater */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ubah Status Penanganan:</label>
                <div className="flex gap-2">
                  {(["perlu_tindakan", "sedang_berjalan", "selesai"] as StatusPembinaan[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedRecord.id, st)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selectedRecord.status === st 
                          ? "bg-amber-600 text-white border-amber-600 shadow-2xs" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {st === "selesai" ? "Selesai" : st === "sedang_berjalan" ? "Berjalan" : "Perlu Tindakan"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleShareWA(selectedRecord)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                Kirim Laporan WA
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

