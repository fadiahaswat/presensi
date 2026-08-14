import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LogIn, LogOut, CheckCircle2, Calendar, Sun, Sunset,
  ChevronLeft, ChevronRight, TrendingUp, LayoutDashboard,
  ClipboardList, X, Users, BookOpen, Lock, Search,
  Download, SlidersHorizontal, Flame, AlertCircle,
  Zap, Award, Info, Compass, Clock, Moon,
  MapPin, Navigation, Printer, ChevronDown, Star, RefreshCw,
  Bell, BarChart2, Heart, Sunrise, User, Phone, Mail, MessageCircle, ExternalLink,
  ShieldCheck, ShieldAlert
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, subMonths, addMonths, isBefore, startOfDay, parseISO, addDays
} from "date-fns";
import { id } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, RadialBarChart, RadialBar, PieChart, Pie, Cell
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Role = "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif";
type PrayerSlot = "subuh" | "maghrib";
type AttendanceStatus = "hadir" | "izin" | "alfa";
type Page = "dashboard" | "input" | "rekap" | "riwayat" | "ibadah";

interface AuthUser { id: string; name: string; email: string; role: Role; asrama?: string; musyrifId?: string; }
interface Musyrif {
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
}
interface AttendanceRecord {
  musyrifId: string; date: string;
  subuh?: AttendanceStatus; maghrib?: AttendanceStatus;
  subuhNote?: string; maghribNote?: string;
  markedBy?: string;
}
interface SunnahFast { id: string; name: string; desc: string; type: "weekly"|"monthly"|"annual"; icon: string; }

type MarkFn    = (mid: string, prayer: PrayerSlot, status: AttendanceStatus, date: string, note?: string) => void;
type MarkAllFn = (asrama: string, prayer: PrayerSlot, status: AttendanceStatus, date: string) => void;

