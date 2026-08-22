import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Plus, HeartPulse, Bed, Stethoscope, Building2, Home, CheckCircle2, 
  Trash2, AlertCircle, Search, Filter, Share2, Calendar, User, Phone,
  ChevronLeft, Sparkles, Send, Edit3, UserCheck, Copy, Check
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { searchSantri, getSantriForMusyrif, SantriData } from "../data/santriData";
import { appAlert } from "../utils/customDialog";
import { getPamongAssignedAsramas } from "../utils/roleAccessUtils";

export interface SantriSakitRecord {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama: string;
  kamar: string;
  date: string;
  namaSantri: string;
  kelasSantri: string;
  keluhan: string;
  lokasiPerawatan: "kamar" | "uks" | "rs_pku" | "pulang";
  catatanTindakan?: string;
  status: "dalam_perawatan" | "sembuh";
  createdAt: string;
}

interface Musyrif {
  id: string;
  name: string;
  asrama: string;
  kamar: string;
  kelas: string;
  tingkat?: string;
}

interface SantriSakitModalProps {
  onClose: () => void;
  authUser: any;
  musyrifList: Musyrif[];
  santriList?: SantriData[];
  santriSakitList: SantriSakitRecord[];
  onSaveSantriSakit: (record: SantriSakitRecord) => void;
  onUpdateStatus: (id: string, newStatus: "dalam_perawatan" | "sembuh") => void;
  onDeleteSantriSakit: (id: string) => void;
  isPage?: boolean;
}

