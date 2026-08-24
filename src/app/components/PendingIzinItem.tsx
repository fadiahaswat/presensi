/**
 * PendingIzinItem - Memoized Card Component for Pending Izin List
 * Optimized for virtualization with React.memo
 */

import React, { memo } from "react";
import { Clock, Check, Ban, Eye, Stethoscope, Building2, UserCheck } from "lucide-react";
import { SantriIzinRecord, JenisIzinSantri } from "../types/izinSantri";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { appConfirm } from "../utils/customDialog";

interface PendingIzinItemProps {
  item: SantriIzinRecord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (item: SantriIzinRecord) => void;
  onPhotoClick?: (url: string, title: string, subtitle: string) => void;
}

const getJenisIzinBadge = (jenis: JenisIzinSantri) => {
  switch (jenis) {
    case "kesehatan_berobat":
      return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-md font-bold">🏥 Berobat</span>;
    case "pulang_menginap":
      return <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-md font-bold">🏠 Pulang</span>;
    case "rutin_sabtu_ahad":
      return <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded-md font-bold">📅 Rutin</span>;
    default:
      return <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md font-bold">🚶 Biasa</span>;
  }
};

export const PendingIzinItem = memo(function PendingIzinItem({
  item,
  onApprove,
  onReject,
  onViewDetail,
  onPhotoClick,
}: PendingIzinItemProps) {
  const fotoUrl = item.photoUrl || item.fotoSantriUrl || item.lampiranUrl;

  const handleApprove = () => {
    appConfirm(`Setujui permohonan izin santri ${item.namaSantri}?`, "Konfirmasi Persetujuan", {
      type: "info",
      confirmText: "Ya, Setujui"
    }).then((ok) => {
      if (ok) onApprove(item.id);
    });
  };

  const handleViewDetail = () => {
    triggerHaptic("light");
    onViewDetail(item);
  };

  const handlePhotoClick = () => {
    if (onPhotoClick && fotoUrl) {
      onPhotoClick(
        fotoUrl,
        item.namaSantri,
        `${item.asrama} • ${item.keperluan}`
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200 shadow-xs ring-1 ring-amber-50 transition-all space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.namaSantri}</h4>
              <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-0.5 font-mono">
                Menunggu Approval
              </span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                {item.kelas ? (item.kelas.startsWith("Kelas") ? item.kelas : `Kelas ${item.kelas}`) : "-"}
              </span>
              {getJenisIzinBadge(item.jenisIzin)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {item.asrama}{item.kamar ? ` · ${item.kamar.startsWith("Kamar") ? item.kamar : `Kamar ${item.kamar}`}` : ""} · No: <span className="font-mono">{item.nomorSurat}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleApprove}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Setujui</span>
          </button>

          <button
            type="button"
            onClick={() => onReject(item.id)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Tolak</span>
          </button>

          <button
            type="button"
            onClick={handleViewDetail}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Detail</span>
          </button>
        </div>
      </div>

      {/* FOTO SANTRI IZIN (PENDING) */}
      {fotoUrl && (
        <div
          className="relative rounded-2xl overflow-hidden border border-amber-200/80 bg-slate-950 group cursor-pointer"
          onClick={handlePhotoClick}
        >
          <img
            src={fotoUrl}
            alt={item.namaSantri}
            className="w-full h-36 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Klik untuk Perbesar Foto</span>
          </div>
        </div>
      )}

      <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 space-y-1.5 text-xs text-slate-800">
        <p className="leading-relaxed font-medium">
          <span className="text-slate-500 font-semibold">Keperluan: </span>
          {item.keperluan}
        </p>
        {item.tujuanLokasi && (
          <p className="leading-relaxed">
            <span className="text-slate-500 font-semibold">Tujuan: </span>
            {item.tujuanLokasi}
          </p>
        )}
        <p className="leading-relaxed">
          <span className="text-slate-500 font-semibold">Jadwal: </span>
          {item.tglKeluarRencana
            ? format(new Date(item.tglKeluarRencana), "d MMM yyyy", { locale: id })
            : "-"}
          {item.jamKeluarRencana ? ` • ${item.jamKeluarRencana}` : ""}
          {" → "}
          {item.tglKembaliRencana
            ? format(new Date(item.tglKembaliRencana), "d MMM yyyy", { locale: id })
            : "-"}
          {item.jamKembaliRencana ? ` • ${item.jamKembaliRencana}` : ""}
        </p>
        {item.namaPenjemput && (
          <p className="leading-relaxed">
            <span className="text-slate-500 font-semibold">Penjemput: </span>
            {item.namaPenjemput}
            {item.hubunganPenjemput ? ` (${item.hubunganPenjemput})` : ""}
          </p>
        )}
      </div>
    </div>
  );
});

export default PendingIzinItem;