// ─────────────────────────────────────────────────────────────────────────────
// PRAYER TIME CALCULATOR (Muhammadiyah / KHGT)
// ─────────────────────────────────────────────────────────────────────────────
function calcPrayerTimes(date: Date, lat: number, lon: number, tz = 7) {
  const toR = (d: number) => d * Math.PI / 180;
  const toD = (r: number) => r * 180 / Math.PI;
  const fix = (h: number) => ((h % 24) + 24) % 24;

  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d
    + (m <= 2 ? -Math.floor((y+1)/100)+Math.floor((y+1)/400)+1 : -Math.floor(y/100)+Math.floor(y/400)+1) - 1524.5;

  const D  = jd - 2451545.0;
  const g  = toR((357.529 + 0.98560028 * D) % 360);
  const q  = (280.459 + 0.98564736 * D) % 360;
  const L  = toR((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360);
  const e  = toR(23.439 - 0.00000036 * D);
  const RA = toD(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const EqT = q / 15 - ((RA + 360) % 24);

  const transit = 12 + tz - lon / 15 - EqT;
  const latR = toR(lat);

  function ha(angle: number) {
    const c = (-Math.sin(toR(angle)) - Math.sin(latR) * Math.sin(dec)) / (Math.cos(latR) * Math.cos(dec));
    return Math.abs(c) > 1 ? NaN : toD(Math.acos(c)) / 15;
  }
  const asrShadow = -toD(Math.atan(1 / (1 + Math.tan(Math.abs(latR - dec)))));

  const fmt = (h: number) => {
    if (isNaN(h)) return "--:--";
    const hh = Math.floor(fix(h)) % 24;
    const mm = Math.round((fix(h) % 1) * 60);
    return `${String(hh).padStart(2,"0")}:${String(mm % 60).padStart(2,"0")}`;
  };

  return [
    { key:"subuh",   name:"Subuh",   time: fmt(transit - ha(-20)),            raw: transit - ha(-20) },
    { key:"terbit",  name:"Terbit",  time: fmt(transit - ha(-0.8333)),         raw: transit - ha(-0.8333) },
    { key:"dhuhr",   name:"Dzuhur",  time: fmt(transit + 2/60),               raw: transit + 2/60 },
    { key:"asr",     name:"Ashar",   time: fmt(transit + ha(asrShadow)),       raw: transit + ha(asrShadow) },
    { key:"maghrib", name:"Maghrib", time: fmt(transit + ha(-1) + 2/60),      raw: transit + ha(-1) + 2/60 },
    { key:"isha",    name:"Isya",    time: fmt(transit + ha(-18)),             raw: transit + ha(-18) },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// HIJRI CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
const HIJRI_MONTHS = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir","Rajab","Sya'ban","Ramadan","Syawal","Dzulqa'dah","Dzulhijjah"];

function toHijri(date: Date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d
    + (m<=2 ? -Math.floor((y+1)/100)+Math.floor((y+1)/400)+1 : -Math.floor(y/100)+Math.floor(y/400)+1) - 1524.5;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l-1)/10631);
  l -= 10631*n - 354;
  const j = Math.floor((10985-l)/5316)*Math.floor(50*l/17719) + Math.floor(l/5670)*Math.floor(43*l/15238);
  l -= Math.floor((30-j)/15)*Math.floor(17719*j/50) + Math.floor(j/16)*Math.floor(15238*j/43) - 29;
  const hm = Math.floor(24*l/709);
  const hd = Math.floor(l - Math.floor(709*hm/24));
  const hy = 30*n + j - 30;
  return { day: hd, month: hm, year: hy, monthName: HIJRI_MONTHS[hm-1] ?? "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUNNAH FASTING CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function getSunnahFasts(date: Date): SunnahFast[] {
  const h = toHijri(date);
  const dow = date.getDay(); // 0=Sun 1=Mon 4=Thu 5=Fri
  const fasts: SunnahFast[] = [];

  if (dow === 1) fasts.push({ id:"senin",  name:"Puasa Senin",  desc:"Hari amalan dicatat & hari kelahiran Nabi ﷺ", type:"weekly",  icon:"☀️" });
  if (dow === 4) fasts.push({ id:"kamis",  name:"Puasa Kamis",  desc:"Hari amalan diangkat kepada Allah", type:"weekly",  icon:"✨" });

  if ([13,14,15].includes(h.day))
    fasts.push({ id:"ayyamul", name:"Ayyamul Bidh", desc:`${h.day} ${h.monthName} — 3 hari di tengah bulan`, type:"monthly", icon:"🌕" });

  if (h.month === 1 && h.day === 9)
    fasts.push({ id:"tasua",  name:"Puasa Tasu'a",  desc:"9 Muharram — Sehari sebelum Asyura", type:"annual", icon:"🌙" });
  if (h.month === 1 && h.day === 10)
    fasts.push({ id:"asyura", name:"Puasa Asyura",  desc:"10 Muharram — Menghapus dosa setahun lalu", type:"annual", icon:"⭐" });
  if (h.month === 8)
    fasts.push({ id:"syaban", name:"Puasa Sya'ban", desc:"Bulan persiapan Ramadan yang sering terlupakan", type:"annual", icon:"🌙" });
  if (h.month === 10 && h.day >= 2 && h.day <= 20)
    fasts.push({ id:"syawal", name:"Puasa Syawal",  desc:"6 hari di bulan Syawal — setara puasa setahun", type:"annual", icon:"🎉" });
  if (h.month === 12 && h.day === 9)
    fasts.push({ id:"arafah", name:"Puasa Arafah",  desc:"9 Dzulhijjah — Menghapus dosa 2 tahun", type:"annual", icon:"🕋" });

  return fasts;
}

function getUpcomingSunnahFasts(days = 14): { date: Date; fasts: SunnahFast[] }[] {
  const result: { date: Date; fasts: SunnahFast[] }[] = [];
  const base = addDays(new Date(), 1);
  for (let i = 0; i < days; i++) {
    const d = addDays(base, i);
    const fs = getSunnahFasts(d);
    if (fs.length > 0) result.push({ date: d, fasts: fs });
  }
  return result.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// QIBLA CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
const KAABA = { lat: 21.4225, lon: 39.8262 };

function getQiblaAngle(lat: number, lon: number) {
  const toR = (d: number) => d * Math.PI / 180;
  const kLat = toR(KAABA.lat), kLon = toR(KAABA.lon), uLat = toR(lat), dLon = kLon - toR(lon);
  const y = Math.sin(dLon) * Math.cos(kLat);
  const x = Math.cos(uLat) * Math.sin(kLat) - Math.sin(uLat) * Math.cos(kLat) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function getMeccaDist(lat: number, lon: number) {
  const toR = (d: number) => d * Math.PI / 180;
  const R = 6371, dLat = toR(KAABA.lat - lat), dLon = toR(KAABA.lon - lon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat)) * Math.cos(toR(KAABA.lat)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const ASRAMAS = [
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

const AUTH_USERS: AuthUser[] = [
  // ─── KOORDINATOR MUSYRIF ───
  { id:"k1", name:"Andi Aqillah Fadia Haswat, S.A.P.", email:"andiaqillahfadiahaswat@gmail.com", role:"koordinator_musyrif" },
  { id:"k2", name:"Akmal Wildan Syifauddin, S.Pd.",    email:"akmalws@muallimin.sch.id",          role:"koordinator_musyrif" },

  // ─── PAMONG ASRAMA ───
  { id:"p1", name:"Galang Putra Muhammady, S.Pd.",     email:"galang@muallimin.sch.id",           role:"pamong", asrama:"Asrama 1" },
  { id:"p2", name:"Aulia Abdan Idza Shalla, S.Th.I.",  email:"aulia.abdan@muallimin.sch.id",      role:"pamong", asrama:"Asrama 8A" },
  { id:"p3", name:"Anang Fathurrahman, Lc.",           email:"anang.fathur@muallimin.sch.id",     role:"pamong", asrama:"Asrama 8B" },
  { id:"p4", name:"Inggit Prabowo, S.Pd.",             email:"inggit.prabowo@muallimin.sch.id",   role:"pamong", asrama:"Asrama 10" },
  { id:"p5", name:"Rais Yudhistira, Lc.",              email:"rais.yudhistira@muallimin.sch.id",  role:"pamong", asrama:"Asrama Sedayu Gedung A" },
  { id:"p6", name:"Muh. Ahnaf Lubab, M.Pd.",           email:"ahnaf.lubab@muallimin.sch.id",      role:"pamong", asrama:"Asrama Sedayu Gedung B" },
  { id:"p7", name:"M. Ismail Marzuq, S.Sos.",          email:"ismail.marzuq@muallimin.sch.id",    role:"pamong", asrama:"Asrama Sedayu Gedung C" },
  { id:"p8", name:"Ariel Amarta Dzikrillah, S.Sos.",   email:"ariel.amarta@muallimin.sch.id",     role:"pamong", asrama:"Asrama Sedayu Gedung D" },

  // ─── KOORDINATOR ASRAMA / GEDUNG ───
  { id:"g1", name:"Koordinator Asrama 1 & 10",         email:"koord.asrama1.10@muallimin.sch.id",  role:"koordinator_gedung", asrama:"Asrama 1" },
  { id:"g2", name:"Koordinator Asrama 8 (A, B, C)",    email:"koord.asrama8@muallimin.sch.id",     role:"koordinator_gedung", asrama:"Asrama 8A" },
  { id:"g3", name:"Koordinator Sedayu Kampus",         email:"koord.sedayu@muallimin.sch.id",      role:"koordinator_gedung", asrama:"Asrama Sedayu Gedung A" },
];

const MUSYRIF_LIST: Musyrif[] = [
  // ─── ASRAMA SEDAYU GEDUNG D (Pamong: Ariel Amarta Dzikrillah, S.Sos.) ───
  { id:"m1",  name:"Wahyu Dermawan",               kelas:"1 A",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"wahyudermawan1212@gmail.com",     phone:"6282180998704" },
  { id:"m2",  name:"Afif Nashrul",                 kelas:"1 A",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"afifnashrul06@gmail.com",         phone:"6281287066297" },
  { id:"m3",  name:"Muhammad Farras Mamduh",       kelas:"1 B",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 B",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"farrasmdh@gmail.com",             phone:"6285117104411" },
  { id:"m4",  name:"Leo Fernando Adnan Muzaki",    kelas:"1 C",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 C",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"leodrfernandofelix@gmail.com",    phone:"6285701209925" },
  { id:"m5",  name:"Husein Nur Alwany",            kelas:"1 D",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 D",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"husennur085@gmail.com",           phone:"6285157379443" },
  { id:"m6",  name:"Arif Rahman, S.s.",            kelas:"1 E",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 E",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"nitikan3321@gmail.com",           phone:"6285129334523" },
  { id:"m7",  name:"M. Fajri",                     kelas:"1 F",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 F",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"",                                phone:"6285189076745" },
  { id:"m8",  name:"Ajie Saptian Hardiyanto",      kelas:"1 G",         tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung D", kamar:"1 G",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"saptianaji07@gmail.com",          phone:"6285198234739" },
  { id:"m33", name:"Mukti Abdul Ghofur",           kelas:"4 A",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung D", kamar:"4 A",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"muktighofur75@gmail.com",         phone:"6282322272355" },
  { id:"m37", name:"Rasya Adhar Al Islam",         kelas:"4 E",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung D", kamar:"4 E",         pamong:"Ariel Amarta Dzikrillah, S.Sos.",     email:"rasyaadhar3012@gmail.com",        phone:"62895402680315" },

  // ─── ASRAMA SEDAYU GEDUNG A (Pamong: Rais Yudhistira, Lc.) ───
  { id:"m9",  name:"Muhammad Maliq Hakeem",        kelas:"1 Lower A",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower A",   pamong:"Rais Yudhistira, Lc.",                email:"muhammadmaliqhkm@gmail.com",      phone:"6282342754336" },
  { id:"m10", name:"Bryan Mahir Muharram",         kelas:"1 Lower B",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower B",   pamong:"Rais Yudhistira, Lc.",                email:"bryanmuharram06@gmail.com",       phone:"6282140095932" },
  { id:"m11", name:"Auzia Difa Mubarok",           kelas:"1 Lower C",   tingkat:"Kelas 1", asrama:"Asrama Sedayu Gedung A", kamar:"1 Lower C",   pamong:"Rais Yudhistira, Lc.",                email:"difaamubaarak@gmail.com",         phone:"6289526256385" },
  { id:"m20", name:"Muhammad Adhwa Janitra Handoko",kelas:"2 Lower A",   tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung A", kamar:"2 Lower A",   pamong:"Rais Yudhistira, Lc.",                email:"handokohowareyou@gmail.com",      phone:"6287786969082" },
  { id:"m21", name:"Zaky Risky Kurniawan",         kelas:"2 Lower B",   tingkat:"Kelas 2", asrama:"Kelas 2", kamar:"2 Lower B",   pamong:"Rais Yudhistira, Lc.",                email:"zakyrisky182@gmail.com",          phone:"6288983445038" },
  { id:"m22", name:"Farrel Izham Prayitno, Lc., S.Pd.",kelas:"2 Lower C",tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung A", kamar:"2 Lower C",   pamong:"Rais Yudhistira, Lc.",                email:"itsmefarrelizhamp@gmail.com",     phone:"6285217017024" },
  { id:"m23", name:"Abdullah, S.Pd.",              kelas:"3 A",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 A",         pamong:"Rais Yudhistira, Lc.",                email:"abdullahmuallimin@muallimin.sch.id",phone:"62881025916368" },
  { id:"m31", name:"Naufal Muzakki",               kelas:"3 Upper A",   tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 Upper A",   pamong:"Rais Yudhistira, Lc.",                email:"naufalmuzakki.idn@gmail.com",     phone:"6287844185012" },
  { id:"m32", name:"Mouldy Mohammad Zayyed",       kelas:"3 Upper B",   tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung A", kamar:"3 Upper B",   pamong:"Rais Yudhistira, Lc.",                email:"mouldymaz@gmail.com",             phone:"6285155347353" },
  { id:"m39", name:"Ayyasy Kaizen Birruna",        kelas:"4 Upper A",   tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung A", kamar:"4 Upper A",   pamong:"Rais Yudhistira, Lc.",                email:"catatankaizen@gmail.com",         phone:"6285930404552" },
  { id:"m40", name:"Hafidz Nawaf Fauzil Adhim, S.Pd.",kelas:"4 Upper B",tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung A", kamar:"4 Upper B",   pamong:"Rais Yudhistira, Lc.",                email:"fauziladhim2001@gmail.com",       phone:"6282241935414" },

  // ─── ASRAMA SEDAYU GEDUNG C (Pamong: M. Ismail Marzuq, S.Sos.) ───
  { id:"m12", name:"Arhab Syamil Asy Syatori",     kelas:"2 A",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 A",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"arhab.syamil4@gmail.com",         phone:"6282145765850" },
  { id:"m13", name:"Muhammad Dhaim Aruna",         kelas:"2 B",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 B",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"dhaimaruna@gmail.com",            phone:"628156554524" },
  { id:"m14", name:"Ivan Nur Adrian Pratama",      kelas:"2 C",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 C",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"ivannur224@gmail.com",            phone:"6288983127506" },
  { id:"m15", name:"Muhammad Atqonuddinillah",     kelas:"2 D",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 D",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"muhammadatqonuddinnilah@gmail.com",phone:"6281225054570" },
  { id:"m16", name:"Nur Affan Muarif, S.Sos.",     kelas:"2 E",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 E",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"affanmuarif99@gmail.com",         phone:"6282216678182" },
  { id:"m17", name:"Muhammad Rafi Umar Rais",      kelas:"2 F",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 F",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rafiumar420@gmail.com",           phone:"6285854312222" },
  { id:"m18", name:"Muhammad Arfa Burhanuddin Rafif",kelas:"2 G",       tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 G",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"arfaburhan2008@gmail.com",        phone:"6281233795288" },
  { id:"m19", name:"Imam Tunisi",                  kelas:"2 H",         tingkat:"Kelas 2", asrama:"Asrama Sedayu Gedung C", kamar:"2 H",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"mamtun17@gmail.com",              phone:"62895635128151" },
  { id:"m35", name:"Zahdal Aisy Rahman Averusy",   kelas:"4 C",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 C",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"zedzuhaid@gmail.com",             phone:"6282132910079" },
  { id:"m36", name:"Rifqi Adha Pradipa",           kelas:"4 D",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 D",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rifqipradipa62@gmail.com",        phone:"6287769943357" },
  { id:"m38", name:"Moh. Rival Aldiyansah",        kelas:"4 F",         tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung C", kamar:"4 F",         pamong:"M. Ismail Marzuq, S.Sos.",            email:"rivalaldiyansyah@muallimin.sch.id",phone:"6285706095527" },

  // ─── ASRAMA SEDAYU GEDUNG B (Pamong: Muh. Ahnaf Lubab, M.Pd.) ───
  { id:"m24", name:"Mukti Abdul Ghofar",           kelas:"3 B",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 B",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"muktighofar705@gmail.com",        phone:"6282241379820" },
  { id:"m25", name:"Fadhl Maula Fawwas",           kelas:"3 C",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 C",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"maulafawas@gmail.com",            phone:"6281228679325" },
  { id:"m26", name:"Fauzan Tasykurun Akmal",       kelas:"3 D",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 D",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"fauzanakmaal15@gmail.com",        phone:"6287833527289" },
  { id:"m27", name:"Muhammad Syaqib Ridho Asy Syafiq",kelas:"3 E",      tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 E",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"idoosakippp@gmail.com",           phone:"628988158493" },
  { id:"m28", name:"Muhammad Islam Al Ghozy",      kelas:"3 F",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 F",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"muhammadislamalghozy2801@gmail.com",phone:"6281233421108" },
  { id:"m29", name:"Ahmad Arif Kurniawan",         kelas:"3 G",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 G",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"ahmadarifkurniawan1809@gmail.com",phone:"6282233624304" },
  { id:"m30", name:"Ananda Hasan Putra Rahman",    kelas:"3 H",         tingkat:"Kelas 3", asrama:"Asrama Sedayu Gedung B", kamar:"3 H",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"",                                phone:"6289509904184" },
  { id:"m34", name:"Rayhan Bachtiar Dwi Bayu Baskara",kelas:"4 B",      tingkat:"Kelas 4", asrama:"Asrama Sedayu Gedung B", kamar:"4 B",         pamong:"Muh. Ahnaf Lubab, M.Pd.",             email:"rayhan.baskara68@gmail.com",      phone:"6281225841078" },

  // ─── ASRAMA 8C & 8A KELAS 6 (Pamong: Aulia Abdan Idza Shalla, S.Th.I.) ───
  { id:"m51", name:"Habib Fajar Rohman",           kelas:"6 A",         tingkat:"Kelas 6", asrama:"Asrama 8C",              kamar:"6 A",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"fajarrohman116@gmail.com",        phone:"6281246112790" },
  { id:"m52", name:"Muhammad Rafif Said, S.Pd.",   kelas:"6 B",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 B",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"rafifsaid77@gmail.com",           phone:"62895413221010" },
  { id:"m53", name:"Gilang Cahya Ghufroni",        kelas:"6 C",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 C",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"gilangcahya@muallimin.sch.id",    phone:"6285725379068" },
  { id:"m54", name:"Hilmy Muwafaq 'Adman",         kelas:"6 D",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 D",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"hilmyadman97@gmail.com",          phone:"6281217904326" },
  { id:"m55", name:"Aflah Naufal Nabiih",          kelas:"6 E",         tingkat:"Kelas 6", asrama:"Asrama 8A",              kamar:"6 E",         pamong:"Aulia Abdan Idza Shalla, S.Th.I.",    email:"aflahnaufal07@gmail.com",         phone:"6281952116819" },

  // ─── ASRAMA 8C & 8B KELAS 5 (Pamong: Anang Fathurrahman, Lc.) ───
  { id:"m41", name:"Wildan Faalul Abror",          kelas:"5 A",         tingkat:"Kelas 5", asrama:"Asrama 8C",              kamar:"5 A",         pamong:"Anang Fathurrahman, Lc.",             email:"wildanabror00@gmail.com",         phone:"6281233318388" },
  { id:"m42", name:"Rahmat Khoirul Anwar, S.Psi.", kelas:"5 B",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 B",         pamong:"Anang Fathurrahman, Lc.",             email:"rahmatkhoirulanwar23@gmail.com",  phone:"6285335241954" },
  { id:"m43", name:"Muhammad Rafi Feriansyah",     kelas:"5 C",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 C",         pamong:"Anang Fathurrahman, Lc.",             email:"",                                phone:"62881025797090" },
  { id:"m44", name:"Muhammad Syahrul Mubarok",     kelas:"5 D",         tingkat:"Kelas 5", asrama:"Asrama 8B",              kamar:"5 D",         pamong:"Anang Fathurrahman, Lc.",             email:"m.syahrulmobar06@gmail.com",      phone:"62882003685998" },

  // ─── ASRAMA 10 (Pamong: Inggit Prabowo, S.Pd.) ───
  { id:"m45", name:"Dymas Naufal El Fawaz",        kelas:"5 E",         tingkat:"Kelas 5", asrama:"Asrama 10",              kamar:"5 E",         pamong:"Inggit Prabowo, S.Pd.",               email:"dymasn@muallimin.sch.id",         phone:"6285117732302" },
  { id:"m46", name:"Layllan Dzikri Firmansyah",    kelas:"5 F",         tingkat:"Kelas 5", asrama:"Asrama 10",              kamar:"5 F",         pamong:"Inggit Prabowo, S.Pd.",               email:"dzikrilayllan@gmail.com",         phone:"6285728503309" },
  { id:"m56", name:"Muhammad Ilman Khanafi",       kelas:"6 F",         tingkat:"Kelas 6", asrama:"Asrama 10",              kamar:"6 F",         pamong:"Inggit Prabowo, S.Pd.",               email:"ilmankhanafi@muallimin.sch.id",   phone:"62895706160907" },
  { id:"m57", name:"Tajulqayyim Royyan",           kelas:"6 G",         tingkat:"Kelas 6", asrama:"Asrama 10",              kamar:"6 G",         pamong:"Inggit Prabowo, S.Pd.",               email:"tajulqayyim@muallimin.sch.id",    phone:"6281334991879" },

  // ─── ASRAMA 1 (Pamong: Galang Putra Muhammady, S.Pd.) ───
  { id:"m47", name:"Muhammad Rafi",                kelas:"5 Upper A",   tingkat:"Kelas 5", asrama:"Asrama 1",               kamar:"5 Upper A",   pamong:"Galang Putra Muhammady, S.Pd.",       email:"muhammadrafi2246@gmail.com",      phone:"6287894970695" },
  { id:"m48", name:"Ammar Ghozi Al Farisi",        kelas:"5 Upper B",   tingkat:"Kelas 5", asrama:"Asrama 1",               kamar:"5 Upper B",   pamong:"Galang Putra Muhammady, S.Pd.",       email:"ammarghozi12@gmail.com",          phone:"6285725915157" },
  { id:"m49", name:"Ubaidillah Syafiq Atqiya",     kelas:"5 Upper C",   tingkat:"Kelas 5", asrama:"Asrama 1",               kamar:"5 Upper C",   pamong:"Galang Putra Muhammady, S.Pd.",       email:"ubay.syafiq03@gmail.com",         phone:"6281284985750" },
  { id:"m50", name:"Ubaidillah Syafiq Atqiya",     kelas:"6 Internasional",tingkat:"Kelas 6", asrama:"Asrama 1",            kamar:"6 Int.",      pamong:"Galang Putra Muhammady, S.Pd.",       email:"ubay.syafiq03@gmail.com",         phone:"6281284985750" },
];

function generateRecords(): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const pool: AttendanceStatus[] = ["hadir","hadir","hadir","hadir","hadir","izin","alfa"];
  const today = new Date();
  MUSYRIF_LIST.forEach(m => {
    for (let i = 90; i >= 1; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      out.push({ musyrifId: m.id, date: format(d,"yyyy-MM-dd"),
        subuh:   pool[Math.floor(Math.random() * pool.length)],
        maghrib: pool[Math.floor(Math.random() * pool.length)],
        markedBy:"a1" });
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = () => format(new Date(), "yyyy-MM-dd");

const S = {
  hadir: { label:"Hadir", dot:"bg-emerald-500", chip:"bg-emerald-50 text-emerald-700 ring-emerald-200", btn:"bg-emerald-500 text-white shadow-emerald-200" },
  izin:  { label:"Izin",  dot:"bg-amber-400",   chip:"bg-amber-50  text-amber-700  ring-amber-200",    btn:"bg-amber-400  text-white shadow-amber-200" },
  alfa:  { label:"Alfa",  dot:"bg-red-500",     chip:"bg-red-50    text-red-700    ring-red-200",      btn:"bg-red-500    text-white shadow-red-200" },
} as const;

function Chip({ s }: { s?: AttendanceStatus }) {
  if (!s) return <span className="text-xs text-slate-300 font-mono">–</span>;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${S[s].chip}`}>{S[s].label}</span>;
}

const AV_THEMES = [
  "bg-emerald-600 text-white shadow-emerald-600/20",
  "bg-teal-600 text-white shadow-teal-600/20",
  "bg-indigo-600 text-white shadow-indigo-600/20",
  "bg-cyan-700 text-white shadow-cyan-700/20",
  "bg-sky-600 text-white shadow-sky-600/20",
  "bg-violet-600 text-white shadow-violet-600/20",
];

function getInitials(name: string) {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarTheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AV_THEMES[Math.abs(hash) % AV_THEMES.length];
}

function Av({ name, sz="md" }: { name: string; src?: string; sz?: "xs"|"sm"|"md"|"lg" }) {
  const c = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-[11px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
  }[sz];
  const theme = getAvatarTheme(name);
  const initials = getInitials(name);

  return (
    <div className={`${c} ${theme} rounded-full flex-shrink-0 flex items-center justify-center font-bold tracking-tight shadow-md ring-2 ring-white select-none`}>
      {initials}
    </div>
  );
}

function Card({ ch, cls="" }: { ch: React.ReactNode; cls?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 ${cls}`}>{ch}</div>;
}

function Label({ ch }: { ch: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 font-mono">{ch}</p>;
}

function hasFullAccess(u: AuthUser) { return u.role === "koordinator_musyrif"; }

function computeStreak(mid: string, records: AttendanceRecord[]) {
  let cur = 0, best = 0, tmp = 0;
  const base = new Date(); base.setDate(base.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const r = records.find(x => x.musyrifId === mid && x.date === format(d,"yyyy-MM-dd"));
    if (r?.subuh === "hadir" && r?.maghrib === "hadir") { tmp++; if (i === 0) cur = tmp; }
    else { best = Math.max(best, tmp); tmp = 0; if (i === 0) cur = 0; }
  }
  return { cur, best: Math.max(best, tmp, cur) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportPDF(records: AttendanceRecord[], month: Date, asramaFilter: string) {
  const mk = format(month,"yyyy-MM");
  const days = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
    .filter(d => !isBefore(new Date(),startOfDay(d)) || isToday(d));
  const list = asramaFilter === "Semua" ? MUSYRIF_LIST : MUSYRIF_LIST.filter(m => m.asrama === asramaFilter);

  const rows = list.map((m,i) => {
    const rs = records.filter(r => r.musyrifId === m.id && r.date.startsWith(mk));
    const sh=rs.filter(r=>r.subuh==="hadir").length, si=rs.filter(r=>r.subuh==="izin").length, sa=rs.filter(r=>r.subuh==="alfa").length;
    const mh=rs.filter(r=>r.maghrib==="hadir").length, mi=rs.filter(r=>r.maghrib==="izin").length, ma=rs.filter(r=>r.maghrib==="alfa").length;
    const pct = days.length ? Math.round(((sh+mh)/(days.length*2))*100) : 0;
    return `<tr><td>${i+1}</td><td><b>${m.name}</b></td><td>${m.kelas}</td><td>${m.pamong||"-"}</td><td>${m.phone||"-"}</td><td style="color:#16a34a">${sh}</td><td style="color:#d97706">${si}</td><td style="color:#dc2626">${sa}</td><td style="color:#16a34a">${mh}</td><td style="color:#d97706">${mi}</td><td style="color:#dc2626">${ma}</td><td><b>${pct}%</b></td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Presensi ${format(month,"MMMM yyyy",{locale:id})}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:2cm;color:#111;font-size:11px}
  h1{font-size:18px;font-weight:700;color:#065f46;margin-bottom:4px}.sub{color:#64748b;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#059669;color:white;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:6px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f0fdf4}
  .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
  @media print{@page{size:A4 landscape;margin:1.5cm}}</style></head><body>
  <h1>Rekap Presensi Musyrif</h1>
  <p class="sub">${format(month,"MMMM yyyy",{locale:id})} · ${asramaFilter} · ${days.length} hari · ${list.length} musyrif</p>
  <table><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Pamong</th><th>No. WA</th><th>Sub.H</th><th>Sub.I</th><th>Sub.A</th><th>Mag.H</th><th>Mag.I</th><th>Mag.A</th><th>%</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="foot">Dicetak: ${format(new Date(),"d MMMM yyyy, HH:mm")} · Sistem Presensi Musyrif</p></body></html>`;

  const w = window.open("","_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function PageDashboard({ records, authUser, onGoTo }: { records: AttendanceRecord[]; authUser: AuthUser|null; onGoTo: (p: Page) => void }) {
  const today = todayStr();
  const todayRecs = records.filter(r => r.date === today);
  const total = MUSYRIF_LIST.length;
  const sh = todayRecs.filter(r => r.subuh   === "hadir").length;
  const mh = todayRecs.filter(r => r.maghrib === "hadir").length;
  const belumS = MUSYRIF_LIST.filter(m => !todayRecs.find(r => r.musyrifId === m.id && r.subuh));
  const belumM = MUSYRIF_LIST.filter(m => !todayRecs.find(r => r.musyrifId === m.id && r.maghrib));
  const now = new Date();

  const prayerTimes = calcPrayerTimes(now, -7.7956, 110.3695, 7);
  const hijri = toHijri(now);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const activeIdx = [...prayerTimes].reduce((best, p, i) => p.raw <= nowH ? i : best, -1);
  const nextPrayer = prayerTimes[(activeIdx + 1) % prayerTimes.length];
  const minutesLeft = Math.round((nextPrayer.raw - nowH) * 60 + (nextPrayer.raw < nowH ? 1440 : 0));
  const minsDisp = minutesLeft < 60 ? `${minutesLeft}m lagi` : `${Math.floor(minutesLeft/60)}j ${minutesLeft%60}m`;

  const todayFasts = getSunnahFasts(now);

  const weekData = Array.from({length:7},(_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const ds = format(d,"yyyy-MM-dd");
    const rs = records.filter(r => r.date === ds);
    return {
      day: format(d,"EEE",{locale:id}).slice(0,2),
      subuh:   total ? Math.round(rs.filter(r=>r.subuh==="hadir").length/total*100)   : 0,
      maghrib: total ? Math.round(rs.filter(r=>r.maghrib==="hadir").length/total*100) : 0,
    };
  });

  const streakTop = useMemo(() => MUSYRIF_LIST.map(m=>({...m,...computeStreak(m.id,records)})).sort((a,b)=>b.cur-a.cur).slice(0,3),[records]);

  const thisMK = format(now,"yyyy-MM");
  const lastMK = format(subMonths(now,1),"yyyy-MM");
  const thisH = records.filter(r=>r.date.startsWith(thisMK)&&(r.subuh==="hadir"||r.maghrib==="hadir")).length;
  const lastH = records.filter(r=>r.date.startsWith(lastMK)&&(r.subuh==="hadir"||r.maghrib==="hadir")).length;
  const delta = lastH ? Math.round((thisH-lastH)/lastH*100) : 0;

  // Who needs attention (most alfa this month)
  const alfaRank = MUSYRIF_LIST.map(m => {
    const rs = records.filter(r=>r.musyrifId===m.id&&r.date.startsWith(thisMK));
    return { ...m, alfa: rs.filter(r=>r.subuh==="alfa"||r.maghrib==="alfa").length };
  }).filter(m=>m.alfa>0).sort((a,b)=>b.alfa-a.alfa).slice(0,3);

  // Overview donut data
  const allTodayPossible = total * 2;
  const todayHadir = sh + mh;
  const todayBelum = MUSYRIF_LIST.filter(m=>!todayRecs.find(r=>r.musyrifId===m.id)).length * 2;
  const todayLain = allTodayPossible - todayHadir - todayBelum;
  const donutData = [
    { name:"Hadir", value: todayHadir, color:"#059669" },
    { name:"Lainnya", value: Math.max(0,todayLain), color:"#f59e0b" },
    { name:"Belum", value: Math.max(0,todayBelum), color:"#e2e8f0" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero card */}
      <div className="rounded-2xl overflow-hidden relative" style={{background:"linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)",minHeight:190}}>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        </div>
        <div className="relative px-5 pt-5 pb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-emerald-200 text-xs mb-1">{hijri.day} {hijri.monthName} {hijri.year} H</p>
              <h1 className="text-white text-2xl font-bold">{authUser ? `Halo, ${authUser.name.split(" ")[0]}!` : "Presensi Musyrif"}</h1>
              <p className="text-emerald-200 text-sm mt-0.5">{format(now,"EEEE, d MMMM yyyy",{locale:id})}</p>
            </div>
            <button onClick={()=>onGoTo("ibadah")} className="bg-white/10 rounded-xl px-3 py-2 text-right hover:bg-white/20 transition-colors">
              <p className="text-white font-bold text-sm font-mono">{nextPrayer.name}</p>
              <p className="text-emerald-200 text-xs">{minsDisp}</p>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {label:"Subuh",  val:`${sh}/${total}`, icon:<Sun className="w-3.5 h-3.5"/>},
              {label:"Maghrib",val:`${mh}/${total}`, icon:<Moon className="w-3.5 h-3.5"/>},
              {label:"vs bln lalu", val:`${delta>0?"+":""}${delta}%`, icon:<TrendingUp className="w-3.5 h-3.5"/>},
            ].map(s=>(
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
                <div className="flex items-center gap-1 text-emerald-200 mb-1">{s.icon}<span className="text-[10px]">{s.label}</span></div>
                <p className="font-bold text-base text-white font-mono">{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sunnah fast alert */}
      {todayFasts.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
          <span className="text-xl">{todayFasts[0].icon}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">{todayFasts[0].name}</p>
            <p className="text-xs text-amber-600 mt-0.5">{todayFasts[0].desc}</p>
            {todayFasts.length > 1 && <p className="text-xs text-amber-500 mt-1">+{todayFasts.length-1} puasa sunnah lainnya</p>}
          </div>
          <button onClick={()=>onGoTo("ibadah")} className="text-amber-400 mt-0.5"><ChevronDown className="-rotate-90 w-4 h-4"/></button>
        </div>
      )}

      {/* Alert - belum presensi */}
      {authUser && (belumS.length > 0 || belumM.length > 0) && (
        <button onClick={()=>onGoTo("input")} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 text-left hover:bg-red-100 transition-colors w-full">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Presensi belum lengkap</p>
            <p className="text-xs text-red-500 mt-0.5">
              {belumS.length > 0 && `${belumS.length} belum Subuh`}
              {belumS.length>0&&belumM.length>0?" · ":""}
              {belumM.length>0&&`${belumM.length} belum Maghrib`}
            </p>
          </div>
          <ChevronDown className="-rotate-90 w-4 h-4 text-red-300 flex-shrink-0"/>
        </button>
      )}

      {/* CTA */}
      {authUser
        ? <button onClick={()=>onGoTo("input")} className="flex items-center justify-between bg-emerald-600 text-white rounded-2xl px-5 py-4 shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 active:scale-[0.98] transition-all">
            <div><p className="font-bold">Isi Presensi Sekarang</p><p className="text-emerald-200 text-xs mt-0.5">Subuh &amp; Maghrib</p></div>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><ChevronDown className="-rotate-90 w-4 h-4"/></div>
          </button>
        : <Card ch={<div className="px-5 py-4 flex items-center gap-3"><Info className="w-5 h-5 text-emerald-500 flex-shrink-0"/><p className="text-sm text-slate-500">Rekap <b className="text-slate-800">publik</b>. Pamong/koordinator login untuk input presensi.</p></div>}/>
      }

      {/* Today overview */}
      <Card ch={<div className="p-5 flex items-center gap-4">
        <div>
          <PieChart width={80} height={80}>
            <Pie data={donutData} cx={40} cy={40} innerRadius={26} outerRadius={38} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
              {donutData.map((e,i)=><Cell key={i} fill={e.color}/>)}
            </Pie>
          </PieChart>
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800 mb-2">Ringkasan Hari Ini</p>
          <div className="flex flex-col gap-1">
            {donutData.map(d=>(
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:d.color}}/>
                <span className="text-xs text-slate-500 flex-1">{d.name}</span>
                <span className="text-xs font-bold text-slate-700 font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-emerald-600 font-mono">{total ? Math.round(todayHadir/allTodayPossible*100) : 0}<span className="text-base font-normal text-slate-400">%</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">kehadiran</p>
        </div>
      </div>}/>

      {/* 7-day chart */}
      <Card ch={<div className="p-5">
        <Label ch="Kehadiran 7 Hari Terakhir"/>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={weekData} barGap={2} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"#fff",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,.08)",borderRadius:12,fontSize:12}} formatter={(v:number,n:string)=>[`${v}%`,n==="subuh"?"Subuh":"Maghrib"]}/>
            <Bar dataKey="subuh"   name="subuh"   fill="#f59e0b" radius={[4,4,0,0]}/>
            <Bar dataKey="maghrib" name="maghrib"  fill="#059669" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1 justify-center">
          {[{c:"bg-amber-400",l:"Subuh"},{c:"bg-emerald-500",l:"Maghrib"}].map(x=>(
            <div key={x.l} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-sm ${x.c}`}/><span className="text-[10px] text-slate-400">{x.l}</span></div>
          ))}
        </div>
      </div>}/>

      {/* Per asrama */}
      <div>
        <Label ch="Status Per Asrama Hari Ini"/>
        <div className="flex flex-col gap-2">
          {ASRAMAS.map(a => {
            const ins = MUSYRIF_LIST.filter(m=>m.asrama===a);
            const rs = todayRecs.filter(r=>ins.some(m=>m.id===r.musyrifId));
            const sh2=rs.filter(r=>r.subuh==="hadir").length, mh2=rs.filter(r=>r.maghrib==="hadir").length;
            const pct = ins.length ? Math.round((sh2+mh2)/(ins.length*2)*100) : 0;
            const kelasList = Array.from(new Set(ins.map(m=>m.kelas))).join(", ");
            return (
              <Card key={a} ch={<div className="px-4 py-3.5 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-emerald-600"/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5"><p className="font-semibold text-sm text-slate-800 truncate">{a}</p><span className="text-xs font-bold text-slate-700 font-mono flex-shrink-0">{pct}%</span></div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{width:`${pct}%`}}/></div>
                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="truncate text-slate-500 font-medium">{kelasList}</span>
                    <span className="flex-shrink-0 font-mono">S:{sh2}/{ins.length} · M:{mh2}/{ins.length}</span>
                  </div>
                </div>
              </div>}/>
            );
          })}
        </div>
      </div>

      {/* Streak leaderboard */}
      <div>
        <Label ch="🔥 Streak Tertinggi"/>
        <Card ch={<div className="divide-y divide-slate-50">
          {streakTop.map((m,i)=>(
            <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-base w-5 text-center">{["🥇","🥈","🥉"][i]}</span>
              <Av name={m.name} src={m.photo} sz="sm"/>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p><p className="text-xs text-slate-400">{m.asrama}</p></div>
              <div className="text-right"><div className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-400"/><span className="font-bold text-slate-800 font-mono">{m.cur}</span><span className="text-xs text-slate-400">hari</span></div><p className="text-[10px] text-slate-400">terbaik: {m.best}h</p></div>
            </div>
          ))}
        </div>}/>
      </div>

      {/* Perlu perhatian */}
      {alfaRank.length > 0 && (
        <div>
          <Label ch="⚠️ Perlu Perhatian Bulan Ini"/>
          <Card ch={<div className="divide-y divide-slate-50">
            {alfaRank.map(m=>(
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <Av name={m.name} src={m.photo} sz="sm"/>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p><p className="text-xs text-slate-400">{m.asrama}</p></div>
                <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-xl"><AlertCircle className="w-3.5 h-3.5 text-red-400"/><span className="text-sm font-bold text-red-600 font-mono">{m.alfa}</span><span className="text-xs text-red-400">alfa</span></div>
              </div>
            ))}
          </div>}/>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {label:"Rekap",   sub:"Statistik",    page:"rekap"   as Page, icon:<TrendingUp className="w-5 h-5"/>, col:"bg-emerald-50 text-emerald-600"},
          {label:"Riwayat", sub:"Kalender",     page:"riwayat" as Page, icon:<Calendar   className="w-5 h-5"/>, col:"bg-teal-50 text-teal-600"},
          {label:"Ibadah",  sub:"Sholat+Kiblat",page:"ibadah"  as Page, icon:<Compass    className="w-5 h-5"/>, col:"bg-amber-50 text-amber-600"},
        ].map(n=>(
          <button key={n.page} onClick={()=>onGoTo(n.page)} className="bg-white ring-1 ring-slate-100 rounded-2xl p-3.5 text-left hover:ring-emerald-200 hover:shadow-sm transition-all active:scale-[0.97]">
            <div className={`w-9 h-9 rounded-xl ${n.col} flex items-center justify-center mb-2`}>{n.icon}</div>
            <p className="font-semibold text-sm text-slate-800">{n.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{n.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: INPUT
// ─────────────────────────────────────────────────────────────────────────────
function PageInput({ authUser, records, onMark, onMarkAll, onLogin }: {authUser:AuthUser|null;records:AttendanceRecord[];onMark:MarkFn;onMarkAll:MarkAllFn;onLogin:()=>void}) {
  const [selDate, setSelDate] = useState(todayStr());
  const [selAsrama, setSelAsrama] = useState(ASRAMAS[0]);
  const [search, setSearch] = useState("");
  const [noteFor, setNoteFor] = useState<{id:string;prayer:PrayerSlot}|null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmAll, setConfirmAll] = useState<PrayerSlot|null>(null);

  if (!authUser) return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center"><Lock className="w-9 h-9 text-emerald-500"/></div>
      <div><h2 className="text-xl font-bold text-slate-800">Akses Terbatas</h2><p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">Hanya pamong dan koordinator yang berwenang mengisi presensi.</p></div>
      <button onClick={onLogin} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all"><LogIn className="w-4 h-4"/>Masuk dengan Google</button>
    </div>
  );

  const fullAccess = hasFullAccess(authUser);
  const activeAsrama = fullAccess ? selAsrama : authUser.asrama!;
  const musyrifList = MUSYRIF_LIST.filter(m => m.asrama === activeAsrama);
  const filtered = search ? musyrifList.filter(m=>m.name.toLowerCase().includes(search.toLowerCase())) : musyrifList;

  const getRecord = (mid: string) => records.find(r => r.musyrifId === mid && r.date === selDate);
  const doneCount = musyrifList.filter(m => { const r=getRecord(m.id); return r?.subuh && r?.maghrib; }).length;
  const isFuture = selDate > todayStr();

  const mark = (mid: string, p: PrayerSlot, s: AttendanceStatus, note?: string) => onMark(mid,p,s,selDate,note);

  const hijriSel = toHijri(parseISO(selDate));

  const prevDay = () => {
    const d = parseISO(selDate); d.setDate(d.getDate()-1);
    setSelDate(format(d,"yyyy-MM-dd"));
  };
  const nextDay = () => {
    if (selDate >= todayStr()) return;
    const d = parseISO(selDate); d.setDate(d.getDate()+1);
    setSelDate(format(d,"yyyy-MM-dd"));
  };

  return (
    <div className="flex flex-col gap-5">
      <div><h2 className="text-2xl font-bold text-slate-900">Input Presensi</h2></div>

      {/* Date navigator */}
      <Card ch={<div className="p-3 flex items-center gap-2">
        <button onClick={prevDay} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-slate-500"/>
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-sm text-slate-800">{format(parseISO(selDate),"EEEE, d MMMM yyyy",{locale:id})}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{hijriSel.day} {hijriSel.monthName} {hijriSel.year} H</p>
          {isToday(parseISO(selDate)) && <span className="inline-block text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold mt-1">Hari ini</span>}
        </div>
        <button onClick={nextDay} disabled={selDate >= todayStr()} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-5 h-5 text-slate-500"/>
        </button>
      </div>}/>

      {/* Show date picker fallback */}
      <details className="bg-white ring-1 ring-slate-100 rounded-2xl px-4 py-3">
        <summary className="text-xs text-slate-400 cursor-pointer select-none flex items-center gap-2 font-semibold">
          <Calendar className="w-3.5 h-3.5"/>Pilih tanggal spesifik
        </summary>
        <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} max={todayStr()}
          className="mt-3 w-full text-sm text-slate-800 bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
      </details>

      {isFuture && <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>Tidak bisa mengisi presensi untuk tanggal yang akan datang.</div>}

      {/* User info */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{authUser.name[0]}</div>
        <div className="flex-1"><p className="font-semibold text-sm text-slate-800">{authUser.name}</p><p className="text-xs text-slate-400">{{pamong:"Pamong",koordinator_musyrif:"Koordinator Musyrif",koordinator_gedung:`Koordinator Gedung · ${authUser.asrama}`,musyrif:`Musyrif · ${authUser.asrama}`}[authUser.role]}</p></div>
      </div>

      {/* Asrama tabs */}
      {fullAccess && (
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
          {ASRAMAS.map(a=>(
            <button key={a} onClick={()=>setSelAsrama(a)} className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${selAsrama===a?"bg-white text-emerald-600 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>{a}</button>
          ))}
        </div>
      )}

      {/* Progress */}
      {!isFuture && (
        <Card ch={<div className="px-4 py-3.5">
          <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-slate-700">Progress {activeAsrama}</span><span className="text-sm font-bold text-emerald-600 font-mono">{doneCount}/{musyrifList.length}</span></div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{width:`${musyrifList.length?(doneCount/musyrifList.length)*100:0}%`}}/></div>
          {doneCount===musyrifList.length&&musyrifList.length>0&&<p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Semua musyrif sudah dipresensi!</p>}
        </div>}/>
      )}

      {/* Batch hadir */}
      {!isFuture && (
        <div className="grid grid-cols-2 gap-2">
          {(["subuh","maghrib"] as PrayerSlot[]).map(p=>(
            <button key={p} onClick={()=>setConfirmAll(p)} className="flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
              <Zap className="w-3.5 h-3.5"/>Hadir Semua {p==="subuh"?"Subuh":"Maghrib"}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari musyrif..." className="w-full pl-10 pr-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map(m=>{
          const rec = getRecord(m.id);
          const done = rec?.subuh && rec?.maghrib;
          return (
            <Card key={m.id} cls={done?"ring-2 ring-emerald-200":""} ch={<div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Av name={m.name}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm text-slate-800 truncate">{m.name}</p>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold font-mono">{m.kelas}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">Pamong: {m.pamong || "-"}</p>
                </div>
                {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0"/> : <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">Belum</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["subuh","maghrib"] as PrayerSlot[]).map(prayer=>{
                  const cur = rec?.[prayer];
                  const note = prayer==="subuh" ? rec?.subuhNote : rec?.maghribNote;
                  return (
                    <div key={prayer}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono">
                          {prayer==="subuh"?<Sun className="w-3 h-3 text-amber-400"/>:<Moon className="w-3 h-3 text-indigo-400"/>}{prayer}
                        </div>
                        {(cur==="izin"||cur==="alfa")&&!isFuture&&(
                          <button onClick={()=>{setNoteFor({id:m.id,prayer});setNoteText(note||"");}} className="text-[10px] text-emerald-500 underline">{note?"edit":"+ catatan"}</button>
                        )}
                      </div>
                      {note&&<p className="text-[10px] text-slate-400 italic bg-slate-50 rounded-lg px-2 py-1 mb-2">"{note}"</p>}
                      <div className="flex gap-1.5">
                        {([["hadir","H"],["izin","I"],["alfa","A"]] as [AttendanceStatus,string][]).map(([s,sh])=>(
                          <button key={s} disabled={isFuture} onClick={()=>mark(m.id,prayer,s)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${cur===s?`${S[s].btn} shadow-md`:"bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>{sh}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}/>
          );
        })}
      </div>

      {/* Note modal */}
      {noteFor&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setNoteFor(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-1">Catatan Keterangan</h3>
            <p className="text-xs text-slate-400 mb-4">{MUSYRIF_LIST.find(m=>m.id===noteFor.id)?.name} · {noteFor.prayer}</p>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Sakit, izin keluarga, dll." rows={3} className="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"/>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setNoteFor(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-semibold">Batal</button>
              <button onClick={()=>{const r=getRecord(noteFor.id);if(r?.[noteFor.prayer])mark(noteFor.id,noteFor.prayer,r[noteFor.prayer]!,noteText);setNoteFor(null);setNoteText("");}} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm all modal */}
      {confirmAll&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setConfirmAll(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4"><Zap className="w-6 h-6 text-emerald-600"/></div>
            <h3 className="font-bold text-slate-800">Tandai Semua Hadir?</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">Semua musyrif <b>{activeAsrama}</b> ditandai <b>Hadir</b> untuk <b>{confirmAll}</b> · {format(parseISO(selDate),"d MMM yyyy",{locale:id})}</p>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmAll(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-semibold">Batal</button>
              <button onClick={()=>{onMarkAll(activeAsrama,confirmAll,"hadir",selDate);setConfirmAll(null);}} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">Ya, Tandai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: REKAP
// ─────────────────────────────────────────────────────────────────────────────
function PageRekap({ records }: { records: AttendanceRecord[] }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [filterAsrama, setFilterAsrama] = useState("Semua");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pct"|"name">("pct");
  const [detail, setDetail] = useState<Musyrif|null>(null);
  const mk = format(viewMonth,"yyyy-MM");

  const days = useMemo(()=>eachDayOfInterval({start:startOfMonth(viewMonth),end:endOfMonth(viewMonth)})
    .filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d)),[viewMonth]);
  const mRecs = records.filter(r=>r.date.startsWith(mk));
  const fMusyrif = useMemo(()=>{
    let l = filterAsrama==="Semua" ? MUSYRIF_LIST : MUSYRIF_LIST.filter(m=>m.asrama===filterAsrama);
    if(search) l=l.filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
    return l;
  },[filterAsrama,search]);

  const rate = (p: PrayerSlot) => {
    if(!fMusyrif.length||!days.length) return 0;
    return Math.round(mRecs.filter(r=>fMusyrif.some(m=>m.id===r.musyrifId)&&r[p]==="hadir").length/(fMusyrif.length*days.length)*100);
  };

  const ranked = useMemo(()=>fMusyrif.map(m=>{
    const rs=mRecs.filter(r=>r.musyrifId===m.id);
    const sh=rs.filter(r=>r.subuh==="hadir").length,si=rs.filter(r=>r.subuh==="izin").length,sa=rs.filter(r=>r.subuh==="alfa").length;
    const mh=rs.filter(r=>r.maghrib==="hadir").length,mi=rs.filter(r=>r.maghrib==="izin").length,ma=rs.filter(r=>r.maghrib==="alfa").length;
    const pct=days.length?Math.round((sh+mh)/(days.length*2)*100):0;
    return {...m,sh,si,sa,mh,mi,ma,pct};
  }).sort((a,b)=>sortBy==="pct"?b.pct-a.pct:a.name.localeCompare(b.name)),[fMusyrif,mRecs,days,sortBy]);

  const weeklyData = Array.from({length:Math.max(1,Math.ceil(days.length/7))},(_,wi)=>{
    const wDays=days.slice(wi*7,wi*7+7);
    const wRecs=mRecs.filter(r=>wDays.some(d=>format(d,"yyyy-MM-dd")===r.date)&&fMusyrif.some(m=>m.id===r.musyrifId));
    const den=wDays.length*fMusyrif.length||1;
    return {week:`Mgg ${wi+1}`,subuh:Math.round(wRecs.filter(r=>r.subuh==="hadir").length/den*100),maghrib:Math.round(wRecs.filter(r=>r.maghrib==="hadir").length/den*100)};
  });

  const detailM = detail ? ranked.find(r=>r.id===detail.id) : null;
  const detailRecs = detail ? mRecs.filter(r=>r.musyrifId===detail.id) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Rekap Presensi</h2><p className="text-sm text-slate-400 mt-0.5">Data terbuka untuk publik</p></div>
        <button onClick={()=>exportPDF(records,viewMonth,filterAsrama)} className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/25">
          <Printer className="w-3.5 h-3.5"/>PDF
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={()=>setViewMonth(subMonths(viewMonth,1))} className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center hover:ring-emerald-300 transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
        <div className="flex-1 text-center font-bold text-slate-800">{format(viewMonth,"MMMM yyyy",{locale:id})}</div>
        <button onClick={()=>setViewMonth(addMonths(viewMonth,1))} className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center hover:ring-emerald-300 transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-amber-400/20">
          <div className="flex items-center gap-1.5 mb-2"><Sun className="w-4 h-4 opacity-80"/><span className="text-xs font-semibold opacity-80">Subuh</span></div>
          <p className="text-4xl font-bold font-mono">{rate("subuh")}<span className="text-lg opacity-70">%</span></p>
          <p className="text-xs opacity-60 mt-1">{days.length}h · {fMusyrif.length} musyrif</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-2"><Moon className="w-4 h-4 opacity-80"/><span className="text-xs font-semibold opacity-80">Maghrib</span></div>
          <p className="text-4xl font-bold font-mono">{rate("maghrib")}<span className="text-lg opacity-70">%</span></p>
          <p className="text-xs opacity-60 mt-1">{days.length}h · {fMusyrif.length} musyrif</p>
        </div>
      </div>

      {/* Weekly chart */}
      <Card ch={<div className="p-5">
        <Label ch="Tren Mingguan"/>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="week" tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={30}/>
            <Tooltip contentStyle={{background:"#fff",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,.08)",borderRadius:12,fontSize:12}} formatter={(v:number,n:string)=>[`${v}%`,n==="subuh"?"Subuh":"Maghrib"]}/>
            <Line type="monotone" dataKey="subuh"   stroke="#f59e0b" strokeWidth={2.5} dot={{r:4,fill:"#f59e0b"}} name="subuh"/>
            <Line type="monotone" dataKey="maghrib" stroke="#059669" strokeWidth={2.5} dot={{r:4,fill:"#059669"}} name="maghrib"/>
          </LineChart>
        </ResponsiveContainer>
      </div>}/>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {["Semua",...ASRAMAS].map(a=>(
            <button key={a} onClick={()=>setFilterAsrama(a)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filterAsrama===a?"bg-emerald-600 text-white shadow-md shadow-emerald-500/25":"bg-white ring-1 ring-slate-200 text-slate-500 hover:ring-emerald-300"}`}>{a}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari musyrif..." className="w-full pl-9 pr-3 py-2 bg-white ring-1 ring-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"/></div>
          <button onClick={()=>setSortBy(s=>s==="pct"?"name":"pct")} className="bg-white ring-1 ring-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 flex items-center gap-1 hover:ring-emerald-300 transition-all"><SlidersHorizontal className="w-3.5 h-3.5"/>{sortBy==="pct"?"%":"A-Z"}</button>
        </div>
      </div>

      {/* Ranking */}
      <Card ch={<div>
        <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center">
          <p className="font-bold text-slate-800">Peringkat Kehadiran</p>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">{ranked.length} musyrif</span>
        </div>
        <div className="divide-y divide-slate-50">
          {ranked.map((m,i)=>(
            <button key={m.id} onClick={()=>setDetail(m)} className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
              <span className={`w-5 text-sm font-bold text-center flex-shrink-0 font-mono ${i<3?["text-amber-400","text-slate-400","text-amber-600"][i]:"text-slate-300"}`}>{i+1}</span>
              <Av name={m.name} src={m.photo} sz="sm"/>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p><p className="text-[10px] text-slate-400">{m.asrama} · S:{m.sh}/{days.length} M:{m.mh}/{days.length}</p></div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-12"><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.pct>=80?"bg-emerald-500":m.pct>=60?"bg-amber-400":"bg-red-400"}`} style={{width:`${m.pct}%`}}/></div></div>
                <span className="text-sm font-bold text-slate-700 w-9 text-right font-mono">{m.pct}%</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300"/>
              </div>
            </button>
          ))}
        </div>
      </div>}/>

      {/* Today status */}
      <Card ch={<div>
        <div className="px-5 py-4 border-b border-slate-50 flex justify-between"><p className="font-bold text-slate-800">Status Hari Ini</p><span className="text-xs text-slate-400 font-mono">{format(new Date(),"d MMM")}</span></div>
        <div className="divide-y divide-slate-50">
          {fMusyrif.map(m=>{const rec=records.find(r=>r.musyrifId===m.id&&r.date===todayStr());return(
            <div key={m.id} className="px-5 py-3 flex items-center gap-3"><Av name={m.name} src={m.photo} sz="sm"/><span className="flex-1 text-sm font-medium text-slate-700 truncate">{m.name}</span><div className="flex gap-1.5"><Chip s={rec?.subuh}/><Chip s={rec?.maghrib}/></div></div>
          );})}
        </div>
      </div>}/>

      {/* Detail modal */}
      {detail && detailM && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100">
              <Av name={detailM.name} sz="lg"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-800">{detailM.name}</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">{detailM.kelas}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Pamong: {detailM.pamong || "-"}</p>
              </div>
              <div className="text-right"><p className="text-2xl font-bold text-slate-800 font-mono">{detailM.pct}%</p><p className="text-[10px] text-slate-400">kehadiran</p></div>
            </div>
            {(detailM.phone || detailM.email) && (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 border-b border-slate-100">
                {detailM.phone && (
                  <a href={`https://wa.me/${detailM.phone}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-sm">
                    <MessageCircle className="w-3.5 h-3.5"/> Hubungi WhatsApp
                  </a>
                )}
                {detailM.email && (
                  <a href={`mailto:${detailM.email}`}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-all">
                    <Mail className="w-3.5 h-3.5"/> Email
                  </a>
                )}
              </div>
            )}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{l:"Sub.H",v:detailM.sh,c:"text-emerald-600 bg-emerald-50"},{l:"Sub.I",v:detailM.si,c:"text-amber-600 bg-amber-50"},{l:"Sub.A",v:detailM.sa,c:"text-red-600 bg-red-50"},
                  {l:"Mag.H",v:detailM.mh,c:"text-emerald-600 bg-emerald-50"},{l:"Mag.I",v:detailM.mi,c:"text-amber-600 bg-amber-50"},{l:"Mag.A",v:detailM.ma,c:"text-red-600 bg-red-50"}].map(s=>(
                  <div key={s.l} className={`rounded-xl p-2.5 text-center ${s.c.split(" ")[1]}`}><p className={`text-lg font-bold font-mono ${s.c.split(" ")[0]}`}>{s.v}</p><p className="text-[9px] text-slate-400 mt-0.5">{s.l}</p></div>
                ))}
              </div>
              <Label ch="10 Hari Terakhir"/>
              <div className="flex flex-col gap-1">
                {detailRecs.slice(-10).reverse().map(r=>(
                  <div key={r.date} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 font-mono">{format(parseISO(r.date),"d MMM",{locale:id})}</span>
                    <div className="flex gap-1.5"><Chip s={r.subuh}/><Chip s={r.maghrib}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 pt-2"><button onClick={()=>setDetail(null)} className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">Tutup</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: RIWAYAT
// ─────────────────────────────────────────────────────────────────────────────
function PageRiwayat({ records, authUser, onLogin }: {records:AttendanceRecord[];authUser:AuthUser|null;onLogin:()=>void}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selId, setSelId] = useState(MUSYRIF_LIST[0].id);

  if (!authUser) return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center"><BookOpen className="w-9 h-9 text-teal-500"/></div>
      <div><h2 className="text-xl font-bold text-slate-800">Riwayat Presensi</h2><p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">Masuk untuk melihat riwayat lengkap per musyrif.</p></div>
      <button onClick={onLogin} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all"><LogIn className="w-4 h-4"/>Masuk</button>
    </div>
  );

  const allowed = hasFullAccess(authUser)
    ? MUSYRIF_LIST
    : authUser.role === "musyrif"
      ? MUSYRIF_LIST.filter(m => m.id === authUser.musyrifId || m.email === authUser.email)
      : MUSYRIF_LIST.filter(m => m.asrama === authUser.asrama);
  const musyrif = allowed.find(m=>m.id===selId) ?? allowed[0] ?? MUSYRIF_LIST[0];
  const mk = format(viewMonth,"yyyy-MM");
  const mRecs = records.filter(r=>r.musyrifId===musyrif.id&&r.date.startsWith(mk));
  const allRecs = records.filter(r=>r.musyrifId===musyrif.id);
  const days = eachDayOfInterval({start:startOfMonth(viewMonth),end:endOfMonth(viewMonth)});
  const pastDays = days.filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d));
  const adj = (startOfMonth(viewMonth).getDay()||7)-1;
  const getR = (d: Date) => mRecs.find(r=>r.date===format(d,"yyyy-MM-dd"));
  const streak = useMemo(()=>computeStreak(musyrif.id,records),[musyrif.id,records]);
  const pct = pastDays.length?Math.round((mRecs.filter(r=>r.subuh==="hadir").length+mRecs.filter(r=>r.maghrib==="hadir").length)/(pastDays.length*2)*100):0;

  const trendData = [-2,-1,0].map(off=>{
    const m2=addMonths(viewMonth,off), mk2=format(m2,"yyyy-MM");
    const rs=allRecs.filter(r=>r.date.startsWith(mk2));
    const md=eachDayOfInterval({start:startOfMonth(m2),end:endOfMonth(m2)}).filter(d=>!isBefore(new Date(),startOfDay(d))||isToday(d));
    return {month:format(m2,"MMM",{locale:id}),subuh:md.length?Math.round(rs.filter(r=>r.subuh==="hadir").length/md.length*100):0,maghrib:md.length?Math.round(rs.filter(r=>r.maghrib==="hadir").length/md.length*100):0};
  });

  const alfaList = mRecs.filter(r=>r.subuh==="alfa"||r.maghrib==="alfa").slice(-5).reverse();

  const doExport = () => {
    const lines=[`Riwayat Presensi — ${musyrif.name} — ${format(viewMonth,"MMMM yyyy",{locale:id})}`,""];
    pastDays.forEach(d=>{const r=getR(d);lines.push(`${format(d,"d MMM yyyy")} | Subuh: ${r?.subuh??"-"} | Maghrib: ${r?.maghrib??"-"}`);});
    const b=new Blob([lines.join("\n")],{type:"text/plain"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`presensi-${musyrif.name.replace(/ /g,"-")}-${mk}.txt`;a.click();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Riwayat</h2><p className="text-sm text-slate-400 mt-0.5">Detail per musyrif</p></div>
        <button onClick={doExport} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors"><Download className="w-3.5 h-3.5"/>Export</button>
      </div>

      <div className="relative"><select value={musyrif.id} onChange={e=>setSelId(e.target.value)} className="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10">
        {allowed.map(m=><option key={m.id} value={m.id}>{m.name} — {m.kelas} (Pamong: {m.pamong || "-"})</option>)}
      </select><ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/></div>

      <Card ch={<div className="p-4">
        <div className="flex items-center gap-4">
          <Av name={musyrif.name} sz="lg"/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-slate-800">{musyrif.name}</p>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">{musyrif.kelas}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Pamong: {musyrif.pamong || "-"}</p>
          </div>
          <div className="text-right"><p className="text-3xl font-bold text-slate-800 font-mono">{pct}<span className="text-sm text-slate-400 font-normal">%</span></p><p className="text-[10px] text-slate-400">bulan ini</p></div>
        </div>
        {(musyrif.phone || musyrif.email) && (
          <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
            {musyrif.phone && (
              <a href={`https://wa.me/${musyrif.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-sm">
                <MessageCircle className="w-3.5 h-3.5"/> Hubungi WhatsApp
              </a>
            )}
            {musyrif.email && (
              <a href={`mailto:${musyrif.email}`} className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-all">
                <Mail className="w-3.5 h-3.5"/> Email
              </a>
            )}
          </div>
        )}
      </div>}/>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-orange-50 rounded-2xl p-3.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0"><Flame className="w-5 h-5 text-orange-500"/></div>
          <div><p className="text-xl font-bold text-orange-600 font-mono">{streak.cur} <span className="text-sm font-normal">hari</span></p><p className="text-[10px] text-orange-400">Streak saat ini</p></div>
        </div>
        <div className="bg-purple-50 rounded-2xl p-3.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0"><Award className="w-5 h-5 text-purple-500"/></div>
          <div><p className="text-xl font-bold text-purple-600 font-mono">{streak.best} <span className="text-sm font-normal">hari</span></p><p className="text-[10px] text-purple-400">Streak terbaik</p></div>
        </div>
      </div>

      {/* 3-month trend */}
      <Card ch={<div className="p-5">
        <Label ch="Tren 3 Bulan"/>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={trendData} barGap={3} barCategoryGap="35%">
            <XAxis dataKey="month" tick={{fontSize:10,fill:"#94a3b8",fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}`} width={24}/>
            <Tooltip contentStyle={{background:"#fff",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,.08)",borderRadius:12,fontSize:12}} formatter={(v:number,n:string)=>[`${v}%`,n==="subuh"?"Subuh":"Maghrib"]}/>
            <Bar dataKey="subuh"   name="subuh"   fill="#f59e0b" radius={[4,4,0,0]}/>
            <Bar dataKey="maghrib" name="maghrib"  fill="#059669" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>}/>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={()=>setViewMonth(subMonths(viewMonth,1))} className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center hover:ring-emerald-300 transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
        <div className="flex-1 text-center font-bold text-slate-800">{format(viewMonth,"MMMM yyyy",{locale:id})}</div>
        <button onClick={()=>setViewMonth(addMonths(viewMonth,1))} className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center hover:ring-emerald-300 transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[{l:"Sub.H",v:mRecs.filter(r=>r.subuh==="hadir").length,c:"text-emerald-600 bg-emerald-50"},{l:"Sub.I",v:mRecs.filter(r=>r.subuh==="izin").length,c:"text-amber-600 bg-amber-50"},{l:"Sub.A",v:mRecs.filter(r=>r.subuh==="alfa").length,c:"text-red-600 bg-red-50"},
          {l:"Mag.H",v:mRecs.filter(r=>r.maghrib==="hadir").length,c:"text-emerald-600 bg-emerald-50"},{l:"Mag.I",v:mRecs.filter(r=>r.maghrib==="izin").length,c:"text-amber-600 bg-amber-50"},{l:"Mag.A",v:mRecs.filter(r=>r.maghrib==="alfa").length,c:"text-red-600 bg-red-50"}].map(s=>(
          <div key={s.l} className={`rounded-2xl p-3 text-center ${s.c.split(" ")[1]}`}><p className={`text-xl font-bold font-mono ${s.c.split(" ")[0]}`}>{s.v}</p><p className="text-[10px] text-slate-400 mt-0.5">{s.l}</p></div>
        ))}
      </div>

      {/* Calendar */}
      <Card ch={<div>
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d=><div key={d} className="text-center text-[10px] font-bold text-slate-400 py-2.5 font-mono">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({length:adj}).map((_,i)=><div key={`b${i}`} className="border-b border-r border-slate-50 min-h-[48px]"/>)}
          {days.map((day,i)=>{const r=getR(day);const future=isBefore(new Date(),startOfDay(day))&&!isToday(day);const last=(adj+i+1)%7===0;const perfect=r?.subuh==="hadir"&&r?.maghrib==="hadir";return(
            <div key={day.toISOString()} className={`min-h-[48px] border-b border-r border-slate-50 p-1 flex flex-col ${isToday(day)?"bg-emerald-50/50":perfect&&!future?"bg-emerald-50/30":""} ${future?"opacity-20":""} ${last?"border-r-0":""}`}>
              <span className={`text-[10px] font-bold self-end w-5 h-5 flex items-center justify-center rounded-full font-mono ${isToday(day)?"bg-emerald-600 text-white":"text-slate-400"}`}>{format(day,"d")}</span>
              {!future&&<div className="flex flex-col gap-[3px] mt-1 px-0.5"><div className={`h-[4px] rounded-full ${r?.subuh?S[r.subuh].dot:"bg-slate-200"}`}/><div className={`h-[4px] rounded-full ${r?.maghrib?S[r.maghrib].dot:"bg-slate-200"}`}/></div>}
            </div>
          );})}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 flex gap-4 flex-wrap bg-slate-50/50">
          {[{c:"bg-emerald-500",l:"Hadir"},{c:"bg-amber-400",l:"Izin"},{c:"bg-red-500",l:"Alfa"},{c:"bg-slate-200",l:"Kosong"}].map(x=>(
            <div key={x.l} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${x.c}`}/><span className="text-[10px] text-slate-400">{x.l}</span></div>
          ))}
          <span className="text-[10px] text-slate-300 ml-auto italic">↑ Subuh · ↓ Maghrib</span>
        </div>
      </div>}/>

      {alfaList.length>0&&<Card ch={<div>
        <div className="px-5 py-4 border-b border-slate-100"><p className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400"/>Ketidakhadiran Terbaru</p></div>
        <div className="divide-y divide-slate-50">
          {alfaList.map(r=>(
            <div key={r.date} className="px-5 py-3 flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-700">{format(parseISO(r.date),"EEE, d MMM yyyy",{locale:id})}</p>{(r.subuhNote||r.maghribNote)&&<p className="text-xs text-slate-400 italic mt-0.5">"{r.subuhNote||r.maghribNote}"</p>}</div>
              <div className="flex gap-1.5">{r.subuh==="alfa"&&<Chip s="alfa"/>}{r.maghrib==="alfa"&&<Chip s="alfa"/>}</div>
            </div>
          ))}
        </div>
      </div>}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: IBADAH (Prayer + Qibla + Sunnah Fasting)
// ─────────────────────────────────────────────────────────────────────────────
function PageIbadah() {
  const [loc, setLoc]         = useState<{lat:number;lon:number;name:string}>({lat:-7.7956,lon:110.3695,name:"Yogyakarta"});
  const [locLoading, setLocLoading] = useState(false);
  const [heading, setHeading] = useState<number|null>(null);
  const [demoH, setDemoH]     = useState(0);
  const [permDenied, setPermDenied] = useState(false);
  const [markedFasts, setMarkedFasts] = useState<Set<string>>(new Set());
  const [tab, setTab]         = useState<"jadwal"|"kiblat"|"puasa">("jadwal");

  const now = new Date();
  const hijri = toHijri(now);
  const prayers = calcPrayerTimes(now, loc.lat, loc.lon, 7);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const activeIdx = [...prayers].reduce((best, p, i) => p.raw <= nowH ? i : best, -1);
  const qibla = getQiblaAngle(loc.lat, loc.lon);
  const dist = getMeccaDist(loc.lat, loc.lon);
  const todayFasts = getSunnahFasts(now);
  const upcoming = useMemo(()=>getUpcomingSunnahFasts(14),[]);

  // Countdown to next prayer
  const nextPrayer = prayers[(activeIdx + 1) % prayers.length];
  const countdownMins = Math.round((nextPrayer.raw - nowH) * 60 + (nextPrayer.raw < nowH ? 1440 : 0));

  const getLoc = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(pos => {
      setLoc({lat:pos.coords.latitude,lon:pos.coords.longitude,name:"Lokasi Anda"});
      setLocLoading(false);
    },()=>setLocLoading(false));
  };

  useEffect(()=>{
    const handler = (e: DeviceOrientationEvent) => {
      const h = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360-e.alpha) : null);
      if (h != null) setHeading(h);
    };
    const req = (DeviceOrientationEvent as any).requestPermission;
    if (typeof req === "function") {
      req().then((p:string)=>{ if(p==="granted") window.addEventListener("deviceorientation",handler); else setPermDenied(true); }).catch(()=>setPermDenied(true));
    } else {
      window.addEventListener("deviceorientation",handler);
    }
    const iv = setInterval(()=>setDemoH(h=>h+0.5),20);
    return ()=>{ window.removeEventListener("deviceorientation",handler); clearInterval(iv); };
  },[]);

  const activeHeading = heading ?? demoH;
  const relQibla = (qibla - activeHeading + 360) % 360;
  const SIZE = 260, C = SIZE/2, RING = 100;
  const qRad  = (relQibla - 90) * Math.PI / 180;
  const dotX = C + RING * Math.cos(qRad);
  const dotY = C + RING * Math.sin(qRad);

  const toggleFast = (id: string) => setMarkedFasts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pIcons: Record<string,React.ReactNode> = {
    subuh:<Sunrise className="w-4 h-4"/>, terbit:<Sun className="w-4 h-4 opacity-50"/>,
    dhuhr:<Sun className="w-4 h-4"/>, asr:<Sun className="w-4 h-4 opacity-70"/>,
    maghrib:<Sunset className="w-4 h-4"/>, isha:<Moon className="w-4 h-4"/>,
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Jadwal Ibadah</h2>
        <p className="text-sm text-slate-400 mt-0.5">{hijri.day} {hijri.monthName} {hijri.year} H · KHGT Muhammadiyah</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
        {([["jadwal","Jadwal Sholat"],["kiblat","Arah Kiblat"],["puasa","Puasa Sunnah"]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${tab===t?"bg-white text-emerald-600 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>{l}</button>
        ))}
      </div>

      {/* ── TAB: JADWAL ── */}
      {tab==="jadwal"&&<>
        {/* Location */}
        <Card ch={<div className="px-4 py-3 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
          <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{loc.name}</p><p className="text-xs text-slate-400 font-mono">{loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°</p></div>
          <button onClick={getLoc} disabled={locLoading} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50">
            {locLoading?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Navigation className="w-3.5 h-3.5"/>}Lokasiku
          </button>
        </div>}/>

        {/* Next prayer countdown */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-5 py-4 flex items-center gap-4 text-white shadow-lg shadow-emerald-500/20">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">{pIcons[nextPrayer.key]}</div>
          <div className="flex-1"><p className="text-sm opacity-80">Waktu sholat berikutnya</p><p className="text-xl font-bold">{nextPrayer.name}</p></div>
          <div className="text-right"><p className="text-2xl font-bold font-mono">{nextPrayer.time}</p><p className="text-xs opacity-70">{countdownMins < 60 ? `${countdownMins}m lagi` : `${Math.floor(countdownMins/60)}j ${countdownMins%60}m`}</p></div>
        </div>

        {/* Full schedule */}
        <Card ch={<div>
          <div className="px-5 py-4 border-b border-slate-100"><p className="font-bold text-slate-800">Jadwal Sholat — {format(now,"d MMMM yyyy",{locale:id})}</p></div>
          <div className="divide-y divide-slate-50">
            {prayers.map((p,i)=>{
              const isActive = i === activeIdx;
              const isNext   = i === activeIdx+1;
              return (
                <div key={p.key} className={`flex items-center gap-3 px-5 py-3.5 ${isActive?"bg-emerald-50":isNext?"bg-slate-50/80":""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive?"bg-emerald-600 text-white":isNext?"bg-slate-200 text-slate-600":"bg-slate-100 text-slate-400"}`}>{pIcons[p.key]}</div>
                  <div className="flex-1"><p className={`text-sm font-semibold ${isActive?"text-emerald-700":isNext?"text-slate-700":"text-slate-500"}`}>{p.name}</p>{isNext&&<p className="text-[10px] text-emerald-400">Berikutnya</p>}</div>
                  <p className={`font-bold font-mono ${isActive?"text-emerald-700 text-base":isNext?"text-slate-700":"text-slate-400 text-sm"}`}>{p.time}</p>
                  {isActive&&<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>}
                </div>
              );
            })}
          </div>
        </div>}/>
      </>}

      {/* ── TAB: KIBLAT ── */}
      {tab==="kiblat"&&<>
        <Card ch={<div className="px-4 py-3 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
          <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{loc.name}</p><p className="text-xs text-slate-400 font-mono">{loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°</p></div>
          <button onClick={getLoc} disabled={locLoading} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50">
            {locLoading?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Navigation className="w-3.5 h-3.5"/>}Lokasiku
          </button>
        </div>}/>

        <Card ch={<div className="py-8 flex flex-col items-center gap-6">
          <div className="relative">
            <svg width={SIZE} height={SIZE} className="overflow-visible">
              {Array.from({length:72}).map((_,i)=>{
                const a=(i*5-90)*Math.PI/180, r1=RING+18, r2=RING+(i%6===0?26:20);
                return <line key={i} x1={C+r1*Math.cos(a)} y1={C+r1*Math.sin(a)} x2={C+r2*Math.cos(a)} y2={C+r2*Math.sin(a)} stroke={i%6===0?"#94a3b8":"#e2e8f0"} strokeWidth={i%6===0?1.5:1}/>;
              })}
              {[{l:"U",a:-90},{l:"T",a:0},{l:"S",a:90},{l:"B",a:180}].map(({l,a})=>{
                const ar=(a-90)*Math.PI/180;
                return <text key={l} x={C+(RING+36)*Math.cos(ar)} y={C+(RING+36)*Math.sin(ar)} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono',monospace" fill={l==="U"?"#ef4444":"#94a3b8"}>{l}</text>;
              })}
              <circle cx={C} cy={C} r={RING} fill="none" stroke="#e2e8f0" strokeWidth="1.5"/>
              {/* Inner decor */}
              <circle cx={C} cy={C} r={RING*0.5} fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 6"/>
              {/* Glow halos */}
              <circle cx={dotX} cy={dotY} r={24} fill="rgba(5,150,105,0.06)"/>
              <circle cx={dotX} cy={dotY} r={16} fill="rgba(5,150,105,0.12)"/>
              {/* Line from center */}
              <line x1={C} y1={C} x2={dotX} y2={dotY} stroke="#059669" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.3"/>
              {/* Kaaba dot */}
              <circle cx={dotX} cy={dotY} r={12} fill="#059669"/>
              <text x={dotX} y={dotY} textAnchor="middle" dominantBaseline="central" fontSize="12">🕋</text>
              {/* Center arrow */}
              <g transform={`rotate(${relQibla} ${C} ${C})`}>
                <polygon points={`${C},${C-30} ${C-7},${C+12} ${C+7},${C+12}`} fill="#059669" opacity="0.9"/>
                <polygon points={`${C},${C+30} ${C-7},${C-12} ${C+7},${C-12}`} fill="#d1fae5" opacity="0.6"/>
              </g>
              <circle cx={C} cy={C} r={6} fill="white" stroke="#059669" strokeWidth="2"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-800 font-mono">{Math.round(dist).toLocaleString()} <span className="text-base font-normal text-slate-400">km</span></p>
            <p className="text-sm text-slate-400 mt-0.5">dari Ka'bah · Makkah</p>
            <p className="text-xs text-slate-300 mt-3 font-mono">{Math.round(qibla)}° dari Utara</p>
            {heading===null && <p className="text-[10px] text-slate-300 mt-1 italic">Demo berputar — aktifkan kompas perangkat untuk arah real-time</p>}
          </div>
          {permDenied&&<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mx-4 text-center"><AlertCircle className="w-4 h-4 flex-shrink-0"/>Izinkan akses kompas di pengaturan browser/perangkat.</div>}
        </div>}/>
      </>}

      {/* ── TAB: PUASA SUNNAH ── */}
      {tab==="puasa"&&<>
        {/* Today */}
        <div>
          <Label ch="Puasa Sunnah Hari Ini"/>
          {todayFasts.length === 0
            ? <Card ch={<div className="px-5 py-5 flex items-center gap-3 text-slate-400"><Info className="w-5 h-5 flex-shrink-0"/><p className="text-sm">Tidak ada puasa sunnah khusus hari ini.</p></div>}/>
            : <div className="flex flex-col gap-2">
                {todayFasts.map(f=>(
                  <button key={f.id} onClick={()=>toggleFast(f.id)} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all ring-2 ${markedFasts.has(f.id)?"bg-emerald-600 text-white ring-emerald-500 shadow-lg shadow-emerald-500/25":"bg-white ring-emerald-100 hover:ring-emerald-200"}`}>
                    <span className="text-2xl flex-shrink-0">{f.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${markedFasts.has(f.id)?"text-white":"text-slate-800"}`}>{f.name}</p>
                      <p className={`text-xs mt-0.5 ${markedFasts.has(f.id)?"text-emerald-200":"text-slate-400"}`}>{f.desc}</p>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${markedFasts.has(f.id)?"bg-white/20":"bg-slate-100"}`}>
                      {markedFasts.has(f.id)?<CheckCircle2 className="w-4 h-4 text-white"/>:<div className="w-4 h-4 rounded-full border-2 border-slate-300"/>}
                    </div>
                  </button>
                ))}
              </div>
          }
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {icon:"☀️", label:"Senin", sub:"Mingguan"},
            {icon:"✨", label:"Kamis", sub:"Mingguan"},
            {icon:"🌕", label:"Ayyamul Bidh", sub:"13-15 Hijri"},
          ].map(f=>(
            <div key={f.label} className="bg-white ring-1 ring-slate-100 rounded-2xl p-3 text-center">
              <span className="text-2xl block mb-1.5">{f.icon}</span>
              <p className="text-xs font-bold text-slate-700">{f.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{f.sub}</p>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        <div>
          <Label ch="Puasa Sunnah Ke Depan (14 hari)"/>
          {upcoming.length===0
            ? <Card ch={<div className="px-5 py-4 text-sm text-slate-400">Tidak ada jadwal puasa sunnah dalam 14 hari ke depan.</div>}/>
            : <Card ch={<div className="divide-y divide-slate-50">
                {upcoming.map(({date,fasts})=>(
                  <div key={date.toISOString()} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="flex flex-col items-center w-9 flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{format(date,"EEE",{locale:id}).slice(0,3)}</span>
                      <span className="text-lg font-bold text-slate-700 font-mono leading-none">{format(date,"d")}</span>
                      <span className="text-[9px] text-slate-300">{format(date,"MMM",{locale:id})}</span>
                    </div>
                    <div className="flex-1">
                      {fasts.map(f=>(
                        <div key={f.id} className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{f.icon}</span>
                          <div><p className="text-xs font-semibold text-slate-700">{f.name}</p><p className="text-[10px] text-slate-400">{f.type==="weekly"?"Mingguan":f.type==="monthly"?"Bulanan":"Tahunan"}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>}/>
          }
        </div>

        {/* Keutamaan summary */}
        <Card ch={<div className="p-5">
          <Label ch="Puasa Sunnah Utama"/>
          <div className="flex flex-col gap-3">
            {[
              {icon:"⭐",name:"Asyura (10 Muharram)",    reward:"Menghapus dosa setahun lalu"},
              {icon:"🕋",name:"Arafah (9 Dzulhijjah)",   reward:"Menghapus dosa 2 tahun"},
              {icon:"🎉",name:"6 hari Syawal",            reward:"Seperti puasa sepanjang tahun"},
              {icon:"🌕",name:"Ayyamul Bidh (13-15)",    reward:"Seperti puasa sebulan penuh"},
              {icon:"☀️",name:"Senin",                    reward:"Hari kelahiran & amalan Nabi ﷺ"},
            ].map(f=>(
              <div key={f.name} className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{f.icon}</span>
                <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{f.name}</p><p className="text-xs text-slate-400">{f.reward}</p></div>
              </div>
            ))}
          </div>
        </div>}/>
      </>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "336443539411-b7uv4udqqhbqpdmeuja54dhfsda4q7cm.apps.googleusercontent.com";

function parseJwt(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Gagal membaca Google JWT:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN MODAL (Google Identity Services + Whitelist Protection)
// ─────────────────────────────────────────────────────────────────────────────
function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (u: AuthUser) => void }) {
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const ROLE_LABELS: Record<string, string> = {
    koordinator_musyrif: "Koord. Musyrif",
    pamong: "Pamong Asrama",
    koordinator_gedung: "Koord. Asrama",
  };

  // Whitelist verification handler strictly from Google OAuth JWT
  const handleGoogleCredential = useCallback((inputEmail: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const clean = (inputEmail || "").trim().toLowerCase();

    if (!clean) {
      setErrorMsg("Email akun Google tidak terdeteksi.");
      return;
    }

    // Check ONLY in AUTH_USERS (Pamong, Koordinator Musyrif, Koordinator Asrama)
    const foundAuth = AUTH_USERS.find(u => u.email.trim().toLowerCase() === clean);
    if (foundAuth) {
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundAuth.name} (${ROLE_LABELS[foundAuth.role] || "Pengelola"})...`);
      setTimeout(() => {
        onLogin(foundAuth);
        onClose();
      }, 500);
      return;
    }

    // Rejected - Not in authorized Whitelist
    setErrorMsg(`Akses Ditolak: Akun Google "${inputEmail}" tidak terdaftar dalam Whitelist pengelola.`);
  }, [onLogin, onClose]);

  // Initialize official Google Identity Services
  useEffect(() => {
    let active = true;
    const initGis = () => {
      try {
        // @ts-ignore
        if (active && typeof window !== "undefined" && window.google?.accounts?.id && googleBtnRef.current) {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response?.credential) {
                const payload = parseJwt(response.credential);
                if (payload?.email) {
                  handleGoogleCredential(payload.email);
                } else {
                  setErrorMsg("Gagal membaca profil akun Google.");
                }
              }
            },
            auto_select: false,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = "";
            // @ts-ignore
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left",
              width: 280,
            });
            setIsGisLoaded(true);
          }
        }
      } catch (e) {
        console.warn("GSI notice:", e);
      }
    };

    initGis();
    const timer = setInterval(() => {
      // @ts-ignore
      if (window.google?.accounts?.id) {
        initGis();
        clearInterval(timer);
      }
    }, 300);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [handleGoogleCredential]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(15,23,42,0.6)",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              P
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 tracking-tight">Presensi Asrama</h2>
              <p className="text-[10px] text-slate-400">Portal Pamong & Koordinator</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-2xs">
            <X className="w-4 h-4 text-slate-500"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-slate-50 shadow-xs flex items-center justify-center border border-slate-200/80 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          
          <h3 className="text-base font-bold text-slate-800">Masuk Akun Google</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-[260px] leading-relaxed">
            Gunakan akun Google yang terdaftar sebagai Pamong atau Koordinator
          </p>

          {/* Centered Google Button */}
          <div className="w-full flex items-center justify-center min-h-[48px] overflow-visible">
            <div 
              ref={googleBtnRef} 
              className="flex items-center justify-center [&>div]:!mx-auto [&>iframe]:!mx-auto" 
              style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}
            />
          </div>

          {/* Fallback button if GIS script still loading */}
          {!isGisLoaded && (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  try {
                    // @ts-ignore
                    if (window.google?.accounts?.id) {
                      // @ts-ignore
                      window.google.accounts.id.prompt();
                    } else {
                      setErrorMsg("Sedang memuat Google SDK...");
                    }
                  } catch {
                    setErrorMsg("Gagal memanggil Google Login. Silakan coba lagi.");
                  }
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2.5 shadow-sm transition-all text-xs font-semibold mt-1"
              >
                <span>Login dengan Google</span>
              </button>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="w-full mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5 text-rose-700 text-left animate-in fade-in zoom-in-95 duration-200">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-rose-600 leading-relaxed font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="w-full mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-700 text-left animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-emerald-600 leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> Whitelist Terproteksi
          </span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard" as Page, label:"Dasbor",  Icon:LayoutDashboard },
  { id:"input"     as Page, label:"Input",   Icon:ClipboardList },
  { id:"rekap"     as Page, label:"Rekap",   Icon:TrendingUp },
  { id:"riwayat"   as Page, label:"Riwayat", Icon:BookOpen },
  { id:"ibadah"    as Page, label:"Ibadah",  Icon:Compass },
];

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser|null>(() => {
    try {
      const saved = localStorage.getItem("presensi_auth_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const valid = AUTH_USERS.find(u => u.email.toLowerCase() === parsed?.email?.toLowerCase());
      return valid || null;
    } catch {
      return null;
    }
  });
  const [records,  setRecords]    = useState<AttendanceRecord[]>(()=>generateRecords());
  const [page,     setPage]       = useState<Page>("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(t); },[]);

  const handleLogin = (u: AuthUser) => {
    setAuthUser(u);
    try {
      localStorage.setItem("presensi_auth_user", JSON.stringify(u));
    } catch {}
    setPage("input");
  };

  const handleLogout = () => {
    setAuthUser(null);
    try {
      localStorage.removeItem("presensi_auth_user");
    } catch {}
    setPage("dashboard");
  };

  const handleMark = useCallback<MarkFn>((mid, prayer, status, date, note) => {
    const nk = prayer==="subuh"?"subuhNote":"maghribNote";
    setRecords(prev=>{
      const ex=prev.find(r=>r.musyrifId===mid&&r.date===date);
      if(ex) return prev.map(r=>r.musyrifId===mid&&r.date===date?{...r,[prayer]:status,...(note!==undefined?{[nk]:note}:{})}:r);
      return [...prev,{musyrifId:mid,date,[prayer]:status,...(note?{[nk]:note}:{}),markedBy:authUser?.id}];
    });
  },[authUser]);

  const handleMarkAll = useCallback<MarkAllFn>((asrama, prayer, status, date) => {
    MUSYRIF_LIST.filter(m=>m.asrama===asrama).forEach(m=>handleMark(m.id,prayer,status,date));
  },[handleMark]);

  const todayRecs = records.filter(r=>r.date===todayStr());
  const pending = MUSYRIF_LIST.filter(m=>{ const r=todayRecs.find(x=>x.musyrifId===m.id); return !r?.subuh||!r?.maghrib; }).length;
  const hijri = toHijri(now);

  return (
    <div className="min-h-screen bg-background" style={{fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-emerald-100/80 shadow-sm shadow-black/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <CheckCircle2 className="w-4 h-4 text-white"/>
            </div>
            <div>
              <p className="font-bold text-sm leading-none text-slate-800">Presensi Musyrif</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{format(now,"HH:mm")} · {hijri.day} {hijri.monthName}</p>
            </div>
          </div>
          {authUser
            ? <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">{authUser.name[0]}</div>
                  <span className="text-xs font-semibold text-slate-700">{authUser.name.split(" ")[0]}</span>
                </div>
                <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"><LogOut className="w-3.5 h-3.5"/></button>
              </div>
            : <button onClick={()=>setShowLogin(true)} className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all"><LogIn className="w-3.5 h-3.5"/>Masuk</button>
          }
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
        {page==="dashboard" && <PageDashboard records={records} authUser={authUser} onGoTo={setPage}/>}
        {page==="input"     && <PageInput authUser={authUser} records={records} onMark={handleMark} onMarkAll={handleMarkAll} onLogin={()=>setShowLogin(true)}/>}
        {page==="rekap"     && <PageRekap records={records}/>}
        {page==="riwayat"   && <PageRiwayat records={records} authUser={authUser} onLogin={()=>setShowLogin(true)}/>}
        {page==="ibadah"    && <PageIbadah/>}
      </main>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2" style={{background:"linear-gradient(to top,rgba(240,253,244,.98) 70%,transparent)"}}>
        <nav className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl shadow-black/10 ring-1 ring-black/5 px-1 flex">
          {NAV.map(nav=>{
            const active = page === nav.id;
            const badge = nav.id==="input" && authUser && pending > 0;
            return (
              <button key={nav.id} onClick={()=>setPage(nav.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200 relative ${active?"text-emerald-600":"text-slate-400 hover:text-slate-600"}`}>
                <div className={`p-1.5 rounded-xl transition-all duration-200 relative ${active?"bg-emerald-50":""}`}>
                  <nav.Icon className="w-[18px] h-[18px]"/>
                  {badge && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">{pending>9?"9+":pending}</span>}
                </div>
                <span className="text-[10px] font-semibold">{nav.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onLogin={handleLogin}/>}
    </div>
  );
}
