import React, { useState } from "react";
import { 
  X, CheckCircle, AlertCircle, Clock, Upload, 
  FileCheck2, ShieldCheck, Check, Ban, Eye, User, Calendar, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  onApproveIzin: (reqId: string, approved: boolean) => void;
}

export function IzinPengajuanModal({
  onClose,
  authUser,
  musyrifList,
  izinList,
  onSubmitIzin,
  onApproveIzin
}: IzinPengajuanModalProps) {
  const isPamongOrKoord = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";
  const [activeTab, setActiveTab] = useState<"ajukan" | "daftar">(isPamongOrKoord ? "daftar" : "ajukan");

  // Form State
  const defaultMusyrif = authUser?.musyrifId 
    ? musyrifList.find(m => m.id === authUser.musyrifId) 
    : musyrifList[0];

  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrif?.id || musyrifList[0]?.id || "");
  const [type, setType] = useState<"sakit" | "izin">("izin");
  const [category, setCategory] = useState<IzinRequest["category"]>("Izin Pulang / Keluarga");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [prayerSlot, setPrayerSlot] = useState<"all" | "subuh" | "maghrib">("all");
  const [reason, setReason] = useState<string>("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

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
    const currentMusyrif = musyrifList.find(m => m.id === selectedMusyrifId);
    if (!currentMusyrif) return;

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
      reason,
      attachmentUrl: attachment || undefined
    });

    setReason("");
    setAttachment(null);
    setActiveTab("daftar");
  };

  const pendingCount = izinList.filter(i => i.status === "pending").length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pengajuan Izin & Sakit Musyrif</h3>
              <p className="text-[11px] text-emerald-100/80">Layanan mandiri perizinan & approval resmi Pamong</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200/80 flex gap-2">
          <button
            onClick={() => setActiveTab("ajukan")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "ajukan"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Form Pengajuan Izin
          </button>
          <button
            onClick={() => setActiveTab("daftar")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "daftar"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Daftar Pengajuan</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "ajukan" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Musyrif Selector (if pamong or not tied) */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Nama Musyrif</label>
                {authUser?.musyrifId && !isPamongOrKoord ? (
                  <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{defaultMusyrif?.name} ({defaultMusyrif?.asrama})</span>
                  </div>
                ) : (
                  <select
                    value={selectedMusyrifId}
                    onChange={(e) => setSelectedMusyrifId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {musyrifList.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.asrama} ({m.kamar})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Jenis Izin */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Tipe Keterangan</label>
                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setType("izin"); setCategory("Izin Pulang / Keluarga"); }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${type === "izin" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500"}`}
                    >
                      Izin
                    </button>
                    <button
                      type="button"
                      onClick={() => { setType("sakit"); setCategory("Sakit"); }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${type === "sakit" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-500"}`}
                    >
                      Sakit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Kategori</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {type === "sakit" ? (
                      <>
                        <option value="Sakit">Sakit (Istirahat di Kamar/UKS)</option>
                        <option value="Sakit">Sakit (Rawat Inap/RS/Klinik)</option>
                      </>
                    ) : (
                      <>
                        <option value="Izin Pulang / Keluarga">Izin Pulang / Keluarga</option>
                        <option value="Tugas / Dinas Madrasah">Tugas / Dinas Madrasah</option>
                        <option value="Akademik Kampus">Akademik Kampus (Skripsi/Kuliah)</option>
                        <option value="Lainnya">Keperluan Mendesak Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Mulai Tanggal</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Sampai Tanggal</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Waktu Shalat yang Diizinkan</label>
                <select
                  value={prayerSlot}
                  onChange={(e: any) => setPrayerSlot(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
                >
                  <option value="all">Sepanjang Hari (Subuh & Maghrib)</option>
                  <option value="subuh">Hanya Shalat Subuh</option>
                  <option value="maghrib">Hanya Shalat Maghrib</option>
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Alasan / Keterangan Lengkap</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan izin / diagnosa sakit secara ringkas dan jelas..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Upload Bukti */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Unggah Bukti / Foto Surat (Opsional)
                </label>
                <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center relative">
                  {attachment ? (
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
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
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 font-medium">Klik untuk upload foto surat dokter / izin</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Kirim Pengajuan Izin</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {izinList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Belum ada pengajuan izin yang tercatat.</p>
                </div>
              ) : (
                izinList.map(req => (
                  <div key={req.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{req.musyrifName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.type === "sakit" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {req.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">Asrama {req.asrama} • Kamar {req.kamar}</p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {req.status === "pending" && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Menunggu
                          </span>
                        )}
                        {req.status === "approved" && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Disetujui
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-slate-700 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{req.startDate} s/d {req.endDate} ({req.prayerSlot.toUpperCase()})</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">Kategori: {req.category}</p>
                      <p className="text-slate-600 italic">"{req.reason}"</p>
                      {req.attachmentUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImg(req.attachmentUrl || null)}
                          className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1 pt-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Bukti Lampiran
                        </button>
                      )}
                    </div>

                    {/* Pamong Review Action */}
                    {isPamongOrKoord && req.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                        <button
                          onClick={() => onApproveIzin(req.id, false)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Tolak
                        </button>
                        <button
                          onClick={() => onApproveIzin(req.id, true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Setujui Izin
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden p-2">
            <button 
              onClick={() => setPreviewImg(null)} 
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImg} alt="Bukti Izin" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
