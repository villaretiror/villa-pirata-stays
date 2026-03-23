import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

const vapi = new Vapi('816607fa-e7f9-4fdf-879c-f00a5d1c8b1c');
const SALTY_ASSISTANT_ID = '280fb186-f436-4b9b-ac30-48badafd3a0d';

const SaltyVoiceButton: React.FC = () => {
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [isMorsed, setIsMorsed] = useState(false);

    useEffect(() => {
        vapi.on('call-start', () => setCallStatus('active'));
        vapi.on('call-end', () => setCallStatus('inactive'));
        vapi.on('error', (err) => {
            console.error('Vapi Error:', err);
            setCallStatus('inactive');
        });

        return () => {
            vapi.stop();
        };
    }, []);

    const toggleCall = async () => {
        if (callStatus === 'active') {
            vapi.stop();
        } else {
            setCallStatus('loading');
            try {
                await vapi.start(SALTY_ASSISTANT_ID);
            } catch (err) {
                console.error('Failed to start call:', err);
                setCallStatus('inactive');
            }
        }
    };

    return (
        <div className="fixed bottom-44 left-6 z-[60] flex flex-col items-center">
            <button
                onClick={toggleCall}
                className={`group relative p-4 rounded-full shadow-2xl transition-all duration-500 transform hover:scale-110 active:scale-95 ${
                    callStatus === 'active' 
                        ? 'bg-red-500 ring-4 ring-red-500/30' 
                        : 'bg-[#1a1a1a] border border-[#BBA27E]/50'
                }`}
                aria-label="Hablar con Salty"
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
                        <span className="material-icons text-[#BBA27E] text-2xl group-hover:text-white transition-colors">mic_none</span>
                    )}
                </div>

                {/* Floating Label */}
                <span className="absolute left-full ml-3 bg-[#1a1a1a] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none border border-[#BBA27E]/80 whitespace-nowrap">
                    {callStatus === 'active' ? 'SALTY ESCUCHANDO...' : 'HABLAR CON SALTY 🎙️'}
                </span>
            </button>
        </div>
    );
};

export default SaltyVoiceButton;
