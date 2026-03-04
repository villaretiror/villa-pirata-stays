import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';

const ReservationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties } = useProperty();
  
  // For demo, if id is 'demo' or not found, use the first property
  const property = properties.find(p => p.id === id) || properties[0];

  if (!property) return null;

  // Use real data from property policies + defaults for demo
  const reservationData = {
    checkInDate: "Hoy",
    checkInTime: property.policies.checkInTime || "3:00 PM",
    checkOutDate: "Lunes",
    checkOutTime: property.policies.checkOutTime || "11:00 AM",
    accessCode: property.policies.accessCode || "4829 #",
    wifiName: property.policies.wifiName || 'WiFi_Invitados',
    wifiPass: property.policies.wifiPass || 'Welcome2024',
    exactAddress: property.address || property.location,
    mapImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8x1Qc7wlMlOIy1SXHp1mG75UGvyFJdWJ6MvI5TUGRyMfQ4GG2t7K3LeTPC54RSOvajAVr6LlnpDf-HGb4Uh38sjoBQ7pMdO-elHL0_oD7Bk0_X3ivQYqiRqjxYTqIeO3QeG_EWloA4lTLDxgynhb6nOdo9kfJ_OapwwJMRXlFqRRJJ0VRw9D_9zyRxOJfC8kp8tpVrAeC45AYLzluiK0prlpSLmlByjDJi1OpxKczNy0eWzWfYpvQDovkCi4PtWp_aD5RUWTlzr8"
  };

  return (
    <div className="min-h-screen bg-sand pb-20 animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="font-bold text-text-main">Detalles de la Reserva</h1>
        <button className="p-2 -mr-2 text-primary">
          <span className="material-icons">help_outline</span>
        </button>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-6">
        
        {/* Status Card */}
        <div className="bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-6 text-white shadow-float relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-serif font-bold mb-1">¡Llegó el día!</h2>
            <p className="opacity-90 text-sm mb-4">Tu estancia en {property.title} comienza hoy.</p>
            <div className="flex gap-4">
               <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex-1 border border-white/30">
                 <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Check-in</p>
                 <p className="font-bold text-lg">{reservationData.checkInTime}</p>
               </div>
               <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex-1 border border-white/30">
                 <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Check-out</p>
                 <p className="font-bold text-lg">{reservationData.checkOutTime}</p>
               </div>
            </div>
          </div>
          <span className="material-icons absolute -bottom-4 -right-4 text-9xl opacity-20 rotate-12">vpn_key</span>
        </div>

        {/* Address & Map */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-700">
                <span className="material-icons">location_on</span>
              </div>
              <div>
                 <h3 className="font-bold text-text-main">Cómo llegar</h3>
                 <p className="text-sm text-text-light mt-1 select-all">{reservationData.exactAddress}</p>
              </div>
            </div>
          </div>
          {/* Mock Map View */}
          <div className="h-48 bg-gray-200 relative group cursor-pointer">
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-icons text-4xl text-red-500 drop-shadow-lg animate-bounce">location_on</span>
             </div>
             <div className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
               <span className="material-icons text-sm">directions</span> Ir ahora
             </div>
             <img src={reservationData.mapImage} className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all" alt="Map Placeholder" />
          </div>
        </div>

        {/* Access Info */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
           <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
             <span className="material-icons text-secondary">lock</span> Instrucciones de llegada
           </h3>
           <div className="space-y-4">
             <div className="flex items-center justify-between bg-sand p-4 rounded-xl border border-orange-100">
               <div>
                 <p className="text-xs text-text-light font-bold uppercase">Caja de seguridad</p>
                 <p className="text-sm text-text-light">Código de acceso</p>
               </div>
               <div className="text-2xl font-mono font-bold text-text-main tracking-widest">{reservationData.accessCode}</div>
             </div>
             <div className="text-sm text-text-light leading-relaxed">
               <span className="font-bold">Nota:</span> Introduce el código y baja la palanca negra. Si tienes problemas, contáctanos por el chat.
             </div>
           </div>
        </div>

        {/* Wifi */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
           <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
             <span className="material-icons text-secondary">wifi</span> Wifi
           </h3>
           <div className="space-y-3">
             <div className="flex justify-between items-center pb-3 border-b border-gray-100">
               <span className="text-sm text-text-light">Red</span>
               <span className="font-medium text-text-main">{reservationData.wifiName}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-sm text-text-light">Contraseña</span>
               <div className="flex items-center gap-2">
                 <span className="font-medium text-text-main">{reservationData.wifiPass}</span>
                 <button 
                    onClick={() => {
                        navigator.clipboard.writeText(reservationData.wifiPass);
                        alert("Contraseña copiada");
                    }} 
                    className="text-primary text-xs font-bold uppercase hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                 >
                    Copiar
                 </button>
               </div>
             </div>
           </div>
        </div>

        {/* House Manual Link */}
        <button className="w-full bg-white border border-gray-200 text-text-main font-bold py-4 rounded-xl shadow-sm flex items-center justify-between px-6 hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2">
            <span className="material-icons text-gray-400">menu_book</span>
            Manual de la casa
          </span>
          <span className="material-icons text-gray-400">chevron_right</span>
        </button>

      </div>
    </div>
  );
};

export default ReservationDetails;
