import React from "react";
import { AlertTriangle, Compass, RefreshCw, X, Zap, BatteryLow, Smartphone } from "lucide-react";
import { GeofenceResult } from "../utils/geoUtils";

interface GpsTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpsResult: GeofenceResult | null;
  onRetry: () => void;
  isChecking?: boolean;
  onEmergencyPhoto?: () => void;
}

export const GpsTroubleshootModal: React.FC<GpsTroubleshootModalProps> = ({
  isOpen,
  onClose,
  gpsResult,
  onRetry,
  isChecking = false,
  onEmergencyPhoto
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Compass className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Kendala Lokasi GPS Presensi</h3>
              <p className="text-white/80 text-xs">Panduan solusi & kalibrasi lokasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-700 text-xs">
          {/* Status Diagnostik */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Status Saat Ini:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              {gpsResult?.error
                ? gpsResult.error
                : gpsResult?.distanceMeters !== undefined
                ? `Jarak Anda terdeteksi ${gpsResult.distanceMeters} meter dari target (${gpsResult.targetAsrama}).`
                : "Posisi GPS belum terverifikasi di area asrama/kampus."}
              {gpsResult?.accuracyMeters ? ` (Tingkat akurasi GPS HP: ±${gpsResult.accuracyMeters}m)` : ""}
            </p>
          </div>

          {/* Penyebab & Solusi */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">
              💡 Kemungkinan Penyebab & Solusi:
            </h4>
            <div className="space-y-2.5">
              {/* 1. Mode Lokasi Tepat / Precise Location */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">1. Pastikan "Precise Location" (Lokasi Tepat) Aktif</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Di iPhone (Safari) atau Android (Chrome), periksa izin lokasi browser dan pastikan opsi <strong>"Lokasi Tepat" / "Precise"</strong> dalam posisi ON. Jika mati, sistem hanya menerima estimasi sinyal BTS seluler yang melenceng ratusan meter.
                  </p>
                </div>
              </div>

              {/* 2. Mode Hemat Daya / Low Power Mode */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <BatteryLow className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">2. Matikan Mode Hemat Daya (Low Power Mode)</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Mode hemat baterai membatasi refresh antena satelit GPS sehingga koordinat sering "terlempar" ke lokasi lama atau kurang akurat.
                  </p>
                </div>
              </div>

              {/* 3. Terhalang Beton / Sinyal Ruang Tertutup */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">3. Mendekat ke Jendela atau Buka Pintu</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Atap cor atau beton bertulang asrama melemahkan sinyal GPS satelit. Coba mendekat ke jendela, pintu keluar, atau selasar beberapa detik.
                  </p>
                </div>
              </div>

              {/* 4. Tips Pancing Google Maps / Apple Maps */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">4. Pancing Akurasi Lewat Google Maps / Apple Maps</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Buka Google Maps / Apple Maps sebentar sampai titik biru stabil dan lingkaran pendar mengecil, lalu kembali ke aplikasi presensi ini dan klik tombol perbarui.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          {onEmergencyPhoto ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEmergencyPhoto();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span>📷 Presensi Pakai Foto Live</span>
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200/70 transition-colors text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isChecking}
              onClick={() => {
                onRetry();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Mengecek..." : "Cek Ulang GPS"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
