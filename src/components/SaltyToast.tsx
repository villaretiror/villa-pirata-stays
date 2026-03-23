import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SaltyToastProps {
    propertyId?: string;
    propertyTitle?: string;
    amenities?: string[];
}

const SaltyToast: React.FC<SaltyToastProps> = ({ propertyId, propertyTitle, amenities }) => {
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
    const [currentSaltyAudio, setCurrentSaltyAudio] = useState<HTMLAudioElement | null>(null);
    const [isTalking, setIsTalking] = useState(false);

    const speakSalty = async (text: string) => {
        try {
            // 🛡️ Cancel any previous sounds
            if (currentSaltyAudio) {
                currentSaltyAudio.pause();
                currentSaltyAudio.currentTime = 0;
            }
            window.speechSynthesis.cancel();
            setIsTalking(true);

            // 🛡️ Markdown & Asterisk Purge
            const cleanText = text
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
            setCurrentSaltyAudio(audio);
            
            audio.volume = 1.0;
            await audio.play();
            
            audio.onended = () => {
                setIsTalking(false);
                URL.revokeObjectURL(url);
                setCurrentSaltyAudio(null);
            };

        } catch (err) {
            console.error("[Voice Engine Critical Error]:", err);
            setIsTalking(false);
            // 🛡️ ELIMINATED ROBOTIC FALLBACK: We prefer quality or silence.
            // Only use console log for debugging, don't stress the user with robot voice.
        }
    };

    const stopSalty = () => {
        if (currentSaltyAudio) {
            currentSaltyAudio.pause();
            currentSaltyAudio.currentTime = 0;
            setCurrentSaltyAudio(null);
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
            alert("No pude acceder al micrófono. Verifique los permisos en su navegador. 🔱");
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
        if (user?.is_returning_guest && path === '/') return `¡Qué alegría volver a verte, Capitán! 🔱`;
        if (path === '/') return "¿Buscando la exclusividad al mejor precio? 🔱";
        return "¡Hola! Soy Salty. ¿Alguna duda?";
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setMessage(getContextualPill());
            setShowBubble(true);
            setIsMinimized(false);
            setIsPulsing(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
            <AnimatePresence>
                {(showBubble || isExpanded) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`pointer-events-auto transition-all duration-500 ${isExpanded ? 'w-[320px] md:w-[380px]' : 'max-w-[280px]'} mb-2`}
                    >
                        <div className="bg-white/95 backdrop-blur-3xl border border-black/5 rounded-[2.5rem] rounded-br-[4px] shadow-2xl overflow-hidden flex flex-col">
                            {isExpanded && (
                                <div className="flex items-center justify-between p-4 bg-[#BBA27E] border-b border-black/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/20 shadow-lg">
                            <span className="text-xl">⚓</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[#1a1a1a] tracking-widest uppercase">Salty Concierge</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isTalking ? 'bg-blue-600 animate-pulse' : 'bg-green-600'}`}></span>
                                <span className="text-[10px] font-bold text-[#1a1a1a]/60 uppercase tracking-tighter">
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
                                <span className="material-icons text-xl text-[#1a1a1a] group-hover:scale-110">volume_off</span>
                            </button>
                        )}
                        <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors group">
                            <span className="material-icons text-[#1a1a1a] group-hover:rotate-90 transition-transform">close</span>
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
                                            <div className="bg-[#BBA27E]/10 p-4 rounded-2xl">
                                                <p className="text-xs text-[#1a1a1a]">"Soy Salty, su concierge. ¿En qué puedo servirles hoy?"</p>
                                            </div>
                                        )}
                                        {chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] ${msg.role === 'user' ? 'bg-black text-white' : 'bg-sand/40 border border-black/5'}`}>
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
                                                className="bg-[#1a1a1a] p-2 rounded-2xl flex items-center justify-between shadow-lg border border-[#BBA27E]/20"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={playPreview}
                                                        className="w-10 h-10 bg-[#BBA27E] text-[#1a1a1a] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <span className="material-icons">play_arrow</span>
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-[#BBA27E]/60 tracking-widest">Escuchar Grabación</span>
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
                                                        <span className="material-icons text-sm">delete</span>
                                                    </button>
                                                    <button 
                                                        onClick={sendRecordedAudio}
                                                        className="px-4 py-2 bg-[#BBA27E] text-[#1a1a1a] rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all"
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
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black text-[#BBA27E] hover:bg-gray-900'}`}
                                                >
                                                    <span className="material-icons text-lg">{isRecording ? 'stop' : 'mic'}</span>
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
                                                    className="w-10 h-10 bg-[#BBA27E] text-[#1a1a1a] rounded-xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all h-10"
                                                >
                                                    <span className="material-icons text-sm">send</span>
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
                <div className={`w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-white transition-all overflow-hidden`}>
                    <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
                </div>
            </motion.div>
        </div>
    );
};

export default SaltyToast;
