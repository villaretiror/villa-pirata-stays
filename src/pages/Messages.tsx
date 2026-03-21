import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PayPalPayment from '../components/PayPalPayment';
import PaymentProcessor from '../components/PaymentProcessor';
import { useProperty } from '../contexts/PropertyContext';
import { HOST_PHONE } from '../constants';

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
  const { properties, villaKnowledge } = useProperty();
  const locationState = useLocation().state as { initialPlace?: string, in_stay?: boolean, property_id?: string, villa?: string } | null;
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hostIsTyping, setHostIsTyping] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [takeoverUntil, setTakeoverUntil] = useState<string | null>(null);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [submittedLeads, setSubmittedLeads] = useState<Record<string, boolean>>({});
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

    const propertyName = properties.find(p => p.id === (locationState?.property_id || propertyIdFromUrl))?.title;

    const initialMessages: Message[] = [{
      id: crypto.randomUUID(),
      text: locationState?.in_stay 
        ? `¡Hola! Veo que estás disfrutando de tu estancia en ${locationState.villa || propertyName || 'nuestra villa'}. Soy Salty, tu concierge VIP. Pregúntame lo que necesites sobre la casa, reglas o lugares cerca para hoy.`
        : `¡Hola! Soy Salty, tu guía personal en Cabo Rojo. Estoy aquí para que tu estancia en ${propertyName || 'nuestras villas'} sea tan perfecta como un baño en el Caribe. ¿En qué te ayudo hoy?`,
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
          if (payload.new.human_takeover_until !== undefined) {
            setTakeoverUntil(payload.new.human_takeover_until);
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

      // Timeout de 45 segundos para dar espacio a tool calls y razonamiento profundo (Salty 2.5)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let response;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;

        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: getSessionId(),
            userId,
            propertyId: propertyIdFromUrl || locationState?.property_id || (locationState?.initialPlace ? '1081171030449673920' : null),
            currentUrl: window.location.href,
            inStay: locationState?.in_stay || false
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

      let fullBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullBuffer += chunk;
        
        // El AI SDK envía datos en formato de protocolo: "T:CONTENIDO\n"
        // Procesamos el buffer buscando líneas completas
        const lines = fullBuffer.split('\n');
        // El último elemento podría estar incompleto, guárdalo para el siguiente chunk
        fullBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line) continue;
          const type = line[0];
          const content = line.substring(2);

          // 0: Mensaje de texto (streaming)
          if (type === '0') {
            setIsTyping(false); // Deja de mostrar el indicador de carga cuando llega el texto
            try {
              // A veces el contenido viene entre comillas
              const textContent = content.startsWith('"') && content.endsWith('"') 
                ? JSON.parse(content) 
                : content;
              
              aiResponseText += textContent;
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, text: aiResponseText } : m
              ));
            } catch (e) {
              // Si falla el parseo, intenta usar el contenido crudo
              aiResponseText += content;
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, text: aiResponseText } : m
              ));
            }
          }
          // a: Tool Call o p: Tool Result (Razonamiento profundo detectado)
          else if (type === 'a' || type === 'p' || type === '1') {
             // Mostramos un mensaje de "Razonamiento" solo si no ha empezado el texto final
             if (!aiResponseText) {
                setIsTyping(true);
             }
          }
        }
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
        user_id: null,
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

      // 🚀 INDUSTRIAL OPTIMIZATION: Code Splitting for PDF Generation
      try {
        const jsPDF = (await import('jspdf')).default;
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
        // Línea 305 corregida:
        const splitRules = doc.splitTextToSize(villaKnowledge.policies.rules + ' ' + villaKnowledge.policies.cancellation, 170);
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
      const property = properties.find((p: any) => p.id === propertyId);

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
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-500 relative bg-white">
              <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
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
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-float relative border-2 border-white bg-white">
              <img src="/images/salty-avatar.jpg" alt="Salty" className="w-full h-full object-cover" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <p className="font-serif font-black italic text-lg text-[#1a1a1a] tracking-tighter">Salty · Concierge VRR</p>
              <p className="text-[9px] text-[#BBA27E] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                En Línea
              </p>
            </div>
          </div>
        </div>
        {takeoverUntil && new Date(takeoverUntil) > new Date() && (
          <div className="bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 flex items-center gap-2 animate-pulse">
            <span className="material-icons text-primary text-xs">shield</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Gobernanza Manual</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbfaf8] scroll-smooth pb-10">
        <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest my-6">Villa Retiro R LLC - Soporte 24/7</div>
        {messages.map((m, i) => {
          // Extraer la etiqueta de pago
          const paymentMatch = m.text.match(/\[PAYMENT_REQUEST:\s*([^\]]+)\]/);
          let displayText = m.text;
          let paymentData = null;

          if (paymentMatch) {
            displayText = m.text.replace(paymentMatch[0], '');
            try {
              const rawData = paymentMatch[0].slice(17, -1).split(',');
              paymentData = {
                propertyId: rawData[0]?.trim(),
                total: parseFloat(rawData[1]?.trim() || '0'),
                checkIn: rawData[2]?.trim(),
                checkOut: rawData[3]?.trim(),
                guests: parseInt(rawData[4]?.trim() || '0'),
                propertyName: rawData[5]?.trim() || 'Villa',
                holdId: rawData[6]?.trim() || null,
                basePrice: parseFloat(rawData[7]?.trim() || '0'),
                tax: parseFloat(rawData[8]?.trim() || '0'),
                securityDeposit: parseFloat(rawData[9]?.trim() || '0')
              };
            } catch (e) {
              console.error("Payment parse error:", e);
            }
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

                {/* 🎨 ELITE CHECKOUT COMPONENT: Inspired by image_0.png */}
                {paymentData && m.sender === 'ai' && (
                  <div className="mt-8 bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-2xl overflow-hidden animate-slide-up max-w-md mx-auto">
                    {/* Header: Confirma y paga */}
                    <div className="px-6 py-5 border-b border-black/5 flex justify-between items-center bg-white/20">
                      <h3 className="font-serif font-black italic text-xl tracking-tighter text-black">Confirma y paga</h3>
                      <button className="material-icons text-black/40 text-lg">close</button>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Property Card */}
                      {(() => {
                        const property = properties.find(p => p.id === paymentData.propertyId);
                        return (
                          <div className="flex gap-4 items-start">
                             <img 
                                src={property?.images?.[0] || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'} 
                                alt={paymentData.propertyName}
                                className="w-24 h-24 rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
                             />
                             <div className="flex-1">
                                <p className="font-serif font-black text-black leading-tight mb-1">{property?.title}</p>
                                <p className="text-[10px] text-black/60 font-bold uppercase tracking-widest">{property?.subtitle || 'Private Oasis'}</p>
                                <div className="flex items-center gap-1 mt-2">
                                  <span className="material-icons text-orange-400 text-xs">star</span>
                                  <span className="text-[10px] font-black italic">4.95 (Expert Host)</span>
                                </div>
                                <div className="mt-2 inline-flex items-center gap-1 bg-black/5 px-2 py-1 rounded-md">
                                  <span className="material-icons text-[10px]">verified</span>
                                  <span className="text-[8px] font-black uppercase tracking-widest">Reserva Garantizada</span>
                                </div>
                             </div>
                          </div>
                        );
                      })()}

                      {/* Summary Section */}
                      <div className="space-y-4 pt-4 border-t border-black/5">
                        <div className="flex justify-between items-center group">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">Fechas</p>
                            <p className="text-xs font-bold text-black">{paymentData.checkIn} – {paymentData.checkOut}</p>
                          </div>
                          <button className="text-[10px] font-bold underline text-black/60 hover:text-black">Cambiar</button>
                        </div>

                        <div className="flex justify-between items-center group">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">Huéspedes</p>
                            <p className="text-xs font-bold text-black">{paymentData.guests} viajeros</p>
                          </div>
                          <button className="text-[10px] font-bold underline text-black/60 hover:text-black">Cambiar</button>
                        </div>
                      </div>

                      {/* Pricing Section (image_0.png Loyalty) */}
                      <div className="bg-black/5 p-5 rounded-3xl space-y-4">
                          <div className="space-y-2">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-black/60 font-medium">Estancia ({paymentData.checkIn} - {paymentData.checkOut})</span>
                                <span className="text-black font-bold">${paymentData.basePrice}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-black/60 font-medium">Impuestos (IVU 7%)</span>
                                <span className="text-black font-bold">${paymentData.tax}</span>
                             </div>
                             {paymentData.securityDeposit > 0 && (
                               <div className="flex justify-between items-center text-xs pt-2 border-t border-black/5 mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-icons text-[10px] text-green-600">shield</span>
                                    <span className="text-black/60 font-bold uppercase tracking-widest text-[9px]">Depósito de Garantía (Reembolsable)</span>
                                  </div>
                                  <span className="text-green-600 font-bold">${paymentData.securityDeposit}</span>
                               </div>
                             )}
                          </div>
                          <div className="pt-3 border-t border-black/10 flex justify-between items-center">
                             <span className="text-sm font-black text-black">Total <span className="underline decoration-black/20 decoration-2">USD</span></span>
                             <span className="text-xl font-black text-black tracking-tighter">${paymentData.total}</span>
                          </div>
                      </div>

                      {/* Dynamic Cancellation Policy */}
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-icons text-orange-400 text-sm">event_busy</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-900">Política de Cancelación</span>
                        </div>
                        <p className="text-[11px] text-orange-900/70 leading-relaxed italic">
                          {properties.find(p => p.id === paymentData.propertyId)?.policies?.cancellationPolicy || "Paga ahora para confirmar. Reembolso total si cancelas con 7 días de antelación."}
                        </p>
                      </div>

                      <div className="text-[9px] text-black/40 font-bold text-center italic">
                        Gestión certificada por Brian (Administrador) e Israel (Dueño)
                      </div>

                      {/* Interaction Sequence */}
                      {!submittedLeads[m.id] ? (
                        <button
                          onClick={async () => {
                            // En este flujo Elite, pedimos los datos básicos o usamos los del perfil
                            if (!isAuthenticated && !leadData.name) {
                              const name = prompt("Para garantizar su reserva, por favor indique su nombre completo:");
                              if (!name) return;
                              setLeadData(prev => ({ ...prev, name }));
                            }
                            
                            // Auto-confirmación de lead silenciosa
                            const finalName = leadData.name || "Huésped Elite";
                            
                            try {
                              await supabase.from('pending_bookings').insert({
                                property_id: paymentData.propertyId,
                                check_in: paymentData.checkIn,
                                check_out: paymentData.checkOut,
                                customer_name: finalName,
                                customer_email: leadData.email || 'elite@stays.com',
                                customer_phone: leadData.phone || 'Pendiente',
                                total_price: paymentData.total,
                                session_id: sessionId
                              });
                              setSubmittedLeads(prev => ({ ...prev, [m.id]: true }));
                            } catch (e) {
                              setSubmittedLeads(prev => ({ ...prev, [m.id]: true }));
                            }
                          }}
                          className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-900 active:scale-[0.98] transition-all"
                        >
                          Confirma y paga
                        </button>
                      ) : (
                        <div className="space-y-6 animate-fade-in">
                           {/* 🛡️ Salty 'Escolta' Stage (Assurance) */}
                           <div className="bg-primary/5 border border-primary/20 p-4 rounded-[1.5rem] flex items-center gap-4">
                             <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                               <span className="material-icons text-primary animate-pulse text-lg">shield</span>
                             </div>
                             <div className="flex-1">
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Salty en Misión de Escolta</p>
                               <p className="text-[11px] text-primary/70 font-medium">Monitoreando su transacción para un cierre 100% seguro.</p>
                             </div>
                           </div>
                           <div className="bg-white/80 p-5 rounded-[2rem] shadow-xl border border-white/40 ring-1 ring-black/5">
                              <PaymentProcessor 
                                  total={paymentData.total}
                                  bookingId={paymentData.holdId || undefined}
                                  onSuccess={(status, proofUrl, method) => {
                                    if (status === 'confirmed') {
                                      handlePaymentSuccess({ payer: { email_address: leadData.email, name: { given_name: leadData.name } } }, paymentData.propertyId, paymentData.checkIn, paymentData.checkOut, paymentData.guests, paymentData.total);
                                    } else {
                                      setMessages((prev) => [...prev, {
                                        id: crypto.randomUUID(),
                                        text: "¡Gracias por su comprobante! Lo he vinculado a su reserva. Israel validará la transacción en minutos. ✨",
                                        sender: 'ai',
                                        created_at: new Date().toISOString()
                                      }]);
                                    }
                                  }}
                                  isProcessing={false}
                                  user={{ id: sessionId, full_name: leadData.name || "Huésped Elite", email: leadData.email || 'elite@stays.com' }}
                              />
                           </div>
                        </div>
                      )}
                    </div>
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
              <p className="text-[10px] font-black uppercase tracking-widest text-[#BBA27E] animate-pulse">Salty está consultando disponibilidad real en Cabo Rojo...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 pb-[max(1rem,env(safe-area-inset-bottom,16px))] bg-white border-t border-gray-100 flex gap-2 relative shadow-[0_-8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02]">
        <button
          type="button"
          className="bg-[#1a1a1a] text-[#BBA27E] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all group overflow-hidden relative"
          onClick={() => {
            alert("Próximamente: Salty te escuchará y hablará contigo en tiempo real. ¡Estamos afinando su voz de Capitán!");
          }}
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="material-icons opacity-80"
          >
            mic
          </motion.div>
        </button>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Habla con Salty..."
          className="flex-1 bg-white border border-black/5 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#BBA27E]/20 focus:bg-white transition-all text-text-main placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="bg-[#BBA27E] text-[#1a1a1a] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <span className="material-icons">send</span>
        </button>
      </form>
    </div>
  );
};

export default Messages;
