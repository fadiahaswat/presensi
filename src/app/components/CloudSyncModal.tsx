import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  X,
  Zap,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { googleSyncService, SyncState } from "../utils/googleSyncService";

export const CloudSyncBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleSyncService.getState());

  useEffect(() => {
    return googleSyncService.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  switch (syncState.status) {
    case "syncing":
      return (
        <div
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20 cursor-pointer shadow-xs transition-all"
          title="Menyinkronkan data secara otomatis ke Google Sheet..."
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
          <span className="hidden sm:inline">Sinkron Otomatis...</span>
        </div>
      );
    case "pending":
      return (
        <div
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-pointer shadow-xs transition-all"
          title={`${syncState.pendingCount} perubahan sedang dalam proses simpan otomatis ke Google Sheet`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <Cloud className="w-3.5 h-3.5" />
          <span>{syncState.pendingCount} Menyimpan...</span>
        </div>
      );
    case "offline":
      return (
        <div
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 cursor-pointer shadow-xs transition-all"
          title="Mode Offline — Data tersimpan aman dan otomatis sinkron saat online"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      );
    case "synced":
    default:
      return (
        <div
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer shadow-xs transition-all"
          title="Tersambung ke Google Sheets (Otomatis & Realtime)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Cloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sheet Realtime</span>
        </div>
      );
  }
};

export const CloudSyncModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onResetAll?: () => Promise<void>;
  onInjectMaster?: () => Promise<void> | void;
  isKoordinator?: boolean;
  stats: {
    records: number;
    izin: number;
    kegiatan: number;
    logbook: number;
    mutabaah: number;
    santriSakit: number;
    musyrif: number;
  };
}> = ({ isOpen, onClose, onResetAll, onInjectMaster, isKoordinator, stats }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleSyncService.getState());
  const [isResetting, setIsResetting] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    return googleSyncService.subscribe((state) => {
      setSyncState(state);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    if (!onResetAll) return;
    setIsResetting(true);
    try {
      await onResetAll();
      setConfirmReset(false);
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  const handleExecuteInject = async () => {
    if (!onInjectMaster) return;
    setIsInjecting(true);
    try {
      await onInjectMaster();
      onClose();
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 ring-1 ring-slate-200/60">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Google Sheets Live Sync
              </h2>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>100% Otomatis & Realtime</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="my-3.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-emerald-950">
                Database Cloud Terhubung
              </div>
              <div className="text-[11px] text-emerald-800/80 mt-0.5 truncate font-mono">
                {syncState.lastSyncedAt 
                  ? `Terakhir sinkron: ${new Date(syncState.lastSyncedAt).toLocaleTimeString("id-ID")}` 
                  : "Sinkronisasi otomatis aktif"}
              </div>
            </div>
          </div>
        </div>

        {/* Data Stats Grid */}
        <div className="space-y-2">
          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Data Tersimpan di Google Sheet
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Presensi", val: stats.records },
              { label: "Izin Santri", val: stats.izin },
              { label: "Santri Sakit", val: stats.santriSakit },
              { label: "Kegiatan", val: stats.kegiatan },
              { label: "Logbook", val: stats.logbook },
              { label: "Mutabaah", val: stats.mutabaah },
            ].map((st) => (
              <div key={st.label} className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs">
                <div className="text-sm font-black text-emerald-700 font-mono">{st.val}</div>
                <div className="text-slate-500 text-[10px] font-medium mt-0.5">{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
          {confirmReset ? (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-center space-y-2">
              <p className="text-xs font-bold text-rose-800">
                Kosongkan data presensi & logbook di Google Sheet?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={isResetting}
                  className="flex-1 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteReset}
                  disabled={isResetting}
                  className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-2xs"
                >
                  {isResetting ? "Mereset..." : "Ya, Kosongkan"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isKoordinator && onInjectMaster && (
                <button
                  onClick={handleExecuteInject}
                  disabled={isInjecting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isInjecting ? "Menginjeksi Data..." : "Inject / Pulihkan Master Musyrif & Pamong"}</span>
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(true)}
                  className="py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  Reset Bersih
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
