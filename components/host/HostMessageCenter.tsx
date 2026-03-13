import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Thread {
    id: string;
    guestName: string;
    source: 'Airbnb' | 'Booking' | 'Directo' | 'Salty AI';
    lastMessage: string;
    timestamp: string;
    unread: number;
    avatar: string;
    status: 'active' | 'archived';
}

interface Message {
    id: number;
    text: string;
    sender: 'host' | 'guest' | 'ai';
    created_at: string;
}

const mockThreads: Thread[] = [
    { id: '1', guestName: 'Familia Torres', source: 'Directo', lastMessage: '¿Tienen toallas de playa disponibles?', timestamp: '10:42 AM', unread: 2, avatar: 'https://i.pravatar.cc/150?img=32', status: 'active' },
    { id: '2', guestName: 'Michael Brown', source: 'Airbnb', lastMessage: 'We just landed in San Juan! Ready for the drive.', timestamp: 'Ayer', unread: 0, avatar: 'https://i.pravatar.cc/150?img=11', status: 'active' },
    { id: '3', guestName: 'Ana Smith', source: 'Salty AI', lastMessage: '[Lead Capturado] El cliente preguntó por fechas en diciembre y dejó su correo.', timestamp: 'Martes', unread: 0, avatar: 'https://i.pravatar.cc/150?img=5', status: 'active' },
];

const HostMessageCenter: React.FC = () => {
    const [threads, setThreads] = useState<Thread[]>(mockThreads);
    const [activeThread, setActiveThread] = useState<Thread | null>(mockThreads[0]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
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
        // Simulating API call or DB fetch based on thread id
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeThread) return;

        const newMsg: Message = {
            id: Date.now(),
            text: inputText,
            sender: 'host',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText("");
        scrollToBottom();

        // Actualizar el "last message" del thread mock
        setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, lastMessage: newMsg.text, timestamp: 'Ahora' } : t));

        // Si tuviéramos tabla en Supabase
        // await supabase.from('messages').insert({ thread_id: activeThread.id, text: newMsg.text, sender: 'host' });
    };

    const getSourceBadge = (source: Thread['source']) => {
        switch (source) {
            case 'Airbnb': return <span className="bg-[#FF5A5F]/10 text-[#FF5A5F] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Airbnb</span>;
            case 'Booking': return <span className="bg-[#003580]/10 text-[#003580] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Booking.com</span>;
            case 'Salty AI': return <span className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Salty AI</span>;
            default: return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Directo</span>;
        }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-card flex overflow-hidden h-[75vh] animate-fade-in relative z-10">

            {/* LEFT SIDEBAR: Threads */}
            <div className="w-1/3 min-w-[300px] border-r border-gray-100 flex flex-col bg-gray-50/50">
                <div className="p-5 border-b border-gray-100 bg-white">
                    <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Mensajes</h2>
                    <div className="relative">
                        <span className="material-icons absolute left-3 top-3 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar huésped o mensaje..."
                            className="w-full pl-9 p-2.5 bg-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    {threads.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => setActiveThread(t)}
                            className={`p-3 rounded-2xl cursor-pointer transition-all flex gap-3 relative overflow-hidden group ${activeThread?.id === t.id ? 'bg-white shadow-soft border border-gray-100 scale-[0.98]' : 'hover:bg-white/60 border border-transparent hover:border-gray-50'}`}
                        >
                            {activeThread?.id === t.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-lg"></div>}
                            <div className="relative">
                                <img src={t.avatar} alt="Guest avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                {t.unread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#FF385C] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                        {t.unread}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-sm font-bold truncate pr-2 ${t.unread > 0 ? 'text-text-main' : 'text-gray-700'}`}>{t.guestName}</span>
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{t.timestamp}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getSourceBadge(t.source)}
                                    <p className={`text-xs truncate ${t.unread > 0 ? 'text-text-main font-bold' : 'text-gray-500'}`}>{t.lastMessage}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANE: Active Chat */}
            <div className="flex-1 flex flex-col bg-[#fdfcfb]">
                {activeThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <img src={activeThread.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt="Guest" />
                                <div>
                                    <h3 className="font-bold text-lg text-text-main leading-none mb-1">{activeThread.guestName}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">En línea</span>
                                        <span className="text-gray-300">|</span>
                                        {getSourceBadge(activeThread.source)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors">
                                    <span className="material-icons text-[18px]">phone</span>
                                </button>
                                <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors">
                                    <span className="material-icons text-[18px]">more_vert</span>
                                </button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="text-center">
                                <span className="inline-block bg-white border border-gray-100 text-[10px] font-bold text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                    Conversación Iniciada
                                </span>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender === 'host';
                                    const isAi = msg.sender === 'ai';
                                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                            {!isMe && !isAi && (
                                                <img src={activeThread.avatar} className="w-8 h-8 rounded-full border border-gray-200 mr-2 self-end mb-1 shadow-sm" alt="Guest" />
                                            )}

                                            {isAi && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center mr-2 self-end mb-1 shadow-md">
                                                    <span className="material-icons text-white text-[12px]">smart_toy</span>
                                                </div>
                                            )}

                                            <div className={`max-w-[70%] p-4 text-sm relative group ${isMe
                                                    ? 'bg-primary text-white rounded-[24px] rounded-br-sm shadow-[0_8px_20px_rgba(255,127,63,0.15)]'
                                                    : isAi
                                                        ? 'bg-white border border-purple-100 text-gray-800 rounded-[24px] rounded-bl-sm shadow-sm'
                                                        : 'bg-white border border-gray-100 text-text-main rounded-[24px] rounded-bl-sm shadow-sm'
                                                }`}>
                                                {isAi && <p className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1 uppercase tracking-wider">Asistente IA <span className="material-icons text-[12px]">bolt</span></p>}
                                                <p className="leading-relaxed">{msg.text}</p>

                                                <div className={`flex items-center gap-1 mt-2 justify-end ${isMe ? 'opacity-80' : 'opacity-40'}`}>
                                                    <span className="text-[9px] font-medium">{time}</span>
                                                    {isMe && <span className="material-icons text-[12px]">done_all</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input Bar */}
                        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-10">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-3 bg-gray-50 rounded-[24px] p-2 pr-2.5 border border-transparent focus-within:border-primary/20 focus-within:bg-white focus-within:shadow-soft transition-all">

                                <div className="flex gap-1 pl-2">
                                    <button type="button" className="w-10 h-10 rounded-full text-gray-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-colors">
                                        <span className="material-icons">add_circle_outline</span>
                                    </button>
                                    <button type="button" className="w-10 h-10 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center transition-colors hidden sm:flex">
                                        <span className="material-icons">image</span>
                                    </button>
                                </div>

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
                                        placeholder={`Escribir a ${activeThread.guestName}...`}
                                        className="w-full bg-transparent resize-none max-h-32 min-h-[44px] text-sm text-text-main outline-none block leading-relaxed py-3 custom-scrollbar"
                                        rows={1}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none transition-all hover:scale-105 active:scale-95 flex-shrink-0 mb-0.5"
                                >
                                    <span className="material-icons text-[18px]">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <span className="material-icons text-5xl text-gray-200">forum</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-gray-800 mb-2">Centro de Mensajes</h3>
                        <p className="text-sm font-medium text-center max-w-sm">Seleccione una conversación para ver el hilo completo o enviar un mensaje.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostMessageCenter;
