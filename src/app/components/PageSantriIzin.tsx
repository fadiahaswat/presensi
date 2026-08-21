import React, { useState, useMemo, useEffect } from "react";
import { 
  X, CheckCircle, AlertCircle, Clock, Upload, 
  FileCheck2, ShieldCheck, Check, Ban, Eye, User, Calendar, MapPin,
  ChevronLeft, Plus, Search, Filter, Share2, Printer, QrCode, Phone,
  Building2, ShieldAlert, ArrowRight, ArrowLeft, RefreshCw, Send, CheckCircle2,
  ExternalLink, FileText, AlertTriangle, UserCheck, KeyRound, Sparkles,
  Award, School, ChevronRight, HelpCircle, Download, CheckCheck,
  Stethoscope, Moon, Heart, Navigation, ToggleLeft, ToggleRight,
  Zap, CalendarDays, ThumbsUp
} from "lucide-react";
import { format, addDays, nextSaturday, nextSunday } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";
import { ALL_SANTRI_DATA, searchSantri, SantriData } from "../data/santriData";
import { appAlert, appConfirm } from "../utils/customDialog";
import { SantriIzinRecord, JenisIzinSantri, StatusApprovalSantri, StatusPKM } from "../types/izinSantri";

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
  santriIzinList: SantriIzinRecord[];
  onSaveSantriIzin: (record: Omit<SantriIzinRecord, "id" | "nomorSurat" | "createdAt" | "updatedAt">) => void;
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
  "Wali Resmi",
  "Mandiri / Tanpa Penjemput"
];

