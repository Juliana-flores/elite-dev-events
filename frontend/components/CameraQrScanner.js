'use client';

import { useEffect, useRef, useState } from 'react';

export default function CameraQrScanner({ onScan, onError, isScanning = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let localStream = null;
    const videoElement = videoRef.current;

    if (!isScanning) {
      return;
    }

    const initCamera = async () => {
      if (
        typeof window === 'undefined' ||
        !navigator?.mediaDevices?.getUserMedia
      ) {
        const msg = 'Câmera não suportada neste dispositivo ou navegador.';
        if (!cancelled) {
          setCameraError(msg);
          if (onError) onError(msg);
        }
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = mediaStream;
        streamRef.current = mediaStream;

        if (videoElement) {
          videoElement.srcObject = mediaStream;
          await videoElement.play().catch(() => {});
          if (!cancelled) {
            setCameraActive(true);
            setCameraError(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        let msg = 'Não foi possível acessar a câmera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador ou use o código manual.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Nenhuma câmera encontrada no dispositivo. Utilize a digitação manual.';
        }
        setCameraError(msg);
        if (onError) onError(msg);
      }
    };

    void initCamera();

    return () => {
      cancelled = true;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
      setCameraActive(false);
    };
  }, [isScanning, onError, retryCount]);

  // Barcode Detection loop
  useEffect(() => {
    if (!cameraActive || !isScanning) return;

    let isDetecting = false;
    let detector = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      if (!isDetecting && detector) {
        isDetecting = true;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const rawCode = barcodes[0].rawValue.trim();
            if (rawCode) {
              onScan(rawCode);
              return;
            }
          }
        } catch {
          // Frame detection glitch, continue next frame
        } finally {
          isDetecting = false;
        }
      }

      animFrameRef.current = requestAnimationFrame(checkFrame);
    };

    animFrameRef.current = requestAnimationFrame(checkFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraActive, isScanning, onScan]);

  return (
    <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-indigo-500/40 bg-zinc-950 shadow-2xl">
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="h-full w-full object-cover"
      />

      {cameraActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Target reticle */}
          <div className="relative h-48 w-48 rounded-2xl border-2 border-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

            {/* Laser scanning line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" />
          </div>

          <p className="absolute bottom-4 text-[11px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
            Posicione o QR Code no quadro
          </p>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 space-y-3">
          <span className="text-3xl">📷❌</span>
          <p className="text-xs text-rose-300 font-medium leading-relaxed">
            {cameraError}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {!cameraActive && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Iniciando câmera...</p>
        </div>
      )}
    </div>
  );
}
