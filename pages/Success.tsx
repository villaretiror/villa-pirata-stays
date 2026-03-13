import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateWhatsAppLink, getBookingWAMessage } from '../utils';
import { HOST_PHONE } from '../constants';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData;

  // Real contact number for the host (can be env var)

  const handleWhatsAppContact = () => {
    let msg = "¡Hola! Quisiera información sobre mi reserva en Villa Retiro R.";
    if (bookingData) {
      msg = getBookingWAMessage(bookingData);
    }
    const link = generateWhatsAppLink(HOST_PHONE, msg);
    window.open(link, '_blank');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle,_#ffffff_0%,_#FDFCFB_100%)] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative">

      {/* Decoración de fondo suave */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Icono de Éxito con Halo Animado */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative mb-10"
      >
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-[-20%] bg-secondary/40 blur-3xl rounded-full"
        />
        <div className="w-28 h-28 bg-gradient-to-br from-secondary to-blue-400 rounded-full flex items-center justify-center shadow-float relative z-10 text-white border-4 border-white/50">
          <span className="material-icons text-5xl">check</span>
        </div>
      </motion.div>

      {/* Cuerpo del Mensaje */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 10 }}
        className="z-10"
      >
        <h1 className="text-4xl md:text-5xl font-serif font-black mb-4 text-text-main tracking-tight">
          ¡Confirmado! 🏝️
        </h1>
        <p className="text-text-light text-lg font-medium mb-12 max-w-sm mx-auto leading-relaxed px-4">
          Prepárate para los mejores atardeceres de tu vida en <span className="text-secondary font-black">{bookingData?.propertyName || 'Boutique Stays'}</span>.
        </p>
      </motion.div>

      {/* Tarjeta de Próximos Pasos (Shadow-Glass) */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 12 }}
        className="backdrop-blur-xl bg-white/70 rounded-[2.5rem] p-8 mb-12 shadow-float w-full max-w-md border border-white/80 relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary via-blue-300 to-primary opacity-60"></div>

        <h3 className="font-serif text-2xl font-bold text-text-main mb-6">Próximos Pasos</h3>

        <div className="space-y-4">
          <button
            onClick={() => navigate(`/reservation/${bookingData?.id || 'latest'}`)}
            className="w-full bg-black text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-lg hover:bg-gray-900 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <span className="material-icons text-sm group-hover:rotate-12 transition-transform">confirmation_number</span>
            Gestionar mi Estancia
          </button>

          <button
            onClick={handleWhatsAppContact}
            className="w-full bg-white/50 border border-gray-100 text-text-main font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-sm hover:bg-[#25D366]/5 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#25D366] blur-lg opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5 relative z-10" alt="WA" />
            </div>
            CONTACTAR AL EQUIPO
          </button>
        </div>
      </motion.div>

      {/* Branding Final / Footer */}
      <footer className="mt-auto py-8 z-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="text-[10px] font-black text-text-light uppercase tracking-[0.25em] mb-6 px-6"
        >
          {bookingData ? `Confirmación enviada a ${bookingData.guestName}` : 'Te hemos enviado un correo con los detalles.'}
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => navigate('/')}
          className="text-secondary font-bold text-sm flex items-center gap-2 mx-auto hover:text-blue-600 transition-colors group"
        >
          <span className="material-icons text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Volver al Inicio
        </motion.button>
      </footer>
    </div>
  );
};

export default Success;
