import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Zap } from 'lucide-react';

interface StickyBookingBarProps {
  villaName: string;
  onAction: () => void;
}

const StickyBookingBar: React.FC<StickyBookingBarProps> = ({ villaName, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after 800px of scroll
      if (window.scrollY > 800) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-4 right-4 z-[100] md:left-1/2 md:-translate-x-1/2 md:bottom-10 md:w-[600px]"
        >
          <div className="bg-secondary/95 backdrop-blur-xl rounded-[2.5rem] p-4 shadow-bunker border border-white/10 flex items-center justify-between gap-4">
            <div className="pl-6 py-2 overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1 leading-none">Villa Retiro LLC</p>
              <h4 className="text-white font-serif font-bold text-lg truncate leading-tight">{villaName}</h4>
            </div>
            
            <button
              onClick={onAction}
              className="bg-primary text-secondary px-8 py-5 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-lg shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all outline outline-4 outline-white/5"
            >
              <span className="hidden sm:inline">Reservar Ahora</span>
              <span className="sm:hidden">Reservar</span>
              <Compass size={18} />
            </button>
          </div>
          
          {/* Subtle Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/40 rounded-[3rem] blur-xl -z-10 opacity-50"></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyBookingBar;
