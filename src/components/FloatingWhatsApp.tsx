import React, { useState } from 'react';
import { HOST_PHONE } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingWhatsAppProps {
  propertyTitle?: string;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ propertyTitle }) => {
  const [hovered, setHovered] = useState(false);

  const message = propertyTitle
    ? `¡Hola! Vi la propiedad "${propertyTitle}" y me encantaría reservar mi estancia.`
    : '¡Hola! Quisiera conocer las fechas disponibles en Villa Retiro R.';

  const whatsappUrl = `https://wa.me/${HOST_PHONE}?text=${encodeURIComponent(message)}`;

  return (
    <AnimatePresence>
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 22 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // 🔱 Unified right-side cluster: sits below the voice button (bottom-48 mobile)
        className="fixed bottom-48 md:bottom-20 right-6 md:right-12 z-[9999997] group"
      >
        <div className="relative">
          {/* Tooltip label */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-xl border border-white/10 pointer-events-none"
              >
                {propertyTitle ? '¡Reserva Ahora!' : 'Escríbenos'}
                <div className="absolute left-full top-1/2 -translate-y-1/2 border-l-[6px] border-l-black/80 border-y-[5px] border-y-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Button */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="w-12 h-12 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/30 border border-white/20 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
          </motion.div>
        </div>
      </motion.a>
    </AnimatePresence>
  );
};

export default FloatingWhatsApp;