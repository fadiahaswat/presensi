import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ShieldAlert, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

export type Role = "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif" | "kaur_kis" | "wadir4";

export interface AuthUser { 
  id: string; 
  name: string; 
  email: string; 
  role: Role; 
  asrama?: string; 
  musyrifId?: string; 
  picture?: string; 
  phone?: string; 
}

export interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  pamong?: string;
  email?: string;
  phone?: string;
  photo?: string;
  picture?: string;
  avatar?: string;
  role?: Role;
}

const GOOGLE_CLIENT_ID = "336443539411-b7uv4udqqhbqpdmeuja54dhfsda4q7cm.apps.googleusercontent.com";

function parseJwt(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Gagal membaca Google JWT:", e);
    return null;
  }
}

function matchesEmail(emailField?: string | null, inputEmail?: string | null): boolean {
  if (!emailField || !inputEmail || typeof emailField !== "string" || typeof inputEmail !== "string") return false;
  const target = inputEmail.trim().toLowerCase();
  const list = emailField.toLowerCase().split(/[,;/\s]+/).filter(Boolean);
  return list.includes(target);
}

export interface LoginModalProps {
  onClose: () => void;
  onLogin: (u: AuthUser) => void;
  authUsers?: AuthUser[];
  musyrifList?: Musyrif[];
  musyrifSource?: Musyrif[];
  onInjectMaster?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  onClose, 
  onLogin, 
  authUsers = [], 
  musyrifList = [],
  musyrifSource,
  onInjectMaster,
}) => {
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectDone, setInjectDone] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisInitializedRef = useRef(false);

  const handleInject = () => {
    if (!onInjectMaster || isInjecting) return;
    setIsInjecting(true);
    setInjectDone(false);
    try {
      onInjectMaster();
      setTimeout(() => {
        setIsInjecting(false);
        setInjectDone(true);
        setTimeout(() => setInjectDone(false), 3000);
      }, 1500);
    } catch {
      setIsInjecting(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    wadir4: "Wakil Direktur IV",
    kaur_kis: "Kaur KIS",
    koordinator_musyrif: "Koord. Musyrif",
    pamong: "Pamong Asrama",
    koordinator_gedung: "Koord. Asrama",
    musyrif: "Musyrif Asrama",
  };

  // Whitelist verification handler strictly from Google OAuth JWT
  const handleGoogleCredential = useCallback((inputEmail: string, googlePicture?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const clean = (inputEmail || "").trim().toLowerCase();

    if (!clean) {
      setErrorMsg("Email akun Google tidak terdeteksi.");
      return;
    }

    // 1. Cek authUsers dulu
    const foundAuth = authUsers.find(u => matchesEmail(u.email, clean));
    if (foundAuth) {
      const userToLogin: AuthUser = {
        ...foundAuth,
        picture: googlePicture || foundAuth.picture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundAuth.name} (${ROLE_LABELS[foundAuth.role] || "Pengelola"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    // 2. Cek musyrif list
    const currentList = musyrifSource || musyrifList || [];
    const foundInList = currentList.find(m => matchesEmail(m.email, clean));
    if (foundInList) {
      const assignedRole: Role = (foundInList.role as Role) || "musyrif";
      const userToLogin: AuthUser = {
        id: foundInList.id,
        name: foundInList.name,
        email: clean,
        role: assignedRole,
        asrama: foundInList.asrama,
        musyrifId: foundInList.id,
        picture: googlePicture,
      };
      setSuccessMsg(`Autentikasi Berhasil! Masuk sebagai ${foundInList.name} (${ROLE_LABELS[assignedRole] || "Musyrif"})...`);
      setTimeout(() => {
        onLogin(userToLogin);
        onClose();
      }, 500);
      return;
    }

    // Rejected - Not in authorized Whitelist
    setErrorMsg(`Akses Ditolak: Akun Google "${inputEmail}" tidak terdaftar dalam database Musyrif maupun Pengelola.`);
  }, [onLogin, onClose, authUsers, musyrifList, musyrifSource]);

  // Initialize official Google Identity Services
  useEffect(() => {
    let active = true;
    const initGis = () => {
      try {
        // @ts-ignore
        if (active && typeof window !== "undefined" && window.google?.accounts?.id && googleBtnRef.current && !gisInitializedRef.current) {
          gisInitializedRef.current = true;
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response?.credential) {
                const payload = parseJwt(response.credential);
                if (payload?.email) {
                  handleGoogleCredential(payload.email, payload.picture);
                } else {
                  setErrorMsg("Gagal membaca profil akun Google.");
                }
              }
            },
            auto_select: false,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = "";
            // @ts-ignore
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left",
              width: 280,
            });
            setIsGisLoaded(true);
          }
        }
      } catch (e) {
        console.warn("GSI notice:", e);
      }
    };

    initGis();
    const timer = setInterval(() => {
      // @ts-ignore
      if (window.google?.accounts?.id && !gisInitializedRef.current) {
        initGis();
        clearInterval(timer);
      }
    }, 300);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [handleGoogleCredential]);

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={() => { triggerHaptic("light"); onClose(); }}
    >
      <motion.div 
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              P
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 tracking-tight">Presensi Asrama</h2>
              <p className="text-[10px] text-slate-400">Portal Pamong & Koordinator</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }} 
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-2xs active:scale-90"
          >
            <X className="w-4 h-4 text-slate-500"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 shadow-xs flex items-center justify-center border border-slate-200/80 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          
          <h3 className="text-base font-bold text-slate-800">Masuk Akun Google</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-[260px] leading-relaxed">
            Gunakan akun Google yang terdaftar sebagai Pamong atau Koordinator
          </p>

          {/* Centered Google Button */}
          <div className="w-full flex items-center justify-center min-h-[48px] overflow-visible">
            <div 
              ref={googleBtnRef} 
              className="flex items-center justify-center [&>div]:!mx-auto [&>iframe]:!mx-auto" 
              style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}
            />
          </div>

          {/* Fallback button if GIS script still loading */}
          {!isGisLoaded && (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  try {
                    // @ts-ignore
                    if (window.google?.accounts?.id) {
                      // @ts-ignore
                      window.google.accounts.id.prompt();
                    } else {
                      setErrorMsg("Sedang memuat Google SDK...");
                    }
                  } catch {
                    setErrorMsg("Gagal memanggil Google Login. Silakan coba lagi.");
                  }
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2.5 shadow-sm transition-all text-xs font-semibold mt-1 active:scale-95"
              >
                <span>Login dengan Google</span>
              </button>
            </div>
          )}

          {/* Error Alert with recovery hint */}
          {errorMsg && (
            <div className="w-full mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col gap-1.5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2 text-rose-700">
                <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-rose-600 leading-relaxed font-medium">{errorMsg}</p>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/60 leading-relaxed">
                💡 <b>Petunjuk:</b> Jika email Anda sudah resmi namun belum terdeteksi, silakan klik tombol <b>"Pulihkan Data"</b> di pojok kanan bawah, lalu coba login kembali.
              </p>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="w-full mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-700 text-left animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-emerald-600 leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> Whitelist Terproteksi
          </span>
          {onInjectMaster && (
            <button
              type="button"
              onClick={handleInject}
              disabled={isInjecting}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
              style={{ background: injectDone ? "#d1fae5" : "#f1f5f9", color: injectDone ? "#065f46" : "#475569" }}
            >
              {isInjecting ? (
                <><RefreshCw className="w-3 h-3 animate-spin"/> Memulihkan...</>
              ) : injectDone ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-600"/> Berhasil!</>
              ) : (
                <><RefreshCw className="w-3 h-3"/> Pulihkan Data</>
              )}
            </button>
          )}
        </div>

      </motion.div>
    </motion.div>
  );
};
