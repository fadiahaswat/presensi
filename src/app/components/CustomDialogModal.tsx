import React, { useState, useEffect } from "react";
import {
  appDialog,
  DialogOptions,
  ToastUndoOptions,
  DialogType
} from "../utils/customDialog";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  HelpCircle,
  RotateCcw,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalContentVariants } from "../utils/animations";

interface ActiveDialogState extends DialogOptions {
  id: string;
  resolve: (val: any) => void;
}

interface ActiveToastState extends ToastUndoOptions {
  id: string;
}

export function CustomDialogModal() {
  const [activeDialog, setActiveDialog] = useState<ActiveDialogState | null>(null);
  const [activeToast, setActiveToast] = useState<ActiveToastState | null>(null);
  const [promptInput, setPromptInput] = useState<string>("");

  useEffect(() => {
    const unsubDialog = appDialog.subscribeDialog((d) => {
      setActiveDialog(d);
      if (d?.isPrompt) {
        setPromptInput(d.promptDefaultValue || "");
      }
    });

    const unsubToast = appDialog.subscribeToastUndo((t) => {
      setActiveToast(t);
    });

    return () => {
      unsubDialog();
      unsubToast();
    };
  }, []);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeDialog) return;

      if (e.key === "Escape") {
        if (activeDialog.isConfirm) {
          activeDialog.resolve(activeDialog.isPrompt ? null : false);
        } else {
          activeDialog.resolve(undefined);
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (activeDialog.isPrompt) {
          activeDialog.resolve(promptInput);
        } else if (activeDialog.isConfirm) {
          activeDialog.resolve(true);
        } else {
          activeDialog.resolve(undefined);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, promptInput]);

  const getIcon = (type?: DialogType, isConfirm?: boolean) => {
    switch (type) {
      case "danger":
        return <XCircle className="w-8 h-8 text-rose-500" />;
      case "warning":
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="w-8 h-8 text-[#10B981]" />;
      case "info":
      default:
        return isConfirm ? (
          <HelpCircle className="w-8 h-8 text-[#0C81E4] dark:text-sky-400" />
        ) : (
          <Info className="w-8 h-8 text-[#0C81E4] dark:text-sky-400" />
        );
    }
  };

  const getHeaderBg = (type?: DialogType) => {
    switch (type) {
      case "danger":
        return "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200";
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200";
      case "info":
      default:
        return "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50 text-[#0C4E8C] dark:text-sky-200";
    }
  };

  const getConfirmBtnColor = (type?: DialogType) => {
    switch (type) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20";
      case "info":
      default:
        return "bg-[#0C81E4] hover:bg-[#0C4E8C] text-white shadow-sky-600/20";
    }
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL DIALOG (ALERT / CONFIRM / PROMPT)
          ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeDialog && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              variants={modalBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                // Prevent closing on backdrop click for safety unless user clicks explicit button
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 flex flex-col"
            >
              {/* Header with Icon */}
              <div className={`p-5 flex items-start gap-3.5 border-b ${getHeaderBg(activeDialog.type)}`}>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 shadow-sm shrink-0">
                  {getIcon(activeDialog.type, activeDialog.isConfirm)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="font-bold text-base md:text-lg leading-snug">
                    {activeDialog.title || (activeDialog.isConfirm ? "Konfirmasi" : "Informasi")}
                  </h3>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="text-zinc-700 dark:text-zinc-300 text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {activeDialog.message}
                </div>

                {/* Optional Prompt Input */}
                {activeDialog.isPrompt && (
                  <div className="mt-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder={activeDialog.promptPlaceholder || "Ketik di sini..."}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C81E4]"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                {activeDialog.isConfirm && (
                  <button
                    type="button"
                    onClick={() => activeDialog.resolve(activeDialog.isPrompt ? null : false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm active:scale-95"
                  >
                    {activeDialog.cancelText || "Batal"}
                  </button>
                )}

                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    if (activeDialog.isPrompt) {
                      activeDialog.resolve(promptInput);
                    } else if (activeDialog.isConfirm) {
                      activeDialog.resolve(true);
                    } else {
                      activeDialog.resolve(undefined);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center justify-center ${getConfirmBtnColor(
                    activeDialog.type
                  )}`}
                >
                  {activeDialog.confirmText || (activeDialog.isConfirm ? "Ya, Lanjutkan" : "Mengerti")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          UNDO TOAST BAR (SAFETY NET FOR QUICK ACCIDENTAL ACTIONS)
          ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99998] w-11/12 max-w-md bg-zinc-900/95 dark:bg-zinc-800/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-zinc-700/50 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <RotateCcw className="w-4 h-4 animate-spin-reverse" />
              </div>
              <p className="text-xs md:text-sm font-medium text-zinc-100 line-clamp-2">
                {activeToast.message}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  activeToast.onUndo();
                  appDialog.hideUndoToast();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs md:text-sm font-bold shadow-md transition-transform active:scale-95"
              >
                {activeToast.undoLabel || "Batalkan"}
              </button>

              <button
                type="button"
                onClick={() => appDialog.hideUndoToast()}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
