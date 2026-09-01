import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  X,
  AlertCircle,
  Clock
} from "lucide-react";
import { googleSyncService, SyncState } from "../utils/googleSyncService";
import { triggerHaptic } from "../utils/animations";

export { CloudSyncBadge } from "./CloudSyncBadge";

export const CloudSyncModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onResetAll?: () => Promise<void>;
  onInjectMaster?: () => Promise<void> | void;
  isKoordinator?: boolean;
  isDbAdmin?: boolean;
  stats?: {
    records: number;
    izin: number;
    kegiatan: number;
    logbook: number;
    mutabaah: number;
    santriSakit: number;
    musyrif: number;
  };
}> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleSyncService.getState());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    return googleSyncService.subscribe((state) => {
      setSyncState(state);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSyncNow = async () => {
    triggerHaptic("medium");
    setIsManualSyncing(true);
    try {
      await googleSyncService.flush();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSyncing = syncState.status === "syncing" || isManualSyncing;
  const isPending = syncState.status === "pending";
  const isError = syncState.status === "error";
  const isOffline = syncState.status === "offline";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 ring-1 ring-slate-200/60" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Status Database Cloud
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className={`my-3.5 p-3.5 rounded-2xl border transition-all ${
          isSyncing 
            ? "bg-sky-50/80 border-sky-200 text-sky-900"
            : isPending 
            ? "bg-amber-50/80 border-amber-200 text-amber-900"
            : isError 
            ? "bg-rose-50/80 border-rose-200 text-rose-900"
            : isOffline 
            ? "bg-slate-100 border-slate-200 text-slate-800"
            : "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isSyncing 
                ? "bg-sky-500 text-white"
                : isPending 
                ? "bg-amber-500 text-white"
                : isError 
                ? "bg-rose-500 text-white"
                : isOffline 
                ? "bg-slate-500 text-white"
                : "bg-emerald-600 text-white"
            }`}>
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isPending ? (
                <Clock className="w-4 h-4 animate-pulse" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4" />
              ) : isOffline ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-black">
                {isSyncing 
                  ? "Sedang Menyimpan Data..." 
                  : isPending 
                  ? `${syncState.pendingCount} Perubahan Sedang Antre` 
                  : isError 
                  ? "Koneksi Bermasalah" 
                  : isOffline 
                  ? "Mode Offline (Tersimpan Lokal)" 
                  : "Semua Data Tersimpan di Cloud"}
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                {isSyncing 
                  ? "Proses pengiriman ke Google Sheet sedang berlangsung."
                  : isPending
                  ? "Data tersimpan di memori perangkat dan segera diunggah ke Google Sheet."
                  : isError
                  ? (syncState.errorMessage || "Terjadi kendala saat mengirim. Ketuk tombol di bawah untuk mencoba lagi.")
                  : isOffline
                  ? "Data presensi & laporan tetap aman dan otomatis sinkron saat tersambung internet."
                  : `Tersambung realtime. Terakhir sinkron: ${syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString("id-ID") : "Baru saja"}.`}
              </p>
            </div>
          </div>

          {/* Quick Trigger Button if pending, error, or manual */}
          <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncing}
              className="w-full py-2 px-3 rounded-xl bg-white text-slate-800 hover:bg-slate-50 font-bold text-xs shadow-2xs border border-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
