import React, { useState, useRef, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import ReviewCarousel from '../components/ReviewCarousel';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/SupabaseService';
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
  const { properties, bookings, syncedBlocks, favorites, isLoading, isRefreshing, toggleFavorite, siteContent, localGuideData, getOccupiedDatesForProperty, logSearch } = useProperty();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [searchTab, setSearchTab] = useState<'dates'|'guests'>('dates');

  // 💾 SEARCH PERSISTENCE (Captain's Memory)
  const [adults, setAdults] = useState(() => {
    const saved = localStorage.getItem('vrr_search_adults');
    return saved ? Math.max(1, parseInt(saved, 10)) : 1;
  });
  const [children, setChildren] = useState(() => {
    const saved = localStorage.getItem('vrr_search_children');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [pets, setPets] = useState(() => {
    const saved = localStorage.getItem('vrr_search_pets');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('vrr_search_start');
    return saved ? new Date(saved) : null;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('vrr_search_end');
    return saved ? new Date(saved) : null;
  });
  const [activeCategory, setActiveCategory] = useState<Category>('todo');

  // 🚀 REACT 18 DEFERRED VALUES: Avoids UI jank on typing/clicking
  const deferredAdults = useDeferredValue(adults);
  const deferredChildren = useDeferredValue(children);
  const deferredPets = useDeferredValue(pets);
  const deferredStartDate = useDeferredValue(startDate);
  const deferredEndDate = useDeferredValue(endDate);
  const deferredCategory = useDeferredValue(activeCategory);

  React.useEffect(() => {
    localStorage.setItem('vrr_search_adults', adults.toString());
    localStorage.setItem('vrr_search_children', children.toString());
    localStorage.setItem('vrr_search_pets', pets.toString());
    if (startDate) localStorage.setItem('vrr_search_start', startDate.toISOString());
    else localStorage.removeItem('vrr_search_start');
    if (endDate) localStorage.setItem('vrr_search_end', endDate.toISOString());
    else localStorage.removeItem('vrr_search_end');
  }, [adults, children, pets, startDate, endDate]);
  const [activeGuideTab, setActiveGuideTab] = useState<string | null>(null);
  const [selectedGuideItem, setSelectedGuideItem] = useState<LocalGuideItem | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false);

  // Ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // 🔱 NAVIGATION RESCUE: ESC Key Listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleSearch = () => {
    if (!startDate || !endDate) {
      window.dispatchEvent(new CustomEvent('salty-push', { detail: { message: "Salty: Primero selecciona tus fechas de invasión, Capitán. ⚓", type: 'warning' } }));
      return;
    }

    setIsChecking(true);
    window.dispatchEvent(new CustomEvent('salty-push', { detail: { message: "Salty está verificando el radar de Villa Retiro R... ⚓", speak: false } }));
    
    setTimeout(async () => {
      setIsChecking(false);
      const isAvailable = filteredProperties.length > 0;
      
      // 🔱 SALTY RADAR: Log the search intent (Success or Failed)
      logSearch({
        check_in: startDate || undefined,
        check_out: endDate || undefined,
        guests: adults + children,
        isAvailable,
        metadata: { category: activeCategory }
      });
      
      if (!isAvailable) {
        setIsOccupiedModalOpen(true);
      } else {
        setIsSearchOpen(false);
        scrollToResults();
      }
    }, 800); // ⚡ SALTY TURBO: Reduced from 1500ms to 800ms for faster perceived response
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
    scrollToResults();
  };

  console.log("FILTRO ACTIVO:", { adults, children, pets, activeCategory, propertiesCount: properties.length });

  const filteredProperties = React.useMemo(() => {
    return properties.filter(property => {
      if (property.isOffline) return false;
      const totalHumans = deferredAdults + deferredChildren;
      const capacity = Number(property.guests) || 1;
      if (capacity < totalHumans) return false;

      // 🛡️ AVAILABILITY SHIELD: Filter by dates if selected
      if (deferredStartDate && deferredEndDate) {
        const sStr = deferredStartDate.toISOString().split('T')[0];
        const eStr = deferredEndDate.toISOString().split('T')[0];
        
        const occupiedDates = getOccupiedDatesForProperty(String(property.id));
        const occupiedStrings = new Set(occupiedDates.map(d => d.toISOString().split('T')[0]));
        
        // 🛡️ RANGE VALIDATOR: Check every night of requested stay
        let hasConflict = false;
        let scan = new Date(deferredStartDate);
        while (scan < deferredEndDate) {
          if (occupiedStrings.has(scan.toISOString().split('T')[0])) {
            hasConflict = true;
            break;
          }
          scan.setDate(scan.getDate() + 1);
        }
        
        if (hasConflict) return false;

        // 2. Check against Manual Blocks
        const mBlocks = property.blockedDates || [];
        const isBlockedManually = mBlocks.some(d => d >= sStr && d < eStr);
        if (isBlockedManually) return false;
      }

      if (deferredPets > 0) {
        const hText = (property.amenities || []).join(" ").toLowerCase();
        if (!hText.includes("pet") && !hText.includes("mascota")) return false;
      }

      if (deferredCategory === "todo") return true;
      const aText = (property.amenities || []).join(" ").toLowerCase();
      const dText = (property.description || "").toLowerCase();
      const meta = (property.images_meta || []) as any[];

      if (deferredCategory === "piscina") {
        return aText.includes("piscina") || dText.includes("piscina") || meta.some(m => m.category === 'piscina');
      }
      if (deferredCategory === "playa") {
        return dText.includes("playa") || dText.includes("mar") || dText.includes("beach") || meta.some(m => m.category === 'exterior' && (m.description || '').toLowerCase().includes('playa'));
      }
      if (deferredCategory === "mascotas") {
        return aText.includes("pet") || aText.includes("mascota");
      }

      return true;
    });
  }, [properties, getOccupiedDatesForProperty, deferredAdults, deferredChildren, deferredPets, deferredCategory, deferredStartDate, deferredEndDate]);

  // Wait to filter availability after user selection rather than preemptively blocking the global search calendar
  // to avoid confusing users when multiple properties have overlapping legitimate reservations.
  const isRangeAvailable = (start: Date, end: Date) => {
    // Range selection is fully open in the global calendar. 
    // The "Radar" handles validation when 'Ver Disponibilidad' is clicked.
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
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${val <= min ? 'text-gray-300 opacity-50' : 'bg-white text-text-main shadow-sm hover:scale-105 active:scale-95'}`}
          disabled={val <= min}
        >
          <Minus size={14} />
        </button>
        <span className="font-bold text-lg w-5 text-center select-none">{val}</span>
        <button
          onClick={() => {
            if (val >= 8) {
              window.dispatchEvent(new CustomEvent('salty-push', { detail: { message: "El aforo de nuestras villas está diseñado para un máximo seguro de 8 exploradores. ⚓" } }));
            }
            setVal(Math.min(8, val + 1));
          }}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${val >= 8 ? 'bg-gray-100 text-gray-300' : 'bg-white text-primary shadow-sm hover:scale-105 active:scale-95'}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <LazyMotion features={domAnimation}>
    <div className="min-h-screen pb-32 relative bg-sand overflow-hidden scroll-smooth">
      {/* 🔱 SALTY RADAR: Realtime Sync Indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[3000000] bg-secondary/95 backdrop-blur-xl border border-primary/30 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#D4AF37]"></div>
            <span className="text-[10px] font-semibold uppercase opacity-80 tracking-[0.25em] text-white">Sincronizando Disponibilidad...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Mesh Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 transform-gpu">
        <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob will-change-transform"></div>
        <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-secondary/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-2000 will-change-transform"></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-accent/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-4000 will-change-transform"></div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
          className="fixed inset-0 z-[2000000] bg-sand/90 backdrop-blur-3xl flex items-start justify-center pt-24 pb-12 px-4 animate-fade-in overflow-y-auto"
        >
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
                   className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 rounded-xl transition-all ${searchTab === 'dates' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   1. Fechas
                </button>
                <button 
                   onClick={() => setSearchTab('guests')} 
                   className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 rounded-xl transition-all ${searchTab === 'guests' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   2. Huéspedes
                </button>
              </div>

              {searchTab === 'dates' ? (
                  <div className="mb-6 animate-fade-in">
                    <BookingCalendar 
                      startDate={startDate} 
                      endDate={endDate} 
                      hideHeader={true}
                      onChange={(update) => {
                        const [start, end] = update;
                        setStartDate(start);
                        setEndDate(end);
                        if (start && end) {
                            setTimeout(() => setSearchTab('guests'), 400); // Auto-jump
                        }
                      }} 
                      blockedDates={[]} 
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
              disabled={isChecking}
              className="w-full bg-secondary text-primary font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border border-primary/20 disabled:opacity-80 disabled:scale-100 disabled:cursor-wait"
              aria-label="Ver disponibilidad de la villa"
            >
              {isChecking ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  Checking Availability...
                </>
              ) : (
                <>
                  <Search size={16} className="group-hover:scale-110 transition-transform" />
                  Ver Disponibilidad
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }
        .animate-pulse-gold {
          animation: pulse-gold 2s infinite;
        }
      `}</style>

      {/* Búnker Ocupado Modal (Elite Feedback) */}
      <AnimatePresence>
        {isOccupiedModalOpen && (
          <div className="fixed inset-0 z-[3000000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOccupiedModalOpen(false)}
              className="absolute inset-0 bg-secondary/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border border-primary/20 text-center z-[3000001] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/20 via-primary to-primary/20"></div>

              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl shadow-inner border border-primary/20 animate-pulse-gold">
                🔱
              </div>
              <h3 className="font-serif font-black text-3xl text-secondary mb-6 tracking-tighter italic">¡Búnker Ocupado!</h3>
              <p className="text-[13px] text-text-light font-bold leading-relaxed mb-10 px-4">
                "Salty ha revisado la bitácora y parece que las fechas del <span className="text-primary font-black underline underline-offset-4">{startDate && format(startDate, 'dd MMM', { locale: es })}</span> al <span className="text-primary font-black underline underline-offset-4">{endDate && format(endDate, 'dd MMM', { locale: es })}</span> ya tienen tripulación. ¿Qué te parece si buscamos otro momento para tu invasión a Cabo Rojo? 🦜⚓"
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setIsOccupiedModalOpen(false);
                    setSearchTab('dates');
                  }}
                  className="w-full bg-secondary text-primary font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[11px] border border-primary/20"
                >
                  CAMBIAR FECHAS 📅
                </button>
                <button 
                  onClick={() => setIsOccupiedModalOpen(false)}
                  className="w-full bg-transparent text-secondary/40 font-black uppercase tracking-[0.1em] text-[10px] py-4 rounded-2xl hover:text-secondary transition-all"
                >
                  CERRAR BITÁCORA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Content */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        <div className="flex justify-between items-end mb-1">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif italic font-black text-secondary leading-tight tracking-tighter">
              Villa Retiro R
            </h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mt-1">Cabo Rojo · Puerto Rico</p>
          </div>
          <button 
            className="w-12 h-12 bg-white rounded-2xl shadow-card flex items-center justify-center border border-white/50 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all group overflow-hidden relative"
            aria-label="Ver Notificaciones"
            onClick={() => window.dispatchEvent(new CustomEvent('salty-push', { detail: { message: "Salty: ¡Pronto habilitaré tus notificaciones! ⚓" } }))}
          >
            <Bell size={24} className="text-secondary group-hover:scale-110 transition-transform" />
          </button>
        </div>
        <p className="text-primary font-semibold uppercase tracking-[0.25em] opacity-80 transition-all duration-500 drop-shadow-sm text-[10px]">
          Salty · Concierge Oficial VRR 🌟
        </p>
      </div>

      <div
        onClick={() => setIsSearchOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Caja de búsqueda general"
        onKeyDown={(e) => { if (e.key === 'Enter') setIsSearchOpen(true); }}
        className="glass rounded-2xl p-2 flex items-center shadow-glass cursor-pointer hover:bg-white/80 transition-all group border border-white/60 bg-gradient-to-r from-white/40 to-white/10 mx-6 text-left transform-gpu"
      >
        <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform" aria-hidden="true">
          <Search size={20} />
        </div>
        <div className="flex-1 px-4 min-p-1">
          <p className="font-bold text-text-main text-sm">
            {startDate ? `${format(startDate, 'dd MMM', { locale: es })} - ${endDate ? format(endDate, 'dd MMM', { locale: es }) : '...'}` : 'Cabo Rojo, PR'}
          </p>
          <p className="text-xs text-text-light">{getGuestSummary()}</p>
        </div>
        <button 
          className="bg-gray-100 p-4 -my-2 -mr-2 rounded-xl text-gray-400 group-hover:text-primary transition-colors hover:bg-gray-200 outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Abrir selección de huéspedes"
          onClick={(e) => { e.stopPropagation(); setSearchTab('guests'); setIsSearchOpen(true); }}
        >
          <Sliders size={20} />
        </button>
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

      <div className="relative z-10 rounded-t-[2.5rem] bg-white/60 backdrop-blur-sm border-t border-white/40 min-h-screen px-6 pt-10 pb-32">
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 text-center md:text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase opacity-80 tracking-[0.3em] text-primary mb-2 opacity-80">Explora con Salty</p>
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary mb-1">Cabo Rojo Suroeste</p>
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
                    priority={index === 0} // 🔱 LCP OPTIMIZATION
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
            <div className="col-span-full flex flex-col items-center justify-center pt-20 pb-48 lg:pb-20 px-10 text-center bg-white/40 border border-white/50 rounded-[3rem] backdrop-blur-md">
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
                  <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light ml-1">Nombre</label>
                  <input name="name" required className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none" placeholder="Tu nombre" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light ml-1">Email</label>
                  <input name="email" type="email" required className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none" placeholder="tu@email.com" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light ml-1">Mensaje</label>
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
      {!isSearchOpen && filteredProperties.length > 0 && (
        <StickyBookingBar 
          villaName="VILLA RETIRO R LLC" 
          onAction={() => setIsSearchOpen(true)} 
        />
      )}

      {/* STICKY HEADER SCROLL */}
      <StickyHomeHeader onSearchClick={() => setIsSearchOpen(true)} />

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
    </LazyMotion>
  );
};

// Sub-component for Sticky Header
const StickyHomeHeader = ({ onSearchClick }: { onSearchClick: () => void }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  React.useEffect(() => {
    const checkScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  return (
    <AnimatePresence>
      {isScrolled && (
        <motion.div
           initial={{ y: -100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: -100, opacity: 0 }}
           transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
           className="fixed top-0 left-0 right-0 z-[100] px-4 py-3"
        >
          <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-black/[0.05] p-2 pr-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-primary text-xl shadow-inner font-serif italic">
                R
              </div>
              <span className="font-serif font-black text-secondary tracking-tight hidden sm:block">Villa Retiro R</span>
            </div>
            <button 
              onClick={onSearchClick}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-full transition-colors group"
            >
              <Search size={14} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light">Buscar Fechas</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Home;
