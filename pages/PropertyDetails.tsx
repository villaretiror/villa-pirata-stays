import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite } = useProperty();
  
  const property = properties.find(p => p.id === id);
  const isFavorite = id ? favorites.includes(id) : false;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Urgency State
  const [viewers, setViewers] = useState(2);

  // Simulate live viewers changing
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly change viewers between 2 and 6
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next < 2 ? 2 : next > 6 ? 6 : next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleShare = async () => {
    const shareData = {
      title: property.title,
      text: `¡Mira este lugar increíble! ${property.title}`,
      url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (e) {
            console.log("Share aborted");
        }
    } else {
        setShowShareModal(true);
    }
  };

  const shareViaWhatsApp = () => {
     const text = `¡Mira este alojamiento! ${property.title} - ${property.subtitle}`;
     window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank');
     setShowShareModal(false);
  };

  const shareViaEmail = () => {
     const subject = `Chequea esta propiedad: ${property.title}`;
     const body = `Hola,\n\nEncontré este alojamiento increíble en Cabo Rojo: ${property.title}.\n\nMira los detalles aquí: ${window.location.href}`;
     window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
     setShowShareModal(false);
  };

  const copyLink = () => {
     navigator.clipboard.writeText(window.location.href);
     // Simple alert for demo purposes, could be a toast in production
     alert("Enlace copiado al portapapeles");
     setShowShareModal(false);
  };

  const getSourceLabel = (source: string) => {
    // Simple visual badge logic
    const colorClass = source === 'Airbnb' ? 'bg-[#FF5A5F]/10 text-[#FF5A5F]' : 
                       source === 'Booking.com' ? 'bg-[#003580]/10 text-[#003580]' : 
                       'bg-[#4285F4]/10 text-[#4285F4]';
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colorClass} uppercase tracking-wider`}>
        {source}
      </span>
    );
  };

  return (
    <div className="bg-white min-h-screen pb-28 animate-fade-in relative">
      {/* Top Nav */}
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center p-4">
        <button 
          onClick={() => navigate(-1)}
          className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-soft hover:bg-white transition-transform hover:scale-105 active:scale-95"
        >
          <span className="material-icons text-text-main">arrow_back</span>
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handleShare}
            className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-soft hover:bg-white transition-transform hover:scale-105 active:scale-95"
          >
            <span className="material-icons text-text-main">ios_share</span>
          </button>
          <button 
            onClick={() => id && toggleFavorite(id)}
            className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-soft hover:bg-white transition-transform hover:scale-105 active:scale-95"
          >
            <span className={`material-icons ${isFavorite ? 'text-red-500' : 'text-primary'}`}>
              {isFavorite ? 'favorite' : 'favorite_border'}
            </span>
          </button>
        </div>
      </div>

      {/* Hero Image Carousel */}
      <div className="relative w-full h-[45vh] group">
        <img 
          src={property.images[currentImageIndex]} 
          alt={property.title} 
          className="w-full h-full object-cover rounded-b-[2.5rem] shadow-lg transition-opacity duration-500"
        />
        
        {/* Navigation Arrows */}
        {property.images.length > 1 && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md hover:bg-white/80 p-2 rounded-full text-white hover:text-text-main transition-all"
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md hover:bg-white/80 p-2 rounded-full text-white hover:text-text-main transition-all"
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </>
        )}

        <div className="absolute bottom-6 right-6 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
          {currentImageIndex + 1} / {property.images.length}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-8 max-w-2xl mx-auto">
        
        {/* Urgency / Live Viewers Banner */}
        <div className="flex items-center gap-2 mb-4 bg-red-50 w-fit px-3 py-1 rounded-full border border-red-100 animate-fade-in">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
           </span>
           <span className="text-xs font-bold text-red-600">
             {viewers} personas están viendo esto ahora
           </span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-serif text-text-main mb-2 leading-tight">
            {property.title}
          </h1>
          <div className="flex items-center gap-1 text-secondary font-semibold">
            <span className="material-icons text-lg">location_on</span>
            <p className="text-sm underline">{property.location}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center justify-between bg-surface rounded-2xl shadow-soft p-4 mb-6 border border-gray-100">
          <div className="text-center w-full border-r border-gray-100 last:border-0">
            <div className="font-serif font-bold text-xl text-primary">{property.rating}</div>
            <div className="flex justify-center text-accent text-xs mt-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="material-icons text-[14px]">star</span>
              ))}
            </div>
          </div>
          <div className="text-center w-full px-2 border-r border-gray-100 relative overflow-hidden">
            <div className="font-serif font-bold text-lg text-text-main">Favorito</div>
            <div className="text-[10px] text-text-light uppercase tracking-wider font-bold">del viajero</div>
          </div>
          <div className="text-center w-full">
            <div className="font-serif font-bold text-xl text-text-main">{property.reviews}</div>
            <div className="text-[10px] text-text-light uppercase tracking-wider font-bold underline decoration-secondary">Reseñas</div>
          </div>
        </div>

        {/* High Demand Booking Banner - UPDATED MESSAGE */}
        <div className="bg-gradient-to-r from-orange-50 to-sand p-4 rounded-2xl border border-orange-100 mb-8 flex items-start gap-3">
           <div className="bg-white p-1.5 rounded-full shadow-sm">
              <span className="material-icons text-primary text-sm">trending_up</span>
           </div>
           <div>
              <p className="text-sm font-bold text-text-main">¡Alta demanda hoy!</p>
              <p className="text-xs text-text-light mt-0.5">Muchas personas han reservado el día de hoy. ¡Asegura tu estancia antes de que se agote!</p>
           </div>
        </div>

        {/* Host Info */}
        <div className="flex items-center gap-5 p-5 bg-sand rounded-2xl mb-8 border border-orange-100/50">
          <div className="relative">
            <img src={property.host.image} alt={property.host.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md" />
            <span className="absolute bottom-0 right-0 bg-secondary text-white p-1 rounded-full border-2 border-white flex items-center justify-center">
              <span className="material-icons text-[12px]">verified</span>
            </span>
          </div>
          <div>
            <h3 className="font-serif text-xl text-text-main mb-0.5">Anfitrión: {property.host.name}</h3>
            <p className="text-sm text-text-light font-medium flex items-center gap-1">
              <span className="material-icons text-[16px]">military_tech</span>
              {property.host.yearsHosting} años hospedando
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="py-4 mb-6">
          <p className="text-text-main leading-relaxed mb-3 text-[15px]">
            {property.description}
          </p>
          <button className="flex items-center gap-1 font-bold underline text-primary hover:text-primary-dark transition-colors">
            Leer descripción completa <span className="material-icons text-base">arrow_forward</span>
          </button>
        </div>

        {/* Amenities Preview */}
        <div className="py-6 border-t border-gray-100">
          <h2 className="text-2xl font-serif mb-6 text-text-main">Lo que ofrece este lugar</h2>
          <div className="grid grid-cols-1 gap-4">
            {property.amenities.slice(0, 4).map((amenity, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <span className="material-icons text-secondary text-2xl w-8 text-center">check_circle_outline</span>
                <span className="text-text-main font-medium">{amenity}</span>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full border-2 border-primary text-primary rounded-xl py-3.5 font-bold hover:bg-primary hover:text-white transition-all duration-300">
            Mostrar todas las amenidades
          </button>
        </div>

        {/* Reviews Section */}
        <div className="py-6 border-t border-gray-100">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-serif text-text-main">Reseñas</h2>
             <div className="flex gap-2">
               <span className="material-icons text-gray-400 text-sm">verified_user</span>
               <span className="text-xs text-gray-400 font-bold">Verificado</span>
             </div>
           </div>
           
           {/* Horizontal Scroll for reviews */}
           <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 no-scrollbar">
             {property.reviewsList?.map((review) => (
               <div key={review.id} className="min-w-[280px] bg-surface rounded-2xl p-5 shadow-card border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-2">
                       <img src={review.avatar} className="w-8 h-8 rounded-full bg-gray-200" alt="Reviewer" />
                       <div>
                         <p className="text-sm font-bold text-text-main">{review.author}</p>
                         <p className="text-[10px] text-text-light">{review.date}</p>
                       </div>
                     </div>
                     {getSourceLabel(review.source)}
                  </div>
                  <p className="text-sm text-text-main line-clamp-3 mb-2 flex-1">"{review.text}"</p>
                  <div className="flex items-center gap-1 text-primary text-xs font-bold">
                    <span className="material-icons text-sm">star</span> {review.rating}
                  </div>
               </div>
             ))}
           </div>
        </div>

      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 py-4 flex items-center justify-between z-40 pb-8 md:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl text-text-main">${property.price}</span>
            <span className="text-sm text-text-light font-medium">/ noche</span>
          </div>
          <p className="text-xs font-bold text-secondary underline decoration-dotted decoration-2 underline-offset-4">Seleccionar fechas</p>
        </div>
        <button 
          onClick={() => navigate(`/booking/${property.id}`)}
          className="bg-gradient-to-r from-primary to-[#F28C28] hover:to-primary text-white px-8 py-3.5 rounded-xl font-bold text-lg w-[45%] transform active:scale-[0.98] shadow-float transition-all relative overflow-hidden"
        >
          <span className="relative z-10">Reservar</span>
          {/* Subtle shine effect */}
          <div className="absolute top-0 -left-10 w-8 h-full bg-white/20 skew-x-[20deg] animate-[shine_2s_infinite]"></div>
        </button>
      </div>
      <style>{`
        @keyframes shine {
          0% { left: -50%; }
          100% { left: 150%; }
        }
      `}</style>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-text-main">Compartir esta estancia</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <span className="material-icons text-sm">close</span>
              </button>
            </div>
            
            <div className="flex gap-4 mb-6">
              <img src={property.images[0]} className="w-16 h-16 rounded-xl object-cover" alt="Thumb" />
              <div>
                <p className="font-bold text-sm leading-tight mb-1">{property.title}</p>
                <p className="text-xs text-text-light">{property.location}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
               <button onClick={shareViaWhatsApp} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-colors group">
                  <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4 filter brightness-0 invert" alt="wa"/>
                  </div>
                  <span className="text-sm font-bold text-gray-700">WhatsApp</span>
               </button>
               
               <button onClick={shareViaEmail} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                     <span className="material-icons text-sm">email</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">Email</span>
               </button>

               <button onClick={copyLink} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-colors group col-span-2">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                     <span className="material-icons text-sm">content_copy</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">Copiar enlace</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;