const TIME_OPTIONS: string[] = [];
for (let h = 5; h <= 22; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export const PageSantriIzin: React.FC<PageSantriIzinProps> = ({
  onBack,
  authUser,
  musyrifList,
  asramaList,
  santriIzinList,
  onSaveSantriIzin,
  onUpdateSantriIzin,
  onApproveSantriIzin,
  onPKMTap,
  onDeleteSantriIzin
}) => {
  const isPamongOrAdmin = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung" || authUser?.role === "admin";
  const isMusyrif = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";
  const isPKM = authUser?.role === "keamanan" || authUser?.role === "admin" || isPamongOrAdmin;

  const [activeTab, setActiveTab] = useState<"daftar" | "ajukan" | "pkm" | "kartu">("daftar");
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAsrama, setFilterAsrama] = useState<string>("Semua");
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"hari_ini" | "semua" | "di_luar" | "terlambat">("hari_ini");
  
  // Selected Izin for Detail / Kartu Preview
  const [selectedIzin, setSelectedIzin] = useState<SantriIzinRecord | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Post Submit Success Modal State
  const [lastSubmittedIzin, setLastSubmittedIzin] = useState<SantriIzinRecord | null>(null);

  // PKM Scan / Quick search query
  const [pkmQuery, setPkmQuery] = useState("");

  // ===================== STEPPER WIZARD STATE (1: Santri, 2: Jenis, 3: Waktu, 4: Wali) =====================
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Santri
  const [santriQuery, setSantriQuery] = useState("");
  const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
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

  // Step 4: Wali & Penjemput
  const [asramaForm, setAsramaForm] = useState<string>(authUser?.asrama || asramaList[0] || "Asrama 1");
  const [kamarForm, setKamarForm] = useState<string>(authUser?.kamar || "Kamar 1");
  const [namaWali, setNamaWali] = useState<string>("");
  const [alamatWali, setAlamatWali] = useState<string>("");
  const [noHpWali, setNoHpWali] = useState<string>("");
  const [isPenjemputBerbeda, setIsPenjemputBerbeda] = useState<boolean>(false);
  const [namaPenjemput, setNamaPenjemput] = useState<string>("");
  const [hubunganPenjemput, setHubunganPenjemput] = useState<string>("Orang Tua (Ayah/Ibu)");

  // Santri binaan cepat (Quick santri chips for logged in Musyrif)
  const myAssignedSantri = useMemo(() => {
    if (!authUser?.asrama) return ALL_SANTRI_DATA.slice(0, 6);
    const matched = ALL_SANTRI_DATA.filter(s => s.asrama === authUser.asrama || (authUser.kamar && s.kamar === authUser.kamar));
    return matched.length > 0 ? matched.slice(0, 8) : ALL_SANTRI_DATA.slice(0, 6);
  }, [authUser]);

  // Autocomplete search santri
  useEffect(() => {
    if (santriQuery.trim().length >= 2) {
      const results = searchSantri(santriQuery, 8);
      setSantriSearchResults(results);
      setShowSantriDropdown(true);
    } else {
      setSantriSearchResults([]);
      setShowSantriDropdown(false);
    }
  }, [santriQuery]);

  const handleSelectSantri = (s: SantriData, autoAdvance: boolean = false) => {
    setSelectedSantri(s);
    setSantriQuery(s.nama);
    setShowSantriDropdown(false);
    const parentName = s.namaAyah || s.namaIbu || s.namaWali || `Bapak/Ibu Wali ${s.nama.split(" ")[0]}`;
    const parentPhone = s.telpAyah || s.telpIbu || s.telpWali || "";
    const parentAddress = s.alamat || s.kabupaten || "Yogyakarta";

    setNamaWali(parentName);
    setNoHpWali(parentPhone);
    setAlamatWali(parentAddress);
    setNamaPenjemput(parentName);
    if (s.asrama) setAsramaForm(s.asrama);
    if (s.kamar) setKamarForm(s.kamar);

    triggerHaptic("light");
    if (autoAdvance) {
      setTimeout(() => setFormStep(2), 250);
    }
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
    const total = santriIzinList.length;
    const pending = santriIzinList.filter(i => String(i?.statusApproval || "").startsWith("pending")).length;
    const diLuar = santriIzinList.filter(i => String(i?.statusApproval || "") === "approved" && i?.statusPKM === "di_luar").length;
    const terlambat = santriIzinList.filter(i => i?.statusPKM === "terlambat").length;
    return { total, pending, diLuar, terlambat };
  }, [santriIzinList]);

  // ── 1. DEDICATED LIST: PENDING APPROVAL (Butuh Persetujuan Ustadz / Pamong) ──
  const pendingApprovalList = useMemo(() => {
    return santriIzinList.filter(item => {
      if (!item) return false;
      const st = String(item.statusApproval || "");
      if (!st.startsWith("pending")) return false;
      if (filterAsrama !== "Semua" && item.asrama !== filterAsrama) return false;
      if (filterJenis !== "all" && item.jenisIzin !== filterJenis) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = String(item.namaSantri || "").toLowerCase();
        const nisn = String(item.nisn || "");
        const kelas = String(item.kelas || "").toLowerCase();
        const noSurat = String(item.nomorSurat || "").toLowerCase();
        return nama.includes(q) || nisn.includes(q) || kelas.includes(q) || noSurat.includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [santriIzinList, filterAsrama, filterJenis, searchQuery]);

  // ── 2. MAIN LIST: PERIZINAN DISETUJUI (Default: Hari Ini) ──
  const mainApprovedList = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return santriIzinList.filter(item => {
      if (!item) return false;
      const stApproval = String(item.statusApproval || "");
      const stPKM = String(item.statusPKM || "");
      
      // Exclude pending items from main list since they have their own dedicated top section
      if (stApproval.startsWith("pending")) return false;

      if (filterAsrama !== "Semua" && item.asrama !== filterAsrama) return false;
      if (filterJenis !== "all" && item.jenisIzin !== filterJenis) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
      } else {
        // "semua"
        return stApproval === "approved" || stApproval === "rejected";
      }
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [santriIzinList, filterAsrama, filterJenis, searchQuery, scopeFilter]);

  // Filtered list for PKM (Active approved permissions)
  const pkmActiveList = useMemo(() => {
    return santriIzinList.filter(item => {
      if (!item) return false;
      if (String(item.statusApproval || "") !== "approved") return false;
      if (!pkmQuery.trim()) return true;
      const q = pkmQuery.toLowerCase();
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
  }, [santriIzinList, pkmQuery]);

  // Submit Handler
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri && !santriQuery.trim()) {
      appAlert("Peringatan", "Silakan pilih data santri terlebih dahulu.");
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

    const namaSantri = selectedSantri ? selectedSantri.nama : santriQuery.trim();
    const nisn = selectedSantri ? selectedSantri.nisn : "-";
    const kelas = selectedSantri ? selectedSantri.kelasLengkap : "Kelas Asrama";

    // ── Logika Status Approval Awal berdasarkan SOP & Role ──
    let initialStatusApproval: StatusApprovalSantri = "pending_musyrif";
    let disetujuiOleh: string | undefined = undefined;
    let rolePenyetuju: string | undefined = undefined;
    let waktuPenyetujuan: string | undefined = undefined;

    if (isPamongOrAdmin) {
      initialStatusApproval = "approved";
      disetujuiOleh = authUser?.name || "Pamong Asrama";
      rolePenyetuju = authUser?.role || "pamong";
      waktuPenyetujuan = new Date().toISOString();
    } else if (authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung") {
      if (jenisIzin === "keluar_biasa" || jenisIzin === "kesehatan_berobat") {
        initialStatusApproval = "approved";
        disetujuiOleh = authUser?.name || "Musyrif Kelas";
        rolePenyetuju = "musyrif";
        waktuPenyetujuan = new Date().toISOString();
      } else {
        initialStatusApproval = "pending_pamong";
      }
    }

    const newRecordData = {
      santriId: selectedSantri?.id || `santri-${Date.now()}`,
      nisn: nisn,
      nis: selectedSantri?.nis,
      namaSantri: namaSantri,
      kelas: kelas,
      asrama: asramaForm,
      kamar: kamarForm,
      namaWali: (namaWali || "Orang Tua / Wali").trim(),
      alamatWali: (alamatWali || "Yogyakarta").trim(),
      noHpWali: noHpWali.trim(),
      namaPenjemput: (isPenjemputBerbeda ? namaPenjemput : namaWali || "Orang Tua").trim(),
      hubunganPenjemput: isPenjemputBerbeda ? hubunganPenjemput : "Orang Tua (Ayah/Ibu)",
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
      statusPKM: "menunggu_keluar" as StatusPKM,
      disetujuiOleh: disetujuiOleh,
      rolePenyetuju: rolePenyetuju,
      waktuPenyetujuan: waktuPenyetujuan,
      dibuatOleh: authUser?.name || "Musyrif / Staff",
      rolePembuat: authUser?.role || "musyrif",
      userEmail: (authUser as any)?.email || ""
    };

    onSaveSantriIzin(newRecordData);
    triggerHaptic("success");

    const createdIzin: SantriIzinRecord = {
      ...newRecordData,
      id: `IZN-${Date.now().toString(36).toUpperCase()}`,
      nomorSurat: `IZN-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLastSubmittedIzin(createdIzin);
    setSelectedSantri(null);
    setSantriQuery("");
    setKeperluan("");
    setAlasanDetail("");
    setTujuanLokasi("");
    setFormStep(1);
    setActiveTab("daftar");
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = (item: SantriIzinRecord) => {
    const jenisLabel = {
      keluar_biasa: "Izin Keluar Biasa (Kembali Hari Sama)",
      rutin_sabtu_ahad: "Izin Rutin (Sabtu/Ahad)",
      kesehatan_berobat: "Izin Berobat Medis",
      pulang_menginap: "Izin Pulang / Menginap"
    }[item.jenisIzin];

    const text = 
`*SURAT PERIZINAN SANTRI - ASRAMA MU'ALLIMIIN*
MADRASAH MU'ALLIMIIN MUHAMMADIYAH YOGYAKARTA

No. Izin: *${item.nomorSurat}*
---------------------------------------
👤 *Nama Santri:* ${item.namaSantri}
📌 *Kelas / Asrama:* ${item.kelas} / ${item.asrama} (${item.kamar})
🏷️ *Jenis Izin:* ${jenisLabel}
🎯 *Keperluan:* ${item.keperluan}
📍 *Tujuan:* ${item.tujuanLokasi}
🚗 *Penjemput:* ${item.namaPenjemput || item.namaWali || "-"} (${item.hubunganPenjemput || "Orang Tua"})
${item.rekomendasiPoskestren ? `🏥 *Poskestren:* ${item.rekomendasiPoskestren}\n` : ""}
⏰ *Rencana Keluar:* ${item.tglKeluarRencana} pukul ${item.jamKeluarRencana} WIB
⏰ *Batas Kembali:* ${item.tglKembaliRencana} pukul ${item.jamKembaliRencana} WIB

✅ *Status Approval:* ${item.statusApproval.toUpperCase()} (${item.disetujuiOleh || "Pending"})
🛡️ *Status Gerbang PKM:* ${item.statusPKM.replace("_", " ").toUpperCase()}

_Pesan resmi dari Sistem Perizinan Terpadu Seluruh Asrama Mu'allimin Yogyakarta_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── TOP HEADER CARD ── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs shrink-0"
            title="Kembali ke Dasbor"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Perizinan Santri Asrama
              </h2>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full font-mono">
                SOP Terpadu
              </span>
            </div>
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
              setActiveTab("ajukan");
              setSelectedIzin(null);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Izin Baru</span>
          </button>
        </div>
      </div>

      {/* ── STATS SUMMARY CARDS (Multi-Color Variety with Quick Filter click) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div 
          onClick={() => { setScopeFilter("semua"); setActiveTab("daftar"); triggerHaptic("light"); }}
          className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer ring-1 shadow-xs flex items-center gap-3 ${
            scopeFilter === "semua" && activeTab === "daftar" ? "ring-violet-400 border-violet-200 bg-violet-50/20" : "ring-slate-200/60 border-slate-100 hover:border-slate-300"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Izin</p>
            <p className="text-sm sm:text-base font-black text-slate-800 leading-tight font-mono">{stats.total}</p>
          </div>
        </div>

        <div 
          onClick={() => { setActiveTab("daftar"); triggerHaptic("light"); }}
          className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer ring-1 shadow-xs flex items-center gap-3 ${
            stats.pending > 0 && activeTab === "daftar" ? "ring-amber-400 border-amber-200 bg-amber-50/30" : "ring-slate-200/60 border-slate-100 hover:border-slate-300"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Menunggu Approval</p>
            <p className="text-sm sm:text-base font-black text-amber-700 leading-tight font-mono">{stats.pending}</p>
          </div>
        </div>

        <div 
          onClick={() => { setScopeFilter("di_luar"); setActiveTab("daftar"); triggerHaptic("light"); }}
          className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer ring-1 shadow-xs flex items-center gap-3 ${
            scopeFilter === "di_luar" && activeTab === "daftar" ? "ring-sky-400 border-sky-200 bg-sky-50/30" : "ring-slate-200/60 border-slate-100 hover:border-slate-300"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Santri di Luar</p>
            <p className="text-sm sm:text-base font-black text-sky-800 leading-tight font-mono">{stats.diLuar}</p>
          </div>
        </div>

        <div 
          onClick={() => { setScopeFilter("terlambat"); setActiveTab("daftar"); triggerHaptic("light"); }}
          className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer ring-1 shadow-xs flex items-center gap-3 ${
            scopeFilter === "terlambat" && activeTab === "daftar" ? "ring-rose-400 border-rose-200 bg-rose-50/30" : "ring-slate-200/60 border-slate-100 hover:border-slate-300"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Terlambat Kembali</p>
            <p className="text-sm sm:text-base font-black text-rose-700 leading-tight font-mono">{stats.terlambat}</p>
          </div>
        </div>
      </div>

      {/* ── SEGMENTED NAVIGATION TABS ── */}
      <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 grid grid-cols-3 sm:grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("daftar");
            setSelectedIzin(null);
          }}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === "daftar"
              ? "bg-white text-blue-900 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Daftar Izin ({mainApprovedList.length + pendingApprovalList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("ajukan");
            setSelectedIzin(null);
          }}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === "ajukan"
              ? "bg-white text-blue-900 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Formulir Cepat</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("pkm");
            setSelectedIzin(null);
          }}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === "pkm"
              ? "bg-white text-blue-900 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pos Keamanan ({pkmActiveList.length})</span>
        </button>

        {selectedIzin ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("kartu");
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
              activeTab === "kartu"
                ? "bg-white text-blue-900 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Kartu Digital</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center justify-center py-2 px-2.5 text-[11px] text-slate-400 font-medium font-mono">
            {santriIzinList.length} Arsip
          </div>
        )}
      </div>

      {/* ═════════════════════ TAB 1: DAFTAR & RIWAYAT IZIN ═════════════════════ */}
      {activeTab === "daftar" && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-3 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  Pencarian & Filter
                </span>
              </div>
              {(searchQuery || filterAsrama !== "Semua" || filterJenis !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterAsrama("Semua");
                    setFilterJenis("all");
                    triggerHaptic("light");
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama santri, NISN, no surat..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
                  className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium"
                >
                  <option value="Semua">Semua Unit Asrama</option>
                  {asramaList.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                  className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium"
                >
                  <option value="all">Semua Kategori Izin</option>
                  <option value="keluar_biasa">Keluar Hari Ini</option>
                  <option value="rutin_sabtu_ahad">Rutin Akhir Pekan</option>
                  <option value="kesehatan_berobat">Ke Dokter / RS</option>
                  <option value="pulang_menginap">Pulang / Menginap</option>
                </select>
              </div>
            </div>
          </div>

          {/* ════════════ SECTION 1: MENUNGGU APPROVAL (DEDICATED TOP SECTION) ════════════ */}
          {pendingApprovalList.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {pendingApprovalList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-amber-200/80 p-3.5 shadow-xs flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-[10px] font-mono text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded font-bold">
                            {item.nomorSurat}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1 leading-tight">
                            {item.namaSantri}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.kelas} · {item.asrama} ({item.kamar})
                          </p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      </div>

                      <div className="bg-amber-50/60 rounded-xl p-2.5 text-xs text-slate-800 space-y-0.5 border border-amber-200/50">
                        <p><strong className="text-slate-500 font-semibold">Keperluan:</strong> {item.keperluan}</p>
                        <p><strong className="text-slate-500 font-semibold">Tujuan:</strong> {item.tujuanLokasi}</p>
                        {item.namaPenjemput && (
                          <p><strong className="text-slate-500 font-semibold">Penjemput:</strong> {item.namaPenjemput} ({item.hubunganPenjemput || "Orang Tua"})</p>
                        )}
                        <p className="text-[11px] font-mono text-slate-600 pt-1 mt-1 border-t border-amber-200/60">
                          Jadwal: <strong>{item.tglKeluarRencana} {item.jamKeluarRencana}</strong> s/d <strong>{item.tglKembaliRencana} {item.jamKembaliRencana} WIB</strong>
                        </p>
                      </div>
                    </div>

                    {/* Quick Approve / Reject Actions */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedIzin(item);
                          setActiveTab("kartu");
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            appConfirm("Konfirmasi Approval", `Setujui izin santri ${item.namaSantri}?`).then((ok) => {
                              if (ok) onApproveSantriIzin(item.id, true);
                            });
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectDialogId(item.id);
                            setRejectReason("");
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                        >
                          <Ban className="w-3.5 h-3.5" /> Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════ SECTION 2: PERIZINAN DISETUJUI (DEFAULT: HARI INI) ════════════ */}
          <div className="space-y-3">
            {/* Scope Filter Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Daftar Perizinan Santri</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {scopeFilter === "hari_ini" ? "Menampilkan santri yang berizin pada hari ini" : "Menampilkan seluruh arsip data perizinan"}
                </p>
              </div>

              {/* Scope Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "hari_ini", label: "📅 Hari Ini (Default)" },
                  { id: "semua", label: "📋 Semua Disetujui" },
                  { id: "di_luar", label: "🚶 Sedang di Luar" },
                  { id: "terlambat", label: "⚠️ Terlambat" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setScopeFilter(tab.id as any);
                      triggerHaptic("light");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      scopeFilter === tab.id
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            {mainApprovedList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 p-8 text-center space-y-2 shadow-xs">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">
                  {scopeFilter === "hari_ini" ? "Tidak Ada Santri Berizin Aktif Hari Ini" : "Tidak Ada Data Perizinan"}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {scopeFilter === "hari_ini" ? (
                    <span>
                      Santri belum memiliki jadwal izin hari ini. Klik tombol <button onClick={() => setScopeFilter("semua")} className="text-blue-600 font-bold underline">Semua Disetujui</button> untuk melihat arsip lengkap.
                    </span>
                  ) : "Silakan sesuaikan filter pencarian di atas."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mainApprovedList.map((item) => {
                  const stAppr = String(item?.statusApproval || "");
                  const isApproved = stAppr === "approved";
                  const isRejected = stAppr === "rejected";

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-100 ring-1 ring-slate-200/60 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
                    >
                      <div>
                        {/* Header Item */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 font-bold">
                              {item.nomorSurat}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 leading-tight">
                              {item.namaSantri}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {item.kelas} · {item.asrama} ({item.kamar})
                            </p>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-col items-end gap-1">
                            {isApproved && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Disetujui
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80 rounded-full flex items-center gap-1">
                                <Ban className="w-3 h-3" /> Ditolak
                              </span>
                            )}

                            {isApproved && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                                item.statusPKM === "di_luar"
                                  ? "bg-sky-100 text-sky-900 border border-sky-200"
                                  : item.statusPKM === "terlambat"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200/80 font-black"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                PKM: {item.statusPKM.replace("_", " ").toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detail Pill */}
                        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/60 text-xs space-y-1 text-slate-700">
                          <p><strong className="text-slate-500 font-semibold">Keperluan:</strong> {item.keperluan}</p>
                          <p><strong className="text-slate-500 font-semibold">Tujuan:</strong> {item.tujuanLokasi}</p>
                          {item.namaPenjemput && (
                            <p><strong className="text-slate-500 font-semibold">Penjemput:</strong> {item.namaPenjemput} ({item.hubunganPenjemput || "Orang Tua"})</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 mt-1 border-t border-slate-200/60 font-mono">
                            <div>
                              <span className="text-slate-400 block font-sans">Waktu Keluar:</span>
                              <span className="font-semibold text-slate-800">{item.tglKeluarRencana} {item.jamKeluarRencana}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans">Batas Kembali:</span>
                              <span className="font-semibold text-slate-800">{item.tglKembaliRencana} {item.jamKembaliRencana}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic("light");
                              setSelectedIzin(item);
                              setActiveTab("kartu");
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/60 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Kartu Izin
                          </button>
                          <button
                            type="button"
                            onClick={() => generateWhatsAppMessage(item)}
                            className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/60 rounded-xl text-xs transition active:scale-95"
                            title="Bagikan ke WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {onDeleteSantriIzin && isPamongOrAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              appConfirm("Hapus Perizinan", `Hapus arsip izin santri ${item.namaSantri}?`).then((ok) => {
                                if (ok) onDeleteSantriIzin(item.id);
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Hapus"
                          >
                            <X className="w-4 h-4" />
                          </button>
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
                        if (step < formStep || (step === 2 && selectedSantri) || (step === 3 && selectedSantri)) {
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

            {/* ═════════════════ STEP 1: SANTRI ═════════════════ */}
            {formStep === 1 && (
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Pilih Santri yang Mengajukan Izin
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ketik nama santri di bawah atau pilih santri dari daftar cepat.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={santriQuery}
                    onChange={(e) => setSantriQuery(e.target.value)}
                    placeholder="Ketik minimal 2 huruf nama santri atau NISN..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-blue-500/70 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
                    autoFocus
                  />

                  {/* Dropdown search results */}
                  {showSantriDropdown && santriSearchResults.length > 0 && (
                    <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                      {santriSearchResults.map(s => (
                        <div
                          key={s.id || s.nisn}
                          onClick={() => handleSelectSantri(s, true)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-xs flex items-center justify-between transition"
                        >
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{s.nama}</p>
                            <p className="text-slate-500 text-xs">{s.kelasLengkap} · NISN: {s.nisn} · Asrama: {s.asrama || "-"}</p>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                            Pilih & Lanjut
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Santri Chips (Santri Binaan Cepat) */}
                {!selectedSantri && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Pilihan Cepat Santri:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {myAssignedSantri.map(s => (
                        <button
                          key={s.id || s.nisn}
                          type="button"
                          onClick={() => handleSelectSantri(s, true)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200/80 rounded-xl text-xs font-semibold transition active:scale-95"
                        >
                          {s.nama} ({s.kelasLengkap})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Santri Card or Placeholder */}
                {selectedSantri ? (
                  <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => setSelectedSantri(null)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        {selectedSantri.nisn}
                      </span>
                      <span className="text-xs font-bold text-blue-900">{selectedSantri.kelasLengkap}</span>
                      <span className="text-xs text-slate-500 font-medium">· {selectedSantri.asrama} ({selectedSantri.kamar})</span>
                    </div>
                    <p className="font-extrabold text-slate-900 text-base">{selectedSantri.nama}</p>
                    <p className="text-xs text-slate-600">
                      Wali: <strong className="text-slate-800">{namaWali}</strong> · Alamat: {alamatWali}
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2 bg-slate-50/50">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <User className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 text-xs sm:text-sm">Belum ada santri yang dipilih</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Ketik nama santri atau klik salah satu pilihan cepat di atas
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
                    disabled={!selectedSantri}
                    onClick={() => {
                      triggerHaptic("light");
                      setFormStep(2);
                    }}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      selectedSantri
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        : "bg-blue-300 text-white cursor-not-allowed"
                    }`}
                  >
                    <span>Lanjut</span>
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

                {/* Pilihan Keperluan Cepat (Quick Chips) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilihan Keperluan Cepat:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Acara Keluarga", dest: "Rumah Orang Tua / Keluarga" },
                      { label: "Keluarga Sakit", dest: "RS / Kediaman Keluarga" },
                      { label: "Keperluan Madrasah", dest: "Lokasi Kegiatan Madrasah" },
                      { label: "Keperluan Mendesak", dest: "Lokasi Kebutuhan Santri" },
                      { label: "Periksa Medis / Gigi", dest: "RS PKU Muhammadiyah / Klinik" },
                      { label: "Beli Perlengkapan Asrama", dest: "Toko / Swalayan Terdekat" }
                    ].map(chip => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setKeperluan(chip.label);
                          setTujuanLokasi(chip.dest);
                          triggerHaptic("light");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          keperluan === chip.label
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
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
                      placeholder="Misal: acara keluarga, keperluan penting"
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
                      placeholder="Misal: Rumah Orang Tua, Toko Buku..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {/* Quick Date Selection Chips */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilihan Tanggal Cepat:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyDatePreset("today")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-medium border border-slate-200 transition"
                    >
                      📅 Hari Ini ({format(new Date(), "dd MMM")})
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("tomorrow")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-medium border border-slate-200 transition"
                    >
                      🌅 Besok ({format(addDays(new Date(), 1), "dd MMM")})
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("saturday")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-medium border border-slate-200 transition"
                    >
                      ✨ Sabtu Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("sunday")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-medium border border-slate-200 transition"
                    >
                      🌿 Ahad Ini
                    </button>
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
                    disabled={!keperluan.trim() || !tujuanLokasi.trim()}
                    onClick={() => {
                      triggerHaptic("light");
                      setFormStep(4);
                    }}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      keperluan.trim() && tujuanLokasi.trim()
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
                    Data Wali & Penjemput Santri
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Identitas penanggung jawab santri telah terisi otomatis dari master data.
                  </p>
                </div>

                {/* Nama Wali & Kota Asal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Wali Santri <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaWali}
                      onChange={(e) => setNamaWali(e.target.value)}
                      placeholder="Nama Orang Tua / Wali"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kota Asal / Alamat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={alamatWali}
                      onChange={(e) => setAlamatWali(e.target.value)}
                      placeholder="Yogyakarta"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Switch Toggle: Penjemput berbeda dengan Wali */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Penjemput berbeda dengan Wali?</p>
                    <p className="text-[11px] text-slate-500">Aktifkan jika santri dijemput oleh pihak lain / keluarga selain wali</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPenjemputBerbeda(!isPenjemputBerbeda);
                      triggerHaptic("light");
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      isPenjemputBerbeda ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isPenjemputBerbeda ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Penjemput Input fields if toggled ON */}
                {isPenjemputBerbeda && (
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Penjemput
                      </label>
                      <input
                        type="text"
                        value={namaPenjemput}
                        onChange={(e) => setNamaPenjemput(e.target.value)}
                        placeholder="Nama pihak yang menjemput..."
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hubungan dengan Santri
                      </label>
                      <select
                        value={hubunganPenjemput}
                        onChange={(e) => setHubunganPenjemput(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-blue-600 outline-none font-medium"
                      >
                        {HUBUNGAN_PENJEMPUT_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Ringkasan Surat Perizinan Box */}
                <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Ringkasan Surat Perizinan
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-y-1.5 text-xs text-slate-700">
                    <span className="text-slate-400 font-medium">Santri:</span>
                    <span className="col-span-2 font-bold text-slate-900">{selectedSantri?.nama} ({selectedSantri?.kelasLengkap})</span>

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
                    className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition active:scale-95"
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {item.statusPKM === "menunggu_keluar" && (
                          <button
                            type="button"
                            onClick={() => {
                              appConfirm("Verifikasi Pos", `Catat santri ${item.namaSantri} KELUAR gerbang?`).then(ok => {
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
                              appConfirm("Verifikasi Pos", `Catat santri ${item.namaSantri} KEMBALI ke asrama?`).then(ok => {
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
          <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 border-t-4 border-t-blue-700 relative overflow-hidden">
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
              <div className="text-right">
                <span className="text-[10px] font-mono bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200/80 font-bold block">
                  {selectedIzin.nomorSurat}
                </span>
              </div>
            </div>

            {/* Identitas */}
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
                <QrCode className="w-14 h-14 text-blue-900" />
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
                  <span className="font-bold text-blue-900 border-b border-blue-800">
                    {selectedIzin.disetujuiOleh || "Disetujui Online"}
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
        </div>
      )}

      {/* ── POST-SUBMIT SUCCESS MODAL (UX Shortcut) ── */}
      {lastSubmittedIzin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                Izin Santri Berhasil Diterbitkan!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Nomor Surat: <strong className="text-blue-700 font-mono">{lastSubmittedIzin.nomorSurat}</strong> untuk santri <strong>{lastSubmittedIzin.namaSantri}</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-left space-y-1 font-mono">
              <p>Status: <strong className="text-emerald-700">{lastSubmittedIzin.statusApproval.toUpperCase()}</strong></p>
              <p>Keluar: <strong>{lastSubmittedIzin.tglKeluarRencana} {lastSubmittedIzin.jamKeluarRencana} WIB</strong></p>
              <p>Kembali: <strong className="text-rose-700">{lastSubmittedIzin.tglKembaliRencana} {lastSubmittedIzin.jamKembaliRencana} WIB</strong></p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  generateWhatsAppMessage(lastSubmittedIzin);
                  setLastSubmittedIzin(null);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Kirim WhatsApp ke Wali</span>
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
    </div>
  );
};
