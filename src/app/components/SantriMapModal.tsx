import React, { useState, useMemo, useRef } from "react";
import {
  X, MapPin, Building2, Globe, Search, TrendingUp,
  ChevronDown, ChevronUp, Medal, Users, ArrowLeft, Filter,
  GraduationCap, School, Phone, UserCheck, Sparkles, Map as MapIcon,
  ChevronRight, Compass, Layers, CheckCircle2, Share2, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SANTRI_DATA, SantriData } from "../data/santriData";
import { modalContentVariants } from "../utils/animations";

interface SantriMapModalProps {
  onClose?: () => void;
  santriList?: SantriData[];
  isPage?: boolean;
}

// ── Region Styling Config ─────────────────────────────────────────────────────
interface RegionColors {
  bg: string;
  bar: string;
  badge: string;
  text: string;
  dot: string;
  border: string;
  accent: string;
}

function getRegionColor(provinsi: string): RegionColors {
  const p = (provinsi || "").toLowerCase();
  if (p.includes("yogyakarta")) {
    return {
      bg: "bg-emerald-50/90",
      bar: "bg-gradient-to-r from-emerald-600 to-teal-500",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      text: "text-emerald-800",
      dot: "bg-emerald-600",
      border: "border-emerald-300",
      accent: "#059669",
    };
  }
  if (p.includes("jawa") || p.includes("jakarta") || p.includes("banten")) {
    return {
      bg: "bg-teal-50/80",
      bar: "bg-gradient-to-r from-teal-600 to-emerald-400",
      badge: "bg-teal-100 text-teal-800 border-teal-200",
      text: "text-teal-700",
      dot: "bg-teal-500",
      border: "border-teal-200",
      accent: "#0d9488",
    };
  }
  if (p.includes("sumatera") || p.includes("riau") || p.includes("jambi") || p.includes("lampung") || p.includes("bengkulu") || p.includes("aceh") || p.includes("bangka")) {
    return {
      bg: "bg-amber-50/80",
      bar: "bg-gradient-to-r from-amber-600 to-amber-400",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
      border: "border-amber-200",
      accent: "#f59e0b",
    };
  }
  if (p.includes("kalimantan")) {
    return {
      bg: "bg-sky-50/80",
      bar: "bg-gradient-to-r from-sky-600 to-blue-400",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      text: "text-sky-700",
      dot: "bg-sky-500",
      border: "border-sky-200",
      accent: "#0284c7",
    };
  }
  if (p.includes("sulawesi") || p.includes("gorontalo")) {
    return {
      bg: "bg-purple-50/80",
      bar: "bg-gradient-to-r from-purple-600 to-purple-400",
      badge: "bg-purple-100 text-purple-800 border-purple-200",
      text: "text-purple-700",
      dot: "bg-purple-500",
      border: "border-purple-200",
      accent: "#9333ea",
    };
  }
  if (p.includes("nusa tenggara") || p.includes("bali") || p.includes("maluku") || p.includes("papua")) {
    return {
      bg: "bg-rose-50/80",
      bar: "bg-gradient-to-r from-rose-600 to-rose-400",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      text: "text-rose-700",
      dot: "bg-rose-500",
      border: "border-rose-200",
      accent: "#e11d48",
    };
  }
  return {
    bg: "bg-slate-50/80",
    bar: "bg-gradient-to-r from-slate-500 to-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
    accent: "#64748b",
  };
}

