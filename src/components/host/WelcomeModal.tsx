import React from 'react';
import { showToast } from '../../utils/toast';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

/**
 * 💌 WELCOME MODAL
 * Helper to copy personalized welcome messages for guests.
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-scale-up border border-white/10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-serif font-black italic text-text-main leading-tight tracking-tighter">Mensaje de Bienvenida</h3>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all">
            <span className="material-icons text-gray-400">close</span>
          </button>
        </div>

        <div className="bg-sand/30 p-8 rounded-3xl border border-primary/20 mb-8 font-medium text-sm text-text-main leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto custom-scrollbar italic">
          {message}
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(message);
            showToast("¡Mensaje copiado al portapapeles! 📋");
          }}
          className="w-full bg-black text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-gray-800 active:scale-95 transition-all shadow-xl shadow-black/20"
        >
          <span className="material-icons text-base">content_copy</span> Copiar Copiado Estratégico
        </button>
      </div>
    </div>
  );
};
