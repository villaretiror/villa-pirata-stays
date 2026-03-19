import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SaltyToastProps {
    propertyId?: string;
    propertyTitle?: string;
    amenities?: string[];
}

const SaltyToast: React.FC<SaltyToastProps> = ({ propertyId, propertyTitle, amenities }) => {
    const [show, setShow] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const suggestions = [
        "¿Sabías que si reservas conmigo aquí mismo te ahorras ese 15% de comisión? Así sobra para los mofongos.",
        "¡Ey! Soy Salty. Si estás buscando fechas y no te cuadran, avísame y buscamos un hueco.",
        "¿Planes de playa? Buyé está espectacular esta semana, ¡te lo digo yo!",
        "Aquí la luz no se va, capitán. Tenemos generador 24/7 para que nada apague tu vibra.",
    ];

    useEffect(() => {
        const handleCustomMessage = (event: any) => {
            if (event.detail?.message) {
                setMessage(event.detail.message);
                setShow(true);
            }
        };

        window.addEventListener('salty-push', handleCustomMessage);

        const timer = setTimeout(() => {
            if (propertyTitle && amenities) {
                const topAmenity = amenities.find(a => a.includes('Piscina') || a.includes('BBQ') || a.includes('WiFi')) || amenities[0];
                setMessage(`Salty dice: "En ${propertyTitle} tienes ${topAmenity} esperándote. ¿Te imaginas?"`);
            } else {
                setMessage(`Salty dice: "${suggestions[Math.floor(Math.random() * suggestions.length)]}"`);
            }
            setShow(true);
        }, 5000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('salty-push', handleCustomMessage);
        };
    }, [propertyTitle]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="fixed bottom-28 left-6 right-6 lg:left-auto lg:right-6 lg:w-80 z-[100] pointer-events-none"
                >
                    <div
                        onClick={() => navigate('/messages', { state: { property_id: propertyId } })}
                        className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-primary/20 p-4 rounded-3xl shadow-2xl flex items-start gap-3 cursor-pointer hover:scale-[1.02] transition-transform group"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-[#FF8A66] flex-shrink-0 flex items-center justify-center text-white shadow-md">
                            <span className="material-icons text-xl">auto_awesome</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 flex justify-between">
                                Salty Concierge
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShow(false); }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <span className="material-icons text-xs">close</span>
                                </button>
                            </p>
                            <p className="text-xs text-text-main font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SaltyToast;
