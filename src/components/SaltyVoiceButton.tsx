import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Signal, SignalLow, Activity } from 'lucide-react';

// 🔱 ELITE BYPASS: Usamos el SDK desde el CDN cargado en index.html
// Esto evita que Rollup falle en Vercel.
// 🔱 SMART ENGINE: Dynamic lookup with Hardcoded Fallbacks (Pocket Keys)
const SALTY_ASSISTANT_ID = import.meta.env.VITE_VAPI_ID || '280fb186-f436-4b9b-ac30-48badafd3a0d';
const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '816607fa-e7f9-4fdf-879c-f00a5d1c8b1c';

const SaltyVoiceButton: React.FC = () => {
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapiInstance, setVapiInstance] = useState<any>(null);
    const [volume, setVolume] = useState(0);
    const [propertyId, setPropertyId] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    // 🔱 DETECT CONTEXT (Property ID from URL)
    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        // IDs are either numeric (8+ chars) or UUIDs (36 chars)
        const id = pathParts.find(part => 
            (!isNaN(Number(part)) && part.length >= 8) || 
            (part.length > 30) // UUID check
        );
        if (id) {
            console.log(`[Salty context] Property ID detected: ${id}`);
            setPropertyId(id);
        }
    }, [window.location.pathname]);

    useEffect(() => {
        // Intentar inicializar Vapi desde el objeto global
        const initVapi = () => {
            const rawVapi = (window as any).Vapi || (window as any).vapi || (window as any).vapiSDK;
            const VapiConstructor = rawVapi?.default || rawVapi;

            if (VapiConstructor && typeof VapiConstructor === 'function' && !vapiInstance) {
                const instance = new VapiConstructor(PUBLIC_KEY);
                
                instance.on('call-start', () => {
                    setCallStatus('active');
                    setShowTooltip(true);
                });
                instance.on('call-end', () => {
                    setCallStatus('inactive');
                    setVolume(0);
                    setTimeout(() => setShowTooltip(false), 3000);
                });
                instance.on('volume-level', (level: number) => {
                    setVolume(level);
                });
                instance.on('error', (err: any) => {
                    console.error('Vapi Error:', err);
                    setCallStatus('inactive');
                    setVolume(0);
                });

                setVapiInstance(instance);
            }
        };

        const timer = setInterval(() => {
            if ((window as any).Vapi) {
                initVapi();
                clearInterval(timer);
            }
        }, 500);

        return () => {
            clearInterval(timer);
            if (vapiInstance) vapiInstance.stop();
        };
    }, [vapiInstance]);

    const startVapiCall = async (libInstance: any) => {
        setCallStatus('loading');
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Navegador no compatible con voz. Use Chrome o Safari. ⚓');
                setCallStatus('inactive');
                return;
            }

            // 🔱 CONTEXT INJECTION: Tell Salty where we are!
            await libInstance.start(SALTY_ASSISTANT_ID, {
                assistantOverrides: {
                    variableValues: {
                        propertyId: propertyId || '1081171030449673920',
                        currentPath: window.location.pathname,
                        currentUrl: window.location.href
                    }
                }
            });
            console.log('Salty Voice Context Unified! 🔱');
        } catch (err: any) {
            console.error('Failed to start call:', err);
            alert(`Error al iniciar llamada: ${err.message || 'Verifique el micro'}. 🎙️`);
            setCallStatus('inactive');
        }
    };

    const toggleCall = async () => {
        let activeInstance = vapiInstance;
        if (!activeInstance) {
            const rawVapi = (window as any).Vapi || (window as any).vapi || (window as any).vapiSDK;
            const VapiConstructor = rawVapi?.default || rawVapi;
            if (VapiConstructor) {
                activeInstance = new VapiConstructor(PUBLIC_KEY);
                setVapiInstance(activeInstance);
            } else {
                alert('Motores calibrándose. Reintentar. 🔱⚓');
                return;
            }
        }

        if (callStatus === 'active') {
            activeInstance.stop();
        } else {
            await startVapiCall(activeInstance);
        }
    };

    return (
        <div className="fixed bottom-64 md:bottom-28 right-6 md:right-12 z-[9999999] flex flex-col items-center gap-4">
            
            <AnimatePresence>
                {(showTooltip || callStatus === 'active') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full mb-6 whitespace-nowrap"
                    >
                        <div className="bg-black/80 backdrop-blur-xl border border-primary/20 rounded-2xl px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-1.5 relative">
                            {/* Speech Triangle (Pin) */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/80"></div>
                            
                            <div className="flex items-center gap-3">
                                {callStatus === 'active' ? (
                                    <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                ) : (
                                    <Signal className="w-3.5 h-3.5 text-[#D4AF37]" />
                                )}
                                <span className={`${callStatus === 'active' ? 'text-red-400' : 'text-[#D4AF37]'} text-[10px] font-black uppercase tracking-[0.2em]`}>
                                    {callStatus === 'active' ? 'Conectado con Salty' : 'Concierge de Voz Directo'}
                                </span>
                            </div>
                            
                            <div className="flex flex-col items-center border-t border-white/5 pt-1.5 w-full">
                                <span className="text-[11px] font-bold text-white tracking-widest font-mono">
                                    209-267-3503
                                </span>
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.15em] mt-0.5">
                                    Vapi Intelligence Engine
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative group">
                {/* 🔱 ELITE GLOW: Reactive to current volume! */}
                <div 
                    className={`absolute inset-[-15px] bg-primary/20 rounded-full blur-2xl transition-all duration-75 pointer-events-none ${callStatus === 'active' ? 'opacity-100 scale-125' : 'opacity-0 scale-0'}`}
                    style={{ 
                        transform: `scale(${1 + volume * 2})`,
                        boxShadow: `0 0 ${volume * 60}px ${volume * 30}px rgba(212, 175, 55, 0.4)`
                    }}
                ></div>

                <button
                    onClick={toggleCall}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => callStatus !== 'active' && setShowTooltip(false)}
                    disabled={callStatus === 'loading'}
                    className={`group relative p-6 rounded-full transition-all duration-500 shadow-2xl border-2 flex items-center justify-center ${
                        callStatus === 'active' 
                            ? 'bg-secondary border-red-500 text-red-500' 
                            : 'bg-primary border-white/20 text-secondary'
                    } ${callStatus === 'loading' ? 'opacity-70 scale-95 cursor-wait' : 'hover:scale-110 active:scale-90 scale-100'}`}
                >
                    {callStatus === 'loading' ? (
                        <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                    ) : (
                        callStatus === 'active' ? <PhoneOff className="w-7 h-7" /> : <Phone className="w-7 h-7" />
                    )}
                    
                    {/* Status Pip */}
                    <div className={`absolute top-0 right-1 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-colors z-20 ${callStatus === 'active' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                </button>
            </div>
        </div>
    );
};

export default SaltyVoiceButton;

