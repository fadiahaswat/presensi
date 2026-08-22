import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  X,
  Zap,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Send
} from "lucide-react";
import { googleSyncService, SyncState } from "../utils/googleSyncService";
import { triggerHaptic } from "../utils/animations";

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
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-sky-50/90 backdrop-blur-xl border border-sky-200/80 text-sky-600 shadow-xs flex items-center justify-center hover:bg-sky-100 transition-all active:scale-95 select-none"
          title="Menyimpan dan menyinkronkan data ke Google Sheet / Database..."
        >
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
        </button>
      );
    case "pending":
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-amber-50/90 backdrop-blur-xl border border-amber-200/80 text-amber-700 shadow-xs flex items-center justify-center hover:bg-amber-100 transition-all active:scale-95 select-none"
          title={`${syncState.pendingCount} data sedang antre proses kirim ke Google Sheet`}
        >
          <Cloud className="w-4 h-4 shrink-0 text-amber-700" />
          <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
            {syncState.pendingCount}
          </span>
        </button>
      );
    case "offline":
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-slate-100/90 backdrop-blur-xl border border-slate-200/80 text-slate-600 shadow-xs flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95 select-none"
          title="Mode Offline — Data tersimpan aman di perangkat dan otomatis terkirim saat online"
        >
          <WifiOff className="w-4 h-4 shrink-0 text-slate-500" />
        </button>
      );
    case "error":
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-rose-50/90 backdrop-blur-xl border border-rose-200/80 text-rose-600 shadow-xs flex items-center justify-center hover:bg-rose-100 transition-all active:scale-95 select-none"
          title={syncState.errorMessage || "Gagal sinkron — Klik untuk coba lagi"}
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
        </button>
      );
    case "synced":
    default:
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 shadow-xs flex items-center justify-center transition-all active:scale-95 select-none"
          title="Data tersimpan aman & realtime di Database Google Sheet"
        >
          <Cloud className="w-4 h-4 shrink-0 text-emerald-600" />
        </button>
      );
  }
};

export const CloudSyncModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onResetAll?: () => Promise<void>;
  onInjectMaster?: () => Promise<void> | void;
  isKoordinator?: boolean;
  isDbAdmin?: boolean;
  stats: {
    records: number;
    izin: number;
    kegiatan: number;
    logbook: number;
    mutabaah: number;
    santriSakit: number;
    musyrif: number;
  };
}> = ({ isOpen, onClose, onResetAll, onInjectMaster, isKoordinator, isDbAdmin = false, stats }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleSyncService.getState());
  const [isResetting, setIsResetting] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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

  const isSynced = syncState.status === "synced";
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
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Sinkronisasi Otomatis Google Sheets</span>
              </p>
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

        {/* Data Stats Grid */}
        <div className="space-y-2">
          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Total Data Aktif Terkelola
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
              {(isKoordinator || isDbAdmin) && onInjectMaster && (
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
                {(isKoordinator || isDbAdmin) && (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Reset Bersih
                  </button>
                )}
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
