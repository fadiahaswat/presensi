import React, { useState, useEffect } from "react";
import {
  Cloud,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Camera,
  Upload
} from "lucide-react";
import { googleSyncService, SyncState } from "../utils/googleSyncService";
import { photoUploadQueue } from "../utils/photoUploadQueue";

export const CloudSyncBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleSyncService.getState());
  const [pendingPhotoCount, setPendingPhotoCount] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const unsubSync = googleSyncService.subscribe((state) => {
      setSyncState(state);
    });

    const unsubPhotos = photoUploadQueue.subscribe((photos) => {
      setPendingPhotoCount(photos.length);
      setIsUploadingPhoto(photos.some(p => p.status === "uploading"));
    });

    return () => {
      unsubSync();
      unsubPhotos();
    };
  }, []);

  // Show photo upload indicator if there are pending photos
  const hasPendingPhotos = pendingPhotoCount > 0;

  // Photo upload in progress indicator (always visible when photos are uploading)
  const PhotoUploadIndicator = () => {
    if (!hasPendingPhotos && !isUploadingPhoto) return null;

    return (
      <span
        onClick={() => photoUploadQueue.processQueue()}
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md hover:bg-orange-600 transition-all active:scale-95 cursor-pointer"
        title={isUploadingPhoto ? "Mengunggah foto ke cloud..." : `${pendingPhotoCount} foto sedang diupload`}
      >
        {isUploadingPhoto ? (
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <Upload className="w-2.5 h-2.5" />
        )}
      </span>
    );
  };

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
          <PhotoUploadIndicator />
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
          <PhotoUploadIndicator />
        </button>
      );
    case "offline":
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-8 h-8 rounded-full relative bg-slate-100/90 backdrop-blur-xl border border-slate-200/80 text-slate-600 shadow-xs flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95 select-none"
          title={hasPendingPhotos ? `Mode Offline. ${pendingPhotoCount} foto menunggu upload...` : "Mode Offline (Perubahan tersimpan lokal dan akan sinkron saat online)"}
        >
          <WifiOff className="w-4 h-4 shrink-0 text-slate-500" />
          <PhotoUploadIndicator />
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
          <PhotoUploadIndicator />
        </button>
      );
    case "synced":
    default:
      // Show photo-specific state when data sync is done but photos are still uploading
      if (hasPendingPhotos) {
        return (
          <button
            type="button"
            onClick={onClick}
            className="w-8 h-8 rounded-full relative bg-orange-50/90 backdrop-blur-xl border border-orange-200/80 text-orange-600 shadow-xs flex items-center justify-center hover:bg-orange-100 transition-all active:scale-95 select-none"
            title={`${pendingPhotoCount} foto sedang diupload ke cloud (Background upload)`}
          >
            <Camera className="w-4 h-4 shrink-0 text-orange-600" />
            <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-orange-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
              {pendingPhotoCount}
            </span>
            <PhotoUploadIndicator />
          </button>
        );
      }
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
