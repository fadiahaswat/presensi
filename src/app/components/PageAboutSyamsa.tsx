import React, { useState } from "react";
import {
  ChevronLeft, Check, Sun, Sparkles, Heart, Users,
  GraduationCap, ShieldCheck, BookOpen, Clock,
  Layers, Smartphone, Cloud, FileCheck2, HeartPulse,
  Calendar, CheckCheck, ArrowRight, Shield, Copy,
  Award, Star, Flame, Moon, X, Globe, Crown,
  Download, Eye, CheckCircle2, AlertTriangle, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { triggerHaptic, springSmooth } from "../utils/animations";
import syamsaPrimaryLogo from "../../assets/branding/Primary Logo.webp";
import syamsaVerticalLogo from "../../assets/branding/Vertical Logo.webp";
import syamsaLogomark from "../../assets/branding/Logomark.webp";
import syamsaWordmark from "../../assets/branding/Wordmark.webp";
import logoMuallimin from "../../assets/branding/Logo Mu'allimin.webp";
import logoMuhammadiyah from "../../assets/branding/Logo PP Muhammadiyah.webp";
import logoSekolahPemimpin from "../../assets/branding/Logo Sekolah Pemimpin Bangsa.webp";

interface PageAboutSyamsaProps {
  onBack: () => void;
  authUser?: any;
  onGoTo?: (page: string) => void;
}

export function PageAboutSyamsa({ onBack, onGoTo }: PageAboutSyamsaProps) {
  const [activeTab, setActiveTab] = useState<"filosofi" | "brand" | "sejarah">("filosofi");

  const RAYS_DATA = [
    {
      num: "01",
      title: "Tingkat 1 (Kelas VII)",
      role: "Santri Kelas 1",
      desc: "Fase ta'aruf, adaptasi kehidupan asrama, dan peletakan fondasi keistiqamahan ibadah fajar.",
      color: "#2563EB",
      bgLight: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
    },
    {
      num: "02",
      title: "Tingkat 2 (Kelas VIII)",
      role: "Santri Kelas 2",
      desc: "Penguatan adab pergaulan islami, ketertiban shalat berjamaah, dan kemandirian harian.",
      color: "#7C3AED",
      bgLight: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20"
    },
    {
      num: "03",
      title: "Tingkat 3 (Kelas IX)",
      role: "Santri Kelas 3",
      desc: "Kematangan pribadi, pemantapan hafalan Al-Qur'an, dan keteladanan awal adik tingkat.",
      color: "#059669",
      bgLight: "bg-[#059669]/10 text-[#059669] border-[#059669]/20"
    },
    {
      num: "04",
      title: "Tingkat 4 (Kelas X)",
      role: "Santri Kelas 4",
      desc: "Inisiasi kepemimpinan kader, perluasan wawasan persyarikatan, dan kedisiplinan aliyah.",
      color: "#D97706",
      bgLight: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20"
    },
    {
      num: "05",
      title: "Tingkat 5 (Kelas XI)",
      role: "Santri Kelas 5",
      desc: "Pengasahan tanggung jawab sosial, khidmah dakwah, dan pembinaan adik asrama.",
      color: "#0891B2",
      bgLight: "bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20"
    },
    {
      num: "06",
      title: "Tingkat 6 (Kelas XII)",
      role: "Santri Kelas 6",
      desc: "Puncak pembinaan karakter, integritas ilmu, dan kesiapan pemimpin bangsa.",
      color: "#4F46E5",
      bgLight: "bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/20"
    },
    {
      num: "07",
      title: "Asatidz & Musyrif",
      role: "Musyrif & Pamong",
      desc: "Pilar keteladanan dan pembina ruhani yang membersamai santri 24 jam penuh keikhlasan.",
      color: "#0C4E8C",
      bgLight: "bg-[#0C4E8C]/10 text-[#0C4E8C] border-[#0C4E8C]/20"
    },
    {
      num: "08",
      title: "Wali Santri",
      role: "Mitra Pendidikan",
      desc: "Pilar doa tulus dan amanah keluarga yang senantiasa terhubung dengan buah hati.",
      color: "#10B981",
      bgLight: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
    }
  ];

  const BRAND_COLORS = [
    { name: "Brand Deep", hex: "#0C4E8C", role: "Heading & Dark Text", desc: "Ketegasan, kedalaman spiritual" },
    { name: "Brand Blue", hex: "#0C81E4", role: "Primary CTA & Link", desc: "Keandalan teknologi & kecerdasan" },
    { name: "Brand Cyan", hex: "#17C3D4", role: "Accent & Status Telat", desc: "Ketenangan & kejernihan data" },
    { name: "Brand Mint", hex: "#4FE7AF", role: "Highlight & Success", desc: "Kesegaran dakwah & optimisme" },
  ];

  return (
    <div className="w-full space-y-2.5 pb-8">
      
      {/* ── TOP NAVIGATION CARD ─────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onBack();
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100/80 hover:bg-sky-50 text-slate-700 hover:text-[#0C81E4] text-[11px] font-bold transition-all active:scale-95 border border-slate-200/60 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 -ml-0.5 text-slate-400" />
          <span>Dashboard</span>
        </button>

        <div className="text-center px-1">
          <span className="text-xs font-bold text-slate-800 tracking-tight block">
            Tentang & Filosofi
          </span>
          <span className="text-[10px] text-slate-400 font-medium block leading-tight">
            Brand Identity & Design System
          </span>
        </div>

        <div className="w-16 hidden sm:block pointer-events-none" />
      </div>

      {/* ── HERO BRAND CARD ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0C81E4] via-[#0B6EC6] to-[#0A4E8C] rounded-2xl p-3.5 sm:p-4 text-white shadow-md shadow-sky-950/10 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-48 h-20 bg-sky-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-1.5 py-0.5">
          {/* Pure White Logo with Compact Spacing */}
          <div className="inline-flex items-center justify-center">
            <img
              src={syamsaPrimaryLogo}
              alt="Logo syamsa"
              className="h-8 sm:h-9 w-auto object-contain brightness-0 invert drop-shadow-xs"
            />
          </div>

          {/* Title and Slogan */}
          <div className="space-y-0.5 max-w-sm">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
              System for Advisor Management and Student Attendance
            </h1>

            <p className="text-[11px] font-medium tracking-wide text-sky-100/90 italic">
              — illuminate every presence
            </p>
          </div>
        </div>
      </div>

      {/* ── SEGMENTED NAVIGATION PILL ───────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-xl p-1 shadow-2xs flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("filosofi");
          }}
          className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all relative select-none cursor-pointer ${
            activeTab === "filosofi"
              ? "text-[#0C81E4]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {activeTab === "filosofi" && (
            <motion.div
              layoutId="aboutActivePill"
              transition={springSmooth}
              className="absolute inset-0 rounded-lg bg-sky-100/80 shadow-2xs border border-sky-200/60"
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-1">
            <Sun className="w-3 h-3" /> Filosofi
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("brand");
          }}
          className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all relative select-none cursor-pointer ${
            activeTab === "brand"
              ? "text-[#0C81E4]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {activeTab === "brand" && (
            <motion.div
              layoutId="aboutActivePill"
              transition={springSmooth}
              className="absolute inset-0 rounded-lg bg-sky-100/80 shadow-2xs border border-sky-200/60"
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-1">
            <Layers className="w-3 h-3" /> Brand Assets
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("sejarah");
          }}
          className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all relative select-none cursor-pointer ${
            activeTab === "sejarah"
              ? "text-[#0C81E4]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {activeTab === "sejarah" && (
            <motion.div
              layoutId="aboutActivePill"
              transition={springSmooth}
              className="absolute inset-0 rounded-lg bg-sky-100/80 shadow-2xs border border-sky-200/60"
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-1">
            <CheckCheck className="w-3 h-3" /> Asal-Usul
          </span>
        </button>
      </div>

      {/* ── TAB 1: FILOSOFI LOGO & MAKNA ─────────────────────────── */}
      {activeTab === "filosofi" && (
        <motion.div
          key="filosofi"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2.5"
        >
          {/* Makna Syams & Konsep */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C81E4]" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#0C81E4]">
                Etimologi & Konsep
              </h2>
            </div>
            
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
              Makna "Syams" (شمس) — Sang Mentari
            </h3>
            
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              Secara bahasa, <strong>Syams</strong> adalah kata dalam bahasa Arab yang bermakna <strong>Matahari</strong>. Sebagaimana fajar yang terbit menyinari bumi secara istiqamah, <strong>syamsa</strong> hadir dengan moto <em>“illuminate every presence”</em> (menyinari setiap kehadiran), menjadi lentera yang membimbing ketertiban shalat fajar, senja, dan pengasuhan santri sepanjang masa.
            </p>
          </div>

          {/* Anatomi 8 Sinar Centang */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Anatomi 8 Sinar Centang Surya (The 8-Ray Mandala)
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Harmonisasi 6 Tingkat Santri MTs/MA + 1 Asatidz/Musyrif + 1 Wali Santri
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RAYS_DATA.map((ray) => (
                <div
                  key={ray.num}
                  className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-white hover:border-sky-200 transition-all space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black" style={{ color: ray.color }}>
                      {ray.num}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${ray.bgLight}`}>
                      {ray.role}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900">
                    {ray.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {ray.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Spektrum Warna Brand */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Palet Warna Brand Resmi
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BRAND_COLORS.map((c) => (
                <div key={c.name} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="w-full h-6 rounded-lg shadow-2xs" style={{ background: c.hex }} />
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-900">{c.name}</h4>
                    <span className="text-[9px] font-mono text-slate-500">{c.hex}</span>
                    <p className="text-[9px] text-slate-400 leading-tight">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: BRAND ASSETS & VARIANTS ───────────────────────── */}
      {activeTab === "brand" && (
        <motion.div
          key="brand"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2.5"
        >
          {/* Logo Variants */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Varian Logo Resmi syamsa
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Format penggunaan logo sesuai konteks background dan media
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Primary Horizontal */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center space-y-1.5">
                <div className="h-11 flex items-center justify-center">
                  <img src={syamsaPrimaryLogo} alt="Primary" className="h-7 w-auto object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">Primary Logo</p>
                  <p className="text-[9px] text-slate-400">Horizontal • Light Background</p>
                </div>
              </div>

              {/* Inverted on Dark Brand */}
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0C4E8C] to-[#0C81E4] text-white text-center space-y-1.5">
                <div className="h-11 flex items-center justify-center">
                  <img src={syamsaPrimaryLogo} alt="Primary White" className="h-7 w-auto object-contain brightness-0 invert" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">White Monochrome</p>
                  <p className="text-[9px] text-sky-200">Header & Hero Gradient</p>
                </div>
              </div>

              {/* Logomark */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center space-y-1.5">
                <div className="h-11 flex items-center justify-center">
                  <img src={syamsaLogomark} alt="Logomark" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">Logomark</p>
                  <p className="text-[9px] text-slate-400">App Icon & Favicon (&lt; 32px)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panduan Do & Don't */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white/90 backdrop-blur-xl border border-emerald-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px]">
                  ✓
                </div>
                <span>Panduan Boleh (Do)</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Gunakan Primary Logo untuk header dan identitas resmi</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Gunakan versi putih murni di atas background warna gelap</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Pertahankan proporsi dan jarak lapang di sekeliling logo</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/90 backdrop-blur-xl border border-rose-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px]">
                <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">
                  ✕
                </div>
                <span>Dilarang (Don't)</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li className="flex items-start gap-1.5">
                  <X className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                  <span>Jangan mendistorsi atau mengubah rasio proporsi logo</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <X className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                  <span>Jangan mengubah palet warna resmi dari standar brand</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <X className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                  <span>Jangan menambahkan drop-shadow berlebih atau garis kasar</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: ASAL-USUL & TRANSFORMASI ──────────────────────── */}
      {activeTab === "sejarah" && (
        <motion.div
          key="sejarah"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2.5"
        >
          {/* Kisah Centang */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C81E4]" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#0C81E4]">
                Asal-Usul Simbol
              </h2>
            </div>
            
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
              Mengapa Logo Menggunakan Icon Centang (✓)?
            </h3>
            
            <div className="text-[11px] sm:text-xs text-slate-600 leading-relaxed space-y-1.5">
              <p>
                Secara historis, tugas para <strong>Musyrif Asrama Mu'allimin</strong> di setiap fajar dan senja adalah membawa papan jalan dan lembaran presensi fisik untuk mencentang nama santri satu per satu di saf shalat masjid dan kamar asrama.
              </p>
              <p>
                Tanda centang tersebut bukan sekadar simbol kehadiran administratif, melainkan wujud nyata <em>ketulusan, kepedulian, dan pengasuhan</em>. Di dalam aplikasi <strong>syamsa</strong>, goresan centang tersebut diabadikan menjadi 8 sinar yang membentuk lingkaran matahari—menyatukan 6 tingkatan santri, 1 pembina/musyrif, dan 1 orang tua/wali santri.
              </p>
            </div>
          </div>

          {/* Transformasi Dulu vs Sekarang */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Transformasi Manajemen Asrama
            </h3>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold">
                <div className="p-2 border-r border-slate-200 text-slate-600">Metode Manual (Dulu)</div>
                <div className="p-2 text-[#0C81E4]">Sistem Digital syamsa</div>
              </div>

              <div className="divide-y divide-slate-100 text-[11px] text-slate-600">
                <div className="grid grid-cols-2 bg-white">
                  <div className="p-2 border-r border-slate-100">Lembaran kertas rentan robek, basah, atau terselip</div>
                  <div className="p-2 text-slate-900 font-medium">Tersimpan aman di cloud & smartphone</div>
                </div>
                <div className="grid grid-cols-2 bg-white">
                  <div className="p-2 border-r border-slate-100">Rekapitulasi manual memakan waktu berjam-jam</div>
                  <div className="p-2 text-slate-900 font-medium">Otomasi rekap dan persentase kehadiran</div>
                </div>
                <div className="grid grid-cols-2 bg-white">
                  <div className="p-2 border-r border-slate-100">Wali santri menunggu kabar kehadiran per semester</div>
                  <div className="p-2 text-slate-900 font-medium">Informasi kehadiran & izin terpantau real-time</div>
                </div>
                <div className="grid grid-cols-2 bg-white">
                  <div className="p-2 border-r border-slate-100">Pencatatan santri sakit terpisah dari presensi</div>
                  <div className="p-2 text-slate-900 font-medium">Terintegrasi pemantauan sakit & rujukan PKU</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── INSTITUTIONAL FOOTER ────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs text-center space-y-2">
        <div className="flex items-center justify-center gap-4 opacity-75">
          <img src={logoMuhammadiyah} alt="PP Muhammadiyah" className="h-5 sm:h-6 w-auto object-contain" />
          <img src={logoMuallimin} alt="Madrasah Mu'allimin" className="h-6 sm:h-7 w-auto object-contain" />
          <img src={logoSekolahPemimpin} alt="Sekolah Pemimpin Bangsa" className="h-5 sm:h-6 w-auto object-contain" />
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
          © {new Date().getFullYear()} Madrasah Mu'allimin Muhammadiyah Yogyakarta • syamsa v2.0
        </p>
      </div>

    </div>
  );
}
