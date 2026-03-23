import React, { useState, useEffect } from 'react';
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
                                    if (last?.role === 'model') {
                                        return [...prev.slice(0, -1), { ...last, content: aiResponse }];
                                    } else {
                                        return [...prev, { role: 'model', content: aiResponse }];
                                    }
                                });
                            } catch (e) {}
                        }
                    }
                }
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'model', content: "Lo siento, mis sensores de comunicación fallaron brevemente. ¿Podrías repetir?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    // 🔱 SALTY'S DYNAMIC BRAIN: Contextual prompts by Brian's Logic
    const getContextualPill = () => {
        const path = location.pathname;
        
        // 0. Returning Guest Hook (High Perception of Service)
        if (user?.is_returning_guest && path === '/') {
            return `¡Qué alegría volver a verte, Capitán ${(user.name || 'Huésped').split(' ')[0]}! 🔱 El trópico te extrañaba. ¿Buscamos tu fecha favorita?`;
        }

        // 1. Home / General
        if (path === '/') return "¿Buscando la exclusividad al mejor precio? Permíteme asistirte para ahorrar un 15% vs OTAs. ¡El Caribe te espera! 🔱";
        
        // 2. Property Details (Experience Sale)
        if (path.includes('/property')) {
            const title = propertyTitle || "esta villa";
            if (title.includes('Retiro')) return `En Villa Retiro R la seguridad y el confort son absolutos. Contamos con respaldo solar completo para que nada interrumpa tu paz. 🔱`;
            if (title.includes('Pirata')) return `Pirata House es el refugio familiar por excelencia en Cabo Rojo. Estaré encantado de asistirte en cada detalle de tu próxima estancia. ✨`;
            return `Te asisto para que vivas la experiencia en ${title}. Calidad garantizada por VRR Stays.`;
        }
        
        // 3. Booking / Checkout (Trust Closure)
        if (path.includes('/booking') || path.includes('/reservation')) {
            return "Tranquilo, el depósito de garantía es 100% reembolsable tras tu salida. ¡Reserva con total paz mental!";
        }

        return "¡Hola! Soy Salty. Estoy aquí para que tu estancia en Cabo Rojo sea histórica. ¿Alguna duda?";
    };

    useEffect(() => {
        // Delay Salty's entry for a "Premium" feel
        const timer = setTimeout(() => {
            setMessage(getContextualPill());
            setShowBubble(true);
            setIsMinimized(false);
            setIsPulsing(true);
        }, 3000);

        // Auto-minimize after 10 seconds to reduce screen clutter
        const autoMin = setTimeout(() => {
            setShowBubble(false);
            setIsMinimized(true);
            setIsPulsing(false);
        }, 13000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoMin);
        };
    }, [location.pathname, propertyTitle]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
            {/* 💬 Salty's Speech Bubble / Mini-Chat */}
            <AnimatePresence>
                {(showBubble || isExpanded) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10, x: 10 }}
                        className={`pointer-events-auto transition-all duration-500 ${isExpanded ? 'w-[320px] md:w-[380px]' : 'max-w-[280px] lg:max-w-xs'} mb-2`}
                    >
                        <div className="bg-white/95 backdrop-blur-3xl border border-black/5 rounded-[2.5rem] rounded-br-[4px] shadow-2xl relative overflow-hidden flex flex-col">
                            {/* Header (Only in Expanded) */}
                            {isExpanded && (
                                <div className="p-4 bg-[#1a1a1a] text-[#BBA27E] flex justify-between items-center border-b border-[#BBA27E]/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#BBA27E]/20">
                                            <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none text-white">Salty</p>
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#BBA27E] opacity-70">Concierge Oficial VRR</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => navigate('/messages')}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                            title="Pantalla Completa"
                                        >
                                            <span className="material-icons text-sm">open_in_full</span>
                                        </button>
                                        <button 
                                            onClick={() => { setIsExpanded(false); setIsMinimized(true); setShowBubble(false); }}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Toast Message (When not busy chatting) */}
                            {!isExpanded && showBubble && (
                                <div 
                                    className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => { setIsExpanded(true); setShowBubble(false); }}
                                >
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowBubble(false); setIsMinimized(true); }}
                                        className="absolute top-2 right-2 w-6 h-6 bg-white shadow-md rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-colors z-20"
                                    >
                                        <span className="material-icons text-xs">close</span>
                                    </button>

                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#BBA27E] mb-1.5 flex items-center gap-1.5">
                                        🔱 Salty Concierge VRR ✨
                                    </p>
                                    <p className="text-[13px] text-text-main font-semibold leading-relaxed tracking-tight">
                                        {message}
                                    </p>
                                </div>
                            )}

                            {/* Mini Chat Interface */}
                            {isExpanded && (
                                <>
                                    <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-4 no-scrollbar scroll-smooth">
                                        {/* Welcome Message if no chat yet */}
                                        {chatMessages.length === 0 && (
                                            <div className="bg-[#BBA27E]/10 p-4 rounded-2xl border border-[#BBA27E]/20">
                                                <p className="text-xs text-[#1a1a1a] font-medium italic leading-relaxed">
                                                    "¡Bienvenidos a Villa Retiro R! Soy Salty, su concierge personal de élite. Estoy aquí para asistirles en cada detalle de su estancia. ¿En qué puedo servirles hoy?"
                                                </p>
                                            </div>
                                        )}

                                        {chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                                                    msg.role === 'user' 
                                                    ? 'bg-black text-white rounded-tr-none' 
                                                    : 'bg-sand/40 text-text-main rounded-tl-none border border-black/5'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-sand/20 p-2 px-4 rounded-2xl border border-black/5 flex gap-1">
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Auto anchor to bottom would go here */}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-3 bg-gray-50/50 border-t border-black/5 flex gap-2 items-center">
                                        <button
                                            type="button"
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isTyping ? 'bg-red-50 text-red-500' : 'bg-black text-[#BBA27E] hover:bg-gray-900'}`}
                                            onClick={() => {
                                                const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                                                
                                                if (!SpeechRecognition) {
                                                    alert("Capitán, este navegador no admite voz. Use Chrome/Safari para la experiencia total. 🔱");
                                                    return;
                                                }

                                                // 🛡️ REINFORCED: Immediate cleanup of any existing instance
                                                if ((window as any)._saltyRecognition) {
                                                    try { (window as any)._saltyRecognition.abort(); } catch(e){}
                                                }

                                                const recognition = new SpeechRecognition();
                                                (window as any)._saltyRecognition = recognition;
                                                
                                                recognition.lang = 'es-ES';
                                                recognition.continuous = false;
                                                recognition.interimResults = false;

                                                recognition.onstart = () => {
                                                    setIsTyping(true);
                                                    console.log("[Salty Audio] Listening...");
                                                };

                                                recognition.onresult = (event: any) => {
                                                    const transcript = event.results[0][0].transcript;
                                                    setInputValue(transcript);
                                                    setIsTyping(false);
                                                };

                                                recognition.onerror = (event: any) => {
                                                    setIsTyping(false);
                                                    console.error("[Salty Audio Error]:", event.error);
                                                    
                                                    // Detailed Elite Feedback
                                                    if (event.error === 'not-allowed') {
                                                        alert("Micrófono detectado como 'Bloqueado' (not-allowed). 🔱 Verifique que no tenga Salty abierta en otra pestaña o que los permisos del sitio villaretiror.com estén en 'Permitir'.");
                                                    } else if (event.error === 'network') {
                                                        alert("Falla de red. Verifique su conexión al puerto. 🔱⚓");
                                                    } else if (event.error === 'no-speech') {
                                                        // Silence is fine, just stop
                                                    } else {
                                                        alert(`Error acústico: ${event.error}. Reintente, capitán. 🎙️`);
                                                    }
                                                };

                                                recognition.onend = () => {
                                                    setIsTyping(false);
                                                };

                                                try {
                                                    recognition.start();
                                                } catch (e) {
                                                    console.error("Init failure:", e);
                                                    setIsTyping(false);
                                                }
                                            }}
                                        >
                                            <span className={`material-icons text-lg ${isTyping ? 'animate-pulse text-red-500' : ''}`}>
                                                {isTyping ? 'graphic_eq' : 'mic'}
                                            </span>
                                        </button>
                                        <input 
                                            type="text"
                                            placeholder="Habla con Salty..."
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-xs focus:ring-2 ring-primary/20 outline-none shadow-inner h-9"
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={isTyping || !inputValue.trim()}
                                            className="w-9 h-9 bg-[#BBA27E] text-[#1a1a1a] rounded-xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all font-black text-xs h-9"
                                        >
                                            <span className="material-icons text-sm">send</span>
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {/* Indicator Triangle (Only in Toast mode) */}
                            {!isExpanded && (
                                <div className="absolute bottom-0 right-4 w-4 h-4 bg-white/95 rotate-45 translate-y-2 border-r border-b border-black/5"></div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🔱 The Persistent Avatar (The "Anchor") */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isExpanded) setIsExpanded(false);
                    else {
                        if (!showBubble) {
                            setMessage(getContextualPill());
                            setShowBubble(true);
                        }
                        setIsExpanded(true);
                        setIsMinimized(false);
                    }
                }}
                className={`pointer-events-auto cursor-pointer relative group`}
            >
                {/* Visual "Living" Pulse & Glow */}
                <AnimatePresence>
                    {isPulsing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: [1, 1.2, 1] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="absolute inset-[-10px] bg-primary/20 rounded-full blur-xl z-[-1]"
                        />
                    )}
                </AnimatePresence>
                
                <div className={`w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-white transition-all duration-500 overflow-hidden ${isMinimized ? 'opacity-90 grayscale-[0.2]' : 'opacity-100 ring-4 ring-[#BBA27E]/10 scale-105'}`}>
                    <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    
                    {/* Interior Gleam */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </motion.div>
        </div>
    );
};

export default SaltyToast;
