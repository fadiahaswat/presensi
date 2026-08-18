import React, { useMemo, useState } from "react";
import { X, Search, Plus, UserPlus, Edit3, Trash2, Mail, Building2, ShieldCheck, CheckCircle2, ChevronLeft, Users } from "lucide-react";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

export interface Pamong {
  id: string;
  name: string;
  email: string;
  asrama?: string;
}

const DEFAULT_ASRAMAS = [
  "Asrama 1",
  "Asrama 8A",
  "Asrama 8B",
  "Asrama 8C",
  "Asrama 10",
  "Asrama Sedayu Gedung A",
  "Asrama Sedayu Gedung B",
  "Asrama Sedayu Gedung C",
  "Asrama Sedayu Gedung D",
];

interface PamongManagerModalProps {
  onClose: () => void;
  pamongList: Pamong[];
  asramaList?: string[];
  onAddPamong: (pamong: Omit<Pamong, "id">) => void;
  onUpdatePamong: (pamong: Pamong) => void;
  onDeletePamong: (id: string) => void;
  authUser?: { role?: string; name?: string; email?: string } | null;
  isPage?: boolean;
}

export function PamongManagerModal({
  onClose,
  pamongList = [],
  asramaList = DEFAULT_ASRAMAS,
  onAddPamong,
  onUpdatePamong,
  onDeletePamong,
  authUser,
  isPage = false
}: PamongManagerModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const activeAsramaList = (asramaList && asramaList.length > 0) ? asramaList : DEFAULT_ASRAMAS;
  const [activeTab, setActiveTab] = useState<"daftar" | "tambah">("daftar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [editingPamong, setEditingPamong] = useState<Pamong | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [asrama, setAsrama] = useState(activeAsramaList[0] || "Asrama 1");

  if (!isKoordinator) {
    const deniedContent = (
      <div className={`p-6 flex flex-col items-center justify-center text-center gap-4 ${isPage ? "max-w-md mx-auto py-16" : ""}`}>
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Akses Terbatas: Koordinator Musyrif</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Pengelolaan akun Master Pamong hanya dapat diakses oleh Koordinator Musyrif (Super Admin).
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
        >
          Kembali ke Dasbor
        </button>
      </div>
    );

    if (isPage) return deniedContent;

    return (
      <motion.div
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          variants={modalContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {deniedContent}
        </motion.div>
      </motion.div>
    );
  }

  const resetForm = () => {
    setName("");
    setEmail("");
    setAsrama(activeAsramaList[0] || "Asrama 1");
    setEditingPamong(null);
  };

  const handleStartEdit = (p: Pamong) => {
    setEditingPamong(p);
    setName(p.name);
    setEmail(p.email);
    setAsrama(p.asrama || activeAsramaList[0] || "Asrama 1");
    setActiveTab("tambah");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      alert("Nama pamong wajib diisi.");
      return;
    }
    if (!cleanEmail) {
      alert("Email pamong wajib diisi.");
      return;
    }

    if (editingPamong) {
      onUpdatePamong({
        ...editingPamong,
        name: cleanName,
        email: cleanEmail,
        asrama,
      });
      alert(`Data pamong "${cleanName}" berhasil diperbarui.`);
    } else {
      onAddPamong({
        name: cleanName,
        email: cleanEmail,
        asrama,
      });
      alert(`Pamong baru "${cleanName}" berhasil ditambahkan.`);
    }

    triggerHaptic("medium");
    resetForm();
    setActiveTab("daftar");
  };

  const filteredList = useMemo(() => {
    return pamongList.filter(p => {
      const matchAsrama = selectedAsrama === "all" || p.asrama === selectedAsrama;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.asrama && p.asrama.toLowerCase().includes(q));
      return matchAsrama && matchSearch;
    });
  }, [pamongList, selectedAsrama, searchQuery]);

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs"
          : "bg-indigo-800 text-white rounded-t-3xl sm:rounded-t-[28px]"
      }`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              isPage ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {isPage ? <ChevronLeft className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
                Master Data Pamong
              </h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                isPage ? "bg-indigo-100 text-indigo-800" : "bg-white/20 text-indigo-100"
              }`}>
                {pamongList.length} Pamong
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-indigo-100/90"}`}>
              Manajemen data pamong asrama (Search, Create, Read, Update, Delete)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (activeTab === "tambah") resetForm();
              setActiveTab("daftar");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "daftar"
                ? (isPage ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-indigo-900 shadow-xs")
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            Daftar ({filteredList.length})
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab("tambah");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "tambah"
                ? (isPage ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-indigo-900 shadow-xs")
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingPamong ? "Edit Data" : "Tambah"}</span>
          </button>
        </div>
      </div>

      {activeTab === "tambah" ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/70 shadow-xs space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              {editingPamong ? <Edit3 className="w-4 h-4 text-amber-600" /> : <UserPlus className="w-4 h-4 text-indigo-600" />}
              <h3 className="font-bold text-sm">
                {editingPamong ? `Edit Data: ${editingPamong.name}` : "Formulir Pamong Baru"}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Ahmad Fauzi, S.Pd."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Login Google *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Contoh: pamong@muallimin.sch.id"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Asrama Tugas *</label>
              <select
                value={asrama}
                onChange={e => setAsrama(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
              >
                {activeAsramaList.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { resetForm(); setActiveTab("daftar"); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingPamong ? "Simpan Perubahan" : "Simpan Data Pamong"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 pb-6 max-h-[75vh] overflow-y-auto pr-1">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama pamong, email, atau asrama..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
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
              <button
                type="button"
                onClick={() => setSelectedAsrama("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedAsrama === "all"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Asrama ({pamongList.length})
              </button>
              {activeAsramaList.map(asr => {
                const count = pamongList.filter(p => p.asrama === asr).length;
                return (
                  <button
                    key={asr}
                    type="button"
                    onClick={() => setSelectedAsrama(asr)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedAsrama === asr
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {asr} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Data Pamong</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {searchQuery || selectedAsrama !== "all"
                  ? "Tidak ada data pamong yang cocok dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada pamong yang terdaftar di sistem."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-3 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{p.name}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                            {p.asrama || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        title="Edit Data Pamong"
                        className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-all active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menghapus pamong "${p.name}" dari sistem?`)) {
                            onDeletePamong(p.id);
                            triggerHaptic("medium");
                          }
                        }}
                        title="Hapus Pamong"
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">Asrama: <strong className="text-slate-800">{p.asrama || "-"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-slate-700">Role: <strong>pamong</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80"
        variants={modalContentVariants}
        onClick={e => e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
