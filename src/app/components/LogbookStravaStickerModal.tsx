import React, { useState, useRef, useEffect } from "react";
import { 
  X, Download, Copy, Sparkles, Check, 
  Layers, Image as ImageIcon, Clock, Shield
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import syamsaPrimaryLogo from "../../assets/branding/Primary Logo.webp";
import stravaLogo from "../../assets/Strava_Logo.svg.webp";
import { modalBackdropVariants, modalContentVariants, triggerHaptic } from "../utils/animations";
import { appAlert } from "../utils/customDialog";
import { JurnalLogbookEntry, LOGBOOK_TASKS, getLogbookTasksForDate } from "./JurnalLogbookModal";

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
  const [logoChoice, setLogoChoice] = useState<"syamsa" | "strava">("syamsa");
  const [metricUnit, setMetricUnit] = useState<"km" | "steps">("km");
  const [taskStyle, setTaskStyle] = useState<"done" | "of" | "pct" | "tasks">("done");
  const [durationStyle, setDurationStyle] = useState<"real" | "span">("real");
  const [showPreviewBg, setShowPreviewBg] = useState<boolean>(false);
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic computation from actual musyrif logbook entries for this date
  const activeDateTasks = useMemo(() => {
    const subMap = {
      bakdaSubuh: (logbookEntry.bakdaSubuh?.subChoice || "tahfizh") as "tahfizh" | "piket"
    };
    return getLogbookTasksForDate(date, subMap);
  }, [date, logbookEntry]);

  const completedTasks = activeDateTasks.filter(t => logbookEntry[t.key]?.done).length;
  const totalTasks = activeDateTasks.length;

  // 1. Distance & Steps: Computed from actual pedometer steps of all patrol tasks
  const recordedSteps = Object.values(logbookEntry).reduce((sum, item) => sum + (item?.stepsCount || 0), 0);
  // If steps recorded via pedometer, use exact steps; if manual check, estimate 200 steps per completed patrol task
  const estimatedPatrolSteps = activeDateTasks.filter(t => t.isPatrol && logbookEntry[t.key]?.done).length * 200;
  const displaySteps = recordedSteps > 0 ? recordedSteps : (estimatedPatrolSteps > 0 ? estimatedPatrolSteps : 2200);
  const distanceKm = (displaySteps * 0.75 / 1000).toFixed(2); // standard human stride length ~0.75m

  // 2. Real Duration: Computed dynamically from the earliest to the latest completed task timestamp
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
      if (diffM < 0) diffM += 24 * 60;
      const h = Math.floor(diffM / 60);
      const m = diffM % 60;
      return `${h}h ${m}m`;
    } else if (completedTimes.length === 1) {
      return "0h 45m";
    }
    return "18h 30m";
  })();

  const displayDuration = durationStyle === "real" ? calculatedDurationStr : "03:30 - 22:00";

  // Dynamic task text reflecting real progress
  const dynamicTaskStr = 
    taskStyle === "done" ? `${completedTasks} / ${totalTasks} Done` :
    taskStyle === "of" ? `${completedTasks} of ${totalTasks}` :
    taskStyle === "pct" ? `${Math.round((completedTasks / totalTasks) * 100)}% Done` : `${completedTasks} Tasks`;

  // Helper to load images asynchronously
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  // Render Strava-styled sticker on canvas
  const renderStickerToCanvas = async (
    canvas: HTMLCanvasElement, 
    width = 1080, 
    height = 1920, 
    includeBgPhoto = false
  ): Promise<void> => {
    // Ensure Montserrat webfont is fully loaded before drawing
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('600 34px "Montserrat"'),
          document.fonts.load('700 96px "Montserrat"')
        ]);
        await document.fonts.ready;
      }
    } catch {
      // fallback smoothly
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Clear with true transparent background
    ctx.clearRect(0, 0, width, height);

    const drawForeground = async () => {
      const scale = width / 1080;

      // No shadow for pure crisp minimal vector look
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const fontStack = '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // --- SECTION 1: DISTANCE (Y: 320 / 395) ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = `600 ${34 * scale}px ${fontStack}`;
      ctx.fillText("Distance", width / 2, 320 * scale);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${96 * scale}px ${fontStack}`;
      const distanceStr = metricUnit === "km" ? `${distanceKm} km` : `${displaySteps.toLocaleString("id-ID")} steps`;
      ctx.fillText(distanceStr, width / 2, 395 * scale);

      // --- SECTION 2: TASK (Y: 540 / 615) ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = `600 ${34 * scale}px ${fontStack}`;
      ctx.fillText("Task", width / 2, 540 * scale);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${96 * scale}px ${fontStack}`;
      ctx.fillText(dynamicTaskStr, width / 2, 615 * scale);

      // --- SECTION 3: DURATION (Y: 760 / 835) ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = `600 ${34 * scale}px ${fontStack}`;
      ctx.fillText("Duration", width / 2, 760 * scale);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${96 * scale}px ${fontStack}`;
      ctx.fillText(displayDuration, width / 2, 835 * scale);

      // --- SECTION 4: REAL GPX GPS ROUTE (Center Y: 1190) ---
      const GPX_POINTS = [
        { lat: -7.80735, lon: 110.26623 },
        { lat: -7.80686, lon: 110.2665 },
        { lat: -7.80685, lon: 110.26651 },
        { lat: -7.80685, lon: 110.26653 },
        { lat: -7.80689, lon: 110.2667 },
        { lat: -7.80688, lon: 110.26671 },
        { lat: -7.80667, lon: 110.26674 },
        { lat: -7.80667, lon: 110.26675 },
        { lat: -7.80667, lon: 110.26674 },
        { lat: -7.80665, lon: 110.26647 },
        { lat: -7.80665, lon: 110.26646 },
        { lat: -7.80666, lon: 110.26644 },
        { lat: -7.8069, lon: 110.26634 },
        { lat: -7.80692, lon: 110.26631 },
        { lat: -7.80693, lon: 110.26628 },
        { lat: -7.80692, lon: 110.26631 },
        { lat: -7.8069, lon: 110.26634 },
        { lat: -7.80666, lon: 110.26644 },
        { lat: -7.80665, lon: 110.26646 },
        { lat: -7.80667, lon: 110.26674 },
        { lat: -7.80668, lon: 110.26689 },
        { lat: -7.80667, lon: 110.26689 },
        { lat: -7.80627, lon: 110.26689 },
        { lat: -7.80626, lon: 110.26689 },
        { lat: -7.80626, lon: 110.26656 },
        { lat: -7.80626, lon: 110.26689 },
        { lat: -7.80668, lon: 110.26689 },
        { lat: -7.8067, lon: 110.26763 },
        { lat: -7.8067, lon: 110.26765 }
      ];

      const lats = GPX_POINTS.map(p => p.lat);
      const lons = GPX_POINTS.map(p => p.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const meanLat = (minLat + maxLat) / 2;
      const cosLat = Math.cos((meanLat * Math.PI) / 180);

      const wGeo = (maxLon - minLon) * cosLat;
      const hGeo = maxLat - minLat;

      const targetBoxW = 480 * scale;
      const targetBoxH = 350 * scale;
      const geoScale = Math.min(targetBoxW / wGeo, targetBoxH / hGeo);

      const cx = width / 2;
      const cy = 1190 * scale;

      const projected = GPX_POINTS.map(p => {
        const xOffset = ((p.lon - minLon) * cosLat - wGeo / 2) * geoScale;
        const yOffset = ((maxLat - p.lat) - hGeo / 2) * geoScale;
        return {
          x: cx + xOffset,
          y: cy + yOffset
        };
      });

      ctx.save();
      ctx.strokeStyle = "#FC4C02"; // Iconic Strava Orange
      ctx.lineWidth = 14 * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "transparent";

      ctx.beginPath();
      projected.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();

      // --- SECTION 5: FOOTER LOGO (Syamsa or Strava in Pure White) ---
      try {
        const logoSrc = logoChoice === "syamsa" ? syamsaPrimaryLogo : stravaLogo;
        const logoImg = await loadImage(logoSrc);
        const naturalW = logoImg.naturalWidth || logoImg.width || 200;
        const naturalH = logoImg.naturalHeight || logoImg.height || 80;
        const aspect = naturalW / naturalH;

        // Proportional logo size
        const targetH = (logoChoice === "syamsa" ? 110 : 65) * scale;
        const logoH = targetH;
        const logoW = targetH * aspect;
        const logoX = width / 2 - logoW / 2;
        const logoY = (logoChoice === "syamsa" ? 1480 : 1500) * scale;

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
      } catch (err) {
        console.warn("Could not load footer logo", err);
      }
    };

    if (includeBgPhoto && customBgImage) {
      try {
        const bg = await loadImage(customBgImage);
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

        await drawForeground();
      } catch {
        await drawForeground();
      }
    } else {
      await drawForeground();
    }
  };

  // Re-render preview canvas on change
  useEffect(() => {
    if (previewCanvasRef.current) {
      renderStickerToCanvas(previewCanvasRef.current, 540, 960, showPreviewBg);
    }
  }, [logoChoice, metricUnit, taskStyle, durationStyle, showPreviewBg, customBgImage, date, logbookEntry]);

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
      
      appAlert("Berhasil!", "Stiker PNG transparan berhasil diunduh.", "success");
    }, "image/png");
  };

  // Copy PNG Blob directly to Clipboard
  const handleCopyToClipboard = async () => {
    try {
      setIsGenerating(true);
      triggerHaptic("medium");
      const exportCanvas = document.createElement("canvas");
      await renderStickerToCanvas(exportCanvas, 1080, 1920, false);

      exportCanvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }

        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]);
            setCopiedSuccess(true);
            setTimeout(() => setCopiedSuccess(false), 2500);
            appAlert("Tersalin!", "Stiker transparan siap langsung di-paste ke Instagram/WA Story!", "success");
          } else {
            handleDownloadPng();
          }
        } catch {
          handleDownloadPng();
        } finally {
          setIsGenerating(false);
        }
      }, "image/png");
    } catch {
      setIsGenerating(false);
      handleDownloadPng();
    }
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
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        variants={modalContentVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
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
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
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
            {/* Logo Selector */}
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" /> Pilihan Logo:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button 
                  type="button" 
                  onClick={() => setLogoChoice("syamsa")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    logoChoice === "syamsa" 
                      ? "bg-rose-600 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Logo Syamsa (Default)
                </button>
                <button 
                  type="button" 
                  onClick={() => setLogoChoice("strava")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    logoChoice === "strava" 
                      ? "bg-rose-600 text-white shadow-xs" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Logo Strava
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
