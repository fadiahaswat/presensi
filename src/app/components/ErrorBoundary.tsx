import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Copy, Check, MessageCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error in React tree:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(() => {});
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private getFormattedErrorText = () => {
    const errName = this.state.error?.name || "Error";
    const errMessage = this.state.error?.message || "Terjadi kendala tidak terduga";
    const errStack = this.state.error?.stack || "";
    const componentStack = this.state.errorInfo?.componentStack || "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    const time = new Date().toLocaleString("id-ID");

    return `*LAPORAN KENDALA APLIKASI PRESENSI*\n` +
      `📅 Waktu: ${time}\n` +
      `🌐 URL: ${url}\n\n` +
      `⚠️ *Pesan Error:*\n${errName}: ${errMessage}\n\n` +
      `📌 *Stack Trace:*\n${errStack.slice(0, 500)}${errStack.length > 500 ? '...' : ''}\n\n` +
      `🧩 *Component Stack:*\n${componentStack.slice(0, 300)}`;
  };

  private handleCopyError = () => {
    const text = this.getFormattedErrorText();
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {
      alert("Gagal menyalin teks error.");
    });
  };

  private handleSendToWaIT = () => {
    const text = this.getFormattedErrorText();
    const itPhoneNumber = "6285339213109";
    const waUrl = `https://wa.me/${itPhoneNumber}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-slate-800">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sistem mendeteksi kendala pada pemuatan antarmuka. Anda dapat melaporkan kendala ini langsung ke tim IT atau memuat ulang halaman.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-100 rounded-2xl p-3 text-left font-mono text-[11px] text-rose-700 max-h-36 overflow-y-auto border border-slate-200/80 space-y-1">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <p className="text-[10px] text-slate-500 whitespace-pre-wrap break-all">{this.state.error.stack.split('\n').slice(0, 4).join('\n')}</p>
                )}
              </div>
            )}

            {/* Tombol Copy & Kirim WA IT */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Salin Error</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={this.handleSendToWaIT}
                className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white/20" />
                <span>Kirim ke WA IT</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-2xl shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-medium text-xs rounded-2xl border border-slate-200 active:scale-95 transition-all"
              >
                Segarkan Cache & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
