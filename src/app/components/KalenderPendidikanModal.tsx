import React from "react";
import { X } from "lucide-react";
import { PageKalenderPendidikan } from "./PageKalenderPendidikan";

interface KalenderPendidikanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userRole?: string | null;
}

export const KalenderPendidikanModal: React.FC<KalenderPendidikanModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userRole,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-6xl h-[94vh] rounded-3xl sm:rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Kalender Pendidikan & Countdown Perpulangan Santri TA 2026/2027
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <PageKalenderPendidikan
            onBack={onClose}
            userEmail={userEmail}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
};
