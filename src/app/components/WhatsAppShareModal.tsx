import React, { useState } from "react";
import { X, Send, Copy, Check, MessageSquare, Building2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Musyrif {
  id: string;
  name: string;
  kelas: string;
  tingkat: string;
  asrama: string;
  kamar: string;
  pamong?: string;
  phone?: string;
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
  subuhNote?: string;
  maghribNote?: string;
  markedBy?: string;
}

interface WhatsAppShareModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
  asramaList: string[];
}

export function WhatsAppShareModal({ onClose, musyrifList, records, asramaList }: WhatsAppShareModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedAsrama, setSelectedAsrama] = useState<string>("all");
  const [selectedPrayer, setSelectedPrayer] = useState<"all" | "subuh" | "maghrib">("all");
  const [reportType, setReportType] = useState<"lengkap" | "alfa_only" | "ringkas">("lengkap");
  const [copied, setCopied] = useState<boolean>(false);

  const formattedDate = format(new Date(selectedDate), "EEEE, dd MMMM yyyy", { locale: id });

  // Generate Message
  const generateMessage = () => {
    const filteredMusyrif = musyrifList.filter(m => 
      selectedAsrama === "all" ? true : m.asrama === selectedAsrama
    );

    let text = `*📋 REKAP PRESENSI MUSYRIF MADRASAH MU'ALLIMIN*\n`;
    text += `*Tanggal:* ${formattedDate}\n`;
    text += `*Asrama:* ${selectedAsrama === "all" ? "Semua Asrama" : `Asrama ${selectedAsrama}`}\n`;
    text += `*Waktu Shalat:* ${selectedPrayer === "all" ? "Subuh & Maghrib" : selectedPrayer.toUpperCase()}\n`;
    text += `───────────────────────\n\n`;

    if (reportType === "ringkas") {
      let totalHadirSubuh = 0, totalIzinSubuh = 0, totalSakitSubuh = 0, totalAlfaSubuh = 0;
      let totalHadirMaghrib = 0, totalIzinMaghrib = 0, totalSakitMaghrib = 0, totalAlfaMaghrib = 0;

      filteredMusyrif.forEach(m => {
        const key = `${m.id}_${selectedDate}`;
        const rec = records[key];
        if (rec?.subuh === "hadir") totalHadirSubuh++;
        else if (rec?.subuh === "izin") totalIzinSubuh++;
        else if (rec?.subuh === "sakit") totalSakitSubuh++;
        else totalAlfaSubuh++;

        if (rec?.maghrib === "hadir") totalHadirMaghrib++;
        else if (rec?.maghrib === "izin") totalIzinMaghrib++;
        else if (rec?.maghrib === "sakit") totalSakitMaghrib++;
        else totalAlfaMaghrib++;
      });

      const total = filteredMusyrif.length;
      if (selectedPrayer === "all" || selectedPrayer === "subuh") {
        text += `*🌅 SHALAT SUBUH*\n`;
        text += `• Total Musyrif: ${total}\n`;
        text += `• ✅ Hadir: ${totalHadirSubuh} (${Math.round((totalHadirSubuh / (total || 1)) * 100)}%)\n`;
        text += `• 📝 Izin: ${totalIzinSubuh}\n`;
        text += `• 🏥 Sakit: ${totalSakitSubuh}\n`;
        text += `• ❌ Belum/Alfa: ${totalAlfaSubuh}\n\n`;
      }

      if (selectedPrayer === "all" || selectedPrayer === "maghrib") {
        text += `*🌇 SHALAT MAGHRIB*\n`;
        text += `• Total Musyrif: ${total}\n`;
        text += `• ✅ Hadir: ${totalHadirMaghrib} (${Math.round((totalHadirMaghrib / (total || 1)) * 100)}%)\n`;
        text += `• 📝 Izin: ${totalIzinMaghrib}\n`;
        text += `• 🏥 Sakit: ${totalSakitMaghrib}\n`;
        text += `• ❌ Belum/Alfa: ${totalAlfaMaghrib}\n\n`;
      }
    } else if (reportType === "alfa_only") {
      const alfaSubuh: string[] = [];
      const alfaMaghrib: string[] = [];

      filteredMusyrif.forEach(m => {
        const key = `${m.id}_${selectedDate}`;
        const rec = records[key];
        if (!rec?.subuh || rec?.subuh === "alfa") {
          alfaSubuh.push(`${m.name} (${m.asrama} - ${m.kamar})`);
        }
        if (!rec?.maghrib || rec?.maghrib === "alfa") {
          alfaMaghrib.push(`${m.name} (${m.asrama} - ${m.kamar})`);
        }
      });

      text += `*⚠️ DAFTAR MUSYRIF TIDAK HADIR / BELUM PRESENSI:*\n\n`;

      if (selectedPrayer === "all" || selectedPrayer === "subuh") {
        text += `*🌅 Subuh (${alfaSubuh.length} Orang):*\n`;
        if (alfaSubuh.length === 0) text += `_Nihil (Semua hadir/berhalangan resmi)_\n`;
        else {
          alfaSubuh.forEach((name, idx) => {
            text += `${idx + 1}. ${name}\n`;
          });
        }
        text += `\n`;
      }

      if (selectedPrayer === "all" || selectedPrayer === "maghrib") {
        text += `*🌇 Maghrib (${alfaMaghrib.length} Orang):*\n`;
        if (alfaMaghrib.length === 0) text += `_Nihil (Semua hadir/berhalangan resmi)_\n`;
        else {
          alfaMaghrib.forEach((name, idx) => {
            text += `${idx + 1}. ${name}\n`;
          });
        }
        text += `\n`;
      }
    } else {
      // Lengkap
      const asramaGroup = selectedAsrama === "all" 
        ? asramaList 
        : [selectedAsrama];

      asramaGroup.forEach(asr => {
        const musyrifInAsr = musyrifList.filter(m => m.asrama === asr);
        if (musyrifInAsr.length === 0) return;

        text += `*🏢 ASRAMA ${asr.toUpperCase()}*\n`;
        musyrifInAsr.forEach((m, idx) => {
          const key = `${m.id}_${selectedDate}`;
          const rec = records[key];

          const statusIcon = (s?: string) => {
            if (s === "hadir") return "✅";
            if (s === "izin") return "📝";
            if (s === "sakit") return "🏥";
            return "❌";
          };

          const sSubuh = statusIcon(rec?.subuh);
          const sMaghrib = statusIcon(rec?.maghrib);

          if (selectedPrayer === "all") {
            text += `${idx + 1}. ${m.name} | Subuh: ${sSubuh} | Maghrib: ${sMaghrib}\n`;
          } else if (selectedPrayer === "subuh") {
            const note = rec?.subuhNote ? ` (${rec.subuhNote})` : "";
            text += `${idx + 1}. ${m.name} | ${sSubuh} ${rec?.subuh?.toUpperCase() ?? "ALFA"}${note}\n`;
          } else {
            const note = rec?.maghribNote ? ` (${rec.maghribNote})` : "";
            text += `${idx + 1}. ${m.name} | ${sMaghrib} ${rec?.maghrib?.toUpperCase() ?? "ALFA"}${note}\n`;
          }
        });
        text += `\n`;
      });
    }

    text += `───────────────────────\n`;
    text += `_Disampaikan otomatis via Aplikasi Presensi Musyrif Mu'allimin_`;
    return text;
  };

  const message = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Generator Rekap WhatsApp</h3>
              <p className="text-[11px] text-emerald-100/80">Kirim laporan presensi resmi langsung ke grup WA Pamong</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/70 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" /> Tanggal Rekap
              </label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" /> Asrama
              </label>
              <select
                value={selectedAsrama}
                onChange={(e) => setSelectedAsrama(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">Semua Asrama ({asramaList.length})</option>
                {asramaList.map(a => (
                  <option key={a} value={a}>Asrama {a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Waktu Shalat</label>
              <div className="flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("all")}
                  className={`flex-1 py-1 rounded-lg transition-all ${selectedPrayer === "all" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500"}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("subuh")}
                  className={`flex-1 py-1 rounded-lg transition-all ${selectedPrayer === "subuh" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-500"}`}
                >
                  Subuh
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("maghrib")}
                  className={`flex-1 py-1 rounded-lg transition-all ${selectedPrayer === "maghrib" ? "bg-white text-teal-800 shadow-2xs" : "text-slate-500"}`}
                >
                  Maghrib
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-600" /> Tipe Laporan
              </label>
              <select
                value={reportType}
                onChange={(e: any) => setReportType(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="lengkap">📋 Format Lengkap</option>
                <option value="alfa_only">⚠️ Hanya Yang Tidak Hadir (Alfa)</option>
                <option value="ringkas">📊 Ringkasan Statistik %</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          <label className="text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider block">
            Pratinjau Pesan WhatsApp
          </label>
          <pre className="w-full text-xs bg-emerald-950/5 border border-emerald-900/10 text-slate-800 p-3 rounded-2xl whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto select-all">
            {message}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Salin Teks</span>
              </>
            )}
          </button>

          <button
            onClick={handleSendWA}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Kirim ke WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
}
