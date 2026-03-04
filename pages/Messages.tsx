
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    // Simulación de carga de mensajes
    setTimeout(() => {
      setMessages([
        { id: 1, text: "¡Hola! Bienvenidos a Cabo Rojo. ¿Tienen alguna duda sobre la llegada?", sender: 'host', created_at: new Date(Date.now() - 3600000).toISOString() }
      ]);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now(), text: inputText, sender: 'guest', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    const query = inputText.toLowerCase();
    setInputText("");

    // Lógica IA "Dudas Boricuas" integrada
    setTimeout(() => {
      let aiResponse = "¡Gracias por escribir! Carlos (el host) te contestará en breve. Si es sobre la llegada, el código se activa a las 3:00 PM.";
      
      if (query.includes("playa") || query.includes("buye")) {
        aiResponse = "Playa Buyé está a solo 5 min en carro. ¡Es la favorita de la zona! Te recomendamos ir temprano los fines de semana.";
      } else if (query.includes("luz") || query.includes("planta") || query.includes("energia")) {
        aiResponse = "¡Tranquilo/a! Villa Retiro cuenta con generador eléctrico automático y cisterna. Aquí tus vacaciones no se interrumpen.";
      } else if (query.includes("comida") || query.includes("poblado")) {
        aiResponse = "El Poblado de Boquerón está 'walking distance' de Pirata House. Allí tienes los mejores ostiones y música en vivo.";
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'host',
        created_at: new Date().toISOString()
      }]);
    }, 1500);
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sand/30">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'guest' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.sender === 'guest' ? 'bg-primary text-white rounded-br-none' : 'bg-white text-text-main rounded-bl-none shadow-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
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

