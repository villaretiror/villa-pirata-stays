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
          <div className="bg-secondary/95 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] py-4 md:py-8 px-6 md:px-10 shadow-bunker border border-white/10 flex items-center justify-between gap-4 md:gap-8">
            <div className="pl-2 md:pl-4 py-1">
              <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-white/40 mb-1 md:mb-2 leading-none">Villa Retiro LLC</p>
              <h4 className="text-white font-serif font-bold text-lg md:text-2xl truncate leading-tight tracking-tight">{villaName}</h4>
            </div>
            
            <button
              onClick={onAction}
              className="bg-primary text-secondary px-5 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[1.75rem] font-black uppercase tracking-wider md:tracking-widest text-[10px] md:text-[11px] flex items-center gap-2 md:gap-3 shadow-lg shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all outline outline-4 outline-white/5 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Reservar Ahora</span>
              <span className="sm:hidden">Reservar</span>
              <Compass size={16} className="md:w-[18px]" />
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
