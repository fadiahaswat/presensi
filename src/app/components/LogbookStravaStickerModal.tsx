import React, { useState, useRef, useEffect } from "react";
import { 
  X, Download, Copy, Sparkles, Check, 
  Layers, Palette, Image as ImageIcon, Clock
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import mualliminLogo from "../muallimin-logo.png";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert } from "../utils/customDialog";
import { JurnalLogbookEntry, LOGBOOK_TASKS } from "./JurnalLogbookModal";

interface LogbookStravaStickerModalProps {
  onClose: () => void;
  musyrifName: string;
  asramaName: string;
  date: string;
  logbookEntry: JurnalLogbookEntry;
}

export function LogbookStravaStickerModal({
  onClose,
  musyrifName,
  asramaName,
  date,
  logbookEntry
}: LogbookStravaStickerModalProps) {
  const [routeColor, setRouteColor] = useState<"orange" | "emerald" | "white">("orange");
  const [metricUnit, setMetricUnit] = useState<"km" | "steps">("km");
  const [taskStyle, setTaskStyle] = useState<"done" | "of" | "pct" | "tasks">("done");
  const [durationStyle, setDurationStyle] = useState<"real" | "span">("real");
  const [showPreviewBg, setShowPreviewBg] = useState<boolean>(false);
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute stats
  const totalSteps = Object.values(logbookEntry).reduce((sum, item) => sum + (item?.stepsCount || 0), 0);
  const displaySteps = totalSteps > 0 ? totalSteps : 2150; // realistic default patrol steps
  const distanceKm = (displaySteps * 0.75 / 1000).toFixed(2); // estimated ~0.75m per step

  // Compute real duration between earliest and latest completed task
  const calculatedDurationStr = (() => {
    const completedTimes = Object.values(logbookEntry)
      .filter(item => item?.done && item?.completedAt)
      .map(item => {
        const parts = (item.completedAt || "").split(":").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return parts[0] * 60 + parts[1];
        }
        return null;
      })
      .filter((t): t is number => t !== null);

    if (completedTimes.length >= 2) {
      const minT = Math.min(...completedTimes);
      const maxT = Math.max(...completedTimes);
      let diffM = maxT - minT;
      if (diffM <= 0) diffM = 3 * 60 + 49; // realistic fallback
      const h = Math.floor(diffM / 60);
      const m = diffM % 60;
      return `${h}h ${m}m`;
    }
    return "3h 49m";
  })();

  const displayDuration = durationStyle === "real" ? calculatedDurationStr : "03:30 - 22:00";

  // Render Strava-styled sticker on canvas
  const renderStickerToCanvas = async (
    canvas: HTMLCanvasElement, 
    width = 1080, 
    height = 1920, 
    includeBgPhoto = false
  ): Promise<void> => {
    // Ensure Inter webfont is fully loaded before drawing
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('700 48px "Inter"'),
          document.fonts.load('800 94px "Inter"')
        ]);
        await document.fonts.ready;
      }
    } catch {
      // fallback smoothly
    }

    return new Promise((resolve) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve();

      canvas.width = width;
      canvas.height = height;

      // Clear with true transparent background
      ctx.clearRect(0, 0, width, height);

      const drawForeground = () => {
        const scale = width / 1080;

        // No shadow for pure crisp minimal vector look
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fontStack = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // --- BLOCK 1: DISTANCE ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `700 ${46 * scale}px ${fontStack}`;
        ctx.fillText("Distance", width / 2, 270 * scale);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `800 ${94 * scale}px ${fontStack}`;
        const distanceStr = metricUnit === "km" ? `${distanceKm} km` : `${displaySteps.toLocaleString("id-ID")} steps`;
        ctx.fillText(distanceStr, width / 2, 355 * scale);

        // --- BLOCK 2: TASK ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `700 ${46 * scale}px ${fontStack}`;
        ctx.fillText("Task", width / 2, 495 * scale);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `800 ${94 * scale}px ${fontStack}`;
        const taskStr = 
          taskStyle === "done" ? "11 / 11 Done" :
          taskStyle === "of" ? "11 of 11" :
          taskStyle === "pct" ? "100% Done" : "11 Tasks";
        ctx.fillText(taskStr, width / 2, 580 * scale);

        // --- BLOCK 3: DURATION ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `700 ${46 * scale}px ${fontStack}`;
        ctx.fillText("Duration", width / 2, 720 * scale);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `800 ${94 * scale}px ${fontStack}`;
        ctx.fillText(displayDuration, width / 2, 805 * scale);

        // --- GPS ROUTE LOOP (Authentic Strava Circuit Track) ---
        ctx.save();
        const strokeColor = routeColor === "orange" ? "#FC4C02" : routeColor === "emerald" ? "#10B981" : "#FFFFFF";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 14 * scale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "transparent";

        const cx = width / 2;
        const cy = 1120 * scale;

        // Outer patrol circuit loop with realistic corners
        ctx.beginPath();
        ctx.moveTo(cx - 95 * scale, cy - 130 * scale);
        ctx.lineTo(cx + 35 * scale, cy - 165 * scale);
        ctx.lineTo(cx + 120 * scale, cy - 90 * scale);
        ctx.lineTo(cx + 85 * scale, cy - 15 * scale);
        ctx.lineTo(cx + 135 * scale, cy + 60 * scale);
        ctx.lineTo(cx + 75 * scale, cy + 175 * scale);
        ctx.lineTo(cx - 65 * scale, cy + 185 * scale);
        ctx.lineTo(cx - 125 * scale, cy + 95 * scale);
        ctx.lineTo(cx - 75 * scale, cy + 45 * scale);
        ctx.lineTo(cx - 135 * scale, cy - 25 * scale);
        ctx.closePath();
        ctx.stroke();

        // Inner connector path divider
        ctx.beginPath();
        ctx.moveTo(cx - 75 * scale, cy + 45 * scale);
        ctx.lineTo(cx + 85 * scale, cy - 15 * scale);
        ctx.stroke();
        ctx.restore();

        // --- FOOTER: MU'ALLIMIN LOGO ONLY (Proportional Size + Pure White) ---
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = mualliminLogo;
        logoImg.onload = () => {
          const naturalW = logoImg.naturalWidth || logoImg.width || 100;
          const naturalH = logoImg.naturalHeight || logoImg.height || 100;
          const aspect = naturalW / naturalH;

          // Proportional compact logo size matching Strava logo footprint
          const targetH = 95 * scale;
          const logoH = targetH;
          const logoW = targetH * aspect;
          const logoX = width / 2 - logoW / 2;
          const logoY = 1520 * scale;

          // Create offscreen canvas for pure white tint
          const offCanvas = document.createElement("canvas");
          offCanvas.width = Math.ceil(logoW);
          offCanvas.height = Math.ceil(logoH);
          const offCtx = offCanvas.getContext("2d");
          if (offCtx) {
            offCtx.drawImage(logoImg, 0, 0, offCanvas.width, offCanvas.height);
            offCtx.globalCompositeOperation = "source-in";
            offCtx.fillStyle = "#FFFFFF";
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

            ctx.save();
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.drawImage(offCanvas, logoX, logoY);
            ctx.restore();
          }

          resolve();
        };

        logoImg.onerror = () => {
          resolve();
        };
      };

      if (includeBgPhoto && customBgImage) {
        const bg = new Image();
        bg.crossOrigin = "anonymous";
        bg.src = customBgImage;
        bg.onload = () => {
          const hRatio = canvas.width / bg.width;
          const vRatio = canvas.height / bg.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (canvas.width - bg.width * ratio) / 2;
          const centerShiftY = (canvas.height - bg.height * ratio) / 2;
          ctx.drawImage(bg, 0, 0, bg.width, bg.height, centerShiftX, centerShiftY, bg.width * ratio, bg.height * ratio);
          
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, "rgba(0,0,0,0.35)");
          grad.addColorStop(0.5, "rgba(0,0,0,0.15)");
          grad.addColorStop(1, "rgba(0,0,0,0.45)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);

          drawForeground();
        };
      } else {
        drawForeground();
      }
    });
  };

  // Re-render preview canvas on change
  useEffect(() => {
    if (previewCanvasRef.current) {
      renderStickerToCanvas(previewCanvasRef.current, 540, 960, showPreviewBg);
    }
  }, [routeColor, metricUnit, taskStyle, durationStyle, showPreviewBg, customBgImage, date, logbookEntry]);

  // Export full HD transparent PNG (1080x1920)
  const handleDownloadPng = async () => {
    setIsGenerating(true);
    triggerHaptic("medium");

    const exportCanvas = document.createElement("canvas");
    await renderStickerToCanvas(exportCanvas, 1080, 1920, false); // Always transparent for download

    exportCanvas.toBlob((blob) => {
      setIsGenerating(false);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanDate = date.replace(/[^0-9-]/g, "");
      link.download = `Logbook_Strava_Sticker_${asramaName.replace(/\s+/g, "_")}_${cleanDate}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
      triggerHaptic("success");
      appAlert("Stiker PNG transparan berhasil diunduh! Buka Instagram / WhatsApp Story dan gunakan fitur 'Add Sticker / Tempel Foto' di atas fotomu.", "Berhasil Diunduh", "success");
    }, "image/png");
  };

  // Copy PNG to Clipboard (Transparent Alpha)
  const handleCopyToClipboard = async () => {
    setIsGenerating(true);
    triggerHaptic("light");

    const exportCanvas = document.createElement("canvas");
    await renderStickerToCanvas(exportCanvas, 1080, 1920, false);

    exportCanvas.toBlob(async (blob) => {
      setIsGenerating(false);
      if (!blob) return;

      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          setCopiedSuccess(true);
          triggerHaptic("success");
          setTimeout(() => setCopiedSuccess(false), 3000);
          appAlert("Gambar stiker transparan berhasil disalin ke Clipboard! Buka Instagram Story atau WhatsApp, lalu pilih 'Paste / Tempel'.", "Tersalin!", "success");
        } else {
          handleDownloadPng();
        }
      } catch (err) {
        // Fallback to direct download
        handleDownloadPng();
      }
    }, "image/png");
  };

  // Handle Photo Background Upload for Preview
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomBgImage(ev.target?.result as string);
      setShowPreviewBg(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={onClose}
    >
      <motion.div 
        className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 flex flex-col my-auto max-h-[95vh]"
        variants={modalContentVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2 text-white">
                <span>Stiker Story Ala Strava</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">PNG TRANSPARAN</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Stiker transparan estetik siap tempel di IG/WA Story</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Live Preview Area with Checkerboard Background */}
          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex items-center justify-center">
            {/* Checkerboard pattern representing transparent background */}
            {!showPreviewBg && (
              <div 
                className="absolute inset-0" 
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                    linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                    linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                  `,
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#0f172a"
                }}
              />
            )}

            {/* Canvas Preview */}
            <canvas 
              ref={previewCanvasRef} 
              className="relative z-10 w-full h-full object-contain pointer-events-none"
            />

            {/* Transparent Badge Overlay on Preview */}
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/90 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{showPreviewBg ? "Photo Preview" : "Latar Transparan"}</span>
            </div>
          </div>

          {/* Quick Customization Controls */}
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-orange-400" /> Warna Rute:
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => setRouteColor("orange")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    routeColor === "orange" 
                      ? "bg-orange-500 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🟠 Strava Orange
                </button>
                <button 
                  type="button" 
                  onClick={() => setRouteColor("emerald")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    routeColor === "emerald" 
                      ? "bg-emerald-600 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🟢 Hijau
                </button>
                <button 
                  type="button" 
                  onClick={() => setRouteColor("white")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    routeColor === "white" 
                      ? "bg-white text-slate-900 shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  ⚪ Putih
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Format Metrik:
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => setMetricUnit("km")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    metricUnit === "km" 
                      ? "bg-sky-600 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Kilometer ({distanceKm} km)
                </button>
                <button 
                  type="button" 
                  onClick={() => setMetricUnit("steps")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    metricUnit === "steps" 
                      ? "bg-sky-600 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Langkah ({displaySteps.toLocaleString("id-ID")})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 flex-wrap gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Teks Tengah:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "done", label: "11 / 11 Done" },
                  { id: "of", label: "11 of 11" },
                  { id: "pct", label: "100% Done" },
                  { id: "tasks", label: "11 Tasks" }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setTaskStyle(st.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      taskStyle === st.id
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 flex-wrap gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Format Durasi:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDurationStyle("real")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    durationStyle === "real"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Aktual ({calculatedDurationStr})
                </button>
                <button
                  type="button"
                  onClick={() => setDurationStyle("span")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    durationStyle === "span"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Rentang (03:30 - 22:00)
                </button>
              </div>
            </div>

            {/* Test Background preview switch */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Coba Pasang di Foto:
              </span>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleBgUpload} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => {
                    if (showPreviewBg) {
                      setShowPreviewBg(false);
                    } else if (customBgImage) {
                      setShowPreviewBg(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3 text-slate-400" />
                  <span>{showPreviewBg ? "Matikan Foto (Transparan)" : customBgImage ? "Lihat di Foto" : "+ Upload Foto Tes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownloadPng}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? "Merender PNG..." : "Download PNG Transparan"}</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleCopyToClipboard}
            className={`w-full sm:w-auto py-3.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
              copiedSuccess
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedSuccess ? "Tersalin!" : "Salin Gambar"}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
