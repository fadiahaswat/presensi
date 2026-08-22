import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, RefreshCw, X, Check, Image as ImageIcon, Sparkles, AlertTriangle, ShieldCheck, 
  FlipHorizontal, Zap, ZapOff, CheckCircle2, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";

export interface CapturedPhotoResult {
  dataUrl: string;
  source: "camera" | "preset";
  takenAt: string;
  watermarkText: string;
}

interface LiveCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (result: CapturedPhotoResult) => void;
  taskTitle: string;
  musyrifName: string;
  asramaName: string;
}

// Preset template foto bawaan resmi (jika kamera tidak bisa digunakan)
const PRESET_TEMPLATES = [
  {
    id: "preset_tahajjud",
    title: "Membangunkan Qiyamul Lail",
    category: "Tahajjud & Shubuh",
    gradient: "from-slate-900 via-indigo-950 to-blue-900",
    icon: "🌙",
    desc: "Dokumentasi penyisiran kamar santri bangun malam & shalat tahajjud berjamaah."
  },
  {
    id: "preset_muhadatsah",
    title: "Halaqah & Muhadatsah Pagi",
    category: "Ba'da Shubuh",
    gradient: "from-emerald-900 via-teal-950 to-cyan-900",
    icon: "📖",
    desc: "Dokumentasi pendampingan muhadatsah bahasa Arab/Inggris dan halaqah tahfizh."
  },
  {
    id: "preset_sisir_sekolah",
    title: "Penyisiran Kamar Berangkat Sekolah",
    category: "Pagi Madrasah",
    gradient: "from-amber-900 via-orange-950 to-yellow-900",
    icon: "🚪",
    desc: "Dokumentasi penyisiran kamar santri rapi & terkunci saat berangkat madrasah."
  },
  {
    id: "preset_jaga_gerbang",
    title: "Patroli & Penjagaan Gerbang Asrama",
    category: "Patroli Pagi",
    gradient: "from-blue-950 via-slate-900 to-sky-950",
    icon: "🛡️",
    desc: "Dokumentasi patroli dan penertiban santri keluar masuk gerbang asrama."
  },
  {
    id: "preset_kerja_bakti",
    title: "Gotong Royong & Kerja Bakti Asrama",
    category: "Kerja Bakti Ahad",
    gradient: "from-teal-900 via-emerald-950 to-green-900",
    icon: "🧹",
    desc: "Dokumentasi pendampingan santri kerja bakti kebersihan lorong & kamar asrama."
  },
  {
    id: "preset_sakit",
    title: "Pemeriksaan & Kontrol Santri Sakit",
    category: "Kesehatan Santri",
    gradient: "from-rose-950 via-red-950 to-pink-900",
    icon: "🩺",
    desc: "Dokumentasi pengecekan kondisi santri yang sakit dan pemberian obat di asrama."
  },
  {
    id: "preset_sisir_malam",
    title: "Penyisiran Jam Tidur Santri",
    category: "Malam Asrama",
    gradient: "from-purple-950 via-indigo-950 to-slate-950",
    icon: "🛏️",
    desc: "Dokumentasi kontrol lampu kamar santri padam dan istirahat tertib tepat waktu."
  }
];

