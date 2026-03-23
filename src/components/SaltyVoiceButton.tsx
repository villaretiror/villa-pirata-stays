import React, { useState, useEffect } from 'react';

// 🔱 ELITE BYPASS: Usamos el SDK desde el CDN cargado en index.html
// Esto evita que Rollup falle en Vercel.
const SALTY_ASSISTANT_ID = '280fb186-f436-4b9b-ac30-48badafd3a0d';
const PUBLIC_KEY = '816607fa-e7f9-4fdf-879c-f00a5d1c8b1c';

const SaltyVoiceButton: React.FC = () => {
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapiInstance, setVapiInstance] = useState<any>(null);

    useEffect(() => {
        // Intentar inicializar Vapi desde el objeto global
        const initVapi = () => {
            const VapiConstructor = (window as any).Vapi;
            if (VapiConstructor && !vapiInstance) {
                const instance = new VapiConstructor(PUBLIC_KEY);
                
                instance.on('call-start', () => setCallStatus('active'));
                instance.on('call-end', () => setCallStatus('inactive'));
                instance.on('error', (err: any) => {
                    console.error('Vapi Error:', err);
                    setCallStatus('inactive');
                });

                setVapiInstance(instance);
            }
        };

        // Re-intentar si el script no ha cargado aún
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

    const toggleCall = async () => {
        if (!vapiInstance) {
            console.warn('Vapi no está listo todavía.');
            return;
        }

        if (callStatus === 'active') {
            vapiInstance.stop();
        } else {
            setCallStatus('loading');
            try {
                await vapiInstance.start(SALTY_ASSISTANT_ID);
            } catch (err: any) {
                console.error('Failed to start call:', err);
                setCallStatus('inactive');
            }
        }
    };

    return (
        <div className="fixed bottom-32 left-6 z-[100] flex flex-col items-center gap-4">
            {/* ☎️ REAL PHONE CALL BUTTON (Direct Connection) */}
            <a
                href="tel:+15075788506"
                className="group relative p-3.5 rounded-2xl bg-orange-600 shadow-[0_10px_25px_rgba(234,88,12,0.4)] border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 animate-fade-in"
                aria-label="Llamar a Salty por teléfono"
            >
                <span className="material-icons text-white text-xl">phone_in_talk</span>
                
                {/* Floating Label */}
                <span className="absolute left-full ml-3 bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none whitespace-nowrap">
                    Llamar por Teléfono ☎️
                </span>
            </a>

            {/* 🎙️ AI VOICE (WEB) BUTTON */}
            <button
                onClick={toggleCall}
                className={`group relative p-4 rounded-full shadow-2xl transition-all duration-500 transform hover:scale-110 active:scale-95 ${
                    callStatus === 'active' 
                        ? 'bg-red-500 ring-4 ring-red-500/30' 
                        : 'bg-[#1a1a1a] border border-[#BBA27E]/50'
                }`}
                aria-label="Hablar con Salty por la Web"
            >
                {/* Elite Audio Waves (Only active when in call) */}
                {callStatus === 'active' && (
                    <div className="absolute inset-0 rounded-full">
                        <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20"></div>
                        <div className="absolute inset-0 animate-pulse rounded-full bg-red-400 opacity-10 scale-150"></div>
                    </div>
                )}

                {/* Icon Logic */}
                <div className="relative z-10 flex items-center justify-center">
                    {callStatus === 'loading' ? (
                        <div className="w-7 h-7 border-2 border-[#BBA27E] border-t-transparent rounded-full animate-spin"></div>
                    ) : callStatus === 'active' ? (
                        <span className="material-icons text-white text-2xl">call_end</span>
                    ) : (
                        <span className="material-icons text-[#BBA27E] text-2xl group-hover:text-white transition-colors">mic</span>
                    )}
                </div>

                {/* Floating Label */}
                <span className="absolute left-full ml-3 bg-[#1a1a1a] text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none border border-[#BBA27E]/80 whitespace-nowrap">
                    {callStatus === 'active' ? 'SALTY ESCUCHANDO...' : 'Hablar con Salty AI VIP 🎙️'}
                </span>
            </button>
        </div>
    );
};

export default SaltyVoiceButton;
