import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Check, Flame, Award, BookOpen, 
  Sparkles, Calendar, TrendingUp, Sun, Moon, Heart, ChevronRight, User, ShieldCheck, Eye, CheckCircle2,
  ChevronLeft, Sunrise, Sunset, BookMarked
} from "lucide-react";
import { format } from "date-fns";
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
  isPage = false,
  initialMusyrifId,
  initialDate
}: MutabaahYaumiyahModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const isPamongOrKoord = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";
  const isMusyrifUser = authUser?.role === "musyrif" || authUser?.role === "koordinator_gedung";
  const canEdit = isMusyrifUser || isPamongOrKoord;
  
  const activeMusyrifList = useMemo(() => {
    if (isKoordinator) {
      return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
    }
    return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
  }, [musyrifList, authUser, isKoordinator]);

  const isSupervisoryRole = authUser?.role === "pamong" || authUser?.role === "admin" || authUser?.role === "koordinator_musyrif";

  const defaultMusyrifId = initialMusyrifId 
    ? initialMusyrifId 
    : isSupervisoryRole 
      ? "" 
      : (authUser?.musyrifId || authUser?.id || activeMusyrifList[0]?.id || "");
  
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (initialMusyrifId) {
      setSelectedMusyrifId(initialMusyrifId);
    }
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialMusyrifId, initialDate]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

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

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const toggleField = (field: keyof Omit<MutabaahEntry, "tilawahPages">) => {
    if (!canEdit) return;
    if (selectedDate > todayStr && !isKoordinator) {
      appAlert("Tidak dapat mengisi atau mengubah amalan yaumiyah untuk tanggal di masa depan.", "Tanggal Masa Depan", "warning");
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

  const handleMarkAll = (done: boolean) => {
    if (!canEdit) return;
    if (selectedDate > todayStr && !isKoordinator) {
      appAlert("Tidak dapat mengisi atau mengubah amalan yaumiyah untuk tanggal di masa depan.", "Tanggal Masa Depan", "warning");
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
    if (selectedDate > todayStr && !isKoordinator) {
      appAlert("Tidak dapat menyimpan amalan yaumiyah untuk tanggal di masa depan.", "Tanggal Masa Depan", "warning");
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

  // Monthly summary for selected Musyrif (filtered by current selected month)
  const selectedMonthPrefix = selectedDate ? selectedDate.substring(0, 7) : format(new Date(), "yyyy-MM");
  const mEntries = mutabaahData[selectedMusyrifId] || {};
  const mRecords = Object.entries(mEntries)
    .filter(([dt]) => dt.startsWith(selectedMonthPrefix))
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
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-100 shadow-sm ring-1 ring-slate-200/60" 
          : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Kembali ke Dashboard"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-2xs ${
              isPage ? "bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
          <div>
            <h2 className={`font-black text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Mutaba'ah Yaumiyah Ibadah
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-400" : "text-slate-300"}`}>
              Pencatatan amalan sunnah, tilawah Al-Qur'an & dzikir harian
            </p>
          </div>
        </div>

        {isMusyrifUser && (
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{savedSuccess ? "Tersimpan!" : "Simpan"}</span>
          </button>
        )}
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
              value={selectedDate}
              max={todayStr}
              onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              {isMusyrifUser ? "Musyrif (Evaluasi Mandiri)" : "Musyrif yang Dipantau"}
            </label>
            {authUser?.role === "musyrif" ? (
              <div className="w-full text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-2xl px-3.5 py-2.5 font-bold truncate flex items-center gap-1.5 shadow-2xs">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{authUser?.name} ({asramaDisplay})</span>
              </div>
            ) : (
              <select
                value={selectedMusyrifId}
                onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)}
                className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800 outline-none cursor-pointer shadow-2xs"
              >
                {isSupervisoryRole && <option value="">-- Silakan Pilih Musyrif --</option>}
                {activeMusyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.asrama}{m.kamar ? ` - Kmr ${m.kamar}` : ""})</option>
                ))}
              </select>
            )}
          </div>
        </div>
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
              Silakan pilih salah satu musyrif binaan di bawah ini atau gunakan dropdown di atas untuk melihat lembar amalan mutaba'ah yaumiyah harian (Tahajjud, Dhuha, Rawatib, Tilawah, Dzikir, Puasa Sunnah, dll).
            </p>
          </div>

          {/* Quick Cards Grid */}
          <div className="pt-2 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar Musyrif Binaan:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {activeMusyrifList.map(m => {
                const mMutabaahToday = mutabaahData[m.id]?.[selectedDate];
                let pts = 0;
                if (mMutabaahToday) {
                  if (mMutabaahToday.tahajjud) pts += 5;
                  if (mMutabaahToday.dhuha) pts += 3;
                  if (mMutabaahToday.rawatib) pts += 3;
                  if (mMutabaahToday.tilawahPages > 0) pts += Math.min(mMutabaahToday.tilawahPages, 10);
                  if (mMutabaahToday.dzikirPagi) pts += 2;
                  if (mMutabaahToday.dzikirPetang) pts += 2;
                  if (mMutabaahToday.puasaSunnah) pts += 10;
                  if (mMutabaahToday.muthalaah) pts += 5;
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
                        pts > 0 ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {pts > 0 ? `${pts} Poin Amalan` : "Belum Mengisi"}
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

                {isMusyrifUser && (
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
            disabled={!canEdit}
            onClick={() => toggleField("tahajjud")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.tahajjud ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.tahajjud ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.tahajjud && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Dhuha */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("dhuha")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.dhuha ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.dhuha ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dhuha && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Rawatib */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("rawatib")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.rawatib ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.rawatib ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.rawatib && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Muthala'ah */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("muthalaah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.muthalaah ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.muthalaah ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.muthalaah && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Dzikir Pagi */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("dzikirPagi")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.dzikirPagi ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.dzikirPagi ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPagi && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Dzikir Petang */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("dzikirPetang")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.dzikirPetang ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.dzikirPetang ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPetang && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Puasa Sunnah */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggleField("puasaSunnah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all shadow-2xs ${
              entry.puasaSunnah ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200" : "border-slate-200/80 bg-white hover:border-slate-300"
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
              entry.puasaSunnah ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.puasaSunnah && <Check className="w-4 h-4" />}
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
                    onClick={() => setEntry(prev => ({ ...prev, tilawahPages: pages }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                      entry.tilawahPages === pages
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
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
