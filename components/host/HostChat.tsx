import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: number;
  text: string;
  sender: string;
  created_at?: string;
}

interface HostChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const HostChat: React.FC<HostChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getMockMessages = (): Message[] => [
    { id: 1, text: "Hola, ¿podrían ayudarme con el código de la puerta?", sender: 'guest', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, text: "Claro, es 4829 seguido de la tecla #.", sender: 'host', created_at: new Date(Date.now() - 3500000).toISOString() },
    { id: 3, text: "¡Muchas gracias!", sender: 'guest', created_at: new Date(Date.now() - 3400000).toISOString() }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();

      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          setMessages(prev => [...prev, payload.new as Message]);
          scrollToBottom();
        })
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') console.log('Host chat realtime unavailable');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setIsOffline(false);
    } catch (error) {
      console.warn('Host Chat: Database unreachable. Using Simulation.');
      setMessages(getMockMessages());
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText("");

    // Optimistic
    setMessages(prev => [...prev, { id: Date.now(), text: textToSend, sender: 'host', created_at: new Date().toISOString() }]);

    if (isOffline) {
      // Mock Auto-Reply from "Guest"
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "¡Entendido, gracias! (Simulación Huésped)",
          sender: 'guest',
          created_at: new Date().toISOString()
        }]);
      }, 2000);
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert([{ text: textToSend, sender: 'host' }]);

    if (error) {
      console.error('Error sending message:', error);
      setIsOffline(true); // Fallback to offline on error
    } else {
      // AI Logic only in online mode to avoid complexity in frontend
      if (textToSend.toLowerCase().includes('wifi')) {
        setTimeout(async () => {
          await supabase.from('messages').insert([{
            text: "Recordatorio: La red es 'VillaRetiro_Starlink'.",
            sender: 'ai'
          }]);
        }, 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
      {/* Chat Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <span className="material-icons">arrow_back_ios_new</span>
          </button>
          <div className="relative">
            <img src="https://i.pravatar.cc/150?img=32" alt="Guest" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-text-main leading-tight">Meliza</h3>
            <p className="text-[10px] text-text-light">{isOffline ? 'Simulación Activa' : 'Check-in hoy'}</p>
          </div>
        </div>
        <button className="text-primary bg-primary/10 p-2 rounded-full">
          <span className="material-icons text-sm">smart_toy</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sand">
        <div className="flex justify-center my-4">
          <span className="text-[10px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full font-bold">Hoy</span>
        </div>

        {loading && messages.length === 0 && (
          <p className="text-center text-xs text-gray-400">Cargando...</p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender === 'host';
          const isAi = msg.sender === 'ai';
          const time = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '...';

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {isAi && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center mr-2 self-end mb-1 shadow-md">
                  <span className="material-icons text-white text-[10px]">smart_toy</span>
                </div>
              )}
              {!isMe && !isAi && (
                <img src="https://i.pravatar.cc/150?img=32" className="w-6 h-6 rounded-full mr-2 self-end mb-1" />
              )}

              <div className={`max-w-[75%] p-3 rounded-2xl text-sm relative ${isMe
                  ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/20'
                  : isAi
                    ? 'bg-white border border-blue-100 text-gray-700 rounded-bl-none shadow-sm'
                    : 'bg-white border border-gray-100 text-text-main rounded-bl-none shadow-sm'
                }`}>
                {isAi && <p className="text-[9px] font-bold text-blue-500 mb-1 flex items-center gap-1">Asistente IA <span className="material-icons text-[10px]">bolt</span></p>}
                <p>{msg.text}</p>
                <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{time}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button type="button" className="p-3 text-gray-400 hover:text-primary transition-colors">
            <span className="material-icons">add_circle_outline</span>
          </button>
          <div className="flex-1 bg-gray-100 rounded-2xl flex items-center">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              type="text"
              placeholder="Escribe un mensaje..."
              className="bg-transparent w-full p-3 text-sm outline-none text-text-main placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-primary text-white rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-icons text-sm">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default HostChat;