import React, { useState, useEffect } from "react";
import { 
  X, Footprints, Flame, CheckCircle2, ShieldCheck, 
  Sparkles, RotateCcw, Play, Pause, AlertCircle, Compass, Zap, Smartphone
} from "lucide-react";
import { motion } from "motion/react";
import { pedometerInstance } from "../utils/pedometer";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

interface PatroliStepsModalProps {
  onClose: () => void;
  taskTitle: string;
  taskIcon: string;
  targetSteps: number;
  initialSteps?: number;
  onConfirmSteps: (steps: number) => void;
}

export function PatroliStepsModal({
  onClose,
  taskTitle,
  taskIcon,
  targetSteps = 60,
  initialSteps = 0,
  onConfirmSteps
}: PatroliStepsModalProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [isActive, setIsActive] = useState(true);
  const [magnitude, setMagnitude] = useState(9.8);

  useEffect(() => {
    pedometerInstance.reset(initialSteps);
    pedometerInstance.start(
      (newSteps) => setSteps(newSteps),
      (mag) => setMagnitude(mag)
    );

    return () => {
      pedometerInstance.stop();
    };
  }, [initialSteps]);

  const handleToggleTracking = async () => {
    triggerHaptic("light");
    if (isActive) {
      pedometerInstance.stop();
      setIsActive(false);
    } else {
      await pedometerInstance.requestPermission();
      pedometerInstance.start(
        (newSteps) => setSteps(newSteps),
        (mag) => setMagnitude(mag)
      );
      setIsActive(true);
    }
  };

  const handleSimulateStep = () => {
    triggerHaptic("light");
    pedometerInstance.simulateStep();
  };

  const handleReset = () => {
    triggerHaptic("light");
    pedometerInstance.reset(0);
    setSteps(0);
  };

  const isTargetReached = steps >= targetSteps;
  const progressPct = Math.min(100, Math.round((steps / targetSteps) * 100));
  const isMoving = magnitude > 10.5;

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
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Footprints className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{taskTitle}</h3>
              <p className="text-[11px] text-emerald-100/80">Validasi Sensor Langkah Kaki Pedometer</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }}
            aria-label="Tutup"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Tracker */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono ${
              isActive 
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
              {isActive ? (
                isMoving ? (
                  <span className="flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Mendeteksi Langkah Kaki...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Bawa Perangkat & Mulai Berjalan</span>
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1">
                  <Pause className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sensor Dijeda</span>
                </span>
              )}
            </span>
          </div>

          {/* Large Circular Progress & Step Counter */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="text-slate-100"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-300 ${
                  isTargetReached ? "text-emerald-500" : "text-teal-600"
                }`}
                strokeWidth="8"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * progressPct) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
              <Footprints className={`w-7 h-7 mb-1 transition-transform ${
                isMoving ? "scale-125 text-emerald-600 animate-bounce" : "text-slate-400"
              }`} />
              <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                {steps}
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Target: {targetSteps} Langkah
              </p>
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-mono mt-1">
                {progressPct}% Terpenuhi
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          {isTargetReached ? (
            <div className="w-full p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-left">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Target Patroli Berhasil Tervalidasi!</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Musyrif terbukti aktif bergerak menyisir kamar santri.</p>
              </div>
            </div>
          ) : (
            <div className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Bawa perangkat menyisir asrama ({targetSteps - steps} langkah lagi)</span>
            </div>
          )}

          {/* Live Sensor Indicator */}
          <div className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Sensor Gerak
            </span>
            <span className="font-mono font-bold text-slate-700">
              {magnitude.toFixed(1)} m/s² {isActive ? "(Aktif)" : "(Jeda)"}
            </span>
          </div>

          {/* Test Simulation Button */}
          <div className="w-full flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSimulateStep}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-700 active:scale-95 transition-all flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>Simulasi +1 Langkah</span>
            </button>

            <button
              type="button"
              onClick={handleToggleTracking}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 active:scale-95 transition-all flex items-center gap-1"
            >
              {isActive ? <Pause className="w-3 h-3 text-slate-600"/> : <Play className="w-3 h-3 text-emerald-600"/>}
              <span>{isActive ? "Jeda" : "Lanjut"}</span>
            </button>
            
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 active:scale-95 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!isTargetReached}
            onClick={() => {
              triggerHaptic("success");
              onConfirmSteps(steps);
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 ${
              isTargetReached
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Selesai & Validasi ({steps} Langkah)</span>
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
