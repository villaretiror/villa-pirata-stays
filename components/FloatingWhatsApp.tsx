import React from 'react';

interface FloatingWhatsAppProps {
  propertyTitle?: string;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ propertyTitle }) => {
  // Replace with your actual phone number
  const phoneNumber = "17870000000"; 
  
  // Dynamic message based on context
  const message = propertyTitle 
    ? `Hola Villa Retiro R LLC, estoy viendo la propiedad "${propertyTitle}" y me gustaría saber si tienen disponibilidad o aclarar algunas dudas.`
    : "Hola Villa Retiro R LLC, me interesa reservar una estancia con ustedes. ¿Qué fechas tienen disponibles?";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-float hover:scale-110 transition-transform duration-300 flex items-center justify-center group"
      aria-label="Contactar por WhatsApp"
    >
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
        alt="WhatsApp" 
        className="w-8 h-8 filter brightness-0 invert"
      />
      <span className="absolute right-full mr-3 bg-white text-text-main text-xs font-bold px-3 py-1.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {propertyTitle ? '¡Pregunta por esta villa!' : '¿Dudas? ¡Escríbenos!'}
      </span>
    </a>
  );
};

export default FloatingWhatsApp;