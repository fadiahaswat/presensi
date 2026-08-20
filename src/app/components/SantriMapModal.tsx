import React, { useState, useMemo } from "react";
import { X, MapPin, BarChart2, Building2, Globe, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SANTRI_DATA, SantriData } from "../data/santriData";
import { modalContentVariants } from "../utils/animations";

interface SantriMapModalProps {
  onClose: () => void;
  santriList?: SantriData[];
  isPage?: boolean;
}

// Region color coding
function getRegionColor(provinsi: string): {
  bg: string;
  bar: string;
  badge: string;
  text: string;
} {
  const p = provinsi.toLowerCase();
  if (
    p.includes("jawa") ||
    p.includes("yogyakarta") ||
    p.includes("jakarta") ||
    p.includes("banten")
  ) {
    return {
      bg: "bg-emerald-50",
      bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      text: "text-emerald-700",
    };
  }
  if (p.includes("kalimantan")) {
    return {
      bg: "bg-blue-50",
      bar: "bg-gradient-to-r from-blue-500 to-blue-400",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      text: "text-blue-700",
    };
  }
  if (p.includes("sumatera") || p.includes("sumatra") || p.includes("riau") || p.includes("jambi") || p.includes("lampung") || p.includes("bengkulu") || p.includes("aceh") || p.includes("bangka")) {
    return {
      bg: "bg-amber-50",
      bar: "bg-gradient-to-r from-amber-500 to-amber-400",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      text: "text-amber-700",
    };
  }
  if (p.includes("sulawesi")) {
    return {
      bg: "bg-purple-50",
      bar: "bg-gradient-to-r from-purple-500 to-purple-400",
      badge: "bg-purple-100 text-purple-800 border-purple-200",
      text: "text-purple-700",
    };
  }
  return {
    bg: "bg-rose-50",
    bar: "bg-gradient-to-r from-rose-500 to-rose-400",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    text: "text-rose-700",
  };
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

export function SantriMapModal({
  onClose,
  santriList,
  isPage = false,
}: SantriMapModalProps) {
  const [activeTab, setActiveTab] = useState<"provinsi" | "kabupaten">(
    "provinsi"
  );
  const [search, setSearch] = useState("");

  const data = santriList ?? ALL_SANTRI_DATA;

  // Compute provinsi stats
  const provinsiStats = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((s) => {
      const p = s.provinsi?.trim() || "Tidak Diketahui";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([provinsi, count]) => ({ provinsi, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Compute kabupaten stats
  const kabupatenStats = useMemo(() => {
    const map = new Map<string, { count: number; provinsi: string }>();
    data.forEach((s) => {
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
      .map(([kabupaten, { count, provinsi }]) => ({
        kabupaten,
        count,
        provinsi,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const totalSantri = data.length;
  const totalProvinsi = provinsiStats.length;
  const totalKabupaten = kabupatenStats.length;

  const maxProvinsiCount = provinsiStats[0]?.count ?? 1;
  const maxKabupatenCount = kabupatenStats[0]?.count ?? 1;

  const filteredKabupaten = useMemo(() => {
    if (!search.trim()) return kabupatenStats;
    const q = search.toLowerCase();
    return kabupatenStats.filter(
      (k) =>
        k.kabupaten.toLowerCase().includes(q) ||
        k.provinsi.toLowerCase().includes(q)
    );
  }, [kabupatenStats, search]);

  const content = (
    <div
      className={`flex flex-col ${
        isPage ? "gap-4 w-full" : "w-full max-h-[90vh] overflow-hidden"
      }`}
    >
      {/* ── Header ── */}
      <div
        className={`relative overflow-hidden flex items-center justify-between gap-3 p-4 sm:p-5 ${
          isPage
            ? "bg-white rounded-3xl border border-slate-200/70 shadow-xs"
            : "bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-t-3xl"
        }`}
      >
        {/* Decorative bubbles */}
        {!isPage && (
          <>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute -bottom-4 right-16 w-16 h-16 bg-white/5 rounded-full" />
          </>
        )}
        <div className="relative flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isPage
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white/15 text-white"
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2
              className={`font-bold text-base sm:text-lg leading-tight ${
                isPage ? "text-slate-900" : "text-white"
              }`}
            >
              Peta Sebaran Santri
            </h2>
            <p
              className={`text-xs mt-0.5 ${
                isPage ? "text-slate-500" : "text-emerald-100/80"
              }`}
            >
              Distribusi asal daerah santri Mu'allimiin
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
            isPage
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-2.5 px-0">
        {[
          {
            icon: <Globe className="w-4 h-4" />,
            label: "Total Santri",
            value: totalSantri.toLocaleString("id-ID"),
            color: "text-emerald-700 bg-emerald-50 border-emerald-200",
            iconBg: "bg-emerald-100 text-emerald-700",
          },
          {
            icon: <MapPin className="w-4 h-4" />,
            label: "Provinsi",
            value: totalProvinsi,
            color: "text-blue-700 bg-blue-50 border-blue-200",
            iconBg: "bg-blue-100 text-blue-700",
          },
          {
            icon: <Building2 className="w-4 h-4" />,
            label: "Kab/Kota",
            value: totalKabupaten,
            color: "text-purple-700 bg-purple-50 border-purple-200",
            iconBg: "bg-purple-100 text-purple-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 ${stat.color}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
              {stat.icon}
            </div>
            <span className="text-xl font-black leading-none">{stat.value}</span>
            <span className="text-[10px] font-semibold opacity-70 text-center leading-tight">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-slate-100 rounded-2xl p-1 flex gap-1">
        {(["provinsi", "kabupaten"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setSearch(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "provinsi" ? (
              <><MapPin className="w-3.5 h-3.5" /> Provinsi</>
            ) : (
              <><Building2 className="w-3.5 h-3.5" /> Kabupaten/Kota</>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className={`flex-1 overflow-y-auto ${isPage ? "" : "min-h-0"}`}>
        {/* Provinsi Tab */}
        {activeTab === "provinsi" && (
          <div className="space-y-1.5 pb-2">
            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: "Jawa", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
                { label: "Kalimantan", color: "bg-blue-100 text-blue-800 border-blue-200" },
                { label: "Sumatera", color: "bg-amber-100 text-amber-800 border-amber-200" },
                { label: "Sulawesi", color: "bg-purple-100 text-purple-800 border-purple-200" },
                { label: "Lainnya", color: "bg-rose-100 text-rose-800 border-rose-200" },
              ].map((l) => (
                <span key={l.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${l.color}`}>
                  {l.label}
                </span>
              ))}
            </div>

            {provinsiStats.map((item, idx) => {
              const rank = idx + 1;
              const barWidth = Math.round((item.count / maxProvinsiCount) * 100);
              const colors = getRegionColor(item.provinsi);
              return (
                <div
                  key={item.provinsi}
                  className={`rounded-2xl border p-3 transition-colors ${getRankHighlight(rank)}`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${getRankBadge(rank)}`}>
                      {rank}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">
                      {item.provinsi}
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>
                      {item.count}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.02, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-[10px] font-medium ${colors.text}`}>
                      {((item.count / totalSantri) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      dari {totalSantri} santri
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kabupaten Tab */}
        {activeTab === "kabupaten" && (
          <div className="space-y-1.5 pb-2">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kabupaten/kota atau provinsi..."
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </div>

            {filteredKabupaten.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Tidak ditemukan</p>
              </div>
            )}

            {filteredKabupaten.map((item, idx) => {
              // rank is based on original sorted position
              const rank = kabupatenStats.findIndex((k) => k.kabupaten === item.kabupaten) + 1;
              const barWidth = Math.round((item.count / maxKabupatenCount) * 100);
              const colors = getRegionColor(item.provinsi);
              return (
                <div
                  key={item.kabupaten}
                  className={`rounded-2xl border p-3 transition-colors ${getRankHighlight(rank)}`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${getRankBadge(rank)}`}>
                      {rank <= 99 ? rank : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.kabupaten}
                      </p>
                      <p className={`text-[10px] font-medium ${colors.text} truncate`}>
                        {item.provinsi}
                      </p>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${colors.badge}`}>
                      {item.count}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.01, 0.3), ease: "easeOut" }}
                    />
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
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        {/* Modal */}
        <motion.div
          className="relative z-10 w-full sm:max-w-lg bg-white rounded-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
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
