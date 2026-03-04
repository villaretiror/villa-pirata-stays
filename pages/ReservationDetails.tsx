import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { motion } from 'framer-motion';

const ReservationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties } = useProperty();

  const property = properties.find(p => p.id === id) || properties[0];

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ath'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!property) return null;

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      navigate('/success');
    }, 2000);
  };

  const nights = 2;
  const basePrice = property.price * nights;
  const serviceFee = property.fees?.cleaningShort || 80;
  const total = basePrice + serviceFee;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-[#FDFCFB] pb-24"
    >
      {/* Header */}
      <div className="bg-[#FDFCFB]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <span className="material-icons text-text-main">arrow_back</span>
        </button>
        <h1 className="font-serif font-bold text-text-main text-xl ml-2">Finaliza tu reserva</h1>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-8">

        {/* Tarjeta de Resumen Boutique */}
        <div className="bg-white rounded-[2rem] p-5 shadow-float border border-gray-50 flex gap-4 items-center">
          <img src={property.images[0]} alt={property.title} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
          <div>
            <h2 className="font-bold text-text-main leading-tight mb-1 font-serif text-lg">{property.title}</h2>
            <div className="text-[11px] font-black uppercase tracking-widest text-secondary">
              Hoy - Lunes • {nights} noches
            </div>
            <div className="flex items-center gap-1 mt-1 text-text-light text-xs font-medium">
              <span className="material-icons text-[14px]">star</span>
              <span>{property.rating} ({property.reviews} reseñas)</span>
            </div>
          </div>
        </div>

        {/* Banner de Confianza */}
        <div className="bg-secondary/5 rounded-[2rem] p-6 flex flex-col items-center text-center border border-secondary/10">
          <div className="bg-white p-2.5 rounded-full shadow-sm text-secondary mb-3">
            <span className="material-icons text-[24px]">verified_user</span>
          </div>
          <p className="font-bold text-secondary text-sm leading-relaxed max-w-[250px]">
            Tu tranquilidad es nuestro estándar: Cada detalle ha sido previsto para que tu única tarea sea relajarte.
          </p>
        </div>

        {/* Desglose de Precio */}
        <div className="bg-white rounded-[2rem] p-6 shadow-float border border-gray-50">
          <h3 className="font-serif font-bold text-xl text-text-main mb-5">Inversión en tu descanso</h3>
          <div className="space-y-4 text-[15px] font-medium text-text-main mb-6">
            <div className="flex justify-between items-center">
              <span className="text-text-light">${property.price} x {nights} noches</span>
              <span>${basePrice}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-light underline decoration-gray-300 underline-offset-4">Servicio de Preparación</span>
              <span>${serviceFee}</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5 flex justify-between items-end">
            <span className="font-bold text-text-main text-lg">Total (USD)</span>
            <span className="font-serif font-bold text-3xl text-text-main leading-none">${total}</span>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div>
          <h3 className="font-serif font-bold text-xl text-text-main mb-4 px-2">¿Cómo prefieres pagar?</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <span className={`material-icons text-3xl ${paymentMethod === 'card' ? 'text-primary' : 'text-gray-400'}`}>credit_card</span>
              <span className={`text-[11px] font-black uppercase tracking-wider ${paymentMethod === 'card' ? 'text-primary' : 'text-gray-500'}`}>Tarjeta</span>
            </button>
            <button
              onClick={() => setPaymentMethod('ath')}
              className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'ath' ? 'border-[#ff7a00] bg-[#ff7a00]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <span className={`material-icons text-3xl ${paymentMethod === 'ath' ? 'text-[#ff7a00]' : 'text-gray-400'}`}>phone_iphone</span>
              <span className={`text-[11px] font-black uppercase tracking-wider ${paymentMethod === 'ath' ? 'text-[#ff7a00]' : 'text-gray-500'}`}>ATH Móvil</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            disabled={isProcessing}
            onClick={handleConfirm}
            className="w-full bg-primary text-white py-4 px-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-80 disabled:active:scale-100"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-[13px] font-black uppercase tracking-[0.2em]">Asegurando tu refugio...</span>
              </>
            ) : (
              <span className="text-[13px] font-black uppercase tracking-[0.2em]">Confirmar mi Estancia</span>
            )}
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default ReservationDetails;
