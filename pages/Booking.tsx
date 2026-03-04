
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties } = useProperty();

  const property = properties.find(p => p.id === id);

  const [adults] = useState(2);
  const [children] = useState(0);
  const [pets] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'ath_movil' | 'stripe' | 'paypal'>('ath_movil');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Propiedad no encontrada</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded-xl"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const nights = 2;
  const basePrice = property.price * nights;
  const cleaningFee = property.fees.cleaningShort;
  const taxes = Math.round(basePrice * 0.07);
  const total = basePrice + cleaningFee + taxes + (pets > 0 ? property.fees.petFee : 0);

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      navigate('/success');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md h-[95vh] sm:h-auto sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up">

        <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <span className="material-icons text-text-main">close</span>
          </button>
          <h2 className="font-bold text-lg">Tu Estancia</h2>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Info Propiedad */}
          <div className="flex gap-4 p-3 bg-sand/50 rounded-2xl border border-orange-100">
            <img src={property.images[0]} className="w-20 h-20 rounded-xl object-cover" />
            <div>
              <h3 className="font-bold text-text-main text-sm">{property.title}</h3>
              <p className="text-xs text-text-light">{nights} noches • {adults + children} huéspedes</p>
              <p className="text-primary font-bold mt-1 text-sm">${property.price} / noche</p>
            </div>
          </div>

          {/* Métodos de Pago Boricua Focus */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Método de Pago</h3>

            <button
              onClick={() => setPaymentMethod('ath_movil')}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'ath_movil' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center text-white font-black text-xs">ATH</div>
                <div className="text-left">
                  <p className="font-bold text-sm">ATH Móvil</p>
                  <p className="text-[10px] text-orange-600 font-bold uppercase">Pago Instantáneo PR</p>
                </div>
              </div>
              {paymentMethod === 'ath_movil' && <span className="material-icons text-orange-500">check_circle</span>}
            </button>

            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'paypal' ? 'border-[#003087] bg-blue-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#003087] rounded-xl flex items-center justify-center text-white font-black text-xs">P</div>
                <div className="text-left">
                  <p className="font-bold text-sm">PayPal (Negocio)</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Pago Internacional</p>
                </div>
              </div>
              {paymentMethod === 'paypal' && <span className="material-icons text-[#003087]">check_circle</span>}
            </button>

            <button
              onClick={() => setPaymentMethod('stripe')}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'stripe' ? 'border-primary bg-orange-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  <span className="material-icons">credit_card</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Tarjeta de Crédito</p>
                  <p className="text-[10px] text-text-light">Visa, MC, Amex</p>
                </div>
              </div>
              {paymentMethod === 'stripe' && <span className="material-icons text-primary">check_circle</span>}
            </button>
          </div>

          {/* Desglose */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-light">Subtotal ({nights} noches)</span>
              <span className="font-medium">${basePrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-light">Limpieza</span>
              <span className="font-medium">${cleaningFee}</span>
            </div>
            <div className="flex justify-between text-sm pt-4 border-t border-gray-100">
              <span className="font-bold text-base">Total a Pagar</span>
              <span className="font-bold text-xl text-primary">${total}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`w-full text-white font-bold py-4 rounded-2xl shadow-float transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {paymentMethod === 'ath_movil' ? 'PAGAR CON ATH MÓVIL' : paymentMethod === 'paypal' ? 'PAGAR CON PAYPAL' : 'CONFIRMAR RESERVA'}
                <span className="material-icons">bolt</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-text-light mt-3 uppercase font-bold tracking-tighter">Transacción 100% Segura y Encriptada</p>
        </div>
      </div>
    </div>
  );
};

export default Booking;

