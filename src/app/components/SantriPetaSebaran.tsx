import React, { useState, useMemo, useCallback } from "react";
import { X, MapPin, BarChart2, Building2, Globe, Search, Users, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SANTRI_DATA, SantriData } from "../data/santriData";
import { modalContentVariants } from "../utils/animations";

interface SantriPetaSebaranProps {
  onClose?: () => void;
  isPage?: boolean;
}

// Simplified Indonesia region markers for visualization
interface RegionMarker {
  name: string;
  x: number;
  y: number;
  radius: number;
}

const REGION_MARKERS: RegionMarker[] = [
  { name: "Aceh", x: 45, y: 100, radius: 12 },
  { name: "Sumatera Utara", x: 75, y: 130, radius: 18 },
  { name: "Sumatera Barat", x: 55, y: 175, radius: 14 },
  { name: "Riau", x: 85, y: 195, radius: 16 },
  { name: "Jambi", x: 105, y: 210, radius: 10 },
  { name: "Sumatera Selatan", x: 125, y: 245, radius: 18 },
  { name: "Lampung", x: 145, y: 265, radius: 14 },
  { name: "DKI Jakarta", x: 162, y: 278, radius: 10 },
  { name: "Jawa Barat", x: 160, y: 300, radius: 35 },
  { name: "Banten", x: 170, y: 285, radius: 16 },
  { name: "Jawa Tengah", x: 158, y: 330, radius: 32 },
  { name: "DI Yogyakarta", x: 168, y: 350, radius: 12 },
  { name: "Jawa Timur", x: 170, y: 380, radius: 40 },
  { name: "Bali", x: 192, y: 420, radius: 12 },
  { name: "NTB", x: 205, y: 430, radius: 10 },
  { name: "NTT", x: 235, y: 455, radius: 10 },
  { name: "Kalimantan Barat", x: 110, y: 320, radius: 18 },
  { name: "Kalimantan Tengah", x: 130, y: 295, radius: 16 },
  { name: "Kalimantan Selatan", x: 145, y: 345, radius: 12 },
  { name: "Kalimantan Timur", x: 168, y: 325, radius: 14 },
  { name: "Kalimantan Utara", x: 182, y: 295, radius: 8 },
  { name: "Sulawesi Utara", x: 215, y: 255, radius: 10 },
  { name: "Sulawesi Tengah", x: 200, y: 310, radius: 12 },
  { name: "Sulawesi Selatan", x: 220, y: 370, radius: 16 },
  { name: "Sulawesi Tenggara", x: 245, y: 355, radius: 10 },
  { name: "Gorontalo", x: 205, y: 275, radius: 8 },
  { name: "Maluku", x: 275, y: 350, radius: 10 },
  { name: "Maluku Utara", x: 268, y: 310, radius: 8 },
  { name: "Papua", x: 315, y: 420, radius: 14 },
  { name: "Papua Barat", x: 295, y: 385, radius: 10 },
];