const ISLAND_REGIONS = [
  {
    id: "jawa",
    name: "Jawa & D.I. Yogyakarta",
    shortName: "Jawa & DIY",
    keywords: ["jawa", "yogyakarta", "jakarta", "banten"],
    color: "#059669",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  {
    id: "sumatera",
    name: "Kepulauan Sumatera",
    shortName: "Sumatera",
    keywords: ["sumatera", "riau", "jambi", "lampung", "bengkulu", "aceh", "bangka"],
    color: "#d97706",
    tagColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    id: "kalimantan",
    name: "Pulau Kalimantan",
    shortName: "Kalimantan",
    keywords: ["kalimantan"],
    color: "#0284c7",
    tagColor: "bg-sky-100 text-sky-800 border-sky-300",
  },
  {
    id: "sulawesi",
    name: "Pulau Sulawesi",
    shortName: "Sulawesi",
    keywords: ["sulawesi", "gorontalo"],
    color: "#9333ea",
    tagColor: "bg-purple-100 text-purple-800 border-purple-300",
  },
  {
    id: "bali_nusra",
    name: "Bali & Nusa Tenggara",
    shortName: "Bali & NT",
    keywords: ["bali", "nusa tenggara", "ntb", "ntt"],
    color: "#e11d48",
    tagColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  {
    id: "maluku_papua",
    name: "Maluku & Papua",
    shortName: "Maluku & Papua",
    keywords: ["maluku", "papua"],
    color: "#0891b2",
    tagColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
];

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-amber-400 text-white shadow-xs">🥇</span>;
  if (rank === 2) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-slate-400 text-white shadow-xs">🥈</span>;
  if (rank === 3) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 bg-orange-400 text-white shadow-xs">🥉</span>;
  if (rank <= 10) return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 bg-emerald-100 text-emerald-800">{rank}</span>;
  return <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-slate-100 text-slate-500">{rank}</span>;
}

// ── Interactive Indonesia SVG Map Component ───────────────────────────────────
interface IndonesiaMapProps {
  onSelectRegion: (type: "provinsi" | "island", value: string, title: string) => void;
  data: SantriData[];
}

function IndonesiaMap({ onSelectRegion, data }: IndonesiaMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Region aggregation for island groups
  const islandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ISLAND_REGIONS.forEach(r => (counts[r.id] = 0));
    let otherCount = 0;

    data.forEach(s => {
      const p = (s.provinsi || "").toLowerCase();
      let matched = false;
      for (const region of ISLAND_REGIONS) {
        if (region.keywords.some(kw => p.includes(kw))) {
          counts[region.id] = (counts[region.id] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) otherCount++;
    });

    return { counts, otherCount };
  }, [data]);

  // Major pin locations with direct province mapping
  const mapHotspots = useMemo(() => [
    { id: "diy", label: "D.I. Yogyakarta", short: "DIY", x: 440, y: 275, provKeyword: "yogyakarta", islandId: "jawa", isPrimary: true },
    { id: "jateng", label: "Jawa Tengah", short: "Jateng", x: 390, y: 265, provKeyword: "jawa tengah", islandId: "jawa" },
    { id: "jabar", label: "Jawa Barat", short: "Jabar", x: 330, y: 250, provKeyword: "jawa barat", islandId: "jawa" },
    { id: "jatim", label: "Jawa Timur", short: "Jatim", x: 485, y: 270, provKeyword: "jawa timur", islandId: "jawa" },
    { id: "dki", label: "DKI Jakarta", short: "DKI", x: 310, y: 235, provKeyword: "jakarta", islandId: "jawa" },
    { id: "banten", label: "Banten", short: "Banten", x: 275, y: 240, provKeyword: "banten", islandId: "jawa" },
    { id: "lampung", label: "Lampung", short: "Lampung", x: 260, y: 205, provKeyword: "lampung", islandId: "sumatera" },
    { id: "sumsel", label: "Sumatera Selatan", short: "Sumsel", x: 235, y: 170, provKeyword: "sumatera selatan", islandId: "sumatera" },
    { id: "sumbar", label: "Sumatera Barat", short: "Sumbar", x: 175, y: 120, provKeyword: "sumatera barat", islandId: "sumatera" },
    { id: "riau", label: "Riau", short: "Riau", x: 210, y: 105, provKeyword: "riau", islandId: "sumatera" },
    { id: "sumut", label: "Sumatera Utara", short: "Sumut", x: 155, y: 65, provKeyword: "sumatera utara", islandId: "sumatera" },
    { id: "aceh", label: "Aceh", short: "Aceh", x: 110, y: 30, provKeyword: "aceh", islandId: "sumatera" },
    { id: "kalsel", label: "Kalimantan Selatan", short: "Kalsel", x: 505, y: 185, provKeyword: "kalimantan selatan", islandId: "kalimantan" },
    { id: "kaltim", label: "Kalimantan Timur", short: "Kaltim", x: 540, y: 125, provKeyword: "kalimantan timur", islandId: "kalimantan" },
    { id: "kalbar", label: "Kalimantan Barat", short: "Kalbar", x: 380, y: 135, provKeyword: "kalimantan barat", islandId: "kalimantan" },
    { id: "kalteng", label: "Kalimantan Tengah", short: "Kalteng", x: 440, y: 160, provKeyword: "kalimantan tengah", islandId: "kalimantan" },
    { id: "sulsel", label: "Sulawesi Selatan", short: "Sulsel", x: 605, y: 200, provKeyword: "sulawesi selatan", islandId: "sulawesi" },
    { id: "sulteng", label: "Sulawesi Tengah", short: "Sulteng", x: 630, y: 140, provKeyword: "sulawesi tengah", islandId: "sulawesi" },
    { id: "sulut", label: "Sulawesi Utara", short: "Sulut", x: 690, y: 80, provKeyword: "sulawesi utara", islandId: "sulawesi" },
    { id: "bali", label: "Bali", short: "Bali", x: 540, y: 285, provKeyword: "bali", islandId: "bali_nusra" },
    { id: "ntb", label: "Nusa Tenggara Barat", short: "NTB", x: 580, y: 290, provKeyword: "nusa tenggara barat", islandId: "bali_nusra" },
    { id: "ntt", label: "Nusa Tenggara Timur", short: "NTT", x: 665, y: 300, provKeyword: "nusa tenggara timur", islandId: "bali_nusra" },
    { id: "maluku", label: "Maluku", short: "Maluku", x: 740, y: 155, provKeyword: "maluku", islandId: "maluku_papua" },
    { id: "papua", label: "Papua", short: "Papua", x: 860, y: 190, provKeyword: "papua", islandId: "maluku_papua" },
  ], []);

  // Compute hotspot counts
  const hotspotWithCounts = useMemo(() => {
    return mapHotspots.map(h => {
      const count = data.filter(s =>
        (s.provinsi || "").toLowerCase().includes(h.provKeyword)
      ).length;
      return { ...h, count };
    });
  }, [data, mapHotspots]);

  return (
    <div className="flex flex-col gap-3">
      {/* Brand-Themed Islamic/Academic Map Canvas Card */}
      <div className="relative w-full bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-3.5 sm:p-5 border border-emerald-700/40 shadow-xl overflow-hidden text-white select-none">
        
        {/* Subtle geometric islamic watermarks & ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Map Header inside canvas */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2 pb-2.5 border-b border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="font-bold text-white tracking-wide flex items-center gap-1.5 text-xs sm:text-sm">
              <Compass className="w-4 h-4 text-emerald-400" /> Peta Interaktif Sebaran Nusantara
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 bg-emerald-800/60 backdrop-blur-xs px-3 py-1 rounded-full border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Klik pulau atau pin untuk daftar santri</span>
          </div>
        </div>

        {/* SVG Map of Indonesia */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[230px] max-h-[360px] flex items-center justify-center">
          <svg
            viewBox="0 0 960 380"
            className="w-full h-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
          >
            {/* SVG Defs for Gradients */}
            <defs>
              <linearGradient id="gradSumatera" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="gradJawa" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="gradKalimantan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="gradSulawesi" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <linearGradient id="gradNusra" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
              <linearGradient id="gradPapua" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>

            {/* 1. SUMATERA */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "sumatera", "Kepulauan Sumatera")}
              onMouseEnter={() => setHoveredRegion("sumatera")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path
                d="M 100,25 
                   C 115,18 135,35 155,60 
                   C 175,85 195,100 215,120 
                   C 235,140 250,165 270,200 
                   C 265,215 245,215 230,195 
                   C 205,175 180,140 160,110 
                   C 135,75 105,45 95,30 Z"
                fill="url(#gradSumatera)"
                stroke="#fed7aa"
                strokeWidth="1.5"
                className="opacity-90 hover:opacity-100 hover:brightness-110 transition-all"
              />
              <ellipse cx="140" cy="115" rx="5" ry="12" fill="#d97706" transform="rotate(-30 140 115)" />
              <ellipse cx="170" cy="165" rx="4" ry="14" fill="#d97706" transform="rotate(-30 170 165)" />
              <ellipse cx="280" cy="160" rx="9" ry="14" fill="#f59e0b" stroke="#fed7aa" strokeWidth="1" />
              <ellipse cx="305" cy="175" rx="6" ry="7" fill="#f59e0b" stroke="#fed7aa" strokeWidth="1" />
            </g>

            {/* 2. JAWA & MADURA & BALI */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "jawa", "Pulau Jawa & D.I. Yogyakarta")}
              onMouseEnter={() => setHoveredRegion("jawa")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path
                d="M 265,245 
                   C 290,235 340,238 390,250 
                   C 430,258 480,260 525,270 
                   C 525,280 475,285 435,282 
                   C 385,280 320,270 270,260 Z"
                fill="url(#gradJawa)"
                stroke="#6ee7b7"
                strokeWidth="1.5"
                className="opacity-95 hover:opacity-100 hover:brightness-110 transition-all"
              />
              <ellipse cx="505" cy="256" rx="18" ry="6" fill="#059669" stroke="#6ee7b7" strokeWidth="1" />
            </g>

            {/* 3. KALIMANTAN */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "kalimantan", "Pulau Kalimantan")}
              onMouseEnter={() => setHoveredRegion("kalimantan")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path
                d="M 370,140 
                   C 365,115 395,85 435,75 
                   C 480,65 520,80 545,100 
                   C 560,115 565,145 540,170 
                   C 515,195 490,205 450,200 
                   C 400,195 375,170 370,140 Z"
                fill="url(#gradKalimantan)"
                stroke="#bae6fd"
                strokeWidth="1.5"
                className="opacity-90 hover:opacity-100 hover:brightness-110 transition-all"
              />
            </g>

            {/* 4. SULAWESI */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "sulawesi", "Pulau Sulawesi")}
              onMouseEnter={() => setHoveredRegion("sulawesi")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path
                d="M 685,75 
                   C 660,85 640,105 630,125 
                   C 610,135 595,160 595,190 
                   C 600,215 620,215 625,185 
                   C 630,165 650,160 670,165 
                   C 655,150 645,135 645,120 
                   C 655,105 680,95 690,80 Z"
                fill="url(#gradSulawesi)"
                stroke="#f3e8ff"
                strokeWidth="1.5"
                className="opacity-90 hover:opacity-100 hover:brightness-110 transition-all"
              />
              <path
                d="M 625,180 C 635,175 660,185 665,210 C 655,225 635,205 625,185 Z"
                fill="url(#gradSulawesi)"
                stroke="#f3e8ff"
                strokeWidth="1"
              />
            </g>

            {/* 5. BALI & NUSA TENGGARA */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "bali_nusra", "Bali & Nusa Tenggara")}
              onMouseEnter={() => setHoveredRegion("bali_nusra")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <ellipse cx="542" cy="285" rx="8" ry="6" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
              <ellipse cx="565" cy="288" rx="8" ry="7" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
              <ellipse cx="600" cy="290" rx="16" ry="7" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
              <ellipse cx="650" cy="292" rx="22" ry="6" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
              <ellipse cx="640" cy="315" rx="14" ry="7" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
              <ellipse cx="700" cy="305" rx="18" ry="8" fill="#f43f5e" stroke="#fecdd3" strokeWidth="1" />
            </g>

            {/* 6. MALUKU & MALUT */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "maluku_papua", "Maluku & Papua")}
              onMouseEnter={() => setHoveredRegion("maluku_papua")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path d="M 725,95 C 735,80 745,100 740,115 C 750,120 740,135 730,125 Z" fill="#06b6d4" stroke="#cffafe" strokeWidth="1" />
              <ellipse cx="750" cy="170" rx="20" ry="7" fill="#06b6d4" stroke="#cffafe" strokeWidth="1" />
              <ellipse cx="715" cy="170" rx="10" ry="8" fill="#06b6d4" stroke="#cffafe" strokeWidth="1" />
            </g>

            {/* 7. PAPUA */}
            <g
              className="cursor-pointer transition-all duration-200 group"
              onClick={() => onSelectRegion("island", "maluku_papua", "Maluku & Papua")}
              onMouseEnter={() => setHoveredRegion("maluku_papua")}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <path
                d="M 790,145 
                   C 805,130 820,150 825,160 
                   C 850,155 890,165 940,185 
                   C 940,245 885,250 855,240 
                   C 830,225 820,195 805,185 
                   C 785,175 780,155 790,145 Z"
                fill="url(#gradPapua)"
                stroke="#cffafe"
                strokeWidth="1.5"
                className="opacity-90 hover:opacity-100 hover:brightness-110 transition-all"
              />
            </g>

            {/* HOTSPOT PINS & COUNTS */}
            {hotspotWithCounts
              .filter(h => h.count > 0)
              .map(h => {
                const isHovered = hoveredRegion === h.islandId;
                const isPrimaryHub = h.id === "diy" || h.id === "jateng";
                const radius = Math.min(Math.max(Math.sqrt(h.count) * 2.8, 7.5), 16);

                return (
                  <g
                    key={h.id}
                    className="cursor-pointer transition-transform duration-200 hover:scale-125"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRegion("provinsi", h.provKeyword, h.label);
                    }}
                  >
                    {/* Ring for hubs like DIY & Jateng */}
                    {isPrimaryHub && (
                      <circle
                        cx={h.x}
                        cy={h.y}
                        r={radius + 4.5}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="1.5"
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Pin Circle */}
                    <circle
                      cx={h.x}
                      cy={h.y}
                      r={radius}
                      fill={h.islandId === "jawa" ? "#047857" : h.islandId === "sumatera" ? "#d97706" : h.islandId === "kalimantan" ? "#0284c7" : h.islandId === "sulawesi" ? "#7e22ce" : "#be123c"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="shadow-lg"
                    />

                    {/* Number Count inside pin */}
                    <text
                      x={h.x}
                      y={h.y + 3.5}
                      textAnchor="middle"
                      fontSize={radius > 11 ? "9" : "7.5"}
                      fontWeight="900"
                      fill="#ffffff"
                    >
                      {h.count}
                    </text>

                    {/* Label */}
                    {(h.count >= 15 || isHovered) && (
                      <text
                        x={h.x}
                        y={h.y - radius - 3.5}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#ffffff"
                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none pointer-events-none"
                      >
                        {h.short}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Island Summary Chips on bottom of map */}
        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-2.5 border-t border-emerald-500/20">
          {ISLAND_REGIONS.map(reg => {
            const count = islandCounts.counts[reg.id] || 0;
            const pct = data.length ? ((count / data.length) * 100).toFixed(0) : "0";
            return (
              <button
                key={reg.id}
                type="button"
                onClick={() => onSelectRegion("island", reg.id, reg.name)}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/10 hover:bg-emerald-600/40 active:scale-95 transition-all text-center border border-white/15 cursor-pointer backdrop-blur-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reg.color }} />
                  <span className="text-[10px] font-bold text-slate-200 truncate">{reg.shortName}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xs font-black text-emerald-200">{count}</span>
                  <span className="text-[9px] text-slate-400 font-semibold">({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Drill Down: Detail Santri by Region View ──────────────────────────────────
interface RegionSantriDetailProps {
  title: string;
  subtitle?: string;
  santri: SantriData[];
  totalSantriAll: number;
  onBack: () => void;
}

function RegionSantriDetail({ title, subtitle, santri, totalSantriAll, onBack }: RegionSantriDetailProps) {
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState<string>("all");

  const availableKelas = useMemo(() => {
    const set = new Set<string>();
    santri.forEach(s => {
      if (s.tingkat) set.add(s.tingkat);
    });
    return Array.from(set).sort();
  }, [santri]);

  const filteredSantri = useMemo(() => {
    return santri.filter(s => {
      const matchSearch =
        !search.trim() ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn?.toLowerCase().includes(search.toLowerCase()) ||
        s.kabupaten?.toLowerCase().includes(search.toLowerCase()) ||
        s.kecamatan?.toLowerCase().includes(search.toLowerCase()) ||
        s.asalSekolah?.toLowerCase().includes(search.toLowerCase());

      const matchKelas = filterKelas === "all" || s.tingkat === filterKelas;
      return matchSearch && matchKelas;
    });
  }, [santri, search, filterKelas]);

  const pct = ((santri.length / (totalSantriAll || 1)) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col gap-3.5"
    >
      {/* Brand Header Back & Summary Card */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-3.5 sm:p-4 rounded-3xl shadow-lg border border-emerald-700/50">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white shrink-0 transition-all border border-white/20 cursor-pointer shadow-xs"
            title="Kembali ke Peta Sebaran"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black truncate leading-tight text-white">{title}</h3>
            <p className="text-[11px] text-emerald-200 font-medium truncate mt-0.5">
              {subtitle || `Daftar nama santri asal ${title}`}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 bg-white/15 px-3.5 py-1.5 rounded-2xl border border-white/20 backdrop-blur-xs">
          <span className="text-base sm:text-lg font-black leading-none block text-white">{santri.length}</span>
          <span className="text-[10px] text-emerald-200 font-bold">{pct}% dari total</span>
        </div>
      </div>

      {/* Search and Class Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Cari nama, NISN, atau sekolah (${santri.length} santri)...`}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tingkat Filter Chips */}
        {availableKelas.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterKelas("all")}
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterKelas === "all"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Kelas
            </button>
            {availableKelas.map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKelas(k)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterKelas === k
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Santri List Cards - Harmonized with DataSantriModal Style */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {filteredSantri.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 shadow-2xs">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="text-sm font-bold text-slate-700">Tidak ada santri ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter kelas</p>
          </div>
        ) : (
          filteredSantri.map((s, idx) => {
            const colors = getRegionColor(s.provinsi);
            return (
              <div
                key={s.id || s.nis || idx}
                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col gap-2.5 group"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-sm text-slate-900 leading-tight">
                          {s.nama}
                        </span>
                        {s.jk && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            s.jk.toLowerCase().includes("l") ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                          }`}>
                            {s.jk}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                          {s.kelasLengkap || s.paralel || s.tingkat}
                        </span>
                        {s.nisn && <span className="text-slate-400">NISN: {s.nisn}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${colors.badge}`}>
                    {s.kabupaten || s.provinsi}
                  </span>
                </div>

                {/* Detail Information Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/90 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {[s.desa, s.kecamatan, s.kabupaten].filter(Boolean).join(", ") || s.alamat || "Alamat tidak tersedia"}
                    </span>
                  </div>
                  {s.asalSekolah && (
                    <div className="flex items-center gap-1.5 truncate">
                      <School className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate text-slate-500">Asal: <strong className="text-slate-700 font-bold">{s.asalSekolah}</strong></span>
                    </div>
                  )}
                  {s.namaAyah && (
                    <div className="flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">Wali: <strong className="text-slate-700 font-semibold">{s.namaAyah}</strong></span>
                    </div>
                  )}
                  {(s.telpAyah || s.telpIbu || s.telpWali) && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-600 font-mono font-medium">
                        {s.telpAyah || s.telpIbu || s.telpWali}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ── Main Modal / Page Component ───────────────────────────────────────────────
export function SantriMapModal({ onClose, santriList, isPage = false }: SantriMapModalProps) {
  const [activeTab, setActiveTab] = useState<"peta" | "provinsi" | "kabupaten">("peta");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedRegionDetail, setSelectedRegionDetail] = useState<{
    title: string;
    subtitle?: string;
    santri: SantriData[];
  } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const data = santriList ?? ALL_SANTRI_DATA;

  // ── Compute Statistics ──────────────────────────────────────────────────────
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

  const displayedProvinsi = showAll ? provinsiStats : provinsiStats.slice(0, 12);
  const top3 = kabupatenStats.slice(0, 3);

  // ── Handle Region Selection for Santri Drill-Down ───────────────────────────
  const handleSelectRegion = (type: "provinsi" | "island" | "kabupaten", value: string, title: string) => {
    let santriFiltered: SantriData[] = [];
    const val = value.toLowerCase();

    if (type === "island") {
      const regionConfig = ISLAND_REGIONS.find(r => r.id === value);
      if (regionConfig) {
        santriFiltered = data.filter(s => {
          const p = (s.provinsi || "").toLowerCase();
          return regionConfig.keywords.some(kw => p.includes(kw));
        });
      }
    } else if (type === "provinsi") {
      santriFiltered = data.filter(s =>
        (s.provinsi || "").toLowerCase().includes(val)
      );
    } else if (type === "kabupaten") {
      santriFiltered = data.filter(s =>
        (s.kabupaten || "").toLowerCase() === val || (s.kabupaten || "").toLowerCase().includes(val)
      );
    }

    setSelectedRegionDetail({
      title: title,
      subtitle: `${santriFiltered.length} santri dari ${title}`,
      santri: santriFiltered,
    });
  };

  const content = (
    <div className="flex flex-col min-h-0 gap-3.5">

      {/* ── 1. Unified Master Header Card ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5 shrink-0">
        {/* Top Row: Icon + Title + Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-[#0C81E4] text-white shadow-sky-600/25">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                Peta Sebaran Santri
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Distribusi santri Mu'allimiin TP 2026/2027 ({totalSantri.toLocaleString("id-ID")} Santri)
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-2xs flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Integrated Brand Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Users className="w-3.5 h-3.5 text-emerald-700" />, label: "Total Santri", value: totalSantri.toLocaleString("id-ID"), bg: "bg-slate-50/80 border-slate-100/80 text-slate-800" },
            { icon: <Globe className="w-3.5 h-3.5 text-teal-700" />, label: "Provinsi", value: provinsiStats.length, bg: "bg-slate-50/80 border-slate-100/80 text-slate-800" },
            { icon: <Building2 className="w-3.5 h-3.5 text-sky-700" />, label: "Kab/Kota", value: kabupatenStats.length, bg: "bg-slate-50/80 border-slate-100/80 text-slate-800" },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl border p-2.5 flex flex-col items-center gap-0.5 ${stat.bg}`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-2xs border border-slate-100">
                {stat.icon}
              </div>
              <span className="text-base sm:text-lg font-black font-mono leading-none mt-1">{stat.value}</span>
              <span className="text-[10px] font-bold text-slate-400 text-center leading-tight font-mono">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Integrated Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/80">
          {(["peta", "provinsi", "kabupaten"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setSearch(""); setShowAll(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {tab === "peta" && <><MapIcon className="w-3.5 h-3.5" /> <span>Peta Indonesia</span></>}
              {tab === "provinsi" && <><MapPin className="w-3.5 h-3.5" /> <span>Per Provinsi</span></>}
              {tab === "kabupaten" && <><Building2 className="w-3.5 h-3.5" /> <span>Per Kab/Kota</span></>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className={`flex-1 overflow-y-auto flex flex-col gap-3.5 ${isPage ? "" : "p-4 sm:p-5"}`}>

        {/* If user clicked a region, show the drill-down santri list */}
        {selectedRegionDetail ? (
          <RegionSantriDetail
            title={selectedRegionDetail.title}
            subtitle={selectedRegionDetail.subtitle}
            santri={selectedRegionDetail.santri}
            totalSantriAll={totalSantri}
            onBack={() => setSelectedRegionDetail(null)}
          />
        ) : (
          <>
            {/* ── Top 3 Kabupaten highlight inside white container card ── */}
            <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5 text-amber-500" /> Top 3 Asal Terbanyak
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">Sentuh untuk lihat nama</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {top3.map((item, i) => {
                  const colors = getRegionColor(item.provinsi);
                  const pct = ((item.count / totalSantri) * 100).toFixed(1);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <button
                      key={item.kabupaten}
                      type="button"
                      onClick={() => handleSelectRegion("kabupaten", item.kabupaten, item.kabupaten)}
                      className={`rounded-2xl border p-2.5 flex flex-col text-left gap-1 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer hover:shadow-xs ${colors.bg} ${colors.border}`}
                    >
                      <span className="text-lg leading-none">{medals[i]}</span>
                      <p className="text-[11px] font-black text-slate-900 leading-tight line-clamp-2">{item.kabupaten}</p>
                      <p className={`text-[10px] font-semibold leading-tight ${colors.text} truncate`}>{item.provinsi}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs font-black ${colors.text}`}>{item.count}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Tab Content: Peta Interaktif Indonesia ── */}
            {activeTab === "peta" && (
              <IndonesiaMap
                data={data}
                onSelectRegion={(type, val, title) => handleSelectRegion(type, val, title)}
              />
            )}

            {/* ── Tab Content: Provinsi ── */}
            {activeTab === "provinsi" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Klik pada baris provinsi untuk melihat daftar nama santri
                </p>
                {displayedProvinsi.map((item, idx) => {
                  const rank = idx + 1;
                  const barWidth = Math.round((item.count / maxProvinsiCount) * 100);
                  const pct = ((item.count / totalSantri) * 100).toFixed(1);
                  const colors = getRegionColor(item.provinsi);
                  return (
                    <div
                      key={item.provinsi}
                      onClick={() => handleSelectRegion("provinsi", item.provinsi, item.provinsi)}
                      className={`rounded-2xl border p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer hover:shadow-sm ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <RankMedal rank={rank} />
                        <span className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">{item.provinsi}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${colors.badge} shrink-0`}>
                            {item.count} santri
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${colors.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.4, delay: Math.min(idx * 0.015, 0.3), ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className={`text-[10px] font-bold ${colors.text}`}>{pct}% santri</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.count} dari {totalSantri} santri</span>
                      </div>
                    </div>
                  );
                })}

                {/* Expand toggle */}
                {provinsiStats.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Cari dari ${kabupatenStats.length} kabupaten/kota...`}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Klik kabupaten/kota untuk melihat daftar santri di daerah tersebut
                </p>

                {filteredKabupaten.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 shadow-2xs">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-sm font-bold text-slate-700">Tidak ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba kata kunci pencarian lain</p>
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
                      onClick={() => handleSelectRegion("kabupaten", item.kabupaten, item.kabupaten)}
                      className={`rounded-2xl border p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer hover:shadow-sm ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <RankMedal rank={rank} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.kabupaten}</p>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
                            <p className={`text-[10px] font-semibold truncate ${colors.text}`}>{item.provinsi}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${colors.badge}`}>
                              {item.count} santri
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
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

            {/* ── Brand Footer ── */}
            <div className="pt-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data sebaran {totalSantri.toLocaleString("id-ID")} santri aktif Madrasah Mu'allimiin TP 2026/2027</span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );

  if (isPage) {
    return (
      <div className="w-full max-w-3xl mx-auto p-3 sm:p-4 flex flex-col gap-0 pb-20">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        {/* Sheet/Modal */}
        <motion.div
          className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
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
