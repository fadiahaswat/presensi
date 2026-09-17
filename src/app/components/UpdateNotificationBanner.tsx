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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.25 }}
        className="sticky top-0 z-50 w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-[#0C4E8C] text-white shadow-md border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-amber-300 shadow-xs animate-bounce">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-[13px] leading-tight flex items-center gap-1.5 truncate">
                <span>Versi Baru Tersedia!</span>
                <span className="text-[10px] bg-sky-400/30 border border-sky-300/40 text-sky-100 font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {updateState.latestVersion || "v2.0"}
                </span>
              </p>
              <p className="text-[11px] text-sky-100/90 truncate mt-0.5">
                Pembaruan sistem telah dirilis. Muat ulang untuk mendapatkan fitur & perbaikan terbaru.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleHardRefresh}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#0C4E8C] font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-sky-50 active:scale-95 transition-all cursor-pointer disabled:opacity-80"
              title="Lakukan Hard Refresh & bersihkan cache peramban"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin text-sky-600" : ""}`} />
              <span>{isUpdating ? "Memperbarui..." : "Perbarui Sekarang"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIsDismissed(true);
              }}
              className="w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              title="Tutup pemberitahuan sementara"
            >
              <X className="w-4 h-4" />
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
        className="h-8 px-2.5 rounded-full relative bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs flex items-center gap-1.5 hover:from-amber-600 hover:to-rose-600 transition-all active:scale-95 select-none animate-pulse"
        title="Versi baru tersedia! Klik untuk Hard Refresh"
      >
        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isUpdating ? "animate-spin" : ""}`} />
        <span className="text-[11px] font-extrabold tracking-tight hidden sm:inline">Update</span>
        <span className="w-2 h-2 rounded-full bg-white animate-ping absolute -top-0.5 -right-0.5" />
      </button>
    );
  }

  // Jika belum/tidak ada update baru, jangan tampilkan ikon agar header tetap bersih dan tidak bertumpuk
  return null;
};
