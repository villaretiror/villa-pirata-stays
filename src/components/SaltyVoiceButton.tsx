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
            alert('Capitán, los motores de voz (Vapi) se están calentando. Intente en 2 segundos. 🔱⚓');
            return;
        }

        if (callStatus === 'active') {
            vapiInstance.stop();
        } else {
            setCallStatus('loading');
            try {
                // 🔱 ELITE MANEUVER: Simple browser check
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('Navegador no compatible con voz. Use Chrome o Safari. ⚓');
                    setCallStatus('inactive');
                    return;
                }

                await vapiInstance.start(SALTY_ASSISTANT_ID);
                console.log('Salty Call Started! 🔱');
            } catch (err: any) {
                console.error('Failed to start call:', err);
                alert(`Error al iniciar llamada: ${err.message || 'Verifique el micro'}. 🎙️`);
                setCallStatus('inactive');
            }
        }
    };

    return (
        <div className="fixed bottom-48 left-6 z-[99999] flex flex-col items-center gap-6 pointer-events-auto scale-90 md:scale-100 origin-bottom-left">
            {/* ☎️ REAL PHONE CALL BUTTON (Direct Connection) */}
            <a
                href="tel:+12092673503"
                className="group relative p-4 rounded-2xl bg-[#BBA27E] shadow-[0_15px_35px_rgba(187,162,126,0.3)] border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 animate-fade-in"
                aria-label="Llamar a Salty al +1 209 267 3503"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
                <span className="material-icons text-[#1a1a1a] text-2xl">phone_in_talk</span>
                
                {/* Elite Badge */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                
                {/* Floating Label */}
                <span className="absolute left-full ml-4 bg-[#BBA27E] text-[#1a1a1a] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none whitespace-nowrap border border-white/30 backdrop-blur-md">
                    Llamar al Concierge ☎️
                </span>
            </a>
        </div>
    );
};

export default SaltyVoiceButton;
