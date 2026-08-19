import React, { useState, useMemo, useEffect } from "react";
import {
  X, Search, Filter, GraduationCap, Users, Phone, Mail, MapPin, 
  Download, Eye, CheckCircle2, ChevronRight, ChevronLeft, Building2,
  Calendar, BookOpen, ShieldCheck, UserCheck, MessageCircle, ExternalLink,
  Layers, Copy, ArrowUpDown, Lock, Unlock, Sparkles, Check, Plus, Edit3,
  Trash2, AlertTriangle, RotateCcw, ArrowRightLeft, UserX, UserPlus, Save
} from "lucide-react";
import { 
  ALL_SANTRI_DATA, SantriData, getSantriStats, normalizeClassName, 
  LIST_ALL_KELAS_GROUPED, LIST_ALL_KELAS_FLAT, getClassMetadata 
} from "../data/santriData";
import { motion, AnimatePresence } from "motion/react";
import { modalContentVariants, triggerHaptic } from "../utils/animations";

interface DataSantriModalProps {
  onClose: () => void;
  authUser?: any;
  musyrifList?: any[];
  santriList?: SantriData[];
  onSaveSantri?: (santri: SantriData) => void;
  onDeleteSantri?: (id: string) => void;
  onResetSantri?: () => void;
  onSelectSantriForIzin?: (santri: SantriData) => void;
  onSelectSantriForSakit?: (santri: SantriData) => void;
  isPage?: boolean;
}

