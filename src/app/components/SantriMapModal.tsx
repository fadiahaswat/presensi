import React, { useState, useMemo, useRef } from "react";
import {
  X, MapPin, Building2, Globe, Search, TrendingUp,
  ChevronDown, ChevronUp, Medal, Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SANTRI_DATA, SantriData } from "../data/santriData";
import { modalContentVariants } from "../utils/animations";

interface SantriMapModalProps {
  onClose: () => void;
  santriList?: SantriData[];
  isPage?: boolean;
}

// ── Region Config ─────────────────────────────────────────────────────────────
interface RegionColors { bg: string; bar: string; badge: string; text: string; dot: string; }

function getRegionColor(provinsi: string): RegionColors {
  const p = provinsi.toLowerCase();
  if (p.includes("jawa") || p.includes("yogyakarta") || p.includes("jakarta") || p.includes("banten"))
    return { bg: "bg-emerald-50/70", bar: "bg-gradient-to-r from-emerald-600 to-emerald-400", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (p.includes("kalimantan"))
    return { bg: "bg-blue-50/70", bar: "bg-gradient-to-r from-blue-600 to-blue-400", badge: "bg-blue-100 text-blue-800 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" };
  if (p.includes("sumatera") || p.includes("riau") || p.includes("jambi") || p.includes("lampung") || p.includes("bengkulu") || p.includes("aceh") || p.includes("bangka"))
    return { bg: "bg-amber-50/70", bar: "bg-gradient-to-r from-amber-600 to-amber-400", badge: "bg-amber-100 text-amber-800 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" };
  if (p.includes("sulawesi") || p.includes("gorontalo"))
    return { bg: "bg-purple-50/70", bar: "bg-gradient-to-r from-purple-600 to-purple-400", badge: "bg-purple-100 text-purple-800 border-purple-200", text: "text-purple-700", dot: "bg-purple-500" };
  if (p.includes("nusa tenggara") || p.includes("bali") || p.includes("maluku") || p.includes("papua"))
    return { bg: "bg-rose-50/70", bar: "bg-gradient-to-r from-rose-600 to-rose-400", badge: "bg-rose-100 text-rose-800 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" };
  return { bg: "bg-slate-50/70", bar: "bg-gradient-to-r from-slate-500 to-slate-400", badge: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };
}

const LEGEND_ITEMS = [
  { label: "Jawa & D.I.Y", color: "bg-emerald-500" },
  { label: "Kalimantan", color: "bg-blue-500" },
  { label: "Sumatera", color: "bg-amber-500" },
  { label: "Sulawesi", color: "bg-purple-500" },
  { label: "Timur Indonesia", color: "bg-rose-500" },
  { label: "Lainnya", color: "bg-slate-400" },
];

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-amber-400 text-white shadow-sm">🥇</span>;
  if (rank === 2) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-slate-400 text-white shadow-sm">🥈</span>;
  if (rank === 3) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-orange-400 text-white shadow-sm">🥉</span>;
  if (rank <= 10) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 bg-teal-100 text-teal-700">{rank}</span>;
  return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-slate-100 text-slate-500">{rank}</span>;
}

