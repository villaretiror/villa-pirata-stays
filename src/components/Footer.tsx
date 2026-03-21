import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#1a1a1a] py-20 px-6 border-t border-[#BBA27E]/10">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12">
        {/* VRR Signature Icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full border border-[#BBA27E]/30 flex items-center justify-center bg-white/5 backdrop-blur-md shadow-2xl">
             <span className="font-serif italic font-black text-2xl text-[#BBA27E]">VRR</span>
          </div>
          <div>
            <h3 className="font-serif font-black text-2xl text-white tracking-tighter">Villa Retiro R</h3>
            <p className="text-[10px] uppercase font-black tracking-[0.4em] text-[#BBA27E] mt-1 opacity-70">Cabo Rojo · Puerto Rico</p>
          </div>
        </div>

        {/* Brand Mission */}
        <div className="max-w-md space-y-4">
          <p className="text-sm text-white/50 font-medium tracking-wide leading-relaxed px-6 italic">
            "Donde el lujo se encuentra con la libertad del Caribe. Cada estancia es una curaduría de momentos excepcionales en el santuario de Cabo Rojo."
          </p>
        </div>

        {/* Secondary Info & Copyright */}
        <div className="pt-12 border-t border-white/5 w-full flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Villa Retiro LLC © 2026
            </p>
            <p className="text-[9px] text-[#BBA27E] font-black uppercase tracking-[0.2em] opacity-40">
              Salty · Concierge Oficial VRR™
            </p>
          </div>
          <p className="text-[9px] text-white/30 max-w-[300px] leading-relaxed italic md:text-right">
            Esta es una marca de hospitalidad boutique exclusiva. Reservados todos los derechos de autor y propiedad intelectual.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