// Region color coding - brand colors
function getRegionColor(provinsi: string): {
  bg: string;
  bar: string;
  badge: string;
  text: string;
  fill: string;
} {
  const p = provinsi.toLowerCase();
  if (p.includes("jawa") || p.includes("yogyakarta") || p.includes("jakarta") || p.includes("banten")) {
    return { bg: "bg-emerald-50", bar: "bg-gradient-to-r from-emerald-500 to-emerald-400", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", text: "text-emerald-700", fill: "#10b981" };
  }
  if (p.includes("kalimantan")) {
    return { bg: "bg-blue-50", bar: "bg-gradient-to-r from-blue-500 to-blue-400", badge: "bg-blue-100 text-blue-800 border-blue-200", text: "text-blue-700", fill: "#3b82f6" };
  }
  if (p.includes("sumatera") || p.includes("sumatra") || p.includes("riau") || p.includes("jambi") || p.includes("lampung") || p.includes("bengkulu") || p.includes("aceh")) {
    return { bg: "bg-amber-50", bar: "bg-gradient-to-r from-amber-500 to-amber-400", badge: "bg-amber-100 text-amber-800 border-amber-200", text: "text-amber-700", fill: "#f59e0b" };
  }
  if (p.includes("sulawesi")) {
    return { bg: "bg-purple-50", bar: "bg-gradient-to-r from-purple-500 to-purple-400", badge: "bg-purple-100 text-purple-800 border-purple-200", text: "text-purple-700", fill: "#a855f7" };
  }
  if (p.includes("maluku") || p.includes("papua")) {
    return { bg: "bg-rose-50", bar: "bg-gradient-to-r from-rose-500 to-rose-400", badge: "bg-rose-100 text-rose-800 border-rose-200", text: "text-rose-700", fill: "#f43f5e" };
  }
  if (p.includes("bali") || p.includes("ntb") || p.includes("nusa tenggara")) {
    return { bg: "bg-teal-50", bar: "bg-gradient-to-r from-teal-500 to-teal-400", badge: "bg-teal-100 text-teal-800 border-teal-200", text: "text-teal-700", fill: "#14b8a6" };
  }
  return { bg: "bg-slate-50", bar: "bg-gradient-to-r from-slate-500 to-slate-400", badge: "bg-slate-100 text-slate-800 border-slate-200", text: "text-slate-700", fill: "#64748b" };
}

function getRankHighlight(rank: number): string {
  if (rank <= 3) return "bg-emerald-50 border-emerald-200";
  if (rank <= 5) return "bg-teal-50 border-teal-200";
  return "bg-white border-slate-100";
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-white";
  if (rank === 2) return "bg-slate-400 text-white";
  if (rank === 3) return "bg-orange-400 text-white";
  if (rank <= 5) return "bg-teal-500 text-white";
  return "bg-slate-200 text-slate-600";
}

// Map province names to region markers
function matchProvinsiToMarker(provinsi: string): string | null {
  const p = provinsi.toLowerCase();
  if (p.includes("aceh")) return "Aceh";
  if (p.includes("sumatera utara") || p.includes("north sumatra")) return "Sumatera Utara";
  if (p.includes("sumatera barat") || p.includes("west sumatra")) return "Sumatera Barat";
  if (p.includes("riau")) return "Riau";
  if (p.includes("jambi")) return "Jambi";
  if (p.includes("sumatera selatan") || p.includes("south sumatra")) return "Sumatera Selatan";
  if (p.includes("lampung")) return "Lampung";
  if (p.includes("dki jakarta") || p.includes("jakarta")) return "DKI Jakarta";
  if (p.includes("jawa barat") || p.includes("west java")) return "Jawa Barat";
  if (p.includes("banten")) return "Banten";
  if (p.includes("jawa tengah") || p.includes("central java")) return "Jawa Tengah";
  if (p.includes("yogyakarta")) return "DI Yogyakarta";
  if (p.includes("jawa timur") || p.includes("east java")) return "Jawa Timur";
  if (p.includes("bali")) return "Bali";
  if (p.includes("nusa tenggara barat") || p.includes("west nusa tenggara")) return "NTB";
  if (p.includes("nusa tenggara timur") || p.includes("east nusa tenggara")) return "NTT";
  if (p.includes("kalimantan barat") || p.includes("west kalimantan")) return "Kalimantan Barat";
  if (p.includes("kalimantan tengah") || p.includes("central kalimantan")) return "Kalimantan Tengah";
  if (p.includes("kalimantan selatan") || p.includes("south kalimantan")) return "Kalimantan Selatan";
  if (p.includes("kalimantan timur") || p.includes("east kalimantan")) return "Kalimantan Timur";
  if (p.includes("kalimantan utara") || p.includes("north kalimantan")) return "Kalimantan Utara";
  if (p.includes("sulawesi utara") || p.includes("north sulawesi")) return "Sulawesi Utara";
  if (p.includes("sulawesi tengah") || p.includes("central sulawesi")) return "Sulawesi Tengah";
  if (p.includes("sulawesi selatan") || p.includes("south sulawesi")) return "Sulawesi Selatan";
  if (p.includes("sulawesi tenggara") || p.includes("southeast sulawesi")) return "Sulawesi Tenggara";
  if (p.includes("gorontalo")) return "Gorontalo";
  if (p.includes("maluku")) return p.includes("utara") ? "Maluku Utara" : "Maluku";
  if (p.includes("papua")) return p.includes("barat") ? "Papua Barat" : "Papua";
  return null;
}

export function SantriPetaSebaran({ onClose, isPage = false }: SantriPetaSebaranProps) {
  const [activeTab, setActiveTab] = useState<"peta" | "provinsi" | "kabupaten">("peta");
  const [search, setSearch] = useState("");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Compute provinsi stats
  const provinsiStats = useMemo(() => {
    const map = new Map<string, number>();
    ALL_SANTRI_DATA.forEach((s) => {
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([provinsi, count]) => ({ provinsi, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  // Map provinsi to region counts
  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    REGION_MARKERS.forEach(r => map.set(r.name, 0));
    provinsiStats.forEach(item => {
      const matchedRegion = matchProvinsiToMarker(item.provinsi);
      if (matchedRegion && map.has(matchedRegion)) {
        map.set(matchedRegion, map.get(matchedRegion)! + item.count);
      }
    });
    return map;
  }, [provinsiStats]);

  const maxRegionCount = Math.max(...Array.from(regionCounts.values()), 1);

  // Compute kabupaten stats
  const kabupatenStats = useMemo(() => {
    const map = new Map<string, { count: number; provinsi: string }>();
    ALL_SANTRI_DATA.forEach((s) => {
      const k = s.kabupaten?.trim() || "Tidak Diketahui";
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      const existing = map.get(k);
      if (existing) {
        existing.count++;
      } else {
        map.set(k, { count: 1, provinsi: p });
      }
    });
    return Array.from(map.entries())
      .map(([kabupaten, { count, provinsi }]) => ({ kabupaten, count, provinsi }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const totalSantri = ALL_SANTRI_DATA.length;
  const totalProvinsi = provinsiStats.length;
  const totalKabupaten = kabupatenStats.length;
  const maxKabupatenCount = kabupatenStats[0]?.count ?? 1;

  const filteredKabupaten = useMemo(() => {
    if (!search.trim()) return kabupatenStats;
    const q = search.toLowerCase();
    return kabupatenStats.filter(
      (k) => k.kabupaten.toLowerCase().includes(q) || k.provinsi.toLowerCase().includes(q)
    );
  }, [kabupatenStats, search]);

  // Calculate marker size based on count
  const getMarkerSize = (count: number) => {
    if (count === 0) return 8;
    const minSize = 10;
    const maxSize = 45;
    const ratio = Math.min(count / (maxRegionCount * 0.15), 1);
    return minSize + (maxSize - minSize) * Math.sqrt(ratio);
  };

  const content = (
    <div className={`flex flex-col ${isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"}`}>
      {/* ── Header ── */}
      <div className={`relative overflow-hidden flex items-center justify-between gap-3 p-4 sm:p-5 ${
        isPage ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs" : "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-t-3xl"
      }`}>
        {!isPage && (
          <>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute -bottom-4 right-16 w-16 h-16 bg-white/5 rounded-full" />
          </>
        )}
        <div className="relative flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isPage ? "bg-emerald-100 text-emerald-700" : "bg-white/15 text-white"}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-bold text-base sm:text-lg leading-tight ${isPage ? "text-slate-900" : "text-white"}`}>
              Peta Sebaran Asal Santri
            </h2>
            <p className={`text-xs mt-0.5 ${isPage ? "text-slate-500" : "text-emerald-100/80"}`}>
              Distribusi {totalSantri.toLocaleString("id-ID")} santri dari {totalProvinsi} provinsi
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Tutup" className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isPage ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/15 hover:bg-white/25 text-white"}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-2.5 px-0">
        {[
          { icon: <Users className="w-4 h-4" />, label: "Total Santri", value: totalSantri.toLocaleString("id-ID"), color: "text-emerald-700 bg-emerald-50 border-emerald-200", iconBg: "bg-emerald-100 text-emerald-700" },
          { icon: <MapPin className="w-4 h-4" />, label: "Provinsi", value: totalProvinsi, color: "text-blue-700 bg-blue-50 border-blue-200", iconBg: "bg-blue-100 text-blue-700" },
          { icon: <Building2 className="w-4 h-4" />, label: "Kab/Kota", value: totalKabupaten, color: "text-purple-700 bg-purple-50 border-purple-200", iconBg: "bg-purple-100 text-purple-700" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 ${stat.color}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.iconBg}`}>{stat.icon}</div>
            <span className="text-xl font-black leading-none">{stat.value}</span>
            <span className="text-[10px] font-semibold opacity-70 text-center leading-tight">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-slate-100 rounded-2xl p-1 flex gap-1">
        {(["peta", "provinsi", "kabupaten"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => { setActiveTab(tab); setSearch(""); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {tab === "peta" ? <><TrendingUp className="w-3.5 h-3.5" /> Peta</> : tab === "provinsi" ? <><Globe className="w-3.5 h-3.5" /> Provinsi</> : <><Building2 className="w-3.5 h-3.5" /> Kabupaten</>}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className={`flex-1 overflow-y-auto ${isPage ? "" : "min-h-0"}`}>
        {/* Peta Tab */}
        {activeTab === "peta" && (
          <div className="space-y-3 pb-2">
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[10px] font-bold text-slate-500">Legenda:</span>
              {[
                { label: "Jawa", color: "#10b981" },
                { label: "Sumatera", color: "#f59e0b" },
                { label: "Kalimantan", color: "#3b82f6" },
                { label: "Sulawesi", color: "#a855f7" },
                { label: "NTB-Bali", color: "#14b8a6" },
                { label: "Timur", color: "#f43f5e" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-slate-500">{l.label}</span>
                </span>
              ))}
            </div>

            {/* Map Container */}
            <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-2xl border border-slate-200 overflow-hidden">
              {/* Map Title Bar */}
              <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Peta Indonesia</span>
                <span className="text-[10px] text-slate-400">Hover untuk detail</span>
              </div>

              {/* SVG Map */}
              <div className="relative p-4">
                <svg viewBox="0 0 360 500" className="w-full h-auto" style={{ minHeight: "380px" }}>
                  {/* Ocean gradient */}
                  <defs>
                    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="100%" stopColor="#bfdbfe" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Ocean background */}
                  <rect width="360" height="500" fill="url(#oceanGrad)" rx="8" />

                  {/* Simplified Indonesia outline */}
                  <path
                    d="M35,90 Q50,80 65,95 Q80,85 95,100 Q110,90 125,105 Q140,95 155,110 Q170,100 185,115 Q200,105 215,120 Q230,110 245,125 Q260,115 275,130 Q290,120 305,135 Q320,125 335,140 Q350,130 345,150 Q355,170 340,190 Q350,210 335,230 Q350,250 340,270 Q355,290 345,310 Q360,330 350,350 Q360,370 345,390 Q355,410 340,430 Q350,450 330,470 Q340,485 310,480 Q280,490 250,475 Q220,485 190,470 Q160,480 130,465 Q100,475 70,460 Q40,470 20,450 Q5,430 15,410 Q5,390 20,370 Q10,350 30,330 Q15,310 35,290 Q20,270 40,250 Q25,230 45,210 Q30,190 50,170 Q35,150 55,130 Q40,110 35,90 Z"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="0.8"
                    opacity="0.3"
                  />

                  {/* Region markers */}
                  {REGION_MARKERS.map((region) => {
                    const count = regionCounts.get(region.name) || 0;
                    const size = getMarkerSize(count);
                    const isHovered = hoveredRegion === region.name;
                    const colors = getRegionColor(region.name);

                    return (
                      <g key={region.name} transform={`translate(${region.x}, ${region.y})`}>
                        {/* Outer glow for non-zero */}
                        {count > 0 && (
                          <circle
                            r={size + 6}
                            fill={colors.fill}
                            opacity={isHovered ? 0.25 : 0.1}
                            className="transition-opacity duration-200"
                          />
                        )}
                        {/* Main circle */}
                        <circle
                          r={isHovered ? size + 3 : size}
                          fill={count > 0 ? colors.fill : "#e2e8f0"}
                          stroke={isHovered ? "#0f172a" : count > 0 ? "#fff" : "#cbd5e1"}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          filter={count > 0 ? "url(#glow)" : undefined}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredRegion(region.name)}
                          onMouseLeave={() => setHoveredRegion(null)}
                        />
                        {/* Count label */}
                        {count > 0 && (
                          <text
                            y={4}
                            textAnchor="middle"
                            className="pointer-events-none select-none font-black"
                            style={{ fontSize: Math.max(7, size * 0.4), fill: "#fff" }}
                          >
                            {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                          </text>
                        )}
                        {/* Region name for large markers */}
                        {size > 25 && (
                          <text
                            y={size + 12}
                            textAnchor="middle"
                            className="pointer-events-none select-none"
                            style={{ fontSize: 7, fill: "#475569", fontWeight: 600 }}
                          >
                            {region.name.length > 12 ? region.name.split(" ").map(w => w[0]).join("").toUpperCase() : region.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Hovered region info */}
                <AnimatePresence>
                  {hoveredRegion && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-3 shadow-lg"
                    >
                      {(() => {
                        const count = regionCounts.get(hoveredRegion) || 0;
                        const matchedProvinsi = provinsiStats.filter(p => matchProvinsiToMarker(p.provinsi) === hoveredRegion);
                        const colors = getRegionColor(matchedProvinsi[0]?.provinsi || hoveredRegion);
                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-800">{hoveredRegion}</span>
                              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${colors.badge}`}>{count} santri</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {matchedProvinsi.slice(0, 3).map(p => (
                                <span key={p.provinsi} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {p.provinsi}: {p.count}
                                </span>
                              ))}
                              {matchedProvinsi.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{matchedProvinsi.length - 3} lainnya</span>
                              )}
                              {matchedProvinsi.length === 0 && (
                                <span className="text-[10px] text-slate-400">Tidak ada data</span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Top 10 Provinsi */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Top 10 Provinsi Asal Santri
              </h3>
              <div className="space-y-2">
                {provinsiStats.slice(0, 10).map((item, idx) => {
                  const rank = idx + 1;
                  const colors = getRegionColor(item.provinsi);
                  const percentage = ((item.count / totalSantri) * 100).toFixed(1);
                  return (
                    <div key={item.provinsi} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${getRankBadge(rank)}`}>
                        {rank}
                      </span>
                      <span className="text-sm font-medium text-slate-700 flex-1 truncate">{item.provinsi}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{item.count}</span>
                      <span className="text-xs text-slate-400 w-12 text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Provinsi Tab */}
        {activeTab === "provinsi" && (
          <div className="space-y-1.5 pb-2">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: "Jawa", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
                { label: "Kalimantan", color: "bg-blue-100 text-blue-800 border-blue-200" },
                { label: "Sumatera", color: "bg-amber-100 text-amber-800 border-amber-200" },
                { label: "Sulawesi", color: "bg-purple-100 text-purple-800 border-purple-200" },
                { label: "Lainnya", color: "bg-rose-100 text-rose-800 border-rose-200" },
              ].map((l) => (
                <span key={l.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${l.color}`}>{l.label}</span>
              ))}
            </div>

            {provinsiStats.map((item, idx) => {
              const rank = idx + 1;
              const percentage = ((item.count / totalSantri) * 100).toFixed(1);
              const colors = getRegionColor(item.provinsi);
              return (
                <div key={item.provinsi} className={`rounded-2xl border p-3 transition-colors hover:bg-slate-50 ${getRankHighlight(rank)}`}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${getRankBadge(rank)}`}>{rank}</span>
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{item.provinsi}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${colors.bar}`} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5, delay: idx * 0.02, ease: "easeOut" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-[10px] font-medium ${colors.text}`}>{percentage}%</span>
                    <span className="text-[10px] text-slate-400">dari {totalSantri} santri</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kabupaten Tab */}
        {activeTab === "kabupaten" && (
          <div className="space-y-1.5 pb-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kabupaten/kota atau provinsi..."
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </div>

            {filteredKabupaten.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Tidak ditemukan</p>
              </div>
            )}

            {filteredKabupaten.map((item, idx) => {
              const rank = kabupatenStats.findIndex((k) => k.kabupaten === item.kabupaten) + 1;
              const colors = getRegionColor(item.provinsi);
              return (
                <div key={item.kabupaten} className={`rounded-2xl border p-3 transition-colors hover:bg-slate-50 ${getRankHighlight(rank)}`}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${getRankBadge(rank)}`}>{rank <= 99 ? rank : "—"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.kabupaten}</p>
                      <p className={`text-[10px] font-medium ${colors.text} truncate`}>{item.provinsi}</p>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${colors.bar}`} initial={{ width: 0 }} animate={{ width: `${(item.count / maxKabupatenCount) * 100}%` }} transition={{ duration: 0.4, delay: Math.min(idx * 0.01, 0.3), ease: "easeOut" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <BarChart2 className="w-3 h-3" />
          <span>Data berdasarkan {totalSantri.toLocaleString("id-ID")} santri aktif TP 2026/2027</span>
        </div>
      </div>
    </div>
  );

  if (isPage) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          className="relative z-10 w-full sm:max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
          variants={modalContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex flex-col gap-4 p-4 sm:p-5 overflow-y-auto">
            {content}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}