import React, { useState, useRef, useEffect } from "react";
import {
  Camera, RefreshCw, X, Check, Image as ImageIcon, AlertTriangle,
  FlipHorizontal, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/animations";
import syamsaWordmark from "../../assets/branding/Wordmark.webp";

export interface CapturedPhotoResult {
  dataUrl: string;
  source: "camera" | "gallery";
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

export const LiveCameraCaptureModal: React.FC<LiveCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  taskTitle,
  musyrifName,
  asramaName
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "gallery">("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<"camera" | "gallery">("camera");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);

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
    } else {
      stopCamera();
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
          : "Kamera langsung tidak dapat diakses di browser ini. Anda dapat menggunakan 'Galeri HP' atau 'Template Bawaan'."
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
  const applyWatermarkAndCompress = async (
    imageSource: CanvasImageSource,
    srcWidth: number,
    srcHeight: number,
    sourceType: "camera" | "gallery"
  ): Promise<CapturedPhotoResult> => {
      const canvas = canvasRef.current || document.createElement("canvas");

      // Fixed aspect ratio 9:16 (Story format) - Optimized for high visual clarity and lightweight cell storage
      const STORY_RATIO = 9 / 16; // 0.5625
      const maxHeight = 480;
      const maxWidth = Math.round(maxHeight * STORY_RATIO); // 270

      // Calculate target dimensions maintaining 9:16 ratio
      let targetHeight = maxHeight;
      let targetWidth = maxWidth;

      // Crop from center to get 9:16
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return {
          dataUrl: "",
          source: sourceType,
          takenAt: new Date().toISOString(),
          watermarkText: ""
        };
      }

      // Draw Base Image - Crop from center to fit 9:16 ratio
      const srcRatio = srcWidth / srcHeight;
      let sx = 0, sy = 0, sW = srcWidth, sH = srcHeight;

      if (srcRatio > STORY_RATIO) {
        // Source is wider than 9:16 - crop sides
        sW = Math.round(srcHeight * STORY_RATIO);
        sx = Math.round((srcWidth - sW) / 2);
      } else if (srcRatio < STORY_RATIO) {
        // Source is taller than 9:16 - crop top/bottom
        sH = Math.round(srcWidth / STORY_RATIO);
        sy = Math.round((srcHeight - sH) / 2);
      }

      ctx.drawImage(imageSource, sx, sy, sW, sH, 0, 0, targetWidth, targetHeight);

      // Add Gradient Overlay at bottom for Watermark legibility
      const overlayHeight = Math.min(140, Math.round(targetHeight * 0.28));
      const gradient = ctx.createLinearGradient(0, targetHeight - overlayHeight, 0, targetHeight);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.4, "rgba(0, 0, 0, 0.65)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.92)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, targetHeight - overlayHeight, targetWidth, overlayHeight);

      // Date Time Formatting - Format: 12/8/2026 - 02.49.18
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      const timeStr = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).replace(/\./g, ":");
      const dateTimeStr = `${dateStr} - ${timeStr}`;

      const watermarkLine1 = `${musyrifName}`;
      const watermarkLine2 = `${asramaName}`;
      const watermarkLine3 = `${dateTimeStr}`;

      // Helper to load font and return Promise
      const loadFont = (fontFamily: string, fontUrl: string): Promise<void> => {
        return new Promise((resolve) => {
          // Check if font already loaded
          if (document.fonts && document.fonts.check(`16px ${fontFamily}`)) {
            resolve();
            return;
          }
          const font = new FontFace(fontFamily, `url(${fontUrl})`);
          font.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            resolve();
          }).catch(() => resolve());
        });
      };

      // Helper to load image
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = src;
        });
      };

      // Load Montserrat font
      await loadFont("Montserrat", "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg7_iudtI6l2W0JCmlqVvRKMMy8D.woff2");

      // Draw Watermark Texts - Left Side with Montserrat (Better Typography Hierarchy)
      const baseSize = Math.max(13, Math.round(targetWidth * 0.028));
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fontFamily = "Montserrat, sans-serif";

      // Line 1 - Nama Ustadz (Medium weight, white color, larger)
      const nameSize = baseSize * 1.2;
      ctx.font = `500 ${nameSize}px Montserrat, sans-serif`;
      ctx.fillStyle = "#ffffff"; // White
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillText(watermarkLine1, 16, targetHeight - 14 - (nameSize * 1.5));

      // Line 2 - Asrama (Regular weight, white, medium size)
      const asramaSize = baseSize * 1.0;
      ctx.font = `400 ${asramaSize}px Montserrat, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      ctx.fillText(watermarkLine2, 16, targetHeight - 12 - (nameSize * 1.5) - (asramaSize * 1.3));

      // Line 3 - DateTime (Light weight, white/gray, smaller)
      const dateSize = baseSize * 0.85;
      ctx.font = `300 ${dateSize}px Montserrat, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      ctx.fillText(watermarkLine3, 16, targetHeight - 10);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Right Side - Draw SYAMSA Logo Image (Whiten)
      const logoImg = await loadImage(syamsaWordmark);
      const logoSize = Math.max(32, Math.round(targetWidth * 0.07));
      const imgRatio = logoImg.height / logoImg.width;
      ctx.drawImage(
        logoImg,
        targetWidth - logoSize - 14,
        targetHeight - (logoSize * imgRatio) - 14,
        logoSize,
        logoSize * imgRatio
      );

      // Compress to WebP (fallback JPEG) - Super lightweight to prevent cell overflows
      let dataUrl = canvas.toDataURL("image/webp", 0.58);
      if (!dataUrl || dataUrl.length < 50 || dataUrl.startsWith("data:,")) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.52);
      }

      return {
        dataUrl,
        source: sourceType,
        takenAt: now.toISOString(),
        watermarkText: `${musyrifName} • ${asramaName} • ${dateTimeStr}`
      };
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
      setSelectedSourceType("camera");
      stopCamera();
    } catch (e) {
      console.error("Snap photo error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Native Direct Camera Capture
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
        setSelectedSourceType("camera");
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Pick Photo from Phone Gallery / Storage
  const handleGalleryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic();
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const result = await applyWatermarkAndCompress(img, img.width, img.height, "gallery");
        setCapturedPreview(result.dataUrl);
        setSelectedSourceType("gallery");
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Konfirmasi Penggunaan Foto
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;
    triggerHaptic();
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const timeStr = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).replace(/\./g, ":");
    const dateTimeStr = `${dateStr} - ${timeStr}`;
    onCapture({
      dataUrl: capturedPreview,
      source: selectedSourceType,
      takenAt: now.toISOString(),
      watermarkText: `${musyrifName} • ${asramaName} • ${dateTimeStr}`
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
                Dokumentasi Logbook
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

        {/* Tab Selector: Kamera vs Galeri HP */}
        {!capturedPreview && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs font-semibold gap-1">
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab("camera");
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center ${
                activeTab === "camera"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab("gallery");
                stopCamera();
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center ${
                activeTab === "gallery"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Galeri HP</span>
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
                  Foto Siap Disimpan
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Watermark nama ustadz dan keterangan telah otomatis disematkan.
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
                    <button
                      onClick={() => fileInputCameraRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
                    >
                      <Camera className="w-4 h-4" />
                      Buka Kamera Bawaan HP
                    </button>
                    <button
                      onClick={() => fileInputGalleryRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Pilih dari Galeri HP
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
          ) : activeTab === "gallery" && (
            /* 3. Tab Unggah dari Galeri HP */
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center my-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-950/50">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Pilih Foto dari Galeri HP
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                Gunakan foto yang sudah Anda ambil sebelumnya saat mendampingi kegiatan di asrama. Watermark resmi akan disematkan secara otomatis.
              </p>

              <button
                onClick={() => fileInputGalleryRef.current?.click()}
                disabled={isProcessing}
                className="w-full max-w-xs py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 transition-all active:scale-98"
              >
                <ImageIcon className="w-4 h-4" />
                {isProcessing ? "Memproses Foto..." : "Buka Galeri Foto HP"}
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input dengan capture="environment" (Kamera HP) */}
        <input
          ref={fileInputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCameraCapture}
          className="hidden"
        />

        {/* Hidden File Input untuk Galeri HP (Tanpa capture) */}
        <input
          ref={fileInputGalleryRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryPhotoUpload}
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
            <div className="w-full flex items-center justify-between px-2">
              <button
                onClick={() => fileInputGalleryRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Galeri HP</span>
              </button>

              {/* Shutter Button */}
              <button
                onClick={handleSnapLivePhoto}
                disabled={isProcessing}
                className="group relative w-15 h-15 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:border-white transition-all active:scale-90"
              >
                <div className="w-full h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-colors">
                  <Camera className="w-6 h-6 text-slate-950" />
                </div>
              </button>

              <button
                onClick={onClose}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Tutup
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
