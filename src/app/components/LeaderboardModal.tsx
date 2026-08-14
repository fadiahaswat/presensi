import React, { useState } from "react";
import { 
  X, Trophy, Crown, Flame, Award, Star, 
  Sparkles, Medal, TrendingUp, ShieldCheck, CheckCircle2, User
} from "lucide-react";

interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  photo?: string;
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
}

interface LeaderboardModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
  onSelectMusyrif?: (id: string) => void;
}

export function LeaderboardModal({
  onClose,
  musyrifList,
  records,
  onSelectMusyrif
}: LeaderboardModalProps) {
  const [filterPeriod, setFilterPeriod] = useState<"bulan_ini" | "semua">("bulan_ini");
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");

  // Calculate scores and badges for each musyrif
  const leaderboardData = musyrifList.map(m => {
    let hadirCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alfaCount = 0;
    let subuhCount = 0;
    let maghribCount = 0;

    Object.entries(records).forEach(([key, rec]) => {
      if (rec.musyrifId === m.id) {
        if (rec.subuh === "hadir") { hadirCount++; subuhCount++; }
        else if (rec.subuh === "izin") izinCount++;
        else if (rec.subuh === "sakit") sakitCount++;
        else if (rec.subuh === "alfa") alfaCount++;

        if (rec.maghrib === "hadir") { hadirCount++; maghribCount++; }
        else if (rec.maghrib === "izin") izinCount++;
        else if (rec.maghrib === "sakit") sakitCount++;
        else if (rec.maghrib === "alfa") alfaCount++;
      }
    });

    // Score Calculation: Hadir = +10, Izin = +3, Sakit = +3, Alfa = -10
    const score = Math.max(0, (hadirCount * 10) + (izinCount * 3) + (sakitCount * 3) - (alfaCount * 10));

    // Badges determination
    const badges: { title: string; icon: string; color: string }[] = [];
    if (subuhCount >= 10) {
      badges.push({ title: "Subuh Warrior", icon: "🌅", color: "bg-amber-100 text-amber-800" });
    }
    if (alfaCount === 0 && hadirCount >= 14) {
      badges.push({ title: "100% Istiqomah", icon: "💎", color: "bg-emerald-100 text-emerald-800" });
    }
    if (hadirCount >= 20) {
      badges.push({ title: "Musyrif Teladan", icon: "⭐", color: "bg-purple-100 text-purple-800" });
    }

    return {
      ...m,
      hadirCount,
      izinCount,
      sakitCount,
      alfaCount,
      subuhCount,
      maghribCount,
      score,
      badges
    };
  })
  .filter(m => selectedAsrama === "all" || m.asrama === selectedAsrama)
  .sort((a, b) => b.score - a.score || b.hadirCount - a.hadirCount);

  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-lg">
              🏆
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Papan Peringkat & Musyrif Teladan</h3>
              <p className="text-[11px] text-emerald-100/80">Leaderboard kedisiplinan & apresiasi musyrif berprestasi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Podium Top 3 */}
        <div className="bg-gradient-to-b from-emerald-50/80 to-slate-50 p-5 border-b border-slate-200/80">
          <div className="flex items-end justify-center gap-3 pt-2">
            
            {/* Rank 2 */}
            {top3[1] && (
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-extrabold text-slate-700 shadow-sm relative mb-1">
                  🥈
                  <span className="absolute -bottom-2 bg-slate-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">#2</span>
                </div>
                <div className="font-bold text-xs text-slate-800 truncate max-w-[90px]">{top3[1].name.split(" ")[0]}</div>
                <div className="text-[10px] text-slate-500">Asrama {top3[1].asrama}</div>
                <div className="text-[11px] font-extrabold text-emerald-700 mt-1">{top3[1].score} Poin</div>
              </div>
            )}

            {/* Rank 1 (Champion) */}
            {top3[0] && (
              <div className="flex-1 flex flex-col items-center text-center -translate-y-2">
                <div className="relative mb-1">
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 border-3 border-amber-400 flex items-center justify-center font-extrabold text-amber-800 shadow-md">
                    👑
                  </div>
                  <span className="absolute -top-2 -right-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                    Top 1
                  </span>
                </div>
                <div className="font-black text-xs text-slate-900 truncate max-w-[110px]">{top3[0].name}</div>
                <div className="text-[10px] font-semibold text-emerald-700">Asrama {top3[0].asrama} ({top3[0].kamar})</div>
                <div className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1">
                  {top3[0].score} Poin ⭐
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/60 border-2 border-amber-300/80 flex items-center justify-center font-extrabold text-amber-900 shadow-sm relative mb-1">
                  🥉
                  <span className="absolute -bottom-2 bg-amber-800 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">#3</span>
                </div>
                <div className="font-bold text-xs text-slate-800 truncate max-w-[90px]">{top3[2].name.split(" ")[0]}</div>
                <div className="text-[10px] text-slate-500">Asrama {top3[2].asrama}</div>
                <div className="text-[11px] font-extrabold text-emerald-700 mt-1">{top3[2].score} Poin</div>
              </div>
            )}

          </div>
        </div>

        {/* List of Remaining Leaderboard */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-bold text-slate-700 px-1 pb-1 flex justify-between items-center">
            <span>Daftar Peringkat Musyrif</span>
            <span className="text-[10px] text-slate-400 font-normal">Hadir: +10 pts | Alfa: -10 pts</span>
          </div>

          {leaderboardData.map((m, idx) => (
            <div 
              key={m.id}
              onClick={() => onSelectMusyrif?.(m.id)}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-black text-xs ${
                  idx === 0 ? "text-amber-600" : idx === 1 ? "text-slate-500" : idx === 2 ? "text-amber-700" : "text-slate-400"
                }`}>
                  #{idx + 1}
                </span>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{m.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Asrama {m.asrama} • Kamar {m.kamar} • {m.hadirCount}x Hadir ({m.alfaCount} Alfa)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {m.badges.map(b => (
                  <span key={b.title} title={b.title} className="text-sm">
                    {b.icon}
                  </span>
                ))}
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-xl">
                  {m.score} pts
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Update kalkulasi otomatis berbasis presensi</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
