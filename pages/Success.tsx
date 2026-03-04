import React from 'react';
import { useNavigate } from 'react-router-dom';

const Success: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 rounded-full transform scale-150"></div>
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center shadow-float animate-bounce relative z-10 text-white">
          <span className="material-icons text-5xl">check_circle</span>
        </div>
      </div>

      <h1 className="text-3xl font-display font-semibold mb-2 text-text-main tracking-wide">¡Reserva confirmada!</h1>
      <p className="text-text-light text-lg font-medium mb-12">Prepara tus maletas para Cabo Rojo.</p>

      <div className="bg-white rounded-3xl p-6 mb-8 shadow-card w-full max-w-sm border border-orange-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary to-primary opacity-80"></div>
        <div className="flex items-center gap-3 mb-4">
           <div className="bg-orange-50 p-2 rounded-xl">
             <span className="material-icons text-primary">vpn_key</span>
           </div>
           <div className="text-left">
             <p className="font-bold text-text-main">Acceso de llegada</p>
             <p className="text-xs text-text-light">Tus instrucciones están listas.</p>
           </div>
        </div>
        <button 
          onClick={() => navigate('/reservation/demo')} // Using demo ID for now
          className="w-full bg-secondary/5 text-secondary font-bold py-3 rounded-xl text-sm hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-icons text-sm">visibility</span>
          Ver instrucciones
        </button>
      </div>

      <button 
        onClick={() => navigate('/')}
        className="text-text-light font-bold text-sm underline hover:text-primary transition-colors"
      >
        Volver al inicio
      </button>
    </div>
  );
};

export default Success;
