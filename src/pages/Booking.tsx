import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SmartImage from '../components/SmartImage';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import BookingCalendar from '../components/BookingCalendar';
import PaymentProcessor from '../components/PaymentProcessor';
import { fetchICalData, parseICalData, getNightlyPrice, validatePromoCode, isSeasonalDate } from '../utils';
import { AnimatePresence, motion } from 'framer-motion';
import { BookingSkeleton } from '../components/Skeleton';
import type { TablesInsert } from '../supabase_types';

type BookingInsert = TablesInsert<'bookings'>;

import { useAvailability } from '../hooks/useAvailability';
import { useBooking } from '../hooks/useBooking';
import SectionErrorBoundary from '../components/SectionErrorBoundary';

const TAG_STYLE = "text-[10px] uppercase font-black tracking-widest";

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
    setDateRange,
    nights
  } = useBooking(property);

  const { blockedDates, availabilityRules, isLoading: isAvailabilityLoading, isRangeAvailable } = useAvailability(id);

  const [phone, setPhone] = useState(user?.phone || '');
  const [guestMessage, setGuestMessage] = useState('');
  const [priceMismatch, setPriceMismatch] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // 1. Fetch Fresh on Mount & Handle Recovery
  useEffect(() => {
    refreshProperties();
    
    const loadRecovery = async () => {
        if (recoverData?.booking_id && recoverData?.recover) {
            const { data } = await supabase.from('bookings').select('check_in, check_out').eq('id', recoverData.booking_id).single();
            if (data) {
                setDateRange([parseISO(data.check_in + 'T12:00:00'), parseISO(data.check_out + 'T12:00:00')]);
            }
        }
    };
    loadRecovery();
  }, [id, recoverData?.booking_id, recoverData?.recover]);

  const handleDateChange = (update: [Date | null, Date | null]) => {
    const [start, end] = update;
    if (start && end) {
      if (!isRangeAvailable(start, end)) {
        setDateRange([null, null]);
        window.dispatchEvent(new CustomEvent('salty-push', {
          detail: { message: "¡Ups! Hay una reserva entre esas fechas. Prueba un rango diferente. 🏝️" }
        }));
        return;
      }
    }
    setDateRange(update);
  };

  const isLoading = isPropLoading || isAvailabilityLoading;

  // 15s Abandonment Push & Ghost Lead Capture
  useEffect(() => {
    if (startDate && endDate && !isProcessing && user) {
      const timer = setTimeout(async () => {
        try {
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          const { error: leadErr } = await supabase.from('pending_bookings').upsert({
            user_id: user.id,
            property_id: id,
            check_in: format(startDate, 'yyyy-MM-dd'),
            check_out: format(endDate, 'yyyy-MM-dd'),
            guest_name: user.name,
            guest_email: user.email,
            guest_phone: phone || user.phone || 'No provisto',
            status: 'pending_payment',
            expires_at: expiresAt
          }, { onConflict: 'user_id,property_id,status' });

          if (!leadErr) {
            fetch('/api/master?action=notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'new_lead',
                guestName: user.name,
                property: property?.title || 'Villa',
                checkIn: format(startDate, 'dd MMM'),
                checkOut: format(endDate, 'dd MMM'),
                phone: phone || user.phone
              })
            }).catch(() => {});
          }
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('salty-push', {
          detail: { message: "¡Buenas fechas! ¿Tienes alguna duda con el proceso de pago o la política de cancelación? Estoy aquí para aclararlo." }
        }));
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, phone, isProcessing, user, id, property?.title]);

  if (isLoading) return <BookingSkeleton />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Propiedad no encontrada</h2>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl">Volver al inicio</button>
      </div>
    );
  }

  // Availability Rules Logic
  let min_nights_req = 2;
  let blockReason = 'Estancia de nivel SuperHost';
  if (startDate) {
    const sStr = format(startDate, 'yyyy-MM-dd');
    const applicableRule = availabilityRules?.find(r => sStr >= r.start_date && sStr <= r.end_date);
    if (applicableRule) {
        if (applicableRule.min_nights) min_nights_req = applicableRule.min_nights;
        if (applicableRule.reason) blockReason = applicableRule.reason;
    }
  }
  const isTooShort = nights > 0 && nights < min_nights_req;

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

  const handleApplyPromo = () => applyPromo(promoCode);

  const handlePaymentSuccess = async (status: string, proofUrl?: string, method?: string) => {
    if (!startDate || !endDate || !user) return;
    setIsProcessing(true);

    const bookingPayload: BookingInsert = {
      user_id: user.id,
      customer_name: user.name,
      source: 'Direct Web',
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: total,
      total_paid_at_booking: total,
      guests_count: property.guests || null,
      status: status,
      payment_method: method,
      payment_proof_url: proofUrl || null,
      email_sent: false,
      contract_signed: true,
      auto_cancel_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      cleaning_fee_at_booking: Number(property.cleaning_fee || 0),
      service_fee_at_booking: Number(property.service_fee || 0)
    };

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

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reservation_confirmed',
          customer: { name: user.name, email: user.email, phone: phone },
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
          guestName: user.name,
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

      <div className="relative bg-white/80 backdrop-blur-xl w-full max-w-2xl h-full sm:h-[90vh] sm:rounded-[3rem] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/40">

        <header className="px-8 py-6 flex flex-col gap-4 sticky top-0 bg-white sm:bg-white/80 backdrop-blur-xl z-20 border-b border-black/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/property/${id}`)}
              className="w-12 h-12 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all active:scale-95"
            >
              <span className="material-icons text-text-main">close</span>
            </button>
            <div className="text-center">
              <h2 className="font-serif font-black text-xl text-text-main leading-none">Confirmar Estancia</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF7F3F] mt-1 italic">Boutique Stays Experience</p>
            </div>
            <div className="w-12"></div>
          </div>

          <div className="flex items-center justify-center gap-2 px-10">
            {[
              { id: 'dates', icon: 'calendar_month', active: !!(startDate && endDate) },
              { id: 'details', icon: 'person', active: !!(phone.length > 5) },
              { id: 'payment', icon: 'account_balance_wallet', active: contractAccepted }
            ].map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${step.active ? 'opacity-100 scale-110' : 'opacity-30'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step.active ? 'bg-primary border-primary text-white shadow-lg' : 'border-gray-400'}`}>
                    <span className="material-icons text-sm">{step.icon}</span>
                  </div>
                </div>
                {idx < 2 && (
                  <div className={`h-[2px] flex-1 max-w-[40px] rounded-full transition-colors duration-500 ${step.active ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar pb-32">

          <div className="flex gap-6 p-6 bg-white rounded-[2.5rem] shadow-soft border border-black/5">
            <SmartImage src={property.images?.[0] || ''} className="w-24 h-24 rounded-[1.8rem] object-cover shadow-lg" />
            <div className="flex-1">
              <h3 className="font-serif font-bold text-xl text-text-main mb-1">{property.title}</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-bold text-text-light">
                  <span className="material-icons text-sm">groups</span>
                  {property.guests} máx
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-text-light">
                  <span className="material-icons text-sm">verified</span>
                  Directo
                </div>
              </div>
              <p className="mt-3 text-primary font-black text-lg">
                ${property.price} <span className="text-[10px] font-sans text-gray-400">USD / NOCHE</span>
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className={TAG_STYLE + " text-gray-400"}>1. Cronograma</h3>
              {startDate && endDate && (
                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="text-[10px] font-black uppercase text-primary underline underline-offset-4"
                >
                  Cambiar Fechas
                </button>
              )}
            </div>

            {(!startDate || !endDate) ? (
              <button
                onClick={() => setShowCalendarModal(true)}
                className="w-full p-8 bg-sand/30 border-2 border-dashed border-orange-200 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-sand/50 transition-all"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                  <span className="material-icons text-2xl">calendar_month</span>
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

          <section className="space-y-4">
            <h3 className={TAG_STYLE + " text-gray-400"}>2. Detalles del Viaje</h3>
            <div className="space-y-4">
              <div className="relative group">
                <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary">phone</span>
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
                className="flex-1 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none shadow-sm"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button
                onClick={handleApplyPromo}
                className="bg-primary/10 text-primary px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/10"
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
                
                {appliedPromo && (
                  <div className="flex justify-between items-center text-sm text-green-700 font-bold bg-green-50/50 p-2 rounded-xl border border-green-100/50">
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-xs">confirmation_number</span>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FF7F3F] mb-0.5">Inversión Final</p>
                </div>
                <p className="text-5xl font-serif font-black text-text-main">${total.toFixed(2)}</p>
              </div>
            </div>
          </section>

          {isTooShort && (
            <div className="flex gap-4 p-5 bg-red-50 rounded-3xl border border-red-100 animate-shake">
              <span className="material-icons text-red-500">warning</span>
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                Se requiere un mínimo de {min_nights_req} noches ({blockReason}).
              </p>
            </div>
          )}

          {startDate && endDate && !isTooShort && (
            <section className="space-y-4 pt-6 border-t border-black/5">
              <h3 className={TAG_STYLE + " text-gray-400"}>3. Estatus Legal</h3>
              <div 
                onClick={() => setContractAccepted(!contractAccepted)}
                className={`flex items-start gap-4 p-6 rounded-[2.5rem] border transition-all cursor-pointer ${
                  contractAccepted ? 'bg-secondary/5 border-secondary/20 shadow-sm' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  contractAccepted ? 'bg-secondary border-secondary text-white' : 'border-gray-300'
                }`}>
                  {contractAccepted && <span className="material-icons text-sm">check</span>}
                </div>
                <p className="text-xs font-bold text-text-main leading-relaxed">
                  Acepto los términos del contrato de hospedaje y las reglas de la casa.
                </p>
              </div>
            </section>
          )}

            <div className="animate-slide-up">
              <PaymentProcessor 
                total={total}
                bookingId={recoverData?.booking_id || 'new'}
                onSuccess={handlePaymentSuccess}
                isProcessing={isProcessing}
                user={user}
              />
            </div>
        </div>

        <AnimatePresence>
          {showCalendarModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-4xl rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-serif font-black text-2xl">Disponibilidad Real</h3>
                  <button onClick={() => setShowCalendarModal(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <span className="material-icons">close</span>
                  </button>
                </div>
                <BookingCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handleDateChange}
                  blockedDates={blockedDates}
                />
                <button
                  onClick={() => setShowCalendarModal(false)}
                  disabled={!startDate || !endDate}
                  className="w-full mt-8 bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-20 transition-all shadow-xl hover:scale-[1.02] active:scale-95"
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
