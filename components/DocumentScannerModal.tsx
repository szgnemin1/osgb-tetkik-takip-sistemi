import React, { useState, useRef } from 'react';
import { X, Printer, Upload, AlertCircle } from 'lucide-react';

interface DocumentScannerModalProps {
  onClose: () => void;
  onScanComplete: (fileUrl: string) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ onClose, onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      if (window && (window as any).electronAPI && (window as any).electronAPI.scanDocument) {
        const base64Image = await (window as any).electronAPI.scanDocument();
        onScanComplete(base64Image);
      } else {
        throw new Error("Masaüstü uygulamasına (.exe) bağlı değilsiniz. Tarama emri web üzerinden verilemez, lütfen dosya seçin.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Tarama gerçekleştirilemedi.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onScanComplete(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Printer className="w-5 h-5 mr-2 text-blue-500" />
            Yazıcıdan Kimlik Tarama
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
          
          <div className="relative">
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${isScanning ? 'border-blue-500 animate-pulse' : 'border-slate-600 bg-slate-700'}`}>
              <Printer className={`w-10 h-10 ${isScanning ? 'text-blue-500' : 'text-slate-400'}`} />
            </div>
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 rounded-full animate-spin"></div>
            )}
          </div>
          
          <div>
            <h4 className="text-slate-200 font-bold mb-2">
              {isScanning ? 'Cihazla Bağlantı Kuruluyor...' : 'Belgeyi Tarayıcıya Yerleştirin'}
            </h4>
            <p className="text-sm text-slate-400">
              Cihazınızın tarama alanına kimliği yerleştiriniz. Devam etmek için Tara butonuna basın veya önceden taradığınız dosyayı seçin.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-start text-left">
               <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
               <span>{error}</span>
            </div>
          )}

          <div className="w-full space-y-3">
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Printer className="w-5 h-5 mr-2" />
              Taramayı Başlat
            </button>
            
            <div className="relative flex items-center justify-center py-2">
               <div className="border-t border-slate-700 w-full"></div>
               <span className="absolute bg-slate-800 px-3 text-xs text-slate-500 uppercase">Veya</span>
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center"
            >
              <Upload className="w-5 h-5 mr-2" />
              Bilgisayardan Seç
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,.pdf" 
              onChange={handleFileUpload} 
            />
          </div>

        </div>
      </div>
    </div>
  );
};
