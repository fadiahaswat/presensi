import React, { useState, useMemo } from "react";
import { X, MapPin, BarChart2, Building2, Globe, Search, Users, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SANTRI_DATA } from "../data/santriData";
import { modalContentVariants } from "../utils/animations";

interface SantriPetaSebaranProps {
  onClose?: () => void;
  isPage?: boolean;
}

interface RegionMarker { name: string; x: number; y: number; }

const REGION_MARKERS: RegionMarker[] = [
  { name: "Aceh", x: 45, y: 100 },
  { name: "Sumatera Utara", x: 75, y: 130 },
  { name: "Sumatera Barat", x: 55, y: 175 },
  { name: "Riau", x: 85, y: 195 },
  { name: "Jambi", x: 105, y: 210 },
  { name: "Sumatera Selatan", x: 125, y: 245 },
  { name: "Lampung", x: 145, y: 265 },
  { name: "DKI Jakarta", x: 162, y: 278 },
  { name: "Jawa Barat", x: 160, y: 300 },
  { name: "Banten", x: 170, y: 285 },
  { name: "Jawa Tengah", x: 158, y: 330 },
  { name: "DI Yogyakarta", x: 168, y: 350 },
  { name: "Jawa Timur", x: 170, y: 380 },
  { name: "Bali", x: 192, y: 420 },
  { name: "NTB", x: 205, y: 430 },
  { name: "NTT", x: 235, y: 455 },
  { name: "Kalimantan Barat", x: 110, y: 320 },
  { name: "Kalimantan Tengah", x: 130, y: 295 },
  { name: "Kalimantan Selatan", x: 145, y: 345 },
  { name: "Kalimantan Timur", x: 168, y: 325 },
  { name: "Kalimantan Utara", x: 182, y: 295 },
  { name: "Sulawesi Utara", x: 215, y: 255 },
  { name: "Sulawesi Tengah", x: 200, y: 310 },
  { name: "Sulawesi Selatan", x: 220, y: 370 },
  { name: "Sulawesi Tenggara", x: 245, y: 355 },
  { name: "Gorontalo", x: 205, y: 275 },
  { name: "Maluku", x: 275, y: 350 },
  { name: "Maluku Utara", x: 268, y: 310 },
  { name: "Papua", x: 315, y: 420 },
  { name: "Papua Barat", x: 295, y: 385 },
];

