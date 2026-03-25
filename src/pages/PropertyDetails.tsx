import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import SmartImage from '../components/SmartImage';
import { HOST_PHONE } from '../constants';
import { PropertyDetailsSkeleton } from '../components/Skeleton';

import { 
  Users, 
  Bed, 
  Bath, 
  Star, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Heart, 
  ShieldCheck, 
  Zap, 
  Droplets,
  Calendar,
  ArrowLeft,
  Info,
  CheckCircle2,
  Phone,
  MessageSquare,
  X,
  Compass,
  Award,
  LogOut,
  LogIn,
  Gavel,
  Shield,
  FireExtinguisher,
  Coffee,
  Microwave,
  Fan,
  Tv,
  Wifi,
  Wind,
  Waves,
  Utensils,
  Car,
  GlassWater,
  CigaretteOff
} from 'lucide-react';

import SectionErrorBoundary from '../components/SectionErrorBoundary';

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
  const [translatedReviews, setTranslatedReviews] = useState<Record<number, boolean>>({});

  const toggleTranslation = (index: number) => {
    setTranslatedReviews(prev => ({ ...prev, [index]: !prev[index] }));
  };
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Currency conversion (Simulated for display)
  const rates = { USD: 1, EUR: 0.94, GBP: 0.79 };
  const symbols = { USD: '$', EUR: '€', GBP: '£' };
  const convertedPrice = Math.round(property ? property.price * rates[currency] : 0);

  // 🏛️ DYNAMIC THEMING: Adapt accent colors to property identity
  const brandColor = property?.title.includes('Pirata') ? '#004E64' : '#FF6B35';
  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty('--primary', brandColor);
    }
    return () => { document.documentElement.style.removeProperty('--primary'); };
  }, [brandColor]);

  // 1. Fetch Fresh on Mount
  useEffect(() => {
    refreshProperties();
  }, [id]);

  // 0. Hooks safety priority
  const shouldReduceMotion = useReducedMotion();
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
      updateMeta('og:description', (property.description || '').slice(0, 160), true);
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

  // 2. Performance: Only show skeleton if we don't have this property in memory yet
  if (isLoading && !property) return <PropertyDetailsSkeleton />;


  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
          <ChevronRight size={40} />
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

  // 🛡️ Safety Stack Detection
  const hasSolar = (property.amenities || []).some(am => am.toLowerCase().includes('solar') || am.toLowerCase().includes('generador'));
  const hasCistern = (property.amenities || []).some(am => am.toLowerCase().includes('cisterna') || am.toLowerCase().includes('agua'));

  // Local constant to satisfy TS
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

  // Adaptive Amenity Icon Mapper
  const getAmenityIcon = (amenity: string): React.ReactNode => {
    const lower = amenity.toLowerCase();
    const size = 20;
    const color = "currentColor";

    if (lower.includes('piscina')) return <Waves size={size} className={color} />;
    if (lower.includes('solar') || lower.includes('generador')) return <Zap size={size} className={color} />;
    if (lower.includes('cisterna') || lower.includes('agua')) return <GlassWater size={size} className={color} />;
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi size={size} className={color} />;
    if (lower.includes('aire') || lower.includes('ac') || lower.includes('acondicionado')) return <Wind size={size} className={color} />;
    if (lower.includes('cocina') || lower.includes('estufa') || lower.includes('horno')) return <Utensils size={size} className={color} />;
    if (lower.includes('cafetera') || lower.includes('keurig')) return <Coffee size={size} className={color} />;
    if (lower.includes('microondas')) return <Microwave size={size} className={color} />;
    if (lower.includes('tv') || lower.includes('netflix') || lower.includes('streaming')) return <Tv size={size} className={color} />;
    if (lower.includes('parking') || lower.includes('estacionamiento')) return <Car size={size} className={color} />;
    if (lower.includes('bbq') || lower.includes('parrilla')) return <FireExtinguisher size={size} className={color} />;
    if (lower.includes('seguridad') || lower.includes('cámara')) return <ShieldCheck size={size} className={color} />;
    if (lower.includes('fumar')) return <CigaretteOff size={size} className={color} />;
    
    return <CheckCircle2 size={size} className={color} />;
  };

  // Amenity Categorization Logic
  const categorizeAmenities = (amenities: string[]) => {
    const categories: Record<string, string[]> = {
      'Suministros Críticos': [],
      'Cocina y Comedor': [],
      'Entretenimiento': [],
      'Exterior y Relax': [],
      'Seguridad y Otros': []
    };

    amenities.forEach(am => {
      const lower = am.toLowerCase();
      if (lower.includes('solar') || lower.includes('generador') || lower.includes('cisterna') || lower.includes('agua')) {
        categories['Suministros Críticos'].push(am);
      } else if (lower.includes('cocina') || lower.includes('cafetera') || lower.includes('microondas') || lower.includes('tostadora') || lower.includes('horno') || lower.includes('estufa')) {
        categories['Cocina y Comedor'].push(am);
      } else if (lower.includes('tv') || lower.includes('wifi') || lower.includes('internet') || lower.includes('streaming') || lower.includes('dvd')) {
        categories['Entretenimiento'].push(am);
      } else if (lower.includes('piscina') || lower.includes('bbq') || lower.includes('balcón') || lower.includes('terraza') || lower.includes('parking')) {
        categories['Exterior y Relax'].push(am);
      } else {
        categories['Seguridad y Otros'].push(am);
      }
    });

    return Object.entries(categories).filter(([_, items]) => items.length > 0);
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <SectionErrorBoundary sectionName="Detalles de Estancia">
    <div className="bg-[#FDFCFB] min-h-screen pb-32 relative">
      {/* Top Nav Sticky con Framer Motion */}
      <motion.div
        style={{ backgroundColor: headerBg, backdropFilter: 'blur(12px)' }}
        className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-3 pb-safe"
      >
        <motion.button
          onClick={() => navigate(-1)}
          style={{ backgroundColor: headerIconBg, color: headerIconColor }}
          className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
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
            className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95 flex items-center justify-center"
          >
            <Share2 size={20} />
          </motion.button>
          <motion.button
            onClick={() => id && toggleFavorite(id)}
            style={{ backgroundColor: headerIconBg, color: isFavorite ? '#EF4444' : headerIconColor }}
            className="p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-95 flex items-center justify-center"
          >
            <Heart size={20} fill={isFavorite ? '#EF4444' : 'none'} />
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
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl hover:bg-white/30 rounded-full text-white border border-white/20 shadow-2xl transition-all active:scale-90"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        <div className="absolute bottom-8 left-8 flex gap-2">
          <div className="bg-black/40 text-white font-bold px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-2xl">
            <Compass size={14} />
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
            <div className="flex items-center gap-2 text-[#BBA27E] font-black uppercase tracking-[0.2em] text-xs">
              <MapPin size={18} className="text-[#BBA27E]" />
              <span className="underline underline-offset-8 decoration-[#BBA27E]/30">{property.location}</span>
            </div>
          </div>

          {/* Luxury Stats Bar */}
          <div className="grid grid-cols-4 gap-0.5 bg-white rounded-[2.5rem] overflow-hidden p-1 shadow-card border border-black/5">
            {[
              { val: property.rating, label: 'Valoración', icon: Star, color: 'text-orange-400' },
              { val: property.guests, label: 'Huéspedes', icon: Users, color: 'text-text-main' },
              { val: property.bedrooms, label: 'Alcobas', icon: Bed, color: 'text-text-main' },
              { val: property.baths, label: 'Baños', icon: Bath, color: 'text-text-main' }
            ].map((stat, i) => (
              <div key={i} className={`flex flex-col items-center justify-center p-6 ${i !== 3 ? 'border-r border-black/5' : ''}`}>
                <div className="flex items-center gap-1 mb-1">
                  <stat.icon size={16} className={stat.color} />
                  <span className="font-serif font-black text-2xl text-text-main">{stat.val}</span>
                </div>
                <span className={`${TAG_STYLE} text-gray-400`}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* 🛡️ Strategic Safety Stacks (Sage Green) */}
          {(hasSolar || hasCistern) && (
            <div className="flex flex-wrap gap-3 mb-8">
              {hasSolar && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#E1EAD1] text-[#4A5D23] rounded-full border border-[#D0DCB8] shadow-sm animate-fade-in">
                  <Zap size={14} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Energía 24/7 (Solar/Gen)</span>
                </div>
              )}
              {hasCistern && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#E1EAD1] text-[#4A5D23] rounded-full border border-[#D0DCB8] shadow-sm animate-fade-in animation-delay-500">
                  <Droplets size={14} className="animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reserva de Agua Garantizada</span>
                </div>
              )}
            </div>
          )}

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
                <ChevronRight size={14} className={activeSection === 'desc' ? '-rotate-90' : 'rotate-90'} />
              </button>
            </div>
          </section>

          {/* Amenities Grid */}
          <section className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-serif font-bold text-text-main">Amenidades de Élite</h2>
              <button
                onClick={() => setShowAmenities(true)}
                className="text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-primary/20 pb-1"
              >
                Ver todas ({(property.amenities || []).length})
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(property.amenities || []).slice(0, 8).map((am, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-6 bg-white rounded-[2rem] border border-black/5 shadow-soft group hover:border-primary/20 hover:translate-y-[-4px] transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-sand flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                    {getAmenityIcon(am)}
                  </div>
                  <span className="text-[10px] font-bold text-text-main text-center uppercase tracking-tight">{am}</span>
                </div>
              ))}
            </div>
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
                  <ShieldCheck size={14} />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold group-hover:text-primary transition-colors">Conoce a {property.host.name}</h4>
                <p className="text-sm text-text-light font-medium mt-1">Superhost Certificado • {property.host.yearsHosting} años cuidando detalles</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <ChevronRight size={20} />
            </div>
          </section>

          {/* Reglas & Políticas */}
          <section className="space-y-6 bg-sand/20 p-8 rounded-[3.5rem] border border-orange-100">
            <h2 className="text-3xl font-serif font-bold text-text-main flex items-center gap-3">
              <Gavel size={32} className="text-primary" />
              Reglas y Políticas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex items-center gap-2 mb-2 text-green-600">
                  <LogIn size={14} />
                  <span className={TAG_STYLE}>Check-in</span>
                </div>
                <p className="text-2xl font-serif font-black">{property.policies.checkInTime}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                <div className="flex items-center gap-2 mb-2 text-red-500">
                  <LogOut size={14} />
                  <span className={TAG_STYLE}>Check-out</span>
                </div>
                <p className="text-2xl font-serif font-black">{property.policies.checkOutTime}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(property.policies.houseRules || []).map((rule, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-white/40">
                  <CheckCircle2 size={16} className="text-primary/60" />
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
                    {p.availability_urgency_msg || `${viewers} personas viendo esta villa`}
                  </span>
                </div>
                <p className={TAG_STYLE + " text-gray-400 mb-1"}>Inversión Preferencial</p>
                <span className="material-icons text-white text-sm">pool</span>
                <span className="text-[10px] font-black uppercase text-white/90">
                  {(property.amenities || []).length} amenidades exclusivas
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-serif font-black text-text-main">
                    {symbols[currency]}{convertedPrice}
                  </h3>
                  <span className="text-text-light font-bold">/ noche {currency}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[#BBA27E]">
                  <Zap size={14} className="fill-[#BBA27E]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reserva instantánea preferida por VRR</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 p-4 bg-white/50 rounded-3xl border border-[#BBA27E]/10">
                  <div className="flex items-center gap-3 text-text-main">
                    <Calendar size={18} className="text-primary" />
                    <span className="font-bold text-sm">Estancia mínima: 2 noches</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-main">
                    <Zap size={18} className="text-primary" />
                    <span className="font-bold text-sm">Reserva 100% inmediata</span>
                  </div>
                </div>

                <Link
                  to={`/booking/${property.id}`}
                  className="w-full bg-[#1a1a1a] text-[#BBA27E] py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border border-[#BBA27E]/20"
                >
                  Vivir la Experiencia
                  <Compass size={20} />
                </Link>

                <div className="bg-green-50 p-4 rounded-3xl border border-green-200/50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-green-700">Mejor Tarifa Garantizada</p>
                    <p className="text-[10px] text-green-600 font-medium">Ahorras un 15% vs OTAs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secure Map Widget */}
            <div className="bg-white p-6 rounded-[3rem] border border-black/5 shadow-soft space-y-4">
              <h4 className={TAG_STYLE + " text-[#BBA27E] opacity-70"}>Ubicación Estratégica</h4>
              <div 
                className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer shadow-inner border border-black/5" 
                onClick={() => window.open(p.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${p.exact_lat_long || p.location}`, '_blank')}
              >
                <img 
                  src={p.general_area_map_url || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt="Mapa del área general" 
                />
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
                    <Compass size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Explorar Zona</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-light italic leading-relaxed">
                Ubicación general aproximada. Por seguridad, la dirección exacta y coordenadas se revelan tras confirmar la reserva.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* --- REVIEWS CAROUSEL --- */}
      {(p.reviews_list && p.reviews_list.length > 0) && (
        <section className="max-w-7xl mx-auto px-6 mt-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-serif font-bold text-text-main">Voz del Huésped</h2>
            <div className="flex-1 h-px bg-black/5"></div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar -mx-6 px-6">
            {p.reviews_list.map((rev, i) => (
              <div key={i} className="min-w-[320px] md:min-w-[400px] bg-white p-8 rounded-[3rem] shadow-soft border border-black/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-orange-400 mb-4">
                    {Array(5).fill(0).map((_, j) => (
                      <Star key={j} size={14} fill={j < rev.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <p className="text-lg text-text-main font-serif italic leading-relaxed mb-4">
                    "{translatedReviews[i] ? `[TRADUCIDO POR SALTY]: ${rev.text}` : rev.text}"
                  </p>
                  <button 
                    onClick={() => toggleTranslation(i)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BBA27E] mb-6 flex items-center gap-2 hover:opacity-70 transition-opacity"
                  >
                    <span className="material-icons text-[14px]">translate</span>
                    {translatedReviews[i] ? 'Ver Original' : 'Salty: Traducir al Español'}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center font-black text-[#BBA27E] text-xs">
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1a1a1a]">{rev.author}</p>
                      <p className="text-[10px] text-[#BBA27E] font-black uppercase tracking-[0.2em]">{rev.date}</p>
                    </div>
                  </div>
                  {getSourceLabel(rev.source)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- CROSS-SELLING (OTHER VILLAS) --- */}
      <section className="max-w-7xl mx-auto px-6 mt-32 mb-20">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <p className={TAG_STYLE + " text-primary"}>¿Buscas algo diferente?</p>
          <h2 className="text-4xl font-serif font-black text-text-main">Otras Colecciones de Élite</h2>
          <div className="w-20 h-1.5 bg-primary/20 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {properties
            .filter(prop => prop.id !== id)
            .map((other, i) => (
              <Link 
                key={other.id}
                to={`/property/${other.id}`}
                className="group relative h-[400px] rounded-[3.5rem] overflow-hidden shadow-2xl transition-all hover:-translate-y-2"
              >
                <img src={other.images[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={other.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                  <div>
                    <h3 className="text-3xl font-serif font-black text-white leading-tight">{other.title}</h3>
                    <p className="text-white/60 text-sm font-medium mt-2">{other.subtitle}</p>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <Star size={12} className="text-orange-400 fill-orange-400" />
                        <span className="text-[10px] font-black text-white">{other.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <Users size={12} className="text-white" />
                        <span className="text-[10px] font-black text-white">{other.guests} Guests</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black group-hover:bg-primary group-hover:text-white transition-all shadow-2xl">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

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
                <X size={24} className="text-gray-400" />
              </button>

              <div className="mt-12 space-y-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <SmartImage src={property.host.image} className="w-40 h-40 rounded-[3rem] object-cover shadow-2xl" alt={property.host.name} />
                    <div className="absolute -bottom-2 -right-2 bg-secondary text-white p-3 rounded-full shadow-2xl border-4 border-white">
                      <ShieldCheck size={20} />
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
                    <Phone size={14} />
                    Llamada Directa
                  </button>
                  <button onClick={() => window.open(`https://wa.me/${HOST_PHONE}`)} className="w-full bg-white border-2 border-green-100 text-green-700 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                    <MessageSquare size={14} />
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
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar space-y-12">
                {categorizeAmenities(property.amenities || []).map(([category, items]) => (
                  <div key={category} className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/5 w-fit px-4 py-1.5 rounded-full border border-primary/10">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((amenity, i) => (
                        <div key={i} className="flex items-center gap-5 p-5 rounded-[2rem] bg-sand/30 border border-orange-50/50 group hover:bg-white transition-all">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                            {getAmenityIcon(amenity)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-text-main">{amenity}</span>
                            <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Incluido ✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
          Vivir la Experiencia
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
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center gap-6 p-6 rounded-[2rem] bg-green-50/50 border border-green-100 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-green-600 shadow-soft group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
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
                    <Share2 size={24} />
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
                    <Compass size={24} />
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
    </SectionErrorBoundary>
  );
};

export default PropertyDetails;
