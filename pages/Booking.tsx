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

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, refreshProperties } = useProperty();
  const { user } = useAuth();

  const property = properties.find(p => p.id === id);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [guestMessage, setGuestMessage] = useState('');
  const [priceMismatch, setPriceMismatch] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState('');

  // 1. Fetch Fresh on Mount
  useEffect(() => {
    refreshProperties();
  }, [id]);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      if (!id || !property) return;
      const manualBlocked = property.blockedDates.map((d: string) => new Date(d)) || [];
      const { data: bookings } = await supabase
        .from('bookings')
        .select('check_in, check_out, status, hold_expires_at')
        .eq('property_id', id)
        .or('status.in.(confirmed,waiting_approval,emergency_support),status.eq.pending_ai_validation');

      const bookingDates: Date[] = [];
      bookings?.forEach((b: any) => {
        // Skip if it's an expired AI hold
        if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < new Date()) {
          return;
        }

        let start = new Date(b.check_in);
        const end = new Date(b.check_out);
        while (start < end) {
          bookingDates.push(new Date(start));
          start = addDays(start, 1);
        }
      });

      // Fetch iCal feeds from Airbnb/Booking.com (Parallel)
      let icalDates: Date[] = [];
      if (property.calendarSync && property.calendarSync.length > 0) {
        try {
          const syncPromises = property.calendarSync.map(async (sync: any) => {
            try {
              const icalData = await fetchICalData(sync.url);
              return parseICalData(icalData);
            } catch (err) {
              console.warn(`iCal sync failed for ${sync.platform}:`, err);
              return [];
            }
          });

          const results = await Promise.all(syncPromises);
          results.flat().forEach(ds => icalDates.push(new Date(`${ds}T12:00:00`)));
        } catch (err) {
          console.error("Critical Multichannel Sync Error:", err);
        }
      }

      setBlockedDates([...manualBlocked, ...bookingDates, ...icalDates]);
    };
    fetchBlockedDates();
  }, [id, property]);

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

  // Dynamic fees summation (SAFE NUMBER PARSING)
  const feesList = Object.entries(property.fees || {});
  const totalFees = feesList.reduce((sum, [_, value]) => sum + (Number(value) || 0), 0);

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
      .select('price, fees, seasonal_prices')
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

    // 4. Secure Insert and Select (Atomic flow)
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        property_id: id,
        check_in: format(startDate, 'yyyy-MM-dd'),
        check_out: format(endDate, 'yyyy-MM-dd'),
        total_price: total,
        status: status,
        payment_method: method,
        payment_proof_url: proofUrl || null,
        email_sent: false // Default to false
      })
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md h-[95vh] sm:h-auto sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up">

        <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <span className="material-icons text-text-main">close</span>
          </button>
          <h2 className="font-bold text-lg">Reserva Tu Refugio</h2>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Info Propiedad */}
          <div className="flex gap-4 p-3 bg-sand/50 rounded-2xl border border-orange-100">
            <SmartImage src={property.images[0]} className="w-20 h-20 rounded-xl object-cover" />
            <div>
              <h3 className="font-bold text-text-main text-sm">{property.title}</h3>
              <p className="text-xs text-text-light">{nights || '--'} noches • {property.guests} huéspedes máx</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-primary font-bold text-sm">
                  ${nights > 0 ? (basePrice / nights).toFixed(2) : property.price} / noche
                </p>
                {/* Direct Booking Advantage UI */}
                <div className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border border-green-100">
                  <span className="material-icons text-[10px]">verified</span>
                  Mejor Tarifa Directa
                </div>
              </div>
            </div>
          </div>

          {/* Calendario Modular */}
          <BookingCalendar
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            blockedDates={blockedDates}
          />

          {/* Formulario de Contacto / Detalles */}
          <div className="space-y-4 pt-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Tus Datos de Contacto</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phone</span>
                <input
                  type="tel"
                  placeholder="Teléfono (WhatsApp pref.)"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 ring-primary/20 outline-none font-bold"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <textarea
                placeholder="¿Algún mensaje o petición especial?"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 ring-primary/20 outline-none min-h-[100px]"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Promo Code UI */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Código Promocional</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: VERANO2024"
                className="flex-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 ring-primary/20 outline-none uppercase font-bold"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button
                onClick={handleApplyPromo}
                className="bg-black text-white px-6 rounded-2xl text-xs font-bold hover:bg-gray-900 transition-all uppercase tracking-widest"
              >
                Aplicar
              </button>
            </div>
            {promoError && <p className="text-[10px] text-red-500 font-bold ml-2 italic">{promoError}</p>}
            {appliedPromo && (
              <div className="bg-green-50 p-2 rounded-xl flex justify-between items-center border border-green-100">
                <p className="text-[10px] text-green-700 font-black uppercase tracking-widest pl-2">
                  ¡Descuento {appliedPromo.discount_percent}% Aplicado!
                </p>
                <button onClick={() => setAppliedPromo(null)} className="text-green-800 p-1">
                  <span className="material-icons text-xs">close</span>
                </button>
              </div>
            )}
          </div>

          {/* Desglose de Precios */}
          <div className="space-y-4 py-6 border-y border-gray-100 bg-gray-50/30 -mx-6 px-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Resumen de Inversión</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-light">${property.price} x {nights || 0} noches</span>
                <span className="font-medium">${basePrice}</span>
              </div>
              {feesList.map(([name, value]) => (
                <div key={name} className="flex justify-between text-sm animate-fade-in">
                  <span className="text-text-light">{name}</span>
                  <span className="font-medium">${Number(value) || 0}</span>
                </div>
              ))}
              {appliedPromo && (
                <div className="flex justify-between text-sm text-green-600 font-bold animate-fade-in">
                  <span>Descuento Directo ({appliedPromo.discount_percent}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-4 border-t border-dashed border-gray-200 mt-2">
                <span className="font-bold text-base text-text-main">Inversión Final</span>
                <div className="text-right">
                  <span className="text-[10px] block font-black text-secondary tracking-widest uppercase mb-1">Total PR Tax Incl.</span>
                  <span className="font-bold text-2xl text-primary">${total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerta de Estancia Mínima */}
          {isTooShort && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3 animate-shake">
              <span className="material-icons text-red-500">warning</span>
              <div>
                <p className="text-xs font-bold text-red-700">La reserva mínima es de 2 noches</p>
                <p className="text-[10px] text-red-600 mt-0.5">Por favor, selecciona una fecha de salida posterior.</p>
              </div>
            </div>
          )}

          {/* Alerta de Cambio de Precio Realtime */}
          {priceMismatch && (
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 flex items-start gap-3 animate-slide-up">
              <span className="material-icons text-orange-500">sync</span>
              <div>
                <p className="text-xs font-bold text-orange-700">Las tarifas han sido actualizadas</p>
                <p className="text-[10px] text-orange-600 mt-0.5">El anfitrión ha realizado un cambio. Estamos cargando los nuevos precios...</p>
              </div>
            </div>
          )}

          {/* Pasarela de Pago Modular */}
          {startDate && endDate && !isTooShort && !priceMismatch && (
            <PaymentProcessor
              total={total}
              user={user}
              isProcessing={isProcessing}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {!startDate && (
            <div className="py-6 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Selecciona fechas para proceder al pago
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;