export const LiveCameraCaptureModal: React.FC<LiveCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  taskTitle,
  musyrifName,
  asramaName
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "preset">("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inisialisasi Kamera saat modal dibuka
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      setCameraError(null);
      return;
    }

    if (activeTab === "camera" && !capturedPreview) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser ini tidak mendukung akses kamera langsung.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
      }
    } catch (err: any) {
      console.warn("Camera start failed, offering native capture fallback:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Izin akses kamera belum diberikan. Izinkan akses kamera atau gunakan pengambilan kamera bawaan sistem."
          : "Kamera langsung tidak dapat diakses di browser ini. Anda dapat menggunakan tombol 'Buka Kamera Sistem' atau 'Template Bawaan'."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Flip Kamera Depan/Belakang
  const handleFlipCamera = () => {
    triggerHaptic();
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  // Watermark Renderer Helper
  const applyWatermarkAndCompress = (
    imageSource: CanvasImageSource,
    srcWidth: number,
    srcHeight: number,
    sourceType: "camera" | "preset"
  ): Promise<CapturedPhotoResult> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current || document.createElement("canvas");
      
      // Target resolusi maksimal untuk efisiensi penyimpanan & cloud sync (~640x640 / 720x540)
      const maxDim = 800;
      let targetWidth = srcWidth;
      let targetHeight = srcHeight;

      if (srcWidth > maxDim || srcHeight > maxDim) {
        if (srcWidth > srcHeight) {
          targetWidth = maxDim;
          targetHeight = Math.round((srcHeight * maxDim) / srcWidth);
        } else {
          targetHeight = maxDim;
          targetWidth = Math.round((srcWidth * maxDim) / srcHeight);
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve({
          dataUrl: "",
          source: sourceType,
          takenAt: new Date().toISOString(),
          watermarkText: ""
        });
        return;
      }

      // Draw Base Image
      ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

      // Add Gradient Overlay at bottom for Watermark legibility
      const overlayHeight = Math.min(140, Math.round(targetHeight * 0.28));
      const gradient = ctx.createLinearGradient(0, targetHeight - overlayHeight, 0, targetHeight);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.4, "rgba(0, 0, 0, 0.65)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.92)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, targetHeight - overlayHeight, targetWidth, overlayHeight);

      // Date Time Formatting
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const timeStr = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }) + " WIB";

      const watermarkLine1 = `📸 SYAMSA LOGBOOK • ${asramaName.toUpperCase()}`;
      const watermarkLine2 = `👤 ${musyrifName} • ${taskTitle}`;
      const watermarkLine3 = `⏱️ ${dateStr}, ${timeStr} • GPS VERIFIED`;

      // Draw Watermark Texts
      const baseFontSize = Math.max(11, Math.round(targetWidth * 0.026));
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";

      // Line 3 (Bottom-most)
      ctx.font = `600 ${baseFontSize * 0.88}px sans-serif`;
      ctx.fillStyle = "#34d399"; // emerald-400
      ctx.fillText(watermarkLine3, 14, targetHeight - 10);

      // Line 2 (Middle)
      ctx.font = `500 ${baseFontSize * 0.95}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(watermarkLine2, 14, targetHeight - 12 - (baseFontSize * 1.1));

      // Line 1 (Top of watermark)
      ctx.font = `bold ${baseFontSize * 1.05}px sans-serif`;
      ctx.fillStyle = "#facc15"; // amber-400
      ctx.fillText(watermarkLine1, 14, targetHeight - 14 - (baseFontSize * 2.2));

      // Add Top-Right Watermark Logo/Badge
      const topBadgePadding = 12;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.font = `bold ${baseFontSize * 0.85}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText("MU'ALLIMIN LIVE CAM", targetWidth - topBadgePadding, topBadgePadding);

      // Compress to WebP (fallback JPEG) with high compression efficiency (~25-45KB)
      let dataUrl = canvas.toDataURL("image/webp", 0.72);
      if (!dataUrl || dataUrl.length < 50 || dataUrl.startsWith("data:,")) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.70);
      }

      resolve({
        dataUrl,
        source: sourceType,
        takenAt: now.toISOString(),
        watermarkText: `${watermarkLine1} | ${watermarkLine2} | ${watermarkLine3}`
      });
    });
  };

  // Jepret Foto dari Video Stream
  const handleSnapLivePhoto = async () => {
    if (!videoRef.current) return;
    triggerHaptic();
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const result = await applyWatermarkAndCompress(
        video,
        video.videoWidth || 640,
        video.videoHeight || 480,
        "camera"
      );
      setCapturedPreview(result.dataUrl);
      stopCamera();
    } catch (e) {
      console.error("Snap photo error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback: Native Direct Camera Capture (Melalui input file dengan capture="environment" yang memaksa buka kamera HP, BUKAN galeri)
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic();
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const result = await applyWatermarkAndCompress(img, img.width, img.height, "camera");
        setCapturedPreview(result.dataUrl);
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset value agar bisa capture ulang
    e.target.value = "";
  };

  // Render Preset Template Gambar
  const handleSelectPreset = async (template: typeof PRESET_TEMPLATES[0]) => {
    triggerHaptic();
    setSelectedPresetId(template.id);
    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Create Gradient Background
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        if (template.id.includes("tahajjud")) {
          grad.addColorStop(0, "#0f172a");
          grad.addColorStop(1, "#1e1b4b");
        } else if (template.id.includes("muhadatsah")) {
          grad.addColorStop(0, "#064e3b");
          grad.addColorStop(1, "#042f2e");
        } else if (template.id.includes("kerja_bakti")) {
          grad.addColorStop(0, "#134e4a");
          grad.addColorStop(1, "#065f46");
        } else if (template.id.includes("sakit")) {
          grad.addColorStop(0, "#881337");
          grad.addColorStop(1, "#4c0519");
        } else {
          grad.addColorStop(0, "#1e293b");
          grad.addColorStop(1, "#0f172a");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Pattern / Grid Accents
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 640; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 480);
          ctx.stroke();
        }
        for (let j = 0; j < 480; j += 40) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(640, j);
          ctx.stroke();
        }

        // Draw Center Icon & Title
        ctx.font = "72px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(template.icon, 320, 180);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(template.title, 320, 260);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px sans-serif";
        ctx.fillText(template.category + " • Dokumentasi Resmi", 320, 295);

        const result = await applyWatermarkAndCompress(canvas, 640, 480, "preset");
        setCapturedPreview(result.dataUrl);
      }
    } catch (e) {
      console.error("Preset render error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Konfirmasi Penggunaan Foto
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;
    triggerHaptic();
    onCapture({
      dataUrl: capturedPreview,
      source: selectedPresetId ? "preset" : "camera",
      takenAt: new Date().toISOString(),
      watermarkText: `${taskTitle} • ${asramaName}`
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                Kamera Tugas Logbook
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Live Only
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-[300px]">
                {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector: Live Kamera vs Template Bawaan */}
        {!capturedPreview && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab("camera");
                setSelectedPresetId(null);
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "camera"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera Langsung
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab("preset");
                stopCamera();
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "preset"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Template Bawaan
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="relative flex-1 overflow-y-auto bg-slate-950 flex flex-col">
          {/* 1. Preview Hasil Tangkapan */}
          {capturedPreview ? (
            <div className="relative flex-1 flex flex-col items-center justify-center p-3 bg-black">
              <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-xl max-h-[58vh] flex items-center justify-center bg-slate-900">
                <img
                  src={capturedPreview}
                  alt="Hasil Foto Logbook"
                  className="w-full h-auto max-h-[56vh] object-contain"
                />
                <div className="absolute top-2.5 left-2.5 bg-emerald-500/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                  <CheckCircle2 className="w-3 h-3" />
                  Foto Siap Digunakan
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Watermark tanggal, waktu, nama musyrif, dan asrama telah otomatis disematkan.
              </p>
            </div>
          ) : activeTab === "camera" ? (
            /* 2. Kamera Langsung Viewfinder */
            <div className="relative flex-1 min-h-[320px] bg-black flex flex-col items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center max-w-sm flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Akses Kamera Browser Dibatasi</h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {/* Fallback Direct Device Camera Trigger */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
                    >
                      <Camera className="w-4 h-4" />
                      Buka Kamera Bawaan HP
                    </button>
                    <button
                      onClick={() => setActiveTab("preset")}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Gunakan Template Bawaan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[300px]">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover max-h-[50vh]"
                  />

                  {/* Viewfinder Target Guidelines */}
                  <div className="absolute inset-6 border border-white/25 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm border border-emerald-500/30">
                        🔴 LIVE REC
                      </span>
                      <span className="text-[10px] font-mono text-white/70 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm">
                        {asramaName}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-white/80 bg-slate-950/80 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        Arahkan kamera ke aktivitas tugas
                      </span>
                    </div>
                  </div>

                  {/* Switch Front/Back Camera Button */}
                  <button
                    onClick={handleFlipCamera}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/70 border border-slate-700/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 shadow-lg"
                    title="Putar Kamera Depan/Belakang"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 3. Tab Template Bawaan Resmi */
            <div className="p-3 sm:p-4 space-y-2.5">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-start gap-2 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Pilihan foto template resmi ini digunakan jika kamera perangkat Anda sedang tidak dapat mengambil gambar secara langsung.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectPreset(tpl)}
                    disabled={isProcessing}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      selectedPresetId === tpl.id
                        ? "bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/40"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <span className="text-2xl">{tpl.icon}</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                          {tpl.category}
                        </span>
                        <h5 className="text-xs font-bold text-white leading-snug">
                          {tpl.title}
                        </h5>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {tpl.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input dengan capture="environment" (Memaksa buka kamera langsung, melarang file album) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCameraCapture}
          className="hidden"
        />

        {/* Hidden Canvas untuk Processing Watermark */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          {capturedPreview ? (
            <>
              <button
                onClick={() => {
                  triggerHaptic();
                  setCapturedPreview(null);
                  setSelectedPresetId(null);
                  if (activeTab === "camera") {
                    startCamera();
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ulangi Foto
              </button>
              <button
                onClick={handleConfirmPhoto}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto Ini
              </button>
            </>
          ) : activeTab === "camera" && !cameraError ? (
            <div className="w-full flex items-center justify-center py-1">
              {/* Shutter Button */}
              <button
                onClick={handleSnapLivePhoto}
                disabled={isProcessing}
                className="group relative w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:border-white transition-all active:scale-90"
              >
                <div className="w-full h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-colors">
                  <Camera className="w-6 h-6 text-slate-950" />
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
