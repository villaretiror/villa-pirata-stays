import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SmartImage from '../components/SmartImage';
import { addDays, format, differenceInDays } from 'date-fns';
import BookingCalendar from '../components/BookingCalendar';
import PaymentProcessor from '../components/PaymentProcessor';

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties } = useProperty();
  const { user } = useAuth();

  const property = properties.find(p => p.id === id);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      if (!id) return;
      const manualBlocked = property?.blockedDates.map(d => new Date(d)) || [];
      const { data: bookings } = await supabase
        .from('bookings')
        .select('check_in, check_out')
        .eq('property_id', id)
        .eq('status', 'confirmed');

      const bookingDates: Date[] = [];
      bookings?.forEach((b: any) => {
        let start = new Date(b.check_in);
        const end = new Date(b.check_out);
        while (start < end) {
          bookingDates.push(new Date(start));
          start = addDays(start, 1);
        }
      });
      setBlockedDates([...manualBlocked, ...bookingDates]);
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
  const basePrice = property.price * (nights || 1);
  const cleaningFee = property.fees.cleaningShort;
  const total = basePrice + cleaningFee;

  const handlePaymentSuccess = async (status: string, proofUrl?: string, method?: string) => {
    if (!startDate || !endDate || !user) return;

    setIsProcessing(true);
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: total,
      status: status,
      payment_method: method,
      payment_proof_url: proofUrl || null
    });

    if (error) {
      alert("Error en la reserva: " + error.message);
      setIsProcessing(false);
      return;
    }

    // Navigar a success con los datos para WhatsApp
    navigate('/success', {
      state: {
        bookingData: {
          guestName: user.name,
          propertyName: property.title,
          checkIn: format(startDate, 'dd MMM yyyy'),
          checkOut: format(endDate, 'dd MMM yyyy'),
          total: total
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
              <p className="text-primary font-bold mt-1 text-sm">${property.price} / noche</p>
            </div>
          </div>

          {/* Calendario Modular */}
          <BookingCalendar
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            blockedDates={blockedDates}
          />

          {/* Desglose de Precios */}
          <div className="space-y-4 py-6 border-y border-gray-100 bg-gray-50/30 -mx-6 px-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Resumen de Inversión</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-light">${property.price} x {nights || 0} noches</span>
                <span className="font-medium">${basePrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-light">Servicio de Preparación</span>
                <span className="font-medium">${cleaningFee}</span>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-dashed border-gray-200 mt-2">
                <span className="font-bold text-base text-text-main">Inversión Final</span>
                <div className="text-right">
                  <span className="text-[10px] block font-black text-secondary tracking-widest uppercase mb-1">Total PR Tax Incl.</span>
                  <span className="font-bold text-2xl text-primary">${total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pasarela de Pago Modular */}
          {startDate && endDate && (
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
