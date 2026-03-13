import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import SmartImage from '../components/SmartImage';
import { HOST_PHONE } from '../constants';
import { PropertyDetailsSkeleton } from '../components/Skeleton';

// --- STYLES HELPER ---
const TAG_STYLE = "text-[10px] uppercase font-black tracking-widest";
const SECTION_TITLE_STYLE = "text-2xl font-serif text-text-main mb-6";

export const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite, refreshProperties, isLoading } = useProperty();

  const property = properties.find(p => p.id === id);
  const isFavorite = id ? favorites.includes(id) : false;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);
  const [showHostDrawer, setShowHostDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Currency conversion (Simulated for display)
  const rates = { USD: 1, EUR: 0.94, GBP: 0.79 };
  const symbols = { USD: '$', EUR: '€', GBP: '£' };
  const convertedPrice = Math.round(property ? property.price * rates[currency] : 0);

  // 1. Fetch Fresh on Mount
  useEffect(() => {
    refreshProperties();
  }, [id]);

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

  // 2. Dynamic SEO & OG Tags
  useEffect(() => {
    if (property) {
      document.title = `${property.title} · Boutique Stays`;

      const updateMeta = (name: string, content: string, isProperty = false) => {
        const attr = isProperty ? 'property' : 'name';
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      updateMeta('og:title', `${property.title} · Boutique Stays`, true);
      updateMeta('og:description', property.description.slice(0, 160), true);
      updateMeta('og:image', property.images[0], true);
      updateMeta('og:url', window.location.href, true);
      updateMeta('og:image:width', '1200', true);
      updateMeta('og:image:height', '630', true);
      updateMeta('theme-color', '#CBB28A');

      // 3. Privacy Protection (SEO/Robots)
      if (property.isOffline) {
        updateMeta('robots', 'noindex');
      } else {
        updateMeta('robots', 'index, follow');
      }
    }
  }, [property]);

  if (isLoading) return <PropertyDetailsSkeleton />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <span className="material-icons text-4xl text-gray-300">search_off</span>
        </div>
        <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Estancia No Encontrada</h2>
        <p className="text-sm text-text-light mb-8 max-w-xs">Lo sentimos, esta propiedad no está disponible en este momento.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          Explorar Collections
        </button>
      </div>
    );
  }

  // Local constant to satisfy TS that property is non-null for the rest of the component
  const p = property;

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

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const shouldReduceMotion = useReducedMotion();

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
          {/* Currency Switcher Pill */}
          <div className="hidden md:flex bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-1 self-center mr-2">
            {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${currency === curr ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'}`}
              >
                {curr}
              </button>
            ))}
          </div>
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
      <div className="relative w-full h-[60vh] md:h-[75vh] rounded-b-[3.5rem] overflow-hidden bg-gray-200 shadow-xl group/hero">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0 w-full h-full"
            initial={shouldReduceMotion ? { opacity: 0 } : { scale: 1.1, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.3 } : { duration: 0.8, ease: "circOut" }}
          >
            <SmartImage
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - High Contrast */}
        {property.images.length > 1 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl hover:bg-white/30 rounded-full text-white border border-white/20 shadow-2xl transition-all active:scale-90"
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl hover:bg-white/30 rounded-full text-white border border-white/20 shadow-2xl transition-all active:scale-90"
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        )}

        <div className="absolute bottom-8 left-8 flex gap-2">
          <div className="bg-black/40 text-white font-bold px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-2xl">
            <span className="material-icons text-xs">photo_library</span>
            <span className={TAG_STYLE}>{currentImageIndex + 1} / {property.images.length}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {/* Main Content Grid - Desktop Optimized */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:pt-12">
        <div className="lg:col-span-8 space-y-12">

          {/* Header Info */}
          <div>
            <h1 className="text-4xl md:text-6xl font-serif font-black text-text-main leading-none tracking-tighter mb-4">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-secondary font-bold">
              <span className="material-icons">location_on</span>
              <span className="text-lg underline decoration-primary/30 underline-offset-8">{property.location}</span>
            </div>
          </div>

          {/* Luxury Stats Bar */}
          <div className="grid grid-cols-4 gap-0.5 bg-white rounded-[2.5rem] overflow-hidden p-1 shadow-card border border-black/5">
            {[
              { val: property.rating, label: 'Valoración', icon: 'star', color: 'text-orange-400' },
              { val: property.guests, label: 'Huéspedes', icon: 'groups', color: 'text-text-main' },
              { val: property.bedrooms, label: 'Alcobas', icon: 'bed', color: 'text-text-main' },
              { val: property.baths, label: 'Baños', icon: 'bathtub', color: 'text-text-main' }
            ].map((stat, i) => (
              <div key={i} className={`flex flex-col items-center justify-center p-6 ${i !== 3 ? 'border-r border-black/5' : ''}`}>
                <div className="flex items-center gap-1 mb-1">
                  <span className={`material-icons text-sm ${stat.color}`}>{stat.icon}</span>
                  <span className="font-serif font-black text-2xl text-text-main">{stat.val}</span>
                </div>
                <span className={`${TAG_STYLE} text-gray-400`}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Description Section with Smooth Collapse */}
          <section className="space-y-4">
            <h2 className="text-3xl font-serif font-bold text-text-main">El Santuario</h2>
            <div className="relative">
              <p className={`text-text-main leading-relaxed text-lg transition-all duration-500 ${activeSection === 'desc' ? 'max-h-[2000px]' : 'max-h-32 overflow-hidden mask-fade'}`}>
                {property.description}
              </p>
              <button
                onClick={() => toggleSection('desc')}
                className="mt-4 text-primary font-black uppercase tracking-tighter text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                {activeSection === 'desc' ? 'Leer menos' : 'Seguir leyendo'}
                <span className="material-icons text-sm">north_east</span>
              </button>
            </div>
          </section>

          {/* Amenities Grid */}
          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-text-main">Amenidades de Élite</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {property.amenities.slice(0, 8).map((am, i) => (
                <div key={i} className="flex items-center gap-4 group p-2 hover:bg-white rounded-2xl transition-all">
                  <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-icons">{getAmenityIcon(am)}</span>
                  </div>
                  <span className="font-bold text-text-main">{am}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAmenities(true)}
              className="w-full py-4 border-2 border-black/5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all shadow-soft"
            >
              Explorar las {property.amenities.length} comodidades
            </button>
          </section>

          {/* Host Card Minimal */}
          <section
            onClick={() => setShowHostDrawer(true)}
            className="group cursor-pointer bg-white p-6 rounded-[3rem] border border-black/5 shadow-soft flex items-center justify-between transition-all hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                <SmartImage src={property.host.image} className="w-20 h-20 rounded-full object-cover shadow-2xl border-2 border-white" alt={property.host.name} />
                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-full shadow-lg">
                  <span className="material-icons">verified</span>
                </div>
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold group-hover:text-primary transition-colors">Conoce a {property.host.name}</h4>
                <p className="text-sm text-text-light font-medium mt-1">Superhost Certificado • {property.host.yearsHosting} años cuidando detalles</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-icons">arrow_forward_ios</span>
            </div>
          </section>

          {/* Reglas & Políticas */}
          <section className="space-y-6 bg-sand/20 p-8 rounded-[3.5rem] border border-orange-100">
            <h2 className="text-3xl font-serif font-bold text-text-main flex items-center gap-3">
              <span className="material-icons text-primary">gavel</span>
              Reglas y Políticas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex items-center gap-2 mb-2 text-green-600">
                  <span className="material-icons">login</span>
                  <span className={TAG_STYLE}>Check-in</span>
                </div>
                <p className="text-2xl font-serif font-black">{property.policies.checkInTime}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex items-center gap-2 mb-2 text-red-500">
                  <span className="material-icons">logout</span>
                  <span className={TAG_STYLE}>Check-out</span>
                </div>
                <p className="text-2xl font-serif font-black">{property.policies.checkOutTime}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(property.policies.houseRules || []).map((rule, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-white/40">
                  <span className="material-icons text-primary/60 text-sm">task_alt</span>
                  <span className="text-sm font-bold text-text-main italic">"{rule}"</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Desktop Sticky Widget */}
        <aside className="lg:col-span-4 space-y-6 hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <div className="bg-white p-8 rounded-[3.5rem] border border-black/10 shadow-2xl space-y-8 ring-1 ring-black/5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                    {viewers} personas viendo ahora
                  </span>
                </div>
                <p className={TAG_STYLE + " text-gray-400 mb-1"}>Inversión Preferencial</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-serif font-black text-text-main">
                    {symbols[currency]}{convertedPrice}
                  </h3>
                  <span className="text-text-light font-bold">/ noche {currency}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[#FF7F3F]">
                  <span className="material-icons text-sm">local_fire_department</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Reservado 3 veces en las últimas 48h</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 p-4 bg-sand/30 rounded-3xl border border-orange-100/50">
                  <div className="flex items-center gap-3 text-text-main">
                    <span className="material-icons text-primary">calendar_today</span>
                    <span className="font-bold text-sm">Estancia mínima: 2 noches</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-main">
                    <span className="material-icons text-primary">bolt</span>
                    <span className="font-bold text-sm">Reserva 100% inmediata</span>
                  </div>
                </div>

                <Link
                  to={`/booking/${property.id}`}
                  className="w-full bg-[#FF7F3F] text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-xl shadow-[#FF7F3F]/30 hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-white/20"
                >
                  Continuar a Reserva
                  <span className="material-icons">arrow_forward</span>
                </Link>

                <div className="bg-green-50 p-4 rounded-3xl border border-green-200/50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                    <span className="material-icons text-sm">shield</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-green-700">Mejor Tarifa Garantizada</p>
                    <p className="text-[10px] text-green-600 font-medium">Ahorras un 15% vs OTAs</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-secondary/10 rounded-[2.5rem] border border-secondary/20 flex flex-col items-center text-center space-y-3">
              <span className="material-icons text-secondary text-4xl">contact_support</span>
              <h4 className="font-serif font-bold text-lg">¿Dudas sobre tu estancia?</h4>
              <p className="text-xs text-text-light">Habla con nuestro Cerebro Ejecutivo para cerrar una oferta especial.</p>
              <button
                onClick={() => (window as any).toggleChat?.()}
                className="text-secondary font-black uppercase text-[10px] tracking-widest"
              >
                Abrir Chat Ahora
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* --- MODALS & DRAWERS --- */}

      {/* Host Profile Drawer */}
      <AnimatePresence>
        {showHostDrawer && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto no-scrollbar"
            >
              <button onClick={() => setShowHostDrawer(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <span className="material-icons text-gray-400">close</span>
              </button>

              <div className="mt-12 space-y-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <SmartImage src={property.host.image} className="w-40 h-40 rounded-[3rem] object-cover shadow-2xl" alt={property.host.name} />
                    <div className="absolute -bottom-2 -right-2 bg-secondary text-white p-3 rounded-full shadow-2xl border-4 border-white">
                      <span className="material-icons">verified_user</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-serif font-black">{property.host.name}</h2>
                    <p className="text-secondary font-black uppercase tracking-widest text-[11px] mt-1">Anfitrión de Élite Villa Retiro</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sand p-6 rounded-[2rem] text-center">
                    <p className="text-2xl font-serif font-black">{property.host.yearsHosting}</p>
                    <p className={TAG_STYLE + " text-text-light"}>Años Hospedando</p>
                  </div>
                  <div className="bg-sand p-6 rounded-[2rem] text-center">
                    <p className="text-2xl font-serif font-black">100%</p>
                    <p className={TAG_STYLE + " text-text-light"}>Tasa de Respuesta</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif font-bold text-xl">Acerca del Anfitrión</h3>
                  <p className="text-text-light leading-relaxed">
                    Como anfitrión de Villa Retiro y Villa Pirata, mi objetivo es que vivas una experiencia auténtica de lujo en el suroeste de Puerto Rico. Cada detalle de las villas ha sido curado para tu máximo confort.
                  </p>
                </div>

                <div className="space-y-4 pt-8 border-t border-black/5">
                  <button onClick={() => window.open(`tel:${HOST_PHONE}`)} className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                    <span className="material-icons">phone</span>
                    Llamada Directa
                  </button>
                  <button onClick={() => window.open(`https://wa.me/${HOST_PHONE}`)} className="w-full bg-white border-2 border-green-100 text-green-700 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                    <span className="material-icons">chat</span>
                    WhatsApp Business
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Amenities Full Modal */}
      {
        showAmenities && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center animate-fade-in"
            style={{ zIndex: 9999 }}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setShowAmenities(false); }}
          >
            <div
              className="bg-white w-full sm:max-w-2xl sm:rounded-[3rem] rounded-t-[3rem] h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up"
              onPointerDown={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-8 py-8 border-b border-black/5 sticky top-0 bg-white z-10">
                <h3 className="text-2xl font-serif font-bold text-text-main">Catálogo de Amenidades</h3>
                <button
                  onClick={() => setShowAmenities(false)}
                  className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-5 p-5 rounded-[2rem] bg-sand/30 border border-orange-50/50">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-soft">
                        <span className="material-icons text-2xl">{getAmenityIcon(amenity)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-text-main">{amenity}</span>
                        <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Incluido</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-white border-t border-black/5 pb-safe">
                <button
                  onClick={() => setShowAmenities(false)}
                  className="w-full bg-black text-white font-black uppercase tracking-widest py-6 rounded-[2.5rem] shadow-xl active:scale-95 transition-all text-xs"
                >
                  Cerrar Catálogo
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Mobile Bottom Bar - High Contrast Glass */}
      <div className="fixed bottom-6 left-6 right-6 lg:hidden z-[60] flex items-center justify-between p-5 bg-black rounded-[2.5rem] shadow-2xl border border-white/20 animate-fade-in-up shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="pl-4">
          <p className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-none mb-1">Inversión Noche</p>
          <div className="flex items-baseline gap-1 text-white">
            <span className="text-2xl font-serif font-black">{symbols[currency]}{convertedPrice}</span>
            <span className="text-[10px] font-black text-[#FF7F3F] uppercase">{currency}</span>
          </div>
        </div>
        <Link
          to={`/booking/${property.id}`}
          className="bg-[#FF7F3F] text-white h-14 px-10 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center shadow-lg shadow-[#FF7F3F]/40 hover:scale-[1.05] active:scale-95 transition-all border border-white/10"
        >
          Apartar Fecha
        </Link>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 animate-fade-in"
            onPointerDown={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative"
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-2xl font-serif font-black text-text-main">Compartir</h3>
                  <p className={TAG_STYLE + " text-primary mt-1"}>Invita a tus amigos</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center gap-6 p-6 rounded-[2rem] bg-green-50/50 border border-green-100 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-green-600 shadow-soft group-hover:scale-110 transition-transform">
                    <span className="material-icons text-3xl">chat</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-text-main">WhatsApp</p>
                    <p className="text-xs text-text-light">Enviar a chat directo</p>
                  </div>
                </button>

                <button
                  onClick={shareViaEmail}
                  className="flex items-center gap-6 p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-soft group-hover:scale-110 transition-transform">
                    <span className="material-icons text-3xl">mail</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-text-main">Email</p>
                    <p className="text-xs text-text-light">Compartir por correo</p>
                  </div>
                </button>

                <button
                  onClick={copyLink}
                  className="flex items-center gap-6 p-6 rounded-[2rem] bg-sand border border-orange-100 hover:bg-orange-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                    <span className="material-icons text-3xl">content_copy</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-text-main">Copiar Enlace</p>
                    <p className="text-xs text-text-light">Copiar a portapapeles</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyDetails;
