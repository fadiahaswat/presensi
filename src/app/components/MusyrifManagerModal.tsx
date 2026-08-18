import React, { useState, useMemo } from "react";
import { 
  X, Search, Plus, UserPlus, Edit3, Trash2, Phone, Mail, 
  Building2, Bed, GraduationCap, User, ShieldCheck, CheckCircle2,
  ChevronLeft, Sparkles, MessageCircle, AlertCircle, Users, ArrowUpDown,
  Crown, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

export type MusyrifRole = "musyrif" | "pamong" | "koordinator_gedung" | "koordinator_musyrif";

export interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  pamong?: string;
  email?: string;
  phone?: string;
  photo?: string;
  role?: MusyrifRole;
}

const ROLE_CONFIG: Record<MusyrifRole, { label: string; badge: string; desc: string; icon: string }> = {
  musyrif: {
    label: "Musyrif",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "Musyrif Kamar / Asrama (Presensi, Mutabaah Yaumiyah, Jurnal Logbook)",
    icon: "🏢"
  },
  pamong: {
    label: "Pamong Asrama",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    desc: "Pamong Asrama (Approval Perizinan Santri, Verifikasi Logbook, Monitoring Asrama)",
    icon: "🛡️"
  },
  koordinator_gedung: {
    label: "Koord. Gedung",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    desc: "Koordinator Asrama / Gedung (Monitoring Multi-Asrama & Wilayah)",
    icon: "🏛️"
  },
  koordinator_musyrif: {
    label: "Koord. Musyrif",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    desc: "Koordinator Musyrif (Super Admin / Akses Penuh Seluruh Asrama & Pengaturan)",
    icon: "⭐"
  }
};

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

interface MusyrifManagerModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  asramaList?: string[];
  onAddMusyrif: (musyrif: Omit<Musyrif, "id">) => void;
  onUpdateMusyrif: (musyrif: Musyrif) => void;
  onDeleteMusyrif: (id: string) => void;
  authUser?: any;
  isPage?: boolean;
}

