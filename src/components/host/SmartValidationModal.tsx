import React from 'react';

interface SmartValidationModalProps {
  data: any;
  onConfirm: (d: any) => void;
  onClose: () => void;
}

/**
 * 🛡️ SMART VALIDATION MODAL
 * High-precision validation for manual payments (ATH Móvil) and imported data.
 */
export const SmartValidationModal: React.FC<SmartValidationModalProps> = ({ data, onConfirm, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-3xl animate-scale-up border border-white/20">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <h3 className="text-2xl font-serif font-black italic text-text-main leading-tight tracking-tighter">Validación Elite Salty</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all">
            <span className="material-icons text-gray-400">close</span>
          </button>
        </div>

        <div className="bg-[#0A0D14] p-8 rounded-[2rem] border border-white/5 mb-8 shadow-inner overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5">
             <span className="material-icons text-white text-6xl">data_object</span>
          </div>
          <pre className="whitespace-pre-wrap font-mono uppercase tracking-tighter text-[9px] text-primary/80 max-h-[40vh] overflow-y-auto no-scrollbar selection:bg-primary/20">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
          >
            Descartar
          </button>
          <button
            onClick={() => onConfirm(data)}
            className="flex-[2] py-5 text-[10px] font-black uppercase tracking-[0.4em] text-white bg-primary rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            Confirmar e Importar 🔱
          </button>
        </div>
      </div>
    </div>
  );
};
