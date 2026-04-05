import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Phone, X, MessageCircle, PhoneCall, Headphones, MoreVertical, GripVertical, Rocket, Signal } from 'lucide-react';
import { HOST_PHONE, SALTY_ASSISTANT_ID, VAPI_PUBLIC_KEY } from '../constants';

// 🔱 ELITE CONFIG: Keys from constants or env
const PUBLIC_KEY = VAPI_PUBLIC_KEY || '816607fa-e7f9-4fdf-879c-f00a5d1c8b1c';
const ASSISTANT_ID = SALTY_ASSISTANT_ID || '280fb186-f436-4b9b-ac30-48badafd3a0d';

interface SaltyHubProps {
    propertyTitle?: string;
    propertyId?: string;
}

const SaltyHub: React.FC<SaltyHubProps> = ({ propertyTitle, propertyId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapiInstance, setVapiInstance] = useState<any>(null);
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);
    const [volume, setVolume] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // 🔱 SDK DETECTOR
    useEffect(() => {
        const timer = setInterval(() => {
            const rawVapi = (window as any).vapiSDK || (window as any).Vapi || (window as any).vapi;
            if (rawVapi) {
                setIsSdkLoaded(true);
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const startVapiCall = async () => {
        setCallStatus('loading');
        try {
            const rawVapi = (window as any).vapiSDK || (window as any).Vapi || (window as any).vapi;
            if (!rawVapi) throw new Error('Motores en calibración...');

            let instance;
            if (typeof rawVapi.run === 'function') {
                instance = rawVapi.run({
                    apiKey: PUBLIC_KEY,
                    assistant: ASSISTANT_ID,
                    config: {
                        variableValues: {
                            propertyId: propertyId || 'general',
                            propertyTitle: propertyTitle || 'Villa Retiro R',
                            currentUrl: window.location.href
                        }
                    }
                });
            } else if (typeof rawVapi === 'function') {
                instance = new (rawVapi as any)(PUBLIC_KEY);
                await instance.start(ASSISTANT_ID);
            }

            if (instance) {
                instance.on('call-start', () => setCallStatus('active'));
                instance.on('call-end', () => {
                    setCallStatus('inactive');
                    setVolume(0);
                });
                instance.on('volume-level', (v: number) => setVolume(v));
                instance.on('error', (e: any) => {
                    console.error('Vapi Error:', e);
                    setCallStatus('inactive');
                });
                setVapiInstance(instance);
            }
        } catch (err: any) {
            alert(err.message);
            setCallStatus('inactive');
        }
    };

    const toggleVoice = () => {
        if (callStatus === 'active') {
            vapiInstance?.stop();
        } else {
            startVapiCall();
        }
    };

    const [activeMessage, setActiveMessage] = useState<string | null>(null);
    const [showBubble, setShowBubble] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const saltyAudioRef = useRef<HTMLAudioElement | null>(null);

    const toggleWhatsApp = () => {
        const message = propertyTitle 
            ? `¡Hola Salty! Vi "${propertyTitle}" y me interesa reservar.` 
            : '¡Hola! Quisiera información sobre Villa Retiro R.';
        const url = `https://wa.me/${HOST_PHONE}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // 🔱 VOICE ENGINE (TTS)
    const speakSalty = async (text: string) => {
        try {
            if (saltyAudioRef.current) {
                saltyAudioRef.current.pause();
                saltyAudioRef.current.currentTime = 0;
            }
            setIsTalking(true);

            const cleanText = text
                .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                .replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/_/g, '').replace(/#/g, '').replace(/`/g, '');

            const response = await fetch('/api/webhooks?source=tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                saltyAudioRef.current = audio;
                await audio.play();
                audio.onended = () => {
                    setIsTalking(false);
                    URL.revokeObjectURL(url);
                };
            }
        } catch (err) {
            console.error("TTS Error:", err);
            setIsTalking(false);
        }
    };

    // 🔱 INTENT RADAR (Event Listener)
    useEffect(() => {
        const handlePush = (e: any) => {
            const detail = e.detail;
            if (detail && detail.message) {
                setActiveMessage(detail.message);
                setShowBubble(true);
                if (detail.speak) speakSalty(detail.message);
                
                // Auto-hide bubble after 8 seconds
                setTimeout(() => setShowBubble(false), 8000);
            }
        };

        window.addEventListener('salty-push', handlePush);
        
        // Contextual greeting after 5s
        const timer = setTimeout(() => {
            if (!showBubble) {
                setActiveMessage("¡Hola! Soy Salty, su Concierge. ¿En qué puedo servirles hoy? 🔱");
                setShowBubble(true);
                setTimeout(() => setShowBubble(false), 6000);
            }
        }, 5000);

        return () => {
            window.removeEventListener('salty-push', handlePush);
            clearTimeout(timer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="fixed z-[2147483647] cursor-grab active:cursor-grabbing"
            style={{ 
                bottom: '100px', 
                right: '40px',
                touchAction: 'none' // Prevent scrolling while dragging on mobile
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="relative group">
                {/* 🔱 INTELLIGENCE BUBBLE (Salty Thinking/Talking) */}
                <AnimatePresence>
                    {showBubble && activeMessage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20, x: '-50%' }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.5, y: 10, x: '-50%' }}
                            className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[2rem] rounded-br-[4px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-20"
                        >
                            <p className="text-[11px] text-text-main font-bold leading-relaxed">
                                {activeMessage}
                            </p>
                            {/* Speech Bubble Tail */}
                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white/95 border-r border-b border-black/10 rotate-45" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Close Button (The X) */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsVisible(false)}
                    className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                >
                    <X className="w-3 h-3" />
                </motion.button>

                {/* Draggable Handle Indicator */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity text-black">
                    <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex flex-col-reverse items-center gap-4">
                    {/* Main Hub Orb */}
                    <motion.button
                        onClick={() => setIsOpen(!isOpen)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-xl border-2 transition-all duration-500 ${
                            isTalking 
                            ? 'bg-primary border-secondary shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                            : callStatus === 'active' 
                            ? 'bg-red-500/90 border-red-400' 
                            : 'bg-black/90 border-[#D4AF37]/30'
                        }`}
                    >
                        {/* Salty Avatar / Pulse */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isTalking && (
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 bg-primary/40 rounded-full"
                                />
                            )}
                            {callStatus === 'active' ? (
                                <div 
                                    className="absolute inset-0 bg-red-400/20 animate-pulse" 
                                    style={{ transform: `scale(${1 + volume * 2})`, borderRadius: '50%' }}
                                />
                            ) : !isTalking && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/10 to-transparent" />
                            )}
                                
                                <img 
                                    src="/salty-avatar.png" 
                                    alt="Salty" 
                                    className={`w-10 h-10 rounded-full object-cover border border-white/20 transition-all ${callStatus === 'active' ? 'scale-110' : ''}`}
                                    onError={(e) => {
                                        (e.target as any).src = "https://ui-avatars.com/api/?name=Salty&background=BBA27E&color=fff";
                                    }}
                                />
                            </div>

                            {/* Status Indicator Pip */}
                            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-black ${
                                isSdkLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                            }`} />
                        </motion.button>

                        {/* Expanded Radial Menu */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                    className="flex flex-col items-center gap-3 mb-2"
                                >
                                    {/* Action: Vapi Voice */}
                                    <button
                                        onClick={toggleVoice}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border backdrop-blur-xl transition-all ${
                                            callStatus === 'active' 
                                            ? 'bg-red-500 text-white border-red-400' 
                                            : 'bg-white/95 text-black border-gray-100 hover:bg-[#D4AF37] hover:text-white'
                                        }`}
                                    >
                                        {callStatus === 'active' ? <Phone className="animate-pulse" /> : <PhoneCall className="w-5 h-5" />}
                                    </button>

                                    {/* Action: WhatsApp */}
                                    <button
                                        onClick={toggleWhatsApp}
                                        className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center shadow-xl border border-gray-100 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>

                                    {/* Action: Info / Calibrating */}
                                    {!isSdkLoaded && (
                                        <div className="bg-black/80 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                            <Signal className="w-3 h-3 text-yellow-400 animate-pulse" />
                                            <span className="text-[8px] font-black uppercase text-white/70 tracking-widest">Calibrando</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
    );
};

export default SaltyHub;
