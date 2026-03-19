import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface SaltyToastProps {
    propertyId?: string;
    propertyTitle?: string;
    amenities?: string[];
}

const SaltyToast: React.FC<SaltyToastProps> = ({ propertyId, propertyTitle, amenities }) => {
    const [showBubble, setShowBubble] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // 🔱 SALTY'S DYNAMIC BRAIN: Contextual prompts by Brian's Logic
    const getContextualPill = () => {
        const path = location.pathname;
        
        // 1. Home / General
        if (path === '/') return "¿Buscando el mejor precio? Reserva aquí conmigo y ahórrate el 15% de comisión que cobran otras plataformas. ¡Para más mofongos!";
        
        // 2. Property Details (Experience Sale)
        if (path.includes('/property')) {
            const title = propertyTitle || "esta villa";
            if (title.includes('Retiro')) return `En Villa Retiro R el patio es verjado y seguro para tu mascota. Además, tenemos energía solar de backup por si falla la red externa. 🔱`;
            if (title.includes('Pirata')) return `Pirata House es ideal para la familia. El patio es abierto, así que pedimos supervisión constante de las mascotas. ✨`;
            return `¿Te imaginas despertar en ${title}? Wifi de alta velocidad y respaldo solar para que nada apague tu vibra.`;
        }
        
        // 3. Booking / Checkout (Trust Closure)
        if (path.includes('/booking') || path.includes('/reservation')) {
            return "Tranquilo, el depósito de garantía es 100% reembolsable tras tu salida. ¡Reserva con total paz mental!";
        }

        return "¡Hola! Soy Salty. Estoy aquí para que tu estancia en Cabo Rojo sea histórica. ¿Alguna duda?";
    };

    useEffect(() => {
        // Delay Salty's entry for a "Premium" feel
        const timer = setTimeout(() => {
            setMessage(getContextualPill());
            setShowBubble(true);
            setIsMinimized(false);
        }, 3000);

        // Auto-minimize after 10 seconds to reduce screen clutter
        const autoMin = setTimeout(() => {
            setShowBubble(false);
            setIsMinimized(true);
        }, 13000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoMin);
        };
    }, [location.pathname, propertyTitle]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
            {/* 💬 Salty's Speech Bubble */}
            <AnimatePresence>
                {showBubble && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10, x: 10 }}
                        className="pointer-events-auto max-w-[280px] lg:max-w-xs mb-2"
                    >
                        <div 
                            className="bg-white/95 backdrop-blur-xl border border-black/5 p-4 rounded-[28px] rounded-br-[4px] shadow-2xl relative"
                            onClick={() => navigate('/messages', { state: { property_id: propertyId } })}
                        >
                            {/* Close Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowBubble(false); setIsMinimized(true); }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-md rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-colors"
                            >
                                <span className="material-icons text-xs">close</span>
                            </button>

                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
                                🔱 Salty Concierge ✨
                            </p>
                            <p className="text-[13px] text-text-main font-semibold leading-relaxed tracking-tight cursor-pointer">
                                {message}
                            </p>
                            
                            {/* Indicator Triangle */}
                            <div className="absolute bottom-0 right-4 w-4 h-4 bg-white/95 rotate-45 translate-y-2 border-r border-b border-black/5"></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🔱 The Persistent Avatar (The "Anchor") */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (showBubble) navigate('/messages');
                    else {
                        setMessage(getContextualPill());
                        setShowBubble(true);
                        setIsMinimized(false);
                    }
                }}
                className={`pointer-events-auto cursor-pointer relative group`}
            >
                {/* Visual "Living" Pulse */}
                {!showBubble && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-110"></div>
                )}
                
                <div className={`w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-[#FF8A66] flex items-center justify-center text-white shadow-2xl border-4 border-white transition-all duration-500 ${isMinimized ? 'opacity-90 grayscale-[0.2]' : 'opacity-100'}`}>
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🔱</span>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </motion.div>
        </div>
    );
};

export default SaltyToast;
