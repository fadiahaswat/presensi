import React, { useState } from "react";
import { 
  X, Printer, Award, FileText, Download, CheckCircle, 
  Crown, Star, ShieldCheck, Calendar, User, Building2
} from "lucide-react";
import mualliminLogo from "../muallimin-logo.png";
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
}

interface AttendanceRecord {
  musyrifId: string;
  date: string;
  subuh?: "hadir" | "sakit" | "izin" | "alfa";
  maghrib?: "hadir" | "sakit" | "izin" | "alfa";
}

interface RaportSertifikatModalProps {
  onClose: () => void;
  musyrifList: Musyrif[];
  records: Record<string, AttendanceRecord>;
}

export function RaportSertifikatModal({
  onClose,
  musyrifList,
  records
}: RaportSertifikatModalProps) {
  const [activeTab, setActiveTab] = useState<"raport" | "sertifikat">("raport");
  const [selectedMusyrifId, setSelectedMusyrifId] = useState<string>(musyrifList[0]?.id || "");
  const [periodName, setPeriodName] = useState<string>("Bulan Berjalan (Agustus 2026)");

  const musyrif = musyrifList.find(m => m.id === selectedMusyrifId) || musyrifList[0];

  // Calculate statistics for this musyrif
  let totalSubuhHadir = 0, totalSubuhIzin = 0, totalSubuhSakit = 0, totalSubuhAlfa = 0;
  let totalMaghribHadir = 0, totalMaghribIzin = 0, totalMaghribSakit = 0, totalMaghribAlfa = 0;

  Object.values(records).forEach(rec => {
    if (rec.musyrifId === musyrif.id) {
      if (rec.subuh === "hadir") totalSubuhHadir++;
      else if (rec.subuh === "izin") totalSubuhIzin++;
      else if (rec.subuh === "sakit") totalSubuhSakit++;
      else if (rec.subuh === "alfa") totalSubuhAlfa++;

      if (rec.maghrib === "hadir") totalMaghribHadir++;
      else if (rec.maghrib === "izin") totalMaghribIzin++;
      else if (rec.maghrib === "sakit") totalMaghribSakit++;
      else if (rec.maghrib === "alfa") totalMaghribAlfa++;
    }
  });

  const totalHadir = totalSubuhHadir + totalMaghribHadir;
  const totalIzin = totalSubuhIzin + totalMaghribIzin;
  const totalSakit = totalSubuhSakit + totalMaghribSakit;
  const totalAlfa = totalSubuhAlfa + totalMaghribAlfa;
  const totalSesi = totalHadir + totalIzin + totalSakit + totalAlfa || 1;

  const hadirPct = Math.round((totalHadir / totalSesi) * 100);
  
  // Grade calculation
  let grade = "A";
  let gradeDesc = "Mumtaz (Sangat Baik / Disiplin Tinggi)";
  if (hadirPct < 60 || totalAlfa > 6) {
    grade = "D";
    gradeDesc = "Dho'if (Perlu Pembinaan Intensif Pamong)";
  } else if (hadirPct < 75 || totalAlfa > 3) {
    grade = "C";
    gradeDesc = "Maqbul (Cukup / Perlu Peningkatan)";
  } else if (hadirPct < 90 || totalAlfa > 0) {
    grade = "B";
    gradeDesc = "Jayyid (Baik)";
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header (No print) */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-lg">
              📜
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Rapor Disiplin & E-Sertifikat</h3>
              <p className="text-[11px] text-emerald-100/80">Laporan evaluasi keasramaan resmi Madrasah Mu'allimin</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Filter Selection (No print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/70 space-y-3 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("raport")}
                className={`py-1.5 px-4 rounded-lg transition-all ${activeTab === "raport" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"}`}
              >
                📊 Rapor Kedisiplinan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sertifikat")}
                className={`py-1.5 px-4 rounded-lg transition-all ${activeTab === "sertifikat" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"}`}
              >
                🏆 E-Sertifikat Musyrif
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Pilih Musyrif</label>
              <select
                value={selectedMusyrifId}
                onChange={(e) => setSelectedMusyrifId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
              >
                {musyrifList.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - Asrama {m.asrama} ({m.kamar})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Periode Evaluasi</label>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Document Render Area (Print-optimized) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          
          {activeTab === "raport" ? (
            /* RAPOR SHEET */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 sm:p-8 max-w-xl w-full text-slate-900 space-y-6">
              
              {/* Official Header */}
              <div className="flex items-center gap-4 border-b-2 border-emerald-800 pb-4">
                <img src={mualliminLogo} alt="Logo" className="w-14 h-14 object-contain" />
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-extrabold text-sm text-emerald-900 tracking-tight leading-tight">
                    MADRASAH MU'ALLIMIN MUHAMMADIYAH YOGYAKARTA
                  </h4>
                  <p className="text-[11px] font-bold text-slate-700">KORPS KEPAMONGAN & KEASRAMAAN</p>
                  <p className="text-[10px] text-slate-500">Jl. Letjen S. Parman No.68, Patangpuluhan, Wirobrajan, Yogyakarta</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-0.5">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  LEMBAR EVALUASI & RAPOR KEDISIPLINAN MUSYRIF
                </h3>
                <p className="text-xs text-slate-500 font-medium">Periode: {periodName}</p>
              </div>

              {/* Musyrif Bio */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 text-[11px]">Nama Musyrif:</span>
                  <p className="font-bold text-slate-900">{musyrif.name}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Asrama / Kamar:</span>
                  <p className="font-bold text-slate-900">Asrama {musyrif.asrama} (Kamar {musyrif.kamar})</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Kelas / Tingkat:</span>
                  <p className="font-bold text-slate-900">{musyrif.kelas} ({musyrif.tingkat})</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Pamong Pembina:</span>
                  <p className="font-bold text-slate-900">{musyrif.pamong || "Ustadz Pamong"}</p>
                </div>
              </div>

              {/* Attendance Table */}
              <div>
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-emerald-800 text-white text-[11px] uppercase">
                    <tr>
                      <th className="p-2">Waktu Ibadah</th>
                      <th className="p-2 text-center">Hadir</th>
                      <th className="p-2 text-center">Izin</th>
                      <th className="p-2 text-center">Sakit</th>
                      <th className="p-2 text-center">Alfa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2 font-semibold text-slate-800">🌅 Shalat Subuh</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">{totalSubuhHadir}</td>
                      <td className="p-2 text-center text-blue-700">{totalSubuhIzin}</td>
                      <td className="p-2 text-center text-amber-700">{totalSubuhSakit}</td>
                      <td className="p-2 text-center text-rose-700 font-bold">{totalSubuhAlfa}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-slate-800">🌇 Shalat Maghrib</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">{totalMaghribHadir}</td>
                      <td className="p-2 text-center text-blue-700">{totalMaghribIzin}</td>
                      <td className="p-2 text-center text-amber-700">{totalMaghribSakit}</td>
                      <td className="p-2 text-center text-rose-700 font-bold">{totalMaghribAlfa}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2 text-slate-900">Total Akumulasi</td>
                      <td className="p-2 text-center text-emerald-800">{totalHadir}</td>
                      <td className="p-2 text-center text-blue-800">{totalIzin}</td>
                      <td className="p-2 text-center text-amber-800">{totalSakit}</td>
                      <td className="p-2 text-center text-rose-800">{totalAlfa}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Predicate Banner */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Nilai Predikat Disiplin</span>
                  <h4 className="text-sm font-extrabold text-slate-900">{gradeDesc}</h4>
                  <p className="text-[11px] text-slate-600">Persentase Kehadiran: {hadirPct}%</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black text-2xl flex items-center justify-center shadow-sm">
                  {grade}
                </div>
              </div>

              {/* Signature section */}
              <div className="pt-6 flex justify-between text-xs text-center">
                <div>
                  <p className="text-slate-500">Musyrif Bersangkutan,</p>
                  <div className="h-14" />
                  <p className="font-bold text-slate-900 underline">{musyrif.name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Yogyakarta, {format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
                  <p className="text-slate-500">Pamong Keasramaan,</p>
                  <div className="h-12" />
                  <p className="font-bold text-slate-900 underline">{musyrif.pamong || "Ustadz Pamong, S.Pd.I."}</p>
                  <p className="text-[10px] text-slate-400">NBM: 1184920</p>
                </div>
              </div>

            </div>
          ) : (
            /* CERTIFICATE SHEET */
            <div className="bg-white border-8 border-double border-amber-500/80 rounded-3xl shadow-lg p-6 sm:p-10 max-w-xl w-full text-center space-y-5 relative overflow-hidden">
              
              <div className="flex justify-center">
                <img src={mualliminLogo} alt="Logo" className="w-16 h-16 object-contain" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-black tracking-widest text-emerald-800 uppercase">
                  MADRASAH MU'ALLIMIN MUHAMMADIYAH YOGYAKARTA
                </h4>
                <h2 className="text-2xl font-serif font-black text-amber-700 uppercase tracking-wide">
                  SERTIFIKAT APRESIASI
                </h2>
                <p className="text-xs text-slate-500 italic">Nomor: 082/SRT-AP/MAM/VIII/2026</p>
              </div>

              <p className="text-xs text-slate-600">Diberikan dengan penuh rasa syukur dan bangga kepada:</p>

              <div className="py-2">
                <h3 className="text-xl font-black text-slate-900 border-b-2 border-amber-400 inline-block px-4 pb-1">
                  {musyrif.name}
                </h3>
                <p className="text-xs font-bold text-emerald-800 mt-1">Musyrif Asrama {musyrif.asrama} ({musyrif.kelas})</p>
              </div>

              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Atas dedikasi, kedisiplinan, dan keistiqomahan dalam mengawal ibadah shalat berjamaah serta pembinaan santri dengan predikat <strong>{gradeDesc}</strong> pada periode {periodName}.
              </p>

              <div className="pt-6 flex justify-around text-xs text-center border-t border-slate-200/80">
                <div>
                  <p className="text-slate-500 text-[10px]">Koordinator Musyrif</p>
                  <div className="h-10" />
                  <p className="font-bold text-slate-900">Ust. Ahmad Fauzan, S.Pd.</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">Direktur Kepamongan</p>
                  <div className="h-10" />
                  <p className="font-bold text-slate-900">Ust. H. Ridwan Effendi, M.Pd.</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
