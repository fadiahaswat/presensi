import React, { useState, useMemo } from "react";
import { 
  X, BookOpen, Users, Check, AlertCircle, 
  Calendar, ShieldCheck, Plus, Sparkles, Building2, Search,
  ChevronLeft, CheckCircle2, Megaphone, Broom
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";
import { canManageKegiatanAsrama, getPamongAssignedAsramas, hasFullAccess } from "../utils/roleAccessUtils";

export interface KegiatanRecord {
  id: string;
  activityType: "tahfidz" | "kajian" | "apel" | "piket";
  activityTitle: string;
  date: string;
  asrama: string;
  attendees: Record<string, "hadir" | "izin" | "sakit" | "alfa">;
  notes?: string;
  markedBy?: string;
}

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
}

interface KegiatanAsramaModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  asramaList: string[];
  kegiatanRecords: KegiatanRecord[];
  onSaveKegiatan: (record: KegiatanRecord) => void;
  onDeleteKegiatan?: (id: string) => void;
  authUser: any;
  isPage?: boolean;
}

const ACTIVITIES = [
  { id: "tahfidz", title: "Halaqah Tahfidz & Tasmi' Qur'an", iconType: "tahfidz", desc: "Setoran hafalan Al-Qur'an ba'da Subuh atau Ashar" },
  { id: "kajian", title: "Kuliah / Kajian Asrama Ba'da Shalat", iconType: "kajian", desc: "Kultum & taklim kitab keasramaan" },
  { id: "apel", title: "Apel & Briefing Koordinasi Musyrif", iconType: "apel", desc: "Evaluasi kedisiplinan pekanan musyrif & pamong" },
  { id: "piket", title: "Piket Kebersihan & Ronda Asrama", iconType: "piket", desc: "Pengecekan kebersihan kamar & ketertiban santri" },
];

function getActivityIcon(type: string) {
  switch (type) {
    case "tahfidz": return <BookOpen className="w-5 h-5 text-emerald-600" />;
    case "kajian": return <Sparkles className="w-5 h-5 text-amber-600" />;
    case "apel": return <Megaphone className="w-5 h-5 text-indigo-600" />;
    case "piket": return <ShieldCheck className="w-5 h-5 text-teal-600" />;
    default: return <BookOpen className="w-5 h-5 text-emerald-600" />;
  }
}

