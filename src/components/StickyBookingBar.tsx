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
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      
      // 🔱 FORM-STEALTH LOGIC: Hide when near the bottom (Contact/Lead forms)
      const isNearEnd = scrollY + windowHeight > fullHeight - 450;
      
      if (scrollY > 800 && !isNearEnd) {
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
          className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] z-[100] md:bottom-10 md:w-[500px]"
        >
          <div className="bg-secondary/95 backdrop-blur-3xl rounded-[2.5rem] md:rounded-full py-6 md:py-8 px-6 md:px-10 shadow-bunker border border-white/5 flex items-center justify-between gap-4 md:gap-8">
            <div className="pl-1 md:pl-2 py-1 max-w-[150px] md:max-w-none">
              <p className="text-[8px] md:text-[10px] font-semibold uppercase opacity-80 tracking-[0.25em] text-primary mb-0.5 md:mb-1 leading-none">Reserva Directa</p>
              <h4 className="text-white font-serif font-bold text-sm md:text-xl truncate leading-tight tracking-wider uppercase">{villaName}</h4>
            </div>
            
            <button
              onClick={onAction}
              className="bg-primary text-secondary px-5 md:px-6 py-4 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] md:text-[11px] flex items-center gap-2 md:gap-3 shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all outline outline-2 outline-white/5 whitespace-nowrap"
            >
              <span>RESERVAR AHORA</span>
              <Compass size={14} className="md:w-[16px]" />
            </button>
          </div>
          
          {/* Subtle Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-primary/20 rounded-[2.5rem] md:rounded-full blur-lg -z-10 opacity-30"></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyBookingBar;
