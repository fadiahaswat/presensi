import React from "react";
import { motion } from "motion/react";
import { Sparkles, RefreshCw } from "lucide-react";
import mualliminLogo from "../muallimin-logo.png";

export function AppSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="min-h-screen bg-background relative flex flex-col justify-between overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Top Header Skeleton */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-200/80 animate-pulse flex items-center justify-center p-1 border border-slate-200">
              <img src={mualliminLogo} alt="Logo" className="w-full h-full object-contain opacity-40 grayscale" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-36 sm:w-48 bg-slate-200/80 rounded-md animate-pulse" />
              <div className="h-3 w-24 sm:w-32 bg-slate-200/60 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 sm:w-28 bg-slate-200/70 rounded-full animate-pulse hidden xs:block" />
            <div className="h-8 w-24 bg-emerald-100/70 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Skeleton Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Syncing Indicator Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
            <div>
              <p className="text-xs font-bold text-emerald-900 leading-tight">Menghubungkan & Menyinkronkan Data</p>
              <p className="text-[11px] text-emerald-700/80">Mengambil database presensi & kepengasuhan terbaru...</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
            Cloud Sync
          </span>
        </div>

        {/* Hero Card Skeleton (Kalender & Waktu Sholat) */}
        <div className="bg-slate-200/70 rounded-3xl p-5 sm:p-6 space-y-4 animate-pulse relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-300 rounded-md" />
              <div className="h-6 w-48 sm:w-64 bg-slate-300 rounded-lg" />
              <div className="h-3.5 w-36 bg-slate-300 rounded-md" />
            </div>
            <div className="h-14 w-full sm:w-36 bg-slate-300/80 rounded-2xl" />
          </div>

          {/* Mini prayer schedule bar */}
          <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-300/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-300/60 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Countdown Perpulangan Card Skeleton */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-slate-200 rounded-md" />
            <div className="h-4 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="w-5 h-5 rounded-full bg-slate-100" />
              </div>
              <div className="h-6 w-14 bg-slate-300 rounded-md" />
            </div>
          ))}
        </div>

        {/* Action Prayer Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Services Grid Skeleton */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/70 shadow-xs space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 rounded-md mb-2" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-slate-50 rounded-2xl flex flex-col items-center justify-center p-2 space-y-2">
                <div className="w-7 h-7 rounded-xl bg-slate-200" />
                <div className="h-2.5 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Nav Skeleton */}
      <nav className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 animate-pulse">
              <div className="w-5 h-5 rounded-lg bg-slate-200" />
              <div className="w-8 h-2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </nav>
    </motion.div>
  );
}
