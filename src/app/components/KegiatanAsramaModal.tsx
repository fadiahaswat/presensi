import React, { useState } from "react";
import { 
  X, BookOpen, Users, Check, AlertCircle, 
  Calendar, ShieldCheck, Plus, Sparkles, Building2, Search
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  authUser: any;
}

const ACTIVITIES = [
  { id: "tahfidz", title: "Halaqah Tahfidz & Tasmi' Qur'an", icon: "📖", desc: "Setoran hafalan Al-Qur'an ba'da subuh / ashar" },
  { id: "kajian", title: "Kuliah / Kajian Asrama Ba'da Shalat", icon: "🕌", desc: "Kultum / Taklim kitab keasramaan" },
  { id: "apel", title: "Apel / Rapat Koordinasi Musyrif", icon: "📢", desc: "Briefing kedisiplinan pekanan musyrif & pamong" },
  { id: "piket", title: "Piket Kebersihan & Ronda Asrama", icon: "🧹", desc: "Pengecekan kebersihan kamar & ketertiban santri" },
];

export function KegiatanAsramaModal({
  onClose,
  musyrifList,
  asramaList,
  kegiatanRecords,
  onSaveKegiatan,
  authUser
}: KegiatanAsramaModalProps) {
  const [activeTab, setActiveTab] = useState<"input" | "riwayat">("input");
  const [selectedActivity, setSelectedActivity] = useState<string>("tahfidz");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedAsrama, setSelectedAsrama] = useState<string>(asramaList[0] || "1");
  const [notes, setNotes] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Attendance state for current form
  const [attendance, setAttendance] = useState<Record<string, "hadir" | "izin" | "sakit" | "alfa">>({});

  const filteredMusyrif = musyrifList
    .filter(m => m.asrama === selectedAsrama)
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

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

  const handleSave = () => {
    const actMeta = ACTIVITIES.find(a => a.id === selectedActivity);
    const recId = `${selectedActivity}_${selectedAsrama}_${selectedDate}`;
    
    // Fill default hadir if not set
    const finalAttendance = { ...attendance };
    filteredMusyrif.forEach(m => {
      if (!finalAttendance[m.id]) {
        finalAttendance[m.id] = "hadir";
      }
    });

    onSaveKegiatan({
      id: recId,
      activityType: selectedActivity as any,
      activityTitle: actMeta?.title || "Kegiatan Asrama",
      date: selectedDate,
      asrama: selectedAsrama,
      attendees: finalAttendance,
      notes: notes.trim() || undefined,
      markedBy: authUser?.name || "Pamong"
    });

    setActiveTab("riwayat");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-lg">
              🕌
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Presensi Kegiatan Non-Shalat</h3>
              <p className="text-[11px] text-emerald-100/80">Tahfidz, Kuliah Subuh, Apel, & Ronda Asrama</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200/80 flex gap-2">
          <button
            onClick={() => setActiveTab("input")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "input"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Input Presensi Agenda
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "riwayat"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Riwayat & Rekap Agenda</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {kegiatanRecords.length}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === "input" ? (
            <div className="space-y-4">
              
              {/* Activity Selector Carousel / Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITIES.map(act => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setSelectedActivity(act.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      selectedActivity === act.id
                        ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-2xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="text-xl mb-1">{act.icon}</div>
                    <h5 className="font-bold text-xs text-slate-800 leading-snug">{act.title}</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{act.desc}</p>
                  </button>
                ))}
              </div>

              {/* Filters (Date, Asrama) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" /> Tanggal Kegiatan
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-600" /> Pilih Asrama
                  </label>
                  <select
                    value={selectedAsrama}
                    onChange={(e) => setSelectedAsrama(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {asramaList.map(a => (
                      <option key={a} value={a}>Asrama {a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Actions (Tandai Semua) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Daftar Musyrif ({filteredMusyrif.length})</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMarkAll("hadir")}
                    className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    Semua Hadir
                  </button>
                  <button
                    onClick={() => handleMarkAll("izin")}
                    className="px-2.5 py-1 bg-blue-100/80 text-blue-800 text-[11px] font-bold rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Semua Izin
                  </button>
                </div>
              </div>

              {/* Musyrif Attendance List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredMusyrif.map((m, idx) => {
                  const currentStatus = attendance[m.id] || "hadir";
                  return (
                    <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{idx + 1}. {m.name}</div>
                        <div className="text-[10px] text-slate-500">Kamar {m.kamar}</div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-1">
                        {(["hadir", "izin", "sakit", "alfa"] as const).map(st => {
                          const isSel = currentStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(m.id, st)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                isSel
                                  ? st === "hadir"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : st === "izin"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : st === "sakit"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-rose-600 text-white shadow-xs"
                                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Catatan Kegiatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Materi kajian Bab Adab Tholabul Ilmi..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Presensi Agenda</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {kegiatanRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Belum ada riwayat kegiatan yang tersimpan.</p>
                </div>
              ) : (
                kegiatanRecords.map(rec => {
                  const actMeta = ACTIVITIES.find(a => a.id === rec.activityType);
                  const total = Object.keys(rec.attendees).length;
                  const hadirCount = Object.values(rec.attendees).filter(s => s === "hadir").length;

                  return (
                    <div key={rec.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{actMeta?.icon || "🕌"}</span>
                          <div>
                            <h4 className="font-bold text-slate-800">{rec.activityTitle}</h4>
                            <p className="text-[11px] text-slate-500">Asrama {rec.asrama} • {rec.date}</p>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {hadirCount}/{total} Hadir
                        </span>
                      </div>

                      {rec.notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 italic">
                          "{rec.notes}"
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-100">
                        <span>Pencatat: {rec.markedBy || "Pamong"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
