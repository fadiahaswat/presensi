import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  RefreshCw, 
  WifiOff, 
  AlertCircle 
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
          title="Mode Offline (Perubahan tersimpan lokal dan akan sinkron saat online)"
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