export function KegiatanAsramaModal({
  onClose,
  musyrifList,
  asramaList,
  kegiatanRecords,
  onSaveKegiatan,
  onDeleteKegiatan,
  authUser,
  isPage = false
}: KegiatanAsramaModalProps) {
  const isSuperAdmin = authUser ? hasFullAccess(authUser) : false;
  const isPamong = authUser?.role === "pamong";
  const isKoordGedung = authUser?.role === "koordinator_gedung";
  const canManage = canManageKegiatanAsrama(authUser);
  const userAsrama = authUser?.asrama || asramaList[0] || "1";

  // List of asramas this user is allowed to manage/view
  const availableAsramas = useMemo(() => {
    if (isSuperAdmin) return asramaList;
    if (isPamong) {
      const pamongAsramas = getPamongAssignedAsramas(authUser);
      if (pamongAsramas && pamongAsramas.length > 0) {
        const filtered = asramaList.filter(a => 
          pamongAsramas.includes(a) || 
          pamongAsramas.some(pa => a.toLowerCase().includes(pa.toLowerCase()))
        );
        if (filtered.length > 0) return filtered;
      }
    }
    if (authUser?.asrama) {
      const matched = asramaList.find(a => a.toLowerCase() === authUser.asrama.toLowerCase());
      return matched ? [matched] : [authUser.asrama];
    }
    return asramaList;
  }, [authUser, asramaList, isSuperAdmin, isPamong]);

  const [activeTab, setActiveTab] = useState<"input" | "riwayat">(canManage ? "input" : "riwayat");
  const [selectedActivity, setSelectedActivity] = useState<string>("tahfidz");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedAsrama, setSelectedAsrama] = useState<string>(availableAsramas[0] || userAsrama || asramaList[0] || "1");
  const [notes, setNotes] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [editingKegiatan, setEditingKegiatan] = useState<KegiatanRecord | null>(null);

  // Riwayat Tab Filter & Search
  const [riwayatFilterType, setRiwayatFilterType] = useState<string>("all");
  const [riwayatSearch, setRiwayatSearch] = useState<string>("");
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  // Attendance state for current form
  const [attendance, setAttendance] = useState<Record<string, "hadir" | "izin" | "sakit" | "alfa">>({});

  const filteredMusyrif = musyrifList
    .filter(m => m.asrama === selectedAsrama)
    .filter(m => (m.name || "").toLowerCase().includes((search || "").toLowerCase()));

  const handleStatusChange = (musyrifId: string, status: "hadir" | "izin" | "sakit" | "alfa") => {
    setAttendance(prev => ({
      ...prev,
      [musyrifId]: status
    }));
  };

  const handleMarkAll = (status: "hadir" | "izin" | "alfa") => {
    const updated: Record<string, "hadir" | "izin" | "sakit" | "alfa"> = {};
    filteredMusyrif.forEach(m => {
      updated[m.id] = status;
    });
    setAttendance(prev => ({ ...prev, ...updated }));
  };

  const resetForm = () => {
    setSelectedActivity("tahfidz");
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedAsrama(availableAsramas[0] || userAsrama || asramaList[0] || "1");
    setNotes("");
    setAttendance({});
    setEditingKegiatan(null);
  };

  const handleStartEdit = (rec: KegiatanRecord) => {
    if (!canManage) {
      appAlert("Hanya Koordinator Gedung, Pamong Asrama, atau Manajemen yang dapat mengedit agenda kegiatan.", "Akses Terbatas", "warning");
      return;
    }
    setEditingKegiatan(rec);
    setSelectedActivity(rec.activityType);
    setSelectedDate(rec.date);
    setSelectedAsrama(rec.asrama);
    setNotes(rec.notes || "");
    setAttendance(rec.attendees || {});
    setActiveTab("input");
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const handleSave = () => {
    if (!canManage) {
      appAlert("Akses Ditolak: Hanya Koordinator Gedung, Pamong Asrama, atau Manajemen yang berhak mencatat presensi kegiatan asrama.", "Akses Ditolak", "error");
      return;
    }
    if (selectedDate > todayStr && !isSuperAdmin) {
      appAlert("Presensi kegiatan asrama tidak dapat dicatat untuk tanggal di masa depan.", "Tanggal Tidak Valid", "warning");
      return;
    }
    const actMeta = ACTIVITIES.find(a => a.id === selectedActivity);
    const recId = editingKegiatan ? editingKegiatan.id : `${selectedActivity}_${selectedAsrama}_${selectedDate}`;
    
    // Fill default hadir if not set
    const finalAttendance = { ...attendance };
    filteredMusyrif.forEach(m => {
      if (!finalAttendance[m.id]) {
        finalAttendance[m.id] = "hadir";
      }
    });

    const roleLabel = isSuperAdmin ? "Manajemen" : isPamong ? "Pamong" : isKoordGedung ? "Koord. Gedung" : "Petugas";
    const defaultMarker = authUser?.name ? `${authUser.name} (${roleLabel})` : (isKoordGedung ? "Koordinator Gedung" : isPamong ? "Pamong" : "Manajemen");

    onSaveKegiatan({
      id: recId,
      activityType: selectedActivity as any,
      activityTitle: actMeta?.title || "Kegiatan Asrama",
      date: selectedDate,
      asrama: selectedAsrama,
      attendees: finalAttendance,
      notes: notes.trim() || undefined,
      markedBy: editingKegiatan ? editingKegiatan.markedBy : defaultMarker
    });

    triggerHaptic("medium");
    appAlert(editingKegiatan ? "Data kegiatan berhasil diperbarui." : "Presensi kegiatan berhasil disimpan.", "Berhasil", "success");
    resetForm();
    setActiveTab("riwayat");
  };

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
            <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Presensi Kegiatan Asrama
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              {canManage 
                ? "Tahfidz, Kuliah Shubuh, Apel, & Ronda Kebersihan Asrama"
                : "Riwayat & Agenda Kegiatan Asrama"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === "input" && editingKegiatan) resetForm();
                setActiveTab("input");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "input" 
                  ? (isPage ? "bg-[#0C81E4] text-white shadow-xs" : "bg-white text-[#0C4E8C] shadow-xs") 
                  : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
              }`}
            >
              {editingKegiatan ? "Edit Agenda" : "Input Agenda"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "riwayat" 
                ? (isPage ? "bg-[#0C81E4] text-white shadow-xs" : "bg-white text-[#0C4E8C] shadow-xs") 
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            Riwayat ({kegiatanRecords.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "input" ? (
        !canManage ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/70 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Hak Akses Terbatas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Pengisian presensi kegiatan asrama khusus untuk <strong>Koordinator Gedung</strong>, <strong>Pamong Asrama</strong>, dan <strong>Manajemen Asrama</strong>.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("riwayat")}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 transition-all"
            >
              Buka Riwayat Kegiatan
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          {editingKegiatan && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-900">
              <span>Sedang mengedit agenda: <strong>{editingKegiatan.activityTitle}</strong> ({editingKegiatan.date})</span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                Batal Edit
              </button>
            </div>
          )}
          {/* Activity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACTIVITIES.map(act => (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActivity(act.id)}
                className={`p-3.5 rounded-3xl border text-left transition-all ${
                  selectedActivity === act.id
                    ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20"
                    : "border-slate-200/70 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {getActivityIcon(act.iconType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 leading-snug truncate">{act.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Filters & Actions */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Pilih Asrama
                </label>
                <select
                  value={selectedAsrama}
                  onChange={(e) => setSelectedAsrama(e.target.value)}
                  disabled={availableAsramas.length <= 1}
                  className={`w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none ${availableAsramas.length <= 1 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {availableAsramas.map(a => (
                    <option key={a} value={a}>Asrama {a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800">Daftar Musyrif ({filteredMusyrif.length})</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMarkAll("hadir")}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  Semua Hadir
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll("izin")}
                  className="px-3 py-1.5 bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold rounded-xl hover:bg-sky-100 transition-colors"
                >
                  Semua Izin
                </button>
              </div>
            </div>

            {/* Musyrif Attendance List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredMusyrif.map((m, idx) => {
                const currentStatus = attendance[m.id] || "hadir";
                return (
                  <div key={m.id} className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{idx + 1}. {m.name}</div>
                      <div className="text-xs text-slate-500">Kamar {m.kamar}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {(["hadir", "izin", "sakit", "alfa"] as const).map(st => {
                        const isSel = currentStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(m.id, st)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSel
                                ? st === "hadir"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : st === "izin"
                                  ? "bg-sky-600 text-white shadow-xs"
                                  : st === "sakit"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-rose-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {st === "hadir" ? "Hadir" : st === "izin" ? "Izin" : st === "sakit" ? "Sakit" : "Alfa"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Kegiatan (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Pembahasan materi kitab adab tholabul ilmi bab 3..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#0C81E4] hover:bg-[#0C4E8C] text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Presensi Agenda</span>
              </button>
            </div>
          </div>
        </div>
        )
      ) : (
        <div className="space-y-3 pb-6">
          {/* Riwayat Search & Filter */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={riwayatSearch}
                onChange={(e) => setRiwayatSearch(e.target.value)}
                placeholder="Cari judul kegiatan, asrama, atau tanggal..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              {riwayatSearch && (
                <button
                  type="button"
                  onClick={() => setRiwayatSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: "all", label: "Semua Tipe" },
                { id: "tahfidz", label: "Tahfidz" },
                { id: "kajian", label: "Kajian" },
                { id: "apel", label: "Apel" },
                { id: "piket", label: "Piket" }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRiwayatFilterType(st.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    riwayatFilterType === st.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {kegiatanRecords
            .filter(rec => {
              // Scope asrama
              if (!isSuperAdmin) {
                if (isPamong) {
                  if (availableAsramas.length > 0 && !availableAsramas.includes(rec.asrama)) return false;
                } else {
                  if (rec.asrama !== userAsrama) return false;
                }
              }
              const matchType = riwayatFilterType === "all" || rec.activityType === riwayatFilterType;
              const q = riwayatSearch.toLowerCase();
              const matchSearch = !riwayatSearch ||
                rec.activityTitle.toLowerCase().includes(q) ||
                rec.asrama.toLowerCase().includes(q) ||
                rec.date.includes(q) ||
                (rec.notes && rec.notes.toLowerCase().includes(q));
              return matchType && matchSearch;
            }).length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Riwayat Kegiatan</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {riwayatSearch || riwayatFilterType !== "all"
                  ? "Tidak ada kegiatan yang cocok dengan filter atau pencarian Anda."
                  : "Belum ada data presensi kegiatan non-shalat yang tersimpan di sistem."}
              </p>
            </div>
          ) : (
            kegiatanRecords
              .filter(rec => {
                // Scope asrama
                if (!isSuperAdmin) {
                  if (isPamong) {
                    if (availableAsramas.length > 0 && !availableAsramas.includes(rec.asrama)) return false;
                  } else {
                    if (rec.asrama !== userAsrama) return false;
                  }
                }
                const matchType = riwayatFilterType === "all" || rec.activityType === riwayatFilterType;
                const q = riwayatSearch.toLowerCase();
                const matchSearch = !riwayatSearch ||
                  rec.activityTitle.toLowerCase().includes(q) ||
                  rec.asrama.toLowerCase().includes(q) ||
                  rec.date.includes(q) ||
                  (rec.notes && rec.notes.toLowerCase().includes(q));
                return matchType && matchSearch;
              })
              .map(rec => {
                const total = Object.keys(rec.attendees).length;
                const hadirCount = Object.values(rec.attendees).filter(s => s === "hadir").length;
                const izinCount = Object.values(rec.attendees).filter(s => s === "izin").length;
                const isExpanded = expandedRecId === rec.id;

                return (
                  <div key={rec.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {getActivityIcon(rec.activityType)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{rec.activityTitle}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Asrama {rec.asrama} · {rec.date}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold text-xs">
                        {hadirCount}/{total} Hadir
                      </span>
                    </div>

                    {rec.notes && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 italic leading-relaxed">
                        "{rec.notes}"
                      </p>
                    )}

                    {/* Expandable Attendees List */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-700">Daftar Kehadiran Musyrif:</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {Object.entries(rec.attendees).map(([mid, status]) => {
                            const mObj = musyrifList.find(m => m.id === mid);
                            return (
                              <div key={mid} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <span className="font-semibold text-slate-800 truncate mr-2">{mObj?.name || mid}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                                  status === "hadir" ? "bg-emerald-100 text-emerald-800" :
                                  status === "izin" ? "bg-sky-100 text-sky-800" :
                                  status === "sakit" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100">
                      <span>Dicatat: {rec.markedBy || "Pamong"}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {isExpanded ? "Sembunyikan Rincian" : "Lihat Rincian Peserta"}
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(rec)}
                              className="text-xs font-semibold text-amber-600 hover:underline"
                            >
                              Edit
                            </button>
                            {onDeleteKegiatan && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await appConfirm(
                                    `Hapus data agenda "${rec.activityTitle}" tanggal ${rec.date}?`,
                                    "Hapus Agenda Kegiatan",
                                    { type: "danger", confirmText: "Ya, Hapus", cancelText: "Batal" }
                                  );
                                  if (ok) {
                                    onDeleteKegiatan(rec.id);
                                  }
                                }}
                                className="text-xs font-semibold text-rose-600 hover:underline"
                              >
                                Hapus
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
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
