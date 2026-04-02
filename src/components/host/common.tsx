import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🌀 LOADING SPINNER
 * Premium full-screen overlay for dashboard transitions.
 */
export const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 z-[110] bg-white/10 backdrop-blur-md flex items-center justify-center transition-all">
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-[6px] border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-[6px] border-primary rounded-full border-t-transparent animate-spin shadow-lg" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-main animate-pulse">Sincronizando Bitácora...</p>
    </div>
  </div>
);

/**
 * 🍞 CUSTOM TOAST (Flash Notification)
 */
export const CustomToast: React.FC = () => (
  <div id="custom-toast" className="fixed top-12 left-1/2 -translate-x-1/2 z-[150] transition-all duration-700 pointer-events-none transform translate-y-[-100%] opacity-0">
    <div className="bg-black/90 backdrop-blur-xl text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 border border-white/10 min-w-max">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
        <span className="material-icons text-white text-sm">notifications_active</span>
      </div>
      <p id="toast-message" className="text-[11px] font-black uppercase tracking-widest"></p>
    </div>
  </div>
);

/**
 * 🏷️ SOURCE BADGE
 * Standardizes source attribution icons across the UI.
 */
export const getSourceBadge = (source: string = 'web') => {
  const s = source.toLowerCase();
  
  if (s.includes('airbnb')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FF385C]/5 border border-[#FF385C]/10 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF385C]" />
        <span className="text-[8px] font-black uppercase tracking-widest text-[#FF385C]">Airbnb</span>
      </div>
    );
  }
  
  if (s.includes('booking')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#003580]/5 border border-[#003580]/10 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-[#003580]" />
        <span className="text-[8px] font-black uppercase tracking-widest text-[#003580]">Booking</span>
      </div>
    );
  }
  
  if (s.includes('salty_rescue') || s.includes('direct')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-widest text-primary">Salty Direct</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Web</span>
    </div>
  );
};
