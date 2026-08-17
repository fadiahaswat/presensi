import React, { useState, useEffect } from "react";
import { X, Bell, BellRing, Volume2, VolumeX, Clock, Check, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

interface AlarmNotificationManagerProps {
  onClose: () => void;
  nextPrayerName?: string;
  nextPrayerTime?: string;
}

export function AlarmNotificationManager({
  onClose,
  nextPrayerName = "Subuh",
  nextPrayerTime = "04:35"
}: AlarmNotificationManagerProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("muallimin_alarm_sound") !== "false";
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== "undefined" && "Notification" in window 
      ? Notification.permission 
      : "default";
  });
  const [reminderOffset, setReminderOffset] = useState<number>(() => {
    return parseInt(localStorage.getItem("muallimin_reminder_offset") || "15", 10);
  });
  const [tested, setTested] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("muallimin_alarm_sound", String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("muallimin_reminder_offset", String(reminderOffset));
  }, [reminderOffset]);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Browser Anda belum mendukung Web Notification API.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        new Notification("Notifikasi Presensi Aktif", {
          body: "Pengingat waktu presensi shalat Musyrif Mu'allimin telah berhasil diaktifkan.",
          icon: "/muallimin-logo.png"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Play a soft chime sound via Web Audio API synthesizer
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.4); // C6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const handleTestNotification = () => {
    triggerHaptic("medium");
    if (soundEnabled) {
      playChime();
    }

    if (notifPermission === "granted") {
      new Notification(`Pengingat: Waktu Shalat ${nextPrayerName} Telah Dekat`, {
        body: `Waktu ${nextPrayerName} pukul ${nextPrayerTime} WIB. Siapkan presensi musyrif dan absensi santri.`,
        icon: "/muallimin-logo.png"
      });
    }

    setTested(true);
    setTimeout(() => setTested(false), 3000);
  };

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
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Alarm & Pengingat Presensi</h3>
              <p className="text-xs text-emerald-100/80">Otomatisasi pengingat waktu shalat & absensi</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Next Prayer Banner */}
          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {nextPrayerName.slice(0, 3)}
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Shalat Terdekat</p>
                <h4 className="text-sm font-extrabold text-slate-800">{nextPrayerName} · {nextPrayerTime} WIB</h4>
              </div>
            </div>
            <span className="text-xs bg-white border border-emerald-200 px-2.5 py-1 rounded-full font-bold text-emerald-700">
              Hisab KHGT
            </span>
          </div>

          {/* Browser Notification Permission Card */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Izin Web Push Notifikasi</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Munculkan popup notifikasi di layar HP / Laptop saat waktu presensi tiba.
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                notifPermission === "granted" ? "bg-emerald-100 text-emerald-800" :
                notifPermission === "denied" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
              }`}>
                {notifPermission === "granted" ? "Aktif" : notifPermission === "denied" ? "Diblokir" : "Belum Aktif"}
              </span>
            </div>

            {notifPermission !== "granted" && (
              <button
                type="button"
                onClick={requestPermission}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" /> Izinkan Notifikasi Browser
              </button>
            )}
          </div>

          {/* Audio Chime Switch */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200/70 text-slate-600 shadow-2xs">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Suara Chime Alarm</h4>
                <p className="text-xs text-slate-500">Bunyikan nada lembut saat notifikasi muncul</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                soundEnabled ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                soundEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* Offset Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Bunyikan Pengingat Sebelum Shalat:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setReminderOffset(mins)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    reminderOffset === mins
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {mins} Menit
                </button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <button
            type="button"
            onClick={handleTestNotification}
            className="w-full py-3 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {tested ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Pengingat & Suara Dites!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Uji Coba Sekarang</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            Selesai
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
