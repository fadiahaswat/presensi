import React, { useState, useEffect } from "react";
import { 
  X, Footprints, CheckCircle2, ShieldCheck, 
  RotateCcw, Play, Pause, AlertTriangle, Compass,
  MapPin, Timer, Navigation, Activity, Zap, Radio,
  TrendingUp, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { pedometerInstance, PedometerTelemetry, PedometerService } from "../utils/pedometer";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

interface PatroliStepsModalProps {
  onClose: () => void;
  taskTitle: string;
  taskIcon: string;
  targetSteps?: number;
  initialSteps?: number;
  onConfirmSteps: (steps: number) => void;
}

export function PatroliStepsModal({
  onClose,
  taskTitle,
  taskIcon,
  targetSteps = 150,
  initialSteps = 0,
  onConfirmSteps
}: PatroliStepsModalProps) {
  const effectiveTargetSteps = Math.max(150, targetSteps);

  const [hasStarted, setHasStarted] = useState(initialSteps > 0);
  const [isActive, setIsActive] = useState(false);
  const [telemetry, setTelemetry] = useState<PedometerTelemetry>({
    steps: initialSteps,
    magnitude: 9.8,
    cadence: 0,
    speedKmh: 0,
    isMoving: false,
    gpsActive: false,
    gpsAccuracy: 0,
    displacementMeters: 0,
    totalDistanceMeters: 0,
    elapsedSeconds: 0,
    isDisplacementValid: false,
    routePoints: [{ x: 50, y: 50, timestamp: Date.now() }]
  });

  useEffect(() => {
    pedometerInstance.reset(initialSteps);
    return () => {
      pedometerInstance.stop();
    };
  }, [initialSteps]);

  const handleStartPatrol = async () => {
    triggerHaptic("medium");
    await pedometerInstance.requestPermission();
    pedometerInstance.reset(telemetry.steps);
    pedometerInstance.start(telemetry.steps, (data) => {
      setTelemetry(data);
    });
    setHasStarted(true);
    setIsActive(true);
  };

  const handleToggleTracking = async () => {
    triggerHaptic("light");
    if (isActive) {
      pedometerInstance.stop();
      setIsActive(false);
    } else {
      await pedometerInstance.requestPermission();
      pedometerInstance.start(telemetry.steps, (data) => {
        setTelemetry(data);
      });
      setIsActive(true);
    }
  };

  const handleReset = () => {
    triggerHaptic("light");
    pedometerInstance.reset(0);
    setIsActive(false);
    setHasStarted(false);
    setTelemetry({
      steps: 0,
      magnitude: 9.8,
      cadence: 0,
      speedKmh: 0,
      isMoving: false,
      gpsActive: false,
      gpsAccuracy: 0,
      displacementMeters: 0,
      totalDistanceMeters: 0,
      elapsedSeconds: 0,
      isDisplacementValid: false,
      routePoints: [{ x: 50, y: 50, timestamp: Date.now() }]
    });
  };

  const steps = telemetry.steps;
  const isTargetReached = steps >= effectiveTargetSteps;
  const progressPct = Math.min(100, Math.round((steps / effectiveTargetSteps) * 100));
  
  // Anti-Room-Spinning: Must leave the bedroom (>= 15m radius displacement)
  const isDisplacementValid = telemetry.isDisplacementValid || telemetry.displacementMeters >= PedometerService.MIN_DISPLACEMENT_METERS;
  const isPatrolFullyValid = isTargetReached && (isDisplacementValid || steps >= effectiveTargetSteps + 20);

  // Format Elapsed Time MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Convert distance to km or m
  const distanceDisplay = telemetry.totalDistanceMeters >= 1000 
    ? `${(telemetry.totalDistanceMeters / 1000).toFixed(2)} km`
    : `${telemetry.totalDistanceMeters} m`;

  // Generate SVG path for live Strava mini-map
  const generateRouteSvgPath = () => {
    if (!telemetry.routePoints || telemetry.routePoints.length === 0) return "M 50 50";
    return telemetry.routePoints.reduce((acc, pt, idx) => {
      return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, "");
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => { triggerHaptic("light"); onClose(); }}
    >
      <motion.div 
        className="bg-slate-950 text-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-800 my-auto" 
        variants={modalContentVariants}
        onClick={e => e.stopPropagation()}
      >
        
        {/* Strava Dark Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Strava Orange Activity Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#FC4C02] flex items-center justify-center shadow-lg shadow-[#FC4C02]/20">
              <Footprints className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FC4C02] font-mono">
                  PATROLI MUSYRIF
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  MIN 150 LKG
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-100 leading-tight truncate max-w-[200px]">
                {taskTitle}
              </h3>
            </div>
          </div>

          {/* GPS Quality Pill & Close */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              telemetry.gpsActive 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}>
              <Radio className={`w-3 h-3 ${telemetry.gpsActive ? "animate-pulse text-emerald-400" : ""}`} />
              <span>{telemetry.gpsActive ? "GPS LIVE" : "GPS"}</span>
            </div>

            <button 
              type="button"
              onClick={() => { triggerHaptic("light"); onClose(); }}
              aria-label="Tutup"
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Strava Main Body */}
        <div className="p-5 flex flex-col space-y-4 overflow-y-auto max-h-[calc(92vh-140px)]">
          
          {/* Main Hero: Elapsed Duration (Strava Large Digital Clock) */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center relative overflow-hidden">
            {/* Background subtle grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
            
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-mono block">
              DURASI PATROLI
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mt-0.5 leading-none">
              {formatTime(telemetry.elapsedSeconds)}
            </div>
            
            {/* Activity Status Subtitle */}
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                !hasStarted ? "bg-amber-400" : isActive ? "bg-emerald-400 animate-ping" : "bg-slate-500"
              }`} />
              <span className="text-xs font-semibold text-slate-300">
                {!hasStarted ? "Siap Memulai Aktivitas" : isActive ? (telemetry.isMoving ? "Mendeteksi Langkah..." : "Bawa Perangkat & Berjalan") : "Aktivitas Dijeda"}
              </span>
            </div>
          </div>

          {/* Strava 2x2 Metric Splits Grid (Big Bold Athletic Typography) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Split 1: STEPS (Hero Metric) */}
            <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono">LANGKAH</span>
                <Footprints className="w-3.5 h-3.5 text-[#FC4C02]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {steps}
                <span className="text-xs text-slate-400 font-bold ml-1">/ {effectiveTargetSteps}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#FC4C02] to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Split 2: DISTANCE */}
            <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono">JARAK TEMPUH</span>
                <Navigation className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {distanceDisplay}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-2">
                Kumulatif GPS & Gerak
              </p>
            </div>

            {/* Split 3: RADIUS JELAJAH (Anti Muter Kamar) */}
            <div className={`rounded-2xl p-3.5 border transition-all ${
              isDisplacementValid 
                ? "bg-emerald-950/40 border-emerald-500/40" 
                : steps > 30 
                ? "bg-amber-950/40 border-amber-500/40" 
                : "bg-slate-900/90 border-slate-800"
            }`}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono">RADIUS JELAJAH</span>
                <MapPin className={`w-3.5 h-3.5 ${isDisplacementValid ? "text-emerald-400" : "text-amber-400"}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {telemetry.displacementMeters} <span className="text-xs text-slate-400 font-bold">m</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                {isDisplacementValid ? (
                  <span className="text-emerald-400 flex items-center gap-1">✓ Keluar Kamar</span>
                ) : (
                  <span className="text-amber-400">Min. 15 meter</span>
                )}
              </div>
            </div>

            {/* Split 4: SPEED & CADENCE */}
            <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono">RITME / KECEPATAN</span>
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {telemetry.speedKmh} <span className="text-xs text-slate-400 font-bold">km/h</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2">
                {telemetry.cadence} langkah/menit
              </p>
            </div>
          </div>

          {/* Strava Live GPS Route Mini-Map Visualizer */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#FC4C02]" /> LIVE GPS ROUTE MAP
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Akurasi: ±{telemetry.gpsAccuracy || 5}m
              </span>
            </div>

            {/* SVG Canvas for Strava Orange Breadcrumb Path */}
            <div className="w-full h-28 bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800/80 flex items-center justify-center">
              {/* Radar circular rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-20 h-20 rounded-full border border-slate-600 animate-ping" style={{ animationDuration: '4s' }} />
                <div className="w-12 h-12 rounded-full border border-slate-500 absolute" />
              </div>

              <svg className="w-full h-full p-2" viewBox="0 0 100 100">
                {/* Route Path Polyline (Strava Orange) */}
                <path
                  d={generateRouteSvgPath()}
                  fill="none"
                  stroke="#FC4C02"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Starting Point (Green Pin) */}
                <circle cx="50" cy="50" r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />

                {/* Current Location (Pulsing Orange Dot) */}
                {telemetry.routePoints.length > 0 && (
                  <circle
                    cx={telemetry.routePoints[telemetry.routePoints.length - 1].x}
                    cy={telemetry.routePoints[telemetry.routePoints.length - 1].y}
                    r="4.5"
                    fill="#FC4C02"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                )}
              </svg>

              {/* Start & Current Marker Badges */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Start
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[9px] font-mono text-[#FC4C02] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FC4C02] animate-ping" /> Posisi Musyrif
              </div>
            </div>
          </div>

          {/* Anti-Room-Spinning Verification Banner */}
          {!hasStarted ? (
            <div className="p-3.5 bg-gradient-to-r from-orange-950/40 to-slate-900 border border-[#FC4C02]/30 rounded-2xl text-left space-y-1.5">
              <div className="flex items-center gap-2 text-[#FC4C02] font-black text-xs uppercase tracking-wider font-mono">
                <ShieldCheck className="w-4 h-4" /> ATURAN PATROLI STRAVA
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                1. Target minimal <strong>100 Langkah</strong> patroli.<br/>
                2. <strong>Wajib keluar kamar</strong> menyisir lorong / gedung asrama (radius jelajah $\ge$ 15 meter).
              </p>
            </div>
          ) : isPatrolFullyValid ? (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-2.5 text-left">
              <Award className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase text-emerald-300 font-mono tracking-wider">
                  PATROLI TERVERIFIKASI
                </p>
                <p className="text-[10px] text-emerald-200/90">
                  Target 100+ langkah tercapai & terbukti menyisir luar kamar (Radius: {telemetry.displacementMeters}m).
                </p>
              </div>
            </div>
          ) : isTargetReached && !isDisplacementValid ? (
            <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-2xl flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase text-amber-300 font-mono tracking-wider">
                  RADIUS MASIH DALAM KAMAR
                </p>
                <p className="text-[10px] text-amber-200/90">
                  Langkah tercapai ({steps} lkg), namun radius jelajah masih &lt; 15 meter. Silakan berjalan menyusuri lorong asrama.
                </p>
              </div>
            </div>
          ) : null}

        </div>

        {/* Strava Iconic Action Controls (Big Round Buttons) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          
          {!hasStarted ? (
            <button
              type="button"
              onClick={handleStartPatrol}
              className="w-full py-3.5 bg-[#FC4C02] hover:bg-[#e04300] text-white rounded-2xl font-black text-sm uppercase tracking-wider font-mono shadow-lg shadow-[#FC4C02]/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>MULAI PATROLI</span>
            </button>
          ) : (
            <>
              {/* Reset Button */}
              <button
                type="button"
                onClick={handleReset}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer shrink-0"
                title="Reset Patroli"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Pause / Resume Button (Strava Iconic Center Button) */}
              <button
                type="button"
                onClick={handleToggleTracking}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
                  isActive 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" 
                    : "bg-[#FC4C02] hover:bg-[#e04300] text-white shadow-lg shadow-[#FC4C02]/25"
                }`}
              >
                {isActive ? <Pause className="w-4 h-4 text-slate-300" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isActive ? "JEDA" : "LANJUT"}</span>
              </button>

              {/* Finish & Validate Button (Disabled until fully valid) */}
              <button
                type="button"
                disabled={!isPatrolFullyValid}
                onClick={() => {
                  triggerHaptic("success");
                  onConfirmSteps(steps);
                  onClose();
                }}
                className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                  isPatrolFullyValid
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
                    : "bg-slate-800/80 text-slate-600 border border-slate-800 cursor-not-allowed"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>SELESAI ({steps})</span>
              </button>
            </>
          )}

        </div>

      </motion.div>
    </motion.div>
  );
}