function getRegionColor(provinsi: string) {
  const p = provinsi.toLowerCase();
  if (p.includes("jawa") || p.includes("yogyakarta") || p.includes("jakarta") || p.includes("banten"))
    return { bg: "bg-emerald-50/70", bar: "bg-gradient-to-r from-emerald-600 to-emerald-400", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", text: "text-emerald-700", fill: "#10b981", dot: "bg-emerald-500" };
  if (p.includes("kalimantan"))
    return { bg: "bg-blue-50/70", bar: "bg-gradient-to-r from-blue-600 to-blue-400", badge: "bg-blue-100 text-blue-800 border-blue-200", text: "text-blue-700", fill: "#3b82f6", dot: "bg-blue-500" };
  if (p.includes("sumatera") || p.includes("riau") || p.includes("jambi") || p.includes("lampung") || p.includes("bengkulu") || p.includes("aceh") || p.includes("bangka"))
    return { bg: "bg-amber-50/70", bar: "bg-gradient-to-r from-amber-600 to-amber-400", badge: "bg-amber-100 text-amber-800 border-amber-200", text: "text-amber-700", fill: "#f59e0b", dot: "bg-amber-500" };
  if (p.includes("sulawesi") || p.includes("gorontalo"))
    return { bg: "bg-purple-50/70", bar: "bg-gradient-to-r from-purple-600 to-purple-400", badge: "bg-purple-100 text-purple-800 border-purple-200", text: "text-purple-700", fill: "#a855f7", dot: "bg-purple-500" };
  if (p.includes("maluku") || p.includes("papua"))
    return { bg: "bg-rose-50/70", bar: "bg-gradient-to-r from-rose-600 to-rose-400", badge: "bg-rose-100 text-rose-800 border-rose-200", text: "text-rose-700", fill: "#f43f5e", dot: "bg-rose-500" };
  if (p.includes("bali") || p.includes("ntb") || p.includes("nusa tenggara"))
    return { bg: "bg-teal-50/70", bar: "bg-gradient-to-r from-teal-600 to-teal-400", badge: "bg-teal-100 text-teal-800 border-teal-200", text: "text-teal-700", fill: "#14b8a6", dot: "bg-teal-500" };
  return { bg: "bg-slate-50/70", bar: "bg-gradient-to-r from-slate-500 to-slate-400", badge: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-600", fill: "#64748b", dot: "bg-slate-400" };
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-white";
  if (rank === 2) return "bg-slate-400 text-white";
  if (rank === 3) return "bg-orange-400 text-white";
  if (rank <= 10) return "bg-teal-100 text-teal-700";
  return "bg-slate-100 text-slate-500";
}

function matchProvinsiToMarker(provinsi: string): string | null {
  const p = provinsi.toLowerCase();
  if (p.includes("aceh")) return "Aceh";
  if (p.includes("sumatera utara")) return "Sumatera Utara";
  if (p.includes("sumatera barat")) return "Sumatera Barat";
  if (p.includes("riau") && !p.includes("kepulauan")) return "Riau";
  if (p.includes("jambi")) return "Jambi";
  if (p.includes("sumatera selatan")) return "Sumatera Selatan";
  if (p.includes("lampung")) return "Lampung";
  if (p.includes("dki jakarta") || p.includes("jakarta")) return "DKI Jakarta";
  if (p.includes("jawa barat")) return "Jawa Barat";
  if (p.includes("banten")) return "Banten";
  if (p.includes("jawa tengah")) return "Jawa Tengah";
  if (p.includes("yogyakarta")) return "DI Yogyakarta";
  if (p.includes("jawa timur")) return "Jawa Timur";
  if (p.includes("bali")) return "Bali";
  if (p.includes("nusa tenggara barat")) return "NTB";
  if (p.includes("nusa tenggara timur")) return "NTT";
  if (p.includes("kalimantan barat")) return "Kalimantan Barat";
  if (p.includes("kalimantan tengah")) return "Kalimantan Tengah";
  if (p.includes("kalimantan selatan")) return "Kalimantan Selatan";
  if (p.includes("kalimantan timur")) return "Kalimantan Timur";
  if (p.includes("kalimantan utara")) return "Kalimantan Utara";
  if (p.includes("sulawesi utara")) return "Sulawesi Utara";
  if (p.includes("sulawesi tengah")) return "Sulawesi Tengah";
  if (p.includes("sulawesi selatan")) return "Sulawesi Selatan";
  if (p.includes("sulawesi tenggara")) return "Sulawesi Tenggara";
  if (p.includes("gorontalo")) return "Gorontalo";
  if (p.includes("maluku")) return p.includes("utara") ? "Maluku Utara" : "Maluku";
  if (p.includes("papua")) return p.includes("barat") ? "Papua Barat" : "Papua";
  return null;
}

export function SantriPetaSebaran({ onClose, isPage = false }: SantriPetaSebaranProps) {
  const [activeTab, setActiveTab] = useState<"peta" | "provinsi" | "kabupaten">("peta");
  const [search, setSearch] = useState("");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const provinsiStats = useMemo(() => {
    const map = new Map<string, number>();
    ALL_SANTRI_DATA.forEach(s => {
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([provinsi, count]) => ({ provinsi, count })).sort((a, b) => b.count - a.count);
  }, []);

  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    REGION_MARKERS.forEach(r => map.set(r.name, 0));
    provinsiStats.forEach(item => {
      const matched = matchProvinsiToMarker(item.provinsi);
      if (matched && map.has(matched)) map.set(matched, map.get(matched)! + item.count);
    });
    return map;
  }, [provinsiStats]);

  const maxRegionCount = Math.max(...Array.from(regionCounts.values()), 1);

  const kabupatenStats = useMemo(() => {
    const map = new Map<string, { count: number; provinsi: string }>();
    ALL_SANTRI_DATA.forEach(s => {
      const k = s.kabupaten?.trim() || "Tidak Diketahui";
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      const ex = map.get(k);
      ex ? ex.count++ : map.set(k, { count: 1, provinsi: p });
    });
    return Array.from(map.entries()).map(([kabupaten, { count, provinsi }]) => ({ kabupaten, count, provinsi })).sort((a, b) => b.count - a.count);
  }, []);

  const totalSantri = ALL_SANTRI_DATA.length;
  const totalProvinsi = provinsiStats.length;
  const totalKabupaten = kabupatenStats.length;
  const maxKabupatenCount = kabupatenStats[0]?.count ?? 1;

  const filteredKabupaten = useMemo(() => {
    if (!search.trim()) return kabupatenStats;
    const q = search.toLowerCase();
    return kabupatenStats.filter(k => k.kabupaten.toLowerCase().includes(q) || k.provinsi.toLowerCase().includes(q));
  }, [kabupatenStats, search]);

  const getMarkerSize = (count: number) => {
    if (count === 0) return 8;
    const ratio = Math.min(count / (maxRegionCount * 0.15), 1);
    return 10 + (45 - 10) * Math.sqrt(ratio);
  };

  const content = (
    <div className="flex flex-col min-h-0 overflow-hidden" style={{ height: "100%" }}>
      {/* ── Header ── */}
      <div className={`relative overflow-hidden flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 shrink-0 ${
        isPage ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs mb-4" : "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white"
      }`}>
        {!isPage && (
          <>
            <div className="absolute -top-6 -right-8 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-20 w-16 h-16 bg-white/4 rounded-full pointer-events-none" />
          </>
        )}
        <div className="relative flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isPage ? "bg-emerald-100 text-emerald-700" : "bg-white/15 text-white"}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-sm sm:text-base leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Peta Sebaran Santri
            </h2>
            <p className={`text-[11px] mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/80"}`}>
              {totalSantri.toLocaleString("id-ID")} santri · {totalProvinsi} provinsi
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 ${isPage ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/15 hover:bg-white/25 text-white"}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 pb-5 sm:px-5 pt-4 min-h-0">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {[
            { icon: <Users className="w-4 h-4" />, label: "Total Santri", value: totalSantri.toLocaleString("id-ID"), c: "emerald" },
            { icon: <MapPin className="w-4 h-4" />, label: "Provinsi", value: totalProvinsi, c: "blue" },
            { icon: <Building2 className="w-4 h-4" />, label: "Kab/Kota", value: totalKabupaten, c: "purple" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-2.5 flex flex-col items-center gap-1 bg-${s.c}-50 border-${s.c}-200`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center bg-${s.c}-100 text-${s.c}-700`}>{s.icon}</div>
              <span className={`text-lg font-black leading-none text-${s.c}-800`}>{s.value}</span>
              <span className="text-[10px] font-semibold text-slate-400 text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-slate-100/80 rounded-2xl p-1 flex gap-1 shrink-0">
          {(["peta", "provinsi", "kabupaten"] as const).map(tab => (
            <button key={tab} type="button"
              onClick={() => { setActiveTab(tab); setSearch(""); }}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}>
              {tab === "peta" ? <><TrendingUp className="w-3 h-3" />Peta</> : tab === "provinsi" ? <><Globe className="w-3 h-3" />Provinsi</> : <><Building2 className="w-3 h-3" />Kabupaten</>}
            </button>
          ))}
        </div>

        {/* ── PETA TAB ── */}
        {activeTab === "peta" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {[{ l: "Jawa", c: "#10b981" }, { l: "Sumatera", c: "#f59e0b" }, { l: "Kalimantan", c: "#3b82f6" }, { l: "Sulawesi", c: "#a855f7" }, { l: "NTB/Bali", c: "#14b8a6" }, { l: "Timur", c: "#f43f5e" }].map(x => (
                <span key={x.l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: x.c }} />
                  <span className="text-[10px] font-medium text-slate-500">{x.l}</span>
                </span>
              ))}
            </div>

            <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="bg-white/70 border-b border-slate-100 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Peta Indonesia</span>
                <span className="text-[10px] text-slate-400">Hover untuk detail</span>
              </div>
              <div className="relative p-3">
                <svg viewBox="0 0 360 500" className="w-full h-auto" style={{ minHeight: "280px" }}>
                  <defs>
                    <linearGradient id="oceanGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="100%" stopColor="#bfdbfe" />
                    </linearGradient>
                    <filter id="glow2">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <rect width="360" height="500" fill="url(#oceanGrad2)" rx="8" />
                  {REGION_MARKERS.map(region => {
                    const count = regionCounts.get(region.name) || 0;
                    const size = getMarkerSize(count);
                    const isHovered = hoveredRegion === region.name;
                    const colors = getRegionColor(region.name);
                    return (
                      <g key={region.name} transform={`translate(${region.x}, ${region.y})`}>
                        {count > 0 && <circle r={size + 6} fill={colors.fill} opacity={isHovered ? 0.25 : 0.1} className="transition-opacity duration-200" />}
                        <circle
                          r={isHovered ? size + 3 : size}
                          fill={count > 0 ? colors.fill : "#e2e8f0"}
                          stroke={isHovered ? "#0f172a" : count > 0 ? "#fff" : "#cbd5e1"}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          filter={count > 0 ? "url(#glow2)" : undefined}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredRegion(region.name)}
                          onMouseLeave={() => setHoveredRegion(null)}
                        />
                        {count > 0 && (
                          <text y={4} textAnchor="middle" className="pointer-events-none select-none"
                            style={{ fontSize: Math.max(7, size * 0.4), fill: "#fff", fontWeight: "900" }}>
                            {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                          </text>
                        )}
                        {size > 25 && (
                          <text y={size + 12} textAnchor="middle" className="pointer-events-none select-none"
                            style={{ fontSize: 7, fill: "#475569", fontWeight: 600 }}>
                            {region.name.length > 12 ? region.name.split(" ").map(w => w[0]).join("").toUpperCase() : region.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <AnimatePresence>
                  {hoveredRegion && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-3 shadow-lg">
                      {(() => {
                        const count = regionCounts.get(hoveredRegion) || 0;
                        const matched = provinsiStats.filter(p => matchProvinsiToMarker(p.provinsi) === hoveredRegion);
                        const colors = getRegionColor(matched[0]?.provinsi || hoveredRegion);
                        return (
                          <>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-bold text-slate-800">{hoveredRegion}</span>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>{count} santri</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {matched.slice(0, 3).map(p => <span key={p.provinsi} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{p.provinsi}: {p.count}</span>)}
                              {matched.length > 3 && <span className="text-[10px] text-slate-400">+{matched.length - 3} lainnya</span>}
                              {matched.length === 0 && <span className="text-[10px] text-slate-400">Tidak ada data</span>}
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Top 10 Provinsi
              </h3>
              <div className="space-y-1.5">
                {provinsiStats.slice(0, 10).map((item, idx) => {
                  const rank = idx + 1;
                  const colors = getRegionColor(item.provinsi);
                  const pct = ((item.count / totalSantri) * 100).toFixed(1);
                  return (
                    <div key={item.provinsi} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${getRankBadge(rank)}`}>{rank}</span>
                      <span className="text-xs font-medium text-slate-700 flex-1 truncate">{item.provinsi}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colors.badge}`}>{item.count}</span>
                      <span className="text-[10px] text-slate-400 w-9 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PROVINSI TAB ── */}
        {activeTab === "provinsi" && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[{ l: "Jawa", c: "bg-emerald-100 text-emerald-800 border-emerald-200" }, { l: "Kalimantan", c: "bg-blue-100 text-blue-800 border-blue-200" }, { l: "Sumatera", c: "bg-amber-100 text-amber-800 border-amber-200" }, { l: "Sulawesi", c: "bg-purple-100 text-purple-800 border-purple-200" }, { l: "Lainnya", c: "bg-rose-100 text-rose-800 border-rose-200" }].map(x => (
                <span key={x.l} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${x.c}`}>{x.l}</span>
              ))}
            </div>
            {provinsiStats.map((item, idx) => {
              const rank = idx + 1;
              const pct = ((item.count / totalSantri) * 100).toFixed(1);
              const colors = getRegionColor(item.provinsi);
              return (
                <div key={item.provinsi} className={`rounded-2xl border p-3 ${colors.bg} border-slate-200/70`}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${getRankBadge(rank)}`}>{rank}</span>
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{item.provinsi}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }} animate={{ width: `${(item.count / (provinsiStats[0]?.count ?? 1)) * 100}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.015, ease: "easeOut" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-[10px] font-bold ${colors.text}`}>{pct}% santri</span>
                    <span className="text-[10px] text-slate-400">{item.count} dari {totalSantri}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── KABUPATEN TAB ── */}
        {activeTab === "kabupaten" && (
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Cari dari ${kabupatenStats.length} kab/kota...`}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all" />
            </div>
            {filteredKabupaten.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Tidak ditemukan</p>
              </div>
            )}
            {filteredKabupaten.map((item, idx) => {
              const rank = kabupatenStats.findIndex(k => k.kabupaten === item.kabupaten) + 1;
              const colors = getRegionColor(item.provinsi);
              return (
                <div key={item.kabupaten} className={`rounded-2xl border p-3 ${colors.bg} border-slate-200/70`}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${getRankBadge(rank)}`}>{rank <= 99 ? rank : "—"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.kabupaten}</p>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                        <p className={`text-[10px] font-medium truncate ${colors.text}`}>{item.provinsi}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>{item.count}</span>
                      <span className="text-[10px] text-slate-400">{((item.count / totalSantri) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }} animate={{ width: `${(item.count / maxKabupatenCount) * 100}%` }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.008, 0.25), ease: "easeOut" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <BarChart2 className="w-3 h-3" />
            <span>Data {totalSantri.toLocaleString("id-ID")} santri aktif TP 2026/2027</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPage) {
    return <div className="w-full max-w-2xl mx-auto p-4">{content}</div>;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "92dvh" }}
          variants={modalContentVariants}
          initial="initial" animate="animate" exit="exit"
        >
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}