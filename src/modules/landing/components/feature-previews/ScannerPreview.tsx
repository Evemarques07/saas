import { useState, useEffect } from 'react';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const scannedProduct = {
  barcode: '7891234567890',
  name: 'Base Liquida Matte FPS30',
  brand: 'Vult',
  category: 'Maquiagem',
  suggestedPrice: 54.90,
};

type ScanState = 'ready' | 'scanning' | 'scanned' | 'saved';

export function ScannerPreview() {
  const [state, setState] = useState<ScanState>('ready');
  const [scanProgress, setScanProgress] = useState(0);
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (state === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setState('scanned');
            setPrice(scannedProduct.suggestedPrice.toFixed(2));
            return 100;
          }
          return prev + 5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleScan = () => {
    setState('scanning');
    setScanProgress(0);
  };

  const handleSave = () => {
    setState('saved');
  };

  const handleReset = () => {
    setState('ready');
    setScanProgress(0);
    setPrice('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Scanner Viewfinder */}
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-4" style={{ height: '200px' }}>
        {/* Fake camera background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full" style={{
              backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255,255,255,.05) 25%, rgba(255,255,255,.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.05) 75%, rgba(255,255,255,.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255,.05) 25%, rgba(255,255,255,.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.05) 75%, rgba(255,255,255,.05) 76%, transparent 77%, transparent)',
              backgroundSize: '40px 40px',
            }} />
          </div>
        </div>

        {/* Barcode visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-0.5 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="bg-white"
                style={{
                  width: Math.random() > 0.5 ? '2px' : '3px',
                  height: '40px',
                  opacity: state === 'scanning' || state === 'scanned' ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Scanner corners */}
        <div className="absolute inset-8 pointer-events-none">
          {/* Top left */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
          {/* Top right */}
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
          {/* Bottom left */}
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
          {/* Bottom right */}
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />
        </div>

        {/* Scanning line animation */}
        {state === 'scanning' && (
          <div
            className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"
            style={{
              top: `${30 + (scanProgress / 100) * 40}%`,
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
            }}
          />
        )}

        {/* Status overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          {state === 'ready' && (
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
              <p className="text-white text-sm">Posicione o codigo de barras</p>
            </div>
          )}
          {state === 'scanning' && (
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm">Escaneando...</span>
                <span className="text-white text-sm">{scanProgress}%</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
          {(state === 'scanned' || state === 'saved') && (
            <div className="bg-green-500/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-white" />
              <span className="text-white text-sm font-medium">Produto encontrado!</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Form */}
      {(state === 'scanned' || state === 'saved') && (
        <div className="flex-1 space-y-3 animate-fade-in">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <label className="text-xs text-gray-500 dark:text-gray-400">Codigo de Barras</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{scannedProduct.barcode}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <label className="text-xs text-gray-500 dark:text-gray-400">Nome do Produto</label>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{scannedProduct.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
              <label className="text-xs text-gray-500 dark:text-gray-400">Marca</label>
              <p className="text-sm text-gray-900 dark:text-white">{scannedProduct.brand}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
              <label className="text-xs text-gray-500 dark:text-gray-400">Categoria</label>
              <p className="text-sm text-gray-900 dark:text-white">{scannedProduct.category}</p>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800">
            <label className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Preco de Venda</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500">R$</span>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={state === 'saved'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {state === 'ready' && (
          <button
            onClick={handleScan}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <CameraAltIcon className="h-5 w-5" />
            Escanear Produto
          </button>
        )}

        {state === 'scanned' && (
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <SaveIcon className="h-5 w-5" />
            Salvar Produto
          </button>
        )}

        {state === 'saved' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-3">
              <CheckCircleIcon className="h-5 w-5" />
              Produto Salvo!
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <RestartAltIcon className="h-4 w-4" />
              Escanear outro produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
