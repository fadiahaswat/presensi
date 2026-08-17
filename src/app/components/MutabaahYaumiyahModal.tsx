import React, { useState } from "react";
import { 
  X, Check, Flame, Award, BookOpen, 
  Sparkles, Calendar, TrendingUp, Sun, Moon, Heart, ChevronRight, User, ShieldCheck, Eye, CheckCircle2,
  ChevronLeft, Sunrise, Sunset, BookMarked
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

export interface MutabaahEntry {
  tahajjud: boolean;
  dhuha: boolean;
  rawatib: boolean;
  tilawahPages: number;
  dzikirPagi: boolean;
  dzikirPetang: boolean;
  puasaSunnah: boolean;
  muthalaah: boolean;
}

export type MutabaahStorage = Record<string, Record<string, MutabaahEntry>>; // musyrifId -> date -> entry

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
}

interface MutabaahYaumiyahModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  mutabaahData: MutabaahStorage;
  onSaveMutabaah: (musyrifId: string, date: string, entry: MutabaahEntry) => void;
  isPage?: boolean;
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
  isPage = false
}: MutabaahYaumiyahModalProps) {
  const isMusyrifUser = authUser?.role === "musyrif";
  const isPamongOrKoord = authUser?.role === "pamong" || authUser?.role === "koordinator_musyrif" || authUser?.role === "koordinator_gedung";
  
  const defaultMusyrifId = isMusyrifUser 
    ? (authUser?.musyrifId || authUser?.id || musyrifList[0]?.id || "") 
    : (musyrifList[0]?.id || "");
  
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(defaultMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form State
  const [entry, setEntry] = useState<MutabaahEntry>(() => {
    return mutabaahData[selectedMusyrifId]?.[selectedDate] || DEFAULT_ENTRY;
  });

  const handleDateOrMusyrifChange = (mId: string, date: string) => {
    setSelectedMusyrifId(mId);
    setSelectedDate(date);
    const existing = mutabaahData[mId]?.[date] || DEFAULT_ENTRY;
    setEntry(existing);
  };

  const toggleField = (field: keyof Omit<MutabaahEntry, "tilawahPages">) => {
    if (!isMusyrifUser) return;
    setEntry(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = () => {
    onSaveMutabaah(selectedMusyrifId, selectedDate, entry);
    setSavedSuccess(true);
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
                Mutaba'ah Yaumiyah Ibadah
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                isMusyrifUser ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {isMusyrifUser ? "Evaluasi Diri" : "Pantauan Pamong"}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Pencatatan amalan sunnah, tilawah Al-Qur'an & dzikir harian
            </p>
          </div>
        </div>

        {isMusyrifUser && (
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        )}
      </div>

      {/* Date & Musyrif Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Amalan
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              {isMusyrifUser ? "Musyrif (Evaluasi Mandiri)" : "Musyrif yang Dipantau"}
            </label>
            {isMusyrifUser ? (
              <div className="w-full text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-2 font-bold truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{authUser?.name} ({authUser?.asrama ? `Asrama ${authUser.asrama}` : "Musyrif"})</span>
              </div>
            ) : (
              <select
                value={selectedMusyrifId}
                onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                {musyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.asrama})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Progress Banner */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold font-mono ${
              scorePct >= 80 ? "bg-emerald-600 text-white" : scorePct >= 50 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}>
              <span className="text-xs">{scorePct}%</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                {scorePct >= 80 ? "Amalan Harian Sangat Baik" : scorePct >= 50 ? "Tercapai Cukup Baik" : "Tingkatkan Amalan Sunnah"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                <strong>{completedCount}</strong> dari <strong>{totalFields}</strong> amalan yaumiyah terlaksana
              </p>
            </div>
          </div>

          <div className="w-24 sm:w-32 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${scorePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tahajjud */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("tahajjud")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.tahajjud ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Qiyamul Lail & Witir</div>
                <div className="text-xs text-slate-500">Shalat Tahajjud di sepertiga malam</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.tahajjud ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.tahajjud && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Dhuha */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("dhuha")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.dhuha ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Shalat Dhuha</div>
                <div className="text-xs text-slate-500">Minimal 2 rakaat shalat dhuha</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.dhuha ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dhuha && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Rawatib */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("rawatib")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.rawatib ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Shalat Sunnah Rawatib</div>
                <div className="text-xs text-slate-500">Qabliyah & Ba'diyah fardhu</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.rawatib ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.rawatib && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Muthala'ah */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("muthalaah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.muthalaah ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <BookMarked className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Muthala'ah Kitab</div>
                <div className="text-xs text-slate-500">Membaca buku / kitab keislaman</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.muthalaah ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.muthalaah && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Dzikir Pagi */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("dzikirPagi")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.dzikirPagi ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sunrise className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Dzikir Pagi</div>
                <div className="text-xs text-slate-500">Dzikir matsurat ba'da Subuh</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.dzikirPagi ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPagi && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Dzikir Petang */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("dzikirPetang")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.dzikirPetang ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sunset className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Dzikir Petang</div>
                <div className="text-xs text-slate-500">Dzikir matsurat ba'da Ashar</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.dzikirPetang ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.dzikirPetang && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Puasa Sunnah */}
          <button
            type="button"
            disabled={!isMusyrifUser}
            onClick={() => toggleField("puasaSunnah")}
            className={`p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${
              entry.puasaSunnah ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200/70 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Puasa Sunnah</div>
                <div className="text-xs text-slate-500">Senin, Kamis, atau Ayyamul Bidh</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
              entry.puasaSunnah ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50"
            }`}>
              {entry.puasaSunnah && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Tilawah Target */}
          <div className="p-4 rounded-3xl border border-slate-200/70 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Tilawah Al-Qur'an</div>
                  <div className="text-xs text-slate-500">Capaian membaca Al-Qur'an</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                {entry.tilawahPages} Halaman
              </span>
            </div>

            {isMusyrifUser && (
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 2, 5, 10, 20].map(pages => (
                  <button
                    key={pages}
                    type="button"
                    onClick={() => setEntry(prev => ({ ...prev, tilawahPages: pages }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      entry.tilawahPages === pages
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
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