export function MusyrifManagerModal({
  onClose,
  musyrifList = [],
  asramaList = DEFAULT_ASRAMAS,
  onAddMusyrif,
  onUpdateMusyrif,
  onDeleteMusyrif,
  authUser,
  isPage = false
}: MusyrifManagerModalProps) {
  const isKoordinator = authUser?.role === "koordinator_musyrif";
  const userAsrama = authUser?.asrama;
  const activeAsramaList = (asramaList && asramaList.length > 0) ? asramaList : DEFAULT_ASRAMAS;
  const [activeTab, setActiveTab] = useState<"daftar" | "tambah">("daftar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsrama, setSelectedAsrama] = useState<string>(!isKoordinator && userAsrama ? userAsrama : "all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [editingMusyrif, setEditingMusyrif] = useState<Musyrif | null>(null);

  // Form State for Add / Edit
  const [name, setName] = useState("");
  const [role, setRole] = useState<MusyrifRole>("musyrif");
  const [kelas, setKelas] = useState("1 A");
  const [tingkat, setTingkat] = useState("Kelas 1");
  const [asrama, setAsrama] = useState(!isKoordinator && userAsrama ? userAsrama : (activeAsramaList[0] || "Asrama 1"));
  const [kamar, setKamar] = useState("1 A");
  const [pamong, setPamong] = useState(!isKoordinator && authUser?.name ? authUser.name : "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const resetForm = () => {
    setName("");
    setRole("musyrif");
    setKelas("1 A");
    setTingkat("Kelas 1");
    setAsrama(!isKoordinator && userAsrama ? userAsrama : (activeAsramaList[0] || "Asrama 1"));
    setKamar("1 A");
    setPamong(!isKoordinator && authUser?.name ? authUser.name : "");
    setEmail("");
    setPhone("");
    setEditingMusyrif(null);
  };

  const handleStartEdit = (m: Musyrif) => {
    setEditingMusyrif(m);
    setName(m.name);
    setRole((m.role as MusyrifRole) || "musyrif");
    setKelas(m.kelas || "");
    setTingkat(m.tingkat || "Kelas 1");
    setAsrama(m.asrama || (!isKoordinator && userAsrama ? userAsrama : activeAsramaList[0]));
    setKamar(m.kamar || "");
    setPamong(m.pamong || (!isKoordinator && authUser?.name ? authUser.name : ""));
    setEmail(m.email || "");
    setPhone(m.phone || "");
    setActiveTab("tambah");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama lengkap wajib diisi.");
      return;
    }

    if (editingMusyrif) {
      onUpdateMusyrif({
        ...editingMusyrif,
        name: name.trim(),
        role: role,
        kelas: kelas.trim(),
        tingkat: tingkat.trim(),
        asrama,
        kamar: kamar.trim(),
        pamong: pamong.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim().replace(/\D/g, "") || undefined,
      });
      triggerHaptic("medium");
      alert(`Data "${name.trim()}" (${ROLE_CONFIG[role]?.label || role}) berhasil diperbarui.`);
    } else {
      onAddMusyrif({
        name: name.trim(),
        role: role,
        kelas: kelas.trim(),
        tingkat: tingkat.trim(),
        asrama,
        kamar: kamar.trim(),
        pamong: pamong.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim().replace(/\D/g, "") || undefined,
      });
      triggerHaptic("medium");
      alert(`Personel baru "${name.trim()}" (${ROLE_CONFIG[role]?.label || role}) berhasil ditambahkan ke ${asrama}.`);
    }

    resetForm();
    setActiveTab("daftar");
  };

  // Filtered List (Search by Name, Role, Kamar, Kelas, Phone, Email, Asrama)
  const filteredList = useMemo(() => {
    return musyrifList.filter(m => {
      if (!m) return false;
      const mRole = m.role || "musyrif";
      const matchRole = selectedRole === "all" || mRole === selectedRole;
      const matchAsrama = selectedAsrama === "all" || m.asrama === selectedAsrama;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.asrama && m.asrama.toLowerCase().includes(q)) ||
        (m.kamar && m.kamar.toLowerCase().includes(q)) ||
        (m.kelas && m.kelas.toLowerCase().includes(q)) ||
        (m.pamong && m.pamong.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (ROLE_CONFIG[mRole] && ROLE_CONFIG[mRole].label.toLowerCase().includes(q));
      return matchRole && matchAsrama && matchSearch;
    });
  }, [musyrifList, selectedAsrama, selectedRole, searchQuery]);

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* Header */}
      <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
        isPage 
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" 
          : "bg-emerald-800 text-white rounded-t-3xl sm:rounded-t-[28px]"
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
                Master Personel & Hak Akses
              </h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                isPage ? "bg-emerald-100 text-emerald-800" : "bg-white/20 text-emerald-100"
              }`}>
                {musyrifList.length} Personel
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/90"}`}>
              Kelola Musyrif, Pamong, Koordinator & Hak Akses Role (Tersinkron ke Google Sheet)
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
                ? (isPage ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-emerald-900 shadow-xs")
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
                ? (isPage ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-emerald-900 shadow-xs")
                : (isPage ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingMusyrif ? "Edit Data" : "Tambah"}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {activeTab === "tambah" ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/70 shadow-xs space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              {editingMusyrif ? <Edit3 className="w-4 h-4 text-amber-600" /> : <UserPlus className="w-4 h-4 text-emerald-600" />}
              <h3 className="font-bold text-sm">
                {editingMusyrif ? `Edit Data: ${editingMusyrif.name}` : "Formulir Pendaftaran Personel Baru"}
              </h3>
            </div>
            {editingMusyrif && (
              <button
                type="button"
                onClick={() => { resetForm(); setActiveTab("daftar"); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Batal Edit
              </button>
            )}
          </div>

          {/* Role Selection Cards */}
          <div>
            <label className="text-xs font-bold text-slate-800 mb-2 block flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Pilih Role & Hak Akses Sistem *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(ROLE_CONFIG) as MusyrifRole[])
                .filter((rKey) => isKoordinator ? true : (rKey === "musyrif" || rKey === "koordinator_gedung"))
                .map((rKey) => {
                const conf = ROLE_CONFIG[rKey];
                const isSelected = role === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => {
                      setRole(rKey);
                      triggerHaptic("light");
                    }}
                    className={`p-3 rounded-2xl text-left border-2 transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{conf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900">{conf.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{conf.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Ahmad Fauzi, S.Pd. / Andi Aqillah Fadia Haswat, S.A.P."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Asrama Tugas / Wilayah *</label>
              {isKoordinator ? (
                <select
                  value={asrama}
                  onChange={e => setAsrama(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  {activeAsramaList.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-700">
                  {asrama}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Kamar Binaan (Khusus Musyrif)</label>
              <input
                type="text"
                value={kamar}
                onChange={e => setKamar(e.target.value)}
                placeholder="Contoh: 1 A / 204 (Boleh kosong untuk Pamong/Koordinator)"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Kelas Binaan (Bisa &gt; 1 Kelas)</label>
              <input
                type="text"
                value={kelas}
                onChange={e => setKelas(e.target.value)}
                placeholder="Contoh: 1 A, 1 B / 5 Upper C & 6 Internasional"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Jika mengampu 2 kelas, tulis keduanya dipisah koma atau &amp;</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Tingkat Pendidikan</label>
              <select
                value={tingkat}
                onChange={e => setTingkat(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
              >
                <option value="Kelas 1">Kelas 1 (MTs / Tsanawiyah)</option>
                <option value="Kelas 2">Kelas 2 (MTs / Tsanawiyah)</option>
                <option value="Kelas 3">Kelas 3 (MTs / Tsanawiyah)</option>
                <option value="Kelas 4">Kelas 4 (MA / Aliyah)</option>
                <option value="Kelas 5">Kelas 5 (MA / Aliyah)</option>
                <option value="Kelas 6">Kelas 6 (MA / Aliyah)</option>
                <option value="Multi Tingkat">Multi Tingkat / Campuran</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Pamong Pembina</label>
              <input
                type="text"
                list="pamong-suggestions"
                value={pamong}
                onChange={e => setPamong(e.target.value)}
                placeholder="Pilih atau ketik nama Pamong Pembina..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <datalist id="pamong-suggestions">
                {musyrifList.filter(m => m.role === "pamong").map(p => (
                  <option key={p.id} value={p.name}>{p.asrama ? `${p.name} (${p.asrama})` : p.name}</option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">No. WhatsApp / HP</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Contoh: 082180998704"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Akun (Bisa &gt; 1 Email untuk Login Google)</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Contoh: user@muallimin.sch.id, user@gmail.com (pisahkan koma jika ada 2 email)"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">1 orang bisa memiliki 2 email sekaligus (misal: email madrasah &amp; email pribadi). Keduanya bisa dipakai login Google.</p>
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingMusyrif ? "Simpan Perubahan" : "Simpan Data Personel"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 pb-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama personel, role, kamar, kelas, pamong, HP, email..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
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

            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedRole("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedRole === "all"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Role ({musyrifList.length})
              </button>
              {(Object.keys(ROLE_CONFIG) as MusyrifRole[]).map((rKey) => {
                const conf = ROLE_CONFIG[rKey];
                const count = musyrifList.filter(m => (m.role || "musyrif") === rKey).length;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => setSelectedRole(rKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                      selectedRole === rKey
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Filter by Asrama */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedAsrama("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedAsrama === "all"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Asrama ({musyrifList.length})
              </button>
              {activeAsramaList.map(asr => {
                const count = musyrifList.filter(m => m.asrama === asr).length;
                return (
                  <button
                    key={asr}
                    type="button"
                    onClick={() => setSelectedAsrama(asr)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedAsrama === asr
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {asr} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Card Musyrif / Personnel */}
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Data Personel</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {searchQuery || selectedAsrama !== "all" || selectedRole !== "all"
                  ? "Tidak ada data yang cocok dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada personel yang terdaftar di sistem."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((m) => {
                const roleKey = (m.role as MusyrifRole) || "musyrif";
                const roleConfig = ROLE_CONFIG[roleKey] || ROLE_CONFIG.musyrif;

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-3 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {(m.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{m.name || "Tanpa Nama"}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {/* Role Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${roleConfig.badge}`}>
                              <span>{roleConfig.icon}</span>
                              <span>{roleConfig.label}</span>
                            </span>

                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                              {m.asrama}
                            </span>
                            {m.kamar && (
                              <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                                Kamar {m.kamar}
                              </span>
                            )}
                            {m.kelas && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                ({m.kelas})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          title="Edit Data Personel"
                          className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-all active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {isKoordinator && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus personel "${m.name}" (${roleConfig.label}) dari sistem? Data presensi dan logbook yang terkait mungkin akan terpengaruh.`)) {
                                onDeleteMusyrif(m.id);
                                triggerHaptic("medium");
                              }
                            }}
                            title="Hapus Personel"
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                      {m.pamong && (
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Pamong: <strong className="text-slate-800">{m.pamong}</strong></span>
                        </div>
                      )}
                      {m.phone && (
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-mono">{m.phone}</span>
                          </div>
                          <a
                            href={`https://wa.me/${m.phone.startsWith("0") ? "62" + m.phone.slice(1) : m.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md hover:bg-emerald-700 flex items-center gap-1 shrink-0"
                          >
                            <MessageCircle className="w-3 h-3" /> WA
                          </a>
                        </div>
                      )}
                      {m.email && (
                        <div className="flex items-center gap-1.5 truncate text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{m.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
