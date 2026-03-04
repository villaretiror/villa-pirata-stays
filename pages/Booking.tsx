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
import PayPalPayment from '../components/PayPalPayment';
import { HOST_PHONE } from '../constants';

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
  const [paymentMethod, setPaymentMethod] = useState<'ath_movil' | 'paypal'>('ath_movil');
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleATHUpload = async () => {
    if (!screenshot) return null;
    setIsUploading(true);
    const fileExt = screenshot.name.split('.').pop();
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payments')
      .upload(filePath, screenshot);

    if (uploadError) {
      alert("Error subiendo el comprobante: " + uploadError.message);
      setIsUploading(false);
      return null;
    }

    const { data } = supabase.storage.from('payments').getPublicUrl(filePath);
    setIsUploading(false);
    return data.publicUrl;
  };

  const processBooking = async (status: string, proofUrl?: string, method?: string) => {
    if (!startDate || !endDate || !user) return;

    setIsProcessing(true);
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      property_id: id,
      check_in: format(startDate, 'yyyy-MM-dd'),
      check_out: format(endDate, 'yyyy-MM-dd'),
      total_price: total,
      status: status,
      payment_method: method || paymentMethod,
      payment_proof_url: proofUrl || null
    });

    if (error) {
      alert("Error en la reserva: " + error.message);
      setIsProcessing(false);
      return;
    }

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

  const handleManualConfirm = async () => {
    if (paymentMethod === 'ath_movil' && !screenshot) {
      alert("Por favor, sube una captura de pantalla de tu pago por ATH Móvil.");
      return;
    }

    let proofUrl = undefined;
    if (paymentMethod === 'ath_movil') {
      proofUrl = await handleATHUpload();
      if (!proofUrl) return;
    }

    await processBooking('waiting_approval', proofUrl);
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
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Método de Pago</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'paypal' ? 'border-primary bg-orange-50 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
              >
                <div className="w-12 h-8 flex items-center justify-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5" alt="PayPal" />
                </div>
                <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">PayPal</p>
              </button>
              <button
                onClick={() => setPaymentMethod('ath_movil')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'ath_movil' ? 'border-orange-500 bg-orange-50 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
              >
                <div className="w-12 h-8 flex items-center justify-center">
                  <span className="bg-[#FF6B35] text-white px-2 py-0.5 rounded-md font-black text-[10px] italic">ATH</span>
                </div>
                <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">ATH Móvil</p>
              </button>
            </div>

            {paymentMethod === 'ath_movil' && (
              <div className="bg-orange-50/50 p-5 rounded-[1.5rem] border border-orange-100 animate-fade-in">
                <p className="text-xs font-bold text-orange-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Instrucciones ATH Móvil
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-orange-200 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-800">1</div>
                    <p className="text-[11px] text-orange-700 leading-tight">Envía el total de <span className="font-bold">${total}</span> a:</p>
                  </div>
                  <div className="ml-8 bg-white p-2 rounded-lg border border-orange-200 inline-block">
                    <p className="text-sm font-black text-orange-600 tracking-wider">{HOST_PHONE}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 bg-orange-200 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-800">2</div>
                    <p className="text-[11px] text-orange-700 leading-tight">Sube la captura de pantalla del recibo:</p>
                  </div>
                </div>

                <label className="block w-full cursor-pointer group">
                  <div className="w-full py-4 px-4 bg-white border-2 border-dashed border-orange-200 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-orange-400 group-hover:bg-orange-50 transition-all">
                    <span className="material-icons text-orange-400 group-hover:scale-110 transition-transform">cloud_upload</span>
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                      {screenshot ? screenshot.name : "Subir Comprobante"}
                    </span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}
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
          {paymentMethod === 'paypal' && startDate && endDate ? (
            <div className="animate-fade-in">
              <PayPalPayment
                amount={total}
                onSuccess={(details) => processBooking('confirmed', undefined, 'paypal')}
                onError={(err) => alert("Error en PayPal: " + err)}
              />
            </div>
          ) : (
            <button
              onClick={handleManualConfirm}
              disabled={isProcessing || isUploading || !startDate || !endDate}
              className={`w-full text-white font-bold py-4 rounded-2xl shadow-float transition-all flex items-center justify-center gap-2 ${isProcessing || isUploading || !startDate || !endDate ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isProcessing || isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {paymentMethod === 'ath_movil' ? 'CONFIRMAR PAGO ATH MÓVIL' : 'CONFIRMAR RESERVA'}
                  <span className="material-icons">bolt</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .luxury-calendar { border: none !important; font-family: inherit !important; width: 100% !important; }
        .react-datepicker { display: block !important; border: none !important; }
        .react-datepicker__header { background-color: white !important; border: none !important; }
        .react-datepicker__month-container { width: 100% !important; }
        .react-datepicker__day--disabled { color: #ccc !important; text-decoration: line-through !important; cursor: not-allowed !important; }
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { background-color: #EF4444 !important; border-radius: 12px !important; color: white !important; }
        .react-datepicker__day--in-range { background-color: rgba(239, 68, 68, 0.1) !important; color: #EF4444 !important; }
      `}</style>
    </div >
  );
};

export default Booking;
