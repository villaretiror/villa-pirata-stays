import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Phone, X, MessageCircle, PhoneCall, Headphones, GripVertical, Signal, 
    Mic, Square, Send, Play, Trash2, VolumeX, Volume2, ChevronDown, CheckCircle2
} from 'lucide-react';
import { HOST_PHONE, SALTY_ASSISTANT_ID, VAPI_PUBLIC_KEY } from '../constants';

// 🔱 ELITE CONFIG
const PUBLIC_KEY = VAPI_PUBLIC_KEY || '816607fa-e7f9-4fdf-879c-f00a5d1c8b1c';
const ASSISTANT_ID = SALTY_ASSISTANT_ID || '280fb186-f436-4b9b-ac30-48badafd3a0d';

interface SaltyHubProps {
    propertyTitle?: string;
    propertyId?: string;
}

const SaltyHub: React.FC<SaltyHubProps> = ({ propertyTitle, propertyId }) => {
    // 🔱 MAIN STATES
    const [isOpen, setIsOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [callStatus, setCallStatus] = useState<'inactive' | 'loading' | 'active'>('inactive');
    const [vapiInstance, setVapiInstance] = useState<any>(null);
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);
    const [volume, setVolume] = useState(0);

    // 🔱 CHAT & VOICE STATES
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeMessage, setActiveMessage] = useState<string | null>(null);
    const [showBubble, setShowBubble] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const saltyAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 10)}`);

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

    // 🔱 VOICE CALL (Vapi)
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
            setIsChatOpen(false);
            setIsOpen(false);
            startVapiCall();
        }
    };

    // 🔱 TEXT TO SPEECH (TTS)
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
                try {
                    await audio.play();
                } catch (playErr) {
                    console.error("Salty Voice failed to play:", playErr);
                }
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

    // 🔱 TEXT MESSAGE HANDLER
    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;
        const userMsg = { role: 'user', content: inputValue };
        setChatMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
        setShowBubble(false);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...chatMessages, userMsg],
                    propertyId,
                    sessionId,
                    currentUrl: window.location.href
                })
            });

            if (!response.ok) throw new Error();
            const reader = response.body?.getReader();
            let aiResponse = "";
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.substring(2));
                                aiResponse += text;
                                setChatMessages(prev => {
                                    const last = prev[prev.length - 1];
                                    if (last?.role === 'model') return [...prev.slice(0, -1), { ...last, content: aiResponse }];
                                    return [...prev, { role: 'model', content: aiResponse }];
                                });
                            } catch (e) {}
                        }
                    }
                }
                if (aiResponse) speakSalty(aiResponse);
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'model', content: "Lo siento, mis radares de comunicación fallaron brevemente." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const [recordedAudioMimeType, setRecordedAudioMimeType] = useState<string>('audio/webm');

    // 🔱 AUDIO RECORDING LOGIC
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isRecording) {
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    const startRecording = async () => {
        if (isRecording || mediaRecorder) return; // 🔱 SECURITY GUARD
        setRecordedAudioUrl(null);
        setRecordedAudioBlob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 🔱 CROSS-BROWSER MIME DETECTOR (Elite Standard)
            const mimeType = [
                'audio/mp4',
                'audio/webm',
                'audio/ogg',
                'audio/wav'
            ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
            
            setRecordedAudioMimeType(mimeType);
            console.log(`🔱 SALTY RADAR: Recording in ${mimeType}`);

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            
            // 🔱 HIGH-FIDELITY CHUNK ENGINE
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const totalSize = chunks.reduce((acc, c) => acc + c.size, 0);
                if (totalSize === 0) return;

                const audioBlob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(url);
                setRecordedAudioBlob(audioBlob);
                setIsRecording(false);
                setMediaRecorder(null); // 🔱 CLEAN SLATE
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start(1000);
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) mediaRecorder.stop();
    };

    const sendRecordedAudio = async () => {
        if (!recordedAudioBlob) return;
        setIsTyping(true);
        const reader = new FileReader();
        reader.readAsDataURL(recordedAudioBlob);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            // 🔱 SYNCED MULTIMODAL PAYLOAD
            const userMsg = { 
                role: 'user', 
                content: [
                    { text: "🎙️ [Nota de Voz Enviada]" },
                    { inlineData: { mimeType: recordedAudioMimeType, data: base64Data } }
                ] 
            };
            
            setChatMessages(prev => [...prev, { role: 'user', content: "🎙️ Nota de voz enviada." }]);
            setRecordedAudioUrl(null);
            setRecordedAudioBlob(null);

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: chatMessages.concat(userMsg),
                        propertyId,
                        sessionId,
                        currentUrl: window.location.href
                    })
                });

                if (response.ok) {
                    const reader = response.body?.getReader();
                    let aiResponse = "";
                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            const chunk = new TextDecoder().decode(value);
                            const lines = chunk.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('0:')) {
                                    const text = JSON.parse(line.substring(2));
                                    aiResponse += text;
                                    setChatMessages(prev => {
                                        const last = prev[prev.length - 1];
                                        if (last?.role === 'model') return [...prev.slice(0, -1), { ...last, content: aiResponse }];
                                        return [...prev, { role: 'model', content: aiResponse }];
                                    });
                                }
                            }
                        }
                        if (aiResponse) speakSalty(aiResponse);
                    }
                }
            } catch (err) {
                console.error("Audio processing error:", err);
            } finally {
                setIsTyping(false);
            }
        };
    };

    // 🔱 INTENT RADAR
    useEffect(() => {
        const handlePush = (e: any) => {
            const detail = e.detail;
            if (detail && detail.message) {
                setActiveMessage(detail.message);
                setShowBubble(true);
                if (detail.speak) speakSalty(detail.message);
                setTimeout(() => setShowBubble(false), 8000);
            }
        };
        window.addEventListener('salty-push', handlePush);
        const timer = setTimeout(() => {
            if (!showBubble && !isChatOpen) {
                setActiveMessage("¡Hola! Soy Salty, su Concierge. ¿En qué puedo servirles hoy? 🔱");
                setShowBubble(true);
                setTimeout(() => setShowBubble(false), 6000);
            }
        }, 5000);
        return () => {
            window.removeEventListener('salty-push', handlePush);
            clearTimeout(timer);
        };
    }, [isChatOpen, showBubble]);

    if (!isVisible) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="fixed z-[2147483647] cursor-grab active:cursor-grabbing"
            style={{ bottom: '100px', right: '40px', touchAction: 'none' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="relative group">
                {/* 🔱 CHAT PANEL (Elite Glassmorphism) */}
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 50, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.8, y: 30, filter: 'blur(10px)' }}
                            className="absolute bottom-20 -right-4 w-[320px] md:w-[380px] bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[2.5rem] rounded-br-[4px] shadow-[0_30px_70px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col z-[100]"
                        >
                            <div className="p-4 bg-primary flex items-center justify-between border-b border-secondary/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-secondary overflow-hidden shadow-lg">
                                        <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-secondary tracking-widest uppercase">Salty Concierge</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-blue-600 animate-pulse' : 'bg-green-600'}`}></span>
                                            <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-tighter">
                                                {isTalking ? 'Hablando...' : 'En Línea'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                                    <ChevronDown className="text-secondary" />
                                </button>
                            </div>

                            <div className="flex-1 max-h-[350px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                                {chatMessages.length === 0 && (
                                    <div className="bg-primary/10 p-4 rounded-2xl">
                                        <p className="text-[11px] text-secondary font-bold">"Soy Salty, su concierge personal. ¿Desean notas de voz, ayuda con su reserva o conocer los secretos de la Villa?"</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] font-medium leading-relaxed ${msg.role === 'user' ? 'bg-secondary text-white shadow-lg' : 'bg-sand/40 border border-secondary/5 text-text-main'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && <div className="animate-pulse text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                    Espera un momento, Capitán...
                                </div>}
                            </div>

                            <div className="p-4 bg-gray-50/50 border-t border-black/5 flex flex-col gap-2">
                                {recordedAudioUrl && (
                                    <div className="bg-secondary p-2 rounded-2xl flex items-center justify-between shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    if (recordedAudioUrl) {
                                                        const audio = new Audio(recordedAudioUrl);
                                                        audio.play().catch(e => console.error("🔱 RADAR: Playback failed", e));
                                                    }
                                                }} 
                                                className="w-8 h-8 bg-primary text-secondary rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                            <span className="text-[10px] text-white/80 font-mono">{formatTime(recordingTime)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { 
                                                    setRecordedAudioUrl(null); 
                                                    setRecordedAudioBlob(null); 
                                                }} 
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button 
                                                onClick={sendRecordedAudio} 
                                                disabled={isTyping}
                                                className="px-3 py-1 bg-primary text-secondary rounded-lg text-[10px] font-black uppercase hover:opacity-90 disabled:opacity-50"
                                            >
                                                {isTyping ? 'Enviando...' : 'Enviar 📤'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!recordedAudioUrl && (
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onMouseDown={startRecording} onMouseUp={stopRecording}
                                            onTouchStart={startRecording} onTouchEnd={stopRecording}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-secondary text-primary hover:opacity-90'}`}
                                        >
                                            {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                                        </button>
                                        <input 
                                            type="text" placeholder="Escriba aquí, Capitán..." value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-xs outline-none h-10 font-bold"
                                        />
                                        <button onClick={handleSendMessage} disabled={isTyping} className="w-10 h-10 bg-primary text-secondary rounded-xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔱 INTELLIGENCE BUBBLE (Thought bubble) */}
                <AnimatePresence>
                    {showBubble && activeMessage && !isChatOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20, x: '-50%' }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.5, y: 10, x: '-50%' }}
                            onClick={() => { setIsChatOpen(true); setShowBubble(false); }}
                            className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[2rem] rounded-br-[4px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-20 cursor-pointer hover:scale-105 transition-transform"
                        >
                            <p className="text-[11px] text-text-main font-bold leading-relaxed">{activeMessage}</p>
                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white/95 border-r border-b border-black/10 rotate-45" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.1 }} onClick={() => setIsVisible(false)}
                    className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                >
                    <X className="w-3 h-3" />
                </motion.button>

                <div className="flex flex-col-reverse items-center gap-4">
                    <motion.button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-xl border-2 transition-all duration-500 ${
                            isTalking ? 'bg-primary border-secondary shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 
                            callStatus === 'active' ? 'bg-red-500/90 border-red-400' : 'bg-black/90 border-[#D4AF37]/30'
                        }`}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isTalking && <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-primary/40 rounded-full" />}
                            <img 
                                src="/images/salty-avatar.jpg" 
                                alt="Salty" 
                                className={`w-12 h-12 rounded-full object-cover border-2 border-white/20 transition-all ${isTalking ? 'scale-110 blur-[1px]' : ''}`} 
                                onError={(e) => {(e.target as any).src = "https://ui-avatars.com/api/?name=Salty&background=BBA27E&color=fff";}}
                            />
                        </div>
                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-black ${isSdkLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    </motion.button>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.5 }} className="flex flex-col items-center gap-3 mb-2">
                                <button onClick={() => { setIsChatOpen(true); setIsOpen(false); }} className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center shadow-xl border border-gray-100 text-secondary hover:bg-secondary hover:text-white transition-all">
                                    <MessageCircle className="w-5 h-5" />
                                </button>
                                <button onClick={toggleVoice} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border backdrop-blur-xl transition-all ${callStatus === 'active' ? 'bg-red-500 text-white border-red-400' : 'bg-white/95 text-black border-gray-100 hover:bg-[#D4AF37] hover:text-white'}`}>
                                    {callStatus === 'active' ? <Phone className="animate-pulse" /> : <PhoneCall className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { const url = `https://wa.me/${HOST_PHONE}?text=${encodeURIComponent(propertyTitle ? `¡Hola Salty! Vi "${propertyTitle}" y me interesa reservar.` : '¡Hola! Quisiera información.')}`; window.open(url, '_blank'); }} className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center shadow-xl border border-gray-100 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all">
                                    <Signal className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default SaltyHub;
