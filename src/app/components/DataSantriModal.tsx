import React, { useState, useMemo, useEffect } from "react";
import {
  X, Search, GraduationCap, Users, Phone, Mail, MapPin,
  Download, Eye, CheckCircle2, ChevronRight, ChevronLeft, Building2,
  Calendar, BookOpen, ShieldCheck, UserCheck, MessageCircle, ExternalLink,
  Layers, Copy, Sparkles, Check, Plus, Edit3, Trash2, AlertTriangle,
  RotateCcw, ArrowRightLeft, UserX, UserPlus, Save, SlidersHorizontal,
  Filter, School, ArrowUpRight, Heart, Globe
} from "lucide-react";
import {
  ALL_SANTRI_DATA, SantriData, getSantriStats, normalizeClassName,
  LIST_ALL_KELAS_GROUPED, LIST_ALL_KELAS_FLAT, getClassMetadata,
  buildSiblingMap, SiblingInfo
} from "../data/santriData";
import { motion, AnimatePresence } from "motion/react";
import { modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";
import { SantriPetaSebaran } from "./SantriPetaSebaran";

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
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "non_aktif" | "bersaudara">("aktif");

  // Sibling lookup map
  const siblingMap = useMemo(() => buildSiblingMap(santriList), [santriList]);

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
  const [formKabupaten, setFormKabupaten] = useState("Yogyakarta");
  const [formProvinsi, setFormProvinsi] = useState("D.I. Yogyakarta");
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

  // Peta Sebaran Modal
  const [showPetaSebaran, setShowPetaSebaran] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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

    const siblingsCount = Array.from(siblingMap.keys()).length;

    return {
      total: santriList.length,
      activeCount,
      inactiveCount,
      siblingsCount,
      byJenjang,
      byTingkat,
      byKelas
    };
  }, [santriList, siblingMap]);

  // Filtered dataset
  const filteredSantri = useMemo(() => {
    let result = santriList;

    // Filter Status
    if (filterStatus === "aktif") {
      result = result.filter(s => !s.statusSantri || s.statusSantri === "aktif");
    } else if (filterStatus === "non_aktif") {
      result = result.filter(s => s.statusSantri && s.statusSantri !== "aktif");
    } else if (filterStatus === "bersaudara") {
      result = result.filter(s => siblingMap.has(s.id));
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
  }, [santriList, filterStatus, selectedClass, selectedTingkat, searchQuery, siblingMap]);

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
    setFormKelas(selectedClass !== "all" ? selectedClass : "1 A");
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
      appAlert("Nama santri wajib diisi.", "Validasi Data", "warning");
      return;
    }

    const meta = getClassMetadata(formKelas);
    const santriId = editingSantri?.id || `santri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const recordToSave: SantriData = {
      id: santriId,
      no: editingSantri?.no || santriList.length + 1,
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

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[92vh] overflow-hidden"}`}>
      {/* ─── HEADER BAR (Harmonized Brand Style) ─── */}
      <div className={`p-4 sm:p-5 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs ring-1 ring-slate-200/50" 
          : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              aria-label="Kembali ke Dasbor"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-2xs ${
                isPage 
                  ? "bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-700" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`font-black text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
                  Database Induk Santri
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                  isPage 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-white/15 text-emerald-200 border border-white/20"
                }`}>
                  {stats.activeCount.toLocaleString("id-ID")} Aktif
                </span>
                {isKoorMusyrif && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isPage ? "bg-teal-50 text-teal-800 border border-teal-200/60" : "bg-teal-500/20 text-teal-200"
                  }`}>
                    Akses Koordinator
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-slate-300"}`}>
                Master biodata, mutasi kelas & sinkronisasi Google Sheets (1.499 Santri MTs/MA)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
            {isKoorMusyrif && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Santri</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                isPage
                  ? "bg-slate-800 hover:bg-slate-900 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
              title="Unduh data dalam format CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Ekspor CSV ({filteredSantri.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPetaSebaran(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                isPage
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400/30"
              }`}
              title="Lihat peta sebaran asal santri"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Peta Sebaran</span>
            </button>

            {isKoorMusyrif && onResetSantri && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await appConfirm(
                    "Apakah Anda yakin ingin memulihkan seluruh data santri kembali ke data master Excel (1.499 santri)?",
                    "Reset Master Excel",
                    { type: "danger", confirmText: "Ya, Pulihkan", cancelText: "Batal" }
                  );
                  if (ok) {
                    onResetSantri();
                  }
                }}
                className={`p-2 rounded-xl text-xs transition-colors ${
                  isPage ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-rose-300 hover:bg-white/10"
                }`}
                title="Pulihkan data master ke dataset Excel awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── STATISTICAL METRIC CARDS (Mu'allimin Brand Palette) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Total Aktif */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-emerald-200/70 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium truncate">Santri Aktif</p>
            <p className="text-lg sm:text-xl font-black text-emerald-800 font-mono leading-none mt-0.5">
              {stats.activeCount.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Tingkat MTs */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-teal-200/70 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium truncate">MTs (Kls 1-3)</p>
            <p className="text-lg sm:text-xl font-black text-teal-800 font-mono leading-none mt-0.5">
              {stats.byJenjang.MTs.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Tingkat MA */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-sky-200/70 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium truncate">MA (Kls 4-6)</p>
            <p className="text-lg sm:text-xl font-black text-sky-800 font-mono leading-none mt-0.5">
              {stats.byJenjang.MA.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Hasil Filter */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-amber-200/70 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium truncate">Tersaring</p>
            <p className="text-lg sm:text-xl font-black text-amber-800 font-mono leading-none mt-0.5">
              {filteredSantri.length.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3.5">
        {/* Row 1: Search & Class Picker */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama, NIS, NISN, Kelas, Kota/Kabupaten, Asal Sekolah, Ortu..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select Kelas Resmi */}
          <div className="w-full sm:w-60 shrink-0">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
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

        {/* Row 2: Status Filter Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterStatus("aktif")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                filterStatus === "aktif"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktif ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("bersaudara")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                filterStatus === "bersaudara"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-purple-700 hover:text-purple-900 bg-purple-50/70"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filterStatus === "bersaudara" ? "text-white fill-white" : "text-purple-600 fill-purple-600"}`} />
              <span>Bersaudara ({stats.siblingsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("non_aktif")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                filterStatus === "non_aktif"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pindah/Keluar ({stats.inactiveCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                filterStatus === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({stats.total})
            </button>
          </div>

          {/* Quick Filter Tingkat (Horizontal Pill Row) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-xs font-bold text-slate-400 mr-0.5 shrink-0 hidden sm:inline">Tingkat:</span>
            <button
              type="button"
              onClick={() => { setSelectedClass("all"); setSelectedTingkat("all"); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                selectedClass === "all" && selectedTingkat === "all"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
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
                type="button"
                onClick={() => {
                  setSelectedTingkat(selectedTingkat === t.val ? "all" : t.val);
                  setSelectedClass("all");
                }}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                  selectedTingkat === t.val && selectedClass === "all"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT: RESPONSIVE CARDS & ELEGANT TABLE ─── */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
        {paginatedSantri.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak ada santri yang sesuai</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian lain atau ubah filter kelas/tingkat yang dipilih.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSelectedClass("all"); setSelectedTingkat("all"); setFilterStatus("all"); }}
              className="mt-4 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              Tampilkan Semua Santri
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12 whitespace-nowrap">No</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Nama Santri</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap w-28">Kelas</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap w-32">NIS / NISN</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Asal Daerah</th>
                    <th className="py-3.5 px-4 whitespace-nowrap w-40">Kontak Ortu / WA</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSantri.map((s, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isInactive = s.statusSantri && s.statusSantri !== "aktif";
                    const contactPhone = s.telpAyah || s.telpIbu || s.telpWali;
                    const contactName = s.namaAyah ? s.namaAyah.split(" ")[0] : (s.namaIbu ? s.namaIbu.split(" ")[0] : "Ortu");

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSantri(s)}
                        className={`hover:bg-emerald-50/40 cursor-pointer transition-colors ${
                          isInactive ? "bg-rose-50/30" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono whitespace-nowrap">
                          {rowNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{s.nama}</span>
                            {s.statusSantri && s.statusSantri !== "aktif" && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                                s.statusSantri === "keluar" 
                                  ? "bg-rose-100 text-rose-800" 
                                  : s.statusSantri === "pindah" 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {s.statusSantri}
                              </span>
                            )}
                          </div>
                          {siblingMap.has(s.id) && (
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSantri(s);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100 transition-colors shadow-2xs font-sans whitespace-nowrap cursor-pointer"
                                title={siblingMap.get(s.id)!.map(sib => `${sib.relationship === "kakak" ? "Kakak" : sib.relationship === "adik" ? "Adik" : "Saudara"}: ${sib.santri.nama} (${sib.santri.kelasLengkap})`).join(", ")}
                              >
                                <Heart className="w-2.5 h-2.5 text-purple-600 fill-purple-600 shrink-0" />
                                <span>
                                  {siblingMap.get(s.id)!.length === 1 
                                    ? `${siblingMap.get(s.id)![0].relationship === "kakak" ? "Kakak" : siblingMap.get(s.id)![0].relationship === "adik" ? "Adik" : "Saudara"} di Kls ${siblingMap.get(s.id)![0].santri.kelasLengkap}`
                                    : `${siblingMap.get(s.id)!.length + 1} Bersaudara`}
                                </span>
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isKoorMusyrif) {
                                setTransferSantri(s);
                                setTransferNewClass(s.kelasLengkap);
                              }
                            }}
                            className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs font-mono"
                            title={isKoorMusyrif ? "Klik untuk Pindah Kelas Kilat" : undefined}
                          >
                            <span>{s.kelasLengkap}</span>
                            {isKoorMusyrif && <ArrowRightLeft className="w-3 h-3 text-emerald-600 shrink-0" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700 whitespace-nowrap">
                          <div className="font-bold">{s.nis || "-"}</div>
                          <div className="text-[10px] text-slate-400">{s.nisn || ""}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          <div className="font-medium truncate max-w-xs">{s.kabupaten || s.provinsi || "-"}</div>
                          {s.desa && <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.desa}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {contactPhone ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(contactPhone, s.nama)}
                              className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs"
                              title={`Chat WhatsApp ke ${contactName} (${contactPhone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>WA {contactName}</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedSantri(s)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isKoorMusyrif && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditForm(s)}
                                  className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
                                  title="Edit Biodata Santri"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeletingSantri(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                  title="Hapus / Mutasi Keluar"
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

            {/* Mobile / Tablet Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedSantri.map((s, idx) => {
                const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const contactPhone = s.telpAyah || s.telpIbu || s.telpWali;
                const contactName = s.namaAyah ? s.namaAyah.split(" ")[0] : (s.namaIbu ? s.namaIbu.split(" ")[0] : "Ortu");

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSantri(s)}
                    className="p-3.5 hover:bg-emerald-50/40 active:bg-emerald-50/60 transition-colors flex items-start gap-3"
                  >
                    {/* Avatar Initials */}
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {s.nama.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 truncate leading-tight">
                          {s.nama}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 font-mono">
                          {s.kelasLengkap}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                        <span>NIS: {s.nis || "-"}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">{s.kabupaten || s.provinsi || "Yogyakarta"}</span>
                      </div>

                      {siblingMap.has(s.id) && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs font-sans">
                            <Heart className="w-2.5 h-2.5 text-purple-600 fill-purple-600 shrink-0" />
                            <span>
                              {siblingMap.get(s.id)!.length === 1 
                                ? `${siblingMap.get(s.id)![0].relationship === "kakak" ? "Kakak" : siblingMap.get(s.id)![0].relationship === "adik" ? "Adik" : "Saudara"} (${siblingMap.get(s.id)![0].santri.nama.split(" ")[0]} - Kls ${siblingMap.get(s.id)![0].santri.kelasLengkap})`
                                : `${siblingMap.get(s.id)!.length + 1} Bersaudara`}
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Quick Action Bottom Row */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                        {contactPhone ? (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(contactPhone, s.nama)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors border border-emerald-200/60 shadow-2xs"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WA {contactName}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Tanpa Kontak</span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSantri(s)}
                            className="p-1 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-100"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isKoorMusyrif && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(s)}
                                className="p-1 text-slate-500 hover:text-teal-700 rounded-lg hover:bg-teal-50"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSantri(s)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500">
              <div>
                Menampilkan <span className="font-bold text-slate-800">{paginatedSantri.length}</span> dari <span className="font-bold text-slate-800">{filteredSantri.length}</span> santri (Halaman {currentPage} dari {totalPages})
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-xl border border-slate-200/80 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors bg-white shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-xl border border-slate-200/80 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors bg-white shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── DETAIL SANTRI POPUP MODAL ─── */}
      <AnimatePresence>
        {selectedSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-linear-to-r from-emerald-800 to-teal-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg shadow-inner">
                    {selectedSantri.nama.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black leading-tight">{selectedSantri.nama}</h3>
                    <p className="text-xs text-emerald-200">
                      Kelas {selectedSantri.kelasLengkap} ({selectedSantri.tingkatRomawi}) • NIS: {selectedSantri.nis || "-"} • NISN: {selectedSantri.nisn || "-"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSantri(null)}
                  className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* Status Notice if Non-Aktif */}
                {selectedSantri.statusSantri && selectedSantri.statusSantri !== "aktif" && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Status: Santri {selectedSantri.statusSantri}</p>
                      {selectedSantri.catatanStatus && (
                        <p className="text-xs mt-0.5 text-amber-800">{selectedSantri.catatanStatus}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 1. Bagian Identitas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Identitas Pribadi</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Tempat, Tanggal Lahir</p>
                      <p className="font-bold text-slate-800">
                        {selectedSantri.tempatLahir ? `${selectedSantri.tempatLahir}, ${selectedSantri.tanggalLahir}` : selectedSantri.tanggalLahir || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">NIK Santri</p>
                      <p className="font-mono font-bold text-slate-800">{selectedSantri.nik || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Jenis Kelamin / Agama</p>
                      <p className="font-bold text-slate-800">{selectedSantri.jk} / {selectedSantri.agama}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Asal Sekolah</p>
                      <p className="font-bold text-slate-800">{selectedSantri.asalSekolah || "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] text-slate-400 font-medium">Alamat Tempat Tinggal</p>
                      <p className="font-medium text-slate-800">
                        {selectedSantri.alamat || "-"} {selectedSantri.desa ? `, Desa ${selectedSantri.desa}` : ""} {selectedSantri.kecamatan ? `, Kec. ${selectedSantri.kecamatan}` : ""} {selectedSantri.kabupaten ? `, ${selectedSantri.kabupaten}` : ""} {selectedSantri.provinsi ? `, ${selectedSantri.provinsi}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Bagian Akademik & Kelas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Data Akademik & Kelas</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Jenjang</p>
                      <p className="font-bold text-slate-800">{selectedSantri.jenjang}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Tingkat</p>
                      <p className="font-bold text-emerald-700">{selectedSantri.tingkat} ({selectedSantri.tingkatRomawi})</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Kelas Lengkap</p>
                      <p className="font-bold text-slate-800">{selectedSantri.kelasLengkap}</p>
                    </div>
                    {selectedSantri.waliKelas && (
                      <div className="sm:col-span-3">
                        <p className="text-[11px] text-slate-400 font-medium">Wali Kelas</p>
                        <p className="font-bold text-slate-800">{selectedSantri.waliKelas} {selectedSantri.nbmWaliKelas ? `(NBM: ${selectedSantri.nbmWaliKelas})` : ""}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bagian Hubungan Saudara Kandung */}
                {selectedSantri && siblingMap.has(selectedSantri.id) && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-purple-600 fill-purple-600" />
                        <span>Saudara Kandung di Mu'allimiin ({siblingMap.get(selectedSantri.id)!.length} Santri)</span>
                      </h4>
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {siblingMap.get(selectedSantri.id)!.length + 1} Bersaudara Satu Keluarga
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {siblingMap.get(selectedSantri.id)!.map((sib) => (
                        <div
                          key={sib.santri.id}
                          className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200/90 flex items-center justify-between gap-3 shadow-2xs hover:bg-purple-100/60 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {sib.santri.nama.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-purple-950 truncate max-w-[130px]">
                                  {sib.santri.nama}
                                </span>
                                <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md ${
                                  sib.relationship === "kakak"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : sib.relationship === "adik"
                                    ? "bg-teal-100 text-teal-800 border border-teal-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  {sib.relationship === "kakak" ? "Kakak" : sib.relationship === "adik" ? "Adik" : "Kembar / Saudara"}
                                </span>
                              </div>
                              <p className="text-[11px] text-purple-800 font-mono mt-0.5">
                                Kelas {sib.santri.kelasLengkap} • NIS: {sib.santri.nis || "-"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSantri(sib.santri);
                              triggerHaptic("light");
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold shadow-2xs transition-all shrink-0 active:scale-95 flex items-center gap-1"
                            title={`Lihat profil ${sib.santri.nama}`}
                          >
                            <span>Lihat</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Bagian Orang Tua / Wali */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Data Orang Tua & Kontak WhatsApp</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Ayah */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <p className="text-xs font-bold text-slate-700">Data Ayah</p>
                      <div>
                        <p className="text-[11px] text-slate-400">Nama</p>
                        <p className="font-bold text-slate-800">{selectedSantri.namaAyah || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Pekerjaan</p>
                        <p className="text-slate-700 font-medium">{selectedSantri.pekerjaanAyah || "-"}</p>
                      </div>
                      {selectedSantri.telpAyah && (
                        <div className="pt-1">
                          <p className="text-[11px] text-slate-400 mb-1">Kontak Telepon / WA</p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs">{selectedSantri.telpAyah}</span>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(selectedSantri.telpAyah, selectedSantri.nama)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> WA
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ibu */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <p className="text-xs font-bold text-slate-700">Data Ibu</p>
                      <div>
                        <p className="text-[11px] text-slate-400">Nama</p>
                        <p className="font-bold text-slate-800">{selectedSantri.namaIbu || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Pekerjaan</p>
                        <p className="text-slate-700 font-medium">{selectedSantri.pekerjaanIbu || "-"}</p>
                      </div>
                      {selectedSantri.telpIbu && (
                        <div className="pt-1">
                          <p className="text-[11px] text-slate-400 mb-1">Kontak Telepon / WA</p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs">{selectedSantri.telpIbu}</span>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(selectedSantri.telpIbu, selectedSantri.nama)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> WA
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(
                      `Data Santri Mu'allimiin:\nNama: ${selectedSantri.nama}\nKelas: ${selectedSantri.kelasLengkap}\nNIS: ${selectedSantri.nis}\nNISN: ${selectedSantri.nisn}\nAlamat: ${selectedSantri.alamat}, ${selectedSantri.kabupaten}\nOrtu: ${selectedSantri.namaAyah || selectedSantri.namaIbu} (${selectedSantri.telpAyah || selectedSantri.telpIbu || "-"})`,
                      selectedSantri.id
                    )}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === selectedSantri.id ? "Tersalin!" : "Salin Biodata"}</span>
                  </button>

                  {isKoorMusyrif && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const s = selectedSantri;
                          setSelectedSantri(null);
                          handleOpenEditForm(s);
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Data</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTransferSantri(selectedSantri);
                          setTransferNewClass(selectedSantri.kelasLengkap);
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Pindah Kelas</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSantri(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL FORM TAMBAH / EDIT SANTRI ─── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Form Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-emerald-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-600 flex items-center justify-center">
                    {editingSantri ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black leading-tight">
                      {editingSantri ? `Edit Data: ${editingSantri.nama}` : "Tambah Santri Baru"}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      Kelola biodata, kelas, dan kontak orang tua santri
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveForm} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* 1. Akademik & Kelas */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                    1. Kelas & Status Santri
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Pilih Kelas Resmi (54 Kelas) *
                      </label>
                      <select
                        value={formKelas}
                        onChange={(e) => setFormKelas(e.target.value)}
                        className="w-full text-xs font-bold bg-white border border-emerald-400 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
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
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Status Santri
                      </label>
                      <select
                        value={formStatusSantri}
                        onChange={(e: any) => setFormStatusSantri(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
                      >
                        <option value="aktif">Aktif Belajar</option>
                        <option value="pindah">Pindah Sekolah</option>
                        <option value="keluar">Keluar / Mengundurkan Diri</option>
                        <option value="lulus">Lulus / Alumni</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Wali Kelas (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nama Wali Kelas"
                        value={formWaliKelas}
                        onChange={(e) => setFormWaliKelas(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    {formStatusSantri !== "aktif" && (
                      <div className="sm:col-span-3">
                        <label className="text-xs font-bold text-rose-700 mb-1 block">
                          Catatan / Alasan Mutasi
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Pindah ke SMAN 1 Yogyakarta per 10 Agustus 2026"
                          value={formCatatanStatus}
                          onChange={(e) => setFormCatatanStatus(e.target.value)}
                          className="w-full text-xs bg-rose-50/60 border border-rose-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none shadow-2xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Biodata Santri */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    2. Identitas Santri
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Nama Lengkap Santri *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap santri sesuai ijazah/akta"
                        value={formNama}
                        onChange={(e) => setFormNama(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-bold shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Jenis Kelamin
                      </label>
                      <select
                        value={formJk}
                        onChange={(e) => setFormJk(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        NIS Santri
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 12478"
                        value={formNis}
                        onChange={(e) => setFormNis(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        NISN Santri
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 0141962152"
                        value={formNisn}
                        onChange={(e) => setFormNisn(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        NIK Santri
                      </label>
                      <input
                        type="text"
                        placeholder="16 digit NIK"
                        value={formNik}
                        onChange={(e) => setFormNik(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Gresik"
                        value={formTempatLahir}
                        onChange={(e) => setFormTempatLahir(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Tanggal Lahir
                      </label>
                      <input
                        type="text"
                        placeholder="DD-MM-YYYY (Contoh: 15-08-2010)"
                        value={formTanggalLahir}
                        onChange={(e) => setFormTanggalLahir(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Asal Sekolah
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: SD Muhammadiyah"
                        value={formAsalSekolah}
                        onChange={(e) => setFormAsalSekolah(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Alamat Lengkap
                      </label>
                      <input
                        type="text"
                        placeholder="Jalan, No Rumah, RT/RW"
                        value={formAlamat}
                        onChange={(e) => setFormAlamat(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sleman"
                        value={formKabupaten}
                        onChange={(e) => setFormKabupaten(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Data Orang Tua */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    3. Kontak & Biodata Orang Tua
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Ayah */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                      <p className="font-bold text-xs text-slate-800">Data Ayah</p>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">Nama Ayah</label>
                        <input
                          type="text"
                          placeholder="Nama ayah"
                          value={formNamaAyah}
                          onChange={(e) => setFormNamaAyah(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">No. Telepon / WA Ayah</label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={formTelpAyah}
                          onChange={(e) => setFormTelpAyah(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">Pekerjaan Ayah</label>
                        <input
                          type="text"
                          placeholder="Pekerjaan"
                          value={formPekerjaanAyah}
                          onChange={(e) => setFormPekerjaanAyah(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Ibu */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                      <p className="font-bold text-xs text-slate-800">Data Ibu</p>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">Nama Ibu</label>
                        <input
                          type="text"
                          placeholder="Nama ibu"
                          value={formNamaIbu}
                          onChange={(e) => setFormNamaIbu(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">No. Telepon / WA Ibu</label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={formTelpIbu}
                          onChange={(e) => setFormTelpIbu(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 mb-0.5 block font-medium">Pekerjaan Ibu</label>
                        <input
                          type="text"
                          placeholder="Pekerjaan"
                          value={formPekerjaanIbu}
                          onChange={(e) => setFormPekerjaanIbu(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:bg-white"
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
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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

      {/* ─── QUICK CLASS TRANSFER POPUP ─── */}
      <AnimatePresence>
        {transferSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Pindah Kelas Santri</h3>
                  <p className="text-xs text-slate-500">Mutasi kelas cepat ke 54 kelas yang tersedia</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <p className="text-slate-400 font-medium">Nama Santri:</p>
                <p className="font-black text-sm text-slate-900">{transferSantri.nama}</p>
                <p className="text-slate-500">Kelas Saat Ini: <span className="font-bold text-emerald-700">{transferSantri.kelasLengkap}</span></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Pilih Kelas Tujuan Baru:
                </label>
                <select
                  value={transferNewClass}
                  onChange={(e) => setTransferNewClass(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-emerald-500 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
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
                  type="button"
                  onClick={() => setTransferSantri(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
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

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {deletingSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Konfirmasi Status & Hapus</h3>
                  <p className="text-xs text-slate-500">Pilih tindakan perubahan status santri</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <p className="font-black text-sm text-slate-900">{deletingSantri.nama}</p>
                <p className="text-slate-500 font-mono mt-0.5">Kelas {deletingSantri.kelasLengkap} • NIS: {deletingSantri.nis || "-"}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
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
                  className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left flex items-center justify-between text-xs font-bold text-amber-900 transition-colors shadow-2xs"
                >
                  <span>Ubah Status jadi "Keluar / Pindah" (Arsipkan)</span>
                  <UserX className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-left flex items-center justify-between text-xs font-bold text-rose-900 transition-colors shadow-2xs"
                >
                  <span>Hapus Permanen dari Database</span>
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingSantri(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Peta Sebaran Modal */}
      <AnimatePresence>
        {showPetaSebaran && (
          <SantriPetaSebaran
            onClose={() => setShowPetaSebaran(false)}
            isPage={false}
          />
        )}
      </AnimatePresence>
    </div>
  );

  if (isPage) {
    return (
      <>
        {content}
        <AnimatePresence>
          {showPetaSebaran && (
            <SantriPetaSebaran
              onClose={() => setShowPetaSebaran(false)}
              isPage={true}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        variants={modalContentVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="bg-slate-50 w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {content}
      </motion.div>
    </div>
  );
}
