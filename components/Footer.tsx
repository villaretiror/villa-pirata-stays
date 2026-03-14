
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-sand border-t border-gray-100 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-2xl">sailing</span>
            <span className="font-serif font-black text-xl tracking-tight text-text-main">Salty</span>
          </div>
          <p className="text-xs text-text-light font-medium tracking-wide">
            Viviendo la libertad en Cabo Rojo, Puerto Rico.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end space-y-1 text-center md:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">
            Propiedad Intelectual de Villa Retiro LLC © 2026
          </p>
          <p className="text-[9px] text-text-light/60 max-w-[250px] leading-relaxed italic">
            Salty™ es una marca de Villa Retiro LLC. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
