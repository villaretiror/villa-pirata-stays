import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    X, 
    Volume2, 
    VolumeX, 
    Play, 
    Trash2, 
    Mic, 
    Square, 
    Send,
    MessageSquare,
    ChevronDown,
    Volume1
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SaltyToastProps {
    propertyId?: string;
    propertyTitle?: string;
    amenities?: string[];
    startDate?: Date | null;
    endDate?: Date | null;
}

const SaltyToast: React.FC<SaltyToastProps> = ({ propertyId, propertyTitle, amenities, startDate, endDate }) => {
    const [showBubble, setShowBubble] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [message, setMessage] = useState('');
    const [isPulsing, setIsPulsing] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');

    // 🔱 PERSISTENT SESSION TRACKING
    useEffect(() => {
        let sid = localStorage.getItem('salty_session_id');
        if (!sid) {
            sid = `session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            localStorage.setItem('salty_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    // 🔱 AUDIO & VOICE STATES
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // 🔱 MASTER AUDIO CONTROLLER (To stop Salty when needed)
    const saltyAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isTalking, setIsTalking] = useState(false);

    const speakSalty = async (text: string) => {
        try {
            // 🛡️ Cancel any previous sounds
            if (saltyAudioRef.current) {
                saltyAudioRef.current.pause();
                saltyAudioRef.current.currentTime = 0;
            }
            window.speechSynthesis.cancel();
            setIsTalking(true);

            // 🛡️ Markdown & Emoji Purge (Preventing 'trident' or robot artifacts)
            const cleanText = text
                .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Comprehensive Emoji Purge
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/__/g, '')
                .replace(/_/g, '')
                .replace(/#/g, '')
                .replace(/`/g, '');

            const response = await fetch('/api/webhooks?source=tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText })
            });

            if (!response.ok) throw new Error(`Voice engine offline: ${response.status}`);

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            saltyAudioRef.current = audio;
            
            audio.volume = 1.0;
            await audio.play();
            
            audio.onended = () => {
                setIsTalking(false);
                URL.revokeObjectURL(url);
                saltyAudioRef.current = null;
            };

        } catch (err) {
            console.error("[Voice Engine Critical Error]:", err);
            setIsTalking(false);
        }
    };

    const stopSalty = () => {
        if (saltyAudioRef.current) {
            saltyAudioRef.current.pause();
            saltyAudioRef.current.currentTime = 0;
            saltyAudioRef.current = null;
        }
        window.speechSynthesis.cancel();
        setIsTalking(false);
    };

    // 🔱 TIMER ENGINE
    useEffect(() => {
        if (isRecording) {
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        setRecordedAudioUrl(null);
        setRecordedAudioBlob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(url);
                setRecordedAudioBlob(audioBlob);
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied:", err);
            setChatMessages(prev => [...prev, { 
                role: 'model', 
                content: "Lo lamento, Capitán, no logro sentir el micrófono. ¿Podría verificar los permisos de su dispositivo para que pueda escucharle? 🔱" 
            }]);
            setIsExpanded(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
        }
    };

    const playPreview = () => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.currentTime = 0;
            audioPreviewRef.current.load();
            audioPreviewRef.current.play().catch(e => console.error("Playback failed:", e));
        }
    };

    const sendRecordedAudio = async () => {
        if (!recordedAudioBlob) return;
        
        setIsTyping(true);
        const reader = new FileReader();
        reader.readAsDataURL(recordedAudioBlob);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const userMsg = { 
                role: 'user', 
                content: [
                    { text: "Capitán, he grabado esta nota de voz para usted." },
                    { inlineData: { mimeType: 'audio/webm', data: base64Data } }
                ] 
            };
            
            setChatMessages(prev => [...prev, { role: 'user', content: "🎙️ [Nota de Voz Enviada]" }]);
            setRecordedAudioUrl(null);
            setRecordedAudioBlob(null);

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
                        
                        if (aiResponse) {
                            speakSalty(aiResponse);
                        }
                    }
                }
            } catch (err) {
                console.error("Audio processing error:", err);
            } finally {
                setIsTyping(false);
            }
        };
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;
        const userMsg = { role: 'user', content: inputValue };
        const newHistory = [...chatMessages, userMsg];
        setChatMessages(newHistory);
        setInputValue('');
        setIsTyping(true);
        setShowBubble(false);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newHistory,
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
                if (aiResponse) {
                    speakSalty(aiResponse);
                }
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'model', content: "Lo siento, mis sensores de comunicación fallaron brevemente." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const getContextualPill = () => {
        const path = location.pathname;
        if (startDate && propertyTitle) {
            const dateStr = startDate.toLocaleDateString('es-PR', { day: 'numeric', month: 'short' });
            return `Capitán, veo que tiene la mira en el ${dateStr}. ¿Desea que aseguremos su estancia en ${propertyTitle}? 🔱`;
        }
        if (user?.is_returning_guest && path === '/') return `¡Qué alegría volver a verte, Capitán! 🔱`;
        if (path === '/') return "¿Buscando la exclusividad al mejor precio? 🔱";
        return "¡Hola! Soy Salty. ¿Alguna duda?";
    };

    useEffect(() => {
        const handlePush = (e: any) => {
            const detail = e.detail;
            if (detail && detail.message) {
                setMessage(detail.message);
                setShowBubble(true);
                setIsMinimized(false);
                setIsPulsing(true);
                
                // 🎧 Proactive Voice (Optional/Subtle)
                if (detail.speak) {
                    speakSalty(detail.message);
                }
            }
        };

        const handleScroll = () => {
             // Si el usuario scrollea, minimizamos a Salty para que no tape contenido
             if (window.scrollY > 300 && isExpanded === false) {
                 setShowBubble(false);
             }
        };

        window.addEventListener('salty-push', handlePush);
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        const timer = setTimeout(() => {
            if (!showBubble) {
                setMessage(getContextualPill());
                setShowBubble(true);
                setIsMinimized(false);
                setIsPulsing(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('salty-push', handlePush);
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [location.pathname, showBubble, startDate, propertyTitle, isExpanded]);

    return (
        <div className="fixed bottom-64 md:bottom-28 right-6 md:right-32 z-[9999998] flex flex-col items-end gap-5 pointer-events-none transition-all duration-300">
            <AnimatePresence>
                {(showBubble || isExpanded) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 30, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.8, y: 30, filter: 'blur(10px)' }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className={`pointer-events-auto transition-all duration-500 ${isExpanded ? 'w-[320px] md:w-[380px]' : 'max-w-[280px]'} mb-2`}
                    >
                        <div className="bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[2.5rem] rounded-br-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col">
                            {isExpanded && (
                                <div className="flex items-center justify-between p-4 bg-primary border-b border-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-white/20 shadow-lg">
                            <span className="text-xl">⚓</span>
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
                    <div className="flex items-center gap-2">
                        {isTalking && (
                            <button 
                                onClick={stopSalty}
                                className="p-2 hover:bg-black/10 rounded-full transition-colors group"
                                title="Silenciar a Salty"
                            >
                                <VolumeX size={20} className="text-secondary group-hover:scale-110" />
                            </button>
                        )}
                        <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors group">
                            <X size={20} className="text-secondary group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>
                            )}

                            {!isExpanded && showBubble && (
                                <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
                                    <p className="text-[13px] text-text-main font-semibold leading-relaxed">{message}</p>
                                </div>
                            )}

                            {isExpanded && (
                                <>
                                    <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                                        {chatMessages.length === 0 && (
                                            <div className="bg-primary/10 p-4 rounded-2xl">
                                                <p className="text-xs text-secondary">"Soy Salty, su concierge. ¿En qué puedo servirles hoy?"</p>
                                            </div>
                                        )}
                                        {chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] ${msg.role === 'user' ? 'bg-secondary text-white shadow-lg shadow-black/10' : 'bg-sand/40 border border-secondary/5 text-text-main'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && <div className="animate-pulse text-xs text-gray-400">Salty está pensando...</div>}
                                    </div>

                                    <div className="p-3 bg-gray-50/50 border-t border-black/5 flex flex-col gap-2">
                                        {/* 🎧 AUDIO PREVIEW BAR (When recorded but not sent) */}
                                        {recordedAudioUrl && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-secondary p-2 rounded-2xl flex items-center justify-between shadow-lg border border-primary/20"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={playPreview}
                                                        className="w-10 h-10 bg-primary text-secondary rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <Play size={18} fill="currentColor" />
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Escuchar Grabación</span>
                                                        <span className="text-[10px] text-white/80 font-mono tracking-tighter">Duración: {formatTime(recordingTime)}</span>
                                                    </div>
                                                    <audio ref={audioPreviewRef} src={recordedAudioUrl} className="hidden" preload="auto" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { setRecordedAudioUrl(null); setRecordedAudioBlob(null); }}
                                                        className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-all"
                                                        title="Borrar Nota"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={sendRecordedAudio}
                                                        className="px-4 py-2 bg-primary text-secondary rounded-xl text-[10px] font-semibold uppercase opacity-80 hover:scale-105 transition-all"
                                                    >
                                                        Enviar 📤
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {!recordedAudioUrl && (
                                            <div className="flex gap-2 items-center">
                                                <button
                                                    type="button"
                                                    onMouseDown={startRecording}
                                                    onMouseUp={stopRecording}
                                                    onTouchStart={startRecording}
                                                    onTouchEnd={stopRecording}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-secondary text-primary hover:opacity-90'}`}
                                                >
                                                    {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                                                </button>
                                                {isRecording ? (
                                                    <div className="flex-1 bg-red-50/50 border border-red-200 rounded-xl px-4 flex items-center justify-between h-10 animate-pulse">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Grabando</span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-red-600">{formatTime(recordingTime)}</span>
                                                    </div>
                                                ) : (
                                                    <input 
                                                        type="text"
                                                        placeholder="Escribe o pulsa el micro..."
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                        className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-xs outline-none h-10"
                                                    />
                                                )}
                                                <button 
                                                    onClick={handleSendMessage}
                                                    disabled={isTyping || !inputValue.trim()}
                                                    className="w-10 h-10 bg-primary text-secondary rounded-xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all h-10"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="pointer-events-auto cursor-pointer relative group"
            >
                {/* 🌊 WAVEFORM ANIMATION: Pulses only while Salty is talking */}
                <AnimatePresence>
                    {isTalking && (
                        <>
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0.5 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                className="absolute inset-0 rounded-full bg-primary/40 z-0"
                            />
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0.3 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                                className="absolute inset-0 rounded-full bg-primary/20 z-0"
                            />
                        </>
                    )}
                </AnimatePresence>

                <div className={`w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-2xl border-4 border-white transition-all overflow-hidden relative z-10`}>
                    <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
                </div>
            </motion.div>
        </div>
    );
};

export default SaltyToast;
