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
}

export function PagePembinaanSantri({
  onBack,
  authUser,
  musyrifList = [],
  santriList = ALL_SANTRI_DATA
}: PagePembinaanSantriProps) {
  const [records, setRecords] = useState<PembinaanRecord[]>(() => loadPembinaanRecords());
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
    savePembinaanRecords(records);
  }, [records]);

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

    setRecords(prev => [newRecord, ...prev]);
    triggerHaptic("success");
    appAlert(`Catatan ${formJenis === "pelanggaran" ? "pembinaan" : "prestasi"} untuk "${newRecord.namaSantri}" berhasil disimpan.`, "Berhasil Disimpan");

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
      setRecords(prev => prev.filter(r => r.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
      triggerHaptic("medium");
    });
  };

  // Update Status
  const handleUpdateStatus = (id: string, newStatus: StatusPembinaan) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
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
      const key = `${r.namaSantri.trim()}_${r.kelasSantri.trim()}`;
      if (!map[key]) {
        map[key] = {
          nama: r.namaSantri,
          kelas: r.kelasSantri,
          asrama: r.asrama,
          totalPoinPelanggaran: 0,
          totalPoinPrestasi: 0,
          netPoin: 0,
          countPelanggaran: 0,
          countPrestasi: 0,
          pendingTindakanCount: 0
        };
      }
      if (r.jenis === "pelanggaran") {
        map[key].totalPoinPelanggaran += Math.abs(r.poin);
        map[key].countPelanggaran += 1;
        if (r.status === "perlu_tindakan") map[key].pendingTindakanCount += 1;
      } else {
        map[key].totalPoinPrestasi += Math.abs(r.poin);
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
        const q = searchQuery.toLowerCase();
        const matchNama = r.namaSantri.toLowerCase().includes(q);
        const matchJudul = r.judulPeristiwa.toLowerCase().includes(q);
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onBack();
            }}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs shrink-0"
            title="Kembali ke Dasbor"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Lembar Pembinaan Santri
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-mono">
                Disiplin & Reward
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seluruh Asrama · Pencatatan poin pelanggaran, Surat Peringatan (SP), konseling & apresiasi santri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(activeTab === "panduan" ? "daftar" : "panduan");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
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
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-amber-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Kasus / Apresiasi</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED METRICS & SEARCH/FILTER CONTAINER CARD ── */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-xs ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
        {/* Interactive Metric Tiles Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Tile 1: Semua */}
          <button
            type="button"
            onClick={() => {
              setScopeFilter("semua");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "semua" && activeTab === "daftar"
                ? "bg-amber-50/90 border-amber-300 ring-amber-500/30 text-amber-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "semua" && activeTab === "daftar" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Semua Data</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.totalRecords}</p>
            </div>
          </button>

          {/* Tile 2: Perlu Tindakan */}
          <button
            type="button"
            onClick={() => {
              setScopeFilter("perlu_tindakan");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "perlu_tindakan" && activeTab === "daftar"
                ? "bg-amber-50/90 border-amber-300 ring-amber-500/30 text-amber-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "perlu_tindakan" && activeTab === "daftar" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Perlu Tindakan</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.pendingCount}</p>
            </div>
          </button>

          {/* Tile 3: Pelanggaran */}
          <button
            type="button"
            onClick={() => {
              setScopeFilter("pelanggaran");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "pelanggaran" && activeTab === "daftar"
                ? "bg-rose-50/90 border-rose-300 ring-rose-500/30 text-rose-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "pelanggaran" && activeTab === "daftar" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
            }`}>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Pelanggaran</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.pelanggaranCount}</p>
            </div>
          </button>

          {/* Tile 4: Prestasi / Reward */}
          <button
            type="button"
            onClick={() => {
              setScopeFilter("prestasi");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "prestasi" && activeTab === "daftar"
                ? "bg-emerald-50/90 border-emerald-300 ring-emerald-500/30 text-emerald-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "prestasi" && activeTab === "daftar" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
            }`}>
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Apresiasi</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.prestasiCount}</p>
            </div>
          </button>

          {/* Tile 5: Rekap SP Tracker */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("rekap");
              triggerHaptic("light");
            }}
            className={`col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              activeTab === "rekap"
                ? "bg-purple-50/90 border-purple-300 ring-purple-500/30 text-purple-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === "rekap" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700"
            }`}>
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Status SP</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.spCount} Santri</p>
            </div>
          </button>
        </div>

        {/* Tab Navigation Pills & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("daftar");
                triggerHaptic("light");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "daftar"
                  ? "bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Daftar Kasus ({filteredRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("tambah");
                triggerHaptic("light");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "tambah"
                  ? "bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Form Catat Kasus</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("rekap");
                triggerHaptic("light");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "rekap"
                  ? "bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Akumulasi Poin & SP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("panduan");
                triggerHaptic("light");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "panduan"
                  ? "bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kamus Aturan</span>
            </button>
          </div>

          {/* Quick Filters for Daftar Tab */}
          {activeTab === "daftar" && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari santri / kasus..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <select
                value={filterAsrama}
                onChange={e => setFilterAsrama(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none"
              >
                {ASRAMA_OPTIONS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRecords.map(rec => {
                const isPelanggaran = rec.jenis === "pelanggaran";
                return (
                  <div
                    key={rec.id}
                    className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs ring-1 ring-slate-200/60 hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isPelanggaran 
                              ? "bg-rose-50 text-rose-700 border border-rose-200" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {isPelanggaran ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">
                              {rec.namaSantri}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {rec.kelasSantri} • {rec.asrama}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono ${
                          isPelanggaran ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {rec.poin > 0 ? `+${rec.poin}` : rec.poin} Poin
                        </span>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs space-y-1 mb-2.5">
                        <p className="font-bold text-slate-800 leading-snug">
                          {rec.judulPeristiwa}
                        </p>
                        {rec.deskripsi && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {rec.deskripsi}
                          </p>
                        )}
                        {rec.tindakanPembinaan && (
                          <div className="pt-1.5 border-t border-slate-200/60 mt-1 flex items-start gap-1.5 text-[10px] text-amber-900 font-medium">
                            <HeartHandshake className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>{rec.tindakanPembinaan}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{rec.tanggal}</span>
                        <span>•</span>
                        <span className={`font-semibold px-1.5 py-0.2 rounded-md ${
                          rec.status === "selesai" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : rec.status === "sedang_berjalan" 
                            ? "bg-blue-50 text-blue-700 border border-blue-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {rec.status === "selesai" ? "Selesai" : rec.status === "sedang_berjalan" ? "Berjalan" : "Perlu Tindakan"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleShareWA(rec)}
                          title="Kirim ke WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors active:scale-95"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          title="Detail & Update"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors active:scale-95"
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

