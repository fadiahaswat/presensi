import React, { useState, useMemo, useEffect } from "react";
import {
  X, Search, Filter, GraduationCap, Users, Phone, Mail, MapPin, 
  Download, Eye, CheckCircle2, ChevronRight, ChevronLeft, Building2,
  Calendar, BookOpen, ShieldCheck, UserCheck, MessageCircle, ExternalLink,
  Layers, Copy, ArrowUpDown, Lock, Unlock, Sparkles, Check
} from "lucide-react";
import { 
  ALL_SANTRI_DATA, SantriData, getSantriStats, normalizeClassName, 
  LIST_ALL_KELAS_GROUPED, LIST_ALL_KELAS_FLAT 
} from "../data/santriData";
import { motion, AnimatePresence } from "motion/react";
import { modalContentVariants, triggerHaptic } from "../utils/animations";

interface DataSantriModalProps {
  onClose: () => void;
  authUser?: any;
  musyrifList?: any[];
  onSelectSantriForIzin?: (santri: SantriData) => void;
  onSelectSantriForSakit?: (santri: SantriData) => void;
  isPage?: boolean;
}

export function DataSantriModal({
  onClose,
  authUser,
  musyrifList = [],
  onSelectSantriForIzin,
  onSelectSantriForSakit,
  isPage = false
}: DataSantriModalProps) {
  // Detect if logged in as Musyrif and find assigned class
  const isMusyrifRole = authUser?.role === "musyrif";
  const myMusyrif = useMemo(() => {
    if (!authUser) return null;
    return musyrifList.find(m => m.id === (authUser.musyrifId || authUser.id)) || null;
  }, [authUser, musyrifList]);

  const defaultMusyrifClass = useMemo(() => {
    if (!myMusyrif || !myMusyrif.kelas) return null;
    return normalizeClassName(myMusyrif.kelas);
  }, [myMusyrif]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("all");
  
  // Exact class filter (e.g. "1 A", "1 Lower A", "5 Upper A", "6 Internasional", or "all")
  const [selectedClass, setSelectedClass] = useState<string>(
    defaultMusyrifClass || "all"
  );
  const [isScopedMyClass, setIsScopedMyClass] = useState<boolean>(!!defaultMusyrifClass);

  const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const stats = useMemo(() => getSantriStats(), []);

  // Filtered dataset
  const filteredSantri = useMemo(() => {
    let result = ALL_SANTRI_DATA;

    if (selectedClass !== "all") {
      result = result.filter(s => s.kelasLengkap === selectedClass || s.kelasLengkap.toLowerCase() === selectedClass.toLowerCase());
    } else if (selectedTingkat !== "all") {
      result = result.filter(s => s.tingkat === selectedTingkat);
    }

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
        s.alamat.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedClass, selectedTingkat, searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClass, selectedTingkat]);

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

  const handleExportCSV = () => {
    const headers = [
      "No", "Tingkat", "Jenjang", "Kelas", "NIS", "NISN", "Nama Santri", "JK", 
      "Tempat Lahir", "Tgl Lahir", "Alamat", "Kabupaten", "Provinsi", "Asal Sekolah",
      "Nama Ayah", "Pekerjaan Ayah", "Telp Ayah", "Nama Ibu", "Telp Ibu", "Wali Kelas"
    ];
    
    const rows = filteredSantri.map((s, idx) => [
      idx + 1,
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
      `"${s.waliKelas}"`
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

  const toggleScopeMyClass = () => {
    triggerHaptic();
    if (isScopedMyClass) {
      // Switch to view all
      setSelectedClass("all");
      setSelectedTingkat("all");
      setIsScopedMyClass(false);
    } else if (defaultMusyrifClass) {
      // Switch back to my class
      setSelectedClass(defaultMusyrifClass);
      setSelectedTingkat("all");
      setIsScopedMyClass(true);
    }
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
                  : "Tahun Pelajaran 2026/2027 • 1.499 Santri Terdaftar"}
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
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Database Induk Santri</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencarian, profil lengkap, dan data kontak 1.499 santri Madrasah Mu'allimiin (Kelas 1 - Kelas 6)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {defaultMusyrifClass && (
              <button
                onClick={toggleScopeMyClass}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 ${
                  isScopedMyClass 
                    ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isScopedMyClass ? "Tampilkan Semua Kelas (1-6)" : `Fokus Kelas Saya (${defaultMusyrifClass})`}</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV ({filteredSantri.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Musyrif Scope Banner */}
      {defaultMusyrifClass && isScopedMyClass && (
        <div className="mx-4 sm:mx-0 mb-2 p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Menampilkan santri binaan kelas Anda: <b>Kelas {defaultMusyrifClass}</b> ({filteredSantri.length} Santri)
            </span>
          </div>
          <button
            onClick={toggleScopeMyClass}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 underline shrink-0"
          >
            Buka Semua Kelas (1.499 Santri)
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 px-4 pt-1 pb-2 sm:px-0">
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Santri</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.total.toLocaleString("id-ID")}</p>
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
                const val = e.target.value;
                setSelectedClass(val);
                setIsScopedMyClass(val === defaultMusyrifClass);
              }}
              className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-500/50 dark:border-emerald-600 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-xs"
            >
              <option value="all">-- Semua Kelas (1.499 Santri) --</option>
              {LIST_ALL_KELAS_GROUPED.map((grp) => (
                <optgroup key={grp.tingkat} label={grp.label}>
                  {grp.kelas.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls} {defaultMusyrifClass === cls ? "★ (Kelas Anda)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Tingkat Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => { setSelectedClass("all"); setSelectedTingkat("all"); setIsScopedMyClass(false); }}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              selectedClass === "all" && selectedTingkat === "all"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Semua (1-6)
          </button>
          {[
            { val: "Kelas 1", label: "Kelas 1 (VII)" },
            { val: "Kelas 2", label: "Kelas 2 (VIII)" },
            { val: "Kelas 3", label: "Kelas 3 (IX)" },
            { val: "Kelas 4", label: "Kelas 4 (X)" },
            { val: "Kelas 5", label: "Kelas 5 (XI)" },
            { val: "Kelas 6", label: "Kelas 6 (XII)" },
          ].map(t => (
            <button
              key={t.val}
              onClick={() => {
                setSelectedTingkat(selectedTingkat === t.val ? "all" : t.val);
                setSelectedClass("all");
                setIsScopedMyClass(false);
              }}
              className={`px-2.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                selectedTingkat === t.val && selectedClass === "all"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List / Table */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-0 pb-4">
        {paginatedSantri.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada santri yang sesuai</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset pilihan kelas.</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedClass("all"); setSelectedTingkat("all"); setIsScopedMyClass(false); }}
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
                    <th className="py-3 px-3 sm:px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {paginatedSantri.map((s, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSantri(s)}
                        className="hover:bg-emerald-50/50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
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
                          </div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {s.kelasLengkap}
                          </span>
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

                <div className="flex items-center gap-2">
                  {onSelectSantriForSakit && (
                    <button
                      onClick={() => {
                        const s = selectedSantri;
                        setSelectedSantri(null);
                        onClose();
                        onSelectSantriForSakit(s);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      Catat Sakit
                    </button>
                  )}
                  {onSelectSantriForIzin && (
                    <button
                      onClick={() => {
                        const s = selectedSantri;
                        setSelectedSantri(null);
                        onClose();
                        onSelectSantriForIzin(s);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      Ajukan Izin
                    </button>
                  )}
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
