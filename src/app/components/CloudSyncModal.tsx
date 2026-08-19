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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Sheets Live Sync
              </h2>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                100% Otomatis & Realtime
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="my-5 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Database Cloud Terhubung
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {syncState.lastSyncedAt 
                  ? `Terakhir sinkron: ${new Date(syncState.lastSyncedAt).toLocaleTimeString("id-ID")}` 
                  : "Sinkronisasi otomatis aktif di latar belakang."}
              </div>
            </div>
          </div>
        </div>

        {/* Automation Info */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>Setiap penambahan, pengeditan, atau penghapusan data langsung tersimpan otomatis ke Google Sheet Anda.</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <span>Perubahan data dari musyrif lain otomatis diperbarui secara berkala (*realtime delta update*).</span>
          </div>
        </div>

        {/* Data Stats Grid */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Data Tersimpan di Google Sheet
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.records}</div>
              <div className="text-slate-500 text-[10px]">Presensi</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.izin}</div>
              <div className="text-slate-500 text-[10px]">Izin Santri</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.santriSakit}</div>
              <div className="text-slate-500 text-[10px]">Santri Sakit</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.kegiatan}</div>
              <div className="text-slate-500 text-[10px]">Kegiatan</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.logbook}</div>
              <div className="text-slate-500 text-[10px]">Logbook</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-base font-bold text-emerald-600">{stats.mutabaah}</div>
              <div className="text-slate-500 text-[10px]">Mutabaah</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {confirmReset ? (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-2">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Yakin ingin mengosongkan semua data presensi, izin, dan catatan di Google Sheet?
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
                  className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  {isResetting ? "Mereset..." : "Ya, Kosongkan Semua"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isKoordinator && onInjectMaster && (
                <button
                  onClick={handleExecuteInject}
                  disabled={isInjecting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isInjecting ? "Menginjeksi Data Master..." : "Inject / Pulihkan Master Musyrif & Pamong Resmi"}</span>
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(true)}
                  className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                >
                  Reset Bersih Data
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold text-xs transition-colors"
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
