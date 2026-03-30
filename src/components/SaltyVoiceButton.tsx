import React, { useState, useEffect } from 'react';

// 🔱 ELITE BYPASS: Usamos el SDK desde el CDN cargado en index.html
// Esto evita que Rollup falle en Vercel.
const SALTY_ASSISTANT_ID = '280fb186-f436-4b9b-ac30-48badafd3a0d';
const PUBLIC_KEY = '816607fa-e7f9-4fdf-879c-f00a5d1c8b1c';

const SaltyVoiceButton: React.FC = () => {
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapiInstance, setVapiInstance] = useState<any>(null);
    const [volume, setVolume] = useState(0);
    const [propertyId, setPropertyId] = useState<string | null>(null);

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
                
                instance.on('call-start', () => setCallStatus('active'));
                instance.on('call-end', () => {
                    setCallStatus('inactive');
                    setVolume(0);
                });
                instance.on('volume-level', (level: number) => {
                    // level typically ranges from 0 to 1
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
        // 🔱 AUTO-RECOVERY: If engine is missing, try one last sync
        let activeInstance = vapiInstance;
        if (!activeInstance) {
            const rawVapi = (window as any).Vapi || (window as any).vapi || (window as any).vapiSDK;
            const VapiConstructor = rawVapi?.default || rawVapi;

            if (VapiConstructor && typeof VapiConstructor === 'function') {
                console.log('🔱 Salty SOS: Critical engine recovery triggered.');
                activeInstance = new VapiConstructor(PUBLIC_KEY);
                setVapiInstance(activeInstance);
            } else {
                alert('Capitán, los motores de voz (Vapi) se están calibrando. Intente de nuevo en 2 segundos. 🔱⚓');
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
        <div className="fixed bottom-24 md:bottom-28 right-6 md:right-12 z-[3000000] flex flex-col items-center gap-6 pointer-events-auto scale-90 md:scale-100 origin-right transition-all duration-300">
            {/* ☎️ VAPI WEB CALL BUTTON (Native Experience) */}
            <div className="relative group">
                {/* 🔱 ELITE GLOW: Reactive to current volume! */}
                <div 
                    className={`absolute inset-[-15px] bg-primary/20 rounded-full blur-2xl transition-all duration-75 pointer-events-none ${callStatus === 'active' ? 'opacity-100 scale-125' : 'opacity-0 scale-0'}`}
                    style={{ 
                        transform: `scale(${1 + volume * 1.5})`,
                        boxShadow: `0 0 ${volume * 50}px ${volume * 20}px rgba(212, 175, 55, 0.4)`
                    }}
                ></div>

                <button
                    onClick={toggleCall}
                    disabled={callStatus === 'loading'}
                    className={`group relative p-6 rounded-full transition-all duration-500 shadow-2xl border-2 flex items-center justify-center ${
                        callStatus === 'active' 
                            ? 'bg-secondary border-red-500 text-red-500' 
                            : 'bg-primary border-white/20 text-secondary'
                    } ${callStatus === 'loading' ? 'opacity-70 scale-95 cursor-wait' : 'hover:scale-110 active:scale-90 scale-100'}`}
                    aria-label={callStatus === 'active' ? 'Terminar llamada' : 'Llamar al Concierge Voz'}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-full transition-opacity"></div>
                    
                    {callStatus === 'loading' ? (
                        <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                    ) : (
                        <span className={`material-icons text-3xl transition-all ${callStatus === 'active' ? 'animate-pulse' : ''}`}>
                            {callStatus === 'active' ? 'call_end' : 'phone_in_talk'}
                        </span>
                    )}
                    
                    {/* Status Pip - REPOSITIONED & ANCHORED */}
                    <div className={`absolute top-0 right-1 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-colors z-20 ${callStatus === 'active' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    
                    {/* Floating Label - ALIGNED TO RIGHT FLANK */}
                    <span className="absolute right-full mr-6 bg-secondary text-primary text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none whitespace-nowrap border border-primary/20 backdrop-blur-md flex flex-col items-end gap-1">
                        <span>{callStatus === 'active' ? 'Terminar Llamada 📡' : 'Concierge Voz ☎️'}</span>
                        <span className="text-[8px] text-white/50 border-t border-white/10 pt-1 w-full text-right truncate">DIRECTO: 209-267-3503</span>
                    </span>
                </button>
            </div>
        </div>
    );
};

export default SaltyVoiceButton;
