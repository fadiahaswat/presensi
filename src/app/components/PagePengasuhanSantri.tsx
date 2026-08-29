import React, { useState, useMemo, useRef } from "react";
import { 
  X, Plus, Stethoscope, HeartHandshake, Car, Building2, Home, CheckCircle2, 
  Trash2, AlertCircle, Search, Filter, Share2, Calendar, User, Phone,
  ChevronLeft, Sparkles, Send, Edit3, Camera, Upload, Eye, Award,
  Clock, MapPin, FileText, Check, AlertTriangle, Layers, Info, ArrowLeft,
  Users, CheckSquare, Square, RefreshCw, ShieldCheck, Heart, ShieldAlert,
  ChevronRight, BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";
import { searchSantri, getSantriForMusyrif, SantriData, ALL_SANTRI_DATA } from "../data/santriData";
import { appAlert, appConfirm } from "../utils/customDialog";
import { compressAndWatermarkImage } from "../utils/imageCompressor";
import { 
  PengasuhanKhususRecord, 
  KategoriPengasuhan, 
  KATEGORI_PENGASUHAN_CONFIG 
} from "../types/pengasuhanKhusus";

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
  kelas: string;
  tingkat?: string;
  role?: string;
  email?: string;
}

interface PagePengasuhanSantriProps {
  onBack: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  santriList?: SantriData[];
  pengasuhanList: PengasuhanKhususRecord[];
  onSavePengasuhan: (record: PengasuhanKhususRecord) => void;
  onSaveBatchPengasuhan?: (records: PengasuhanKhususRecord[]) => void;
  onDeletePengasuhan?: (id: string) => void;
  initialMusyrifId?: string;
}

