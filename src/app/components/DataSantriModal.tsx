import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import {
  X, Search, GraduationCap, Users, Phone, Mail, MapPin,
  Download, Eye, CheckCircle2, ChevronRight, ChevronLeft, Building2,
  Calendar, BookOpen, ShieldCheck, UserCheck, MessageCircle, ExternalLink,
  Layers, Copy, Sparkles, Check, Plus, Edit3, Trash2, AlertTriangle,
  RotateCcw, ArrowRightLeft, UserX, UserPlus, Save, SlidersHorizontal,
  Filter, School, ArrowUpRight, Heart, Globe, Clock, CheckCircle, XCircle,
  FileEdit, Send, Inbox, AlertCircle, ShieldAlert
} from "lucide-react";
import {
  ALL_SANTRI_DATA, SantriData, getSantriStats, normalizeClassName,
  LIST_ALL_KELAS_GROUPED, LIST_ALL_KELAS_FLAT, getClassMetadata,
  buildSiblingMap, SiblingItem
} from "../data/santriData";
import { SantriChangeRequest, SantriRequestType } from "../types/santriRequest";
import { motion, AnimatePresence } from "motion/react";
import { modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";
import { SantriPetaSebaran } from "./SantriPetaSebaran";
import { getPamongAssignedAsramas, hasFullAccess } from "../utils/roleAccessUtils";

interface DataSantriModalProps {
  onClose: () => void;
  authUser?: any;
  musyrifList?: any[];
  santriList?: SantriData[];
  santriRequests?: SantriChangeRequest[];
  onSaveSantri?: (santri: SantriData) => void;
  onDeleteSantri?: (id: string) => void;
  onResetSantri?: () => void;
  onRequestChange?: (req: Omit<SantriChangeRequest, "id" | "status" | "requestedAt" | "requestedBy">) => void;
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string, notes?: string) => void;
  onSelectSantriForIzin?: (santri: SantriData) => void;
  onSelectSantriForSakit?: (santri: SantriData) => void;
  isPage?: boolean;
}

