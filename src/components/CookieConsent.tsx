import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('vrr-cookie-consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('vrr-cookie-consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[420px] z-[9999]"
                >
                    <div className="bg-white/70 backdrop-blur-3xl border border-white/60 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col space-y-4">
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">🍪</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-serif font-black text-secondary tracking-tight">Experiencia Personalizada</h4>
                                <p className="text-[11px] leading-relaxed text-secondary/70 font-medium mt-1">
                                    Utilizamos cookies exclusivas para que Salty pueda recordar tus preferencias y asegurar que tu reserva sea impecable. Nada más.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Link 
                                to="/privacy" 
                                className="text-[10px] uppercase font-black tracking-widest text-primary/60 hover:text-primary transition-colors border-b border-primary/20 pb-0.5"
                                onClick={() => setIsVisible(false)}
                            >
                                Saber más
                            </Link>
                            <button 
                                onClick={handleAccept}
                                className="bg-secondary text-white text-[10px] uppercase font-black tracking-widest px-6 py-3 rounded-full hover:bg-primary transition-all duration-300 shadow-lg shadow-secondary/20"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
