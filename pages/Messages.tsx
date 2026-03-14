import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PayPalPayment from '../components/PayPalPayment';
import jsPDF from 'jspdf';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge';
import { PROPERTIES } from '../constants';

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'ai';
  created_at: string;
}

const STORAGE_KEY = 'villa_retiro_ai_chat_history';
const SESSION_KEY = 'villa_retiro_ai_session_id';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state as { initialPlace?: string } | null;
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hostIsTyping, setHostIsTyping] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Intentar obtener el propertyId si venimos de una página de villa
  const urlParams = new URLSearchParams(window.location.search);
  const propertyIdFromUrl = urlParams.get('propertyId');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getSessionId = () => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };

  const sessionId = getSessionId();

  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed: Message[] = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error("Error parsing chat history:", e);
      }
    }

    const initialMessages: Message[] = [{
      id: crypto.randomUUID(),
      text: '¡Hola! Soy Salty, tu guía personal en Cabo Rojo. Estoy aquí para que tu estancia en Villa Retiro sea tan perfecta como un baño en el Caribe. ¿En qué te ayudo hoy?',
      sender: 'ai',
      created_at: new Date().toISOString()
    }];

    if (locationState?.initialPlace) {
      initialMessages.push({
        id: crypto.randomUUID(),
        text: `¡Veo que te interesa ${locationState.initialPlace}! Es de mis lugares favoritos. ¿Quieres que te cuente un poco más o te diga qué llevar?`,
        sender: 'ai',
        created_at: new Date().toISOString()
      });
    }

    setMessages(initialMessages);

    // 🔗 CHAT MIRROR & typing: Supabase Realtime Subscription
    const channelLogs = supabase.channel(`chat_logs_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_logs', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload.new.is_host_typing !== undefined) {
             setHostIsTyping(payload.new.is_host_typing);
          }
        }
      )
      .subscribe();

    const channelHistory = supabase.channel(`chat_mirror_history_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_chat_logs', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg.sender === 'host') {
            setMessages((prev) => {
              if (prev.some(m => m.text === newMsg.text)) return prev;
              const hostMsg: Message = {
                id: newMsg.id || crypto.randomUUID(),
                text: newMsg.text,
                sender: 'ai',
                created_at: newMsg.created_at
              };
              hostMsg.text = `👨🏻‍💻 [Host] ${hostMsg.text}`;
              return [...prev, hostMsg];
            });
            setHostIsTyping(false); // Si llega el mensaje, deja de escribir
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelLogs);
      supabase.removeChannel(channelHistory);
    };
  }, [locationState, sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, hostIsTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      text: inputText.trim(),
      sender: 'guest',
      created_at: new Date().toISOString()
    };

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
    const emailMatch = inputText.match(emailRegex);
    if (emailMatch) {
      try {
        fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contact',
            contactData: {
              name: 'Usuario de Chat IA',
              email: emailMatch[0],
              message: `El cliente ha proporcionado su correo solicitando soporte humano desde el Asistente AI. Mensaje: "${inputText.trim()}"`
            }
          })
        });
      } catch (e) { }
    }

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // 🤖 AI BUFFER LOGIC: Delay intencional para simular refresco de iCal
    const lowerText = inputText.toLowerCase();
    const isDateQuery = lowerText.includes('fecha') || lowerText.includes('disponib') || lowerText.includes('cuándo') || lowerText.includes('enero') || lowerText.includes('febrero');

    if (isDateQuery) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const apiMessages = messages.concat(userMsg).map(m => ({
        role: m.sender === 'guest' ? 'user' : 'model',
        content: m.text
      }));

      // Timeout de 8 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let response;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: getSessionId(),
            userId,
            propertyId: propertyIdFromUrl || (locationState?.initialPlace ? '1081171030449673920' : null),
            currentUrl: window.location.href
          }),
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            text: 'Mi respuesta está tardando más de lo habitual. Si desea reservar, puede escribirnos en el WhatsApp o simplemente dígame: «Quiero reservar» cuando esté listo.',
            sender: 'ai',
            created_at: new Date().toISOString()
          }]);
          setIsTyping(false);
          return;
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      // --- CABLEADO DE STREAMING ---
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error en el chat');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo inicializar el lector de stream');

      const decoder = new TextDecoder();
      let aiResponseText = "";
      const aiMsgId = crypto.randomUUID();

      // Agregar mensaje inicial vacío para la IA
      setMessages(prev => [...prev, {
        id: aiMsgId,
        text: "",
        sender: 'ai',
        created_at: new Date().toISOString()
      }]);

      setIsTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponseText += chunk;
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: aiResponseText } : m
        ));
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: 'Disculpe la demora. Nuestro concierge tendrá respuesta en breve. Mientras tanto, puede escribirnos por WhatsApp o decirme «Quiero reservar» para iniciar el proceso de pago.',
        sender: 'ai',
        created_at: new Date().toISOString()
      }]);
      setIsTyping(false);
    }
  };

  const handlePaymentSuccess = async (details: any, propertyId: string, checkIn: string, checkOut: string, guests: number, total: number) => {
    try {
      // 1. Crear Reserva Confirmada en Supabase
      const { data: insertedBooking, error } = await supabase.from('bookings').insert({
        property_id: propertyId,
        guest_id: null,
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
        total_price: total,
        status: 'confirmed'
      }).select().single();

      if (error || !insertedBooking) {
        console.error("Booking error:", error);
        alert("Hubo un problema registrando su reserva. Su pago está seguro, por favor contáctenos con su número de recibo: " + details.id);
        return;
      }

      // Generate PDF Contract
      try {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`CONTRATO DE ALQUILER - VILLA RETIRO R LLC`, 20, 20);
        doc.setFontSize(12);
        doc.text(`ID Reserva: ${insertedBooking.id} | Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Propiedad ID: ${propertyId}`, 20, 40);
        doc.text(`Fechas: ${checkIn} al ${checkOut}`, 20, 50);
        doc.text(`Huéspedes: ${guests}`, 20, 60);
        doc.text(`Total Pagado: $${total} USD (PayPal)`, 20, 70);
        doc.text(`Términos y Condiciones:`, 20, 90);
        doc.setFontSize(10);
        const splitRules = doc.splitTextToSize(VILLA_KNOWLEDGE.policies.rules + ' ' + VILLA_KNOWLEDGE.policies.cancellation, 170);
        doc.text(splitRules, 20, 100);
        doc.text(`Firma Digital (Términos Aceptados en Checkout)`, 20, 200);

        const pdfBlob = doc.output('blob');
        const fileName = `contrato_${insertedBooking.id}_${Date.now()}.pdf`;

        await supabase.storage.from('contracts').upload(fileName, pdfBlob, {
          contentType: 'application/pdf'
        });
      } catch (pdfErr) {
        console.error("No se pudo generar/subir el PDF", pdfErr);
      }

      // 2. Enviar Confirmación y Guía de Acceso por Correo vía Resend
      const customerEmail = details.payer?.email_address || 'Sin correo';
      const customerName = details.payer?.name?.given_name || 'Huésped';

      // Buscamos las credenciales de la propiedad en nuestras constantes
      const property = PROPERTIES.find((p: any) => p.id === propertyId);

      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_success',
          customerName,
          customerEmail,
          propertyName: property?.title || "Tu Villa",
          checkIn,
          checkOut,
          accessCode: property?.policies?.accessCode,
          wifiName: property?.policies?.wifiName,
          wifiPass: property?.policies?.wifiPass,
          propertyId: propertyId
        })
      });

      // 3. Respuesta de Éxito en el Chat
      const successMsg: Message = {
        id: crypto.randomUUID(),
        text: `¡Pago confirmado! Sus instrucciones de llegada y claves de acceso ya están disponibles en su Portal de Huésped.`,
        sender: 'ai',
        created_at: new Date().toISOString()
      };

      const updatedMessages = [...messages, successMsg];
      setMessages(updatedMessages);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));

      // Redirigir al Guest Dashboard VIP
      navigate(`/stay/${insertedBooking.id}`);

    } catch (e) {
      console.error(e);
      alert("Error procesando los detalles finales.");
    }
  };

  if (!activeChatId) {
    return (
      <div className="min-h-screen bg-sand px-4 pt-12 pb-24 animate-fade-in">
        <h1 className="text-3xl font-serif font-bold mb-8">Asistencia Premium</h1>
        <div
          onClick={() => setActiveChatId('ai-chat')}
          className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-soft border border-white/20 flex gap-5 items-center cursor-pointer hover:shadow-lg active:scale-95 transition-all group"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-[#FF8A66] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
              <span className="material-icons text-2xl">hotel_class</span>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-serif font-black italic text-lg text-text-main tracking-tighter">Salty: Concierge 360</span>
              <span className="text-[9px] font-bold text-white bg-primary px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">En Vivo</span>
            </div>
            <p className="text-[11px] font-medium text-text-light truncate opacity-60">¿Cómo puedo ayudarle a planear su visita?</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-slide-up">
      <header className="px-6 py-5 border-b border-gray-100/50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-5">
          <button onClick={() => setActiveChatId(null)} className="material-icons text-text-main hover:bg-gray-100 p-2.5 rounded-full -ml-3 transition-colors">arrow_back_ios_new</button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-[#FF8A66] flex items-center justify-center text-white shadow-float relative">
              <span className="material-icons text-xl">hotel_class</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <p className="font-serif font-black italic text-lg text-text-main tracking-tighter">Salty - Concierge</p>
              <p className="text-[9px] text-green-600 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                En Línea
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbfaf8] scroll-smooth pb-10">
        <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest my-6">Villa Retiro R LLC - Soporte 24/7</div>
        {messages.map((m, i) => {
          // Extraer la etiqueta de pago
          const paymentMatch = m.text.match(/\[PAYMENT_REQUEST:\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^\]]+)\]/);
          let displayText = m.text;
          let paymentData = null;

          if (paymentMatch) {
            displayText = m.text.replace(paymentMatch[0], '');
            paymentData = {
              propertyId: paymentMatch[1].trim(),
              total: parseFloat(paymentMatch[2].trim()),
              checkIn: paymentMatch[3].trim(),
              checkOut: paymentMatch[4].trim(),
              guests: parseInt(paymentMatch[5].trim())
            };
          }
          const propertyId = paymentData?.propertyId;

          // Helper para procesar links en el texto (sin tocar la lógica del bot)
          const formatMessageText = (text: string, pId?: string) => {
            if (!text.includes('/contrato')) return text;
            const parts = text.split(/((?:https?:\/\/villaretiror\.com)?\/contrato\??[^\s]*)/g);
            return parts.map((part, index) => {
              if (part.includes('/contrato')) {
                const finalId = pId || propertyId || '1081171030449673920';
                return (
                  <Link key={index} to={`/contrato?id=${finalId}`} className="text-orange-600 font-bold underline hover:text-orange-700">
                    Contrato de Alquiler
                  </Link>
                );
              }
              return part;
            });
          };

          return (
            <div key={m.id} className={`flex ${m.sender === 'guest' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] p-5 text-[14px] leading-relaxed relative transition-all duration-300 ${m.sender === 'guest'
                ? 'bg-black text-white rounded-[24px] rounded-br-[4px] shadow-soft'
                : 'bg-white/80 backdrop-blur-md text-text-main rounded-[24px] rounded-tl-[4px] shadow-soft-sm border border-white/20'
                }`}>
                <div className={`flex items-center gap-1.5 mb-2 text-[9px] font-bold uppercase tracking-[0.1em] ${m.sender === 'guest' ? 'text-white/40' : 'text-primary/70'}`}>
                  {m.sender === 'guest' ? 'Usted' : (
                    <span className="flex items-center gap-1.5">
                      <span className="material-icons text-[12px]">auto_awesome</span>
                      <span className="font-serif font-black italic tracking-tighter text-[11px]">Salty Concierge</span>
                    </span>
                  )}
                </div>

                <div className="font-medium tracking-tight whitespace-pre-wrap">{formatMessageText(displayText, propertyId)}</div>

                {/* Mostrar Botón de PayPal si hay Payment Request */}
                {paymentData && m.sender === 'ai' && (
                  <div className="mt-4 p-5 bg-orange-50/80 rounded-2xl border border-orange-200 animate-slide-up shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">Desglose de Inversión</p>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-orange-900 font-bold">Total Final:</span>
                      <span className="text-lg font-black text-black">${paymentData.total}</span>
                    </div>
                    <p className="text-[10px] text-orange-800 mb-4 opacity-80 leading-tight">Estancia: {paymentData.checkIn} al {paymentData.checkOut}<br />Huéspedes: {paymentData.guests}</p>

                    {isAuthenticated === false ? (
                      <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 text-center animate-fade-in shadow-sm">
                        <span className="material-icons text-orange-400 mb-2">lock</span>
                        <p className="text-[12px] font-bold text-gray-800 mb-4 uppercase tracking-tighter">Inicie sesión para completar su reserva</p>
                        <button
                          onClick={() => navigate('/login?redirect=messages')}
                          className="w-full bg-[#FF6633] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 transition-transform active:scale-95"
                        >
                          Acceder / Registrarse
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 bg-white/50 p-3 rounded-xl">
                          <label className="flex items-start gap-2 cursor-pointer text-[10px] text-orange-900 leading-tight">
                            <input type="checkbox" className="mt-0.5 accent-orange-600" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
                            <span>He leído y acepto firmar el <Link to={`/contrato?id=${paymentData.propertyId}`} target="_blank" className="font-bold underline hover:text-orange-600">Contrato de Alquiler Digital</Link> y las reglas de la casa.</span>
                          </label>
                        </div>

                        {acceptedTerms ? (
                          <div className="bg-white p-2 rounded-xl shadow-sm animate-fade-in">
                            <PayPalPayment
                              amount={paymentData.total}
                              onSuccess={(details) => handlePaymentSuccess(details, paymentData.propertyId, paymentData.checkIn, paymentData.checkOut, paymentData.guests, paymentData.total)}
                              onError={(err) => alert("Error con PayPal: " + err)}
                            />
                          </div>
                        ) : (
                          <div className="bg-orange-100/50 p-3 rounded-xl border border-dashed border-orange-300 text-center">
                            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest">Acepte los términos para pagar</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <span className={`text-[9px] font-medium absolute -bottom-5 ${m.sender === 'guest' ? 'right-2 text-gray-400' : 'left-2 text-gray-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {hostIsTyping && (
          <div className="flex justify-start animate-fade-in mt-6">
            <div className="max-w-[85%] px-5 py-4 bg-primary/5 border border-primary/10 rounded-[20px] rounded-tl-[4px] shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary/60 mr-1 animate-pulse">edit_note</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Un miembro del equipo está redactando una respuesta...</p>
            </div>
          </div>
        )}
        {isTyping && (
          <div className="flex justify-start animate-fade-in mt-6">
            <div className="max-w-[85%] px-5 py-4 bg-white border border-blue-100 rounded-[20px] rounded-tl-[4px] shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary/40 mr-1 animate-pulse">edit</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Omitiendo delays: Verificando Calendarios...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2 relative shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ej: ¿Qué fechas hay disponibles?"
          className="flex-1 bg-[#f4f3f0] border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-text-main placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <span className="material-icons">send</span>
        </button>
      </form>
    </div>
  );
};

export default Messages;
