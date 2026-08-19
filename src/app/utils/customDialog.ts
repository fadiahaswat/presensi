import React from "react";

export type DialogType = "info" | "success" | "warning" | "danger";

export interface DialogOptions {
  title?: string;
  message: string | React.ReactNode;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
}

export interface ToastUndoOptions {
  message: string;
  undoLabel?: string;
  durationMs?: number;
  onUndo: () => void;
}

type DialogListener = (dialog: (DialogOptions & { id: string; resolve: (val: any) => void }) | null) => void;
type ToastUndoListener = (toast: (ToastUndoOptions & { id: string }) | null) => void;

class CustomDialogManager {
  private dialogListener: DialogListener | null = null;
  private toastUndoListener: ToastUndoListener | null = null;
  private toastTimer: any = null;

  public subscribeDialog(listener: DialogListener) {
    this.dialogListener = listener;
    return () => {
      if (this.dialogListener === listener) {
        this.dialogListener = null;
      }
    };
  }

  public subscribeToastUndo(listener: ToastUndoListener) {
    this.toastUndoListener = listener;
    return () => {
      if (this.toastUndoListener === listener) {
        this.toastUndoListener = null;
      }
    };
  }

  public alert(message: string | React.ReactNode, title = "Informasi", type: DialogType = "info", confirmText = "Mengerti"): Promise<void> {
    return new Promise((resolve) => {
      if (!this.dialogListener) {
        // Fallback if not mounted yet
        window.alert(typeof message === "string" ? message : title);
        resolve();
        return;
      }
      this.dialogListener({
        id: Math.random().toString(),
        title,
        message,
        type,
        confirmText,
        isConfirm: false,
        resolve: () => {
          if (this.dialogListener) this.dialogListener(null);
          resolve();
        },
      });
    });
  }

  public confirm(
    message: string | React.ReactNode,
    title = "Konfirmasi Tindakan",
    options?: {
      type?: DialogType;
      confirmText?: string;
      cancelText?: string;
    }
  ): Promise<boolean> {
    const {
      type = "warning",
      confirmText = "Ya, Lanjutkan",
      cancelText = "Batal",
    } = options || {};

    return new Promise((resolve) => {
      if (!this.dialogListener) {
        // Fallback if not mounted yet
        const res = window.confirm(typeof message === "string" ? message : title);
        resolve(res);
        return;
      }
      this.dialogListener({
        id: Math.random().toString(),
        title,
        message,
        type,
        confirmText,
        cancelText,
        isConfirm: true,
        resolve: (val: boolean) => {
          if (this.dialogListener) this.dialogListener(null);
          resolve(Boolean(val));
        },
      });
    });
  }

  public prompt(
    message: string,
    title = "Input Data",
    defaultValue = "",
    placeholder = ""
  ): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.dialogListener) {
        const res = window.prompt(message, defaultValue);
        resolve(res);
        return;
      }
      this.dialogListener({
        id: Math.random().toString(),
        title,
        message,
        type: "info",
        confirmText: "Simpan",
        cancelText: "Batal",
        isConfirm: true,
        isPrompt: true,
        promptDefaultValue: defaultValue,
        promptPlaceholder: placeholder,
        resolve: (val: string | null) => {
          if (this.dialogListener) this.dialogListener(null);
          resolve(val);
        },
      });
    });
  }

  public showUndoToast(options: ToastUndoOptions) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    const duration = options.durationMs || 5000;
    const toastId = Math.random().toString();

    if (this.toastUndoListener) {
      this.toastUndoListener({
        ...options,
        id: toastId,
      });

      this.toastTimer = setTimeout(() => {
        if (this.toastUndoListener) {
          this.toastUndoListener(null);
        }
      }, duration);
    }
  }

  public hideUndoToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (this.toastUndoListener) {
      this.toastUndoListener(null);
    }
  }
}

export const appDialog = new CustomDialogManager();

// Convenient direct helpers
export const appAlert = (
  message: string | React.ReactNode,
  title = "Informasi",
  type: DialogType = "info",
  confirmText = "Mengerti"
) => appDialog.alert(message, title, type, confirmText);

export const appConfirm = (
  message: string | React.ReactNode,
  title = "Konfirmasi Tindakan",
  options?: {
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
  }
) => appDialog.confirm(message, title, options);

export const appPrompt = (
  message: string,
  title = "Input Data",
  defaultValue = "",
  placeholder = ""
) => appDialog.prompt(message, title, defaultValue, placeholder);

export const appUndoToast = (
  message: string,
  onUndo: () => void,
  undoLabel = "Batalkan",
  durationMs = 5000
) => appDialog.showUndoToast({ message, onUndo, undoLabel, durationMs });
