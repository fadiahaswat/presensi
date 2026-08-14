import React, { useState, useEffect } from "react";
import { X, Bell, BellRing, Volume2, VolumeX, Clock, Check, ShieldCheck, Sparkles } from "lucide-react";

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
        new Notification("🔔 Notifikasi Presensi Aktif!", {
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

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.45);
      });
    } catch (err) {
      console.error("Audio play failed:", err);
    }
  };

  const handleTestNotification = () => {
    if (soundEnabled) {
      playChime();
    }
    if (notifPermission === "granted") {
      new Notification(`🔔 Pengingat Shalat ${nextPrayerName}`, {
        body: `Waktu ${nextPrayerName} (${nextPrayerTime}) mendekat. Siapkan absensi santri & musyrif!`,
        icon: "/muallimin-logo.png"
      });
    }
    setTested(true);
    setTimeout(() => setTested(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Alarm & Pengingat Presensi</h3>
              <p className="text-[11px] text-emerald-100/80">Otomatisasi pengingat waktu shalat & absensi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Next Prayer Banner */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {nextPrayerName.slice(0, 3)}
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Shalat Terdekat</p>
                <h4 className="text-sm font-extrabold text-slate-800">{nextPrayerName} • {nextPrayerTime} WIB</h4>
              </div>
            </div>
            <span className="text-[10px] bg-white border border-emerald-200 px-2 py-1 rounded-full font-bold text-emerald-700">
              Muhammadiyah
            </span>
          </div>

          {/* Browser Notification Switch */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                <span>Web Push Notification</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Status: {notifPermission === "granted" ? "🟢 Diizinkan" : notifPermission === "denied" ? "🔴 Diblokir Browser" : "🟡 Perlu Izin"}
              </p>
            </div>

            {notifPermission !== "granted" ? (
              <button
                onClick={requestPermission}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
              >
                Aktifkan
              </button>
            ) : (
              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5" /> Aktif
              </span>
            )}
          </div>

          {/* Audio Chime Switch */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>Suara Bell Lembut (Chime)</span>
              </div>
              <p className="text-[11px] text-slate-500">Mainkan nada halus saat waktu presensi tiba</p>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                soundEnabled ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                soundEnabled ? "translate-x-6" : ""
              }`} />
            </button>
          </div>

          {/* Offset Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Waktu Notifikasi Pengingat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 30].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setReminderOffset(mins)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    reminderOffset === mins
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {mins} Menit Sebelum
                </button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={handleTestNotification}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {tested ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Notifikasi & Suara Telah Diuji!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Uji Coba Pengingat & Suara Sekarang</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
}
