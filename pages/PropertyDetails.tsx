import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import SmartImage from '../components/SmartImage';

// --- STYLES HELPER ---
const TAG_STYLE = "text-[10px] uppercase font-black tracking-widest";
const SECTION_TITLE_STYLE = "text-2xl font-serif text-text-main mb-6";

export const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite } = useProperty();

  const property = properties.find(p => p.id === id);
  const isFavorite = id ? favorites.includes(id) : false;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);

  // Custom Hook param
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 150], [0, 1]);
  const headerBg = useTransform(scrollY, [0, 150], ['rgba(253,252,251,0)', 'rgba(253,252,251,0.95)']);
  const headerIconColor = useTransform(scrollY, [0, 150], ['#FFFFFF', '#2C2B29']);
  const headerIconBg = useTransform(scrollY, [0, 150], ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']);


  // Urgency State
  const [viewers, setViewers] = useState(2);

  // Simulate live viewers changing
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly change viewers between 2 and 6
      setViewers((prev: number) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next < 2 ? 2 : next > 6 ? 6 : next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <span className="material-icons text-4xl text-gray-300">search_off</span>
        </div>
        <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Refugio No Encontrado</h2>
        <p className="text-sm text-text-light mb-8 max-w-xs">Lo sentimos, esta propiedad no está disponible o el enlace es incorrecto.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          Explorar Villas
        </button>
      </div>
    );
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev: number) => (prev + 1) % property.images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev: number) => (prev - 1 + property.images.length) % property.images.length);
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

  // Amenity icon mapper
  const getAmenityIcon = (amenity: string): string => {
    const lower = amenity.toLowerCase();
    if (lower.includes('piscina')) return 'pool';
    if (lower.includes('generador') || lower.includes('eléctric')) return 'bolt';
    if (lower.includes('wifi') || lower.includes('starlink')) return 'wifi';
    if (lower.includes('bbq') || lower.includes('parrilla')) return 'outdoor_grill';
    if (lower.includes('pet') || lower.includes('mascota')) return 'pets';
    if (lower.includes('aire') || lower.includes('acondicionado')) return 'ac_unit';
    if (lower.includes('cocina')) return 'kitchen';
    if (lower.includes('check-in') || lower.includes('lockbox')) return 'lock_open';
    if (lower.includes('cisterna') || lower.includes('agua')) return 'water_drop';
    if (lower.includes('estacionamiento')) return 'local_parking';
    if (lower.includes('tv') || lower.includes('streaming')) return 'tv';
    if (lower.includes('playa') || lower.includes('beach')) return 'beach_access';
    if (lower.includes('privacidad') || lower.includes('seguridad')) return 'security';
    return 'check_circle';
  };

  return (
    <div className="bg-[#FDFCFB] min-h-screen pb-32 relative">
      {/* Top Nav Sticky con Framer Motion */}
      <motion.div
        style={{ backgroundColor: headerBg, backdropFilter: 'blur(12px)' }}
        className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-3 pb-safe"
      >
        <motion.button
          onClick={() => navigate(-1)}
          style={{ backgroundColor: headerIconBg, color: headerIconColor }}
          className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95"
        >
          <span className="material-icons">arrow_back</span>
        </motion.button>
        <div className="flex gap-2">
          <motion.button
            onClick={handleShare}
            style={{ backgroundColor: headerIconBg, color: headerIconColor }}
            className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95"
          >
            <span className="material-icons">ios_share</span>
          </motion.button>
          <motion.button
            onClick={() => id && toggleFavorite(id)}
            style={{ backgroundColor: headerIconBg, color: isFavorite ? '#EF4444' : headerIconColor }}
            className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95"
          >
            <span className="material-icons">{isFavorite ? 'favorite' : 'favorite_border'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Hero Image Carousel - AnimatePresence */}
      <div className="relative w-full h-[55vh] rounded-b-[2.5rem] overflow-hidden bg-gray-200 shadow-sm">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SmartImage
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {property.images.length > 1 && (
          <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="pointer-events-auto bg-black/20 backdrop-blur-md hover:bg-black/40 p-2.5 rounded-full text-white transition-all transform active:scale-90 border border-white/20"
            >
              <span className="material-icons text-lg">chevron_left</span>
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto bg-black/20 backdrop-blur-md hover:bg-black/40 p-2.5 rounded-full text-white transition-all transform active:scale-90 border border-white/20"
            >
              <span className="material-icons text-lg">chevron_right</span>
            </button>
          </div>
        )}

        <div className="absolute bottom-6 right-6 bg-black/40 text-white font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg">
          <span className="material-icons text-[12px]">photo_library</span>
          <span className={TAG_STYLE}>{currentImageIndex + 1} / {property.images.length}</span>
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

        <div className="mb-6">
          <h1 className="text-[32px] font-serif font-bold text-text-main mb-2 leading-[1.1] tracking-tight">
            {property.title}
          </h1>
          <div className="flex items-center gap-1.5 text-secondary font-medium">
            <span className="material-icons text-[18px]">location_on</span>
            <span className="text-sm underline decoration-gray-300 underline-offset-4">{property.location}</span>
          </div>
        </div>

        {/* Stats Grid Boutique */}
        <div className="flex divide-x divide-gray-100 bg-white rounded-3xl p-5 mb-8 shadow-float border border-gray-50">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="font-serif font-bold text-2xl text-primary">{property.rating}</div>
            <div className="flex gap-0.5 text-orange-400 my-0.5">
              {[...Array(5)].map((_, i) => <span key={i} className="material-icons text-[12px]">star</span>)}
            </div>
            <div className={TAG_STYLE}>Valoración</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-2 relative">
            <span className="material-icons text-secondary text-[24px] mb-1">workspace_premium</span>
            <div className="font-serif font-bold text-base text-text-main leading-tight mb-0.5">Favorito</div>
            <div className={`${TAG_STYLE} text-gray-400`}>Del Viajero</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="font-serif font-bold text-2xl text-text-main">{property.reviews}</div>
            <div className="text-gray-400 mt-1">
              <span className="material-icons text-[14px]">comment</span>
            </div>
            <div className={`${TAG_STYLE} underline decoration-secondary`}>Reseñas</div>
          </div>
        </div>

        {/* High Demand Booking Banner */}
        <div className="bg-gradient-to-r from-orange-50/50 to-orange-100/50 p-4 rounded-2xl border border-orange-100 mb-8 flex items-start gap-4">
          <div className="bg-white p-2 rounded-full shadow-sm text-primary">
            <span className="material-icons text-[18px]">trending_up</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-main">Alta demanda</p>
            <p className="text-xs text-text-light mt-0.5 leading-relaxed">Varios viajeros están explorando Cabo Rojo. Asegura este espacio exclusivo antes de que se agote.</p>
          </div>
        </div>

        {/* Host Info */}
        <div className="flex items-center gap-4 p-5 bg-white rounded-[2rem] mb-8 border border-gray-50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <div className="relative">
            <SmartImage src={property.host.image} alt={property.host.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
            <span className="absolute -bottom-1 -right-1 bg-secondary text-white p-1 rounded-full border-2 border-white flex items-center justify-center">
              <span className="material-icons text-[12px]">verified</span>
            </span>
          </div>
          <div className="z-10">
            <h3 className="font-bold text-lg text-text-main">Anfitrión: {property.host.name}</h3>
            <p className={`${TAG_STYLE} text-text-light mt-1 flex items-center gap-1`}>
              <span className="material-icons text-[14px]">workspace_premium</span>
              {property.host.yearsHosting} años de exp.
            </p>
          </div>
        </div>

        {/* Micro-Location Section (Boutique map alternative) */}
        <div className="py-6 border-b border-gray-100">
          <h2 className={SECTION_TITLE_STYLE}>Ubicación Estratégica</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
              <span className="material-icons text-blue-500 rounded-full p-2 bg-white shadow-sm">beach_access</span>
              <div>
                <p className="font-bold text-sm">Playa Buyé</p>
                <p className={TAG_STYLE + " text-gray-500"}>5 MIN EN AUTO</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-2xl border border-orange-50">
              <span className="material-icons text-orange-500 rounded-full p-2 bg-white shadow-sm">restaurant</span>
              <div>
                <p className="font-bold text-sm">Poblado</p>
                <p className={TAG_STYLE + " text-gray-500"}>7 MIN EN AUTO</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="py-6 border-b border-gray-100">
          <h2 className={SECTION_TITLE_STYLE}>Sobre el Refugio</h2>
          <p className="text-text-main leading-[1.8] text-[15px] font-medium text-gray-700">
            {property.description}
          </p>
        </div>

        {/* Amenities Preview */}
        <div className="py-6 border-b border-gray-100">
          <h2 className={SECTION_TITLE_STYLE}>Amenidades Premium</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            {property.amenities.slice(0, 6).map((amenity, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="material-icons text-primary/80 text-[20px]">check</span>
                <span className="text-text-main font-medium text-[15px]">{amenity}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowAmenities(true)}
            onTouchEnd={(e) => { e.preventDefault(); setShowAmenities(true); }}
            className="mt-8 w-full border border-gray-300 text-text-main rounded-2xl py-3.5 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.98]"
          >
            Ver las {property.amenities.length} comodidades
          </button>
        </div>

        {/* Reviews Section */}
        <div className="py-8">
          <div className="flex justify-between items-end mb-6">
            <h2 className={SECTION_TITLE_STYLE + " mb-0"}>Lo que dicen</h2>
            <div className="flex gap-1.5 items-center bg-gray-50 px-2 py-1 rounded-lg">
              <span className="material-icons text-green-500 text-[14px]">verified_user</span>
              <span className={TAG_STYLE + " text-gray-500"}>Verificado</span>
            </div>
          </div>

          {/* Horizontal Scroll for reviews */}
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 no-scrollbar">
            {property.reviewsList?.map((review) => (
              <div key={review.id} className="min-w-[280px] bg-surface rounded-2xl p-5 shadow-card border border-gray-100 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <SmartImage src={review.avatar} className="w-8 h-8 rounded-full bg-gray-200" alt="Reviewer" />
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
            {(!property.reviewsList || property.reviewsList.length === 0) && (
              <div className="w-full py-8 text-center">
                <span className="material-icons text-4xl text-gray-200 mb-2">rate_review</span>
                <p className="text-sm text-text-light">Las reseñas estarán disponibles pronto.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Amenities Full Modal — Mobile Drawer / Desktop Centered Modal */}
      {showAmenities && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
          onClick={() => setShowAmenities(false)}
          onTouchEnd={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setShowAmenities(false); } }}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-text-main">Todas las Comodidades</h3>
              <button
                onClick={() => setShowAmenities(false)}
                onTouchEnd={(e) => { e.preventDefault(); setShowAmenities(false); }}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
              >
                <span className="material-icons text-sm text-gray-600">close</span>
              </button>
            </div>

            {/* Amenities List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
              <div className="space-y-3">
                {property.amenities.map((amenity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 py-3 px-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
                      <span className="material-icons text-[20px]">{getAmenityIcon(amenity)}</span>
                    </div>
                    <span className="text-text-main font-medium text-[15px] flex-1">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white pb-safe">
              <button
                onClick={() => setShowAmenities(false)}
                onTouchEnd={(e) => { e.preventDefault(); setShowAmenities(false); }}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up transform transition-all" onClick={e => e.stopPropagation()}>
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
                  <span className="material-icons text-white text-[18px]">chat</span>
                </div>
                <span className="text-sm font-bold text-gray-700">WhatsApp</span>
              </button>

              <button onClick={shareViaEmail} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                  <span className="material-icons text-[18px]">email</span>
                </div>
                <span className="text-sm font-bold text-gray-700">Email</span>
              </button>

              <button onClick={copyLink} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-colors group col-span-2">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                  <span className="material-icons text-[18px]">content_copy</span>
                </div>
                <span className="text-sm font-bold text-gray-700">Copiar enlace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Booking Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 pb-safe z-40 flex items-center justify-between shadow-2xl">
        <div>
          <p className="text-xs text-text-light font-bold uppercase tracking-tighter">Inversión por noche</p>
          <p className="text-xl font-serif font-bold text-text-main">${property.price} <span className="text-xs font-sans text-gray-400">USD</span></p>
        </div>
        <Link
          to={`/booking/${property.id}`}
          className="bg-primary text-white px-10 py-4 rounded-[2rem] font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Reservar Ahora
        </Link>
      </div>

    </div>
  );
};

export default PropertyDetails;
