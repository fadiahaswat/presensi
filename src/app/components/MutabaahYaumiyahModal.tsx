import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X, Check, Flame, Award, BookOpen,
  Sparkles, Calendar, TrendingUp, Sun, Moon, Heart, ChevronRight, User, ShieldCheck, Eye, CheckCircle2,
  ChevronLeft, Sunrise, Sunset, BookMarked, Lock, ClipboardList, Search, ChevronDown
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert, appConfirm } from "../utils/customDialog";

export interface MutabaahEntry {
  tahajjud: boolean;
  dhuha: boolean;
  rawatib: boolean;
  tilawahPages: number;
  dzikirPagi: boolean;
  dzikirPetang: boolean;
  puasaSunnah: boolean;
  muthalaah: boolean;
  updatedAt?: string;
}

export type MutabaahStorage = Record<string, Record<string, MutabaahEntry>>; // musyrifId -> date -> entry

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  role?: string;
}

interface MutabaahYaumiyahModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  mutabaahData: MutabaahStorage;
  onSaveMutabaah: (musyrifId: string, date: string, entry: MutabaahEntry) => void;
  onResetMutabaah?: (musyrifId: string, date: string) => void;
  onOpenLogbook?: () => void;
  isPage?: boolean;
  initialMusyrifId?: string;
  initialDate?: string;
}

const DEFAULT_ENTRY: MutabaahEntry = {
  tahajjud: false,
  dhuha: false,
  rawatib: false,
  tilawahPages: 0,
  dzikirPagi: false,
  dzikirPetang: false,
  puasaSunnah: false,
  muthalaah: false,
};

