import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { 
  X, CheckCircle, AlertCircle, Clock, Upload, Camera,
  FileCheck2, ShieldCheck, Check, Ban, Eye, User, Users, Calendar, MapPin,
  ChevronLeft, Plus, Search, Filter, Share2, Printer, QrCode, Phone,
  Building2, ShieldAlert, ArrowRight, ArrowLeft, RefreshCw, Send, CheckCircle2,
  ExternalLink, FileText, AlertTriangle, UserCheck, KeyRound, Sparkles,
  Award, School, ChevronRight, HelpCircle, Download, CheckCheck,
  Stethoscope, Moon, Heart, Navigation, ToggleLeft, ToggleRight,
  Zap, CalendarDays, ThumbsUp, MessageSquare, Trash2
} from "lucide-react";
import { format, addDays, nextSaturday, nextSunday } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";
import { ALL_SANTRI_DATA, searchSantri, SantriData } from "../data/santriData";
import { appAlert, appConfirm } from "../utils/customDialog";
import { SantriIzinRecord, JenisIzinSantri, StatusApprovalSantri, StatusPKM } from "../types/izinSantri";
import { compressAndWatermarkImage } from "../utils/imageCompressor";
import syamsaLogomark from "../../assets/branding/Logomark.webp";

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
  kelas?: string;
}

interface AuthUser {
  id: string;
  name: string;
  role: "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif" | "admin" | "keamanan" | string;
  musyrifId?: string;
  asrama?: string;
  kamar?: string;
  email?: string;
}

interface PageSantriIzinProps {
  onBack: () => void;
  authUser: AuthUser | null;
  musyrifList: Musyrif[];
  asramaList: string[];
  santriList?: SantriData[];
  santriIzinList: SantriIzinRecord[];
  onSaveSantriIzin: (recordOrList: Omit<SantriIzinRecord, "id" | "nomorSurat" | "createdAt" | "updatedAt"> | Array<Omit<SantriIzinRecord, "id" | "nomorSurat" | "createdAt" | "updatedAt">>) => void;
  onUpdateSantriIzin?: (record: SantriIzinRecord) => void;
  onApproveSantriIzin: (id: string, approved: boolean, catatan?: string) => void;
  onPKMTap: (id: string, type: "keluar" | "kembali", petugasName: string) => void;
  onDeleteSantriIzin?: (id: string) => void;
}

const HUBUNGAN_PENJEMPUT_OPTIONS = [
  "Orang Tua (Ayah/Ibu)",
  "Saudara Kandung",
  "Kakek / Nenek",
  "Paman / Bibi",
  "Wali Resmi / Pihak Keluarga",
  "Pihak Sekolah / Guru",
  "Mandiri / Tanpa Penjemput"
];

const TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00"
];

const getJenisIzinBadge = (jenis: JenisIzinSantri) => {
  switch (jenis) {
    case "pulang_menginap":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>Izin Pulang</span>
        </span>
      );
    case "kesehatan_berobat":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
          <Stethoscope className="w-3 h-3" />
          <span>Berobat Medis</span>
        </span>
      );
    case "rutin_sabtu_ahad":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          <span>Rutin Akhir Pekan</span>
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
          <FileCheck2 className="w-3 h-3" />
          <span>Keluar Biasa</span>
        </span>
      );
  }
};