export function DataSantriModal({
  onClose,
  authUser,
  musyrifList = [],
  santriList = ALL_SANTRI_DATA,
  onSaveSantri,
  onDeleteSantri,
  onResetSantri,
  onSelectSantriForIzin,
  onSelectSantriForSakit,
  isPage = false
}: DataSantriModalProps) {
  const isKoorMusyrif = authUser?.role === "koordinator_musyrif";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "non_aktif">("aktif");

  // Selected student for detail popup
  const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<SantriData | null>(null);

  // Form input fields
  const [formNama, setFormNama] = useState("");
  const [formKelas, setFormKelas] = useState("1 A");
  const [formNis, setFormNis] = useState("");
  const [formNisn, setFormNisn] = useState("");
  const [formNik, setFormNik] = useState("");
  const [formJk, setFormJk] = useState("Laki-laki");
  const [formAgama, setFormAgama] = useState("Islam");
  const [formTempatLahir, setFormTempatLahir] = useState("");
  const [formTanggalLahir, setFormTanggalLahir] = useState("");
  const [formAlamat, setFormAlamat] = useState("");
  const [formDesa, setFormDesa] = useState("");
  const [formKecamatan, setFormKecamatan] = useState("");
  const [formKabupaten, setFormKabupaten] = useState("");
  const [formProvinsi, setFormProvinsi] = useState("");
  const [formKodepos, setFormKodepos] = useState("");
  const [formAsalSekolah, setFormAsalSekolah] = useState("");
  const [formNamaAyah, setFormNamaAyah] = useState("");
  const [formPekerjaanAyah, setFormPekerjaanAyah] = useState("");
  const [formTelpAyah, setFormTelpAyah] = useState("");
  const [formNamaIbu, setFormNamaIbu] = useState("");
  const [formPekerjaanIbu, setFormPekerjaanIbu] = useState("");
  const [formTelpIbu, setFormTelpIbu] = useState("");
  const [formNamaWali, setFormNamaWali] = useState("");
  const [formTelpWali, setFormTelpWali] = useState("");
  const [formWaliKelas, setFormWaliKelas] = useState("");
  const [formStatusSantri, setFormStatusSantri] = useState<"aktif" | "keluar" | "pindah" | "lulus">("aktif");
  const [formCatatanStatus, setFormCatatanStatus] = useState("");

  // Delete Confirmation State
  const [deletingSantri, setDeletingSantri] = useState<SantriData | null>(null);

  // Quick Class Transfer Modal
  const [transferSantri, setTransferSantri] = useState<SantriData | null>(null);
  const [transferNewClass, setTransferNewClass] = useState("1 A");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Stats calculation
  const stats = useMemo(() => {
    const byJenjang = { MTs: 0, MA: 0 };
    const byTingkat: Record<string, number> = {};
    const byKelas: Record<string, number> = {};
    let activeCount = 0;
    let inactiveCount = 0;

    santriList.forEach(s => {
      const isAktif = !s.statusSantri || s.statusSantri === "aktif";
      if (isAktif) activeCount++;
      else inactiveCount++;

      if (s.jenjang === "MTs") byJenjang.MTs++;
      else byJenjang.MA++;

      byTingkat[s.tingkat] = (byTingkat[s.tingkat] || 0) + 1;
      byKelas[s.kelasLengkap] = (byKelas[s.kelasLengkap] || 0) + 1;
    });

    return {
      total: santriList.length,
      activeCount,
      inactiveCount,
      byJenjang,
      byTingkat,
      byKelas
    };
  }, [santriList]);

  // Filtered dataset
  const filteredSantri = useMemo(() => {
    let result = santriList;

    // Filter Status
    if (filterStatus === "aktif") {
      result = result.filter(s => !s.statusSantri || s.statusSantri === "aktif");
    } else if (filterStatus === "non_aktif") {
      result = result.filter(s => s.statusSantri && s.statusSantri !== "aktif");
    }

    // Filter Class / Tingkat
    if (selectedClass !== "all") {
      result = result.filter(s => s.kelasLengkap === selectedClass || s.kelasLengkap.toLowerCase() === selectedClass.toLowerCase());
    } else if (selectedTingkat !== "all") {
      result = result.filter(s => s.tingkat === selectedTingkat);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.nama.toLowerCase().includes(q) ||
        s.nis.includes(q) ||
        s.nisn.includes(q) ||
        s.kelasLengkap.toLowerCase().includes(q) ||
        s.kabupaten.toLowerCase().includes(q) ||
        s.asalSekolah.toLowerCase().includes(q) ||
        s.namaAyah.toLowerCase().includes(q) ||
        s.namaIbu.toLowerCase().includes(q) ||
        s.alamat.toLowerCase().includes(q) ||
        (s.catatanStatus && s.catatanStatus.toLowerCase().includes(q))
      );
    }

    return result;
  }, [santriList, filterStatus, selectedClass, selectedTingkat, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, selectedClass, selectedTingkat]);

  const totalPages = Math.ceil(filteredSantri.length / itemsPerPage) || 1;
  const paginatedSantri = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSantri.slice(start, start + itemsPerPage);
  }, [filteredSantri, currentPage]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerHaptic();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddForm = () => {
    setEditingSantri(null);
    setFormNama("");
    setFormKelas("1 A");
    setFormNis("");
    setFormNisn("");
    setFormNik("");
    setFormJk("Laki-laki");
    setFormAgama("Islam");
    setFormTempatLahir("");
    setFormTanggalLahir("");
    setFormAlamat("");
    setFormDesa("");
    setFormKecamatan("");
    setFormKabupaten("Yogyakarta");
    setFormProvinsi("D.I. Yogyakarta");
    setFormKodepos("");
    setFormAsalSekolah("");
    setFormNamaAyah("");
    setFormPekerjaanAyah("");
    setFormTelpAyah("");
    setFormNamaIbu("");
    setFormPekerjaanIbu("");
    setFormTelpIbu("");
    setFormNamaWali("");
    setFormTelpWali("");
    setFormWaliKelas("");
    setFormStatusSantri("aktif");
    setFormCatatanStatus("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (santri: SantriData) => {
    setEditingSantri(santri);
    setFormNama(santri.nama);
    setFormKelas(santri.kelasLengkap);
    setFormNis(santri.nis);
    setFormNisn(santri.nisn);
    setFormNik(santri.nik);
    setFormJk(santri.jk || "Laki-laki");
    setFormAgama(santri.agama || "Islam");
    setFormTempatLahir(santri.tempatLahir);
    setFormTanggalLahir(santri.tanggalLahir);
    setFormAlamat(santri.alamat);
    setFormDesa(santri.desa);
    setFormKecamatan(santri.kecamatan);
    setFormKabupaten(santri.kabupaten);
    setFormProvinsi(santri.provinsi);
    setFormKodepos(santri.kodepos);
    setFormAsalSekolah(santri.asalSekolah);
    setFormNamaAyah(santri.namaAyah);
    setFormPekerjaanAyah(santri.pekerjaanAyah);
    setFormTelpAyah(santri.telpAyah);
    setFormNamaIbu(santri.namaIbu);
    setFormPekerjaanIbu(santri.pekerjaanIbu);
    setFormTelpIbu(santri.telpIbu);
    setFormNamaWali(santri.namaWali);
    setFormTelpWali(santri.telpWali);
    setFormWaliKelas(santri.waliKelas);
    setFormStatusSantri(santri.statusSantri || "aktif");
    setFormCatatanStatus(santri.catatanStatus || "");
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert("Nama santri wajib diisi.");
      return;
    }

    const meta = getClassMetadata(formKelas);

    const recordToSave: SantriData = {
      id: editingSantri ? editingSantri.id : `santri-${Date.now()}`,
      no: editingSantri ? editingSantri.no : santriList.length + 1,
      tingkat: meta.tingkat,
      tingkatRomawi: meta.tingkatRomawi,
      jenjang: meta.jenjang,
      paralel: meta.paralel,
      kelasLengkap: formKelas,
      asalMts: editingSantri?.asalMts || "",
      nis: formNis.trim(),
      nisn: formNisn.trim(),
      nama: formNama.trim(),
      jk: formJk,
      tempatLahir: formTempatLahir.trim(),
      tanggalLahir: formTanggalLahir.trim(),
      nik: formNik.trim(),
      agama: formAgama,
      alamat: formAlamat.trim(),
      kodepos: formKodepos.trim(),
      desa: formDesa.trim(),
      kecamatan: formKecamatan.trim(),
      kabupaten: formKabupaten.trim(),
      provinsi: formProvinsi.trim(),
      asalSekolah: formAsalSekolah.trim(),
      prestasi: editingSantri?.prestasi || "",
      namaAyah: formNamaAyah.trim(),
      agamaAyah: editingSantri?.agamaAyah || "Islam",
      pendidikanAyah: editingSantri?.pendidikanAyah || "",
      pekerjaanAyah: formPekerjaanAyah.trim(),
      penghasilanAyah: editingSantri?.penghasilanAyah || "",
      telpAyah: formTelpAyah.trim(),
      emailAyah: editingSantri?.emailAyah || "",
      namaIbu: formNamaIbu.trim(),
      agamaIbu: editingSantri?.agamaIbu || "Islam",
      pendidikanIbu: editingSantri?.pendidikanIbu || "",
      pekerjaanIbu: formPekerjaanIbu.trim(),
      penghasilanIbu: editingSantri?.penghasilanIbu || "",
      telpIbu: formTelpIbu.trim(),
      emailIbu: editingSantri?.emailIbu || "",
      namaWali: formNamaWali.trim(),
      pekerjaanWali: editingSantri?.pekerjaanWali || "",
      telpWali: formTelpWali.trim(),
      waliKelas: formWaliKelas.trim(),
      nbmWaliKelas: editingSantri?.nbmWaliKelas || "",
      statusSantri: formStatusSantri,
      catatanStatus: formCatatanStatus.trim()
    };

    if (onSaveSantri) {
      onSaveSantri(recordToSave);
    }
    triggerHaptic();
    setIsFormOpen(false);
    setEditingSantri(null);
    if (selectedSantri && selectedSantri.id === recordToSave.id) {
      setSelectedSantri(recordToSave);
    }
  };

  const handleExecuteClassTransfer = () => {
    if (!transferSantri) return;
    const meta = getClassMetadata(transferNewClass);
    const updated: SantriData = {
      ...transferSantri,
      tingkat: meta.tingkat,
      tingkatRomawi: meta.tingkatRomawi,
      jenjang: meta.jenjang,
      paralel: meta.paralel,
      kelasLengkap: transferNewClass
    };
    if (onSaveSantri) {
      onSaveSantri(updated);
    }
    triggerHaptic();
    setTransferSantri(null);
    if (selectedSantri && selectedSantri.id === updated.id) {
      setSelectedSantri(updated);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingSantri) return;
    if (onDeleteSantri) {
      onDeleteSantri(deletingSantri.id);
    }
    triggerHaptic();
    setDeletingSantri(null);
    if (selectedSantri && selectedSantri.id === deletingSantri.id) {
      setSelectedSantri(null);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "No", "Status", "Tingkat", "Jenjang", "Kelas", "NIS", "NISN", "Nama Santri", "JK", 
      "Tempat Lahir", "Tgl Lahir", "Alamat", "Kabupaten", "Provinsi", "Asal Sekolah",
      "Nama Ayah", "Pekerjaan Ayah", "Telp Ayah", "Nama Ibu", "Telp Ibu", "Wali Kelas", "Catatan Status"
    ];
    
    const rows = filteredSantri.map((s, idx) => [
      idx + 1,
      `"${s.statusSantri || 'aktif'}"`,
      `"${s.tingkat}"`,
      `"${s.jenjang}"`,
      `"${s.kelasLengkap}"`,
      `"${s.nis}"`,
      `"${s.nisn}"`,
      `"${s.nama.replace(/"/g, '""')}"`,
      `"${s.jk}"`,
      `"${s.tempatLahir}"`,
      `"${s.tanggalLahir}"`,
      `"${s.alamat.replace(/"/g, '""')}"`,
      `"${s.kabupaten}"`,
      `"${s.provinsi}"`,
      `"${s.asalSekolah.replace(/"/g, '""')}"`,
      `"${s.namaAyah.replace(/"/g, '""')}"`,
      `"${s.pekerjaanAyah}"`,
      `"${s.telpAyah}"`,
      `"${s.namaIbu.replace(/"/g, '""')}"`,
      `"${s.telpIbu}"`,
      `"${s.waliKelas}"`,
      `"${(s.catatanStatus || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DATA_SANTRI_${selectedClass !== "all" ? selectedClass.replace(/\s+/g, "_") : "MUALLIMIIN"}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openWhatsApp = (phone: string, studentName: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(`Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari Ananda ${studentName} (Madrasah Mu'allimiin Muhammadiyah Yogyakarta).`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const containerContent = (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 ${isPage ? "p-3 sm:p-6" : ""}`}>
      {/* Header Modal */}
      {!isPage && (
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-800 text-white rounded-t-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-600 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Database Santri Mu'allimiin</h2>
              <p className="text-xs text-emerald-200">
                {selectedClass !== "all" 
                  ? `Kelas ${selectedClass} • ${filteredSantri.length} Santri` 
                  : "Manajemen & SCRUD Database Santri • Koordinator Musyrif"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Page Title (if full page mode) */}
      {isPage && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Database Induk Santri</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Akses Koordinator
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencarian, SCRUD data (pindah kelas, ganti nomor, mutasi keluar/masuk), dan rekap kontak 1.499 santri
              </p>
            </div>
          </div>

          {/* Action Buttons for Koordinator */}
          <div className="flex items-center gap-2 flex-wrap">
            {isKoorMusyrif && (
              <button
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Santri Baru</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV ({filteredSantri.length})</span>
            </button>

            {isKoorMusyrif && onResetSantri && (
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin me-reset seluruh perubahan data santri kembali ke data awal master Excel?")) {
                    onResetSantri();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-slate-500 hover:text-rose-600 text-xs font-medium rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                title="Reset Database ke Master Excel"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Excel</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 px-4 pt-1 pb-2 sm:px-0">
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Santri Aktif</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.activeCount.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tingkat MTs (1-3)</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.byJenjang.MTs.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tingkat MA (4-6)</p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{stats.byJenjang.MA.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Hasil Tampilan</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{filteredSantri.length.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-0 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama, NIS, NISN, Kelas, Kota/Kabupaten, Asal Sekolah, Ortu..."
              className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Exact Class Dropdown Selector */}
          <div className="w-full md:w-64 shrink-0">
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
              }}
              className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-500/50 dark:border-emerald-600 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-xs"
            >
              <option value="all">-- Semua 54 Kelas --</option>
              {LIST_ALL_KELAS_GROUPED.map((grp) => (
                <optgroup key={grp.tingkat} label={grp.label}>
                  {grp.kelas.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter: Status Tabs & Quick Grade Filter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus("aktif")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterStatus === "aktif"
                  ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Santri Aktif ({stats.activeCount})
            </button>
            <button
              onClick={() => setFilterStatus("non_aktif")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterStatus === "non_aktif"
                  ? "bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Pindah / Keluar ({stats.inactiveCount})
            </button>
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterStatus === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Semua ({stats.total})
            </button>
          </div>

          {/* Quick Filter Tingkat Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => { setSelectedClass("all"); setSelectedTingkat("all"); }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                selectedClass === "all" && selectedTingkat === "all"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Semua Tingkat
            </button>
            {[
              { val: "Kelas 1", label: "Kls 1" },
              { val: "Kelas 2", label: "Kls 2" },
              { val: "Kelas 3", label: "Kls 3" },
              { val: "Kelas 4", label: "Kls 4" },
              { val: "Kelas 5", label: "Kls 5" },
              { val: "Kelas 6", label: "Kls 6" },
            ].map(t => (
              <button
                key={t.val}
                onClick={() => {
                  setSelectedTingkat(selectedTingkat === t.val ? "all" : t.val);
                  setSelectedClass("all");
                }}
                className={`px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedTingkat === t.val && selectedClass === "all"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List / Table */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-0 pb-4">
        {paginatedSantri.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada santri yang sesuai</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter status.</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedClass("all"); setSelectedTingkat("all"); setFilterStatus("all"); }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100"
            >
              Tampilkan Semua Santri
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 text-center w-12">No</th>
                    <th className="py-3 px-3 sm:px-4">Nama Santri</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Kelas</th>
                    <th className="py-3 px-3 sm:px-4 text-center">NIS / NISN</th>
                    <th className="py-3 px-3 sm:px-4">Asal Daerah</th>
                    <th className="py-3 px-3 sm:px-4">Kontak Ortu</th>
                    <th className="py-3 px-3 sm:px-4 text-center w-28">Aksi SCRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {paginatedSantri.map((s, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isInactive = s.statusSantri && s.statusSantri !== "aktif";
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSantri(s)}
                        className={`hover:bg-emerald-50/50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors ${
                          isInactive ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 sm:px-4 text-center text-slate-400 font-medium">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{s.nama}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-normal bg-slate-100 dark:bg-slate-700 text-slate-500">
                              {s.jk === "Laki-laki" ? "L" : "P"}
                            </span>
                            {s.statusSantri === "keluar" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Keluar
                              </span>
                            )}
                            {s.statusSantri === "pindah" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Pindah
                              </span>
                            )}
                            {s.statusSantri === "lulus" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                Lulus
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isKoorMusyrif) {
                                setTransferSantri(s);
                                setTransferNewClass(s.kelasLengkap);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 transition-colors"
                            title={isKoorMusyrif ? "Klik untuk Pindah Kelas Cepat" : undefined}
                          >
                            <span>{s.kelasLengkap}</span>
                            {isKoorMusyrif && <ArrowRightLeft className="w-2.5 h-2.5 opacity-60" />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center text-xs font-mono text-slate-600 dark:text-slate-300">
                          <div>{s.nis || "-"}</div>
                          <div className="text-[10px] text-slate-400">{s.nisn || ""}</div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600 dark:text-slate-300 text-xs">
                          <div>{s.kabupaten || s.provinsi || "-"}</div>
                          {s.desa && <div className="text-[10px] text-slate-400">{s.desa}</div>}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-xs" onClick={(e) => e.stopPropagation()}>
                          {s.telpAyah || s.telpIbu || s.telpWali ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openWhatsApp(s.telpAyah || s.telpIbu || s.telpWali, s.nama)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-[11px] font-medium transition-colors"
                                title="Chat WhatsApp Ortu"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>{s.namaAyah ? s.namaAyah.split(" ")[0] : (s.namaIbu ? s.namaIbu.split(" ")[0] : "Ortu")}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedSantri(s)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isKoorMusyrif && (
                              <>
                                <button
                                  onClick={() => handleOpenEditForm(s)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                                  title="Edit Data Santri"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setDeletingSantri(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                                  title="Hapus / Status Keluar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{paginatedSantri.length}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredSantri.length}</span> santri (Halaman {currentPage} dari {totalPages})
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL SANTRI POPUP MODAL */}
      <AnimatePresence>
        {selectedSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-linear-to-r from-emerald-800 to-teal-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg">
                    {selectedSantri.nama.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold leading-tight">{selectedSantri.nama}</h3>
                    <p className="text-xs text-emerald-200">
                      Kelas {selectedSantri.kelasLengkap} ({selectedSantri.tingkatRomawi}) • NIS: {selectedSantri.nis || "-"} • NISN: {selectedSantri.nisn || "-"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSantri(null)}
                  className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
                {/* Status Notice if Non-Aktif */}
                {selectedSantri.statusSantri && selectedSantri.statusSantri !== "aktif" && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
                    <p className="font-bold text-xs uppercase tracking-wider">Status: Santri {selectedSantri.statusSantri}</p>
                    {selectedSantri.catatanStatus && (
                      <p className="text-xs mt-0.5">{selectedSantri.catatanStatus}</p>
                    )}
                  </div>
                )}

                {/* Bagian Identitas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-2.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Identitas Pribadi</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <div>
                      <p className="text-[11px] text-slate-400">Tempat, Tanggal Lahir</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {selectedSantri.tempatLahir ? `${selectedSantri.tempatLahir}, ${selectedSantri.tanggalLahir}` : selectedSantri.tanggalLahir || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">NIK Santri</p>
                      <p className="font-mono text-slate-800 dark:text-slate-100">{selectedSantri.nik || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Jenis Kelamin / Agama</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedSantri.jk} / {selectedSantri.agama}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Asal Sekolah</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedSantri.asalSekolah || "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] text-slate-400">Alamat Tempat Tinggal</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {selectedSantri.alamat || "-"} {selectedSantri.desa ? `, Desa ${selectedSantri.desa}` : ""} {selectedSantri.kecamatan ? `, Kec. ${selectedSantri.kecamatan}` : ""} {selectedSantri.kabupaten ? `, ${selectedSantri.kabupaten}` : ""} {selectedSantri.provinsi ? `, ${selectedSantri.provinsi}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bagian Akademik & Kelas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Data Akademik & Kelas</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <div>
                      <p className="text-[11px] text-slate-400">Jenjang</p>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{selectedSantri.jenjang}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Tingkat / Kelas</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{selectedSantri.tingkat} ({selectedSantri.tingkatRomawi})</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Kelas Lengkap</p>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{selectedSantri.kelasLengkap}</p>
                    </div>
                    {selectedSantri.waliKelas && (
                      <div className="sm:col-span-3">
                        <p className="text-[11px] text-slate-400">Wali Kelas</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedSantri.waliKelas} {selectedSantri.nbmWaliKelas ? `(NBM: ${selectedSantri.nbmWaliKelas})` : ""}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bagian Orang Tua / Wali */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Data Orang Tua & Wali</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Ayah */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Ayah</p>
                      <div>
                        <p className="text-[11px] text-slate-400">Nama</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedSantri.namaAyah || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Pekerjaan</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedSantri.pekerjaanAyah || "-"}</p>
                      </div>
                      {selectedSantri.telpAyah && (
                        <div>
                          <p className="text-[11px] text-slate-400">Kontak Telepon / WA</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs">{selectedSantri.telpAyah}</span>
                            <button
                              onClick={() => openWhatsApp(selectedSantri.telpAyah, selectedSantri.nama)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1"
                            >
                              <MessageCircle className="w-2.5 h-2.5" /> WA
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ibu */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Ibu</p>
                      <div>
                        <p className="text-[11px] text-slate-400">Nama</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedSantri.namaIbu || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Pekerjaan</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedSantri.pekerjaanIbu || "-"}</p>
                      </div>
                      {selectedSantri.telpIbu && (
                        <div>
                          <p className="text-[11px] text-slate-400">Kontak Telepon / WA</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs">{selectedSantri.telpIbu}</span>
                            <button
                              onClick={() => openWhatsApp(selectedSantri.telpIbu, selectedSantri.nama)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1"
                            >
                              <MessageCircle className="w-2.5 h-2.5" /> WA
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Quick Actions */}
              <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(
                      `Data Santri Mu'allimiin:\nNama: ${selectedSantri.nama}\nKelas: ${selectedSantri.kelasLengkap}\nNIS: ${selectedSantri.nis}\nNISN: ${selectedSantri.nisn}\nAlamat: ${selectedSantri.alamat}, ${selectedSantri.kabupaten}\nOrtu: ${selectedSantri.namaAyah || selectedSantri.namaIbu} (${selectedSantri.telpAyah || selectedSantri.telpIbu || "-"})`,
                      selectedSantri.id
                    )}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === selectedSantri.id ? "Tersalin!" : "Salin Biodata"}</span>
                  </button>

                  {isKoorMusyrif && (
                    <>
                      <button
                        onClick={() => {
                          const s = selectedSantri;
                          setSelectedSantri(null);
                          handleOpenEditForm(s);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Data</span>
                      </button>

                      <button
                        onClick={() => {
                          setTransferSantri(selectedSantri);
                          setTransferNewClass(selectedSantri.kelasLengkap);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Pindah Kelas</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSantri(null)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL FORM TAMBAH / EDIT SANTRI (SCRUD) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white dark:bg-slate-800 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
            >
              {/* Form Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-emerald-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-600 flex items-center justify-center">
                    {editingSantri ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold leading-tight">
                      {editingSantri ? `Edit Data: ${editingSantri.nama}` : "Form Tambah Santri Baru"}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      Kelola biodata, pemindahan kelas, dan nomor kontak orang tua
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveForm} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* 1. Akademik & Kelas */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    1. Kelas & Status Santri
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Pilih Kelas Resmi (54 Kelas) *
                      </label>
                      <select
                        value={formKelas}
                        onChange={(e) => setFormKelas(e.target.value)}
                        className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-400 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        {LIST_ALL_KELAS_GROUPED.map((grp) => (
                          <optgroup key={grp.tingkat} label={grp.label}>
                            {grp.kelas.map((cls) => (
                              <option key={cls} value={cls}>
                                Kelas {cls}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Status Santri
                      </label>
                      <select
                        value={formStatusSantri}
                        onChange={(e: any) => setFormStatusSantri(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="aktif">Aktif Belajar</option>
                        <option value="pindah">Pindah Sekolah</option>
                        <option value="keluar">Keluar / Mengundurkan Diri</option>
                        <option value="lulus">Lulus / Alumni</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Wali Kelas (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nama Wali Kelas"
                        value={formWaliKelas}
                        onChange={(e) => setFormWaliKelas(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    {formStatusSantri !== "aktif" && (
                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1 block">
                          Catatan / Alasan Mutasi (Tujuan Sekolah Pindah, Tanggal, dsb)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Pindah ke SMAN 1 Yogyakarta per 10 Agustus 2026"
                          value={formCatatanStatus}
                          onChange={(e) => setFormCatatanStatus(e.target.value)}
                          className="w-full text-xs bg-rose-50/50 dark:bg-rose-950/30 border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Biodata Santri */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Identitas Santri
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Nama Lengkap Santri *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap santri sesuai ijazah/akta"
                        value={formNama}
                        onChange={(e) => setFormNama(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Jenis Kelamin
                      </label>
                      <select
                        value={formJk}
                        onChange={(e) => setFormJk(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        NIS Santri
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 260101"
                        value={formNis}
                        onChange={(e) => setFormNis(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        NISN Santri
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 0098765432"
                        value={formNisn}
                        onChange={(e) => setFormNisn(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        NIK Santri
                      </label>
                      <input
                        type="text"
                        placeholder="16 digit NIK"
                        value={formNik}
                        onChange={(e) => setFormNik(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sleman"
                        value={formTempatLahir}
                        onChange={(e) => setFormTempatLahir(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Tanggal Lahir
                      </label>
                      <input
                        type="text"
                        placeholder="DD-MM-YYYY (Contoh: 15-08-2010)"
                        value={formTanggalLahir}
                        onChange={(e) => setFormTanggalLahir(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Asal Sekolah
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: SD Muhammadiyah Condongcatur"
                        value={formAsalSekolah}
                        onChange={(e) => setFormAsalSekolah(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Alamat Lengkap
                      </label>
                      <input
                        type="text"
                        placeholder="Jalan, No Rumah, RT/RW"
                        value={formAlamat}
                        onChange={(e) => setFormAlamat(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sleman"
                        value={formKabupaten}
                        onChange={(e) => setFormKabupaten(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Data Kontak Orang Tua / Wali */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                    3. Kontak & Biodata Orang Tua
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Ayah */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Data Ayah</p>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Nama Ayah</label>
                        <input
                          type="text"
                          placeholder="Nama ayah"
                          value={formNamaAyah}
                          onChange={(e) => setFormNamaAyah(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">No. Telepon / WA Ayah</label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={formTelpAyah}
                          onChange={(e) => setFormTelpAyah(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Pekerjaan Ayah</label>
                        <input
                          type="text"
                          placeholder="Pekerjaan"
                          value={formPekerjaanAyah}
                          onChange={(e) => setFormPekerjaanAyah(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Ibu */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Data Ibu</p>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Nama Ibu</label>
                        <input
                          type="text"
                          placeholder="Nama ibu"
                          value={formNamaIbu}
                          onChange={(e) => setFormNamaIbu(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">No. Telepon / WA Ibu</label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={formTelpIbu}
                          onChange={(e) => setFormTelpIbu(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block">Pekerjaan Ibu</label>
                        <input
                          type="text"
                          placeholder="Pekerjaan"
                          value={formPekerjaanIbu}
                          onChange={(e) => setFormPekerjaanIbu(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingSantri ? "Simpan Perubahan" : "Tambahkan Santri"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK CLASS TRANSFER POPUP */}
      <AnimatePresence>
        {transferSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Pindah Kelas Santri</h3>
                  <p className="text-xs text-slate-500">Mutasi kelas santri ke 54 kelas yang tersedia</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-400">Nama Santri:</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{transferSantri.nama}</p>
                <p className="text-slate-500 mt-1">Kelas Saat Ini: <span className="font-bold text-emerald-600">{transferSantri.kelasLengkap}</span></p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Pilih Kelas Tujuan Baru:
                </label>
                <select
                  value={transferNewClass}
                  onChange={(e) => setTransferNewClass(e.target.value)}
                  className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  {LIST_ALL_KELAS_GROUPED.map((grp) => (
                    <optgroup key={grp.tingkat} label={grp.label}>
                      {grp.kelas.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setTransferSantri(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteClassTransfer}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  Pindahkan Santri
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Konfirmasi Penghapusan</h3>
                  <p className="text-xs text-slate-500">Pilih tindakan untuk santri ini</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <p className="font-bold text-sm text-slate-800 dark:text-white">{deletingSantri.nama}</p>
                <p className="text-slate-500">Kelas {deletingSantri.kelasLengkap} • NIS: {deletingSantri.nis || "-"}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    const reason = prompt("Masukkan alasan mutasi keluar / pindah:", "Pindah sekolah / Mengundurkan diri");
                    if (reason !== null) {
                      const updated: SantriData = {
                        ...deletingSantri,
                        statusSantri: "keluar",
                        catatanStatus: reason
                      };
                      if (onSaveSantri) onSaveSantri(updated);
                      setDeletingSantri(null);
                    }
                  }}
                  className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-300 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300 transition-colors"
                >
                  <span>Ubah Status jadi "Keluar / Pindah" (Arsipkan)</span>
                  <UserX className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  onClick={handleConfirmDelete}
                  className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-300 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-300 transition-colors"
                >
                  <span>Hapus Permanen dari Database</span>
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setDeletingSantri(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isPage) {
    return containerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        variants={modalContentVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        {containerContent}
      </motion.div>
    </div>
  );
}
