import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updateManager, UpdateState } from "../utils/updateManager";
import { triggerHaptic } from "../utils/animations";

export const UpdateNotificationBanner: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>(updateManager.getState());
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    return updateManager.subscribe((state) => {
      setUpdateState(state);
      if (state.hasUpdate) {
        setIsDismissed(false);
      }
    });
  }, []);

  const handleHardRefresh = async () => {
    triggerHaptic("medium");
    setIsUpdating(true);
    await updateManager.performHardRefresh();
  };

  if (!updateState.hasUpdate || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="sticky top-0 z-50 w-full bg-gradient-to-r from-emerald-800 via-teal-700 to-[#0C4E8C] text-white shadow-xs border-b border-emerald-500/20 select-none"
      >
        <div className="max-w-5xl mx-auto px-3.5 py-1.5 sm:py-2 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center shrink-0 text-emerald-200">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5 truncate">
              <p className="font-bold text-white text-[11px] sm:text-xs leading-none truncate">
                Versi Baru Tersedia!
              </p>
              <span className="text-[9px] bg-white/20 border border-white/25 text-emerald-100 font-mono px-1 py-0.2 rounded font-bold shrink-0">
                {updateState.latestVersion || "v2.0"}
              </span>
              <span className="text-[10.5px] text-emerald-100/80 hidden md:inline truncate">
                — Muat ulang untuk mendapatkan fitur & perbaikan terbaru.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleHardRefresh}
              disabled={isUpdating}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              title="Lakukan Hard Refresh & bersihkan cache peramban"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? "animate-spin text-emerald-600" : ""}`} />
              <span>{isUpdating ? "Memperbarui..." : "Perbarui Sekarang"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIsDismissed(true);
              }}
              className="w-6 h-6 rounded-md text-white/70 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Header button component that displays update status and allows manual check or 1-click hard refresh
 */
export const HeaderUpdateBadge: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>(updateManager.getState());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    return updateManager.subscribe((state) => {
      setUpdateState(state);
    });
  }, []);

  const handleClick = async () => {
    triggerHaptic("light");
    if (updateState.hasUpdate) {
      setIsUpdating(true);
      await updateManager.performHardRefresh();
    } else {
      // Manual check
      await updateManager.checkForUpdate(true);
    }
  };

  if (updateState.hasUpdate) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isUpdating}
        className="w-8 h-8 rounded-full relative bg-emerald-50 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/80 hover:text-emerald-800 shadow-2xs flex items-center justify-center transition-all active:scale-95 select-none"
        title="Versi baru tersedia! Klik untuk Perbarui Aplikasi"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin text-emerald-600" : ""}`} />
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white absolute -top-0.5 -right-0.5" />
      </button>
    );
  }

  // Jika belum/tidak ada update baru, jangan tampilkan ikon agar header tetap bersih dan tidak bertumpuk
  return null;
};
