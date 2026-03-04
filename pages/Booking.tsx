import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SmartImage from '../components/SmartImage';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { addDays, format, differenceInDays } from 'date-fns';

registerLocale('es', es);

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties } = useProperty();
  const { user } = useAuth();

  const property = properties.find(p => p.id === id);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'ath_movil' | 'stripe' | 'paypal'>('ath_movil');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      if (!id) return;

      // 1. Fechas bloqueadas manualmente por el Host
      const manualBlocked = property?.blockedDates.map(d => new Date(d)) || [];

      // 2. Fechas con reservas confirmadas
      const { data: bookings } = await supabase
        .from('bookings')
        .select('check_in, check_out')
        .eq('property_id', id)
        .eq('status', 'confirmed');

      const bookingDates: Date[] = [];
      bookings?.forEach(b => {
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

  const handleConfirm = async () => {
    if (!startDate || !endDate || !user) {
      alert("Por favor, selecciona las fechas y asegúrate de haber iniciado sesión.");
      return;
    }

    setIsProcessing(true);

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: total,
      status: 'confirmed' // En demo lo confirmamos directo
    });

    if (error) {
      alert("Error al reservar: " + error.message);
      setIsProcessing(false);
      return;
    }

    setTimeout(() => {
      navigate('/success');
    }, 1500);
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

          {/* Selector de Fechas Real */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Selecciona tus fechas</h3>
            <div className="relative booking-datepicker-container">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
                excludeDates={blockedDates}
                minDate={new Date()}
                monthsShown={1}
                inline
                locale="es"
                calendarClassName="luxury-calendar"
              />
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Confirmar con</h3>
            <button
              onClick={() => setPaymentMethod('ath_movil')}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'ath_movil' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center text-white font-black text-xs">ATH</div>
                <div className="text-left"><p className="font-bold text-sm">ATH Móvil</p></div>
              </div>
              {paymentMethod === 'ath_movil' && <span className="material-icons text-orange-500">check_circle</span>}
            </button>
          </div>

          {/* Desglose de Precios */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-text-light">${property.price} x {nights || 0} noches</span>
              <span className="font-medium">${basePrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-light">Servicio de Preparación</span>
              <span className="font-medium">${cleaningFee}</span>
            </div>
            <div className="flex justify-between items-end pt-4">
              <span className="font-bold text-base text-text-main">Inversión Final</span>
              <div className="text-right">
                <span className="text-[10px] block font-black text-secondary tracking-widest uppercase mb-1">Total PR Tax Incl.</span>
                <span className="font-bold text-2xl text-primary">${total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !startDate || !endDate}
            className={`w-full text-white font-bold py-4 rounded-2xl shadow-float transition-all flex items-center justify-center gap-2 ${isProcessing || !startDate || !endDate ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {paymentMethod === 'ath_movil' ? 'INICIAR PAGO ATH MÓVIL' : 'CONFIRMAR RESERVA'}
                <span className="material-icons">bolt</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .luxury-calendar {
          border: none !important;
          font-family: inherit !important;
          width: 100% !important;
        }
        .react-datepicker {
          display: block !important;
        }
        .react-datepicker__month-container {
          width: 100% !important;
        }
        .react-datepicker__day--disabled {
          color: #ccc !important;
          text-decoration: line-through !important;
          cursor: not-allowed !important;
        }
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end {
          background-color: #EF4444 !important;
          border-radius: 12px !important;
        }
        .react-datepicker__day--in-range {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: #EF4444 !important;
        }
      `}</style>
    </div>
  );
};

export default Booking;

