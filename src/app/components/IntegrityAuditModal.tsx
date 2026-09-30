import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, Trash2, CheckCircle2, RefreshCw, X, Eye } from "lucide-react";
import { IntegrityViolation } from "../utils/anomalyDetector";

interface IntegrityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: IntegrityViolation[];
  onPurgeAnomalies: () => Promise<void>;
  isPurging?: boolean;
}

export const IntegrityAuditModal: React.FC<IntegrityAuditModalProps> = ({
  isOpen,
  onClose,
  violations,
  onPurgeAnomalies,
  isPurging = false
}) => {
  const [selectedViolation, setSelectedViolation] = useState<IntegrityViolation | null>(null);

  if (!isOpen) return null;

  const totalViolations = violations.reduce((acc, v) => acc + v.jumlahEntri, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Papan Integritas & Deteksi Anomali</h2>
              <p className="text-xs text-rose-100">
                Sistem Audit Anti-Bot, Anti-Injeksi Data, dan Pelanggaran Presensi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Banner */}
        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                {violations.length > 0
                  ? `Terdeteksi ${violations.length} Pelanggaran (${totalViolations} data anomali disuntikkan bot/bypass)`
                  : "Database Bersih: Tidak Ditemukan Anomali Data"}
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Seluruh upaya manipulasi tercatat dan dibatalkan secara otomatis oleh Anti-Bot Shield.
              </p>
            </div>
          </div>
          {violations.length > 0 && (
            <button
              onClick={onPurgeAnomalies}
              disabled={isPurging}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isPurging ? "Membersihkan..." : "Bersihkan Anomali"}
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {violations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-sm">Semua data presensi dan logbook valid dan terverifikasi.</p>
              <p className="text-xs text-slate-400 mt-1">Tidak ada jejak injeksi bot atau bypass ilegal.</p>
            </div>
          ) : (
            violations.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-slate-800/80 shadow-xs hover:border-rose-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.musyrifName}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {item.kategori}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Asrama: <span className="font-medium text-slate-700 dark:text-slate-300">{item.asrama || "-"}</span> | ID Akun: <code className="text-slate-600 dark:text-slate-400">{item.musyrifId}</code>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      ⚠️ {item.detail}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-rose-600">
                      {item.jumlahEntri}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">
                      Entri Palsu
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Waktu Audit: {new Date(item.waktuTerdeteksi).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    ● Tindakan: Dibatalkan & Dibekukan Sistem
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Syamsa Anti-Bot Shield v2.0 • HMAC SHA-256 Enabled</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
