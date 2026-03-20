import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, MoreVertical, Send, Sparkles, Search, 
  MapPin, Calendar, CreditCard, ChevronRight, 
  Languages, Quote, CheckCheck, Landmark,
  ShieldCheck, MessageSquare, PlusCircle, Paperclip
} from 'lucide-react';

interface Thread {
    id: string;
    guestName: string;
    source: 'Airbnb' | 'Booking' | 'Directo' | 'Salty AI';
    lastMessage: string;
    timestamp: string;
    unread: number;
    avatar: string;
    status: 'active' | 'archived';
    property?: string;
    dates?: string;
    paymentStatus?: 'paid' | 'pending';
}

interface Message {
    id: number;
    text: string;
    sender: 'host' | 'guest' | 'ai';
    created_at: string;
}

const mockThreads: Thread[] = [
    { id: '1', guestName: 'Familia Torres', source: 'Directo', lastMessage: '¿Tienen toallas de playa disponibles?', timestamp: '10:42 AM', unread: 2, avatar: 'https://i.pravatar.cc/150?img=32', status: 'active', property: 'Pirata Family House', dates: '22 - 25 Mar', paymentStatus: 'paid' },
    { id: '2', guestName: 'Michael Brown', source: 'Airbnb', lastMessage: 'We just landed in San Juan! Ready for the drive.', timestamp: 'Ayer', unread: 0, avatar: 'https://i.pravatar.cc/150?img=11', status: 'active', property: 'Villa Retiro R', dates: 'Hoy - 28 Mar', paymentStatus: 'paid' },
    { id: '3', guestName: 'Ana Smith', source: 'Salty AI', lastMessage: '[Lead Capturado] El cliente preguntó por fechas en diciembre y dejó su correo.', timestamp: 'Martes', unread: 0, avatar: 'https://i.pravatar.cc/150?img=5', status: 'active', property: 'Interés en Pirata', dates: 'Diciembre', paymentStatus: 'pending' },
];

