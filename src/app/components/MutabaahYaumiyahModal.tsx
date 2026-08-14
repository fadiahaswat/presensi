import React, { useState } from "react";
import { 
  X, Check, Flame, Award, BookOpen, 
  Sparkles, Calendar, TrendingUp, Sun, Moon, Heart, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  onSaveMutabaah
}: MutabaahYaumiyahModalProps) {
  const isMusyrifUser = authUser?.musyrifId;
  const initialMusyrifId = isMusyrifUser ? authUser.musyrifId : (musyrifList[0]?.id || "");
  
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(initialMusyrifId);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Retrieve existing or default
  const existingEntry = mutabaahData[selectedMusyrifId]?.[selectedDate] || DEFAULT_ENTRY;
  const [entry, setEntry] = useState<MutabaahEntry>(existingEntry);

  // Update form when musyrif or date changes
  const handleDateOrMusyrifChange = (newMusyrifId: string, newDate: string) => {
    setSelectedMusyrifId(newMusyrifId);
    setSelectedDate(newDate);
    const data = mutabaahData[newMusyrifId]?.[newDate] || DEFAULT_ENTRY;
    setEntry(data);
  };

  const toggleField = (field: keyof Omit<MutabaahEntry, "tilawahPages">) => {
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

  // Calculate completion percentage
  const totalItems = 7;
  let completed = 0;
  if (entry.tahajjud) completed++;
  if (entry.dhuha) completed++;
  if (entry.rawatib) completed++;
  if (entry.tilawahPages > 0) completed++;
  if (entry.dzikirPagi) completed++;
  if (entry.dzikirPetang) completed++;
  if (entry.puasaSunnah || entry.muthalaah) completed++;

  const scorePct = Math.round((completed / totalItems) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-lg">
              📿
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Mutaba'ah Yaumiyah Musyrif</h3>
              <p className="text-[11px] text-emerald-100/80">Pencatatan & Evaluasi Amalan Ibadah Harian</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & Musyrif Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/70 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" /> Tanggal
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateOrMusyrifChange(selectedMusyrifId, e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Musyrif</label>
              {authUser?.musyrifId && authUser?.role === "musyrif" ? (
                <div className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 truncate">
                  {musyrifList.find(m => m.id === selectedMusyrifId)?.name || "Musyrif"}
                </div>
              ) : (
                <select
                  value={selectedMusyrifId}
                  onChange={(e) => handleDateOrMusyrifChange(e.target.value, selectedDate)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {musyrifList.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.asrama})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Progress Banner */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                scorePct >= 80 ? "bg-emerald-100 text-emerald-800" : scorePct >= 50 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
              }`}>
                {scorePct}%
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {scorePct === 100 ? "🌟 Mumtaz! Amalan Lengkap" : scorePct >= 70 ? "👍 Jayyid Jiddan (Sangat Baik)" : "🌱 Tingkatkan Lagi Amalan"}
                </h4>
                <p className="text-[10px] text-slate-500">{completed} dari {totalItems} amalan terpenuhi hari ini</p>
              </div>
            </div>

            <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          
          {/* Qiyamul Lail */}
          <button
            type="button"
            onClick={() => toggleField("tahajjud")}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              entry.tahajjud ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm">
                🌙
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Qiyamul Lail & Witir</div>
                <div className="text-[10px] text-slate-500">Shalat Tahajjud di sepertiga malam terakhir</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center ${
              entry.tahajjud ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
            }`}>
              {entry.tahajjud && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Dhuha */}
          <button
            type="button"
            onClick={() => toggleField("dhuha")}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              entry.dhuha ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
                ☀️
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Shalat Dhuha</div>
                <div className="text-[10px] text-slate-500">Minimal 2 rakaat shalat dhuha</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center ${
              entry.dhuha ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
            }`}>
              {entry.dhuha && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Rawatib */}
          <button
            type="button"
            onClick={() => toggleField("rawatib")}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              entry.rawatib ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                🕌
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Shalat Sunnah Rawatib</div>
                <div className="text-[10px] text-slate-500">Qobliyah & Ba'diyah shalat fardhu</div>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border flex items-center justify-center ${
              entry.rawatib ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
            }`}>
              {entry.rawatib && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Tilawah */}
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">
                  📖
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Tilawah Al-Qur'an</div>
                  <div className="text-[10px] text-slate-500">Target minimal 1 juz / 10 lembar</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                {entry.tilawahPages} Halaman
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[0, 2, 5, 10, 20].map(pages => (
                <button
                  key={pages}
                  type="button"
                  onClick={() => setEntry(prev => ({ ...prev, tilawahPages: pages }))}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    entry.tilawahPages === pages
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {pages === 0 ? "0" : `${pages} Hal`}
                </button>
              ))}
            </div>
          </div>

          {/* Dzikir Pagi & Petang */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleField("dzikirPagi")}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                entry.dzikirPagi ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">🌅 Dzikir Pagi</div>
                <div className="text-[9px] text-slate-500">Ba'da Subuh</div>
              </div>
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                entry.dzikirPagi ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
              }`}>
                {entry.dzikirPagi && <Check className="w-3 h-3" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleField("dzikirPetang")}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                entry.dzikirPetang ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">🌇 Dzikir Petang</div>
                <div className="text-[9px] text-slate-500">Ba'da Ashar/Maghrib</div>
              </div>
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                entry.dzikirPetang ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
              }`}>
                {entry.dzikirPetang && <Check className="w-3 h-3" />}
              </div>
            </button>
          </div>

          {/* Puasa Sunnah & Muthala'ah Kitab */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleField("puasaSunnah")}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                entry.puasaSunnah ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">🌴 Puasa Sunnah</div>
                <div className="text-[9px] text-slate-500">Senin/Kamis/Bidh</div>
              </div>
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                entry.puasaSunnah ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
              }`}>
                {entry.puasaSunnah && <Check className="w-3 h-3" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleField("muthalaah")}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                entry.muthalaah ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">📚 Muthala'ah Kitab</div>
                <div className="text-[9px] text-slate-500">Membaca buku/kitab</div>
              </div>
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                entry.muthalaah ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
              }`}>
                {entry.muthalaah && <Check className="w-3 h-3" />}
              </div>
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-medium">
            {savedSuccess ? "✅ Amalan tersimpan rapi!" : "Data tersimpan otomatis di perangkat"}
          </span>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Mutaba'ah</span>
          </button>
        </div>

      </div>
    </div>
  );
}
