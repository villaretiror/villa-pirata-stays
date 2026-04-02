import React, { useState } from 'react';

interface ImportModalProps {
  onClose: () => void;
  onImport: (url: string) => void;
}

/**
 * 🪄 IMPORT MODAL
 * Multi-platform property importer (Airbnb / Booking.com)
 */
export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImportClick = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      await onImport(url);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif font-black italic text-xl tracking-tighter">Importar Anuncio</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-icons text-gray-400">close</span>
          </button>
        </div>

        <p className="text-sm text-text-light mb-4 leading-relaxed">
          Pega el enlace de <span className="font-bold text-red-500">Airbnb</span> o <span className="font-bold text-blue-600">Booking.com</span> para rellenar los datos automáticamente.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <span className="material-icons absolute left-3 top-3 text-gray-400">link</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://airbnb.com/h/..."
              className="w-full pl-10 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
            />
          </div>

          <button
            onClick={handleImportClick}
            disabled={!url || isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#FF385C] to-[#E61E4D] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Extrayendo datos básicos...
              </>
            ) : (
              <>
                <span className="material-icons text-sm">auto_fix_high</span>
                Importar Mágicamente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
