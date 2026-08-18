import React, { useState } from "react";
import { X, Send, Copy, Check, MessageSquare, Building2, Calendar, FileText, ChevronLeft, Sun, Moon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "motion/react";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";

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
  authUser?: any;
}

export function WhatsAppShareModal({ onClose, musyrifList, records, asramaList, authUser }: WhatsAppShareModalProps) {
  const isScopedRole = authUser?.role === "pamong" || authUser?.role === "koordinator_gedung";
  const userAsramaWa = authUser?.asrama || "all";

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedAsrama, setSelectedAsrama] = useState<string>(isScopedRole && authUser?.asrama ? authUser.asrama : "all");
  const [selectedPrayer, setSelectedPrayer] = useState<"all" | "subuh" | "maghrib">("all");
  const [reportType, setReportType] = useState<"lengkap" | "alfa_only" | "ringkas">("lengkap");
  const [copied, setCopied] = useState<boolean>(false);

  const formattedDate = format(parseISO(selectedDate || format(new Date(), "yyyy-MM-dd")), "EEEE, dd MMMM yyyy", { locale: id });

  // Generate Message
  const generateMessage = () => {
    const filteredMusyrif = musyrifList.filter(m => 
      selectedAsrama === "all" ? true : m.asrama === selectedAsrama
    );

    let text = `*LAPORAN PRESENSI MUSYRIF MADRASAH MU'ALLIMIN*\n`;
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
        text += `*SHALAT SUBUH*\n`;
        text += `• Total Musyrif: ${total}\n`;
        text += `• Hadir: ${totalHadirSubuh} (${Math.round((totalHadirSubuh / (total || 1)) * 100)}%)\n`;
        text += `• Izin: ${totalIzinSubuh}\n`;
        text += `• Sakit: ${totalSakitSubuh}\n`;
        text += `• Tanpa Keterangan / Belum: ${totalAlfaSubuh}\n\n`;
      }

      if (selectedPrayer === "all" || selectedPrayer === "maghrib") {
        text += `*SHALAT MAGHRIB*\n`;
        text += `• Total Musyrif: ${total}\n`;
        text += `• Hadir: ${totalHadirMaghrib} (${Math.round((totalHadirMaghrib / (total || 1)) * 100)}%)\n`;
        text += `• Izin: ${totalIzinMaghrib}\n`;
        text += `• Sakit: ${totalSakitMaghrib}\n`;
        text += `• Tanpa Keterangan / Belum: ${totalAlfaMaghrib}\n\n`;
      }
    } else if (reportType === "alfa_only") {
      const alfaSubuh: string[] = [];
      const alfaMaghrib: string[] = [];

      filteredMusyrif.forEach(m => {
        const key = `${m.id}_${selectedDate}`;
        const rec = records[key];
        if (!rec?.subuh || rec?.subuh === "alfa") {
          alfaSubuh.push(`${m.name} (${m.asrama} - Kmr ${m.kamar})`);
        }
        if (!rec?.maghrib || rec?.maghrib === "alfa") {
          alfaMaghrib.push(`${m.name} (${m.asrama} - Kmr ${m.kamar})`);
        }
      });

      if (selectedPrayer === "all" || selectedPrayer === "subuh") {
        text += `*CATATAN SUBUH (BELUM / ALFA):*\n`;
        if (alfaSubuh.length === 0) {
          text += `Alhamdulillah seluruh musyrif hadir Subuh.\n\n`;
        } else {
          alfaSubuh.forEach((name, i) => {
            text += `${i + 1}. ${name}\n`;
          });
          text += `\n`;
        }
      }

      if (selectedPrayer === "all" || selectedPrayer === "maghrib") {
        text += `*CATATAN MAGHRIB (BELUM / ALFA):*\n`;
        if (alfaMaghrib.length === 0) {
          text += `Alhamdulillah seluruh musyrif hadir Maghrib.\n\n`;
        } else {
          alfaMaghrib.forEach((name, i) => {
            text += `${i + 1}. ${name}\n`;
          });
          text += `\n`;
        }
      }
    } else {
      // Format Lengkap
      let subuhText = `*RINCIAN PRESENSI SUBUH:*\n`;
      let maghribText = `*RINCIAN PRESENSI MAGHRIB:*\n`;

      filteredMusyrif.forEach((m, idx) => {
        const key = `${m.id}_${selectedDate}`;
        const rec = records[key];

        const sSubuh = rec?.subuh === "hadir" ? "[HADIR]" :
                       rec?.subuh === "izin"  ? `[IZIN: ${rec.subuhNote || "Izin"}]` :
                       rec?.subuh === "sakit" ? `[SAKIT: ${rec.subuhNote || "Sakit"}]` : "[ALFA]";

        const sMaghrib = rec?.maghrib === "hadir" ? "[HADIR]" :
                         rec?.maghrib === "izin"  ? `[IZIN: ${rec.maghribNote || "Izin"}]` :
                         rec?.maghrib === "sakit" ? `[SAKIT: ${rec.maghribNote || "Sakit"}]` : "[ALFA]";

        subuhText += `${idx + 1}. ${m.name} (${m.asrama}) -> ${sSubuh}\n`;
        maghribText += `${idx + 1}. ${m.name} (${m.asrama}) -> ${sMaghrib}\n`;
      });

      if (selectedPrayer === "all" || selectedPrayer === "subuh") {
        text += subuhText + `\n`;
      }
      if (selectedPrayer === "all" || selectedPrayer === "maghrib") {
        text += maghribText + `\n`;
      }
    }

    text += `_Disampaikan melalui SIM Presensi Musyrif Mu'allimin_`;
    return text;
  };

  const message = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    triggerHaptic("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = () => {
    triggerHaptic("medium");
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4" 
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={onClose}
    >
      <motion.div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80" 
        variants={modalContentVariants}
        onClick={e=>e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Generator Rekap WhatsApp</h3>
              <p className="text-xs text-emerald-100/80">Kirim laporan presensi resmi langsung ke grup WA Pamong</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { triggerHaptic("light"); onClose(); }}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/70 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Rekap
              </label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Asrama
              </label>
              <select
                value={selectedAsrama}
                onChange={(e) => setSelectedAsrama(e.target.value)}
                disabled={isScopedRole}
                className={`w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${isScopedRole ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {!isScopedRole && <option value="all">Semua Asrama ({asramaList.length})</option>}
                {asramaList.map(a => (
                  <option key={a} value={a}>Asrama {a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Waktu Shalat</label>
              <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("all")}
                  className={`flex-1 py-1 rounded-lg transition-all active:scale-95 ${selectedPrayer === "all" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("subuh")}
                  className={`flex-1 py-1 rounded-lg transition-all active:scale-95 ${selectedPrayer === "subuh" ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Subuh
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrayer("maghrib")}
                  className={`flex-1 py-1 rounded-lg transition-all active:scale-95 ${selectedPrayer === "maghrib" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Maghrib
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Tipe Format Laporan
              </label>
              <select
                value={reportType}
                onChange={(e: any) => setReportType(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="lengkap">Format Lengkap Per-Musyrif</option>
                <option value="alfa_only">Hanya Yang Tanpa Keterangan (Alfa)</option>
                <option value="ringkas">Ringkasan Statistik Persentase (%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          <label className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider block">
            Pratinjau Pesan WhatsApp
          </label>
          <pre className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-2xl whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto select-all">
            {message}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
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
            type="button"
            onClick={handleSendWA}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Kirim ke WhatsApp</span>
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