export function SantriMapModal({ onClose, santriList, isPage = false }: SantriMapModalProps) {
  const [activeTab, setActiveTab] = useState<"provinsi" | "kabupaten">("provinsi");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const data = santriList ?? ALL_SANTRI_DATA;

  // ── Compute Stats ────────────────────────────────────────────────────────────
  const provinsiStats = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(s => {
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([provinsi, count]) => ({ provinsi, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const kabupatenStats = useMemo(() => {
    const map = new Map<string, { count: number; provinsi: string }>();
    data.forEach(s => {
      const k = s.kabupaten?.trim() || "Tidak Diketahui";
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      const ex = map.get(k);
      ex ? ex.count++ : map.set(k, { count: 1, provinsi: p });
    });
    return Array.from(map.entries())
      .map(([kabupaten, { count, provinsi }]) => ({ kabupaten, count, provinsi }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const totalSantri = data.length;
  const maxProvinsiCount = provinsiStats[0]?.count ?? 1;
  const maxKabupatenCount = kabupatenStats[0]?.count ?? 1;

  const filteredKabupaten = useMemo(() => {
    if (!search.trim()) return kabupatenStats;
    const q = search.toLowerCase();
    return kabupatenStats.filter(k =>
      k.kabupaten.toLowerCase().includes(q) || k.provinsi.toLowerCase().includes(q)
    );
  }, [kabupatenStats, search]);

  // Provinsi: show top 10 by default, expand with "Lihat semua"
  const displayedProvinsi = showAll ? provinsiStats : provinsiStats.slice(0, 10);

  // ── Top 3 cards ─────────────────────────────────────────────────────────────
  const top3 = kabupatenStats.slice(0, 3);

  const content = (
    <div className="flex flex-col min-h-0 gap-0">

      {/* ── Header ── */}
      <div className={`relative overflow-hidden flex items-center justify-between gap-3 p-4 sm:p-5 shrink-0 ${
        isPage
          ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs mb-4"
          : "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white"
      }`}>
        {!isPage && (
          <>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-20 w-20 h-20 bg-white/4 rounded-full pointer-events-none" />
            <div className="absolute top-2 left-1/2 w-10 h-10 bg-white/3 rounded-full pointer-events-none" />
          </>
        )}
        <div className="relative flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
            isPage ? "bg-emerald-100 text-emerald-700" : "bg-white/15 text-white border border-white/20"
          }`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Peta Sebaran Santri
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/80"}`}>
              Distribusi asal daerah santri Mu'allimiin TP 2026/2027
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 ${
            isPage
              ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
              : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className={`flex-1 overflow-y-auto flex flex-col gap-4 ${isPage ? "" : "p-4 sm:p-5"}`}>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <Users className="w-4 h-4" />, label: "Total Santri", value: totalSantri.toLocaleString("id-ID"), color: "emerald" },
            { icon: <MapPin className="w-4 h-4" />, label: "Provinsi", value: provinsiStats.length, color: "blue" },
            { icon: <Building2 className="w-4 h-4" />, label: "Kab/Kota", value: kabupatenStats.length, color: "purple" },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 bg-${stat.color}-50 border-${stat.color}-200`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-${stat.color}-100 text-${stat.color}-700`}>
                {stat.icon}
              </div>
              <span className={`text-xl font-black leading-none text-${stat.color}-800`}>{stat.value}</span>
              <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Top 3 Kabupaten highlight ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Medal className="w-3.5 h-3.5" /> Top 3 Asal Terbanyak
          </p>
          <div className="grid grid-cols-3 gap-2">
            {top3.map((item, i) => {
              const colors = getRegionColor(item.provinsi);
              const pct = ((item.count / totalSantri) * 100).toFixed(1);
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={item.kabupaten} className={`rounded-2xl border p-2.5 flex flex-col gap-1 ${colors.bg} border-slate-200/80`}>
                  <span className="text-lg leading-none">{medals[i]}</span>
                  <p className="text-[11px] font-black text-slate-900 leading-tight line-clamp-2">{item.kabupaten}</p>
                  <p className={`text-[10px] font-medium leading-tight ${colors.text} truncate`}>{item.provinsi}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-xs font-black ${colors.text}`}>{item.count}</span>
                    <span className="text-[10px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-slate-100/80 rounded-2xl p-1 flex gap-1 shrink-0">
          {(["provinsi", "kabupaten"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setSearch(""); setShowAll(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "provinsi"
                ? <><MapPin className="w-3.5 h-3.5" /> <span>Per Provinsi</span></>
                : <><Building2 className="w-3.5 h-3.5" /> <span>Per Kab/Kota</span></>
              }
            </button>
          ))}
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-1.5">
          {LEGEND_ITEMS.map(l => (
            <span key={l.label} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>

        {/* ── Tab Content: Provinsi ── */}
        {activeTab === "provinsi" && (
          <div className="space-y-1.5">
            {displayedProvinsi.map((item, idx) => {
              const rank = idx + 1;
              const barWidth = Math.round((item.count / maxProvinsiCount) * 100);
              const pct = ((item.count / totalSantri) * 100).toFixed(1);
              const colors = getRegionColor(item.provinsi);
              return (
                <div
                  key={item.provinsi}
                  className={`rounded-2xl border p-3 ${colors.bg} border-slate-200/70`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <RankMedal rank={rank} />
                    <span className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">{item.provinsi}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge} shrink-0`}>
                      {item.count}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.015, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-[10px] font-bold ${colors.text}`}>{pct}% santri</span>
                    <span className="text-[10px] text-slate-400">{item.count} dari {totalSantri}</span>
                  </div>
                </div>
              );
            })}

            {/* Expand toggle */}
            {provinsiStats.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                {showAll
                  ? <><ChevronUp className="w-3.5 h-3.5" /> Tampilkan lebih sedikit</>
                  : <><ChevronDown className="w-3.5 h-3.5" /> Lihat semua {provinsiStats.length} provinsi</>
                }
              </button>
            )}
          </div>
        )}

        {/* ── Tab Content: Kabupaten ── */}
        {activeTab === "kabupaten" && (
          <div className="space-y-1.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Cari dari ${kabupatenStats.length} kabupaten/kota...`}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
              />
            </div>

            {filteredKabupaten.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Tidak ditemukan</p>
                <p className="text-xs mt-0.5">Coba kata kunci lain</p>
              </div>
            )}

            {filteredKabupaten.map((item, idx) => {
              const rank = kabupatenStats.findIndex(k => k.kabupaten === item.kabupaten) + 1;
              const barWidth = Math.round((item.count / maxKabupatenCount) * 100);
              const pct = ((item.count / totalSantri) * 100).toFixed(1);
              const colors = getRegionColor(item.provinsi);
              return (
                <div
                  key={item.kabupaten}
                  className={`rounded-2xl border p-3 ${colors.bg} border-slate-200/70`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <RankMedal rank={rank} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.kabupaten}</p>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
                        <p className={`text-[10px] font-medium truncate ${colors.text}`}>{item.provinsi}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>
                        {item.count}
                      </span>
                      <span className="text-[10px] text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.008, 0.25), ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="pt-2 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <TrendingUp className="w-3 h-3" />
            <span>Data sebaran {totalSantri.toLocaleString("id-ID")} santri aktif TP 2026/2027</span>
          </div>
        </div>

      </div>
    </div>
  );

  if (isPage) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-0">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        {/* Sheet/Modal */}
        <motion.div
          className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "92dvh" }}
          variants={modalContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Drag handle on mobile */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