export function MutabaahYaumiyahModal({
  onClose,
  authUser,
  musyrifList,
  mutabaahData,
  onSaveMutabaah,
  onResetMutabaah,
  onOpenLogbook,
  isPage = false,
  initialMusyrifId,
  initialDate
}: MutabaahYaumiyahModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isPamong = authUser?.role === "pamong";
  const isAdmin = authUser?.role === "admin";
  const isSpecialBypassUser = Boolean(
    authUser?.email?.toLowerCase().includes("andiaqillah@muallimin.sch.id") ||
    authUser?.email?.toLowerCase().includes("afifnashrul") ||
    authUser?.name?.toLowerCase().includes("afif nashrul") ||
    authUser?.musyrifId === "m2" ||
    authUser?.id === "m2"
  );
  const isCanBypass = isPamong || isKoordinator || isAdmin || isSpecialBypassUser;
  const isMusyrifUser = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";
  const canEdit = isMusyrifUser || isCanBypass;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), "yyyy-MM-dd"));
  const isDateLocked = selectedDate !== todayStr && !isCanBypass && !isKoorGedung;

  const activeMusyrifList = useMemo(() => {
    // Pamong, Koordinator Musyrif, Admin: lihat semua musyrif
    if (isPamong || isAdmin) {
      return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    }
    if (isKoordinator || isSpecialBypassUser) {
      return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    }
    // Koor Gedung: hanya lihat musyrif di asramanya
    if (isKoorGedung) {
      return musyrifList.filter(m => m.asrama === authUser.asrama);
    }
    // Default: semua musyrif
    return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
  }, [musyrifList, authUser, isKoordinator, isPamong, isAdmin, isKoorGedung, isSpecialBypassUser]);

  const isSupervisoryRole = authUser?.role === "pamong" || authUser?.role === "admin" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";

  const defaultMusyrifId = initialMusyrifId 
    ? initialMusyrifId 
    : isSupervisoryRole 
      ? "" 
      : (authUser?.musyrifId || authUser?.id || activeMusyrifList[0]?.id || "");
  
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);

  const selectedMusyrif = useMemo(() => {
    return activeMusyrifList.find(m => m.id === selectedMusyrifId) || null;
  }, [activeMusyrifList, selectedMusyrifId]);

  useEffect(() => {
    if (initialMusyrifId) {
      setSelectedMusyrifId(initialMusyrifId);
    }
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialMusyrifId, initialDate]);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Searchable Musyrif Dropdown state
  const [isMusyrifDropdownOpen, setIsMusyrifDropdownOpen] = useState(false);
  const [musyrifSearchQuery, setMusyrifSearchQuery] = useState("");
  const musyrifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (musyrifDropdownRef.current && !musyrifDropdownRef.current.contains(event.target as Node)) {
        setIsMusyrifDropdownOpen(false);
      }
    };
    if (isMusyrifDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMusyrifDropdownOpen]);

  const filteredDropdownMusyrifList = useMemo(() => {
    if (!musyrifSearchQuery.trim()) return activeMusyrifList;
    const q = musyrifSearchQuery.toLowerCase();
    return activeMusyrifList.filter(m =>
      (m.name || "").toLowerCase().includes(q) ||
      (m.asrama || "").toLowerCase().includes(q) ||
      (m.kamar || "").toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q)
    );
  }, [activeMusyrifList, musyrifSearchQuery]);

  // Form State
  const [entry, setEntry] = useState<MutabaahEntry>(() => {
    return selectedMusyrifId ? (mutabaahData[selectedMusyrifId]?.[selectedDate] || DEFAULT_ENTRY) : DEFAULT_ENTRY;
  });

  // Keep form in sync when props/cloud data, musyrif, or date changes
  useEffect(() => {
    const existing = selectedMusyrifId ? (mutabaahData[selectedMusyrifId]?.[selectedDate] || DEFAULT_ENTRY) : DEFAULT_ENTRY;
    setEntry(existing);
  }, [mutabaahData, selectedMusyrifId, selectedDate]);

  const handleDateOrMusyrifChange = (mId: string, date: string) => {
    setSelectedMusyrifId(mId);
    setSelectedDate(date);
    const existing = mutabaahData[mId]?.[date] || DEFAULT_ENTRY;
    setEntry(existing);
  };

  const toggleField = (field: keyof Omit<MutabaahEntry, "tilawahPages">) => {
    if (!canEdit) return;
    // Koor Gedung hanya bisa mengisi untuk hari ini (bukan tanggal lampau)
    if (selectedDate !== todayStr && !isCanBypass && !isKoorGedung) {
      appAlert("Pengisian amalan mutaba'ah hanya dapat dilakukan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
      return;
    }
    const updated: MutabaahEntry = {
      ...entry,
      [field]: !entry[field],
      updatedAt: new Date().toISOString()
    };
    setEntry(updated);
    // Instant Auto-Save & Cloud Sync
    onSaveMutabaah(selectedMusyrifId, selectedDate, updated);
  };

  const handleTilawahChange = (pages: number) => {
    if (!canEdit) return;
    // Koor Gedung hanya bisa mengisi untuk hari ini (bukan tanggal lampau)
    if (selectedDate !== todayStr && !isCanBypass && !isKoorGedung) {
      appAlert("Pengisian amalan mutaba'ah hanya dapat dilakukan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
      return;
    }
    const updated: MutabaahEntry = {
      ...entry,
      tilawahPages: pages,
      updatedAt: new Date().toISOString()
    };
    setEntry(updated);
    onSaveMutabaah(selectedMusyrifId, selectedDate, updated);
  };

  const handleMarkAll = (done: boolean) => {
    if (!canEdit) return;
    // Koor Gedung hanya bisa mengisi untuk hari ini (bukan tanggal lampau)
    if (selectedDate !== todayStr && !isCanBypass && !isKoorGedung) {
      appAlert("Pengisian amalan mutaba'ah hanya dapat dilakukan pada tanggal hari ini. Tanggal lampau terkunci otomatis.", "Tanggal Terkunci", "warning");
      return;
    }
    const updated: MutabaahEntry = {
      tahajjud: done,
      dhuha: done,
      rawatib: done,
      tilawahPages: done ? (entry.tilawahPages || 2) : 0,
      dzikirPagi: done,
      dzikirPetang: done,
      puasaSunnah: done,
      muthalaah: done,
      updatedAt: new Date().toISOString()
    };
    setEntry(updated);
    onSaveMutabaah(selectedMusyrifId, selectedDate, updated);
  };

  const handleResetToday = async () => {
    if (!canEdit) return;
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Pengosongan amalan hanya dapat dilakukan pada tanggal hari ini.", "Tanggal Terkunci", "warning");
      return;
    }
    const ok = await appConfirm(
      `Yakin ingin mengosongkan/reset catatan amalan mutaba'ah tanggal ${selectedDate}?`,
      "Reset Mutaba'ah",
      { type: "danger", confirmText: "Ya, Reset", cancelText: "Batal" }
    );
    if (ok) {
      setEntry(DEFAULT_ENTRY);
      if (onResetMutabaah) {
        onResetMutabaah(selectedMusyrifId, selectedDate);
      } else {
        onSaveMutabaah(selectedMusyrifId, selectedDate, DEFAULT_ENTRY);
      }
      triggerHaptic("medium");
      appAlert("Catatan amalan mutaba'ah berhasil di-reset.", "Reset Selesai", "info");
    }
  };

  const handleSave = () => {
    if (selectedDate !== todayStr && !isCanBypass) {
      appAlert("Penyimpanan amalan mutaba'ah untuk tanggal lampau terkunci secara otomatis.", "Tanggal Terkunci", "warning");
      return;
    }
    onSaveMutabaah(selectedMusyrifId, selectedDate, { ...entry, updatedAt: new Date().toISOString() });
    setSavedSuccess(true);
    triggerHaptic("medium");
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Metrics
  let completedCount = 0;
  if (entry.tahajjud) completedCount++;
  if (entry.dhuha) completedCount++;
  if (entry.rawatib) completedCount++;
  if (entry.tilawahPages > 0) completedCount++;
  if (entry.dzikirPagi) completedCount++;
  if (entry.dzikirPetang) completedCount++;
  if (entry.puasaSunnah) completedCount++;
  if (entry.muthalaah) completedCount++;

  const totalFields = 8;
  const scorePct = Math.round((completedCount / totalFields) * 100);

  // Monthly summary for selected Musyrif (filtered by current selected month & starting from 18 Agustus 2026)
  const selectedMonthPrefix = selectedDate ? selectedDate.substring(0, 7) : format(new Date(), "yyyy-MM");
  const mEntries = mutabaahData[selectedMusyrifId] || {};
  const mRecords = Object.entries(mEntries)
    .filter(([dt]) => dt >= "2026-08-18" && dt.startsWith(selectedMonthPrefix))
    .map(([_, r]) => r);
  const monthlyTahajjud = mRecords.filter(r => r.tahajjud).length;
  const monthlyDhuha = mRecords.filter(r => r.dhuha).length;
  const monthlyPuasa = mRecords.filter(r => r.puasaSunnah).length;
  const monthlyTilawahTotal = mRecords.reduce((acc, r) => acc + (r.tilawahPages || 0), 0);

  const asramaDisplay = authUser?.asrama
    ? (authUser.asrama.toLowerCase().includes("asrama") ? authUser.asrama : `Asrama ${authUser.asrama}`)
    : "Musyrif";

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
        isPage
          ? "bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60"
          : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Kembali ke Dashboard"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-2xs shrink-0 ${
                isPage ? "bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
            </button>
            <div className="min-w-0">
              <h2 className={`font-black text-base sm:text-lg leading-tight truncate ${isPage ? "text-slate-900" : "text-white"}`}>
                Mutaba'ah Yaumiyah Ibadah
              </h2>
              <p className={`text-xs mt-0.5 truncate ${isPage ? "text-slate-400" : "text-slate-300"}`}>
                Pencatatan amalan sunnah, tilawah Al-Qur'an & dzikir harian (Mulai 18 Agustus 2026)
              </p>
            </div>
          </div>

          {isMusyrifUser && (
            <button
              type="button"
              onClick={handleSave}
              className="sm:hidden px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? "Tersimpan!" : "Simpan"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:shrink-0 w-full sm:w-auto">
          {/* Segmented Logbook / Mutabaah Toggle */}
          {onOpenLogbook && isPage && (
            <div className="grid grid-cols-2 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner w-full sm:w-60">
              <button
                type="button"
                onClick={onOpenLogbook}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white/40"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Logbook</span>
              </button>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 bg-rose-500 text-white shadow-sm shadow-rose-500/25 scale-[1.01]"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Mutabaah</span>
              </button>
            </div>
          )}

          {isMusyrifUser && (
            <button
              type="button"
              onClick={handleSave}
              className="hidden sm:flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs items-center gap-1.5 active:scale-95 transition-all shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? "Tersimpan!" : "Simpan"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Date & Musyrif Controls & Progress */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Amalan
            </label>
            <input
              type="date"
              min="2026-08-18"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              {authUser?.role === "musyrif" ? "Musyrif (Evaluasi Mandiri)" : authUser?.role === "koordinator_gedung" ? "Musyrif Asrama" : "Musyrif yang Dipantau"}
            </label>
            {authUser?.role === "musyrif" ? (
              <div className="w-full text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-2xl px-3.5 py-2.5 font-bold truncate flex items-center gap-1.5 shadow-2xs">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{authUser?.name} ({asramaDisplay})</span>
              </div>
            ) : (
              <div className="relative" ref={musyrifDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMusyrifDropdownOpen(!isMusyrifDropdownOpen);
                    setMusyrifSearchQuery("");
                  }}
                  className="w-full text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 flex items-center justify-between gap-2 shadow-2xs transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {selectedMusyrif
                        ? `${selectedMusyrif.name} (${selectedMusyrif.asrama}${selectedMusyrif.kamar ? ` - Kmr ${selectedMusyrif.kamar}` : ""})`
                        : "-- Silakan Pilih Musyrif --"}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isMusyrifDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isMusyrifDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-72">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={musyrifSearchQuery}
                          onChange={(e) => setMusyrifSearchQuery(e.target.value)}
                          placeholder="Cari nama musyrif atau asrama..."
                          className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                          autoFocus
                        />
                        {musyrifSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMusyrifSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto divide-y divide-slate-50 p-1">
                      {isSupervisoryRole && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDateOrMusyrifChange("", selectedDate);
                            setIsMusyrifDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            !selectedMusyrifId ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <span>-- Silakan Pilih Musyrif --</span>
                          {!selectedMusyrifId && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      )}

                      {filteredDropdownMusyrifList.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Tidak ada musyrif yang cocok dengan "{musyrifSearchQuery}"
                        </div>
                      ) : (
                        filteredDropdownMusyrifList.map(m => {
                          const isSelected = m.id === selectedMusyrifId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                handleDateOrMusyrifChange(m.id, selectedDate);
                                setIsMusyrifDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                                isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-bold text-slate-800">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {m.asrama}{m.kamar ? ` · Kamar ${m.kamar}` : ""}{m.role ? ` · ${m.role}` : ""}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mode Read-Only Alert Banner for Non-Bypass Users on Past/Future Dates */}
        {isDateLocked && (
          <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="leading-tight">
              <strong>Mode Riwayat (Hanya Baca):</strong> Anda sedang melihat tanggal lampau ({format(parseISO(selectedDate), "dd MMMM yyyy", { locale: id })}). Pengisian dan perubahan amalan mutaba'ah hanya dapat dilakukan pada tanggal hari ini.
            </p>
          </div>
        )}
      </div>

      {/* Empty State when no musyrif is selected */}
      {!selectedMusyrif ? (
        <div className="bg-gradient-to-b from-purple-50/70 via-white to-slate-50 border border-purple-100/80 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 ring-8 ring-purple-50">
            <Sparkles className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center text-xs font-black shadow-xs ring-2 ring-white">
              <Heart className="w-4 h-4 text-rose-700" />
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100/80 text-purple-800 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Mode Pantau & Pengawasan
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
              Pilih Musyrif Terlebih Dahulu
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Silakan pilih salah satu musyrif dari daftar di atas untuk memantau capaian amalan sunnah, tilawah Al-Qur'an, dan dzikir harian.
            </p>
          </div>

          {/* Quick Musyrif Selector Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Daftar Musyrif Asrama:</span>
              <span className="text-[10px] text-slate-400 font-medium">Klik musyrif untuk membuka mutaba'ah</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-left">
              {activeMusyrifList.map(m => {
                const mMutabaahToday = mutabaahData[m.id]?.[selectedDate];
                let todayDoneCount = 0;
                if (mMutabaahToday) {
                  if (mMutabaahToday.tahajjud) todayDoneCount++;
                  if (mMutabaahToday.dhuha) todayDoneCount++;
                  if (mMutabaahToday.rawatib) todayDoneCount++;
                  if (mMutabaahToday.tilawahPages > 0) todayDoneCount++;
                  if (mMutabaahToday.dzikirPagi) todayDoneCount++;
                  if (mMutabaahToday.dzikirPetang) todayDoneCount++;
                  if (mMutabaahToday.puasaSunnah) todayDoneCount++;
                  if (mMutabaahToday.muthalaah) todayDoneCount++;
                }
                
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleDateOrMusyrifChange(m.id, selectedDate)}
                    className="group p-3.5 rounded-2xl bg-white hover:bg-purple-50/60 border border-slate-200/80 hover:border-purple-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple-800 truncate">{m.name}</h4>
                        <span className="text-[10px] text-slate-400 block truncate">{m.asrama}{m.kamar ? ` • Kmr ${m.kamar}` : ""}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        todayDoneCount > 0 ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {todayDoneCount > 0 ? `${todayDoneCount}/${totalFields} Amalan` : "Belum Mengisi"}
                      </span>
                      <span className="text-[11px] font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Buka ➔
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm ring-1 ring-slate-200/60 space-y-4">
            {/* Progress Banner & Quick Actions */}
            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center font-black font-mono shadow-2xs ${
                    scorePct >= 80 ? "bg-emerald-600 text-white" : scorePct >= 50 ? "bg-emerald-100 text-emerald-900 border border-emerald-200/80" : "bg-amber-100 text-amber-900 border border-amber-200/80"
                  }`}>
                    <span className="text-xs">{scorePct}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {scorePct >= 80 ? "Amalan Harian Sangat Baik ✓" : scorePct >= 50 ? "Tercapai Cukup Baik" : "Tingkatkan Amalan Sunnah"}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <strong>{completedCount}</strong> dari <strong>{totalFields}</strong> amalan yaumiyah terlaksana
                    </p>
                  </div>
                </div>

                {isMusyrifUser && !isDateLocked && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMarkAll(true)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold active:scale-95 transition-all shadow-2xs"
                    >
                      Tandai Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToday}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-slate-600 rounded-xl text-[11px] font-bold active:scale-95 transition-all shadow-2xs"
                    >
                      Reset Amalan
                    </button>
                  </div>
                )}
              </div>

              {/* Full-width clean progress bar */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${scorePct}%` }}
                />
              </div>
            </div>

        {/* Monthly Summary 4 Cards Harmonized */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-indigo-700 mb-1">
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Tahajjud</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">{monthlyTahajjud}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">hari</span>
          </div>

          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-amber-700 mb-1">
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Dhuha</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">{monthlyDhuha}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">hari</span>
          </div>

          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-emerald-700 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Tilawah</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">{monthlyTilawahTotal}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">halaman</span>
          </div>

          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center transition-all shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-teal-700 mb-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Puasa Sunnah</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">{monthlyPuasa}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">hari</span>
          </div>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tahajjud */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("tahajjud")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.tahajjud ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Qiyamul Lail & Witir</div>
                <div className="text-xs text-slate-500 mt-0.5">Shalat Tahajjud di sepertiga malam</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.tahajjud ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.tahajjud ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Dhuha */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("dhuha")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.dhuha ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Shalat Dhuha</div>
                <div className="text-xs text-slate-500 mt-0.5">Minimal 2 rakaat shalat dhuha</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.dhuha ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dhuha ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Rawatib */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("rawatib")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.rawatib ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Shalat Sunnah Rawatib</div>
                <div className="text-xs text-slate-500 mt-0.5">Qabliyah & Ba'diyah fardhu</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.rawatib ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.rawatib ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Muthala'ah */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("muthalaah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.muthalaah ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <BookMarked className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Muthala'ah Kitab</div>
                <div className="text-xs text-slate-500 mt-0.5">Membaca buku / kitab keislaman</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.muthalaah ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.muthalaah ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Dzikir Pagi */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("dzikirPagi")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.dzikirPagi ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Sunrise className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Dzikir Pagi</div>
                <div className="text-xs text-slate-500 mt-0.5">Dzikir matsurat ba'da Subuh</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.dzikirPagi ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPagi ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Dzikir Petang */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("dzikirPetang")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.dzikirPetang ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Sunset className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Dzikir Petang</div>
                <div className="text-xs text-slate-500 mt-0.5">Dzikir matsurat ba'da Ashar</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.dzikirPetang ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPetang ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Puasa Sunnah */}
          <button
            type="button"
            disabled={!canEdit || isDateLocked}
            onClick={() => toggleField("puasaSunnah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              isDateLocked ? "opacity-75 cursor-not-allowed bg-slate-50/70 border-slate-200" :
              entry.puasaSunnah ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200 active:scale-[0.98] cursor-pointer" : "border-slate-200/80 bg-white hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">Puasa Sunnah</div>
                <div className="text-xs text-slate-500 mt-0.5">Senin, Kamis, atau Ayyamul Bidh</div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              entry.puasaSunnah ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : isDateLocked ? "border-slate-200 bg-slate-100 text-slate-300" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.puasaSunnah ? <Check className="w-4 h-4" /> : isDateLocked ? <Lock className="w-3 h-3 text-slate-400" /> : null}
            </div>
          </button>

          {/* Tilawah Target */}
          <div className="p-4 rounded-3xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">Tilawah Al-Qur'an</div>
                  <div className="text-xs text-slate-500 mt-0.5">Capaian membaca Al-Qur'an</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl font-mono">
                {entry.tilawahPages} Halaman
              </span>
            </div>

            {canEdit && (
              <div className="flex items-center gap-1.5 pt-0.5">
                {[0, 2, 5, 10, 20].map(pages => (
                  <button
                    key={pages}
                    type="button"
                    disabled={isDateLocked}
                    onClick={() => handleTilawahChange(pages)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                      isDateLocked
                        ? "opacity-60 cursor-not-allowed bg-slate-50 text-slate-400 border border-slate-200"
                        : entry.tilawahPages === pages
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    {pages === 0 ? "0" : `${pages} Hal`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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
