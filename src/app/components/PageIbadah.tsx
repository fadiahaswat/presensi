import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, Clock, Calendar, MapPin, RefreshCw, Navigation,
  Sunrise, Sun, Sunset, Moon, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toHijri } from "../utils/khgtCalendar";
import { calcPrayerTimes, getQiblaAngle, getMeccaDist } from "../utils/prayerTimes";

interface PageIbadahProps {
  onBack?: () => void;
  onOpenKalenderHijriah?: () => void;
  onOpenKalenderPendidikan?: () => void;
}

export const PageIbadah: React.FC<PageIbadahProps> = ({ 
  onBack, 
  onOpenKalenderHijriah,
  onOpenKalenderPendidikan 
}) => {
  const [loc, setLoc]         = useState<{lat:number;lon:number;name:string}>({lat:-7.807631,lon:110.350905,name:"Mu'allimin Yogyakarta"});
  const [locLoading, setLocLoading] = useState(false);
  const [heading, setHeading] = useState<number|null>(null);
  const [demoH, setDemoH]     = useState(0);
  const [permDenied, setPermDenied] = useState(false);
  const [tab, setTab]         = useState<"jadwal"|"kiblat">("jadwal");

  const now = new Date();
  const hijri = toHijri(now);
  const prayers = calcPrayerTimes(now, loc.lat, loc.lon, 7);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const activeIdx = [...prayers].reduce((best, p, i) => p.raw <= nowH ? i : best, -1);
  const qibla = getQiblaAngle(loc.lat, loc.lon);
  const dist = getMeccaDist(loc.lat, loc.lon);

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

  // Request compass sensor permission only when user switches to Kiblat tab
  const [sensorRequested, setSensorRequested] = useState(false);

  useEffect(() => {
    if (tab !== "kiblat" || sensorRequested) return;

    setSensorRequested(true);
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
    return ()=>{ window.removeEventListener("deviceorientation",handler); };
  },[tab, sensorRequested]);

  // Demo rotation fallback only when viewing Kiblat tab and physical sensor is unavailable
  useEffect(() => {
    if (tab !== "kiblat" || heading !== null) return;
    const iv = setInterval(() => setDemoH(h => (h + 1) % 360), 100);
    return () => clearInterval(iv);
  }, [tab, heading]);

  const activeHeading = heading ?? demoH;
  const relQibla = (qibla - activeHeading + 360) % 360;
  const isAligned = Math.abs(relQibla) < 5 || Math.abs(relQibla - 360) < 5;
  const SIZE = 260, C = SIZE/2, RING = 100;
  const qRad  = (relQibla - 90) * Math.PI / 180;
  const dotX = C + RING * Math.cos(qRad);
  const dotY = C + RING * Math.sin(qRad);

  const pIcons: Record<string,React.ReactNode> = {
    subuh:<Sunrise className="w-4 h-4"/>, terbit:<Sun className="w-4 h-4 opacity-50"/>,
    dhuhr:<Sun className="w-4 h-4"/>, asr:<Sun className="w-4 h-4 opacity-70"/>,
    maghrib:<Sunset className="w-4 h-4"/>, isha:<Moon className="w-4 h-4"/>,
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-16">
      {/* 1. Unified Master Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 border border-slate-100/50 flex flex-col gap-3.5">
        {/* Top Row: Back button + Icon + Title + Calendar links */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button 
                onClick={onBack} 
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Kembali ke Dasbor"
              >
                <ChevronLeft className="w-4 h-4"/>
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 bg-[#0C81E4] text-white shadow-sky-600/25">
              <Clock className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                Jadwal Ibadah
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {hijri.day} {hijri.monthName} {hijri.year} H · KHGT Muhammadiyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenKalenderHijriah && (
              <button
                type="button"
                onClick={onOpenKalenderHijriah}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0C4E8C] ring-1 ring-sky-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0"
                title="Buka Kalender Hijriah"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0C81E4]" />
                <span className="hidden sm:inline">Kalender Hijriah</span>
              </button>
            )}
            {onOpenKalenderPendidikan && (
              <button
                type="button"
                onClick={onOpenKalenderPendidikan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 ring-1 ring-teal-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0"
                title="Buka Kalender Pendidikan"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden sm:inline">Kaldik</span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated Segmented Tabs */}
        <div className="flex p-1 bg-slate-50/80 rounded-2xl gap-1 border border-slate-100/80">
          {([["jadwal","Jadwal Sholat"],["kiblat","Arah Kiblat"]] as const).map(([t,l])=>(
            <button
              key={t}
              onClick={()=>{
                if(t!=="kiblat"){setHeading(null);setSensorRequested(false);}
                setTab(t);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab===t
                  ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Integrated Location Row */}
        <div className="px-3.5 py-2.5 bg-slate-50/80 rounded-2xl border border-slate-100/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{loc.name}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°</p>
            </div>
          </div>
          <button 
            onClick={getLoc} 
            disabled={locLoading} 
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/80 px-2.5 py-1 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            {locLoading?<RefreshCw className="w-3 h-3 animate-spin"/>:<Navigation className="w-3 h-3"/>}
            <span>Lokasiku</span>
          </button>
        </div>
      </div>

      {/* ── TAB: JADWAL ── */}
      {tab==="jadwal"&&<>
        {/* Next prayer countdown */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-5 py-4 flex items-center gap-4 text-white shadow-lg shadow-emerald-500/20">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">{pIcons[nextPrayer.key]}</div>
          <div className="flex-1"><p className="text-sm opacity-80">Waktu sholat berikutnya</p><p className="text-xl font-bold">{nextPrayer.name}</p></div>
          <div className="text-right"><p className="text-2xl font-bold font-mono">{nextPrayer.time}</p><p className="text-xs opacity-70">{countdownMins < 60 ? `${countdownMins}m lagi` : `${Math.floor(countdownMins/60)}j ${countdownMins%60}m`}</p></div>
        </div>

        {/* Full schedule */}
        <div className="bg-white rounded-[24px] shadow-xs ring-1 ring-slate-200/70 border border-slate-100/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800">Jadwal Sholat — {format(now,"d MMMM yyyy",{locale:id})}</p>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{hijri.day} {hijri.monthName} {hijri.year} H</span>
          </div>
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
        </div>
      </>}

      {/* ── TAB: KIBLAT ── */}
      {tab==="kiblat"&&<>
        <div className="bg-white rounded-[24px] shadow-xs ring-1 ring-slate-200/70 border border-slate-100/50 overflow-hidden">
          <div className="py-8 flex flex-col items-center gap-6">
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
                <circle cx={C} cy={C} r={RING} fill="none" stroke={isAligned ? "#10b981" : "#e2e8f0"} strokeWidth={isAligned ? 3 : 1.5} className="transition-all duration-300"/>
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
                  <polygon points={`${C},${C-30} ${C-7},${C+12} ${C+7},${C+12}`} fill={isAligned ? "#10b981" : "#059669"} opacity="0.9"/>
                  <polygon points={`${C},${C+30} ${C-7},${C-12} ${C+7},${C-12}`} fill="#d1fae5" opacity="0.6"/>
                </g>
                <circle cx={C} cy={C} r={6} fill="white" stroke="#059669" strokeWidth="2"/>
              </svg>
            </div>
            <div className="text-center px-4">
              {isAligned ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono mb-2 animate-bounce">
                  <span>✓ Menghadap Kiblat Tepat!</span>
                </div>
              ) : null}
              <p className="text-3xl font-bold text-slate-800 font-mono">{Math.round(dist).toLocaleString()} <span className="text-base font-normal text-slate-400">km</span></p>
              <p className="text-sm text-slate-400 mt-0.5">dari Ka'bah · Makkah</p>
              <p className="text-xs text-slate-400 mt-2 font-mono">{Math.round(qibla)}° dari Utara</p>
            </div>

            {/* Interactive manual compass tester for desktop / non-sensor */}
            {heading === null && (
              <div className="w-full px-6 pt-3 border-t border-slate-100 flex flex-col gap-2 max-w-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Simulasi Sudut Kompas:</span>
                  <span className="font-mono font-bold text-emerald-700">{Math.round(demoH)}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={Math.round(demoH)} 
                  onChange={e => setDemoH(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>0° U</span>
                  <span>90° T</span>
                  <span>180° S</span>
                  <span>270° B</span>
                </div>
              </div>
            )}

            {permDenied&&<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mx-4 text-center"><AlertCircle className="w-4 h-4 flex-shrink-0"/>Izinkan akses kompas di pengaturan browser/perangkat.</div>}
          </div>
        </div>
      </>}
    </div>
  );
};