export function PagePengasuhanSantri({
  onBack,
  authUser,
  musyrifList,
  santriList,
  pengasuhanList = [],
  onSavePengasuhan,
  onSaveBatchPengasuhan,
  onDeletePengasuhan,
  initialMusyrifId
}: PagePengasuhanSantriProps) {
  const isKoor = authUser?.role === "koordinator_musyrif";
  const isPamong = authUser?.role === "pamong";
  const isMusyrif = authUser?.role === "musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isScopedRole = isPamong || isMusyrif || isKoorGedung;

  const [activeTab, setActiveTab] = useState<"riwayat" | "catat">("riwayat");
  const [filterAsrama, setFilterAsrama] = useState<string>(isScopedRole && authUser?.asrama ? authUser.asrama : "all");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Form States
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(() => {
    if (initialMusyrifId) return initialMusyrifId;
    if (authUser?.musyrifId) return authUser.musyrifId;
    if (authUser?.id && musyrifList.some(m => m.id === authUser.id)) return authUser.id;
    return musyrifList[0]?.id || "";
  });

  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [waktu, setWaktu] = useState<string>(format(new Date(), "HH:mm"));
  const [kategori, setKategori] = useState<KategoriPengasuhan>("antar_pku_rs");
  
  // Multi-Santri Selection State
  const [selectedSantriList, setSelectedSantriList] = useState<SantriData[]>([]);
  const [santriSearch, setSantriSearch] = useState("");
  const [manualSantriInput, setManualSantriInput] = useState("");

  const [lokasiTujuan, setLokasiTujuan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentMusyrif = useMemo(() => {
    return musyrifList.find(m => m.id === selectedMusyrifId) || musyrifList[0];
  }, [musyrifList, selectedMusyrifId]);

  // Santri search / candidate results
  const santriCandidates = useMemo(() => {
    const rawList = santriList && santriList.length > 0 ? santriList : ALL_SANTRI_DATA;
    if (!santriSearch.trim()) {
      if (currentMusyrif) {
        return getSantriForMusyrif(currentMusyrif.name, currentMusyrif.asrama, currentMusyrif.kamar).slice(0, 15);
      }
      return rawList.slice(0, 15);
    }
    return searchSantri(santriSearch).slice(0, 20);
  }, [santriSearch, currentMusyrif, santriList]);

  // Toggle santri in selection
  const handleToggleSantri = (s: SantriData) => {
    triggerHaptic("selection");
    setSelectedSantriList(prev => {
      const exists = prev.some(item => item.id === s.id || (item.nama.toLowerCase() === s.nama.toLowerCase() && item.kelas === s.kelas));
      if (exists) {
        return prev.filter(item => item.id !== s.id && !(item.nama.toLowerCase() === s.nama.toLowerCase() && item.kelas === s.kelas));
      } else {
        return [...prev, s];
      }
    });
  };

  // Add manual santri
  const handleAddManualSantri = () => {
    if (!manualSantriInput.trim()) return;
    const parts = manualSantriInput.split(",");
    const newItems: SantriData[] = [];
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) {
        newItems.push({
          id: "manual_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          nama: trimmed,
          kelas: currentMusyrif?.kelas || "Kelas Asrama",
          asrama: currentMusyrif?.asrama || "Asrama",
          kamar: currentMusyrif?.kamar || "Kamar",
          tingkat: "1"
        });
      }
    });
    setSelectedSantriList(prev => [...prev, ...newItems]);
    setManualSantriInput("");
    triggerHaptic("selection");
  };

  // Filtered Pengasuhan List
  const filteredList = useMemo(() => {
    return pengasuhanList
      .filter(item => {
        if (filterAsrama !== "all" && item.asrama !== filterAsrama) return false;
        if (filterKategori !== "all" && item.kategori !== filterKategori) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSantri = item.namaSantri?.toLowerCase().includes(q);
          const matchMusyrif = item.musyrifName?.toLowerCase().includes(q);
          const matchLokasi = item.lokasiTujuan?.toLowerCase().includes(q);
          const matchCatatan = item.catatan?.toLowerCase().includes(q);
          if (!matchSantri && !matchMusyrif && !matchLokasi && !matchCatatan) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date + b.waktu).localeCompare(a.date + a.waktu));
  }, [pengasuhanList, filterAsrama, filterKategori, searchQuery]);

  // Clean photo compression without watermark
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      const compressedBase64 = await compressAndWatermarkImage(file, { maxDim: 720, quality: 0.75 });
      if (compressedBase64) {
        setPhotoUrl(compressedBase64);
        triggerHaptic("success");
      } else {
        appAlert("Gagal memproses foto. Silakan coba lagi.", "Peringatan", "warning");
      }
    } catch (err: any) {
      appAlert(`Error upload foto: ${err.message || err}`, "Gagal", "error");
    } finally {
      setIsCompressingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSantriList.length === 0) {
      appAlert("Pilih minimal 1 santri yang didampingi atau dibina.", "Pilih Santri", "warning");
      return;
    }

    if (!lokasiTujuan.trim()) {
      appAlert("Lokasi tujuan / tempat bimbingan wajib diisi.", "Form Belum Lengkap", "warning");
      return;
    }

    if (!catatan.trim()) {
      appAlert("Deskripsi / catatan penugasan wajib diisi.", "Form Belum Lengkap", "warning");
      return;
    }

    setIsSubmitting(true);
    const config = KATEGORI_PENGASUHAN_CONFIG[kategori];
    const nowIso = new Date().toISOString();

    const newRecords: PengasuhanKhususRecord[] = selectedSantriList.map(s => ({
      id: "pengasuhan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
      musyrifId: currentMusyrif?.id || authUser?.musyrifId || "m_unknown",
      musyrifName: currentMusyrif?.name || authUser?.name || "Musyrif",
      asrama: currentMusyrif?.asrama || authUser?.asrama || "Asrama 1",
      kamar: currentMusyrif?.kamar || "Kamar",
      date,
      waktu,
      kategori,
      santriId: s.id,
      nisn: s.nisn,
      namaSantri: s.nama,
      kelasSantri: s.kelas,
      lokasiTujuan: lokasiTujuan.trim(),
      catatan: catatan.trim(),
      photoUrl: photoUrl || undefined,
      poin: config.defaultPoints,
      createdAt: nowIso,
      statusSantriSakitSync: kategori === "antar_pku_rs"
    }));

    if (onSaveBatchPengasuhan && newRecords.length > 1) {
      onSaveBatchPengasuhan(newRecords);
    } else {
      newRecords.forEach(rec => onSavePengasuhan(rec));
    }

    triggerHaptic("success");

    // Reset Form
    setSelectedSantriList([]);
    setSantriSearch("");
    setManualSantriInput("");
    setLokasiTujuan("");
    setCatatan("");
    setPhotoUrl("");
    setActiveTab("riwayat");
    setIsSubmitting(false);

    const totalPoinGained = config.defaultPoints * newRecords.length;
    appAlert(
      `Tugas pengasuhan untuk ${newRecords.length} santri berhasil disimpan dan disinkronkan ke Logbook, Sakit, Izin Keluar & Pembinaan (+${totalPoinGained} Poin)!`,
      "Berhasil Tersimpan",
      "success"
    );
  };

  const asramaList = useMemo(() => {
    const set = new Set<string>();
    musyrifList.forEach(m => { if (m.asrama) set.add(m.asrama); });
    return Array.from(set);
  }, [musyrifList]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalPoin = 0;
    let pkuCount = 0;
    let binaCount = 0;
    let lainCount = 0;

    pengasuhanList.forEach(p => {
      totalPoin += (p.poin || (p.kategori === "antar_pku_rs" ? 10 : 5));
      if (p.kategori === "antar_pku_rs") pkuCount++;
      else if (p.kategori === "bina_santri") binaCount++;
      else lainCount++;
    });

    return { totalPoin, pkuCount, binaCount, lainCount, totalRecords: pengasuhanList.length };
  }, [pengasuhanList]);

  return (
    <div className="space-y-4 w-full text-slate-800 pb-20">
      {/* ── TOP HEADER CARD (SYAMSA BRAND UI) ── */}
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
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>Tugas Pengasuhan & RS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold border border-rose-200 font-mono">
                Pilar 2
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Madrasah Mu'allimin · Layanan rujukan RS/PKU, bimbingan santri & pengantaran resmi
            </p>
          </div>
        </div>

        {/* Tab Switcher in Brand Header */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("riwayat");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
              activeTab === "riwayat"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs font-black"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Riwayat ({filteredList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(activeTab === "catat" ? "riwayat" : "catat");
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-600/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === "catat" ? "Tutup Form" : "+ Catat Tugas"}</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED STATS & FILTER BAR (SYAMSA BRAND UI) ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3">
        {/* Metric Chips / 4 Pilar Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-rose-700 font-bold block mb-0.5">Rujukan RS/PKU</span>
            <p className="text-xl sm:text-2xl font-black text-rose-950 font-mono">{stats.pkuCount}</p>
            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">+10 Pts / Santri</span>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-indigo-700 font-bold block mb-0.5">Bimbingan Santri</span>
            <p className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">{stats.binaCount}</p>
            <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">+5 Pts / Santri</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-amber-700 font-bold block mb-0.5">Pengantaran Lain</span>
            <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{stats.lainCount}</p>
            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">+5 Pts / Santri</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-emerald-700 font-bold block mb-0.5">Total Poin Pilar 2</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">+{stats.totalPoin}</p>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">{stats.totalRecords} Penugasan</span>
          </div>
        </div>

        {/* Filter Inputs & Search */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri, musyrif, lokasi, atau diagnosa..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterKategori}
              onChange={e => setFilterKategori(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="antar_pku_rs">Rujukan PKU / RS (+10 Pts)</option>
              <option value="bina_santri">Bimbingan Santri (+5 Pts)</option>
              <option value="pengantaran_lain">Pengantaran Lain (+5 Pts)</option>
            </select>

            <select
              value={filterAsrama}
              onChange={e => setFilterAsrama(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Asrama</option>
              {asramaList.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <AnimatePresence mode="wait">
        {activeTab === "catat" ? (
          /* FORM CATAT TUGAS PENGASUHAN (BRAND UI WITH MULTI-SANTRI) */
          <motion.form
            key="form-catat"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Info Box */}
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl sm:rounded-3xl p-4 flex items-start gap-3 text-rose-950 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-rose-900">Pencatatan Tugas Terintegrasi 4 Pilar</p>
                <p className="text-rose-800 leading-relaxed text-[11px]">
                  Tugas rujukan PKU/RS otomatis disinkronkan ke <b>Logbook (Cek Sakit)</b>, <b>Pantauan Santri Sakit</b>, dan <b>Izin Keluar Berobat</b>. Sesi bimbingan santri otomatis tercatat di <b>Lembar Pembinaan</b>.
                </p>
              </div>
            </div>

            {/* 1. Pilih Kategori */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                1. Kategori Tugas Pengasuhan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.keys(KATEGORI_PENGASUHAN_CONFIG) as KategoriPengasuhan[]).map(catKey => {
                  const cfg = KATEGORI_PENGASUHAN_CONFIG[catKey];
                  const isSelected = kategori === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setKategori(catKey);
                      }}
                      className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 shadow-xs"
                          : "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.badgeColor}`}>
                          {catKey === "antar_pku_rs" ? (
                            <Stethoscope className="w-4 h-4" />
                          ) : catKey === "bina_santri" ? (
                            <HeartHandshake className="w-4 h-4" />
                          ) : (
                            <Car className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                          +{cfg.defaultPoints} Pts / Santri
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{cfg.shortLabel}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{cfg.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Pilih Banyak Santri */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    2. Santri yang Didampingi / Dibina <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pilih satu atau banyak santri sekaligus dalam 1 kegiatan penugasan.
                  </p>
                </div>

                {selectedSantriList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-lg font-mono">
                      {selectedSantriList.length} Santri Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSantriList([])}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Chips Santri Terpilih */}
              {selectedSantriList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 max-h-32 overflow-y-auto">
                  {selectedSantriList.map(s => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-300 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{s.nama} ({s.kelas})</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSantri(s)}
                        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search Santri */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={santriSearch}
                  onChange={e => setSantriSearch(e.target.value)}
                  placeholder="Ketik nama santri, kelas, atau NISN..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Daftar Checklist Santri */}
              <div className="border border-slate-200 rounded-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                {santriCandidates.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Santri tidak ditemukan dengan kata kunci "{santriSearch}".
                  </div>
                ) : (
                  santriCandidates.map(s => {
                    const isSelected = selectedSantriList.some(item => item.id === s.id || (item.nama.toLowerCase() === s.nama.toLowerCase() && item.kelas === s.kelas));
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSantri(s)}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected ? "bg-rose-50/70 font-bold" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? "bg-rose-600 border-rose-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className={`text-xs ${isSelected ? "text-rose-950 font-bold" : "text-slate-800"}`}>
                              {s.nama}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Kelas {s.kelas} • {s.asrama || currentMusyrif?.asrama || "Asrama"} • Kmr {s.kamar || "-"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          isSelected ? "bg-rose-200 text-rose-900" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isSelected ? "Terpilih" : "+ Pilih"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Tambah Manual Santri Sekaligus */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={manualSantriInput}
                  onChange={e => setManualSantriInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddManualSantri(); } }}
                  placeholder="Atau ketik nama santri manual (pisahkan dengan koma jika banyak)..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleAddManualSantri}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
                >
                  Tambah
                </button>
              </div>
            </div>

            {/* 3. Detail Waktu, Pelapor & Lokasi */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                3. Detail Pelapor, Waktu & Lokasi Tujuan <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Musyrif Pelapor</label>
                  <select
                    value={selectedMusyrifId}
                    onChange={e => setSelectedMusyrifId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {musyrifList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.asrama || "Asrama"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Waktu</label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="time"
                      value={waktu}
                      onChange={e => setWaktu(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lokasi / Instansi / Ruang Tujuan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={lokasiTujuan}
                    onChange={e => setLokasiTujuan(e.target.value)}
                    placeholder={KATEGORI_PENGASUHAN_CONFIG[kategori].placeholderTujuan}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Deskripsi / Diagnosa / Hasil Pendampingan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder={KATEGORI_PENGASUHAN_CONFIG[kategori].placeholderCatatan}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* 4. Bukti Foto (Bersih Tanpa Watermark) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                4. Bukti Foto Kegiatan (Bersih Tanpa Watermark)
              </label>

              {photoUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group max-w-sm">
                  <img src={photoUrl} alt="Bukti Foto" className="w-full h-44 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                    <span className="text-[10px] text-white/90 bg-rose-600/90 px-2 py-0.5 rounded-md font-medium">
                      Foto Valid
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(photoUrl)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isCompressingPhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 border border-dashed border-rose-300 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-rose-600" />
                    {isCompressingPhoto ? "Memproses Foto..." : "Kamera Langsung"}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingPhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    Pilih Galeri
                  </button>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("riwayat")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCompressingPhoto || selectedSantriList.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm shadow-rose-600/20 transition-all disabled:opacity-50 active:scale-95"
              >
                <Send className="w-4 h-4" />
                {isSubmitting
                  ? "Menyimpan Data..."
                  : `Simpan Tugas (${selectedSantriList.length} Santri) · +${(KATEGORI_PENGASUHAN_CONFIG[kategori].defaultPoints * Math.max(1, selectedSantriList.length))} Poin`}
              </button>
            </div>
          </motion.form>
        ) : (
          /* RIWAYAT DAFTAR PENUGASAN (BRAND UI) */
          <motion.div
            key="riwayat-daftar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredList.length === 0 ? (
              <div className="text-center py-14 px-4 border border-dashed border-slate-200 rounded-2xl sm:rounded-3xl bg-white space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Catatan Tugas Pengasuhan</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Klik tombol <b>"+ Catat Tugas"</b> di kanan atas untuk mendokumentasikan rujukan PKU/RS atau bimbingan santri.
                </p>
              </div>
            ) : (
              filteredList.map(item => {
                const cfg = KATEGORI_PENGASUHAN_CONFIG[item.kategori] || KATEGORI_PENGASUHAN_CONFIG.antar_pku_rs;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Photo Thumbnail or Category Icon */}
                      {item.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(item.photoUrl!)}
                          className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex-shrink-0 relative group shadow-2xs"
                        >
                          <img src={item.photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs ${cfg.badgeColor}`}>
                          {item.kategori === "antar_pku_rs" ? (
                            <Stethoscope className="w-5 h-5" />
                          ) : item.kategori === "bina_santri" ? (
                            <HeartHandshake className="w-5 h-5" />
                          ) : (
                            <Car className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.badgeColor}`}>
                            {cfg.shortLabel}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                            +{item.poin || cfg.defaultPoints} Poin
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.date} • {item.waktu}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {item.namaSantri} {item.kelasSantri ? `(Kelas ${item.kelasSantri})` : ""}
                        </h3>

                        <p className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-700">{item.lokasiTujuan}</span>
                        </p>

                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {item.catatan}
                        </p>

                        <p className="text-[10px] text-slate-400 pt-0.5">
                          Musyrif: <strong className="text-slate-600">{item.musyrifName}</strong> ({item.asrama})
                        </p>
                      </div>
                    </div>

                    {/* Delete Action */}
                    {onDeletePengasuhan && (isKoor || isPamong || authUser?.id === item.musyrifId) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await appConfirm("Hapus catatan tugas pengasuhan ini?", "Konfirmasi Hapus");
                          if (ok) onDeletePengasuhan(item.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative max-w-xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden p-1 shadow-2xl">
              <img src={previewPhoto} alt="Bukti Foto" className="max-h-[80vh] w-auto object-contain rounded-2xl" />
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