export function SantriSakitModal({
  onClose,
  authUser,
  musyrifList,
  santriList,
  santriSakitList,
  onSaveSantriSakit,
  onUpdateStatus,
  onDeleteSantriSakit,
  isPage = false
}: SantriSakitModalProps) {
  const isPublic = !authUser;
  const isKoor = authUser?.role === "koordinator_musyrif";
  const isPamong = authUser?.role === "pamong";
  const isMusyrif = authUser?.role === "musyrif";
  const isKoorGedung = authUser?.role === "koordinator_gedung";
  const isMusyrifUser = isMusyrif || isKoorGedung;
  const isClassScoped = isMusyrif || isKoorGedung; // hanya bisa lihat santri kelasnya/asramanya
  const isScopedRole = isPamong || isClassScoped;
  const userAsramaSakit = authUser?.asrama || "all";
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterAsrama, setFilterAsrama] = useState<string>(isScopedRole && authUser?.asrama ? authUser.asrama : "all");
  const [filterStatus, setFilterStatus] = useState<"all" | "dalam_perawatan" | "sembuh">("dalam_perawatan");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCatatanText, setEditCatatanText] = useState<string>("");
  const [editingRecord, setEditingRecord] = useState<SantriSakitRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeMusyrifList = useMemo(() => {
    return musyrifList.filter(m => !m.role || m.role === "musyrif" || m.role === "koordinator_gedung");
  }, [musyrifList]);

  // Form State
  const defaultMusyrif = isMusyrifUser 
    ? (musyrifList.find(m => m.id === (authUser?.musyrifId || authUser?.id) || (m.email && authUser?.email && m.email.toLowerCase() === authUser.email.toLowerCase())) || activeMusyrifList[0] || musyrifList[0])
    : (activeMusyrifList[0] || musyrifList[0]);

  const [formMusyrifId, setFormMusyrifId] = useState(defaultMusyrif?.id || "");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formNama, setFormNama] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formKelas, setFormKelas] = useState(defaultMusyrif?.kelas || "");
  const [formKamar, setFormKamar] = useState(""); // Default kamar selalu kosong
  const [formKeluhan, setFormKeluhan] = useState("");
  const [formLokasi, setFormLokasi] = useState<"kamar" | "uks" | "rs_pku" | "pulang">("kamar");
  const [formCatatan, setFormCatatan] = useState("");

  useEffect(() => {
    if (defaultMusyrif && !editingRecord) {
      setFormMusyrifId(defaultMusyrif.id);
      setFormKelas(defaultMusyrif.kelas || "");
      setFormKamar(""); // Default kosong, musyrif isi manual
    }
  }, [defaultMusyrif, editingRecord]);

  const currentMusyrifObj = useMemo(() => {
    return musyrifList.find(m => m.id === formMusyrifId) || defaultMusyrif;
  }, [musyrifList, formMusyrifId, defaultMusyrif]);

  // Scoped students of this musyrif's class
  const classStudents = useMemo(() => {
    if (!currentMusyrifObj?.kelas) return [];
    return getSantriForMusyrif(undefined, undefined, currentMusyrifObj.kelas, santriList);
  }, [currentMusyrifObj, santriList]);

  // Real-time per-letter suggestion search
  const santriSuggestions = useMemo(() => {
    const q = formNama.trim().toLowerCase();
    if (!q) {
      return classStudents.slice(0, 20);
    }
    // Filter matching students in current musyrif's class first
    const inClassMatches = classStudents.filter(s => 
      s.nama.toLowerCase().includes(q) ||
      (s.nis && s.nis.includes(q)) ||
      (s.nisn && s.nisn.includes(q))
    );
    // Broader search in database
    const broaderMatches = searchSantri(q, 20, santriList).filter(s => !inClassMatches.some(m => m.id === s.id));
    return [...inClassMatches, ...broaderMatches].slice(0, 20);
  }, [formNama, classStudents, santriList]);

  const handleSelectSantri = (santri: SantriData) => {
    setFormNama(santri.nama);
    setFormKelas(santri.kelasLengkap);
    setSelectedStudentId(santri.id);
    setShowSuggestions(false);
    // If admin or pamong selects a santri from another class, auto-match the musyrif of that class if not locked
    if (!isMusyrifUser) {
      const matchM = musyrifList.find(m => m.kelas && m.kelas.toLowerCase() === santri.kelasLengkap.toLowerCase());
      if (matchM) {
        setFormMusyrifId(matchM.id);
      }
    }
  };

  const resetForm = () => {
    setFormMusyrifId(defaultMusyrif?.id || "");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormNama("");
    setSelectedStudentId("");
    setFormKelas(defaultMusyrif?.kelas || "");
    setFormKamar(""); // Default kamar kosong
    setFormKeluhan("");
    setFormLokasi("kamar");
    setFormCatatan("");
    setEditingRecord(null);
    setShowAddForm(false);
    setShowSuggestions(false);
  };

  const handleStartEdit = (rec: SantriSakitRecord) => {
    setEditingRecord(rec);
    setFormMusyrifId(rec.musyrifId);
    setFormDate(rec.date);
    setFormNama(rec.namaSantri);
    setFormKelas(rec.kelasSantri);
    setFormKamar(rec.kamar || "");
    setFormKeluhan(rec.keluhan);
    setFormLokasi(rec.lokasiPerawatan);
    setFormCatatan(rec.catatanTindakan || "");
    setShowAddForm(true);
    setShowSuggestions(false);
  };

  const getGedungOrAsramaName = (asramaName?: string) => {
    if (!asramaName) return "-";
    if (asramaName.includes("Gedung A")) return "A";
    if (asramaName.includes("Gedung B")) return "B";
    if (asramaName.includes("Gedung C")) return "C";
    if (asramaName.includes("Gedung D")) return "D";
    return asramaName;
  };

  const generateWAFormat = (item: SantriSakitRecord | SantriSakitRecord[]) => {
    const list = Array.isArray(item) ? item : [item];
    if (list.length === 0) return "";

    const parsedDate = list[0]?.date ? new Date(list[0].date) : new Date();
    const dateFormatted = format(parsedDate, "EEEE dd/MM/yy", { locale: id });
    const asramaTitle = list[0]?.asrama?.includes("Sedayu") ? "Asrama Sedayu" : (list[0]?.asrama || "Asrama");

    let text = `بسم الله الرحمن الرحيم\nالسلام عليكم ورحمة الله وبركاته\n\n`;
    text += `Izin melaporkan ananda yang sakit di ${asramaTitle} *(${dateFormatted})*\n\n`;

    if (list.length === 1) {
      const s = list[0];
      text += `Nama     : ${s.namaSantri}\n`;
      text += `Kelas      : ${s.kelasSantri}\n`;
      text += `Kamar    : ${s.kamar || "-"}\n`;
      text += `Keluhan  : ${s.keluhan}\n`;
      text += `Gedung  : ${getGedungOrAsramaName(s.asrama)}\n`;
      if (s.lokasiPerawatan === "uks") {
        text += `Lokasi    : Poskestren\n`;
      } else if (s.lokasiPerawatan === "rs_pku") {
        text += `Lokasi    : RS PKU Jogja\n`;
      } else if (s.lokasiPerawatan === "pulang") {
        text += `Lokasi    : Izin Pulang\n`;
      }
      if (s.catatanTindakan) {
        text += `Tindakan: ${s.catatanTindakan}\n`;
      }
    } else {
      // Multiple students (misal 1 kelas ada beberapa santri sakit)
      list.forEach((s, idx) => {
        text += `${idx + 1}. *${s.namaSantri}*\n`;
        text += `    Kelas      : ${s.kelasSantri}\n`;
        text += `    Kamar    : ${s.kamar || "-"}\n`;
        text += `    Keluhan  : ${s.keluhan}\n`;
        text += `    Gedung  : ${getGedungOrAsramaName(s.asrama)}\n`;
        if (s.lokasiPerawatan === "uks") {
          text += `    Lokasi    : Poskestren\n`;
        } else if (s.lokasiPerawatan === "rs_pku") {
          text += `    Lokasi    : RS PKU Jogja\n`;
        } else if (s.lokasiPerawatan === "pulang") {
          text += `    Lokasi    : Izin Pulang\n`;
        }
        if (s.catatanTindakan) {
          text += `    Tindakan: ${s.catatanTindakan}\n`;
        }
        text += `\n`;
      });
    }

    text += `\nSyukron umi dan team 🙏😊`;
    return text;
  };

  const handleCopyWA = async (record: SantriSakitRecord) => {
    const text = generateWAFormat(record);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 2500);
      triggerHaptic("light");
      appAlert("Format laporan santri sakit berhasil disalin ke clipboard! Siap di-paste ke WhatsApp.", "Tersalin!", "success");
    } catch {
      appAlert("Gagal menyalin teks. Silakan coba lagi.", "Peringatan", "warning");
    }
  };

  const handleShareSingleWA = (record: SantriSakitRecord) => {
    const text = generateWAFormat(record);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKeluhan.trim()) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (formDate > todayStr) {
      appAlert("Tanggal pemeriksaan santri sakit tidak dapat dicatat untuk tanggal di masa depan.", "Tanggal Tidak Valid", "warning");
      return;
    }

    const selectedM = musyrifList.find(m => m.id === formMusyrifId) || defaultMusyrif;

    const recordToSave: SantriSakitRecord = {
      id: editingRecord ? editingRecord.id : `sakit-${Date.now()}`,
      musyrifId: selectedM.id,
      musyrifName: selectedM.name,
      asrama: selectedM.asrama,
      kamar: formKamar.trim(),
      date: formDate,
      namaSantri: formNama.trim(),
      kelasSantri: formKelas,
      keluhan: formKeluhan.trim(),
      lokasiPerawatan: formLokasi,
      catatanTindakan: formCatatan.trim(),
      status: editingRecord ? editingRecord.status : "dalam_perawatan",
      createdAt: editingRecord ? editingRecord.createdAt : format(new Date(), "yyyy-MM-dd HH:mm")
    };

    onSaveSantriSakit(recordToSave);
    triggerHaptic("medium");
    appAlert(
      editingRecord ? "Data santri sakit berhasil diperbarui." : "Catatan santri sakit berhasil ditambahkan. Anda dapat langsung menyalin laporan untuk dikirim ke WA.", 
      "Berhasil Disimpan", 
      "success"
    );
    resetForm();
  };

  // Filtered List — scope by role first
  const pamongAsramas = useMemo(() => authUser ? getPamongAssignedAsramas(authUser) : [], [authUser]);
  const isSuperAdmin = authUser?.role === "koordinator_musyrif" || authUser?.role === "kaur_kis" || authUser?.role === "wadir4" || authUser?.role === "admin";

  const filteredList = useMemo(() => {
    return santriSakitList.filter(item => {
      // Role-based scoping
      if (isPamong) {
        if (pamongAsramas.length > 0) {
          if (!pamongAsramas.includes(item.asrama) && !pamongAsramas.some(pa => item.asrama.toLowerCase().includes(pa.toLowerCase()))) return false;
        } else if (authUser?.asrama && item.asrama !== authUser.asrama) {
          return false;
        }
      } else if (isKoorGedung) {
        if (authUser?.asrama && item.asrama !== authUser.asrama) return false;
      } else if (isMusyrif) {
        const isMyRoomOrClass = item.musyrifId === (authUser?.musyrifId || authUser?.id) || 
          (authUser?.kelas && item.kelasSantri === authUser.kelas) ||
          (authUser?.kamar && item.kamar === authUser.kamar);
        if (!isMyRoomOrClass) return false;
      }
      // superadmin & public → semua santri sakit

      const matchAsrama = filterAsrama === "all" || item.asrama === filterAsrama;
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch = searchQuery === "" || 
        (item.namaSantri || "").toLowerCase().includes(q) ||
        (item.keluhan || "").toLowerCase().includes(q) ||
        (item.kamar || "").toLowerCase().includes(q);
      return matchAsrama && matchStatus && matchSearch;
    }).sort((a, b) => {
      const timeA = a.createdAt || a.date || "";
      const timeB = b.createdAt || b.date || "";
      if (timeA && timeB && timeA !== timeB) return timeB.localeCompare(timeA);
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [santriSakitList, isPamong, pamongAsramas, authUser, isKoorGedung, isMusyrif, filterAsrama, filterStatus, searchQuery]);

  const activeSickCount = (() => {
    const active = santriSakitList.filter(s => s.status === "dalam_perawatan");
    if (isPamong) {
      if (pamongAsramas.length > 0) {
        return active.filter(s => pamongAsramas.includes(s.asrama) || pamongAsramas.some(pa => s.asrama.toLowerCase().includes(pa.toLowerCase()))).length;
      }
      return active.filter(s => s.asrama === authUser?.asrama).length;
    }
    if (isKoorGedung) return active.filter(s => s.asrama === authUser?.asrama).length;
    if (isMusyrif) return active.filter(s => s.musyrifId === (authUser?.musyrifId || authUser?.id) || (authUser?.kelas && s.kelasSantri === authUser.kelas)).length;
    return active.length; // koor/all
  })();

  const getLocationBadge = (loc: string) => {
    switch (loc) {
      case "uks":
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 text-amber-600"/> Poskestren</span>;
      case "rs_pku":
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-rose-600"/> RS PKU Jogja</span>;
      case "pulang":
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-purple-600"/> Izin Pulang</span>;
      default:
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Bed className="w-3.5 h-3.5 text-blue-600"/> Kamar Asrama</span>;
    }
  };

  const handleShareWA = () => {
    const targetList = filteredList.filter(s => s.status === "dalam_perawatan");
    const listToShare = targetList.length > 0 ? targetList : santriSakitList.filter(s => s.status === "dalam_perawatan");
    
    if (listToShare.length === 0) {
      appAlert("Tidak ada santri yang sedang dirawat untuk dilaporkan.", "Info", "info");
      return;
    }
    
    const text = generateWAFormat(listToShare);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-slate-900 text-white rounded-t-3xl sm:rounded-t-[28px]"
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
              Pantauan Santri Sakit
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-slate-300"}`}>
              Pencatatan medis santri & tindak lanjut asrama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {santriSakitList.length > 0 && (
            <button
              type="button"
              onClick={handleShareWA}
              aria-label="Kirim Laporan ke WhatsApp"
              title="Kirim laporan santri sakit langsung ke WhatsApp"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0C4E8C] font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-sky-200"
            >
              <Send className="w-3.5 h-3.5 text-[#0C81E4]" />
              <span className="hidden sm:inline">Kirim WA</span>
            </button>
          )}
          {!isPublic && (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (editingRecord) setEditingRecord(null);
              }}
              className="px-3 sm:px-3.5 py-2 bg-[#0C81E4] hover:bg-[#0C4E8C] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">{showAddForm ? "Tutup" : "Catat Sakit"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form Card */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-200/80 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm">
                {editingRecord ? `Edit Data Santri Sakit: ${editingRecord.namaSantri}` : "Formulir Pemeriksaan Santri Sakit"}
              </h3>
            </div>
            {editingRecord && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 mb-0 block">Nama Lengkap Santri</label>
                <span className="text-[10px] text-emerald-600 font-medium">Ketik nama untuk cari</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ketik nama atau NIS santri..."
                  value={formNama}
                  onChange={(e) => {
                    setFormNama(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                {formNama && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormNama("");
                      setSelectedStudentId("");
                      setShowSuggestions(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showSuggestions && santriSuggestions.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSuggestions(false)} 
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium sticky top-0">
                      <span>Ditemukan {santriSuggestions.length} santri</span>
                      <span>Klik untuk pilih</span>
                    </div>
                    {santriSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSantri(s)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{s.nama}</p>
                          <p className="text-[10px] text-slate-400">NIS: {s.nis || "-"} • {s.kabupaten || s.provinsi || s.asalMts || ""}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0 ml-2">
                          {s.kelasLengkap}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 block">Kelas / Tingkat</label>
                <span className="text-[10px] text-emerald-600 font-medium">Terisi otomatis</span>
              </div>
              <input
                type="text"
                required
                placeholder="Contoh: 1 B / 4 A"
                value={formKelas}
                onChange={(e) => setFormKelas(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 block">Kamar Asrama</label>
                <span className="text-[10px] text-rose-500 font-medium">Diisi manual</span>
              </div>
              <input
                type="text"
                placeholder="Contoh: Kamar 104"
                value={formKamar}
                onChange={(e) => setFormKamar(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Lokasi Perawatan</label>
              <select
                value={formLokasi}
                onChange={(e: any) => setFormLokasi(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="kamar">Kamar Asrama</option>
                <option value="uks">Poskestren (UKS)</option>
                <option value="rs_pku">RS PKU Jogja</option>
                <option value="pulang">Izin Pulang ke Rumah</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 block">Musyrif Pendamping</label>
                {isMusyrifUser && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                    Terkunci
                  </span>
                )}
              </div>
              <select
                value={formMusyrifId}
                onChange={(e) => {
                  const newMid = e.target.value;
                  setFormMusyrifId(newMid);
                  const mObj = musyrifList.find(m => m.id === newMid);
                  if (mObj) {
                    setFormKelas(mObj.kelas || "");
                  }
                }}
                disabled={isMusyrifUser}
                className={`w-full text-xs rounded-xl px-3 py-2.5 font-medium border outline-none cursor-pointer ${
                  isMusyrifUser 
                    ? "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
              >
                {activeMusyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.asrama}{m.kelas ? ` • ${m.kelas}` : ""})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Keluhan & Gejala</label>
            <input
              type="text"
              required
              placeholder="Contoh: Demam 38°C sejak malam, pusing dan batuk"
              value={formKeluhan}
              onChange={(e) => setFormKeluhan(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Tindakan / Obat Diberikan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Diberi paracetamol 500mg, kompres hangat, istirahat di Poskestren"
              value={formCatatan}
              onChange={(e) => setFormCatatan(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              Simpan Data Santri Sakit
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama santri, keluhan, atau kamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {isClassScoped ? (
              <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span>Kelas</span>
                <span className="font-mono">{musyrifList.find(m => m.id === (authUser?.musyrifId || authUser?.id))?.kelas || authUser?.asrama || "-"}</span>
              </span>
            ) : (
              <select
                value={filterAsrama}
                onChange={(e) => setFilterAsrama(e.target.value)}
                disabled={isPamong}
                className={`text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none ${isPamong ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {!isPamong && <option value="all">Semua Asrama</option>}
                <option value="Asrama 1">Asrama 1</option>
                <option value="Asrama 8A">Asrama 8A</option>
                <option value="Asrama 8B">Asrama 8B</option>
                <option value="Asrama 8C">Asrama 8C</option>
                <option value="Asrama 10">Asrama 10</option>
                <option value="Asrama Sedayu Gedung A">Sedayu Gedung A</option>
                <option value="Asrama Sedayu Gedung B">Sedayu Gedung B</option>
                <option value="Asrama Sedayu Gedung C">Sedayu Gedung C</option>
                <option value="Asrama Sedayu Gedung D">Sedayu Gedung D</option>
              </select>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterStatus("dalam_perawatan")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === "dalam_perawatan" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dirawat
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("sembuh")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === "sembuh" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sembuh
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List Records */}
      <div className="space-y-3 pb-6">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Data Santri Sakit</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {filterStatus === "dalam_perawatan" 
                ? "Alhamdulillah, tidak ada catatan santri yang sedang dirawat pada kategori ini."
                : "Tidak ditemukan catatan medis yang sesuai dengan filter pencarian Anda."}
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div 
              key={item.id}
              className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs transition-all ${
                item.status === "dalam_perawatan" 
                  ? "border-rose-200 ring-1 ring-rose-50" 
                  : "border-slate-200/70 opacity-90"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    item.status === "dalam_perawatan" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{item.namaSantri}</h4>
                      {(item.date === format(new Date(), "yyyy-MM-dd") || (item.createdAt && item.createdAt.startsWith(format(new Date(), "yyyy-MM-dd")))) && (
                        <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs animate-pulse flex items-center gap-0.5">
                          Baru
                        </span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                        Kelas {item.kelasSantri}
                      </span>
                      {getLocationBadge(item.lokasiPerawatan)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {item.asrama}{item.kamar ? ` · Kamar ${item.kamar}` : ""} · Musyrif: {item.musyrifName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  {/* Tombol Kirim WA Satuan */}
                  <button
                    type="button"
                    onClick={() => handleShareSingleWA(item)}
                    title="Kirim laporan santri ini langsung ke WhatsApp"
                    className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </button>

                  {!isPublic && (
                    <>
                      {item.status === "dalam_perawatan" ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(item.id, "sembuh")}
                          className="px-3 py-1.5 rounded-xl bg-[#0C81E4] hover:bg-[#0C4E8C] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Sembuh</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(item.id, "dalam_perawatan")}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                          <span>Kembalikan Dirawat</span>
                        </button>
                      )}

                      {(() => {
                        const canEditDelete = isSuperAdmin ||
                          (isPamong && (pamongAsramas.length > 0 ? (pamongAsramas.includes(item.asrama) || pamongAsramas.some(pa => item.asrama.toLowerCase().includes(pa.toLowerCase()))) : item.asrama === authUser?.asrama)) ||
                          (isKoorGedung && item.asrama === authUser?.asrama) ||
                          (isMusyrif && (
                            item.musyrifId === authUser?.id || 
                            item.musyrifId === authUser?.musyrifId || 
                            (authUser?.kelas && item.kelasSantri === authUser.kelas) ||
                            (authUser?.kamar && item.kamar === authUser.kamar)
                          ));
                        return canEditDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              title="Edit Data Santri Sakit"
                              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 flex items-center justify-center transition-all active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteSantriSakit(item.id)}
                              aria-label="Hapus Catatan Medis"
                              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  <span className="text-slate-500 font-semibold">Keluhan: </span>
                  {item.keluhan}
                </p>
                {/* Edit inline update tindakan medis */}
                {editingId === item.id ? (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                    <label className="text-[11px] font-bold text-slate-700">Perbarui Tindakan Medis / Catatan Perkembangan:</label>
                    <textarea
                      rows={2}
                      value={editCatatanText}
                      onChange={e => setEditCatatanText(e.target.value)}
                      placeholder="Tulis perkembangan kondisi santri atau rujukan dokter..."
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveSantriSakit({
                            ...item,
                            catatanTindakan: editCatatanText.trim()
                          });
                          setEditingId(null);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        Simpan Perkembangan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Dicatat: {item.createdAt}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditCatatanText(item.catatanTindakan || "");
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline font-sans"
                      >
                        + Update Tindakan
                      </button>
                      <span className={item.status === "dalam_perawatan" ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                        {item.status === "dalam_perawatan" ? "Sedang Dirawat" : "Sembuh"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
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