export function DataSantriModal({
  onClose,
  authUser,
  musyrifList = [],
  santriList = ALL_SANTRI_DATA,
  santriRequests = [],
  onSaveSantri,
  onDeleteSantri,
  onResetSantri,
  onRequestChange,
  onApproveRequest,
  onRejectRequest,
  onSelectSantriForIzin,
  onSelectSantriForSakit,
  isPage = false
}: DataSantriModalProps) {
  const isKoorMusyrif = authUser?.role === "koordinator_musyrif" || hasFullAccess(authUser || {});
  const isPamong = authUser?.role === "pamong";
  const isMusyrif = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";

  // ─── SCOPE FILTERING (Role-based dataset visibility) ───
  const scopedSantriList = useMemo(() => {
    if (!authUser || isKoorMusyrif) {
      return santriList;
    }

    if (isMusyrif) {
      // Find musyrif assigned class
      const myMusyrif = musyrifList.find(m => m.id === authUser.musyrifId || m.id === authUser.id || m.email?.toLowerCase() === authUser.email?.toLowerCase());
      const rawClass = myMusyrif?.kelas || authUser.kelas || "";
      if (!rawClass || rawClass.toLowerCase().includes("multi") || rawClass.toLowerCase().includes("semua")) {
        return santriList;
      }

      // Split multiple classes if musyrif handles more than 1 class (e.g. "5 Upper C & 6 Internasional")
      const targetClasses = rawClass
        .split(/[&,/+]+/)
        .map(c => normalizeClassName(c).toLowerCase().trim())
        .filter(Boolean);

      return santriList.filter(s => {
        const sNorm = normalizeClassName(s.kelasLengkap || "").toLowerCase().trim();
        return targetClasses.some(tc => sNorm === tc || sNorm.includes(tc) || tc.includes(sNorm));
      });
    }

    if (isPamong) {
      // Find pamong assigned asramas
      const assignedAsramas = getPamongAssignedAsramas(authUser);
      const userAsrama = authUser.asrama || "";
      const validAsramas = assignedAsramas.length > 0 ? assignedAsramas : (userAsrama ? [userAsrama] : []);

      if (validAsramas.length === 0) return santriList;

      // Find all musyrifs and their classes in those asramas
      const classesInAsrama = new Set<string>();
      musyrifList.forEach(m => {
        if (m.asrama && validAsramas.includes(m.asrama) && m.kelas && !m.kelas.toLowerCase().includes("multi")) {
          const splitClasses = m.kelas.split(/[&,/+]+/).map(c => normalizeClassName(c).toLowerCase().trim()).filter(Boolean);
          splitClasses.forEach(sc => classesInAsrama.add(sc));
        }
      });

      if (classesInAsrama.size === 0) return santriList;

      return santriList.filter(s => {
        const sNorm = normalizeClassName(s.kelasLengkap || "").toLowerCase().trim();
        return Array.from(classesInAsrama).some(ca => sNorm === ca || sNorm.includes(ca) || ca.includes(sNorm));
      });
    }

    return santriList;
  }, [santriList, authUser, isKoorMusyrif, isMusyrif, isPamong, musyrifList]);

  // Main navigation tab for Koordinator: "database" vs "requests"
  const [activeMainTab, setActiveMainTab] = useState<"database" | "requests">("database");

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedTingkat, setSelectedTingkat] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "non_aktif" | "bersaudara">("aktif");

  // Sibling lookup map
  const siblingMap = useMemo(() => buildSiblingMap(santriList), [santriList]);

  // Selected student for detail popup
  const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Add / Edit Modal (Direct or Request)
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
  const [requestReason, setRequestReason] = useState("");

  // Delete State
  const [deletingSantri, setDeletingSantri] = useState<SantriData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Quick Class Transfer Modal
  const [transferSantri, setTransferSantri] = useState<SantriData | null>(null);
  const [transferNewClass, setTransferNewClass] = useState("1 A");
  const [transferReason, setTransferReason] = useState("");

  // Peta Sebaran Modal
  const [showPetaSebaran, setShowPetaSebaran] = useState(false);

  // Reject Request Modal
  const [rejectingRequest, setRejectingRequest] = useState<SantriChangeRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Pending requests count
  const pendingRequestsCount = useMemo(() => {
    return santriRequests.filter(r => r.status === "pending").length;
  }, [santriRequests]);

  // Stats calculation
  const stats = useMemo(() => {
    const byJenjang = { MTs: 0, MA: 0 };
    const byTingkat: Record<string, number> = {};
    const byKelas: Record<string, number> = {};
    let activeCount = 0;
    let inactiveCount = 0;

    scopedSantriList.forEach(s => {
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
      total: scopedSantriList.length,
      activeCount,
      inactiveCount,
      siblingsCount,
      byJenjang,
      byTingkat,
      byKelas
    };
  }, [scopedSantriList, siblingMap]);

  // Filtered dataset
  const filteredSantri = useMemo(() => {
    let result = scopedSantriList;

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

    // Search Query (Deferred for buttery smooth typing)
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim();
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
  }, [scopedSantriList, filterStatus, selectedClass, selectedTingkat, deferredSearchQuery, siblingMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, selectedTingkat, selectedClass, filterStatus]);

  const totalPages = Math.ceil(filteredSantri.length / itemsPerPage) || 1;
  const paginatedSantri = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSantri.slice(start, start + itemsPerPage);
  }, [filteredSantri, currentPage, itemsPerPage]);

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerHaptic();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddForm = () => {
    if (!isKoorMusyrif) {
      appAlert("Penambahan santri baru hanya dapat dilakukan oleh Koordinator Musyrif.", "Akses Dibatasi", { type: "warning" });
      return;
    }
    setEditingSantri(null);
    setFormNama("");
    setFormKelas(LIST_ALL_KELAS_FLAT[0] || "1 A");
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
    setRequestReason("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (santri: SantriData) => {
    setEditingSantri(santri);
    setFormNama(santri.nama || "");
    setFormKelas(santri.kelasLengkap || "1 A");
    setFormNis(santri.nis || "");
    setFormNisn(santri.nisn || "");
    setFormNik(santri.nik || "");
    setFormJk(santri.jk || "Laki-laki");
    setFormAgama(santri.agama || "Islam");
    setFormTempatLahir(santri.tempatLahir || "");
    setFormTanggalLahir(santri.tanggalLahir || "");
    setFormAlamat(santri.alamat || "");
    setFormDesa(santri.desa || "");
    setFormKecamatan(santri.kecamatan || "");
    setFormKabupaten(santri.kabupaten || "Yogyakarta");
    setFormProvinsi(santri.provinsi || "D.I. Yogyakarta");
    setFormKodepos(santri.kodepos || "");
    setFormAsalSekolah(santri.asalSekolah || "");
    setFormNamaAyah(santri.namaAyah || "");
    setFormPekerjaanAyah(santri.pekerjaanAyah || "");
    setFormTelpAyah(santri.telpAyah || "");
    setFormNamaIbu(santri.namaIbu || "");
    setFormPekerjaanIbu(santri.pekerjaanIbu || "");
    setFormTelpIbu(santri.telpIbu || "");
    setFormNamaWali(santri.namaWali || "");
    setFormTelpWali(santri.telpWali || "");
    setFormWaliKelas(santri.waliKelas || "");
    setFormStatusSantri(santri.statusSantri || "aktif");
    setFormCatatanStatus(santri.catatanStatus || "");
    setRequestReason("");
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      appAlert("Nama santri wajib diisi.", "Peringatan", { type: "warning" });
      return;
    }

    const meta = getClassMetadata(formKelas);
    const santriId = editingSantri ? editingSantri.id : `s_${Date.now()}`;
    const santriNo = editingSantri ? editingSantri.no : (santriList.length + 1);

    const recordToSave: SantriData = {
      id: santriId,
      no: santriNo,
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

    if (isKoorMusyrif) {
      // Direct Save
      if (onSaveSantri) {
        onSaveSantri(recordToSave);
      }
    } else {
      // Musyrif / Pamong creates Request
      if (!editingSantri) {
        appAlert("Hanya Koordinator yang dapat menambah santri baru secara langsung.", "Akses Dibatasi", { type: "warning" });
        return;
      }
      if (onRequestChange) {
        onRequestChange({
          santriId: editingSantri.id,
          santriNama: editingSantri.nama,
          santriKelasAsal: editingSantri.kelasLengkap,
          santriNis: editingSantri.nis,
          type: "edit",
          reason: requestReason.trim() || "Pembaruan biodata santri",
          proposedData: recordToSave
        });
      }
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

    if (isKoorMusyrif) {
      if (onSaveSantri) {
        onSaveSantri(updated);
      }
    } else {
      if (onRequestChange) {
        onRequestChange({
          santriId: transferSantri.id,
          santriNama: transferSantri.nama,
          santriKelasAsal: transferSantri.kelasLengkap,
          santriNis: transferSantri.nis,
          type: "transfer_kelas",
          reason: transferReason.trim() || `Mutasi ke kelas ${transferNewClass}`,
          proposedData: updated
        });
      }
    }

    triggerHaptic();
    setTransferSantri(null);
    setTransferReason("");
    if (selectedSantri && selectedSantri.id === updated.id) {
      setSelectedSantri(updated);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingSantri) return;

    if (isKoorMusyrif) {
      if (onDeleteSantri) {
        onDeleteSantri(deletingSantri.id);
      }
    } else {
      if (onRequestChange) {
        onRequestChange({
          santriId: deletingSantri.id,
          santriNama: deletingSantri.nama,
          santriKelasAsal: deletingSantri.kelasLengkap,
          santriNis: deletingSantri.nis,
          type: "delete",
          reason: deleteReason.trim() || "Permohonan penghapusan data santri"
        });
      }
    }

    triggerHaptic();
    setDeletingSantri(null);
    setDeleteReason("");
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

  // Scope label for UI badge
  const scopeBadgeLabel = useMemo(() => {
    if (isKoorMusyrif) return "Akses Koordinator (Seluruh Santri)";
    if (isMusyrif) {
      const myMusyrif = musyrifList.find(m => m.id === authUser?.musyrifId || m.id === authUser?.id || m.email?.toLowerCase() === authUser?.email?.toLowerCase());
      return `Musyrif Kelas ${myMusyrif?.kelas || authUser?.kelas || ""}`;
    }
    if (isPamong) return `Pamong ${authUser?.asrama || "Asrama"}`;
    return "Akses Terbatas";
  }, [isKoorMusyrif, isMusyrif, isPamong, authUser, musyrifList]);

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[92vh] overflow-hidden"}`}>
      {/* ─── 1. CARD 1: HEADER, TABS & STATISTICAL METRICS ─── */}
      <div className={`bg-white rounded-3xl border border-slate-200/70 shadow-xs flex flex-col p-4 sm:p-5 gap-3.5 ${
        !isPage ? "rounded-t-3xl" : ""
      }`}>
        {/* Row 1: Header (Back Button, Title & Badges, Action Buttons) */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Kembali ke Dasbor"
            className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0"
          >
            {isPage ? <ChevronLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-sm sm:text-base leading-tight whitespace-nowrap text-slate-900">
              Database Santri
            </h2>
            <p className="text-[11px] mt-0.5 truncate text-slate-400">
              {isKoorMusyrif 
                ? "Master biodata, mutasi kelas & kelola permohonan santri" 
                : "Daftar santri binaan. Untuk edit/pindah/hapus, ajukan permohonan ke Koordinator."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isKoorMusyrif && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="h-8 px-3 rounded-xl text-xs font-bold transition-all bg-[#0C81E4] hover:bg-[#0C4E8C] text-white flex items-center gap-1 active:scale-95 whitespace-nowrap shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tambah</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 active:scale-95 whitespace-nowrap"
              title="Unduh CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPetaSebaran(true)}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold transition-all bg-sky-50 text-[#0C4E8C] hover:bg-sky-100 border border-sky-200 flex items-center gap-1 active:scale-95 whitespace-nowrap"
              title="Peta Sebaran"
            >
              <Globe className="w-3.5 h-3.5 text-[#0C81E4]" />
              <span className="hidden sm:inline">Peta</span>
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
                  if (ok) onResetSantri();
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Pulihkan data master"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Integrated Segmented Tab Switcher */}
        <div className="bg-slate-100/90 p-1 rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setActiveMainTab("database")}
            className={`flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMainTab === "database"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Daftar Santri ({scopedSantriList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("requests")}
            className={`flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
              activeMainTab === "requests"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>{isKoorMusyrif ? "Kelola Permohonan" : "Status Pengajuan"}</span>
            {pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 3: Ringkasan Metrik Statistik */}
        {activeMainTab === "database" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            {/* Santri Aktif */}
            <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-700 font-semibold truncate leading-tight">Santri Aktif</p>
                <p className="text-base sm:text-lg font-black text-emerald-900 font-mono leading-none mt-0.5">
                  {stats.activeCount.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* MTs */}
            <div className="bg-teal-50/70 border border-teal-100/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <School className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-teal-700 font-semibold truncate leading-tight">MTs (Kls 1-3)</p>
                <p className="text-base sm:text-lg font-black text-teal-900 font-mono leading-none mt-0.5">
                  {stats.byJenjang.MTs.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* MA */}
            <div className="bg-sky-50/70 border border-sky-100/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-sky-700 font-semibold truncate leading-tight">MA (Kls 4-6)</p>
                <p className="text-base sm:text-lg font-black text-sky-900 font-mono leading-none mt-0.5">
                  {stats.byJenjang.MA.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* Tersaring */}
            <div className="bg-amber-50/70 border border-amber-100/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-amber-700 font-semibold truncate leading-tight">Tersaring</p>
                <p className="text-base sm:text-lg font-black text-amber-900 font-mono leading-none mt-0.5">
                  {filteredSantri.length.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. CARD 2: PENCARIAN & FILTER KONTROL ─── */}
      {activeMainTab === "database" && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2">
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

            {/* Class Picker */}
            <div className="flex items-center gap-2">
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  if (e.target.value !== "all") setSelectedTingkat("all");
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Kelas ({scopedSantriList.length})</option>
                {LIST_ALL_KELAS_GROUPED.map(grp => (
                  <optgroup key={grp.tingkat} label={grp.label}>
                    {grp.kelas.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Pills (Status & Tingkat) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {/* Row 1: Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Status:</span>
              {[
                { id: "aktif", label: `Aktif (${stats.activeCount})` },
                { id: "bersaudara", label: `Bersaudara (${stats.siblingsCount})`, icon: Heart },
                { id: "all", label: `Semua (${stats.total})` },
                { id: "non_aktif", label: `Non-Aktif (${stats.inactiveCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                    filterStatus === tab.id
                      ? tab.id === "bersaudara"
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-emerald-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Row 2: Tingkat Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Tingkat:</span>
              {["all", "Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTingkat(t);
                    setSelectedClass("all");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    selectedTingkat === t && selectedClass === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {t === "all" ? "Semua Tingkat" : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: REQUESTS LIST ─── */}
      {activeMainTab === "requests" && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {isKoorMusyrif ? "Antrean Permohonan Perubahan Data" : "Riwayat Permohonan Saya"}
              </h3>
              <p className="text-xs text-slate-400">
                {isKoorMusyrif 
                  ? "Permohonan edit biodata, mutasi kelas, atau hapus dari Musyrif/Pamong" 
                  : "Daftar usulan yang Anda ajukan ke Koordinator Musyrif"}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              Total: {santriRequests.length}
            </span>
          </div>

          {santriRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Inbox className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold">Belum ada permohonan perubahan data.</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isKoorMusyrif 
                  ? "Saat Musyrif atau Pamong mengajukan edit data santri, daftarnya akan muncul di sini untuk Anda setujui." 
                  : "Anda dapat mengajukan permohonan edit biodata, pindah kelas, atau hapus melalui tombol aksi pada santri."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {santriRequests.map((req) => {
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const isRejected = req.status === "rejected";

                return (
                  <div 
                    key={req.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isPending ? "bg-amber-50/40 border-amber-200" :
                      isApproved ? "bg-emerald-50/40 border-emerald-200" :
                      "bg-rose-50/40 border-rose-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono ${
                            req.type === "edit" ? "bg-blue-100 text-blue-800" :
                            req.type === "transfer_kelas" ? "bg-purple-100 text-purple-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {req.type === "edit" ? "Edit Biodata" :
                             req.type === "transfer_kelas" ? "Mutasi Kelas" : "Hapus Data"}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isPending ? "bg-amber-100 text-amber-800" :
                            isApproved ? "bg-emerald-100 text-emerald-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {isPending && <Clock className="w-3 h-3 animate-spin" />}
                            {isApproved && <CheckCircle className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            <span>{isPending ? "Menunggu Persetujuan" : isApproved ? "Disetujui (ACC)" : "Ditolak"}</span>
                          </span>

                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(req.requestedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {req.santriNama} <span className="text-xs font-normal text-slate-500 font-mono">({req.santriKelasAsal} · NIS: {req.santriNis})</span>
                        </p>

                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Alasan/Keterangan:</span> {req.reason}
                        </p>

                        {/* Proposed Details */}
                        {req.type === "transfer_kelas" && req.proposedData?.kelasLengkap && (
                          <div className="text-xs bg-white/80 p-2 rounded-xl border border-purple-100 text-purple-900 flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                            <span>Pindah ke: <strong>{req.proposedData.kelasLengkap}</strong></span>
                          </div>
                        )}

                        {req.type === "edit" && req.proposedData && (
                          <div className="text-xs bg-white/80 p-2 rounded-xl border border-blue-100 text-slate-700 space-y-0.5">
                            <span className="font-semibold text-blue-800">Perubahan data yang diajukan:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
                              {req.proposedData.nama !== req.santriNama && <div>• Nama: {req.proposedData.nama}</div>}
                              {req.proposedData.kelasLengkap !== req.santriKelasAsal && <div>• Kelas: {req.proposedData.kelasLengkap}</div>}
                              {req.proposedData.telpAyah && <div>• Telp Ayah: {req.proposedData.telpAyah}</div>}
                              {req.proposedData.telpIbu && <div>• Telp Ibu: {req.proposedData.telpIbu}</div>}
                              {req.proposedData.waliKelas && <div>• Wali Kelas: {req.proposedData.waliKelas}</div>}
                            </div>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-400">
                          Diajukan oleh: <strong className="text-slate-600">{req.requestedBy.name}</strong> ({req.requestedBy.role})
                        </p>

                        {req.reviewNotes && (
                          <p className="text-xs text-rose-700 bg-rose-50 p-1.5 rounded-lg">
                            Catatan Penolakan: {req.reviewNotes}
                          </p>
                        )}
                      </div>

                      {/* Approval Actions (Koordinator Only) */}
                      {isKoorMusyrif && isPending && (
                        <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => onApproveRequest && onApproveRequest(req.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Setujui (ACC)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectNotes("");
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

          {/* ─── SANTRI TABLE VIEW (Desktop) / CARD VIEW (Mobile) ─── */}
      {activeMainTab === "database" && (
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Lengkap & Biodata</th>
                    <th className="py-3.5 px-4 w-28 text-center">Kelas</th>
                    <th className="py-3.5 px-4">NIS / NISN</th>
                    <th className="py-3.5 px-4">Asal Daerah</th>
                    <th className="py-3.5 px-4">Kontak Orang Tua</th>
                    <th className="py-3.5 px-4 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedSantri.map((s, idx) => {
                    const siblings = siblingMap.get(s.id);
                    return (
                      <tr 
                        key={s.id}
                        className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedSantri(s)}
                      >
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                            {s.nama}
                          </div>
                          {siblings && siblings.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {siblings.map((sib, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => setSelectedSantri(sib.santri)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-700 transition-all active:scale-95"
                                  title={`Klik untuk lihat profil saudara: ${sib.santri.nama}`}
                                >
                                  <Heart className="w-2.5 h-2.5 text-purple-500 fill-purple-500" />
                                  <span>{sib.relationLabel}: {sib.santri.nama.split(" ")[0]} ({sib.santri.kelasLengkap})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono shadow-2xs whitespace-nowrap">
                            {s.kelasLengkap}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <div><span className="text-[10px] text-slate-400">NIS:</span> {s.nis}</div>
                          {s.nisn && <div className="text-[11px] text-slate-400"><span className="text-[9px]">NISN:</span> {s.nisn}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium text-slate-800">{s.kabupaten || "-"}</div>
                          <div className="text-[10px] text-slate-400">{s.provinsi || ""}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600" onClick={(e) => e.stopPropagation()}>
                          {s.telpAyah ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(s.telpAyah, s.nama)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono">{s.telpAyah}</span>
                            </button>
                          ) : s.telpIbu ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(s.telpIbu, s.nama)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono">{s.telpIbu}</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">Tidak ada nomor</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedSantri(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              title="Lihat Detail Santri"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit / Request Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(s)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title={isKoorMusyrif ? "Edit Biodata Santri" : "Ajukan Perubahan Biodata ke Koordinator"}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Class Transfer / Request Transfer */}
                            <button
                              type="button"
                              onClick={() => {
                                setTransferSantri(s);
                                setTransferNewClass(s.kelasLengkap || "1 A");
                                setTransferReason("");
                              }}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                              title={isKoorMusyrif ? "Mutasi / Pindah Kelas Cepat" : "Ajukan Pindah Kelas ke Koordinator"}
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>

                            {/* Delete / Request Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingSantri(s);
                                setDeleteReason("");
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title={isKoorMusyrif ? "Hapus Santri" : "Ajukan Penghapusan Santri ke Koordinator"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedSantri.map((s, idx) => {
                const siblings = siblingMap.get(s.id);
                return (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-slate-50 transition-colors space-y-2.5"
                    onClick={() => setSelectedSantri(s)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 font-bold mr-1.5">
                          #{(currentPage - 1) * itemsPerPage + idx + 1}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{s.nama}</span>
                        {siblings && siblings.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {siblings.map((sib, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setSelectedSantri(sib.santri)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[10px] font-bold text-purple-700"
                              >
                                <Heart className="w-2.5 h-2.5 text-purple-500 fill-purple-500" />
                                <span>{sib.relationLabel}: {sib.santri.nama.split(" ")[0]} ({sib.santri.kelasLengkap})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono shrink-0 whitespace-nowrap">
                        {s.kelasLengkap}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">NIS / NISN</span>
                        <span className="font-mono font-semibold">{s.nis}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Asal Daerah</span>
                        <span className="font-medium truncate block">{s.kabupaten || "-"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      {s.telpAyah || s.telpIbu ? (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(s.telpAyah || s.telpIbu, s.nama)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hubungi Ortu</span>
                        </button>
                      ) : <span />}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(s)}
                          className="p-2 rounded-xl text-blue-600 bg-blue-50"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferSantri(s);
                            setTransferNewClass(s.kelasLengkap || "1 A");
                            setTransferReason("");
                          }}
                          className="p-2 rounded-xl text-purple-600 bg-purple-50"
                          title="Mutasi"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingSantri(s);
                            setDeleteReason("");
                          }}
                          className="p-2 rounded-xl text-rose-600 bg-rose-50"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredSantri.length === 0 && (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <Users className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold">Tidak ada santri yang sesuai dengan filter pencarian.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTingkat("all");
                    setSelectedClass("all");
                    setFilterStatus("all");
                  }}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors inline-block"
                >
                  Reset Semua Filter
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredSantri.length > itemsPerPage && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredSantri.length)}</strong> dari <strong className="text-slate-800">{filteredSantri.length}</strong> santri
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-2 font-mono text-xs font-bold text-slate-700">
                    <span>{currentPage}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-400">{totalPages}</span>
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* ─── SANTRI DETAIL MODAL POPUP ─── */}
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
              {/* Detail Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black">{selectedSantri.nama}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white font-mono">
                      {selectedSantri.kelasLengkap}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/80 mt-0.5 font-mono">
                    NIS: {selectedSantri.nis} {selectedSantri.nisn && `· NISN: ${selectedSantri.nisn}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSantri(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Saudara Kandung Section */}
                {(() => {
                  const siblings = siblingMap.get(selectedSantri.id);
                  if (!siblings || siblings.length === 0) return null;
                  return (
                    <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                        <Heart className="w-4 h-4 text-purple-600 fill-purple-500" />
                        <span>Saudara Kandung di Mu'allimiin ({siblings.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {siblings.map((sib, i) => (
                          <div 
                            key={i}
                            onClick={() => setSelectedSantri(sib.santri)}
                            className="bg-white p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 transition-all cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 truncate">{sib.santri.nama}</span>
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono">
                                {sib.santri.kelasLengkap}
                              </span>
                            </div>
                            <p className="text-[10px] text-purple-700 font-semibold mt-0.5">
                              {sib.relationLabel}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Grid Informasi Biodata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                    <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> Data Pribadi
                    </p>
                    <div className="space-y-1.5">
                      <div><span className="text-slate-400">Tempat, Tgl Lahir:</span> <span className="font-medium text-slate-800">{selectedSantri.tempatLahir || "-"}, {selectedSantri.tanggalLahir || "-"}</span></div>
                      <div><span className="text-slate-400">Jenis Kelamin:</span> <span className="font-medium text-slate-800">{selectedSantri.jk || "Laki-laki"}</span></div>
                      <div><span className="text-slate-400">Asal Sekolah:</span> <span className="font-medium text-slate-800">{selectedSantri.asalSekolah || "-"}</span></div>
                      <div><span className="text-slate-400">Wali Kelas:</span> <span className="font-medium text-slate-800">{selectedSantri.waliKelas || "-"}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                    <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" /> Domisili & Asal
                    </p>
                    <div className="space-y-1.5">
                      <div><span className="text-slate-400">Kabupaten/Kota:</span> <span className="font-medium text-slate-800">{selectedSantri.kabupaten || "-"}</span></div>
                      <div><span className="text-slate-400">Provinsi:</span> <span className="font-medium text-slate-800">{selectedSantri.provinsi || "-"}</span></div>
                      <div><span className="text-slate-400">Alamat:</span> <span className="font-medium text-slate-800">{selectedSantri.alamat || "-"}</span></div>
                    </div>
                  </div>
                </div>

                {/* Kontak Orang Tua */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5">
                  <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Orang Tua & Kontak
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <p className="font-bold text-slate-800">Ayah: {selectedSantri.namaAyah || "-"}</p>
                      <p className="text-slate-500 text-[11px]">Pekerjaan: {selectedSantri.pekerjaanAyah || "-"}</p>
                      {selectedSantri.telpAyah && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(selectedSantri.telpAyah, selectedSantri.nama)}
                          className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WA: {selectedSantri.telpAyah}</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <p className="font-bold text-slate-800">Ibu: {selectedSantri.namaIbu || "-"}</p>
                      <p className="text-slate-500 text-[11px]">Pekerjaan: {selectedSantri.pekerjaanIbu || "-"}</p>
                      {selectedSantri.telpIbu && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(selectedSantri.telpIbu, selectedSantri.nama)}
                          className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WA: {selectedSantri.telpIbu}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedSantri;
                      setSelectedSantri(null);
                      handleOpenEditForm(s);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isKoorMusyrif ? "Edit Data" : "Ajukan Edit"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedSantri;
                      setSelectedSantri(null);
                      setTransferSantri(s);
                      setTransferNewClass(s.kelasLengkap || "1 A");
                      setTransferReason("");
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isKoorMusyrif ? "Mutasi Kelas" : "Ajukan Mutasi"}</span>
                  </button>

                  {onSelectSantriForIzin && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedSantri;
                        setSelectedSantri(null);
                        onSelectSantriForIzin(s);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Ajukan Izin</span>
                    </button>
                  )}

                  {onSelectSantriForSakit && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedSantri;
                        setSelectedSantri(null);
                        onSelectSantriForSakit(s);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>Catat Sakit</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSantri(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD / EDIT FORM MODAL ─── */}
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
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {isKoorMusyrif 
                      ? (editingSantri ? `Edit Data: ${editingSantri.nama}` : "Tambah Santri Baru")
                      : `Ajukan Perubahan Data: ${editingSantri?.nama}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKoorMusyrif
                      ? "Perubahan langsung tersimpan & sinkron ke Google Sheets"
                      : "Perubahan akan diverifikasi dan di-ACC oleh Koordinator Musyrif"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Notice for Musyrif/Pamong */}
                {!isKoorMusyrif && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Form Pengajuan Permohonan Perubahan Data</span>
                    </div>
                    <p className="text-slate-600">
                      Anda sedang mengajukan permohonan pembaruan data santri ini. Koordinator Musyrif akan menerima tiket permohonan untuk di-ACC sebelum data diperbarui secara permanen.
                    </p>
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Alasan / Catatan Perubahan (Wajib diisi):</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Perubahan nomor WA ayah baru / koreksi nama / alamat"
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        className="w-full text-xs bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Nama Santri *</label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Kelas</label>
                    <select
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white font-mono"
                    >
                      {LIST_ALL_KELAS_FLAT.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">NIS</label>
                    <input
                      type="text"
                      value={formNis}
                      onChange={(e) => setFormNis(e.target.value)}
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">NISN</label>
                    <input
                      type="text"
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value)}
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Kabupaten / Kota</label>
                    <input
                      type="text"
                      value={formKabupaten}
                      onChange={(e) => setFormKabupaten(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Provinsi</label>
                    <input
                      type="text"
                      value={formProvinsi}
                      onChange={(e) => setFormProvinsi(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Nama Ayah</label>
                    <input
                      type="text"
                      value={formNamaAyah}
                      onChange={(e) => setFormNamaAyah(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">No. WA Ayah</label>
                    <input
                      type="text"
                      value={formTelpAyah}
                      onChange={(e) => setFormTelpAyah(e.target.value)}
                      placeholder="081234567890"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Nama Ibu</label>
                    <input
                      type="text"
                      value={formNamaIbu}
                      onChange={(e) => setFormNamaIbu(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">No. WA Ibu</label>
                    <input
                      type="text"
                      value={formTelpIbu}
                      onChange={(e) => setFormTelpIbu(e.target.value)}
                      placeholder="081234567890"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      value={formAlamat}
                      onChange={(e) => setFormAlamat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0C81E4] hover:bg-[#0C4E8C] rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isKoorMusyrif ? (editingSantri ? "Simpan Perubahan" : "Tambahkan Santri") : "Kirim Permohonan"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── QUICK CLASS TRANSFER / MUTASI POPUP ─── */}
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
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isKoorMusyrif ? "Mutasi / Pindah Kelas Santri" : "Ajukan Mutasi / Pindah Kelas"}
                  </h3>
                  <p className="text-xs text-slate-500">{transferSantri.nama}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block font-medium">Kelas Asal</label>
                  <input
                    type="text"
                    disabled
                    value={transferSantri.kelasLengkap}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block font-medium">Pilih Kelas Tujuan Baru</label>
                  <select
                    value={transferNewClass}
                    onChange={(e) => setTransferNewClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:bg-white font-mono font-bold"
                  >
                    {LIST_ALL_KELAS_FLAT.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {!isKoorMusyrif && (
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Alasan Mutasi (Wajib diisi)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Keputusan musyawarah pamong / perbaikan rombel"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferSantri(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClassTransfer}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  {isKoorMusyrif ? "Simpan Mutasi" : "Kirim Pengajuan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DELETE / REQUEST DELETE POPUP ─── */}
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
                  <h3 className="font-bold text-sm text-slate-900">
                    {isKoorMusyrif ? "Konfirmasi Hapus Santri" : "Ajukan Penghapusan Santri"}
                  </h3>
                  <p className="text-xs text-slate-500">{deletingSantri.nama} ({deletingSantri.kelasLengkap})</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  {isKoorMusyrif
                    ? "Apakah Anda yakin ingin menghapus data santri ini? Data akan ditandai terhapus dan disinkronkan ke Google Sheets."
                    : "Ajukan permohonan penghapusan santri ini ke Koordinator Musyrif. Mohon sertakan alasan yang jelas."}
                </p>

                {!isKoorMusyrif && (
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block font-medium">Alasan Penghapusan (Wajib diisi)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Santri sudah mengundurkan diri / mutasi keluar madrasah"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingSantri(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
                >
                  {isKoorMusyrif ? "Ya, Hapus Data" : "Kirim Permohonan Hapus"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── REJECT REQUEST MODAL ─── */}
      <AnimatePresence>
        {rejectingRequest && (
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
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Tolak Permohonan</h3>
                  <p className="text-xs text-slate-500">{rejectingRequest.santriNama}</p>
                </div>
              </div>

              <div className="text-xs space-y-2">
                <label className="text-[11px] text-slate-500 block font-medium">Catatan / Alasan Penolakan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Data belum lengkap / tidak sesuai berkas resmi"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRejectRequest) onRejectRequest(rejectingRequest.id, rejectNotes);
                    setRejectingRequest(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PETA SEBARAN MODAL ─── */}
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
