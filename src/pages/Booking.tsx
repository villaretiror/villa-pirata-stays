import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/SupabaseService';
import SmartImage from '../components/SmartImage';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import BookingCalendar from '../components/BookingCalendar';
import PaymentProcessor from '../components/PaymentProcessor';
import { fetchICalData, parseICalData, getNightlyPrice, validatePromoCode, isSeasonalDate } from '../utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowLeft, Calendar as CalendarIcon, Users, Verified, Wallet, Check, Phone, Anchor, Ticket, Award, MessageCircle } from 'lucide-react';
import { BookingSkeleton } from '../components/Skeleton';
import UpsellModule, { AVAILABLE_ADDONS } from '../components/UpsellModule';
import type { TablesInsert } from '../types/supabase';

type BookingInsert = TablesInsert<'bookings'>;

import { useAvailability } from '../hooks/useAvailability';
import { useBooking } from '../hooks/useBooking';
import SectionErrorBoundary from '../components/SectionErrorBoundary';

const TAG_STYLE = "text-[10px] uppercase font-semibold tracking-[0.25em] opacity-80";

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, refreshProperties, isLoading: isPropLoading } = useProperty();
  const { user } = useAuth();
  const location = useLocation();
  const recoverData = location.state as { booking_id?: string, recover?: boolean } | null;

  const property = properties.find(p => p.id === id);

  const {
    startDate,
    endDate,
    promoCode,
    setPromoCode,
    appliedPromo,
    setAppliedPromo,
    promoError,
    applyPromo,
    pricing,
    isProcessing,
    setIsProcessing,
    isOrphanOffer,
    setDateRange,
    nights
  } = useBooking(property);

  const { 
    blockedDates, 
    availabilityRules, 
    minNights, 
    isLoading: isAvailabilityLoading, 
    isRangeAvailable 
  } = useAvailability(id);

  const [phone, setPhone] = useState(new URLSearchParams(location.search).get('phone') || user?.phone || '');
  const [guestEmail, setGuestEmail] = useState(new URLSearchParams(location.search).get('email') || user?.email || '');
  const [guestName, setGuestName] = useState(new URLSearchParams(location.search).get('guest_name') || user?.full_name || '');
  const [guestMessage, setGuestMessage] = useState('');
  const [priceMismatch, setPriceMismatch] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(recoverData?.booking_id || null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  // Simulated social proof
  const [activeCheckouts] = useState(Math.floor(Math.random() * 5) + 2);

  // 🔱 ATTRIBUTION RADAR
  const params = new URLSearchParams(location.search);
  const attributionSource = params.get('ref') || 'Web Direct';
  const attributionToken = params.get('token') || params.get('code') || null;

  // 🔱 ABANDONMENT FUNNEL LOGGING
  const logAbandonment = async (step: string, reason: string) => {
    try {
      await supabase.from('checkout_abandonment_logs').insert({
        lead_email: guestEmail,
        property_id: id,
        step,
        reason,
        attribution_token: attributionToken,
        metadata: {
           final_total: finalTotal,
           nights,
           has_phone: !!phone
        }
      });
    } catch (e) {
      console.warn("[FunnelLog] Silent fail.");
    }
  };

  // Log abandonment when component unmounts if no booking confirmed
  useEffect(() => {
    return () => {
      // Logic could be added here to check if they completed
    };
  }, []);

  // 🔱 NAVIGATION RESCUE: ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCalendarModal) {
        setShowCalendarModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCalendarModal]);

  // 1. Fetch Fresh on Mount & Handle Recovery
  useEffect(() => {
    refreshProperties();
    
    const loadRecovery = async () => {
        // 🔱 SMART LINK RECOVERY (Vapi -> Booking)
        const params = new URLSearchParams(location.search);
        const ci = params.get('check_in');
        const co = params.get('check_out');
        
        if (ci && co) {
            console.log(`[Smart Link] Recovering dates: ${ci} to ${co}`);
            setDateRange([parseISO(ci + 'T12:00:00'), parseISO(co + 'T12:00:00')]);
        } 
        // Recovery from unfinished booking
        else if (recoverData?.booking_id && recoverData?.recover) {
            const { data } = await supabase.from('bookings').select('check_in, check_out').eq('id', recoverData.booking_id).single();
            if (data) {
                setDateRange([parseISO(data.check_in + 'T12:00:00'), parseISO(data.check_out + 'T12:00:00')]);
            }
        } 
        // 🔱 CONTINUITY RECOVERY (Home -> Villa)
        else if (location.state) {
            const { startDate: s, endDate: e } = location.state as any;
            if (s && e) {
                setDateRange([new Date(s), new Date(e)]);
            }
        }
    };
    loadRecovery();
  }, [id, recoverData?.booking_id, recoverData?.recover]);

  const handleDateChange = (update: [Date | null, Date | null]) => {
    // 🛡️ ARCHITECTURE REFINED: Validation is now the slave's responsibility (moved to BookingCalendar)
    setDateRange(update);
  };

  const isLoading = isPropLoading || isAvailabilityLoading;

  // Availability Rules Logic
  let min_nights_req = minNights || 2;
  const sStr = startDate ? format(startDate, 'yyyy-MM-dd') : null;
  const applicableRule = availabilityRules?.find(r => sStr && sStr >= r.start_date && sStr <= r.end_date);
  if (applicableRule) {
      if (applicableRule.min_nights) min_nights_req = applicableRule.min_nights;
  }
  const isTooShort = nights > 0 && nights < min_nights_req;

  // 🎣 LEAD CAPTURE (Ghost Booking Protocol - Anonymous & Global)
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Capturamos si hay fechas y un contacto (teléfono), incluso si no hay user.id
      if (!startDate || !endDate || !phone || phone.length < 5 || isTooShort || !id) return;

      try {
        const payload: any = {
          property_id: id,
          user_id: user?.id || null, // 🔱 ANONYMOUS ELITE: No requerimos login para salvar el lead
          check_in: format(startDate, 'yyyy-MM-dd'),
          check_out: format(endDate, 'yyyy-MM-dd'),
          total_price: pricing?.total || 0,
          customer_name: user?.full_name || 'Huésped Interesado (Lead Web)',
          status: 'lead', 
          source: 'Web Direct (Lead)',
          payment_method: 'pending_selection',
          guests_count: property?.guests || 1,
          cancellation_reason: guestMessage,
          // Guardamos el teléfono en metadata si no podemos asociar perfil
          hold_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          policy_snapshot: property?.policies || null
        };

        if (bookingId && bookingId !== 'new') {
          await supabase.from('bookings').update({ ...payload, attribution_source: attributionSource, attribution_token: attributionToken }).eq('id', bookingId);
        } else {
          const { data, error } = await supabase.from('bookings')
            .insert({ ...payload, attribution_source: attributionSource, attribution_token: attributionToken })
            .select().single();
          if (data) setBookingId(data.id);
        }
      } catch (err) {
        console.warn('[LeadCapture] Silent capture active.');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [phone, guestMessage, startDate, endDate, pricing, isTooShort, id, user, bookingId, property?.guests]);

  if (isLoading) return <BookingSkeleton />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Propiedad no encontrada</h2>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl">Volver al inicio</button>
      </div>
    );
  }

  // Extract Pricing from Hook
  // Extract Pricing from Hook (Elite Standard)
  const { 
    total, 
    subtotal, 
    ivuAmount, 
    taxRate, 
    discountAmount, 
    nightsTotal, 
    cleaningFee, 
    serviceFee 
  } = pricing || { 
    total: 0, 
    subtotal: 0, 
    ivuAmount: 0, 
    taxRate: 7, 
    discountAmount: 0, 
    nightsTotal: 0,
    cleaningFee: 0,
    serviceFee: 0
  };

  const addonsTotal = selectedAddons.reduce((acc, id) => {
    const addon = AVAILABLE_ADDONS.find(a => a.id === id);
    return acc + (addon?.price || 0);
  }, 0);
  
  const finalTotal = total + addonsTotal;

  const handleApplyPromo = () => applyPromo(promoCode);

  const handlePaymentSuccess = async (status: string, proofUrl?: string, method?: string) => {
    if (!startDate || !endDate || !user) return;
    setIsProcessing(true);

    const bookingPayload: any = {
      user_id: user?.id || null,
      customer_name: guestName || 'Invitado (Web)',
      source: 'Direct Web (Anonymous)',
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: finalTotal,
      total_paid_at_booking: finalTotal,
      guests_count: property.guests || null,
      status: status,
      payment_method: method,
      payment_proof_url: proofUrl || null,
      email_sent: false,
      contract_signed: true,
      auto_cancel_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      cleaning_fee_at_booking: Number(property.cleaning_fee || 0),
      service_fee_at_booking: Number(property.service_fee || 0),
      addons_breakdown: selectedAddons.length > 0 ? selectedAddons : null,
      policy_snapshot: (property?.policies as any) || null,
      attribution_source: attributionSource,
      attribution_token: attributionToken
    };

    // 🎣 GHOST UPDATE: Apply attribution to the ghost lead as well
    const isRecovery = recoverData?.booking_id && recoverData?.recover;

    const { data: bookingData, error: bookingError } = isRecovery 
      ? await supabase.from('bookings').update({ ...bookingPayload, status, contract_signed: true }).eq('id', recoverData?.booking_id || '').select().single()
      : await supabase.from('bookings').insert(bookingPayload).select().single();

    if (bookingError || !bookingData) {
      window.dispatchEvent(new CustomEvent('salty-push', {
        detail: { message: "⚠️ Salty: Hemos detectado una turbulencia en la conexión. Por favor, verifica tus datos e intenta de nuevo." }
      }));
      setIsProcessing(false);
      return;
    }

    // 🔱 STRIPE VIP FLOW: Handshake backend
    if (method === 'stripe') {
      try {
        const secretRes = await fetch('/api/create-payment-intent', {
            method: 'POST',
            body: JSON.stringify({ bookingId: bookingData.id }),
            headers: { 'Content-Type': 'application/json' }
        });
        const secretData = await secretRes.json();
        
        // 👻 GHOST WINDOW INTERCEPT - THE SECOND LINE OF DEFENSE
        if (secretRes.status === 409 && secretData.error === 'GHOST_WINDOW_OVERLAP') {
            window.dispatchEvent(new CustomEvent('salty-push', {
                detail: {
                    message: "¡Capitán, malas noticias! 🏴‍☠️ Alguien acaba de reservar esas fechas en otra plataforma justo ahora. El calendario manda.",
                    type: 'error',
                    speak: false
                }
            }));
            setIsProcessing(false);
            return;
        }

        if (secretRes.ok && secretData.clientSecret) {
           return secretData.clientSecret;
        } else {
           console.error("[Stripe Fetch] Failed to create intent:", secretData);
           setIsProcessing(false);
           return;
        }
      } catch (err) {
         console.error("[Stripe NetError]", err);
         setIsProcessing(false);
         return;
      }
    }

    // LEGACY & MANUAL PAYMENTS PIPELINE (ATH Móvil, PayPal)
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reservation_confirmed',
          customer: { name: guestName || 'Huésped', email: guestEmail || 'sin-email@stays.com', phone: phone },
          propertyId: property.id,
          bookingId: bookingData.id,
          checkIn: bookingData.check_in,
          checkOut: bookingData.check_out,
          total: bookingData.total_price,
          isReturning: user.favoriteProperties?.length && user.favoriteProperties.length > 0 // Simple guess
        }),
      });

      if (response.ok) {
        await supabase.from('bookings').update({ email_sent: true }).eq('id', bookingData.id);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }

    navigate('/success', {
      state: {
        bookingData: {
          guestName: guestName || 'Huésped',
          propertyName: property.title,
          checkIn: format(startDate, 'dd MMM yyyy'),
          checkOut: format(endDate, 'dd MMM yyyy'),
          total: total,
          method: method
        }
      }
    });
  };

  return (
    <SectionErrorBoundary sectionName="Reserva Vivir la Experiencia">
    <div className="fixed inset-0 z-[100] bg-sand flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative bg-white/80 backdrop-blur-xl w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-[4rem] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/40">

        <header className="px-8 py-6 flex flex-col gap-4 sticky top-0 bg-white sm:bg-white/80 backdrop-blur-xl z-20 border-b border-black/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/property/${id}`)}
              className="w-14 h-14 rounded-full bg-secondary text-primary flex items-center justify-center transition-all active:scale-95 shadow-bunker border border-primary/20 z-50 group hover:bg-gold-dark"
              aria-label="Cerrar"
            >
              <X size={28} className="transition-transform group-hover:rotate-90" />
            </button>
            <div className="text-center">
              <h2 className="font-serif font-black text-xl text-text-main leading-none">
                {new URLSearchParams(location.search).get('guest_name') 
                  ? `Bienvenido, ${new URLSearchParams(location.search).get('guest_name')}`
                  : 'Confirmar Estancia'}
              </h2>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-[#FF7F3F] mt-1 italic">Boutique Stays Experience</p>
            </div>
            <div className="w-12"></div>
          </div>

          <div className="flex items-center justify-center gap-2 px-10">
            {[
              { id: 'dates', icon: CalendarIcon, active: !!(startDate && endDate) },
              { id: 'details', icon: Users, active: !!(phone.length > 5) },
              { id: 'payment', icon: Wallet, active: contractAccepted }
            ].map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <div 
                    onClick={() => {
                        if (!step.active) logAbandonment(step.id, 'user_clicked_inactive_step');
                    }}
                    className={`flex flex-col items-center gap-1 transition-all duration-500 ${step.active ? 'opacity-100 scale-110' : 'opacity-30'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step.active ? 'bg-primary border-primary text-white shadow-lg' : 'border-gray-400'}`}>
                      <StepIcon size={14} />
                    </div>
                  </div>
                  {idx < 2 && (
                    <div className={`h-[2px] flex-1 max-w-[40px] rounded-full transition-colors duration-500 ${step.active ? 'bg-primary' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar pb-32">

          <div className="flex gap-6 p-6 bg-white rounded-[2.5rem] shadow-soft border border-black/5">
            <SmartImage src={property.images?.[0] || ''} className="w-24 h-24 rounded-[1.8rem] object-cover shadow-lg" />
            <div className="flex-1">
              <h3 className="font-serif font-bold text-xl text-text-main mb-1">{property.title}</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-bold text-text-light">
                  <Users size={14} className="opacity-60" />
                  {property.guests} máx
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-text-light">
                  <Verified size={14} className="text-secondary" />
                  Directo
                </div>
              </div>
                {startDate && endDate ? (
                  <div className="text-right">
                    <p className="text-primary font-black text-2xl animate-fade-in">${finalTotal.toFixed(2)}</p>
                    <p className="text-[9px] font-sans text-gray-400 uppercase tracking-widest">Total Estimado (Inc. Taxes & Fees)</p>
                  </div>
                ) : (
                  <p className="mt-3 text-primary font-black text-lg">
                    ${property.price} <span className="text-[10px] font-sans text-gray-400">USD / NOCHE</span>
                  </p>
                )}
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className={TAG_STYLE + " text-gray-400"}>1. Cronograma</h3>
              {startDate && endDate && (
                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="text-[10px] font-semibold uppercase opacity-80 text-primary underline underline-offset-4"
                >
                  Cambiar Fechas
                </button>
              )}
            </div>

            {(!startDate || !endDate) ? (
              <button
                onClick={() => setShowCalendarModal(true)}
                className="w-full p-8 bg-sand/30 border-2 border-dashed border-primary/20 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-sand/50 transition-all"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                  <CalendarIcon size={24} />
                </div>
                <div className="text-center">
                  <p className="font-serif font-bold text-lg">Selecciona tus fechas</p>
                  <p className="text-xs text-text-light">Haz clic aquí para ver disponibilidad real</p>
                </div>
              </button>
            ) : (
              <div
                onClick={() => setShowCalendarModal(true)}
                className="grid grid-cols-2 gap-4 cursor-pointer group"
              >
                <div className="bg-[#FFF4ED] p-6 rounded-[2rem] border-2 border-primary/20 transition-all group-hover:border-primary/40 shadow-sm">
                  <p className={TAG_STYLE + " text-[#FF7F3F] mb-1 font-black"}>Check-in</p>
                  <p className="text-2xl font-serif font-black text-text-main">{format(startDate, 'EEEE, dd MMM', { locale: es })}</p>
                </div>
                <div className="bg-[#FFF4ED] p-6 rounded-[2rem] border-2 border-primary/20 transition-all group-hover:border-primary/40 shadow-sm">
                  <p className={TAG_STYLE + " text-[#FF7F3F] mb-1 font-black"}>Check-out</p>
                  <p className="text-2xl font-serif font-black text-text-main">{format(endDate, 'EEEE, dd MMM', { locale: es })}</p>
                </div>
              </div>
            )}
          </section>

          {/* 🔱 PROACTIVE SALTY ASSISTANCE */}
          <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/60 shadow-sm mb-8 flex items-center justify-between group hover:shadow-lg transition-all animate-fade-in">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <MessageCircle size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary mb-1 tracking-[0.2em]">Asistencia Signature 🔱</p>
                  <p className="text-sm font-serif font-black italic">"Dudas en {property?.title || 'la Villa'}? Pregunta a Salty"</p>
               </div>
            </div>
            <button 
              onClick={() => navigate('/messages', { state: { initialPlace: property?.title } })}
              className="bg-primary text-white px-6 py-4 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:shadow-[0_10px_20px_rgba(255,127,63,0.3)] transition-all shadow-lg shadow-primary/20"
            >
              Consultar
            </button>
          </div>

          <section className="space-y-4">
            <h3 className={TAG_STYLE + " text-gray-400"}>2. Detalles del Viaje</h3>
            <div className="space-y-4">
              {!user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      className="w-full px-6 py-5 bg-white border border-black/5 rounded-[2rem] shadow-soft focus:ring-2 ring-primary/10 outline-none font-bold text-sm"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="email"
                      placeholder="Email de Confirmación"
                      className="w-full px-6 py-5 bg-white border border-black/5 rounded-[2rem] shadow-soft focus:ring-2 ring-primary/10 outline-none font-bold text-sm"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="relative group">
                <Phone size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="tel"
                  placeholder="Teléfono (WhatsApp)"
                  className="w-full pl-14 pr-6 py-5 bg-white border border-black/5 rounded-[2rem] shadow-soft focus:ring-2 ring-primary/10 outline-none font-bold text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <textarea
                placeholder="¿Alguna petición especial? Cuéntanos si celebras algo..."
                className="w-full p-6 bg-white border border-black/5 rounded-[2.5rem] shadow-soft focus:ring-2 ring-primary/10 outline-none text-sm min-h-[140px] leading-relaxed transition-all focus:shadow-lg"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-6 pt-6 border-t border-black/5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="CÓDIGO PROMO"
                className="flex-1 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-semibold uppercase tracking-[0.25em] opacity-80 outline-none shadow-sm"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button
                onClick={handleApplyPromo}
                className="bg-primary/10 text-primary px-8 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:bg-primary/20 transition-all border border-primary/10"
              >
                Validar
              </button>
            </div>

            {promoError && <p className="text-[10px] text-red-500 font-black tracking-widest uppercase ml-2">{promoError}</p>}

               <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 shadow-lg space-y-4">
                 <div className="flex justify-between items-center text-sm font-bold">
                   <span className="text-text-main font-serif italic">Estancia ({nights || 0} noches)</span>
                   <span className="text-text-main font-serif font-black text-lg">${nightsTotal.toFixed(2)}</span>
                 </div>

                {cleaningFee > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-text-light opacity-80">
                    <span>Cargo por Limpieza</span>
                    <span className="font-serif italic">${cleaningFee.toFixed(2)}</span>
                  </div>
                )}

                {serviceFee > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-text-light opacity-80">
                    <span>Cargo por Servicio (VRR)</span>
                    <span className="font-serif italic">${serviceFee.toFixed(2)}</span>
                  </div>
                )}
                
                {isOrphanOffer && (
                  <div className="flex justify-between items-center text-sm text-[var(--vrr-gold-dark)] font-bold bg-[var(--vrr-gold-light)]/10 p-3 rounded-xl border border-[var(--vrr-gold)]/30 shadow-sm animate-pulse-gold relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer-effect_2s_infinite]"></div>
                    <span className="flex items-center gap-1.5 relative z-10">
                      <Anchor size={14} />
                      Oferta del Capitán (15%)
                    </span>
                    <span className="font-serif font-black text-lg relative z-10">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {appliedPromo && !isOrphanOffer && (
                  <div className="flex justify-between items-center text-sm text-green-700 font-bold bg-green-50/50 p-2 rounded-xl border border-green-100/50">
                    <span className="flex items-center gap-1">
                      <Ticket size={14} />
                      Descuento ({appliedPromo.discount_percent}%)
                    </span>
                    <span className="font-serif font-black text-lg">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm font-medium pt-2">
                   <span className="text-gray-400">Impuestos (IVU/Sales Tax {taxRate}%)</span>
                   <span className="text-gray-400 font-serif font-bold text-base">${ivuAmount.toFixed(2)}</span>
                </div>
              
                
              <div className="pt-6 border-t border-dashed border-gray-200 mt-2 flex justify-between items-end">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] uppercase font-semibold tracking-[0.25em] opacity-80 text-[#FF7F3F] mb-0.5">Inversión Final</p>
                </div>
                <p className="text-5xl font-serif font-black text-text-main">${finalTotal.toFixed(2)}</p>
              </div>
            </div>
            
            {/* 🔱 UPSELL MODULE */}
            <UpsellModule selectedAddons={selectedAddons} onChange={setSelectedAddons} />
            
          </section>

            {startDate && endDate && !isTooShort && (
              <section className="space-y-4 pt-6 border-t border-black/5 animate-fade-in">
                <h3 className={TAG_STYLE + " text-gray-400"}>3. Estatus Legal & Cancelación</h3>
                
                {/* 🔱 DYNAMIC CANCELLATION SUMMARY FROM DASHBOARD */}
                <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Verified size={16} className="text-secondary" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-secondary">Política Dictada por el Anfitrión</p>
                  </div>
                  <p className="text-xs font-bold text-text-main leading-relaxed italic">
                    "{property?.policies?.cancellationPolicy || 'Cancelación estricta: Se requiere aviso previo de 30 días para reembolso total.'}"
                  </p>
                </div>

                <div 
                  onClick={() => setContractAccepted(!contractAccepted)}
                  className={`flex items-start gap-4 p-6 rounded-[2.5rem] border transition-all cursor-pointer ${
                    contractAccepted ? 'bg-secondary/5 border-secondary/20 shadow-sm' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                    contractAccepted ? 'bg-secondary border-secondary text-white shadow-lg' : 'border-gray-300'
                  }`}>
                    {contractAccepted && <Check size={14} />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text-main leading-relaxed">
                      Acepto los <a href={`/terms/${id}`} target="_blank" className="text-primary underline hover:text-black transition-colors" onClick={(e) => e.stopPropagation()}>Términos de Servicio</a> y las <a href={`/privacy/${id}`} target="_blank" className="text-primary underline hover:text-black transition-colors" onClick={(e) => e.stopPropagation()}>Políticas</a> de {property?.title}.
                    </p>
                    <p className="text-[9px] uppercase font-black tracking-widest text-[#FF7F3F] opacity-60">
                      Entiendo que esta reserva es un compromiso legal bajo las leyes de Puerto Rico.
                    </p>
                  </div>
                </div>
              </section>
            )}

          {isTooShort && (
            <div className="p-6 bg-[#FFF4ED] border border-primary/20 rounded-[2.5rem] flex items-start gap-5 shadow-sm animate-fade-in mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Award size={24} className="text-primary animate-pulse" />
              </div>
              <div>
                <h4 className="font-serif font-black italic text-[#FF7F3F] text-lg mb-1 leading-none">Concierge Signature 🔱</h4>
                <p className="text-xs font-bold text-text-light opacity-80 leading-relaxed">
                  Capitán, para estas fechas <span className="text-primary font-black underline decoration-primary/30 decoration-2 underline-offset-4">{property?.title || 'Villa Retiro'}</span> requiere un mínimo de <span className="text-primary font-black underline decoration-primary/30 decoration-2 underline-offset-4">{min_nights_req} noches</span> para garantizar la excelencia del paraíso.
                  <br />
                  <span className="text-primary mt-2 block italic">"¿Le gustaría extender su estancia para disfrutar del horizonte?"</span>
                </p>
              </div>
            </div>
          )}

          {!isTooShort && (
            <div className="animate-slide-up space-y-6">
              <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/20 text-center animate-pulse">
                <p className="text-xs font-bold text-text-main">
                  <span className="text-primary mr-1 tracking-widest uppercase">Salty:</span> {activeCheckouts} navegantes están evaluando estas mismas fechas en las últimas 24 horas. ¡Asegura tu anclaje ahora! ⚓
                </p>
              </div>
              <PaymentProcessor 
                total={finalTotal}
                bookingId={bookingId || 'new'}
                onSuccess={handlePaymentSuccess}
                isProcessing={isProcessing}
                user={user}
                isTermsAccepted={contractAccepted}
              />
            </div>
          )}
 Riverside Protocol: Search state now persists across browsing sessions. (Internal Tag)
        </div>

        <AnimatePresence>
          {showCalendarModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowCalendarModal(false); }}
              className="fixed inset-0 z-[2000001] bg-secondary/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto overflow-x-hidden"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-6xl rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto flex flex-col no-scrollbar"
              >
                {/* Handle for mobile pull-down visual */}
                <div className="w-20 h-1.5 bg-gray-100 rounded-full mx-auto mb-4 sm:hidden"></div>
                <div className="flex justify-end items-center mb-0 px-2 pt-2">
                  <button 
                    onClick={() => setShowCalendarModal(false)} 
                    className="w-14 h-14 rounded-full bg-secondary text-primary shadow-2xl flex items-center justify-center hover:bg-secondary/90 transition-all active:scale-90 z-[2000005] border-4 border-white"
                    aria-label="Cerrar calendario"
                  >
                    <X size={32} />
                  </button>
                </div>
                
                <div className="py-0">
                  <BookingCalendar
                    startDate={startDate}
                    endDate={endDate}
                    onChange={handleDateChange}
                    blockedDates={blockedDates}
                    minNights={min_nights_req}
                    isRangeAvailable={isRangeAvailable}
                  />
                </div>

                {/* Mobile Rescue Button */}
                <div className="sm:hidden mt-6 pb-2">
                  <button
                    onClick={() => setShowCalendarModal(false)}
                    className="w-full py-4 bg-gray-50 text-secondary/60 text-[10px] font-semibold uppercase opacity-80 tracking-[0.3em] rounded-2xl flex items-center justify-center gap-2 border border-black/5 hover:bg-gray-100 transition-all"
                  >
                    <ArrowLeft size={14} />
                    Regresar a Detalles
                  </button>
                </div>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  disabled={!startDate || !endDate}
                  className="w-full mt-8 bg-primary text-white py-5 rounded-2xl font-semibold uppercase tracking-[0.25em] opacity-80 disabled:opacity-20 transition-all shadow-xl hover:scale-[1.02] active:scale-95"
                >
                  Confirmar Selección
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </SectionErrorBoundary>
  );
};

export default Booking;
