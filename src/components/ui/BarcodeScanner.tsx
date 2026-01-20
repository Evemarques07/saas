import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import CloseIcon from '@mui/icons-material/Close';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { Button } from './Button';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    // Initialize reader
    readerRef.current = new BrowserMultiFormatReader();

    // Get available cameras
    navigator.mediaDevices.enumerateDevices()
      .then((allDevices: MediaDeviceInfo[]) => {
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length === 0) {
          setError('Nenhuma câmera encontrada');
          return;
        }
        setDevices(videoDevices);
        // Prefer back camera
        const backCameraIndex = videoDevices.findIndex(
          (d: MediaDeviceInfo) => d.label.toLowerCase().includes('back') ||
                 d.label.toLowerCase().includes('traseira') ||
                 d.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceIndex(backCameraIndex >= 0 ? backCameraIndex : 0);
      })
      .catch((err: Error) => {
        console.error('Error listing devices:', err);
        setError('Erro ao acessar câmera');
      });

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && devices.length > 0 && !scanning) {
      startScanning();
    }
  }, [isOpen, devices, selectedDeviceIndex]);

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || devices.length === 0) return;

    setScanning(true);
    setError(null);

    try {
      const selectedDevice = devices[selectedDeviceIndex];

      await readerRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            // Play success sound
            playBeep();
            onScan(code);
            onClose();
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error('Scan error:', err);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Erro ao iniciar câmera. Verifique as permissões.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
  };

  const switchCamera = () => {
    stopScanning();
    setSelectedDeviceIndex((prev) => (prev + 1) % devices.length);
  };

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not supported
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white bg-black/50">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <QrCodeScannerIcon />
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={startScanning}>Tentar Novamente</Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-40 border-2 border-white/70 rounded-lg relative">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br" />

                {/* Scanning line animation */}
                <div className="absolute inset-x-2 h-0.5 bg-primary-500 animate-pulse top-1/2" />
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-24 left-0 right-0 text-center text-white text-sm">
              Posicione o código de barras dentro da área
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/50 flex items-center justify-center gap-4">
        {devices.length > 1 && (
          <Button
            variant="secondary"
            onClick={switchCamera}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <FlipCameraIosIcon className="w-5 h-5 mr-2" />
            Trocar Câmera
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook para usar o scanner de código de barras
 */
export function useBarcodeScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [onScanCallback, setOnScanCallback] = useState<((code: string) => void) | null>(null);

  const openScanner = (callback: (code: string) => void) => {
    setOnScanCallback(() => callback);
    setIsOpen(true);
  };

  const closeScanner = () => {
    setIsOpen(false);
    setOnScanCallback(null);
  };

  const handleScan = (code: string) => {
    if (onScanCallback) {
      onScanCallback(code);
    }
    closeScanner();
  };

  return {
    isOpen,
    openScanner,
    closeScanner,
    handleScan,
    ScannerComponent: () => (
      <BarcodeScanner
        isOpen={isOpen}
        onClose={closeScanner}
        onScan={handleScan}
      />
    ),
  };
}
