import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  X, Plus, Stethoscope, HeartHandshake, Car, Building2, Home, CheckCircle2, 
  Trash2, AlertCircle, Search, Filter, Share2, Calendar, User, Phone,
  ChevronLeft, Sparkles, Send, Edit3, Camera, Upload, Eye, Award,
  Clock, MapPin, FileText, Check, AlertTriangle, Layers, Info
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { searchSantri, getSantriForMusyrif, SantriData } from "../data/santriData";
import { appAlert, appConfirm } from "../utils/customDialog";
import { getPamongAssignedAsramas } from "../utils/roleAccessUtils";
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

interface PengasuhanKhususModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  santriList?: SantriData[];
  pengasuhanList: PengasuhanKhususRecord[];
  onSavePengasuhan: (record: PengasuhanKhususRecord) => void;
  onDeletePengasuhan?: (id: string) => void;
  isPage?: boolean;
  initialMusyrifId?: string;
}

export function PengasuhanKhususModal({
  onClose,
  authUser,
  musyrifList,
  santriList,
  pengasuhanList = [],
  onSavePengasuhan,
  onDeletePengasuhan,
  isPage = false,
  initialMusyrifId
}: PengasuhanKhususModalProps) {
  const isKoor = authUser?.role === "koordinator_musyrif";
  const isPamong = authUser?.role === "pamong";
  const isMusyrif = authUser?.role === "musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isScopedRole = isPamong || isMusyrif || isKoorGedung;

  const [showAddForm, setShowAddForm] = useState(false);
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
  
  // Santri selection
  const [santriSearch, setSantriSearch] = useState("");
  const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
  const [customNamaSantri, setCustomNamaSantri] = useState("");
  const [customKelasSantri, setCustomKelasSantri] = useState("");

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

  // Santri search results
  const santriResults = useMemo(() => {
    if (!santriSearch.trim() || santriSearch.length < 2) {
      if (currentMusyrif) {
        return getSantriForMusyrif(currentMusyrif.name, currentMusyrif.asrama, currentMusyrif.kamar).slice(0, 8);
      }
      return [];
    }
    return searchSantri(santriSearch).slice(0, 10);
  }, [santriSearch, currentMusyrif]);

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

  // Handle Photo Upload / Capture without Watermark
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      // Clean compression without watermark
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

  const handleSelectSantriOption = (s: SantriData) => {
    setSelectedSantri(s);
    setCustomNamaSantri(s.nama);
    setCustomKelasSantri(s.kelas);
    setSantriSearch("");
    triggerHaptic("selection");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNama = selectedSantri ? selectedSantri.nama : customNamaSantri.trim();
    const finalKelas = selectedSantri ? selectedSantri.kelas : customKelasSantri.trim();

    if (!finalNama) {
      appAlert("Nama santri wajib diisi atau dipilih dari daftar.", "Form Belum Lengkap", "warning");
      return;
    }

    if (!lokasiTujuan.trim()) {
      appAlert("Lokasi tujuan / ruang penugasan wajib diisi.", "Form Belum Lengkap", "warning");
      return;
    }

    if (!catatan.trim()) {
      appAlert("Deskripsi / catatan penugasan wajib diisi.", "Form Belum Lengkap", "warning");
      return;
    }

    setIsSubmitting(true);
    const config = KATEGORI_PENGASUHAN_CONFIG[kategori];
    const newRecord: PengasuhanKhususRecord = {
      id: "pengasuhan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      musyrifId: currentMusyrif?.id || authUser?.musyrifId || "m_unknown",
      musyrifName: currentMusyrif?.name || authUser?.name || "Musyrif",
      asrama: currentMusyrif?.asrama || authUser?.asrama || "Asrama 1",
      kamar: currentMusyrif?.kamar || "Kamar",
      date,
      waktu,
      kategori,
      santriId: selectedSantri?.id,
      nisn: selectedSantri?.nisn,
      namaSantri: finalNama,
      kelasSantri: finalKelas,
      lokasiTujuan: lokasiTujuan.trim(),
      catatan: catatan.trim(),
      photoUrl: photoUrl || undefined,
      poin: config.defaultPoints,
      createdAt: new Date().toISOString(),
      statusSantriSakitSync: kategori === "antar_pku_rs"
    };

    onSavePengasuhan(newRecord);
    triggerHaptic("success");

    // Reset Form
    setSelectedSantri(null);
    setCustomNamaSantri("");
    setCustomKelasSantri("");
    setSantriSearch("");
    setLokasiTujuan("");
    setCatatan("");
    setPhotoUrl("");
    setShowAddForm(false);
    setIsSubmitting(false);

    appAlert(
      `Tugas pengasuhan berhasil dicatat! Musyrif mendapatkan +${config.defaultPoints} Poin di Pilar Logbook.`,
      "Berhasil Dicatat",
      "success"
    );
  };

  const asramaList = useMemo(() => {
    const set = new Set<string>();
    musyrifList.forEach(m => { if (m.asrama) set.add(m.asrama); });
    return Array.from(set);
  }, [musyrifList]);

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={isPage ? "w-full min-h-screen bg-slate-50" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"}
    >
      <motion.div
        variants={modalContentVariants}
        className={`w-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 ${
          isPage ? "max-w-5xl mx-auto my-4 min-h-[90vh]" : "max-w-3xl max-h-[92vh]"
        }`}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Tugas Pengasuhan & Bimbingan Santri
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 font-medium">
                  Pilar 2
                </span>
              </h2>
              <p className="text-xs text-emerald-100/80">
                Laporan mengantar ke PKU/RS & pembinaan santri dengan akumulasi poin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => {
                triggerHaptic("selection");
                setShowAddForm(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                showAddForm
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-white text-emerald-800 hover:bg-emerald-50 shadow-emerald-900/20"
              }`}
            >
              {showAddForm ? (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  Lihat Riwayat
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Catat Tugas
                </>
              )}
            </button>

            {!isPage && (
              <button
                onClick={() => {
                  triggerHaptic("tap");
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <AnimatePresence mode="wait">
            {showAddForm ? (
              /* FORM PENCATATAN */
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Info Card */}
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex items-start gap-3 text-emerald-900 text-xs">
                  <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-950">Petunjuk Pelaporan Tugas Pengasuhan</p>
                    <p className="text-emerald-800 leading-relaxed">
                      Catat tugas khusus seperti mendampingi santri ke <b>RS/PKU (+10 Poin)</b>, <b>Bimbingan & Konseling Santri (+5 Poin)</b>, atau pengantaran resmi lainnya. Lampirkan foto asli tanpa watermark untuk validasi.
                    </p>
                  </div>
                </div>

                {/* Pilih Kategori Tugas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Kategori Tugas Pengasuhan <span className="text-rose-500">*</span>
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
                          className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 relative ${
                            isSelected
                              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-sm"
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
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              +{cfg.defaultPoints} Poin
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

                {/* Pilih Musyrif, Tanggal & Waktu */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Musyrif Pelapor</label>
                    <select
                      value={selectedMusyrifId}
                      onChange={e => {
                        setSelectedMusyrifId(e.target.value);
                        setSelectedSantri(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {musyrifList.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.asrama || "Asrama"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Waktu</label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="time"
                        value={waktu}
                        onChange={e => setWaktu(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pilih / Cari Santri */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Santri yang Didampingi / Dibina <span className="text-rose-500">*</span>
                  </label>

                  {selectedSantri ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                          {selectedSantri.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedSantri.nama}</p>
                          <p className="text-[11px] text-slate-500">
                            Kelas {selectedSantri.kelas} • {selectedSantri.asrama || currentMusyrif?.asrama}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSantri(null);
                          setCustomNamaSantri("");
                          setCustomKelasSantri("");
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={santriSearch}
                          onChange={e => setSantriSearch(e.target.value)}
                          placeholder="Ketik nama atau NISN santri..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Dropdown Hasil Pencarian */}
                      {santriResults.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {santriResults.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectSantriOption(s)}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{s.nama}</p>
                                <p className="text-[10px] text-slate-500">Kelas {s.kelas} • {s.asrama || "-"}</p>
                              </div>
                              <span className="text-[10px] text-emerald-700 font-medium px-2 py-0.5 bg-emerald-100 rounded-md">
                                Pilih
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Opsi Ketik Manual jika tidak ada di database */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          value={customNamaSantri}
                          onChange={e => setCustomNamaSantri(e.target.value)}
                          placeholder="Atau ketik nama santri manual..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          value={customKelasSantri}
                          onChange={e => setCustomKelasSantri(e.target.value)}
                          placeholder="Kelas santri (contoh: 2A, 5C)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lokasi / Instansi Tujuan */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lokasi / Instansi / Tempat Penugasan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={lokasiTujuan}
                      onChange={e => setLokasiTujuan(e.target.value)}
                      placeholder={KATEGORI_PENGASUHAN_CONFIG[kategori].placeholderTujuan}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Deskripsi & Catatan */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Deskripsi / Hasil Bimbingan / Catatan Dokter <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder={KATEGORI_PENGASUHAN_CONFIG[kategori].placeholderCatatan}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Bukti Foto (Bersih Tanpa Watermark) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Bukti Foto Kegiatan (Bersih Tanpa Watermark)
                  </label>

                  {photoUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group max-w-xs">
                      <img src={photoUrl} alt="Bukti Foto" className="w-full h-44 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                        <span className="text-[10px] text-white/90 bg-emerald-600/80 px-2 py-0.5 rounded-md font-medium">
                          Foto Siap
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(photoUrl)}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoUrl("")}
                            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isCompressingPhoto}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 border border-dashed border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 text-emerald-600" />
                        {isCompressingPhoto ? "Memproses Foto..." : "Kamera Langsung"}
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingPhoto}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        Pilih dari Galeri
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

                {/* SUBMIT BUTTON */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isCompressingPhoto}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? "Menyimpan..." : `Simpan Tugas (+${KATEGORI_PENGASUHAN_CONFIG[kategori].defaultPoints} Poin)`}
                  </button>
                </div>
              </motion.form>
            ) : (
              /* LIST RIWAYAT PENGASUHAN KHUSUS */
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* FILTER & SEARCH */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari santri, musyrif, atau lokasi..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterKategori}
                      onChange={e => setFilterKategori(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
                    >
                      <option value="all">Semua Kategori</option>
                      <option value="antar_pku_rs">Rujukan PKU / RS</option>
                      <option value="bina_santri">Bimbingan Santri</option>
                      <option value="pengantaran_lain">Pengantaran Lain</option>
                    </select>

                    <select
                      value={filterAsrama}
                      onChange={e => setFilterAsrama(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
                    >
                      <option value="all">Semua Asrama</option>
                      {asramaList.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* STATS SUMMARY */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-rose-50 border border-rose-200/60 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Rujukan Medis / RS</p>
                    <p className="text-lg font-extrabold text-rose-950 mt-0.5">
                      {pengasuhanList.filter(p => p.kategori === "antar_pku_rs").length}
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200/60 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Bimbingan Santri</p>
                    <p className="text-lg font-extrabold text-indigo-950 mt-0.5">
                      {pengasuhanList.filter(p => p.kategori === "bina_santri").length}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pengantaran Lain</p>
                    <p className="text-lg font-extrabold text-amber-950 mt-0.5">
                      {pengasuhanList.filter(p => p.kategori === "pengantaran_lain").length}
                    </p>
                  </div>
                </div>

                {/* LIST ITEMS */}
                {filteredList.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Tugas Pengasuhan</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Klik tombol <b>"Catat Tugas"</b> di kanan atas untuk mendokumentasikan rujukan PKU/RS atau bimbingan santri.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredList.map(item => {
                      const cfg = KATEGORI_PENGASUHAN_CONFIG[item.kategori] || KATEGORI_PENGASUHAN_CONFIG.antar_pku_rs;
                      return (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
                        >
                          <div className="flex items-start gap-3.5 flex-1">
                            {/* Photo Thumbnail or Category Icon */}
                            {item.photoUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(item.photoUrl!)}
                                className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative group"
                              >
                                <img src={item.photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-4 h-4" />
                                </div>
                              </button>
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badgeColor}`}>
                                {item.kategori === "antar_pku_rs" ? (
                                  <Stethoscope className="w-5 h-5" />
                                ) : item.kategori === "bina_santri" ? (
                                  <HeartHandshake className="w-5 h-5" />
                                ) : (
                                  <Car className="w-5 h-5" />
                                )}
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeColor}`}>
                                  {cfg.shortLabel}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                                  +{item.poin || cfg.defaultPoints} Poin
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.date} • {item.waktu}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                {item.namaSantri} {item.kelasSantri ? `(Kelas ${item.kelasSantri})` : ""}
                              </p>

                              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="font-semibold text-slate-700">{item.lokasiTujuan}</span>
                              </p>

                              <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                {item.catatan}
                              </p>

                              <p className="text-[10px] text-slate-400 pt-0.5">
                                Pelapor: <span className="font-medium text-slate-600">{item.musyrifName}</span> ({item.asrama})
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {onDeletePengasuhan && (isKoor || isPamong || authUser?.id === item.musyrifId) && (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await appConfirm("Hapus catatan tugas pengasuhan ini?", "Konfirmasi Hapus");
                                if (ok) onDeletePengasuhan(item.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PHOTO PREVIEW MODAL */}
        <AnimatePresence>
          {previewPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setPreviewPhoto(null)}
            >
              <div className="relative max-w-xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-1 shadow-2xl">
                <img src={previewPhoto} alt="Bukti Foto" className="max-h-[80vh] w-auto object-contain rounded-xl" />
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
