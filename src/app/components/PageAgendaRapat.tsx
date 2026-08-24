import React, { useState, useMemo } from "react";
import { 
  ArrowLeft, Calendar, Clock, MapPin, Users, Plus, CheckCircle2, 
  AlertCircle, Trash2, Edit3, ShieldCheck, Sparkles, Building2,
  Search, Eye, Filter, Check, ArrowRight, X, Camera, RefreshCw, Award
} from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";
import { canManageKegiatanAsrama, getPamongAssignedAsramas, hasFullAccess } from "../utils/roleAccessUtils";
import { AgendaRapatRecord, PREDEFINED_AGENDA_VENUES, AGENDA_CATEGORIES, AgendaVenue } from "../types/agendaRapat";
import type { LogbookStorage } from "./JurnalLogbookModal";

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
  role?: string;
  email?: string;
  picture?: string;
}

interface PageAgendaRapatProps {
  onGoBack: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  asramaList: string[];
  agendaList: AgendaRapatRecord[];
  logbookData: LogbookStorage;
  onSaveAgenda: (agenda: AgendaRapatRecord) => void;
  onDeleteAgenda: (agendaId: string) => void;
}

type ViewMode = "list" | "form" | "attendance";

export function PageAgendaRapat({
  onGoBack,
  authUser,
  musyrifList,
  asramaList,
  agendaList = [],
  logbookData = {},
  onSaveAgenda,
  onDeleteAgenda
}: PageAgendaRapatProps) {
  const isSuperAdmin = authUser ? hasFullAccess(authUser) : false;
  const isKoordinatorMusyrif = authUser?.role === "koordinator_musyrif";
  const isPamong = authUser?.role === "pamong";
  const isKoordGedung = authUser?.role === "koordinator_gedung";
  const canManage = canManageKegiatanAsrama(authUser);

  // List musyrif yang boleh diundang oleh pembuat agenda sesuai kewenangannya
  const allowedMusyrifList = useMemo(() => {
    const fieldMusyrifs = musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    if (isSuperAdmin || isKoordinatorMusyrif) {
      return fieldMusyrifs;
    }
    if (isPamong) {
      const assigned = getPamongAssignedAsramas(authUser);
      if (assigned.length === 0) return fieldMusyrifs;
      return fieldMusyrifs.filter(m => assigned.includes(m.asrama));
    }
    if (isKoordGedung && authUser?.asrama) {
      return fieldMusyrifs.filter(m => m.asrama === authUser.asrama);
    }
    return fieldMusyrifs;
  }, [musyrifList, authUser, isSuperAdmin, isKoordinatorMusyrif, isPamong, isKoordGedung]);

  // View Mode: 'list' | 'form' | 'attendance' (100% Full Page Views - No Modals)
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Tab & Filter States (for list view)
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Form Fields State (for form view)
  const [editingAgenda, setEditingAgenda] = useState<AgendaRapatRecord | null>(null);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<AgendaRapatRecord["category"]>("rapat");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("11:30");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("masjid_kampus1");
  const [customVenueName, setCustomVenueName] = useState<string>("");
  const [targetScope, setTargetScope] = useState<"all" | "asrama" | "custom">("all");
  const [selectedAsramaList, setSelectedAsramaList] = useState<string[]>([]);
  const [selectedMusyrifIds, setSelectedMusyrifIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [notesSearchQuery, setNotesSearchQuery] = useState<string>("");

  // Detailed Attendance View State (for attendance view)
  const [selectedAgendaForAttendance, setSelectedAgendaForAttendance] = useState<AgendaRapatRecord | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "hadir" | "belum">("all");
  const [activePhotoPreview, setActivePhotoPreview] = useState<{ url: string; musyrifName: string; title: string; time: string } | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Sorted Agendas
  const sortedAgendas = useMemo(() => {
    return [...agendaList].sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return (b.startTime || "").localeCompare(a.startTime || "");
    });
  }, [agendaList]);

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return sortedAgendas.filter(ag => {
      if (selectedCategoryFilter !== "all" && ag.category !== selectedCategoryFilter) {
        return false;
      }

      const matchSearch = ag.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ag.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ag.createdByName || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (activeTab === "upcoming") {
        return ag.date >= todayStr;
      } else {
        return ag.date < todayStr;
      }
    });
  }, [sortedAgendas, searchQuery, selectedCategoryFilter, activeTab, todayStr]);

  // KPI Statistics
  const upcomingCount = useMemo(() => sortedAgendas.filter(a => a.date >= todayStr).length, [sortedAgendas, todayStr]);
  const pastCount = useMemo(() => sortedAgendas.filter(a => a.date < todayStr).length, [sortedAgendas, todayStr]);
  const totalAgendas = sortedAgendas.length;

  const handleOpenCreate = () => {
    setEditingAgenda(null);
    setTitle("");
    setCategory("rapat");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStartTime("09:00");
    setEndTime("11:30");
    setSelectedVenueId("masjid_kampus1");
    setCustomVenueName("");
    setTargetScope("all");
    setSelectedAsramaList([]);
    setSelectedMusyrifIds(allowedMusyrifList.map(m => m.id));
    setNotes("");
    setNotesSearchQuery("");
    setViewMode("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (ag: AgendaRapatRecord) => {
    setEditingAgenda(ag);
    setTitle(ag.title);
    setCategory(ag.category);
    setDate(ag.date);
    setStartTime(ag.startTime);
    setEndTime(ag.endTime);
    const matchedVenue = PREDEFINED_AGENDA_VENUES.find(v => v.name === ag.locationName);
    if (matchedVenue) {
      setSelectedVenueId(matchedVenue.id);
      setCustomVenueName("");
    } else {
      setSelectedVenueId("custom");
      setCustomVenueName(ag.locationName);
    }
    setTargetScope(ag.targetScope);
    setSelectedAsramaList(ag.targetAsramaList || []);
    setSelectedMusyrifIds(ag.invitedMusyrifIds || []);
    setNotes(ag.notes || "");
    setNotesSearchQuery("");
    setViewMode("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleMusyrif = (musyrifId: string) => {
    if (selectedMusyrifIds.includes(musyrifId)) {
      setSelectedMusyrifIds(selectedMusyrifIds.filter(id => id !== musyrifId));
    } else {
      setSelectedMusyrifIds([...selectedMusyrifIds, musyrifId]);
    }
  };

  const handleSelectAllMusyrifs = () => {
    if (selectedMusyrifIds.length === allowedMusyrifList.length) {
      setSelectedMusyrifIds([]);
    } else {
      setSelectedMusyrifIds(allowedMusyrifList.map(m => m.id));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      appAlert("Silakan masukkan nama / judul agenda pertemuan.", "Peringatan", "warning");
      return;
    }
    if (selectedMusyrifIds.length === 0) {
      appAlert("Silakan pilih minimal 1 musyrif peserta yang diundang.", "Peringatan", "warning");
      return;
    }

    let finalLocationName = "";
    let finalLat: number | undefined;
    let finalLng: number | undefined;
    let finalRadius: number | undefined;

    if (selectedVenueId === "custom") {
      finalLocationName = customVenueName.trim() || "Ruang Pertemuan Muallimin";
      finalLat = -7.801194;
      finalLng = 110.353889;
      finalRadius = 250;
    } else {
      const venue = PREDEFINED_AGENDA_VENUES.find(v => v.id === selectedVenueId) || PREDEFINED_AGENDA_VENUES[0];
      finalLocationName = venue.name;
      finalLat = venue.lat;
      finalLng = venue.lng;
      finalRadius = venue.radius;
    }

    const agendaRecord: AgendaRapatRecord = {
      id: editingAgenda ? editingAgenda.id : `agenda_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      locationName: finalLocationName,
      locationLat: finalLat,
      locationLng: finalLng,
      locationRadius: finalRadius,
      invitedMusyrifIds: selectedMusyrifIds,
      targetScope,
      targetAsramaList: targetScope === "asrama" ? selectedAsramaList : undefined,
      notes: notes.trim(),
      createdBy: authUser?.id || authUser?.email || "Koordinator",
      createdByName: authUser?.name || "Koordinator Musyrif",
      createdByRole: authUser?.role || "koordinator_musyrif",
      createdAt: editingAgenda ? editingAgenda.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveAgenda(agendaRecord);
    setViewMode("list");
    triggerHaptic("medium");
    appAlert(
      `Agenda "${agendaRecord.title}" berhasil diterbitkan langsung ke logbook ${selectedMusyrifIds.length} musyrif yang diundang.`,
      "Agenda Berhasil Diterbitkan",
      "success"
    );
  };

  const handleDelete = async (ag: AgendaRapatRecord) => {
    const ok = await appConfirm(
      `Yakin ingin menghapus agenda "${ag.title}"? Tugas agenda ini otomatis akan ditarik dari seluruh logbook musyrif yang diundang.`,
      "Hapus Agenda Rapat",
      { type: "danger", confirmText: "Ya, Hapus", cancelText: "Batal" }
    );
    if (ok) {
      onDeleteAgenda(ag.id);
      triggerHaptic("medium");
      appAlert("Agenda rapat berhasil dihapus.", "Terhapus", "info");
    }
  };

  // Helper: Attendance check stats
  const getAgendaAttendanceStats = (ag: AgendaRapatRecord) => {
    const totalInvited = ag.invitedMusyrifIds.length;
    let checkedInCount = 0;
    const taskKey = `agenda_${ag.id}`;

    ag.invitedMusyrifIds.forEach(mId => {
      const musyrifDayLogbook = logbookData[mId]?.[ag.date];
      if (musyrifDayLogbook && musyrifDayLogbook[taskKey]?.done) {
        checkedInCount++;
      }
    });

    return { totalInvited, checkedInCount, pct: totalInvited > 0 ? Math.round((checkedInCount / totalInvited) * 100) : 0 };
  };

  // =========================================================================
  // VIEW: ATTENDANCE MONITORING PAGE
  // =========================================================================
  if (viewMode === "attendance" && selectedAgendaForAttendance) {
    const ag = selectedAgendaForAttendance;
    const stats = getAgendaAttendanceStats(ag);
    const catConfig = AGENDA_CATEGORIES.find(c => c.id === ag.category) || AGENDA_CATEGORIES[0];

    const attendanceList = ag.invitedMusyrifIds.map(mId => {
      const m = musyrifList.find(item => item.id === mId) || { id: mId, name: "Musyrif", asrama: "-", kamar: "" };
      const taskKey = `agenda_${ag.id}`;
      const dayLogbook = logbookData[mId]?.[ag.date];
      const taskEntry = dayLogbook?.[taskKey];
      const isDone = Boolean(taskEntry?.done);
      const photoUrl = taskEntry?.photoUrl;
      const completedAt = taskEntry?.completedAt || "-";
      const gpsVerified = Boolean(taskEntry?.gpsVerified);

      return {
        musyrif: m,
        isDone,
        photoUrl,
        completedAt,
        gpsVerified,
        notes: taskEntry?.notes
      };
    });

    const filteredAttendanceList = attendanceList.filter(item => {
      if (attendanceFilter === "hadir") return item.isDone;
      if (attendanceFilter === "belum") return !item.isDone;
      return true;
    });

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="Kembali ke Daftar Agenda"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Rincian Presensi Peserta
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    {catConfig.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                  {ag.title} • {format(parseISO(ag.date), "EEEE, dd MMMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-2xl">
                {stats.checkedInCount} / {stats.totalInvited} Hadir
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Agenda Info Overview Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{ag.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Diterbitkan oleh: <strong>{ag.createdByName || "Koordinator"}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {ag.startTime} – {ag.endTime} WIB
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{format(parseISO(ag.date), "dd MMMM yyyy", { locale: id })}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">{ag.locationName}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50">
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{stats.totalInvited} Musyrif Diundang</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Persentase Kehadiran Mandiri:</span>
                <span className="font-mono text-emerald-700">{stats.pct}% ({stats.checkedInCount} dari {stats.totalInvited} Musyrif)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter Attendance Tabs */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setAttendanceFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  attendanceFilter === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Undangan ({attendanceList.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter("hadir")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  attendanceFilter === "hadir" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sudah Hadir ({stats.checkedInCount})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter("belum")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  attendanceFilter === "belum" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Belum Hadir ({stats.totalInvited - stats.checkedInCount})
              </button>
            </div>
          </div>

          {/* Attendees List Grid */}
          <div className="space-y-3">
            {filteredAttendanceList.map(item => (
              <div
                key={item.musyrif.id}
                className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  item.isDone
                    ? "bg-white border-emerald-200/80 shadow-xs ring-1 ring-emerald-100"
                    : "bg-white border-slate-100 shadow-sm ring-1 ring-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setActivePhotoPreview({
                        url: item.photoUrl!,
                        musyrifName: item.musyrif.name,
                        title: ag.title,
                        time: item.completedAt
                      })}
                      className="relative group shrink-0 w-13 h-13 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xs cursor-pointer"
                    >
                      <img src={item.photoUrl} alt="Bukti Presensi" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      {item.musyrif.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate">{item.musyrif.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{item.musyrif.asrama}{item.musyrif.kamar ? ` • Kmr ${item.musyrif.kamar}` : ""}</p>
                    {item.isDone && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Presensi {item.completedAt} WIB
                        </span>
                        {item.gpsVerified && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            ✓ Lokasi GPS Valid
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.isDone ? (
                    <span className="px-3.5 py-1.5 rounded-2xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Presensi Hadir
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      Belum Melakukan Presensi
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Photo Preview Inline Overlay (Zero modal) */}
        {activePhotoPreview && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActivePhotoPreview(null)}
          >
            <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between text-white p-2 border-b border-white/10 mb-2">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">{activePhotoPreview.musyrifName}</h4>
                  <p className="text-[10px] text-slate-400">{activePhotoPreview.title} • {activePhotoPreview.time} WIB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePhotoPreview(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img src={activePhotoPreview.url} alt="Bukti Hadir" className="w-full max-h-[72vh] object-contain rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: CREATION / EDITING FORM PAGE
  // =========================================================================
  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="Batal dan Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {editingAgenda ? "Edit Agenda Pertemuan" : "Buat Agenda Rapat Baru"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tugas logbook otomatis diterbitkan khusus untuk musyrif yang dipilih
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <form onSubmit={handleSaveForm} className="bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60 p-5 sm:p-7 space-y-6 text-left text-xs">
            {/* 1. Nama / Judul & Kategori */}
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-800 text-sm mb-1.5 block">
                  Nama / Judul Agenda Pertemuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Koordinasi Musyrif Asrama Pekanan / Pengajian Bulanan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1.5 block">Kategori Kegiatan</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {AGENDA_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                        category === cat.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Tanggal & Jam */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
              <div>
                <label className="font-bold text-slate-700 mb-1.5 block">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 shadow-2xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1.5 block">Jam Mulai</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 shadow-2xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1.5 block">Jam Selesai</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 shadow-2xs"
                />
              </div>
            </div>

            {/* 3. Lokasi / Venue GPS */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Titik Presensi Lokasi / Venue GPS <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 font-bold text-slate-800 shadow-2xs cursor-pointer"
              >
                {PREDEFINED_AGENDA_VENUES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Radius Verifikasi ~{v.radius}m)
                  </option>
                ))}
                <option value="custom">-- Ruangan / Titik Pertemuan Lainnya --</option>
              </select>

              {selectedVenueId === "custom" && (
                <input
                  type="text"
                  placeholder="Ketik nama spesifik ruangan atau titik pertemuan..."
                  value={customVenueName}
                  onChange={(e) => setCustomVenueName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 font-medium text-slate-800 shadow-2xs mt-2"
                />
              )}
            </div>

            {/* 4. Target Peserta Undangan (Bulk Presets + Multi-Asrama + By Name) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Daftar Undangan ({selectedMusyrifIds.length} Musyrif Terpilih)</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Gunakan preset kampus, gabungan asrama, atau centang perorangan.</p>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllMusyrifs}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-center"
                >
                  {selectedMusyrifIds.length === allowedMusyrifList.length ? "✕ Batalkan Semua" : "✓ Pilih Seluruh Musyrif"}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200/70">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Preset Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMusyrifIds(allowedMusyrifList.map(m => m.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMusyrifIds.length === allowedMusyrifList.length
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  🌟 Seluruh Musyrif ({allowedMusyrifList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const kampus1Ids = allowedMusyrifList
                      .filter(m => !m.asrama?.toLowerCase().includes("sedayu"))
                      .map(m => m.id);
                    setSelectedMusyrifIds(kampus1Ids);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  🏫 Seluruh Kampus Induk (Asrama 1–11)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sedayuIds = allowedMusyrifList
                      .filter(m => m.asrama?.toLowerCase().includes("sedayu"))
                      .map(m => m.id);
                    setSelectedMusyrifIds(sedayuIds);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  🌿 Seluruh Kampus 2 Sedayu
                </button>
              </div>

              {/* Multi-Asrama Toggle Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">Pilih Gabungan Asrama / Gedung (Multi-Select):</span>
                <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  {asramaList.map(asr => {
                    const asrMusyrifs = allowedMusyrifList.filter(m => m.asrama === asr);
                    if (asrMusyrifs.length === 0) return null;
                    const isAllAsrSelected = asrMusyrifs.every(m => selectedMusyrifIds.includes(m.id));

                    return (
                      <button
                        key={asr}
                        type="button"
                        onClick={() => {
                          const asrIds = asrMusyrifs.map(m => m.id);
                          if (isAllAsrSelected) {
                            setSelectedMusyrifIds(prev => prev.filter(id => !asrIds.includes(id)));
                          } else {
                            setSelectedMusyrifIds(prev => Array.from(new Set([...prev, ...asrIds])));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isAllAsrSelected
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        <span>{isAllAsrSelected ? "✓" : "+"} {asr}</span>
                        <span className="opacity-75 font-mono text-[10px]">({asrMusyrifs.length})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Individual Search & Checkbox List */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama musyrif atau asrama..."
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200/80 rounded-2xl p-2 space-y-1 bg-slate-50/50">
                  {allowedMusyrifList
                    .filter(m => {
                      if (!notesSearchQuery.trim()) return true;
                      const q = notesSearchQuery.toLowerCase();
                      return m.name.toLowerCase().includes(q) || m.asrama.toLowerCase().includes(q);
                    })
                    .map(m => {
                      const isChecked = selectedMusyrifIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleMusyrif(m.id)}
                          className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                            isChecked
                              ? "bg-blue-50 border border-blue-200 text-blue-900 font-bold"
                              : "bg-white border border-transparent text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold truncate">{m.name}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{m.asrama}{m.kamar ? ` • Kmr ${m.kamar}` : ""}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* 5. Catatan / Agenda Tambahan */}
            <div className="pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700 mb-1.5 block">Catatan / Pokok Pembahasan (Opsional)</label>
              <textarea
                rows={3}
                placeholder="Contoh: Pembahasan evaluasi santri izin, kedisiplinan shalat berjamaah, dan kebersihan asrama..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 font-medium text-slate-800 shadow-2xs resize-none"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingAgenda ? "Simpan Perubahan" : "Terbitkan Agenda ke Logbook"}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN AGENDA DASHBOARD LIST PAGE
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGoBack}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Agenda Rapat & Pertemuan Musyrif
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  Logbook Dinamis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan rapat & pengajian yang terinjeksi otomatis ke presensi logbook musyrif
              </p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Buat Agenda Baru</span>
              <span className="sm:hidden">Buat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Statistics Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400">Total Agenda</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-mono">{totalAgendas}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400">Mendatang / Aktif</p>
              <h3 className="text-lg sm:text-xl font-black text-emerald-700 font-mono">{upcomingCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400">Target Undangan</p>
              <h3 className="text-lg sm:text-xl font-black text-purple-800 font-mono">{allowedMusyrifList.length} <span className="text-xs font-normal text-slate-400">orang</span></h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400">Poin Pilar 3</p>
              <h3 className="text-lg sm:text-xl font-black text-amber-800 font-mono">+15 <span className="text-xs font-normal text-slate-400">/hadir</span></h3>
            </div>
          </div>
        </div>

        {/* Feature Explanation Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Presensi Mandiri Terverifikasi Lokasi GPS & Foto Langsung
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Koordinator Musyrif, Pamong, dan Koordinator Gedung tidak perlu lagi mengabsen manual. Agenda yang dibuat akan langsung terbit sebagai kartu tugas logbook khusus hanya pada musyrif yang diundang. Musyrif melakukan presensi mandiri dengan foto diri di venue acara.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <span className="px-3 py-1.5 rounded-2xl bg-white border border-blue-200 text-blue-800 text-[11px] font-bold shadow-2xs">
              ⚡ Terintegrasi 4 Pilar
            </span>
          </div>
        </div>

        {/* Filters, Tabs & Search Controls */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "upcoming"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Agenda Terjadwal ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("past")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "past"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Riwayat Lampau ({pastCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul, lokasi, atau pembuat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Kategori:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua
            </button>
            {AGENDA_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agendas Grid */}
        {filteredAgendas.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-2xs">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {activeTab === "upcoming" ? "Belum Ada Agenda Rapat Terjadwal" : "Belum Ada Riwayat Agenda Lampau"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {activeTab === "upcoming"
                ? "Jadwalkan rapat koordinasi, pengajian, briefing, atau evaluasi musyrif dengan klik tombol 'Buat Agenda Baru' di atas."
                : "Seluruh riwayat agenda pertemuan yang telah selesai akan diarsipkan di sini secara otomatis."}
            </p>
            {canManage && activeTab === "upcoming" && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-3 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-95 transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Buat Agenda Pertemuan Baru
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgendas.map((ag) => {
              const stats = getAgendaAttendanceStats(ag);
              const isTodayAgenda = isToday(parseISO(ag.date));
              const catConfig = AGENDA_CATEGORIES.find(c => c.id === ag.category) || AGENDA_CATEGORIES[0];

              return (
                <div
                  key={ag.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60 p-5 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                          {catConfig.label}
                        </span>
                        {isTodayAgenda && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500 text-white shadow-2xs animate-pulse">
                            Hari Ini
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-500">
                          Oleh: {ag.createdByName || "Koordinator"}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ag)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                            title="Edit Agenda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ag)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                            title="Hapus Agenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {ag.title}
                      </h3>
                      {ag.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {ag.notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800">{format(parseISO(ag.date), "EEEE, dd MMMM yyyy", { locale: id })}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Pukul {ag.startTime} – {ag.endTime} WIB</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="truncate">{ag.locationName}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>{ag.invitedMusyrifIds.length} Musyrif Diundang</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary Bar & Action */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">Presensi Mandiri Musyrif:</span>
                      <span className={stats.checkedInCount > 0 ? "text-emerald-700 font-mono" : "text-slate-400 font-mono"}>
                        {stats.checkedInCount} / {stats.totalInvited} Hadir ({stats.pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.pct === 100 ? "bg-emerald-600" : stats.pct > 50 ? "bg-blue-600" : "bg-amber-500"
                        }`}
                        style={{ width: `${stats.pct}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgendaForAttendance(ag);
                        setViewMode("attendance");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/80 hover:border-blue-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Lihat Rincian Kehadiran & Foto Bukti</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