export const PageSantriIzin: React.FC<PageSantriIzinProps> = ({
  onBack,
  authUser,
  musyrifList,
  asramaList,
  santriList = ALL_SANTRI_DATA,
  santriIzinList,
  onSaveSantriIzin,
  onUpdateSantriIzin,
  onApproveSantriIzin,
  onPKMTap,
  onDeleteSantriIzin
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"daftar" | "ajukan" | "pkm" | "kartu">("daftar");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterAsrama, setFilterAsrama] = useState<string>("Semua");
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"hari_ini" | "pending" | "di_luar" | "terlambat" | "semua">("hari_ini");
  
  // Selected Izin for Detail / Kartu Preview
  const [selectedIzin, setSelectedIzin] = useState<SantriIzinRecord | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Post Submit Success Modal State
  const [lastSubmittedIzin, setLastSubmittedIzin] = useState<SantriIzinRecord | null>(null);

  // PKM Scan / Quick search query
  const [pkmQuery, setPkmQuery] = useState("");
  const deferredPkmQuery = useDeferredValue(pkmQuery);

  // ===================== STEPPER WIZARD STATE (1: Santri, 2: Jenis, 3: Waktu, 4: Wali) =====================
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Multiple Santri Selection
  const [santriQuery, setSantriQuery] = useState("");
  const [selectedSantriList, setSelectedSantriList] = useState<SantriData[]>([]);
  const [santriSearchResults, setSantriSearchResults] = useState<SantriData[]>([]);
  const [showSantriDropdown, setShowSantriDropdown] = useState(false);

  // Step 2: Jenis Izin
  const [jenisIzin, setJenisIzin] = useState<JenisIzinSantri>("keluar_biasa");

  // Step 3: Waktu & Keperluan
  const [tglKeluar, setTglKeluar] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [jamKeluar, setJamKeluar] = useState<string>("08:00");
  const [tglKembali, setTglKembali] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [jamKembali, setJamKembali] = useState<string>("17:00");
  const [keperluan, setKeperluan] = useState<string>("");
  const [alasanDetail, setAlasanDetail] = useState<string>("");
  const [tujuanLokasi, setTujuanLokasi] = useState<string>("");
  const [rekomendasiPoskestren, setRekomendasiPoskestren] = useState<string>("");
  const [isPoskestrenApproved, setIsPoskestrenApproved] = useState<boolean>(false);

  // Cek apakah perizinan memerlukan rekomendasi / persetujuan Dokter Poskestren
  const isPoskestrenRequired = useMemo(() => {
    if (jenisIzin === "kesehatan_berobat" || jenisIzin === "pulang_menginap" || jenisIzin === "rutin_sabtu_ahad") {
      return true;
    }
    const q = `${keperluan} ${tujuanLokasi}`.toLowerCase();
    return (
      q.includes("pku") ||
      q.includes("rs") ||
      q.includes("faskes") ||
      q.includes("klinik") ||
      q.includes("puskesmas") ||
      q.includes("dokter") ||
      q.includes("pulang") ||
      q.includes("sakit") ||
      q.includes("rawat")
    );
  }, [jenisIzin, keperluan, tujuanLokasi]);

  // Step 4: Wali & Penjemput (DEFAULT: Tanpa Penjemput / Mandiri)
  const [asramaForm, setAsramaForm] = useState<string>(authUser?.asrama || asramaList[0] || "Asrama 1");
  const [kamarForm, setKamarForm] = useState<string>(authUser?.kamar || "Kamar 1");
  const [namaWali, setNamaWali] = useState<string>("");
  const [alamatWali, setAlamatWali] = useState<string>("");
  const [noHpWali, setNoHpWali] = useState<string>("");
  const [adaPenjemput, setAdaPenjemput] = useState<boolean>(false); // DEFAULT: FALSE (Tanpa Penjemput)
  const [namaPenjemput, setNamaPenjemput] = useState<string>("");
  const [hubunganPenjemput, setHubunganPenjemput] = useState<string>("Orang Tua (Ayah/Ibu)");

  // Photo State & Modal (Mandatory Pure Compressed Photo)
  const [fotoSantriUrl, setFotoSantriUrl] = useState<string>("");
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [photoModalItem, setPhotoModalItem] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Handle Photo Compression (Tanpa Watermark untuk Izin Santri)
  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic("light");
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressAndWatermarkImage(file);
      setFotoSantriUrl(compressed);
      triggerHaptic("medium");
    } catch {
      appAlert("Gagal memproses dan mengompres foto.", "Peringatan", "error");
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = "";
    }
  };

  // Santri binaan cepat (Quick santri chips for logged in Musyrif)
  const myAssignedSantri = useMemo(() => {
    const list = santriList || ALL_SANTRI_DATA;
    if (!authUser?.asrama) return list.slice(0, 8);
    const matched = list.filter(s => s.asrama === authUser.asrama || (authUser.kamar && s.kamar === authUser.kamar));
    return matched.length > 0 ? matched.slice(0, 10) : list.slice(0, 8);
  }, [santriList, authUser]);

  // Debounced search logic for Santri
  useEffect(() => {
    if (santriQuery.trim().length >= 2) {
      const results = searchSantri(santriQuery, 8, santriList);
      setSantriSearchResults(results);
      setShowSantriDropdown(true);
    } else {
      setSantriSearchResults([]);
      setShowSantriDropdown(false);
    }
  }, [santriQuery, santriList]);

  // Toggle or add santri to selected list
  const handleToggleSantri = (s: SantriData) => {
    setSelectedSantriList(prev => {
      const exists = prev.some(item => (item.id && item.id === s.id) || (item.nisn && item.nisn === s.nisn) || item.nama.toLowerCase() === s.nama.toLowerCase());
      if (exists) {
        return prev.filter(item => !((item.id && item.id === s.id) || (item.nisn && item.nisn === s.nisn) || item.nama.toLowerCase() === s.nama.toLowerCase()));
      } else {
        if (prev.length === 0) {
          if (s.asrama) setAsramaForm(s.asrama);
          if (s.kamar) setKamarForm(s.kamar);
          const parentName = s.namaAyah || s.namaIbu || s.namaWali || "";
          if (parentName) setNamaWali(parentName);
          if (s.alamat || s.kabupaten) setAlamatWali(s.alamat || s.kabupaten || "Yogyakarta");
          if (s.telpAyah || s.telpIbu || s.telpWali) setNoHpWali(s.telpAyah || s.telpIbu || s.telpWali || "");
        }
        return [...prev, s];
      }
    });
    setSantriQuery("");
    setShowSantriDropdown(false);
    triggerHaptic("light");
  };

  const handleRemoveSantri = (identifier: string) => {
    setSelectedSantriList(prev => prev.filter(s => s.id !== identifier && s.nisn !== identifier && s.nama !== identifier));
    triggerHaptic("light");
  };

  const handleAddManualSantri = () => {
    if (!santriQuery.trim()) return;
    const manualSantri: SantriData = {
      id: `manual-${Date.now()}`,
      nama: santriQuery.trim(),
      nisn: "-",
      kelasLengkap: "Kelas Asrama",
      asrama: asramaForm,
      kamar: kamarForm
    };
    handleToggleSantri(manualSantri);
  };

  // Helper Duration Calculation
  const calculateDuration = useMemo(() => {
    try {
      if (jenisIzin === "pulang_menginap" || jenisIzin === "kesehatan_berobat") {
        if (tglKeluar && tglKembali && tglKeluar !== tglKembali) {
          const diffDays = Math.round((new Date(tglKembali).getTime() - new Date(tglKeluar).getTime()) / (1000 * 3600 * 24));
          if (diffDays > 0) return `${diffDays + 1} Hari (${diffDays} Malam)`;
        }
      }
      const [hOut, mOut] = jamKeluar.split(":").map(Number);
      const [hIn, mIn] = jamKembali.split(":").map(Number);
      let diffMinutes = (hIn * 60 + mIn) - (hOut * 60 + mOut);
      if (diffMinutes < 0) diffMinutes += 1440;
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (hours > 0 && minutes > 0) return `${hours} Jam ${minutes} Menit`;
      if (hours > 0) return `${hours} Jam`;
      if (minutes > 0) return `${minutes} Menit`;
      return "Hari yang sama";
    } catch {
      return "-";
    }
  }, [jenisIzin, tglKeluar, tglKembali, jamKeluar, jamKembali]);

  // Handler quick time preset for SOP
  const applySOPPreset = (type: JenisIzinSantri, autoAdvance: boolean = false) => {
    setJenisIzin(type);
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    setTglKeluar(todayStr);

    if (type === "rutin_sabtu_ahad") {
      const dayOfWeek = today.getDay(); // 6 = Saturday, 0 = Sunday
      if (dayOfWeek === 6) {
        setJamKeluar("15:30");
        setTglKembali(todayStr);
        setJamKembali("17:00");
        setKeperluan("Izin Rutin Sabtu Sore");
        setTujuanLokasi("Sekitar Lingkungan Madrasah & Asrama");
      } else {
        setJamKeluar("06:30");
        setTglKembali(todayStr);
        setJamKembali("11:00");
        setKeperluan("Izin Rutin Ahad Pagi");
        setTujuanLokasi("Sekitar Lingkungan Madrasah & Asrama");
      }
    } else if (type === "kesehatan_berobat") {
      setJamKeluar(format(today, "HH:mm"));
      setTglKembali(todayStr);
      setJamKembali("16:00");
      setKeperluan("Pemeriksaan Kesehatan / Rawat Sakit");
      setTujuanLokasi("RS PKU Muhammadiyah / Klinik");
      setRekomendasiPoskestren("Rekomendasi Dokter Poskestren");
    } else if (type === "keluar_biasa") {
      setJamKeluar("08:00");
      setTglKembali(todayStr);
      setJamKembali("17:00");
      setKeperluan("");
      setTujuanLokasi("");
    } else if (type === "pulang_menginap") {
      setJamKeluar("14:00");
      const next2Days = new Date(today);
      next2Days.setDate(today.getDate() + 2);
      setTglKembali(format(next2Days, "yyyy-MM-dd"));
      setJamKembali("17:00");
      setKeperluan("Izin Pulang / Menginap ke Rumah");
      setTujuanLokasi("Kediaman Orang Tua / Wali");
    }

    triggerHaptic("light");
    if (autoAdvance) {
      setTimeout(() => setFormStep(3), 200);
    }
  };

  // Quick Date presets
  const applyDatePreset = (preset: "today" | "tomorrow" | "saturday" | "sunday") => {
    const today = new Date();
    let targetDate = today;
    if (preset === "tomorrow") targetDate = addDays(today, 1);
    else if (preset === "saturday") targetDate = today.getDay() === 6 ? today : nextSaturday(today);
    else if (preset === "sunday") targetDate = today.getDay() === 0 ? today : nextSunday(today);

    const formatted = format(targetDate, "yyyy-MM-dd");
    setTglKeluar(formatted);
    if (jenisIzin === "keluar_biasa" || jenisIzin === "rutin_sabtu_ahad") {
      setTglKembali(formatted);
    }
    triggerHaptic("light");
  };

  // Stats calculation
  const stats = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const total = santriIzinList.length;
    const pending = santriIzinList.filter(i => String(i?.statusApproval || "").startsWith("pending")).length;
    const diLuar = santriIzinList.filter(i => String(i?.statusApproval || "") === "approved" && i?.statusPKM === "di_luar").length;
    const terlambat = santriIzinList.filter(i => i?.statusPKM === "terlambat").length;
    const hariIni = santriIzinList.filter(i => {
      const st = String(i?.statusApproval || "");
      if (st !== "approved") return false;
      return (
        i.tglKeluarRencana === todayStr ||
        i.tglKembaliRencana === todayStr ||
        (i.tglKeluarRencana <= todayStr && i.tglKembaliRencana >= todayStr)
      );
    }).length;
    return { total, pending, diLuar, terlambat, hariIni };
  }, [santriIzinList]);

  // ── 1. DEDICATED LIST: PENDING APPROVAL (Butuh Persetujuan Ustadz / Pamong) ──
  const pendingApprovalList = useMemo(() => {
    return santriIzinList.filter(item => {
      if (!item) return false;
      const st = String(item.statusApproval || "");
      if (!st.startsWith("pending")) return false;
      if (filterAsrama && filterAsrama.toLowerCase() !== "semua" && item.asrama !== filterAsrama) return false;
      if (filterJenis && filterJenis.toLowerCase() !== "all" && filterJenis.toLowerCase() !== "semua" && item.jenisIzin !== filterJenis) return false;
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const nama = String(item.namaSantri || "").toLowerCase();
        const nisn = String(item.nisn || "");
        const kelas = String(item.kelas || "").toLowerCase();
        const noSurat = String(item.nomorSurat || "").toLowerCase();
        return nama.includes(q) || nisn.includes(q) || kelas.includes(q) || noSurat.includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [santriIzinList, filterAsrama, filterJenis, deferredSearchQuery]);

  // ── 2. MAIN LIST: PERIZINAN DISETUJUI (Default: Hari Ini) ──
  const mainApprovedList = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return santriIzinList.filter(item => {
      if (!item) return false;
      const stApproval = String(item.statusApproval || "");
      const stPKM = String(item.statusPKM || "");
      
      // Exclude pending items from main list since they have their own dedicated top section
      if (stApproval.startsWith("pending")) return false;

      if (filterAsrama && filterAsrama.toLowerCase() !== "semua" && item.asrama !== filterAsrama) return false;
      if (filterJenis && filterJenis.toLowerCase() !== "all" && filterJenis.toLowerCase() !== "semua" && item.jenisIzin !== filterJenis) return false;
      
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const nama = String(item.namaSantri || "").toLowerCase();
        const nisn = String(item.nisn || "");
        const kelas = String(item.kelas || "").toLowerCase();
        const noSurat = String(item.nomorSurat || "").toLowerCase();
        if (!nama.includes(q) && !nisn.includes(q) && !kelas.includes(q) && !noSurat.includes(q)) return false;
      }

      if (scopeFilter === "hari_ini") {
        if (stApproval !== "approved") return false;
        const isToday = 
          item.tglKeluarRencana === todayStr ||
          item.tglKembaliRencana === todayStr ||
          (item.tglKeluarRencana <= todayStr && item.tglKembaliRencana >= todayStr);
        return isToday;
      } else if (scopeFilter === "di_luar") {
        return stApproval === "approved" && stPKM === "di_luar";
      } else if (scopeFilter === "terlambat") {
        return stPKM === "terlambat";
      } else if (scopeFilter === "pending") {
        return false; // Rendered via pending list
      } else {
        // "semua"
        return stApproval === "approved" || stApproval === "rejected";
      }
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [santriIzinList, filterAsrama, filterJenis, deferredSearchQuery, scopeFilter]);

  // Filtered list for PKM (Active approved permissions)
  const pkmActiveList = useMemo(() => {
    return santriIzinList.filter(item => {
      if (!item) return false;
      if (String(item.statusApproval || "") !== "approved") return false;
      if (!deferredPkmQuery.trim()) return true;
      const q = deferredPkmQuery.toLowerCase();
      return (
        String(item.namaSantri || "").toLowerCase().includes(q) ||
        String(item.nisn || "").includes(q) ||
        String(item.nomorSurat || "").toLowerCase().includes(q) ||
        String(item.kelas || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (a.statusPKM === "di_luar" && b.statusPKM !== "di_luar") return -1;
      if (b.statusPKM === "di_luar" && a.statusPKM !== "di_luar") return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [santriIzinList, deferredPkmQuery]);

  // Submit Handler
  const isKoorMusyrif = authUser?.role === "koordinator_musyrif" || authUser?.role === "admin";
  const isPamongOrAdmin = authUser?.role === "pamong" || isKoorMusyrif || authUser?.role === "koordinator_gedung";
  const isMusyrif = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";
  const isPKM = authUser?.role === "keamanan" || authUser?.role === "admin" || isPamongOrAdmin;

  // Handler submit form izin (Mendukung satu atau banyak santri sekaligus)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    let targetSantriList = [...selectedSantriList];
    if (targetSantriList.length === 0 && santriQuery.trim()) {
      targetSantriList = [{
        id: `manual-${Date.now()}`,
        nama: santriQuery.trim(),
        nisn: "-",
        kelasLengkap: "Kelas Asrama",
        asrama: asramaForm,
        kamar: kamarForm
      }];
    }

    if (targetSantriList.length === 0) {
      appAlert("Peringatan", "Silakan pilih minimal satu santri yang mengajukan izin.");
      setFormStep(1);
      return;
    }
    if (!keperluan.trim()) {
      appAlert("Peringatan", "Silakan isi keperluan perizinan.");
      setFormStep(3);
      return;
    }
    if (!tujuanLokasi.trim()) {
      appAlert("Peringatan", "Silakan isi tempat tujuan perizinan.");
      setFormStep(3);
      return;
    }

    // ── Logika Status Approval Awal (Langsung Disetujui jika dibuat oleh Musyrif/Pamong) ──
    const initialStatusApproval: StatusApprovalSantri = "approved";
    const disetujuiOleh = authUser?.name || "Musyrif / Pamong";
    const rolePenyetuju = authUser?.role || "musyrif";
    const waktuPenyetujuan = new Date().toISOString();

    // Penjemput default: Mandiri / Tanpa Penjemput
    const resolvedNamaPenjemput = adaPenjemput ? (namaPenjemput.trim() || "Penjemput Santri") : "Mandiri / Tanpa Penjemput";
    const resolvedHubunganPenjemput = adaPenjemput ? hubunganPenjemput : "Mandiri / Tanpa Penjemput";

    const recordsToSave = targetSantriList.map((s) => ({
      santriId: s.id || `santri-${Date.now()}`,
      nisn: s.nisn || "-",
      nis: s.nis,
      namaSantri: s.nama,
      kelas: s.kelasLengkap || "Kelas Asrama",
      asrama: s.asrama || asramaForm,
      kamar: s.kamar || kamarForm,
      namaWali: (namaWali || s.namaAyah || s.namaIbu || "Orang Tua / Wali").trim(),
      alamatWali: (alamatWali || s.alamat || "Yogyakarta").trim(),
      noHpWali: (noHpWali || s.telpAyah || s.telpIbu || "").trim(),
      namaPenjemput: resolvedNamaPenjemput,
      hubunganPenjemput: resolvedHubunganPenjemput,
      rekomendasiPoskestren: rekomendasiPoskestren.trim(),
      jenisIzin: jenisIzin,
      keperluan: keperluan.trim(),
      alasanDetail: alasanDetail.trim(),
      tujuanLokasi: tujuanLokasi.trim(),
      tglKeluarRencana: tglKeluar,
      jamKeluarRencana: jamKeluar,
      tglKembaliRencana: tglKembali,
      jamKembaliRencana: jamKembali,
      statusApproval: initialStatusApproval,
      status: "APPROVED",
      statusPKM: "menunggu_keluar" as StatusPKM,
      disetujuiOleh: disetujuiOleh,
      rolePenyetuju: rolePenyetuju,
      photoUrl: fotoSantriUrl || undefined,
      dibuatOleh: authUser?.name || "Musyrif / Staff",
      rolePembuat: authUser?.role || "musyrif",
      userEmail: (authUser as any)?.email || ""
    }));

    onSaveSantriIzin(recordsToSave);
    triggerHaptic("success");

    const createdIzin: SantriIzinRecord = {
      ...recordsToSave[0],
      id: `IZN-${Date.now().toString(36).toUpperCase()}`,
      nomorSurat: `IZN-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLastSubmittedIzin(createdIzin);
    setSelectedSantriList([]);
    setSantriQuery("");
    setKeperluan("");
    setAlasanDetail("");
    setTujuanLokasi("");
    setFotoSantriUrl("");
    setAdaPenjemput(false);
    setNamaPenjemput("");
    setFormStep(1);
    setActiveTab("daftar");
  };

  // WhatsApp Message Generator (Format Laporan Resmi Satpam)
  const generateWhatsAppMessage = (item: SantriIzinRecord) => {
    if (String(item.statusApproval || "") !== "approved") {
      appAlert(
        "Izin Belum Di-ACC",
        `Laporan WhatsApp belum dapat dikirimkan karena perizinan santri "${item.namaSantri}" masih berstatus [${String(item.statusApproval || "PENDING").toUpperCase()}]. Harap tunggu persetujuan resmi dari Pamong/Musyrif.`
      );
      return;
    }

    let dateHeaderStr = "";
    try {
      const refDate = item.tglKeluarRencana ? new Date(`${item.tglKeluarRencana}T00:00:00`) : new Date();
      const hari = format(refDate, "EEEE", { locale: id });
      const tglBlnThn = format(refDate, "dd/MM/yy");
      dateHeaderStr = `*(${hari} ${tglBlnThn})*`;
    } catch (_) {
      dateHeaderStr = "";
    }

    let durasiStr = "";
    try {
      const startDateTime = new Date(`${item.tglKeluarRencana}T${item.jamKeluarRencana || "07:00"}:00`);
      const endDateTime = new Date(`${item.tglKembaliRencana}T${item.jamKembaliRencana || "17:00"}:00`);
      const diffMs = endDateTime.getTime() - startDateTime.getTime();
      if (!isNaN(diffMs) && diffMs > 0) {
        const totalMinutes = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        if (hours >= 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          durasiStr = remainingHours > 0 ? `${days} Hari ${remainingHours} Jam` : `${days} Hari`;
        } else if (hours > 0) {
          durasiStr = mins > 0 ? `${hours} Jam ${mins} Menit` : `${hours} Jam`;
        } else {
          durasiStr = `${mins} Menit`;
        }
      } else {
        durasiStr = "Hari yang sama";
      }
    } catch (_) {
      durasiStr = "-";
    }

    const asramaTitle = item.asrama || "Asrama Sedayu";
    const waktuKeluar = `${item.tglKeluarRencana} ${item.jamKeluarRencana || ""} WIB`.trim();
    const waktuMasuk = `${item.tglKembaliRencana} ${item.jamKembaliRencana || ""} WIB`.trim();
    const deskripsi = [item.keperluan, item.tujuanLokasi ? `(Tujuan: ${item.tujuanLokasi})` : ""].filter(Boolean).join(" ");

    const text = 
`بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته

Izin melaporkan perizinan siswa ${asramaTitle} ${dateHeaderStr}

Nama : ${item.namaSantri}
Kelas : ${item.kelas || "-"}
Kamar : ${item.kamar || "-"}
Durasi keluar : ${durasiStr}
Waktu keluar : ${waktuKeluar}
Waktu masuk : ${waktuMasuk}
Deskripsi : ${deskripsi || item.alasanDetail || "-"}
Gedung : ${item.asrama || "Asrama Sedayu"}

Syukron bapak-bapak satpam yang bertugas 🙏`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── TOP HEADER CARD ── */}
      <div className="bg-white/90 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/80 shadow-sm ring-1 ring-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs shrink-0"
            title="Kembali ke Dasbor"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Perizinan Santri Asrama
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seluruh Asrama · Layanan izin keluar, berobat medis, pulang & pos gerbang (PKM)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(activeTab === "pkm" ? "daftar" : "pkm");
              setSelectedIzin(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeTab === "pkm"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pos Keamanan ({pkmActiveList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("ajukan");
              setSelectedIzin(null);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ajukan Izin Baru</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED METRICS & SEARCH/FILTER CONTAINER CARD ── */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
        {/* Interactive Metric Tiles Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => {
              setScopeFilter("hari_ini");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "hari_ini" && activeTab === "daftar"
                ? "bg-blue-50/90 border-blue-300 ring-blue-500/30 text-blue-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "hari_ini" && activeTab === "daftar" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Hari Ini</p>
              <p className="text-sm sm:text-base font-black leading-tight font-mono">{stats.hariIni}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("pending");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "pending" && activeTab === "daftar"
                ? "bg-amber-50/90 border-amber-300 ring-amber-500/30 text-amber-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "pending" && activeTab === "daftar" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Approval</p>
              <p className="text-sm sm:text-base font-black text-amber-700 leading-tight font-mono">{stats.pending}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("di_luar");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "di_luar" && activeTab === "daftar"
                ? "bg-sky-50/90 border-sky-300 ring-sky-500/30 text-sky-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "di_luar" && activeTab === "daftar" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700"
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Di Luar</p>
              <p className="text-sm sm:text-base font-black text-sky-800 leading-tight font-mono">{stats.diLuar}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("terlambat");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 ${
              scopeFilter === "terlambat" && activeTab === "daftar"
                ? "bg-rose-50/90 border-rose-300 ring-rose-500/30 text-rose-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "terlambat" && activeTab === "daftar" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Terlambat</p>
              <p className="text-sm sm:text-base font-black text-rose-700 leading-tight font-mono">{stats.terlambat}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("semua");
              setActiveTab("daftar");
              triggerHaptic("light");
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ring-1 shadow-2xs flex items-center gap-2.5 col-span-2 sm:col-span-1 ${
              scopeFilter === "semua" && activeTab === "daftar"
                ? "bg-violet-50/90 border-violet-300 ring-violet-500/30 text-violet-950 font-bold"
                : "bg-slate-50/80 border-slate-200/60 ring-slate-100 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scopeFilter === "semua" && activeTab === "daftar" ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700"
            }`}>
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Semua Arsip</p>
              <p className="text-sm sm:text-base font-black text-violet-900 leading-tight font-mono">{stats.total}</p>
            </div>
          </button>
        </div>

        {/* Integrated Search & Filter Toolbar inside Container */}
        {activeTab === "daftar" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari santri, NISN, kelas, nomor..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50/80 border border-slate-100/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium"
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
                className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-100/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium cursor-pointer"
              >
                <option value="Semua">Semua Asrama</option>
                {asramaList.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-100/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium cursor-pointer"
              >
                <option value="all">Semua Jenis Izin</option>
                <option value="keluar_biasa">Keluar Hari Ini</option>
                <option value="rutin_sabtu_ahad">Rutin Akhir Pekan</option>
                <option value="kesehatan_berobat">Ke Dokter / RS</option>
                <option value="pulang_menginap">Pulang / Menginap</option>
              </select>

              {(searchQuery || filterAsrama !== "Semua" || filterJenis !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterAsrama("Semua");
                    setFilterJenis("all");
                    triggerHaptic("light");
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition shrink-0"
                  title="Reset Filter"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════ TAB 1: DAFTAR & RIWAYAT IZIN ═════════════════════ */}
      {activeTab === "daftar" && (
        <div className="space-y-3">

          {/* ════════════ SECTION: MENUNGGU PERSALURAN / APPROVAL ════════════ */}
          {(scopeFilter === "pending" || (scopeFilter === "hari_ini" && pendingApprovalList.length > 0)) && pendingApprovalList.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>Menunggu Persetujuan</span>
                      <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold font-mono">
                        {pendingApprovalList.length} Perlu Tindakan
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      Pengajuan izin yang memerlukan verifikasi Ustadz Musyrif / Pamong Asrama
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingApprovalList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200 shadow-xs ring-1 ring-amber-50 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.namaSantri}</h4>
                            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-0.5 font-mono">
                              Menunggu Approval
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                              {item.kelas ? (item.kelas.startsWith("Kelas") ? item.kelas : `Kelas ${item.kelas}`) : "-"}
                            </span>
                            {getJenisIzinBadge(item.jenisIzin)}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            {item.asrama}{item.kamar ? ` · ${item.kamar.startsWith("Kamar") ? item.kamar : `Kamar ${item.kamar}`}` : ""} · No: <span className="font-mono">{item.nomorSurat}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            appConfirm(`Setujui permohonan izin santri ${item.namaSantri}?`, "Konfirmasi Persetujuan", {
                              type: "info",
                              confirmText: "Ya, Setujui"
                            }).then((ok) => {
                              if (ok) onApproveSantriIzin(item.id, true);
                            });
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Setujui</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectDialogId(item.id);
                            setRejectReason("");
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setSelectedIzin(item);
                            setActiveTab("kartu");
                          }}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </div>
                    </div>

                    {/* FOTO SANTRI IZIN (PENDING) */}
                    {(item.photoUrl || item.fotoSantriUrl || item.lampiranUrl) && (
                      <div 
                        className="relative rounded-2xl overflow-hidden border border-amber-200/80 bg-slate-950 group cursor-pointer"
                        onClick={() => setPhotoModalItem({ url: (item.photoUrl || item.fotoSantriUrl || item.lampiranUrl)!, title: item.namaSantri, subtitle: `${item.asrama} • Kelas ${item.kelas} • ${item.keperluan}` })}
                      >
                        <img 
                          src={item.photoUrl || item.fotoSantriUrl || item.lampiranUrl} 
                          alt={item.namaSantri} 
                          className="w-full h-36 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span>Klik untuk Perbesar Foto</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 space-y-1.5 text-xs text-slate-800">
                      <p className="leading-relaxed font-medium">
                        <span className="text-slate-500 font-semibold">Keperluan: </span>
                        {item.keperluan}
                        {item.tujuanLokasi && <span className="text-slate-500"> (Tujuan: {item.tujuanLokasi})</span>}
                      </p>
                      {item.namaPenjemput && (
                        <p className="text-slate-600 font-medium">
                          <span className="text-slate-500 font-semibold">Penjemput: </span>
                          {item.namaPenjemput} ({item.hubunganPenjemput || "Orang Tua"})
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 mt-1 border-t border-amber-200/60 gap-1">
                        <span className="text-[11px] font-mono text-slate-600">
                          Jadwal: <strong>{item.tglKeluarRencana} {item.jamKeluarRencana}</strong> s/d <strong>{item.tglKembaliRencana} {item.jamKembaliRencana} WIB</strong>
                        </span>
                        <span className="text-amber-800 font-bold text-[11px]">
                          Menunggu Persetujuan Musyrif / Pamong
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If on Pending view with 0 items */}
          {scopeFilter === "pending" && pendingApprovalList.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">Semua Pengajuan Telah Diverifikasi</p>
              <p className="text-xs text-slate-400">Tidak ada pengajuan izin santri yang menunggu persetujuan saat ini.</p>
            </div>
          )}

          {/* ════════════ SECTION: MAIN LIST (HARI INI / SEDANG DI LUAR / TERLAMBAT / SEMUA) ════════════ */}
          {scopeFilter !== "pending" && (
            <div className="space-y-3">
              {/* Results Grid */}
              {mainApprovedList.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2.5 shadow-xs">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">
                    {scopeFilter === "hari_ini" ? "Tidak Ada Santri Berizin Aktif Hari Ini" : "Tidak Ada Data Perizinan"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {scopeFilter === "hari_ini" ? (
                      <span>
                        Belum ada santri yang memiliki jadwal izin pada hari ini. Klik <button onClick={() => setScopeFilter("semua")} className="text-blue-600 font-bold underline">Semua Arsip</button> untuk melihat seluruh data.
                      </span>
                    ) : "Silakan sesuaikan kata kunci pencarian atau filter di atas."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {mainApprovedList.map((item) => {
                    const isNew = item.createdAt && item.createdAt.startsWith(format(new Date(), "yyyy-MM-dd"));

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs transition-all space-y-3 ${
                          item.statusPKM === "di_luar"
                            ? "border-sky-200 ring-1 ring-sky-50"
                            : item.statusPKM === "terlambat"
                            ? "border-rose-200 ring-1 ring-rose-50"
                            : "border-slate-200/70"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              item.statusPKM === "di_luar"
                                ? "bg-sky-50 text-sky-600"
                                : item.statusPKM === "terlambat"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                              {item.jenisIzin === "kesehatan_berobat" ? (
                                <Stethoscope className="w-5 h-5" />
                              ) : item.jenisIzin === "pulang_menginap" ? (
                                <Building2 className="w-5 h-5" />
                              ) : (
                                <UserCheck className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.namaSantri}</h4>
                                {isNew && (
                                  <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs animate-pulse flex items-center gap-0.5 font-mono">
                                    BARU
                                  </span>
                                )}
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                                  {item.kelas ? (item.kelas.startsWith("Kelas") ? item.kelas : `Kelas ${item.kelas}`) : "-"}
                                </span>
                                {item.statusApproval === "approved" && (
                                  <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1 uppercase tracking-wide">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    DISETUJUI
                                  </span>
                                )}
                                {getJenisIzinBadge(item.jenisIzin)}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                {item.asrama}{item.kamar ? ` · ${item.kamar.startsWith("Kamar") ? item.kamar : `Kamar ${item.kamar}`}` : ""} · Musyrif: {item.disetujuiOleh || "Ustadz Asrama"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                            {/* Tombol Kirim WA Satuan (Hanya jika Approved) */}
                            {item.statusApproval === "approved" && (
                              <button
                                type="button"
                                onClick={() => generateWhatsAppMessage(item)}
                                title="Kirim laporan santri ini langsung ke WhatsApp Satpam"
                                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim WA</span>
                              </button>
                            )}

                            {/* Tombol Kartu Digital (Hanya jika Approved) */}
                            {item.statusApproval === "approved" && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic("light");
                                  setSelectedIzin(item);
                                  setActiveTab("kartu");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Kartu Izin</span>
                              </button>
                            )}

                            {/* Delete button for authorized staff */}
                            {(isKoorMusyrif || isPamong || isMusyrif || isKoorGedung || authUser?.name === item.disetujuiOleh || authUser?.id === item.disetujuiOleh) && (
                              <button
                                type="button"
                                onClick={() => {
                                  appConfirm(`Hapus arsip perizinan ${item.namaSantri}? Data akan dihapus secara permanen.`, "Hapus Perizinan", {
                                    type: "danger",
                                    confirmText: "Ya, Hapus"
                                  }).then(ok => {
                                    if (ok && onDeleteSantriIzin) onDeleteSantriIzin(item.id);
                                  });
                                }}
                                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all active:scale-95"
                                title="Hapus Data Izin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* FOTO SANTRI IZIN (APPROVED) */}
                        {(item.photoUrl || item.fotoSantriUrl || item.lampiranUrl) && (
                          <div 
                            className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-950 group cursor-pointer"
                            onClick={() => setPhotoModalItem({ url: (item.photoUrl || item.fotoSantriUrl || item.lampiranUrl)!, title: item.namaSantri, subtitle: `${item.asrama} • Kelas ${item.kelas} • ${item.keperluan}` })}
                          >
                            <img 
                              src={item.photoUrl || item.fotoSantriUrl || item.lampiranUrl} 
                              alt={item.namaSantri} 
                              className="w-full h-36 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                              <Eye className="w-3 h-3 text-sky-400" />
                              <span>Klik untuk Perbesar Foto</span>
                            </div>
                          </div>
                        )}

                        {/* Inner shaded container matching Santri Sakit */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            <span className="text-slate-500 font-semibold">Keperluan: </span>
                            {item.keperluan}
                            {item.tujuanLokasi && <span className="text-slate-500"> (Tujuan: {item.tujuanLokasi})</span>}
                          </p>
                          {item.namaPenjemput && (
                            <p className="text-xs text-slate-600 font-medium">
                              <span className="text-slate-500 font-semibold">Penjemput: </span>
                              {item.namaPenjemput} ({item.hubunganPenjemput || "Orang Tua"})
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 mt-1 border-t border-slate-200/60 gap-1 text-xs">
                            <span className="text-[11px] font-mono text-slate-500">
                              Jadwal: <strong>{item.tglKeluarRencana} {item.jamKeluarRencana}</strong> s/d <strong>{item.tglKembaliRencana} {item.jamKembaliRencana} WIB</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              {item.statusPKM === "di_luar" ? (
                                <span className="text-sky-700 font-bold text-xs flex items-center gap-1 font-mono">
                                  🚪 Sedang di Luar
                                </span>
                              ) : item.statusPKM === "kembali" ? (
                                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 font-mono">
                                  ✅ Sudah Kembali
                                </span>
                              ) : item.statusPKM === "terlambat" ? (
                                <span className="text-rose-700 font-bold text-xs flex items-center gap-1 font-mono animate-pulse">
                                  ⚠️ Terlambat Kembali
                                </span>
                              ) : (
                                <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono shadow-2xs">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                  <span>DISETUJUI (Belum Keluar)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════ TAB 2: STEPPER WIZARD 4-STEP (Super Smooth UX) ═════════════════════ */}
      {activeTab === "ajukan" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 ring-1 ring-slate-200/70 shadow-md p-5 sm:p-7 space-y-6">
            {/* Header Wizard */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight flex items-center gap-2">
                  <span>Formulir Perizinan Santri</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                    Step {formStep} dari 4
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Madrasah Mu'allimiin Muhammadiyah Yogyakarta
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormStep(1);
                  setActiveTab("daftar");
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Tutup Formulir"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="relative flex items-center justify-between px-2 sm:px-6">
              <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-0.5 bg-slate-200 z-0">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((formStep - 1) / 3) * 100}%` }}
                />
              </div>

              {[
                { step: 1, label: "Santri" },
                { step: 2, label: "Jenis Izin" },
                { step: 3, label: "Waktu" },
                { step: 4, label: "Wali" }
              ].map(({ step, label }) => {
                const isCompleted = formStep > step;
                const isActive = formStep === step;

                return (
                  <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (step < formStep || (step === 2 && selectedSantriList.length > 0) || (step === 3 && selectedSantriList.length > 0)) {
                          setFormStep(step as any);
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCompleted
                          ? "bg-blue-600 text-white"
                          : isActive
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step}
                    </button>
                    <span className={`text-[11px] font-bold ${
                      isActive ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ═════════════════ STEP 1: SANTRI (BISA BEBERAPA NAMA) ═════════════════ */}
            {formStep === 1 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Pilih Santri yang Mengajukan Izin
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bisa memilih satu atau beberapa nama santri sekaligus (Izin Rombongan).
                    </p>
                  </div>
                  {selectedSantriList.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                      {selectedSantriList.length} Santri Terpilih
                    </span>
                  )}
                </div>

                {/* Search Input with Manual Add */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={santriQuery}
                      onChange={(e) => setSantriQuery(e.target.value)}
                      placeholder="Cari nama santri atau NISN..."
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-blue-500/70 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
                      autoFocus
                    />

                    {/* Dropdown search results */}
                    {showSantriDropdown && santriSearchResults.length > 0 && (
                      <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                        {santriSearchResults.map(s => {
                          const isSelected = selectedSantriList.some(item => (item.id && item.id === s.id) || (item.nisn && item.nisn === s.nisn) || item.nama.toLowerCase() === s.nama.toLowerCase());

                          return (
                            <div
                              key={s.id || s.nisn}
                              onClick={() => handleToggleSantri(s)}
                              className={`p-3 cursor-pointer border-b border-slate-100 text-xs flex items-center justify-between transition ${
                                isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                              }`}
                            >
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{s.nama}</p>
                                <p className="text-slate-500 text-xs">{s.kelasLengkap} · NISN: {s.nisn} · Asrama: {s.asrama || "-"}</p>
                              </div>
                              <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                isSelected 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              }`}>
                                {isSelected ? <><Check className="w-3 h-3 stroke-[3]" /> Terpilih</> : "+ Tambah"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual add button if not found */}
                  {santriQuery.trim().length >= 3 && santriSearchResults.length === 0 && (
                    <button
                      type="button"
                      onClick={handleAddManualSantri}
                      className="w-full p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-dashed border-blue-300 flex items-center justify-center gap-2 transition"
                    >
                      <span>+ Tambah Santri Manual: "<strong>{santriQuery.trim()}</strong>"</span>
                    </button>
                  )}
                </div>

                {/* Selected Santri List / Chips */}
                {selectedSantriList.length > 0 ? (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-700" />
                        Daftar Santri yang Diizinkan ({selectedSantriList.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSantriList([])}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                      >
                        Hapus Semua
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedSantriList.map((s, idx) => (
                        <div
                          key={s.id || s.nisn || idx}
                          className="bg-white border border-blue-300/80 pl-3 pr-2 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight">{s.nama}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{s.kelasLengkap} · {s.asrama}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSantri(s.id || s.nisn || s.nama)}
                            className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-400 transition"
                            title="Hapus dari daftar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-1.5 bg-slate-50/50">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 text-xs sm:text-sm">Belum ada santri yang dipilih</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Cari nama santri di atas atau klik salah satu pilihan cepat di bawah (bisa lebih dari 1 nama).
                    </p>
                  </div>
                )}

                {/* Step 1 Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("daftar")}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Batal</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedSantriList.length === 0}
                    onClick={() => {
                      triggerHaptic("light");
                      setFormStep(2);
                    }}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      selectedSantriList.length > 0
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        : "bg-blue-300 text-white cursor-not-allowed"
                    }`}
                  >
                    <span>Lanjut ke Jenis Izin ({selectedSantriList.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════ STEP 2: JENIS IZIN ═════════════════ */}
            {formStep === 2 && (
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Pilih Kategori Perizinan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih kategori yang sesuai dengan keperluan santri, lalu klik <strong>Lanjut</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "keluar_biasa",
                      title: "Keluar Hari Ini",
                      desc: "Kembali hari yang sama (Urgent / 1 Hari)",
                      icon: <Navigation className="w-5 h-5 text-white" />,
                      iconBg: "bg-blue-600",
                      activeBorder: "border-blue-600 ring-2 ring-blue-500/20"
                    },
                    {
                      id: "kesehatan_berobat",
                      title: "Ke Dokter / RS",
                      desc: "Pemeriksaan kesehatan / RS PKU",
                      icon: <Stethoscope className="w-5 h-5 text-white" />,
                      iconBg: "bg-emerald-600",
                      activeBorder: "border-emerald-600 ring-2 ring-emerald-500/20"
                    },
                    {
                      id: "pulang_menginap",
                      title: "Pulang / Menginap",
                      desc: "Bermalam di luar asrama (Pamong)",
                      icon: <Moon className="w-5 h-5 text-white" />,
                      iconBg: "bg-violet-600",
                      activeBorder: "border-violet-600 ring-2 ring-violet-500/20"
                    },
                    {
                      id: "rutin_sabtu_ahad",
                      title: "Sakit – Rawat Rumah",
                      desc: "Rekomendasi Poskestren (Pamong)",
                      icon: <Heart className="w-5 h-5 text-white" />,
                      iconBg: "bg-rose-600",
                      activeBorder: "border-rose-600 ring-2 ring-rose-500/20"
                    }
                  ].map((cat) => {
                    const isSelected = jenisIzin === cat.id;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => applySOPPreset(cat.id as JenisIzinSantri, true)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? `${cat.activeBorder} bg-white shadow-xs`
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${cat.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                            {cat.icon}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{cat.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status Alur Notice Sesuai SOP & Role */}
                {isPamongOrAdmin ? (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      <strong>Status Alur:</strong> Otomatis Disetujui Langsung (Wewenang Penuh Pamong Asrama / Pimpinan)
                    </span>
                  </div>
                ) : isMusyrif ? (
                  jenisIzin === "keluar_biasa" || jenisIzin === "kesehatan_berobat" ? (
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>Status Alur:</strong> Otomatis Disetujui Langsung (Wewenang Penuh Musyrif Kelas / Kamar)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-950 font-medium">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>Status Alur:</strong> Menunggu Persetujuan Pamong Asrama (Izin Pulang/Menginap wajib verifikasi Pamong sesuai SOP)
                      </span>
                    </div>
                  )
                ) : (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-950 font-medium">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      <strong>Status Alur:</strong> Menunggu verifikasi Musyrif Kelas atau Pamong Asrama
                    </span>
                  </div>
                )}

                {/* Step 2 Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormStep(3);
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95"
                  >
                    <span>Lanjut</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════ STEP 3: WAKTU & KEPERLUAN ═════════════════ */}
            {formStep === 3 && (
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Keperluan & Jadwal Perizinan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lengkapi detail keperluan, tujuan, dan jam keluar-kembali santri.
                  </p>
                </div>

                {/* Selected Category Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                  <Navigation className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    {jenisIzin === "keluar_biasa" && "Keluar Hari Ini"}
                    {jenisIzin === "kesehatan_berobat" && "Ke Dokter / RS"}
                    {jenisIzin === "pulang_menginap" && "Pulang / Menginap"}
                    {jenisIzin === "rutin_sabtu_ahad" && "Sakit – Rawat Rumah"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="ml-1 text-blue-600 hover:underline font-bold"
                  >
                    Ganti
                  </button>
                </div>

                {/* Detail Keperluan & Tempat Tujuan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Detail Keperluan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={keperluan}
                      onChange={(e) => setKeperluan(e.target.value)}
                      placeholder="Misal: acara keluarga, periksa dokter, urusan penting"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tempat Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tujuanLokasi}
                      onChange={(e) => setTujuanLokasi(e.target.value)}
                      placeholder="Misal: Rumah Orang Tua, RS PKU, Toko Buku..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {/* Tanggal & Durasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Keluar <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={tglKeluar}
                      onChange={(e) => {
                        setTglKeluar(e.target.value);
                        if (jenisIzin === "keluar_biasa") setTglKembali(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estimasi Durasi
                    </label>
                    <div className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-blue-200/80 rounded-xl text-xs sm:text-sm text-blue-900 font-extrabold flex items-center justify-between">
                      <span>{calculateDuration}</span>
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Jam Keluar & Jam Kembali (Dropdown Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jam Keluar <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jamKeluar}
                      onChange={(e) => setJamKeluar(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-600 outline-none"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t} WIB</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Batas Jam Kembali <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jamKembali}
                      onChange={(e) => setJamKembali(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-600 outline-none"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t} WIB</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── POSKESTREN APPROVAL & DR. KARTINI APRILIA WA CONTACT (Wajib untuk RS PKU / Faskes & Pulang) ── */}
                {isPoskestrenRequired && (
                  <div className="p-4 bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                            Verifikasi Dokter Poskestren
                          </h5>
                          <span className="text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.2 rounded-full uppercase tracking-wider font-mono shadow-2xs">
                            Wajib SOP
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Perizinan santri ke RS PKU / Faskes / Klinik atau Pulang ke Rumah <strong>wajib disetujui</strong> oleh Dokter Poskestren.
                        </p>
                      </div>
                    </div>

                    {/* Checkbox Persetujuan Dokter */}
                    <label className={`flex items-start gap-3 p-3 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                      isPoskestrenApproved 
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/20" 
                        : "border-slate-200 hover:border-emerald-300"
                    }`}>
                      <input
                        type="checkbox"
                        checked={isPoskestrenApproved}
                        onChange={(e) => {
                          setIsPoskestrenApproved(e.target.checked);
                          if (e.target.checked && !rekomendasiPoskestren) {
                            setRekomendasiPoskestren("Telah dikonfirmasi & disetujui Dokter Poskestren (dr. Kartini Aprilia)");
                          }
                          triggerHaptic("light");
                        }}
                        className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block">
                          Sudah disetujui / direkomendasikan oleh Dokter Poskestren <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Saya menyatakan bahwa perizinan medis/pulang ini telah disetujui oleh dokter Poskestren.
                        </span>
                      </div>
                    </label>

                    {/* Quick WhatsApp Consultation to dr. Kartini Aprilia */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-200/80">
                      <div className="text-[11px] text-emerald-950 font-medium">
                        Belum ada konfirmasi dokter Poskestren?
                      </div>
                      <a
                        href={`https://wa.me/6281225760883?text=${encodeURIComponent(
                          `Assalamu'alaikum dr. Kartini Aprilia, mohon konfirmasi/rekomendasi perizinan santri:\n\n` +
                          `• Nama: ${selectedSantriList.length > 0 ? selectedSantriList.map(s => s.nama).join(", ") : (santriQuery || "-")}\n` +
                          `• Asrama: ${asramaForm} (${kamarForm})\n` +
                          `• Keperluan: ${keperluan || "-"}\n` +
                          `• Tempat Tujuan: ${tujuanLokasi || "-"}\n` +
                          `• Jadwal: ${tglKeluar} (${jamKeluar}) s/d ${tglKembali} (${jamKembali})\n\n` +
                          `Apakah perizinan ini telah disetujui/direkomendasikan, Dok? Terima kasih.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Hubungi dr. Kartini Aprilia</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Step 3 Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="button"
                    disabled={!keperluan.trim() || !tujuanLokasi.trim() || (isPoskestrenRequired && !isPoskestrenApproved)}
                    onClick={() => {
                      triggerHaptic("light");
                      setFormStep(4);
                    }}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      keperluan.trim() && tujuanLokasi.trim() && (!isPoskestrenRequired || isPoskestrenApproved)
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        : "bg-blue-300 text-white cursor-not-allowed"
                    }`}
                  >
                    <span>Lanjut ke Review</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════ STEP 4: WALI & PENJEMPUT + RINGKASAN ═════════════════ */}
            {formStep === 4 && (
              <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Penjemput & Dokumen Foto Santri
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Secara default perizinan diatur keluar mandiri tanpa penjemput.
                  </p>
                </div>

                {/* Switch Toggle: Penjemput (DEFAULT: OFF / Tanpa Penjemput) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Apakah santri dijemput?</p>
                      <p className="text-[11px] text-slate-500">Aktifkan hanya jika santri dijemput oleh orang tua/pihak lain</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdaPenjemput(!adaPenjemput);
                        triggerHaptic("light");
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        adaPenjemput ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        adaPenjemput ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {!adaPenjemput ? (
                    <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <span className="text-base">🚶‍♂️</span>
                      <span>Santri berizin <strong>Mandiri / Tanpa Penjemput</strong> (tidak ada penjemput khusus).</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2.5 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Penjemput <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={namaPenjemput}
                            onChange={(e) => setNamaPenjemput(e.target.value)}
                            placeholder="Contoh: Bapak Ahmad / Ibu Siti"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                            required={adaPenjemput}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Hubungan dengan Santri
                          </label>
                          <select
                            value={hubunganPenjemput}
                            onChange={(e) => setHubunganPenjemput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none font-medium"
                          >
                            {HUBUNGAN_PENJEMPUT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Poskestren Warning / Checkbox inside Step 4 Review if required */}
                {isPoskestrenRequired && (
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-emerald-700" />
                        Status Rekomendasi Dokter Poskestren:
                      </span>
                      {isPoskestrenApproved ? (
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Terverifikasi
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                          Belum Dicentang
                        </span>
                      )}
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPoskestrenApproved}
                        onChange={(e) => setIsPoskestrenApproved(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        Saya mengonfirmasi bahwa izin RS PKU/Pulang ini telah disetujui dokter Poskestren (dr. Kartini Aprilia).
                      </span>
                    </label>
                  </div>
                )}

                {/* Foto Santri / Surat Izin (Opsional) */}
                <div className="space-y-2 p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Foto Santri / Surat Izin</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    {fotoSantriUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Foto Terlampir
                      </span>
                    )}
                  </div>

                  {fotoSantriUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 group">
                      <img 
                        src={fotoSantriUrl} 
                        alt="Foto Santri Izin" 
                        className="w-full h-44 sm:h-52 object-contain bg-slate-900 cursor-pointer" 
                        onClick={() => setPhotoModalItem({ url: fotoSantriUrl, title: selectedSantriList.map(s => s.nama).join(", ") || santriQuery || "Santri Izin", subtitle: `${asramaForm} • ${selectedSantriList.length} Santri` })} 
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoModalItem({ url: fotoSantriUrl, title: selectedSantriList.map(s => s.nama).join(", ") || santriQuery || "Santri Izin", subtitle: `${asramaForm} • ${selectedSantriList.length} Santri` })}
                          className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm transition-all"
                        >
                          Lihat Penuh
                        </button>
                        <button
                          type="button"
                          onClick={() => setFotoSantriUrl("")}
                          className="px-2.5 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm transition-all"
                        >
                          Hapus / Ganti
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 rounded-2xl cursor-pointer text-blue-800 text-xs font-bold transition-all active:scale-[0.98]">
                        <Camera className="w-4 h-4" />
                        <span>Ambil Foto Kamera Santri</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={handlePhotoSelected} 
                          disabled={isCompressingPhoto} 
                        />
                      </label>
                      <label className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl cursor-pointer text-slate-700 text-xs font-semibold transition-all active:scale-[0.98]">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Pilih dari Galeri HP</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoSelected} 
                          disabled={isCompressingPhoto} 
                        />
                      </label>
                    </div>
                  )}

                  {isCompressingPhoto && (
                    <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse pt-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengompres dan memproses foto...
                    </p>
                  )}
                </div>

                {/* Ringkasan Surat Perizinan Box */}
                <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Ringkasan Surat Perizinan
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-y-1.5 text-xs text-slate-700">
                    <span className="text-slate-400 font-medium">Santri ({selectedSantriList.length}):</span>
                    <span className="col-span-2 font-bold text-slate-900">
                      {selectedSantriList.length > 0
                        ? selectedSantriList.map(s => s.nama).join(", ")
                        : santriQuery || "-"}
                    </span>

                    <span className="text-slate-400 font-medium">Jenis Izin:</span>
                    <span className="col-span-2 font-bold text-blue-700">
                      {jenisIzin === "keluar_biasa" && "Keluar Hari Ini"}
                      {jenisIzin === "kesehatan_berobat" && "Ke Dokter / RS"}
                      {jenisIzin === "pulang_menginap" && "Pulang / Menginap"}
                      {jenisIzin === "rutin_sabtu_ahad" && "Sakit – Rawat Rumah"}
                    </span>

                    <span className="text-slate-400 font-medium">Keperluan:</span>
                    <span className="col-span-2 font-semibold text-slate-800">{keperluan}</span>

                    <span className="text-slate-400 font-medium">Tujuan:</span>
                    <span className="col-span-2 font-semibold text-slate-800">{tujuanLokasi}</span>

                    <span className="text-slate-400 font-medium">Penjemput:</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      {adaPenjemput ? `${namaPenjemput || "Penjemput"} (${hubunganPenjemput})` : "Mandiri (Tanpa Penjemput)"}
                    </span>

                    <span className="text-slate-400 font-medium">Waktu Keluar:</span>
                    <span className="col-span-2 font-mono text-slate-900 font-semibold">{tglKeluar} — {jamKeluar} WIB</span>

                    <span className="text-slate-400 font-medium">Waktu Kembali:</span>
                    <span className="col-span-2 font-mono text-rose-700 font-bold">{tglKembali} — {jamKembali} WIB ({calculateDuration})</span>
                  </div>
                </div>

                {/* Step 4 Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isPoskestrenRequired && !isPoskestrenApproved}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      !isPoskestrenRequired || isPoskestrenApproved
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
                        : "bg-blue-300 text-white cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim & Terbitkan Izin</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════ TAB 3: POS KEAMANAN (PKM) ═════════════════════ */}
      {activeTab === "pkm" && (
        <div className="space-y-3">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-700" />
                  Pos Keamanan Gerbang Asrama (PKM)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pencatatan keluar (Check-Out) dan masuk kembali (Check-In) santri secara real-time.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={pkmQuery}
                  onChange={(e) => setPkmQuery(e.target.value)}
                  placeholder="Scan / cari nama / no izin..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>

            {pkmActiveList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tidak ada santri berizin aktif yang perlu verifikasi pos saat ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pkmActiveList.map(item => {
                  const isDiLuar = item.statusPKM === "di_luar";
                  const isSelesai = item.statusPKM === "kembali_tepat_waktu" || item.statusPKM === "terlambat";

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {(item.photoUrl || item.fotoSantriUrl || item.lampiranUrl) ? (
                          <img
                            src={item.photoUrl || item.fotoSantriUrl || item.lampiranUrl}
                            alt={item.namaSantri}
                            onClick={() => setPhotoModalItem({ url: (item.photoUrl || item.fotoSantriUrl || item.lampiranUrl)!, title: item.namaSantri, subtitle: `${item.asrama} • Kelas ${item.kelas} • No: ${item.nomorSurat}` })}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-300 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{item.namaSantri}</span>
                            <span className="text-xs text-slate-500">({item.kelas} · {item.asrama})</span>
                            <span className="text-[10px] font-mono bg-white text-blue-800 px-2 py-0.5 rounded border border-slate-200 font-bold">
                              {item.nomorSurat}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            <span className="text-slate-400 font-medium">Tujuan:</span> {item.tujuanLokasi} ({item.keperluan})
                            {item.namaPenjemput && <span className="ml-1 text-slate-500">· Penjemput: {item.namaPenjemput}</span>}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Batas Kembali: <span className="text-blue-800 font-bold">{item.tglKembaliRencana} {item.jamKembaliRencana} WIB</span>
                            {item.tglKeluarAktual && ` · Keluar: ${format(new Date(item.tglKeluarAktual), "HH:mm")}`}
                            {item.tglKembaliAktual && ` · Kembali: ${format(new Date(item.tglKembaliAktual), "HH:mm")}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {item.statusPKM === "menunggu_keluar" && (
                          <button
                            type="button"
                            onClick={() => {
                              appConfirm(`Catat santri ${item.namaSantri} KELUAR gerbang?`, "Verifikasi Pos Gerbang", {
                                type: "info",
                                confirmText: "Ya, Catat Keluar"
                              }).then(ok => {
                                if (ok) onPKMTap(item.id, "keluar", authUser?.name || "Petugas PKM");
                              });
                            }}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Catat Keluar
                          </button>
                        )}

                        {isDiLuar && (
                          <button
                            type="button"
                            onClick={() => {
                              appConfirm(`Catat santri ${item.namaSantri} KEMBALI ke asrama?`, "Verifikasi Pos Gerbang", {
                                type: "success",
                                confirmText: "Ya, Catat Masuk"
                              }).then(ok => {
                                if (ok) onPKMTap(item.id, "kembali", authUser?.name || "Petugas PKM");
                              });
                            }}
                            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Catat Masuk (Kembali)
                          </button>
                        )}

                        {isSelesai && (
                          <span className="px-2.5 py-1 bg-white text-slate-500 text-xs rounded-lg border border-slate-200 font-medium">
                            Selesai ({item.statusPKM === "terlambat" ? "⚠️ Terlambat" : "✅ Tepat Waktu"})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════ TAB 4: KARTU DIGITAL RESMI ═════════════════════ */}
      {activeTab === "kartu" && selectedIzin && (
        <div className="max-w-xl mx-auto space-y-4">
          {selectedIzin.statusApproval !== "approved" ? (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-200 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <Clock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md font-bold uppercase">
                  Status: {selectedIzin.statusApproval.toUpperCase()}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 pt-1">
                  Kartu Tiket Izin Belum Diterbitkan
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Permohonan izin untuk <strong>{selectedIzin.namaSantri}</strong> ({selectedIzin.nomorSurat}) masih menunggu persetujuan (ACC) dari Pamong / Musyrif yang berwenang. Tiket resmi dan tautan pesan WhatsApp baru akan aktif setelah disetujui sepenuhnya.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("daftar")}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
                >
                  Kembali ke Daftar Perizinan
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 border-t-4 border-t-emerald-600 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-blue-800 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-800 flex items-center justify-center text-white font-black text-lg shadow-2xs">
                      M
                    </div>
                    <div>
                      <h4 className="font-black text-blue-950 text-xs sm:text-sm uppercase tracking-wide">
                        Madrasah Mu'allimiin Muhammadiyah
                      </h4>
                      <p className="text-[10px] font-bold text-blue-800">
                        SURAT PERIZINAN KELUAR / PULANG ASRAMA
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200/80 font-bold block">
                      {selectedIzin.nomorSurat}
                    </span>
                    <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-xs flex items-center gap-1 uppercase tracking-wide">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      DISETUJUI RESMI
                    </span>
                  </div>
                </div>

                {/* Identitas & Foto */}
                <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                  <div className="col-span-2 space-y-2">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Lengkap Santri</p>
                      <p className="font-extrabold text-slate-900 text-base">{selectedIzin.namaSantri}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Kelas / NISN</p>
                        <p className="font-bold text-slate-800">{selectedIzin.kelas} ({selectedIzin.nisn})</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Asrama / Kamar</p>
                        <p className="font-bold text-slate-800">{selectedIzin.asrama} ({selectedIzin.kamar})</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    {(selectedIzin.fotoSantriUrl || selectedIzin.lampiranUrl) ? (
                      <img
                        src={selectedIzin.fotoSantriUrl || selectedIzin.lampiranUrl}
                        alt={selectedIzin.namaSantri}
                        onClick={() => setPhotoModalItem({ url: (selectedIzin.fotoSantriUrl || selectedIzin.lampiranUrl)!, title: selectedIzin.namaSantri, subtitle: `${selectedIzin.asrama} • Kelas ${selectedIzin.kelas}` })}
                        className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-300 cursor-pointer hover:scale-105 transition-transform"
                      />
                    ) : (
                      <QrCode className="w-14 h-14 text-blue-900" />
                    )}
                    <span className="text-[8px] font-mono text-blue-800 font-bold mt-1">VERIFIKASI PKM</span>
                  </div>
                </div>

                {/* Rincian Izin & Penjemput */}
                <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3.5 mb-4 text-xs space-y-1 text-slate-800">
                  <p><strong className="text-blue-950 font-semibold">Keperluan:</strong> {selectedIzin.keperluan}</p>
                  <p><strong className="text-blue-950 font-semibold">Tujuan Lokasi:</strong> {selectedIzin.tujuanLokasi}</p>
                  <p><strong className="text-blue-950 font-semibold">Penjemput:</strong> {selectedIzin.namaPenjemput || selectedIzin.namaWali || "-"} ({selectedIzin.hubunganPenjemput || "Orang Tua"})</p>
                  {selectedIzin.rekomendasiPoskestren && (
                    <p><strong className="text-rose-900 font-semibold">Rekomendasi Medis:</strong> {selectedIzin.rekomendasiPoskestren}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-blue-200 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">Waktu Keluar:</span>
                      <span className="font-bold text-slate-900">{selectedIzin.tglKeluarRencana} {selectedIzin.jamKeluarRencana} WIB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Batas Kembali:</span>
                      <span className="font-bold text-rose-700">{selectedIzin.tglKembaliRencana} {selectedIzin.jamKembaliRencana} WIB</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 text-center text-xs pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Pamong / Pemberi Izin</p>
                    <div className="h-10 flex items-center justify-center">
                      <span className="font-bold text-emerald-800 border-b-2 border-emerald-600 px-1">
                        ✓ {selectedIzin.disetujuiOleh || "Disetujui Online"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Verifikasi Pos Gerbang</p>
                    <div className="h-10 flex items-center justify-center">
                      <span className="text-[11px] font-mono text-slate-500 italic">
                        {selectedIzin.tglKeluarAktual ? `Check-out: ${format(new Date(selectedIzin.tglKeluarAktual), "dd/MM HH:mm")}` : "(Stempel Pos Gerbang)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Kartu
                </button>
                <button
                  type="button"
                  onClick={() => generateWhatsAppMessage(selectedIzin)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm shadow-blue-600/20"
                >
                  <Share2 className="w-4 h-4" /> Bagikan ke WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── POST-SUBMIT SUCCESS MODAL (UX Shortcut) ── */}
      {lastSubmittedIzin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-sm ${
              lastSubmittedIzin.statusApproval === "approved" 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-amber-100 text-amber-700"
            }`}>
              {lastSubmittedIzin.statusApproval === "approved" ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                {lastSubmittedIzin.statusApproval === "approved"
                  ? "Izin Santri Berhasil Diterbitkan!"
                  : "Permohonan Izin Berhasil Diajukan!"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Nomor Surat: <strong className="text-blue-700 font-mono">{lastSubmittedIzin.nomorSurat}</strong> untuk santri <strong>{lastSubmittedIzin.namaSantri}</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-left space-y-1 font-mono">
              <p>
                Status:{" "}
                <strong className={lastSubmittedIzin.statusApproval === "approved" ? "text-emerald-700" : "text-amber-700"}>
                  {lastSubmittedIzin.statusApproval.toUpperCase()}
                </strong>
                {lastSubmittedIzin.statusApproval !== "approved" && (
                  <span className="text-[10px] text-amber-800 font-sans block mt-0.5">
                    ⏳ Menunggu persetujuan (ACC) Pamong Asrama / Koordinator
                  </span>
                )}
              </p>
              <p>Keluar: <strong>{lastSubmittedIzin.tglKeluarRencana} {lastSubmittedIzin.jamKeluarRencana} WIB</strong></p>
              <p>Kembali: <strong className="text-rose-700">{lastSubmittedIzin.tglKembaliRencana} {lastSubmittedIzin.jamKembaliRencana} WIB</strong></p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              {lastSubmittedIzin.statusApproval === "approved" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      generateWhatsAppMessage(lastSubmittedIzin);
                      setLastSubmittedIzin(null);
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Kirim WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIzin(lastSubmittedIzin);
                      setActiveTab("kartu");
                      setLastSubmittedIzin(null);
                    }}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Buka Kartu Izin</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("daftar");
                    setLastSubmittedIzin(null);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                >
                  <span>Lihat di Daftar Pengajuan</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLastSubmittedIzin(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* REJECT MODAL PROMPT */}
      {rejectDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl max-w-md w-full shadow-2xl space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Alasan Penolakan Izin
            </h4>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan atau catatan penolakan..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-rose-600"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialogId(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onApproveSantriIzin(rejectDialogId, false, rejectReason);
                  setRejectDialogId(null);
                  setRejectReason("");
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      <AnimatePresence>
        {photoModalItem && (
          <div
            className="fixed inset-0 z-[140] bg-black/95 backdrop-blur-md flex items-center justify-center"
            onClick={() => setPhotoModalItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPhotoModalItem(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-lg active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
                <img
                  src={photoModalItem.url}
                  alt={photoModalItem.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="p-4 bg-black/80 text-white text-center">
                <p className="font-bold text-sm">{photoModalItem.title}</p>
                {photoModalItem.subtitle && (
                  <p className="text-xs text-slate-300 mt-0.5">{photoModalItem.subtitle}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
