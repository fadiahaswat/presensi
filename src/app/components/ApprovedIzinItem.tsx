/**
 * ApprovedIzinItem - Memoized Card Component for Approved Izin List
 * Optimized for virtualization with React.memo
 */

import React, { memo, useCallback } from "react";
import {
  Check, Trash2, QrCode, Send, Eye,
  Stethoscope, Building2, UserCheck, MoreVertical,
  ChevronDown, ChevronUp
} from "lucide-react";
import { SantriIzinRecord, JenisIzinSantri } from "../types/izinSantri";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { triggerHaptic } from "../utils/animations";
import { appConfirm } from "../utils/customDialog";
import { getMusyrifCallName } from "../utils/notificationUtils";

interface ApprovedIzinItemProps {
  item: SantriIzinRecord;
  authUser?: any;
  onViewDetail: (item: SantriIzinRecord) => void;
  onGenerateWA: (item: SantriIzinRecord) => void;
  onDelete?: (id: string) => void;
  onDeletePhoto?: (item: SantriIzinRecord) => void;
  onPhotoClick?: (url: string, title: string, subtitle: string) => void;
  /** Callback when PKM status changes */
  onPKMTap?: (id: string, type: "keluar" | "kembali", petugasName: string) => void;
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
      return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-bold">🚶 Biasa</span>;
  }
};

const getStatusIcon = (statusPKM: string, jenisIzin: JenisIzinSantri) => {
  if (statusPKM === "di_luar") {
    return <Building2 className="w-5 h-5" />;
  }
  if (statusPKM === "terlambat") {
    return <Stethoscope className="w-5 h-5" />;
  }
  if (jenisIzin === "kesehatan_berobat") {
    return <Stethoscope className="w-5 h-5" />;
  }
  return <UserCheck className="w-5 h-5" />;
};

const getStatusColor = (statusPKM: string) => {
  if (statusPKM === "di_luar") {
    return { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200", ring: "ring-sky-50" };
  }
  if (statusPKM === "terlambat") {
    return { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", ring: "ring-rose-50" };
  }
  return { bg: "bg-blue-50", text: "text-blue-600", border: "border-slate-200/70", ring: "" };
};

export const ApprovedIzinItem = memo(function ApprovedIzinItem({
  item,
  authUser,
  onViewDetail,
  onGenerateWA,
  onDelete,
  onDeletePhoto,
  onPhotoClick,
}: ApprovedIzinItemProps) {
  const isNew = item.createdAt && item.createdAt.startsWith(format(new Date(), "yyyy-MM-dd"));
  const fotoUrl = item.photoUrl || item.fotoSantriUrl || item.lampiranUrl;

  const statusColors = getStatusColor(item.statusPKM);

  const isAuthorized = authUser?.role === "koordinator_musyrif" ||
    authUser?.role === "pamong" ||
    authUser?.role === "musyrif" ||
    authUser?.name === item.disetujuiOleh ||
    authUser?.id === item.disetujuiOleh;

  const handleViewDetail = useCallback(() => {
    triggerHaptic("light");
    onViewDetail(item);
  }, [item, onViewDetail]);

  const handleGenerateWA = useCallback(() => {
    onGenerateWA(item);
  }, [item, onGenerateWA]);

  const handleDelete = useCallback(() => {
    if (!onDelete) return;
    appConfirm(
      `Hapus arsip perizinan ${item.namaSantri}? Data akan dihapus secara permanen.`,
      "Hapus Perizinan",
      { type: "danger", confirmText: "Hapus" }
    ).then((ok) => {
      if (ok) onDelete(item.id);
    });
  }, [item, onDelete]);

  const handlePhotoClick = useCallback(() => {
    if (onPhotoClick && fotoUrl) {
      onPhotoClick(fotoUrl, item.namaSantri, `${item.asrama} • ${item.keperluan}`);
    }
  }, [onPhotoClick, fotoUrl, item]);

  return (
    <div
      className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs transition-all space-y-3 ${
        statusColors.border
      } ${statusColors.ring ? `ring-1 ${statusColors.ring}` : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${statusColors.bg} ${statusColors.text}`}>
            {getStatusIcon(item.statusPKM, item.jenisIzin)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.namaSantri}</h4>
              {isNew && (
                <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs animate-pulse flex items-center gap-0.5 font-mono">
                  BARU
                </span>
              )}
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                {item.kelas ? (item.kelas.startsWith("Kelas") ? item.kelas : `Kelas ${item.kelas}`) : "-"}
              </span>
              {item.statusApproval === "approved" && (
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1 uppercase tracking-wide">
                  <Check className="w-3 h-3 stroke-[3]" />
                  DISETUJUI
                </span>
              )}
              {getJenisIzinBadge(item.jenisIzin)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {item.asrama}{item.kamar ? ` · ${item.kamar.startsWith("Kamar") ? item.kamar : `Kamar ${item.kamar}`}` : ""} · Musyrif: {item.disetujuiOleh || "Ustadz Asrama"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {item.statusApproval === "approved" && (
            <>
              <button
                type="button"
                onClick={handleGenerateWA}
                title="Kirim laporan ke WhatsApp Satpam"
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>

              <button
                type="button"
                onClick={handleViewDetail}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Kartu Izin</span>
              </button>
            </>
          )}

          {isAuthorized && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleViewDetail}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FOTO SANTRI IZIN */}
      {fotoUrl && (
        <div
          className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-950 group cursor-pointer"
          onClick={handlePhotoClick}
        >
          <img
            src={fotoUrl}
            alt={item.namaSantri}
            className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Foto Izin</span>
          </div>
          {isAuthorized && onDeletePhoto && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePhoto(item);
              }}
              title="Hapus Foto Izin"
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm flex items-center gap-1 transition-all active:scale-95 z-10"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus Foto</span>
            </button>
          )}
        </div>
      )}

      <div className={`rounded-2xl p-3 border space-y-1.5 text-xs text-slate-800 ${statusColors.bg}/30 border-${statusColors.border.split("-")[1]}-100`}>
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

        {/* Status PKM Badge */}
        {item.statusPKM && (
          <p className="leading-relaxed">
            <span className="text-slate-500 font-semibold">Status PKM: </span>
            <span className={`font-bold ${
              item.statusPKM === "di_luar" ? "text-sky-600" :
              item.statusPKM === "terlambat" ? "text-rose-600" :
              "text-emerald-600"
            }`}>
              {item.statusPKM === "di_luar" ? "📤 Sedang di luar" :
               item.statusPKM === "terlambat" ? "⏰ Terlambat kembali" :
               item.statusPKM === "kembali_tepat_waktu" ? "✅ Kembali tepat waktu" :
               "⏳ Menunggu"}
            </span>
          </p>
        )}
      </div>
    </div>
  );
});

export default ApprovedIzinItem;
