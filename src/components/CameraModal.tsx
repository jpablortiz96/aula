"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraModal({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error,    setError]    = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [ready,    setReady]    = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startStream() {
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
        setError("No se encontró una cámara disponible.");
      } else {
        setError(`Error de cámara: ${msg}`);
      }
    }
  }

  useEffect(() => {
    void startStream();
    return () => stopStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stopStream();
  }

  async function retry() {
    setCaptured(null);
    await startStream();
  }

  function usePhoto() {
    if (captured) {
      onCapture(captured);
      onClose();
    }
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Tomar foto</span>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {error ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          ) : captured ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captured} alt="Captura" className="w-full rounded-lg" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => { void retry(); }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reintentar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={usePhoto}
                >
                  Usar foto
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Video preview */}
              <div className="relative bg-gray-100 rounded-lg aspect-video overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    Iniciando cámara…
                  </div>
                )}
              </div>
              <Button
                onClick={capture}
                disabled={!ready}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Capturar
              </Button>
            </div>
          )}
        </div>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
