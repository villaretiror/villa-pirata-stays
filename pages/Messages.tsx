
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Message {
  id: number;
  text: string;
  sender: string;
  created_at: string;
}

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    fetchMessages();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.toLowerCase();
    const messageText = inputText;
    setInputText("");

    // Guardar en Supabase
    const { error } = await supabase.from('messages').insert({
      text: messageText,
      sender: 'guest'
    });

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    setIsTyping(true);

    // Lógica IA "Dudas Boricuas" integrada - Villa Retiro R LLC
    setTimeout(async () => {
      let aiResponse = "¡Gracias por escribir! Carlos de Villa Retiro R LLC te contestará en breve. Si es sobre la llegada, tu código de acceso se activa a las 3:00 PM.";

      if (query.includes("playa") || query.includes("buye")) {
        aiResponse = "Playa Buyé está a solo 5 min en carro desde Villa Retiro R. ¡Es la favorita de la zona! Te recomendamos ir temprano los fines de semana para conseguir buen parking.";
      } else if (query.includes("luz") || query.includes("planta") || query.includes("energia")) {
        aiResponse = "¡Tranquilo/a! Villa Retiro R LLC cuenta con generador eléctrico automático y cisterna industrial. Aquí tus vacaciones no se interrumpen por nada.";
      } else if (query.includes("comida") || query.includes("poblado") || query.includes("comer")) {
        aiResponse = "El Poblado de Boquerón está a solo 10 minutos. Allí tienes los mejores ostiones, mariscos frescos y música en vivo. ¡100% recomendado!";
      }

      // Guardar respuesta de la IA/Host en Supabase
      await supabase.from('messages').insert({
        text: aiResponse,
        sender: 'host'
      });

      setIsTyping(false);
    }, 1800);
  };

  if (!activeChatId) {
    return (
      <div className="min-h-screen bg-sand px-4 pt-12 pb-24 animate-fade-in">
        <h1 className="text-3xl font-serif font-bold mb-8">Mensajes</h1>
        <div
          onClick={() => setActiveChatId('host-chat')}
          className="bg-white p-5 rounded-[2rem] shadow-card border border-gray-100 flex gap-4 items-center cursor-pointer active:scale-95 transition-all"
        >
          <div className="relative">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg" className="w-14 h-14 rounded-full object-cover" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-text-main">Carlos (Host)</span>
              <span className="text-[10px] text-gray-400">Hace 1h</span>
            </div>
            <p className="text-xs text-text-light truncate">¿Tienen alguna duda sobre la llegada?</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-slide-up">
      <header className="px-4 py-4 border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => setActiveChatId(null)} className="material-icons text-text-main">arrow_back</button>
        <div className="flex items-center gap-3">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg" className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-bold text-sm">Carlos (Host)</p>
            <p className="text-[10px] text-green-500 font-bold uppercase">En Línea</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sand/30 scroll-smooth pb-10">
        <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest my-4">Hoy</div>
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'guest' ? 'justify-end animate-slide-up' : 'justify-start animate-fade-in'}`}>
            <div className={`max-w-[85%] p-4 text-[13px] leading-relaxed relative ${m.sender === 'guest' ? 'bg-primary text-white rounded-2xl rounded-tr-sm shadow-sm' : 'bg-white text-text-main rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'}`}>
              {m.text}
              <span className={`text-[8px] absolute -bottom-5 ${m.sender === 'guest' ? 'right-1 text-gray-400' : 'left-1 text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Pregunta sobre la playa, luz, comida..."
          className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
        />
        <button type="submit" className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <span className="material-icons">send</span>
        </button>
      </form>
    </div>
  );
};

export default Messages;

