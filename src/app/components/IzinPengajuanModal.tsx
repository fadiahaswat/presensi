import React, { useState } from "react";
import { 
  X, CheckCircle, AlertCircle, Clock, Upload, 
  FileCheck2, ShieldCheck, Check, Ban, Eye, User, Calendar, MapPin,
  ChevronLeft, Plus
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

export interface IzinRequest {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama: string;
  kamar: string;
  type: "sakit" | "izin";
  category: "Sakit" | "Izin Pulang / Keluarga" | "Tugas / Dinas Madrasah" | "Akademik Kampus" | "Lainnya";
  startDate: string;
  endDate: string;
  prayerSlot: "all" | "subuh" | "maghrib";
  reason: string;
  attachmentUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
}

interface AuthUser {
  id: string;
  name: string;
  role: "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif";
  musyrifId?: string;
  asrama?: string;
}

interface IzinPengajuanModalProps {
  onClose: () => void;
  authUser: AuthUser | null;
  musyrifList: Musyrif[];
  izinList: IzinRequest[];
  onSubmitIzin: (req: Omit<IzinRequest, "id" | "status" | "createdAt">) => void;
  onUpdateIzin?: (req: IzinRequest) => void;
  onApproveIzin: (reqId: string, approved: boolean) => void;
  onDeleteIzin?: (reqId: string) => void;
  isPage?: boolean;
}

export function IzinPengajuanModal({
  onClose,
  authUser,
  musyrifList,
  izinList,
  onSubmitIzin,
  onUpdateIzin,
  onApproveIzin,
  onDeleteIzin,
  isPage = false
}: IzinPengajuanModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const isPamongOrKoord = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";
  const [activeTab, setActiveTab] = useState<"ajukan" | "daftar">(isPamongOrKoord ? "daftar" : "ajukan");

  // Search & Filter State in Daftar Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filterType, setFilterType] = useState<"all" | "izin" | "sakit">("all");
  const [editingIzin, setEditingIzin] = useState<IzinRequest | null>(null);

  // Scoped Musyrif List for Form
  const availableMusyrifList = React.useMemo(() => {
    if (isKoordinator) return musyrifList;
    if (authUser?.role === "pamong" || authUser?.role === "koordinator_gedung") {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    return musyrifList.filter(m => m.id === authUser?.musyrifId || m.id === authUser?.id);
  }, [musyrifList, authUser, isKoordinator]);

  // Form State
  const defaultMusyrif = authUser?.musyrifId 
    ? musyrifList.find(m => m.id === authUser.musyrifId) 
    : availableMusyrifList[0] || musyrifList[0];

  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrif?.id || availableMusyrifList[0]?.id || musyrifList[0]?.id || "");
  const [type, setType] = useState<"sakit" | "izin">("izin");
  const [category, setCategory] = useState<IzinRequest["category"]>("Izin Pulang / Keluarga");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [prayerSlot, setPrayerSlot] = useState<"all" | "subuh" | "maghrib">("all");
  const [reason, setReason] = useState<string>("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedMusyrifId(defaultMusyrif?.id || availableMusyrifList[0]?.id || musyrifList[0]?.id || "");
    setType("izin");
    setCategory("Izin Pulang / Keluarga");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setPrayerSlot("all");
    setReason("");
    setAttachment(null);
    setEditingIzin(null);
  };

  const handleStartEdit = (req: IzinRequest) => {
    setEditingIzin(req);
    setSelectedMusyrifId(req.musyrifId);
    setType(req.type);
    setCategory(req.category);
    setStartDate(req.startDate);
    setEndDate(req.endDate);
    setPrayerSlot(req.prayerSlot);
    setReason(req.reason);
    setAttachment(req.attachmentUrl || null);
    setActiveTab("ajukan");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Harap isi alasan perizinan dengan jelas.");
      return;
    }
    if (endDate < startDate) {
      alert("Tanggal selesai izin tidak boleh lebih awal dari tanggal mulai izin.");
      return;
    }
    const currentMusyrif = musyrifList.find(m => m.id === selectedMusyrifId);
    if (!currentMusyrif) return;

    if (editingIzin && onUpdateIzin) {
      onUpdateIzin({
        ...editingIzin,
        musyrifId: currentMusyrif.id,
        musyrifName: currentMusyrif.name,
        asrama: currentMusyrif.asrama,
        kamar: currentMusyrif.kamar,
        type,
        category,
        startDate,
        endDate,
        prayerSlot,
        reason: reason.trim(),
        attachmentUrl: attachment || undefined
      });
      triggerHaptic("medium");
      alert("Data perizinan berhasil diperbarui.");
    } else {
      onSubmitIzin({
        musyrifId: currentMusyrif.id,
        musyrifName: currentMusyrif.name,
        asrama: currentMusyrif.asrama,
        kamar: currentMusyrif.kamar,
        type,
        category,
        startDate,
        endDate,
        prayerSlot,
        reason: reason.trim(),
        attachmentUrl: attachment || undefined
      });
      triggerHaptic("medium");
    }

    resetForm();
    setActiveTab("daftar");
  };

  // Base Izin List Scoped to User Role & Asrama
  const roleScopedIzinList = React.useMemo(() => {
    if (!authUser || isKoordinator) return izinList;
    if (authUser?.role === "pamong" || authUser?.role === "koordinator_gedung") {
      return izinList.filter(item => item.asrama === authUser.asrama);
    }
    // Regular musyrif: only see self
    return izinList.filter(item => item.musyrifId === authUser?.musyrifId || item.musyrifId === authUser?.id);
  }, [izinList, authUser, isKoordinator]);

  // Filtered Izin List
  const filteredIzinList = roleScopedIzinList.filter(item => {
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchType = filterType === "all" || item.type === filterType;
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || 
      item.musyrifName.toLowerCase().includes(q) ||
      item.asrama.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  const pendingCount = roleScopedIzinList.filter(i => i.status === "pending").length;

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-emerald-800 text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Kembali ke Dashboard"
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              isPage ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
                Layanan Izin & Dispensasi
              </h2>
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                  {pendingCount} Menunggu
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Pengajuan izin resmi santri & persetujuan Pamong Asrama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("ajukan")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ajukan" 
                ? (isPage ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-emerald-900 shadow-xs") 
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            + Ajukan Izin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("daftar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "daftar" 
                ? (isPage ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-emerald-900 shadow-xs") 
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            Daftar ({izinList.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "ajukan" ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">
                {editingIzin ? `Edit Pengajuan Izin: ${editingIzin.musyrifName}` : "Formulir Pengajuan Izin Baru"}
              </h3>
            </div>
            {editingIzin && (
              <button
                type="button"
                onClick={() => { resetForm(); setActiveTab("daftar"); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Musyrif / Pemohon</label>
            {authUser?.musyrifId && !isPamongOrKoord ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{defaultMusyrif?.name} ({defaultMusyrif?.asrama})</span>
              </div>
            ) : (
              <select
                value={selectedMusyrifId}
                onChange={(e) => setSelectedMusyrifId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                {availableMusyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.asrama} ({m.kamar})</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Tipe Keterangan</label>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setType("izin"); setCategory("Izin Pulang / Keluarga"); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${type === "izin" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Izin
                </button>
                <button
                  type="button"
                  onClick={() => { setType("sakit"); setCategory("Sakit"); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${type === "sakit" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Sakit
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Kategori Izin</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                {type === "sakit" ? (
                  <>
                    <option value="Sakit">Sakit (Istirahat di Kamar/UKS)</option>
                    <option value="Sakit">Sakit (Rawat Inap/RS PKU)</option>
                  </>
                ) : (
                  <>
                    <option value="Izin Pulang / Keluarga">Izin Pulang / Acara Keluarga</option>
                    <option value="Tugas / Dinas Madrasah">Tugas / Dinas Madrasah</option>
                    <option value="Akademik Kampus">Akademik Kampus (Kuliah / Tugas Akhir)</option>
                    <option value="Lainnya">Keperluan Mendesak Lainnya</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Mulai Tanggal</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Sampai Tanggal</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Waktu Shalat</label>
              <select
                value={prayerSlot}
                onChange={(e: any) => setPrayerSlot(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">Sepanjang Hari (Subuh & Maghrib)</option>
                <option value="subuh">Hanya Shalat Subuh</option>
                <option value="maghrib">Hanya Shalat Maghrib</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Alasan / Penjelasan Detail</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan keterangan izin secara jelas dan bertanggung jawab..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-normal text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Unggah Bukti / Foto Surat Dokter / Tugas (Opsional)
            </label>
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
              {attachment ? (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-emerald-700 font-semibold truncate max-w-[200px]">✓ Lampiran foto terunggah</span>
                  <button 
                    type="button" 
                    onClick={() => setAttachment(null)}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-600 font-medium">Klik untuk upload foto surat dokter / surat izin</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Format JPG, PNG, atau PDF</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Kirim Pengajuan Izin</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 pb-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari musyrif, asrama, atau alasan..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: "all", label: "Semua Status" },
                { id: "pending", label: `Menunggu (${pendingCount})` },
                { id: "approved", label: "Disetujui" },
                { id: "rejected", label: "Ditolak" }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === st.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {filteredIzinList.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Pengajuan Izin</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {searchQuery || filterStatus !== "all" 
                  ? "Tidak ada data perizinan yang sesuai dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada data pengajuan izin atau surat sakit yang tercatat di sistem."}
              </p>
            </div>
          ) : (
            filteredIzinList.map(req => (
              <div key={req.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      req.type === "sakit" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                    }`}>
                      {req.type === "sakit" ? <AlertCircle className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{req.musyrifName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          req.type === "sakit" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
                        }`}>
                          {req.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Asrama {req.asrama} · Kamar {req.kamar} · Kategori: {req.category}
                      </p>
                    </div>
                  </div>

                  <div>
                    {req.status === "pending" && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu
                      </span>
                    )}
                    {req.status === "approved" && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Disetujui
                      </span>
                    )}
                    {req.status === "rejected" && (
                      <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5 text-rose-600" /> Ditolak
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{req.startDate} s/d {req.endDate} ({req.prayerSlot === "all" ? "Subuh & Maghrib" : req.prayerSlot.toUpperCase()})</span>
                  </div>
                  <p className="text-xs text-slate-800 italic leading-relaxed">"{req.reason}"</p>
                  {req.attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImg(req.attachmentUrl || null)}
                      className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 pt-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat Bukti Lampiran
                    </button>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    Diajukan: {req.createdAt}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Izin Button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(req)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Edit</span>
                    </button>

                    {/* Pemohon Cancel Button if Pending */}
                    {req.status === "pending" && onDeleteIzin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Batalkan pengajuan izin untuk ${req.musyrifName}?`)) {
                            onDeleteIzin(req.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
                      >
                        Batalkan
                      </button>
                    )}

                    {/* Pamong Review Action */}
                    {isPamongOrKoord && (isKoordinator || req.asrama === authUser?.asrama) && req.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onApproveIzin(req.id, false)}
                          className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveIzin(req.id, true)}
                          className="px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Setujui
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden p-3 shadow-2xl">
            <button 
              type="button"
              onClick={() => setPreviewImg(null)} 
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImg} alt="Bukti Izin" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );

  if (isPage) {
    return content;
  }

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => { triggerHaptic("light"); onClose(); }}
    >
      <motion.div 
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
