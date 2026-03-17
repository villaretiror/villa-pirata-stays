import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SmartImage from '../components/SmartImage';
import { addDays, format, differenceInDays } from 'date-fns';
import BookingCalendar from '../components/BookingCalendar';
import PaymentProcessor from '../components/PaymentProcessor';
import { fetchICalData, parseICalData, getNightlyPrice, validatePromoCode, isSeasonalDate } from '../utils';
import { AnimatePresence } from 'framer-motion';
import { BookingSkeleton } from '../components/Skeleton';
import type { Tables, TablesInsert } from '../supabase_types';

type BookingInsert = TablesInsert<'bookings'>;
type PromoRow = Tables<'promo_codes'>;

const TAG_STYLE = "text-[10px] uppercase font-black tracking-widest";

import { useAvailability } from '../hooks/useAvailability';

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, refreshProperties, isLoading: isPropLoading } = useProperty();
  const { user } = useAuth();

  const property = properties.find(p => p.id === id);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const { blockedDates, isLoading: isAvailabilityLoading, isRangeAvailable } = useAvailability(id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [guestMessage, setGuestMessage] = useState('');
  const [priceMismatch, setPriceMismatch] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoRow | null>(null);
  const [promoError, setPromoError] = useState('');

  // 1. Fetch Fresh on Mount
  useEffect(() => {
    refreshProperties();
  }, [id]);

  const handleDateChange = (update: [Date | null, Date | null]) => {
    const [start, end] = update;
    
    // 🛡️ GAP DETECTION LOGIC
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


  if (isLoading) return <BookingSkeleton />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Propiedad no encontrada</h2>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl">Volver al inicio</button>
      </div>
    );
  }

  const nights = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const isTooShort = nights > 0 && nights < 2;

  // Calculate Base Price night by night for Seasonal Pricing
  let basePrice = 0;
  let hasSeasonalNight = false;
  if (startDate && endDate) {
    let current = new Date(startDate);
    while (current < endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (isSeasonalDate(dateStr, property.seasonal_prices)) hasSeasonalNight = true;
      basePrice += getNightlyPrice(property.price, dateStr, property.seasonal_prices);
      current = addDays(current, 1);
    }
  }

  // 15s Abandonment Push from Salty
  useEffect(() => {
    if (startDate && endDate && !isProcessing) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('salty-push', {
          detail: { message: "¡Buenas fechas! ¿Tienes alguna duda con el proceso de pago o la política de cancelación? Estoy aquí para aclararlo." }
        }));
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, isProcessing]);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoCode) return;
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .single();

      if (error || !promo) {
        setPromoError('Código no encontrado o inválido.');
        return;
      }

      const validation = validatePromoCode(promo, nights, hasSeasonalNight);
      if (!validation.valid) {
        setPromoError(validation.message || 'Error validando código.');
        return;
      }

      setAppliedPromo(promo);
      setPromoError('');
    } catch (err) {
      setPromoError('Error al validar el código.');
    }
  };

  // Dynamic fees summation: Flat columns + Custom JSONB fees
  const totalFees = (Number(property.cleaning_fee) || 0) + 
                    (Number(property.service_fee) || 0) + 
                    Object.entries(property.fees || {})
                      .filter(([name]) => !['Limpieza', 'Service Fee', 'Security Deposit', 'Limpieza Corta', 'Limpieza Media', 'Limpieza Larga'].includes(name))
                      .reduce((sum, [_, value]) => sum + (Number(value) || 0), 0);

  let total = basePrice + totalFees;
  let discountAmount = 0;
  if (appliedPromo) {
    discountAmount = (basePrice * appliedPromo.discount_percent) / 100;
    total -= discountAmount;
  }

  const handlePaymentSuccess = async (status: string, proofUrl?: string, method?: string) => {
    if (!startDate || !endDate || !user) return;

    setIsProcessing(true);

    // 3. Double Check: Refresh everything to avoid stale prices or expired promos
    const { data: freshProperty } = await supabase
      .from('properties')
      .select('price, fees, seasonal_prices, policies, cleaning_fee, service_fee')
      .eq('id', id)
      .single();

    if (!freshProperty) {
      alert("Error al validar datos frescos.");
      setIsProcessing(false);
      return;
    }

    // Re-calculate Base Price
    let reBasePrice = 0;
    let reHasSeasonal = false;
    let curr = new Date(startDate);
    while (curr < endDate) {
      const dStr = format(curr, 'yyyy-MM-dd');
      if (isSeasonalDate(dStr, freshProperty.seasonal_prices)) reHasSeasonal = true;
      reBasePrice += getNightlyPrice(freshProperty.price, dStr, freshProperty.seasonal_prices);
      curr = addDays(curr, 1);
    }

    const reFees = Object.entries(freshProperty.fees || {}).reduce((s, [_, v]) => s + (Number(v) || 0), 0);
    let reTotal = reBasePrice + reFees;

    // Re-validate Promo if any
    let finalPromoId = null;
    if (appliedPromo) {
      const { data: freshPromo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', appliedPromo.id)
        .single();

      const v = freshPromo ? validatePromoCode(freshPromo, nights, reHasSeasonal) : { valid: false };
      if (v.valid && freshPromo) {
        const disc = (reBasePrice * freshPromo.discount_percent) / 100;
        reTotal -= disc;
        finalPromoId = freshPromo.id;
      } else {
        alert("El cupón ya no es válido o ha expirado. El total ha sido recalculado.");
        setAppliedPromo(null);
        setIsProcessing(false);
        return;
      }
    }

    // Final total validation check
    if (Math.abs(reTotal - total) > 0.01) {
      alert("⚠️ Los precios han cambiado. Por favor revisa el nuevo total.");
      setPriceMismatch(true);
      setIsProcessing(false);
      refreshProperties();
      return;
    }

    // Update Promo usage if valid
    if (finalPromoId) {
      await supabase.rpc('increment_promo_usage', { promo_id: finalPromoId });
    }

    // 4. Secure Insert and Select (Atomic flow) — Strict Schema Types
    const bookingPayload: BookingInsert = {
      user_id: user.id,
      customer_name: user.name,
      source: 'Direct Web',
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: reTotal,
      total_paid_at_booking: reTotal,
      guests_count: freshProperty.guests ?? property.guests ?? null,
      status: status,
      payment_method: method,
      payment_proof_url: proofUrl || null,
      email_sent: false,
      applied_policy: {
        type: freshProperty.cancellation_policy_type || (freshProperty.policies as any)?.cancellationPolicy || 'moderate',
        snapshot: `Regla legal de Airbnb (${freshProperty.cancellation_policy_type || 'moderate'}) activa en fecha de reserva. Reembolso calculado sobre Total Bruto.`
      },
      cleaning_fee_at_booking: Number(freshProperty.cleaning_fee || property.cleaning_fee || 0),
      service_fee_at_booking: Number(freshProperty.service_fee || property.service_fee || 0)
    };

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single();

    if (bookingError || !bookingData) {
      alert("Error en la reserva: " + (bookingError?.message || "Internal error"));
      setIsProcessing(false);
      return;
    }

    // Email Notification via Resend (Using real DB data where possible)
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            name: user.name,
            email: user.email,
            phone: phone
          },
          booking: {
            id: bookingData.id,
            propertyName: property.title,
            checkIn: format(new Date(bookingData.check_in + 'T12:00:00'), 'dd MMM yyyy'),
            checkOut: format(new Date(bookingData.check_out + 'T12:00:00'), 'dd MMM yyyy'),
            guests: property.guests, // Use verified unified guests column
            total: bookingData.total_price,
            method: bookingData.payment_method,
            message: guestMessage
          }
        }),
      });

      if (response.ok) {
        // Mark as sent in DB
        await supabase
          .from('bookings')
          .update({ email_sent: true })
          .eq('id', bookingData.id);
      } else {
        throw new Error('Resend response not OK');
      }
    } catch (err) {
      console.error('Notification error:', err);
      alert('Reserva guardada, pero hubo un problema enviando el aviso por email. El host ha sido notificado por sistema.');
    }

    // Navigar a success con los datos para WhatsApp
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

  const [showCalendarModal, setShowCalendarModal] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-sand flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in">
      {/* Dynamic Background Mesh for Elite Feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative bg-white/80 backdrop-blur-xl w-full max-w-2xl h-full sm:h-[90vh] sm:rounded-[3rem] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/40">

        <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-white sm:bg-white/80 backdrop-blur-xl z-20 border-b border-black/5">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-icons text-text-main">close</span>
          </button>
          <div className="text-center">
            <h2 className="font-serif font-black text-xl text-text-main leading-none">Confirmar Estancia</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF7F3F] mt-1 italic">Boutique Stays Experience</p>
          </div>
          <div className="w-12"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar pb-32">

          {/* Property Short Summary Card */}
          <div className="flex gap-6 p-6 bg-white rounded-[2.5rem] shadow-soft border border-black/5">
            <SmartImage src={property.images[0]} className="w-24 h-24 rounded-[1.8rem] object-cover shadow-lg" />
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

          {/* Date Selector Trigger - Mobile Optimized */}
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
                  <p className="text-2xl font-serif font-black text-text-main">{format(startDate, 'dd MMM')}</p>
                </div>
                <div className="bg-[#FFF4ED] p-6 rounded-[2rem] border-2 border-primary/20 transition-all group-hover:border-primary/40 shadow-sm">
                  <p className={TAG_STYLE + " text-[#FF7F3F] mb-1 font-black"}>Check-out</p>
                  <p className="text-2xl font-serif font-black text-text-main">{format(endDate, 'dd MMM')}</p>
                </div>
              </div>
            )}
          </section>

          {/* User & Message Form */}
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
                placeholder="¿Alguna petición especial? (Ej: Cuna, decoración, early check-in...)"
                className="w-full p-6 bg-white border border-black/5 rounded-[2.5rem] shadow-soft focus:ring-2 ring-primary/10 outline-none text-sm min-h-[140px] leading-relaxed"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
              />
            </div>
          </section>

          {/* Promo & Totals */}
          <section className="space-y-6 pt-6 border-t border-black/5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="CÓDIGO PROMO"
                className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 ring-primary/20 outline-none"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button
                onClick={handleApplyPromo}
                className="bg-black text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Validar
              </button>
            </div>

            {promoError && <p className="text-[10px] text-red-500 font-black tracking-widest uppercase ml-2">{promoError}</p>}

      <div className="bg-[#FFF8F4] p-8 rounded-[2.5rem] border border-orange-200/50 shadow-inner space-y-4">
               <div className="flex justify-between items-center text-sm font-bold">
                 <span className="text-text-light">Estancia ({nights || 0} noches)</span>
                 <span className="text-text-main font-serif font-black text-lg">${basePrice}</span>
               </div>
               
               {/* Flat Fees Rendering */}
               {Number(property.cleaning_fee) > 0 && (
                 <div className="flex justify-between items-center text-sm font-bold">
                   <span className="text-text-light">Limpieza</span>
                   <span className="text-text-main font-serif font-black text-lg">${property.cleaning_fee}</span>
                 </div>
               )}
               {Number(property.service_fee) > 0 && (
                 <div className="flex justify-between items-center text-sm font-bold">
                   <span className="text-text-light">Service Fee</span>
                   <span className="text-text-main font-serif font-black text-lg">${property.service_fee}</span>
                 </div>
               )}

               {/* Dynamic Fees Rendering */}
               {Object.entries(property.fees || {})
                 .filter(([name]) => !['Limpieza', 'Service Fee', 'Security Deposit', 'Limpieza Corta', 'Limpieza Media', 'Limpieza Larga'].includes(name))
                 .map(([name, value]) => (
                 <div key={name} className="flex justify-between items-center text-sm font-bold">
                   <span className="text-text-light">{name}</span>
                   <span className="text-text-main font-serif font-black text-lg">${value}</span>
                 </div>
               ))}
              {appliedPromo && (
                <div className="flex justify-between items-center text-sm text-green-700 font-bold">
                  <span>Beneficio Directo ({appliedPromo.discount_percent}%)</span>
                  <span className="font-serif font-black text-lg">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-6 border-t border-dashed border-orange-200 mt-2 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FF7F3F] mb-1">Inversión Final</p>
                  <p className="text-xs text-text-light font-medium">Todo incluido • Pago Seguro</p>
                </div>
                <p className="text-4xl font-serif font-black text-text-main">${total}</p>
              </div>
            </div>
          </section>

          {/* Alerts */}
          {isTooShort && (
            <div className="flex gap-4 p-5 bg-red-50 rounded-3xl border border-red-100 animate-shake">
              <span className="material-icons text-red-500">warning</span>
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                Nivel de Selección: Requiere estancia de 2 noches mínimo. Por favor ajusta tu salida.
              </p>
            </div>
          )}

          {/* Payment Gateway */}
          {startDate && endDate && !isTooShort && !priceMismatch && (
            <section className="space-y-4 pb-20">
              <h3 className={TAG_STYLE + " text-gray-400"}>3. Pasarela de Pago Segura</h3>
              <PaymentProcessor
                total={total}
                user={user}
                isProcessing={isProcessing}
                onSuccess={handlePaymentSuccess}
              />
            </section>
          )}
        </div>
      </div>

      {/* --- ELITE FULLSCREEN CALENDAR MODAL --- */}
      <AnimatePresence>
        {showCalendarModal && (
          <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-fade-in">
            <header className="px-8 py-8 flex items-center justify-between border-b border-black/5">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center"
              >
                <span className="material-icons">close</span>
              </button>
              <div className="text-center">
                <h3 className="text-2xl font-serif font-black">Disponibilidad Real</h3>
                <p className={TAG_STYLE + " text-primary"}>Fechas actualizadas hace 1 min</p>
              </div>
              <div className="w-12"></div>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8">
              <div className="max-w-md mx-auto">
                <BookingCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    handleDateChange(update);
                    // Si ya seleccionó rango completo, cerrar automáticamente con delay elegante
                    if (update[0] && update[1]) {
                      setTimeout(() => setShowCalendarModal(false), 800);
                    }
                  }}
                  blockedDates={blockedDates}
                />

                <div className="mt-12 p-6 bg-sand/30 rounded-[2.5rem] border border-orange-100">
                  <h4 className="font-serif font-bold text-lg mb-4 text-center text-text-main">Feeds Externos Sincronizados</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                      <div className="w-8 h-8 bg-[#FF5A5F]/10 text-[#FF5A5F] rounded-lg flex items-center justify-center">
                        <span className="material-icons text-sm">bolt</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5A5F]">Airbnb Live</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                      <div className="w-8 h-8 bg-[#003580]/10 text-[#003580] rounded-lg flex items-center justify-center">
                        <span className="material-icons text-sm">bolt</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#003580]">Booking.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-8 border-t border-black/5 pb-safe">
              <button
                disabled={!startDate || !endDate}
                onClick={() => setShowCalendarModal(false)}
                className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-xs disabled:opacity-30 transition-all shadow-xl"
              >
                {startDate && endDate ? `Cerrar y Ver Resumen` : `Selecciona fechas para continuar`}
              </button>
            </footer>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
