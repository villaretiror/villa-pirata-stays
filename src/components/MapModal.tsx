import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Compass, Navigation } from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  villaName: string;
  mapUrl?: string;
  distance?: string;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, placeName, villaName, mapUrl, distance }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-serif font-bold text-text-main leading-tight">{placeName}</h3>
                <p className="text-xs text-text-light font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                  <span className="text-primary">📍</span> Cercanía Estratégica
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            {/* Map Placeholder / Iframe */}
            <div className="relative aspect-video bg-sand/30 overflow-hidden group">
              {mapUrl ? (
                 <iframe 
                    title="Map"
                    src={mapUrl.replace('view?usp=sharing', 'preview').replace('/maps/place/', '/maps/embed/v1/place?key=STATIC_OR_BROWSER_URL&q=')}
                    className="w-full h-full border-0 grayscale-[0.2]"
                    allowFullScreen
                    loading="lazy"
                 ></iframe>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 text-primary animate-bounce">
                    <MapPin size={40} />
                  </div>
                  <p className="text-lg font-serif italic text-text-main mb-2">"A solo {distance} del paraíso."</p>
                  <p className="text-sm text-text-light max-w-xs uppercase tracking-widest font-black opacity-60">Visualizando conexión geográfica...</p>
                </div>
              )}
              
              {/* Floating Pins Overlay (Visual representation) */}
              <div className="absolute inset-x-8 bottom-8 flex flex-col gap-3">
                 <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-white/50 transform -translate-y-2 translate-x-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Navigation size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary leading-none mb-1">Tu Villa</p>
                        <p className="font-bold text-text-main text-sm">{villaName}</p>
                    </div>
                 </div>
                 <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-white/50 translate-x-8 -translate-y-4">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                        <Compass size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-secondary leading-none mb-1">Destino</p>
                        <p className="font-bold text-text-main text-sm">{placeName}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Summary / Action */}
            <div className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-sand/30 rounded-[2rem] border border-primary/20/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-secondary shadow-soft">
                            <Navigation size={24} />
                        </div>
                        <div>
                            <p className="font-black text-[10px] uppercase tracking-widest text-secondary mb-1">Tiempo de Llegada</p>
                            <p className="font-bold text-text-main">{distance || '5-15 min'} en auto</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => mapUrl && window.open(mapUrl, '_blank')}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-semibold uppercase tracking-[0.25em] opacity-80 text-[11px] hover:scale-[1.05] active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Abrir GPS en Google Maps
                    </button>
                </div>
                
                <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light opacity-60">
                        Cabo Rojo Experience · Villa Retiro & Pirata Stays
                    </p>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MapModal;