const HostMessageCenter: React.FC = () => {
    const [threads, setThreads] = useState<Thread[]>(mockThreads);
    const [activeThread, setActiveThread] = useState<Thread | null>(mockThreads[0]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSaltyDrafting, setIsSaltyDrafting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeThread) {
            fetchMessages(activeThread.id);
        }
    }, [activeThread]);

    const fetchMessages = async (threadId: string) => {
        setLoading(true);
        setTimeout(() => {
            const mockChat: Message[] = [
                { id: 1, text: "Hola, ¿podrían ayudarme con una duda?", sender: 'guest', created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 2, text: "¡Hola! Claro que sí, dime cómo puedo ayudarte.", sender: 'host', created_at: new Date(Date.now() - 3500000).toISOString() },
                { id: 3, text: activeThread?.lastMessage || "Perfecto, gracias.", sender: 'guest', created_at: new Date(Date.now() - 3400000).toISOString() }
            ];
            setMessages(mockChat);
            scrollToBottom();
            setLoading(false);
        }, 400);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !activeThread) return;

        const newMsg: Message = {
            id: Date.now(),
            text: inputText,
            sender: 'host',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText("");
        setTimeout(scrollToBottom, 100);
        setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, lastMessage: newMsg.text, timestamp: 'Ahora' } : t));
    };

    const generateSaltyDraft = () => {
        setIsSaltyDrafting(true);
        setTimeout(() => {
            setInputText("¡Hola Familia Torres! Claro que sí, tenemos 6 toallas de playa disponibles en el armario del pasillo principal, justo al lado del baño extra. ¿Necesitan algo más para su estancia?");
            setIsSaltyDrafting(false);
        }, 1200);
    };

    const getSourceBadge = (source: Thread['source']) => {
        switch (source) {
            case 'Airbnb': return <span className="bg-[#FF5A5F]/10 text-[#FF5A5F] px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-[#FF5A5F]/5">Airbnb</span>;
            case 'Booking': return <span className="bg-[#003580]/10 text-[#003580] px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-[#003580]/5">Booking.com</span>;
            case 'Salty AI': return <span className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-purple-200/20">Salty Assist</span>;
            default: return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/10">Canal Directo</span>;
        }
    };

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl flex overflow-hidden h-[80vh] animate-fade-in relative z-10 font-display">

            {/* LEFT SIDEBAR: Threads */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                <div className="p-8 pb-6 border-b border-gray-100 bg-white/50 backdrop-blur-md">
                    <h2 className="font-serif font-black italic text-3xl text-text-main mb-6 tracking-tighter leading-none">Mensajes</h2>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar canal o huésped..."
                            className="w-full pl-11 p-4 bg-white/80 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/10 border border-gray-100 placeholder:text-gray-300 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                    {threads.map((t) => (
                        <motion.div
                            key={t.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveThread(t)}
                            className={`p-5 rounded-[2rem] cursor-pointer transition-all flex gap-4 relative overflow-hidden group ${activeThread?.id === t.id ? 'bg-white shadow-soft border border-gray-100' : 'hover:bg-white/40 border border-transparent shadow-none'}`}
                        >
                            {activeThread?.id === t.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-r-lg" />}
                            <div className="relative flex-shrink-0">
                                <img src={t.avatar} alt="Guest" className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-float group-hover:scale-105 transition-transform" />
                                {t.unread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-lg animate-pulse">
                                        {t.unread}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className={`text-[13px] font-serif font-black italic truncate leading-none ${t.unread > 0 ? 'text-text-main' : 'text-text-main/80'}`}>{t.guestName}</span>
                                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{t.timestamp}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {getSourceBadge(t.source)}
                                    <p className={`text-[11px] truncate leading-tight ${t.unread > 0 ? 'text-text-main font-bold' : 'text-gray-400 truncate-2'}`}>{t.lastMessage}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* MIDDLE PANE: Active Chat */}
            <div className="flex-1 flex flex-col bg-[#FDFCFB] relative">
                {activeThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-10 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl flex justify-between items-center z-20 shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                  <img src={activeThread.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 p-0.5 shadow-sm" alt="Guest" />
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                </div>
                                <div>
                                    <h3 className="font-serif font-black italic text-xl text-text-main leading-tight mb-1">{activeThread.guestName}</h3>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">En Línea</p>
                                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                                        {getSourceBadge(activeThread.source)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                            <div className="flex justify-center mb-4">
                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em] border border-gray-100 px-6 py-2 rounded-full bg-white shadow-inner">
                                    Canal Abierto • {activeThread.timestamp}
                                </span>
                            </div>

                            <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="flex flex-col items-center gap-4">
                                       <div className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
                                       <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Sincronizando Historial</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender === 'host';
                                    const isAi = msg.sender === 'ai';
                                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <motion.div 
                                          key={msg.id || idx} 
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!isMe && !isAi && (
                                                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 self-end mb-2 shadow-sm border-2 border-white">
                                                   <img src={activeThread.avatar} className="w-full h-full object-cover" alt="Guest" />
                                                </div>
                                            )}

                                            {isAi && (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center mr-3 self-end mb-2 shadow-lg border-2 border-white">
                                                    <Sparkles className="text-white w-4 h-4" />
                                                </div>
                                            )}

                                            <div className={`max-w-[80%] p-6 text-[13px] relative ${isMe
                                                    ? 'bg-black text-white rounded-[2.5rem] rounded-br-sm shadow-2xl'
                                                    : isAi
                                                        ? 'bg-white border border-purple-100 text-gray-800 rounded-[2.5rem] rounded-bl-sm shadow-soft'
                                                        : 'bg-white border border-gray-100 text-text-main rounded-[2.5rem] rounded-bl-sm shadow-soft'
                                                }`}>
                                                {isAi && (
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <p className="text-[10px] font-serif font-black italic text-purple-600">Salty Smart Draft</p>
                                                    <div className="h-px flex-1 bg-purple-50" />
                                                  </div>
                                                )}
                                                <p className={`leading-relaxed ${isMe ? 'font-medium' : 'font-medium'}`}>{msg.text}</p>

                                                <div className={`flex items-center gap-1.5 mt-4 justify-end ${isMe ? 'opacity-40' : 'opacity-20'}`}>
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{time}</span>
                                                    {isMe && <CheckCheck className="w-3 h-3" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input Bar Elevado */}
                        <div className="p-8 px-10 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-20">
                            {isSaltyDrafting && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-12 left-10 right-10 flex items-center gap-2 bg-purple-50 text-purple-600 p-3 rounded-2xl border border-purple-100 shadow-sm shadow-purple-200/50">
                                   <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                   <p className="text-[9px] font-black uppercase tracking-widest">Salty está analizando el manual de protocolo...</p>
                                   <div className="ml-auto flex gap-1">
                                      {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}} />)}
                                   </div>
                                </motion.div>
                            )}
                            
                            <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                   <button 
                                      type="button" 
                                      onClick={generateSaltyDraft}
                                      className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all group"
                                      disabled={isSaltyDrafting}
                                   >
                                      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                      {isSaltyDrafting ? 'Analizando...' : 'Sugerir con Salty'}
                                   </button>
                                   <div className="h-6 w-px bg-gray-200" />
                                   <button type="button" className="p-3 text-text-light hover:text-primary transition-colors">
                                      <Languages className="w-4 h-4" />
                                   </button>
                                   <button type="button" className="p-3 text-text-light hover:text-primary transition-colors">
                                      <Quote className="w-4 h-4" />
                                   </button>
                                </div>

                                <div className="flex items-end gap-4 bg-gray-50/80 rounded-[2.5rem] p-3 pr-4 border border-gray-100 focus-within:bg-white focus-within:shadow-xl transition-all group">
                                    <button type="button" className="w-12 h-12 rounded-full text-gray-400 hover:text-primary flex items-center justify-center">
                                        <PlusCircle className="w-6 h-6" />
                                    </button>
                                    
                                    <div className="flex-1 py-1">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            placeholder={`Responder al Legado de ${activeThread.guestName}...`}
                                            className="w-full bg-transparent resize-none max-h-32 min-h-[50px] text-sm text-text-main font-medium outline-none block leading-relaxed py-4 px-2 no-scrollbar"
                                            rows={1}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pb-1">
                                       <button type="button" className="w-11 h-11 rounded-full text-gray-400 hover:text-primary flex items-center justify-center hover:bg-white shadow-soft transition-all">
                                          <Paperclip className="w-5 h-5" />
                                       </button>
                                       <button
                                          type="submit"
                                          disabled={!inputText.trim()}
                                          className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl disabled:opacity-20 transition-all hover:bg-gray-900 active:scale-90 group/send"
                                       >
                                          <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rotate-[-15deg] text-primary" />
                                       </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-white">
                        <div className="w-32 h-32 bg-sand rounded-full flex items-center justify-center mb-8 shadow-inner">
                           <MessageSquare className="w-12 h-12 text-primary opacity-30" />
                        </div>
                        <h3 className="text-3xl font-serif font-black italic text-text-main mb-3 leading-none tracking-tighter">Salty CRM & Messaging</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-light opacity-50 max-w-xs leading-relaxed">
                           Seleccione un hilo para auditar la conversación y gestionar la experiencia del huésped.
                        </p>
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR: Booking Context */}
            {activeThread && (
                <div className="w-80 border-l border-gray-100 flex flex-col bg-white overflow-hidden animate-slide-left">
                    <div className="p-8 border-b border-gray-50 text-center">
                        <div className="inline-block px-3 py-1 rounded-full bg-primary/5 text-primary text-[8px] font-black uppercase tracking-[0.3em] mb-4 border border-primary/10">Contexto de Reserva</div>
                        <div className="relative w-40 h-40 mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white mb-6">
                           <img src={activeThread.property === 'Pirata Family House' ? "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=400" : "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&q=80&w=400"} className="w-full h-full object-cover" alt="Property" />
                           <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                              <p className="text-white text-[10px] font-black uppercase tracking-widest">{activeThread.property}</p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                              <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary opacity-40" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-light">Estancia</span>
                                 </div>
                                 <span className="text-[11px] font-black italic serif text-text-main">{activeThread.dates}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-green-500 opacity-40" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-light">Estado</span>
                                 </div>
                                 <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${activeThread.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {activeThread.paymentStatus === 'paid' ? 'Confirmado' : 'Pendiente'}
                                 </span>
                              </div>
                           </div>

                           <div className="p-2 space-y-3 px-4">
                              <button className="w-full flex justify-between items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-text-light/60">Ver Expediente CRM</span>
                                 <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-all" />
                              </button>
                              <button className="w-full flex justify-between items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-text-light/60">Guía de Check-in</span>
                                 <MapPin className="w-4 h-4 text-gray-300 group-hover:text-primary transition-all" />
                              </button>
                           </div>

                           <div className="pt-4 border-t border-gray-50">
                              <div className="flex items-center gap-3 px-6 mb-4">
                                 <ShieldCheck className="w-5 h-5 text-gray-300" />
                                 <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-light text-left">Protocolo Élite Activo • Salty Verified</p>
                              </div>
                           </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default HostMessageCenter;
