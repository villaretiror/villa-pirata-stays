import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import ReviewCarousel from '../components/ReviewCarousel';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { PropertyCardSkeleton } from '../components/Skeleton';
import BookingCalendar from '../components/BookingCalendar';
import { 
  X, 
  Search, 
  LayoutGrid, 
  Droplets, 
  Palmtree, 
  Plus, 
  Minus, 
  Bell, 
  Sliders, 
  Utensils, 
  MapPin, 
  Home as HomeIcon, 
  Phone, 
  Mail,
  ChevronRight,
  CheckCircle2,
  Star,
  Map as MapIcon,
  BellOff
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MapModal from '../components/MapModal';
import StickyBookingBar from '../components/StickyBookingBar';
import { LocalGuideItem } from '../types';

type Category = 'todo' | 'piscina' | 'playa' | 'mascotas';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { properties, bookings, favorites, isLoading, toggleFavorite, siteContent, localGuideData } = useProperty();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTab, setSearchTab] = useState<'dates'|'guests'>('dates');

  // Advanced Guest State
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('todo');

  const [activeGuideTab, setActiveGuideTab] = useState<string | null>(null);
  const [selectedGuideItem, setSelectedGuideItem] = useState<LocalGuideItem | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    setIsSearchOpen(false);
    scrollToResults();
  };

  const scrollToResults = () => {
    if (resultsRef.current) {
      const yOffset = -120; // Offset for sticky header
      const element = resultsRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (cat: Category) => {
    setActiveCategory(cat);
    // Give a tiny delay so the state updates and feels like a new "search"
    setTimeout(scrollToResults, 100);
  };

  console.log("FILTRO ACTIVO:", { adults, children, pets, activeCategory, propertiesCount: properties.length });

  // 🚀 PERFORMANCE: Memoize filtered results to prevent UI jank during category switches
  const filteredProperties = React.useMemo(() => {
    return properties.filter(property => {
      if (property.isOffline) return false;
      const totalHumans = adults + children;
      const capacity = Number(property.guests) || 1;
      if (capacity < totalHumans) return false;

      // 🛡️ AVAILABILITY SHIELD: Filter by dates if selected
      if (startDate && endDate) {
        const sStr = startDate.toISOString().split('T')[0];
        const eStr = endDate.toISOString().split('T')[0];
        
        // 1. Check against Bookings Table (Direct + iCal)
        const hasConflict = bookings.some(b => 
          b.property_id === String(property.id) &&
          ((sStr >= b.check_in && sStr < b.check_out) ||
           (eStr > b.check_in && eStr <= b.check_out) ||
           (sStr <= b.check_in && eStr >= b.check_out))
        );
        if (hasConflict) return false;

        // 2. Check against Manual Blocks
        const mBlocks = property.blockedDates || [];
        const isBlockedManually = mBlocks.some(d => d >= sStr && d < eStr);
        if (isBlockedManually) return false;
      }

      if (pets > 0) {
        const hText = (property.amenities || []).join(" ").toLowerCase();
        if (!hText.includes("pet") && !hText.includes("mascota")) return false;
      }

      if (activeCategory === "todo") return true;
      const aText = (property.amenities || []).join(" ").toLowerCase();
      const dText = (property.description || "").toLowerCase();

      if (activeCategory === "piscina") return aText.includes("piscina") || dText.includes("piscina");
      if (activeCategory === "playa") return dText.includes("playa") || dText.includes("mar") || dText.includes("beach");
      if (activeCategory === "mascotas") return aText.includes("pet") || aText.includes("mascota");

      return true;
    });
  }, [properties, bookings, adults, children, pets, activeCategory, startDate, endDate]);

  // Combined Blocks for the Global Search Calendar (Dates where ALL villas are occupied)
  const globalBlockedDates = React.useMemo(() => {
    if (properties.length === 0) return [];
    
    // 🔱 ELITE LOGIC (Patched): Merge manual dates + actual active bookings for EACH property.
    const allBlockedSets = properties.map(property => {
      // 1. Manual blocks
      const blocked = new Set<string>((property.blockeddates as string[]) || []);
      
      // 2. Verified Active Bookings
      const propBookings = bookings.filter(b => b.property_id === String(property.id));
      propBookings.forEach(b => {
         let current = new Date(b.check_in + 'T12:00:00');
         const out = new Date(b.check_out + 'T12:00:00');
         while (current < out) {
            blocked.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
         }
      });
      return blocked;
    });

    // If a guest searches globally, we ONLY block a date visually on Home if EVERY property is rented/blocked on that date.
    const commonBlocks = allBlockedSets.length > 0 
      ? [...allBlockedSets[0]].filter(date => 
          allBlockedSets.every((set: Set<string>) => set.has(date))
        )
      : [];

    return commonBlocks.map(d => new Date(d + 'T12:00:00')); // T12 to avoid timezone shifts
  }, [properties, bookings]);

  // 🛡️ RANGE VALIDATOR: Prevent users from crossing over fully booked dates
  const isRangeAvailable = (start: Date, end: Date) => {
    let current = new Date(start);
    while (current <= end) {
      if (globalBlockedDates.some(bd => 
        bd.getFullYear() === current.getFullYear() &&
        bd.getMonth() === current.getMonth() &&
        bd.getDate() === current.getDate()
      )) {
        return false;
      }
      current.setDate(current.getDate() + 1);
    }
    return true;
  };

  const getSectionTitle = () => {
    if (pets > 0) return 'Alojamientos Pet Friendly';
    switch (activeCategory) {
      case 'piscina': return 'Oasis con Piscina Privada';
      case 'playa': return 'The Soul of Cabo Rojo';
      case 'mascotas': return 'Pet Friendly Boutique Collection';
      default: return 'Designer Villas - Exclusive Stays';
    }
  };

  const getGuestSummary = () => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} ${adults > 1 ? 'Adultos' : 'Adulto'}`);
    if (children > 0) parts.push(`${children} ${children > 1 ? 'Niños' : 'Niño'}`);
    if (pets > 0) parts.push(`${pets} 🐾`);
    return parts.join(', ');
  };

  const categories: { id: Category; label: string; icon: any }[] = [
    { id: 'todo', label: 'Signature Villas', icon: LayoutGrid },
    { id: 'piscina', label: 'Pool & Oasis', icon: Droplets },
    { id: 'playa', label: 'Tropical Gems', icon: Palmtree },
  ];

  // Helper Component for the Search Modal
  const CounterRow = ({ label, sub, val, setVal, min = 0 }: any) => (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-bold text-text-main text-base">{label}</p>
        <p className="text-xs text-text-light font-medium uppercase tracking-wide opacity-80">{sub}</p>
      </div>
      <div className="flex items-center gap-4 bg-gray-50 rounded-full p-1 shadow-inner">
        <button
          onClick={() => setVal(Math.max(min, val - 1))}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${val <= min ? 'text-gray-300 opacity-50' : 'bg-white text-text-main shadow-sm hover:scale-105 active:scale-95'}`}
          disabled={val <= min}
        >
          <Minus size={14} />
        </button>
        <span className="font-bold text-lg w-5 text-center select-none">{val}</span>
        <button
          onClick={() => setVal(Math.min(10, val + 1))} // Cap at 10 for safety
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-primary shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 relative bg-sand overflow-hidden scroll-smooth">

      {/* Background Mesh Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob"></div>
        <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-secondary/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-accent/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-sand/90 backdrop-blur-xl flex items-start justify-center pt-24 pb-12 px-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-sm md:max-w-4xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-slide-up relative bg-white border border-white/50 my-auto">

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold font-serif text-text-main">Tu viaje</h2>
              <button onClick={() => setIsSearchOpen(false)} className="p-3 -mr-3 rounded-full bg-gray-50 hover:bg-gray-100 transition-all active:scale-90 shadow-sm">
                <X size={24} className="text-secondary" />
              </button>
            </div>

            <div className="mb-4 pr-2">
              <div className="flex bg-sand/60 p-1 rounded-2xl mb-6">
                <button 
                   onClick={() => setSearchTab('dates')} 
                   className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${searchTab === 'dates' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   1. Fechas
                </button>
                <button 
                   onClick={() => setSearchTab('guests')} 
                   className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${searchTab === 'guests' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   2. Huéspedes
                </button>
              </div>

              {searchTab === 'dates' ? (
                  <div className="mb-6 animate-fade-in">
                    <BookingCalendar 
                      startDate={startDate} 
                      endDate={endDate} 
                      onChange={(update) => {
                        const [start, end] = update;
                        setStartDate(start);
                        setEndDate(end);
                        if (start && end) {
                            setTimeout(() => setSearchTab('guests'), 400); // Auto-jump
                        }
                      }} 
                      blockedDates={globalBlockedDates} 
                      isRangeAvailable={isRangeAvailable}
                    />
                  </div>
              ) : (
                  <div className="p-5 bg-sand/60 rounded-[2rem] border border-primary/10 mb-6 animate-fade-in">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-text-light mb-4 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                       Tripulación
                    </h3>
                    <CounterRow label="Exploradores Adultos" sub="Edad 13+" val={adults} setVal={setAdults} min={1} />
                    <CounterRow label="Pequeños Capitanes" sub="Edad 2 - 12" val={children} setVal={setChildren} min={0} />
                    <CounterRow label="Mascotas" sub="Patas bienvenidas 🐾" val={pets} setVal={setPets} min={0} />
                  </div>
              )}
            </div>

            <div className="mb-6 min-h-[65px] flex items-center justify-center text-center px-6 bg-sand/80 rounded-3xl border border-primary/10">
              <AnimatePresence mode="wait">
                <motion.p
                   key={`${adults}-${children}-${pets}-${startDate?.getTime()}`}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="text-[11px] font-bold text-secondary italic leading-relaxed"
                >
                  {(() => {
                    if (pets > 0 && adults + children > 4) return "🌟 Salty: \"Villa Retiro R tiene el espacio seguro que sus patitas necesitan para grupos grandes. 🛡️\"";
                    if (children > 0) return "🌟 Salty: \"Nuestras villas cuentan con áreas seguras para que los más pequeños exploren con libertad. ✨\"";
                    return "🌟 Salty: \"Cabo Rojo le espera con su mejor gala. ¿Zarpamos?\"";
                  })()}
                </motion.p>
              </AnimatePresence>
            </div>

            <button 
          onClick={handleSearch}
          className="w-full bg-secondary text-primary font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border border-primary/20"
        >
          <Search size={16} className="group-hover:scale-110 transition-transform" />
          Ver Disponibilidad
        </button>
          </div>
        </div>
      )}

      {/* Header Content */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        <div className="flex justify-between items-end mb-1">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif italic font-black text-secondary leading-tight tracking-tighter">
              Villa Retiro R
            </h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mt-1">Cabo Rojo · Puerto Rico</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-card flex items-center justify-center border border-white/50 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all group overflow-hidden relative">
            <Bell size={24} className="text-secondary group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <p className="text-primary/60 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500">
          Salty · Concierge Oficial VRR 🌟
        </p>
      </div>

      <div
        onClick={() => setIsSearchOpen(true)}
        className="glass rounded-2xl p-2 flex items-center shadow-glass cursor-pointer hover:bg-white/80 transition-all group border border-white/60 bg-gradient-to-r from-white/40 to-white/10 mx-6"
      >
        <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
          <Search size={20} />
        </div>
        <div className="flex-1 px-4">
          <p className="font-bold text-text-main text-sm">
            {startDate ? `${format(startDate, 'dd MMM', { locale: es })} - ${endDate ? format(endDate, 'dd MMM', { locale: es }) : '...'}` : 'Cabo Rojo, PR'}
          </p>
          <p className="text-xs text-text-light">{getGuestSummary()}</p>
        </div>
        <div className="bg-gray-100 p-2 rounded-xl text-gray-400 group-hover:text-primary transition-colors">
          <Sliders size={20} />
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-3 mt-8 overflow-x-auto no-scrollbar pb-2 relative z-10 px-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-full border whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeCategory === cat.id
              ? 'bg-secondary text-primary border-primary/30 shadow-2xl scale-105'
              : 'bg-white/80 backdrop-blur-sm border-white/50 text-text-light shadow-soft hover:bg-white hover:text-secondary hover:-translate-y-0.5'
              }`}
          >
            <cat.icon size={14} />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="relative z-10 rounded-t-[2.5rem] bg-white/60 backdrop-blur-md border-t border-white/40 min-h-screen px-6 pt-10 pb-32">
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 text-center md:text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 opacity-80">Explora con Salty</p>
              <h2 className="font-serif font-bold text-4xl text-text-main leading-[1.1] tracking-tight">Sabor Local & <span className="text-secondary italic font-medium">Invasión de Sentidos.</span></h2>
            </div>
            
            <div className="flex gap-2 p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-[2rem] border border-white/50 w-fit mx-auto md:mx-0 shadow-inner">
              {[
                { id: 'beaches', label: 'Playas', icon: Palmtree },
                { id: 'gastronomy', label: 'Comer', icon: Utensils },
                { id: 'nearby', label: 'Guía', icon: MapPin }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGuideTab(activeGuideTab === tab.id ? null : tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500 shadow-sm ${
                    activeGuideTab === tab.id 
                    ? 'bg-primary text-white scale-105 shadow-primary/20' 
                    : 'bg-white text-text-light hover:text-primary'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeGuideTab && (
            <motion.div
              key={activeGuideTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-20"
            >
              <div id={`section-${activeGuideTab}`} className="scroll-mt-32">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Cabo Rojo Suroeste</p>
                      <h2 className="font-serif font-bold text-3xl text-text-main">Destinos Recomendados</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localGuideData.find(g => g.id === activeGuideTab)?.items.map((item, i) => (
                      <GuideCard 
                        key={i} 
                        item={item} 
                        onAskSalty={(name) => navigate('/messages', { state: { initialPlace: name } })} 
                        onMapClick={(guideItem) => {
                          setSelectedGuideItem(guideItem);
                          setIsMapModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listings Header */}
        <div id="property-grid" ref={resultsRef} className="flex justify-between items-center mb-6 scroll-mt-32">
          <h3 className="font-serif font-bold text-xl text-text-main">
            {getSectionTitle()}
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {filteredProperties.length}
          </span>
        </div>

        {/* Listings Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1
              }
            }
          }}
        >
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : filteredProperties.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    show: { opacity: 1, y: 0 },
                    exit: { opacity: 0, scale: 0.9 }
                  }}
                >
                  <PropertyCard
                    property={property}
                    index={index}
                    onClick={(id) => navigate(`/property/${id}`, { 
                      state: { startDate, endDate, adults, children, pets } 
                    })}
                    isFavorite={favorites.includes(property.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            /* 🐆 LUXURY EMPTY STATE */
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-10 text-center bg-white/40 border border-white/50 rounded-[3rem] backdrop-blur-md">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary shadow-inner border border-primary/20">
                 <Search size={48} className="animate-pulse" />
              </div>
              <p className="text-secondary font-serif italic text-2xl font-bold mb-2">No encontramos coincidencias hoy</p>
              <p className="text-sm text-text-light mb-8 max-w-[300px] leading-relaxed">
                Sin embargo, Salty sugiere que pruebes con menos personas o cambies de categoría para ver nuestros tesoros disponibles.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                 <button
                   onClick={() => { setAdults(1); setChildren(0); setPets(0); setActiveCategory('todo'); }}
                   className="w-full bg-secondary text-primary font-black py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest border border-primary/20"
                 >
                   Zarpar de Nuevo (Limpiar Todo)
                 </button>
                 <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="w-full bg-secondary text-primary font-black py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-[0.2em] border border-primary/20"
                >
                  Confirmar Selección
                </button>
                 <button 
                   onClick={() => navigate('/messages')}
                   className="w-full bg-white text-[#1a1a1a] border border-[#BBA27E]/30 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-sm hover:bg-[#BBA27E]/10 transition-colors"
                 >
                   Preguntar a Salty por Fechas
                 </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Contact / Leads Form Section */}
        <div className="mt-20 mb-10 bg-white rounded-[3rem] p-8 lg:p-12 shadow-float border border-gray-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-text-main mb-4 leading-tight">
                {siteContent?.contact?.title?.includes('Salty') ? (
                  <>
                    {siteContent.contact.title.replace('Salty', '').replace('.', '')}
                    <span className="text-primary italic"> Salty · VRR.</span>
                  </>
                ) : (
                  siteContent?.contact?.title
                )}
              </h2>
              <p className="text-sm text-text-light mb-8 leading-relaxed">
                {siteContent?.contact?.subtitle}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm font-bold text-text-main">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Phone size={18} />
                  </div>
                  {siteContent?.contact?.phone}
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-text-main">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                    <Mail size={18} />
                  </div>
                  {siteContent?.contact?.email}
                </div>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                const target = e.target as any;
                const leadData = {
                  name: target.name.value,
                  email: target.email.value,
                  message: target.message.value,
                  status: 'new'
                };

                try {
                  // 1. Save to Supabase -> Database Trigger will handle the Emails!
                  const { error: dbError } = await supabase.from('contact_leads').insert(leadData);
                  if (dbError) throw dbError;

                  alert("¡Mensaje enviado con éxito! Recibirás una confirmación en tu email.");
                  target.reset();
                } catch (error: any) {
                  console.error("Contact Form Error:", error);
                  alert("Ocurrió un error al procesar tu solicitud: " + error.message);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 bg-sand/30 p-6 lg:p-8 rounded-[2rem] border border-white"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Nombre</label>
                  <input name="name" required className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none" placeholder="Tu nombre" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Email</label>
                  <input name="email" type="email" required className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none" placeholder="tu@email.com" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Mensaje</label>
                <textarea name="message" required className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none h-32" placeholder="¿En qué podemos ayudarte?"></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-secondary text-white font-black py-4 rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    PROCESANDO...
                  </>
                ) : 'Enviar Mensaje Directo'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODALS & STICKY ELEMENTS */}
      {!isSearchOpen && (
        <StickyBookingBar 
          villaName={properties[0]?.title || "Villa Retiro R & Pirata Family"} 
          onAction={() => setIsSearchOpen(true)} // Cambiado para abrir el modal directamente
        />
      )}

      {selectedGuideItem && (
        <MapModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            placeName={selectedGuideItem.name}
            villaName={properties[0]?.title || "Nuestra Villa"}
            mapUrl={selectedGuideItem.mapUrl}
            distance={selectedGuideItem.distance}
        />
      )}
    </div>
  );
};

export default Home;
