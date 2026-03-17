import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import ReviewCarousel from '../components/ReviewCarousel';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { PropertyCardSkeleton } from '../components/Skeleton';
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
  Map as MapIcon
} from 'lucide-react';
import MapModal from '../components/MapModal';
import StickyBookingBar from '../components/StickyBookingBar';
import { LocalGuideItem } from '../types';

type Category = 'todo' | 'piscina' | 'playa' | 'mascotas';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { properties, localGuideData, favorites, toggleFavorite, isLoading, siteContent } = useProperty();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Guest State
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
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

  // Filter Logic based on Guests (Adults + Kids) AND Pets AND Category
  const filteredProperties = properties.filter(property => {
    // 0. Emergency Check: Don't show offline properties
    if (property.isOffline) return false;

    const totalHumans = adults + children;

    // 1. Check Capacity (Robust check using the flat column)
    const capacity = Number(property.guests) || 1;
    if (capacity < totalHumans) return false;

    // 2. Check Pets (Automatic filter if pets > 0)
    if (pets > 0) {
      const amenitiesText = (property.amenities || []).join(" ").toLowerCase();
      const isPetFriendly = amenitiesText.includes("pet") || amenitiesText.includes("mascota");
      if (!isPetFriendly) return false;
    }

    // 3. Check Category
    if (activeCategory === "todo") return true;

    const amenitiesText = (property.amenities || []).join(" ").toLowerCase();
    const descText = (property.description || "").toLowerCase();

    if (activeCategory === "piscina") return amenitiesText.includes("piscina") || descText.includes("piscina");
    if (activeCategory === "playa") return descText.includes("playa") || descText.includes("mar") || descText.includes("beach");
    if (activeCategory === "mascotas") return amenitiesText.includes("pet") || amenitiesText.includes("mascota");

    return true;
  });
  const getSectionTitle = () => {
    if (pets > 0) return 'Alojamientos Pet Friendly';
    switch (activeCategory) {
      case 'piscina': return 'Modern Tropical Retreats';
      case 'playa': return 'Strategic Beach Access';
      case 'mascotas': return 'Pet Friendly Collections';
      default: return 'Exclusive Boutique Stays';
    }
  };

  const getGuestSummary = () => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} ad`);
    if (children > 0) parts.push(`${children} ni`);
    if (pets > 0) parts.push(`${pets} masc`);
    return parts.join(', ');
  };

  const categories: { id: Category; label: string; icon: any }[] = [
    { id: 'todo', label: 'Designer Villas', icon: LayoutGrid },
    { id: 'piscina', label: 'Pool Retreats', icon: Droplets },
    { id: 'playa', label: 'Coastal Stays', icon: Palmtree },
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
        <div className="fixed inset-0 z-50 bg-sand/90 backdrop-blur-xl flex items-start justify-center pt-24 px-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative bg-white border border-white/50">

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold font-serif text-text-main">Tu viaje</h2>
              <button onClick={() => setIsSearchOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="mb-8 space-y-1">
              <CounterRow label="Adultos" sub="Edad 13+" val={adults} setVal={setAdults} min={1} />
              <CounterRow label="Niños" sub="Edad 2 - 12" val={children} setVal={setChildren} min={0} />
              <CounterRow label="Mascotas" sub="Pet Friendly" val={pets} setVal={setPets} min={0} />
            </div>

            <button
              onClick={handleSearch}
              className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all hover:bg-primary-dark"
            >
              <Search size={20} />
              Explorar {filteredProperties.length} propiedades
            </button>
          </div>
        </div>
      )}

      {/* Header Content */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-text-main leading-[1.1] tracking-tight">
              {siteContent?.hero.title}: <br />
              <span className="text-primary italic font-medium">{siteContent?.hero.slogan}</span>
            </h1>
          </div>
          <div
            onClick={() => {
              const el = document.getElementById('notif-status');
              if (el) {
                el.innerText = siteContent?.hero.notif_promo || "¡Pronto! Notificaciones de Élite.";
                setTimeout(() => { if (el) el.innerText = siteContent?.hero.notif_status || "¡Hola, Viajero! 👋"; }, 3000);
              }
            }}
            className="w-12 h-12 bg-white rounded-2xl shadow-card flex items-center justify-center border border-white/50 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all group"
          >
            <Bell size={24} className="text-secondary group-hover:scale-110 transition-transform" />
          </div>
        </div>

        <div className="h-6 -mt-4 mb-4">
          <p id="notif-status" className="text-text-light text-sm font-medium transition-all duration-500">{siteContent?.hero.notif_status || "¡Hola, Viajero! 👋"}</p>
        </div>
      </div>

      {/* Search Bar - Modern Glass */}
      <div
        onClick={() => setIsSearchOpen(true)}
        className="glass rounded-2xl p-2 flex items-center shadow-glass cursor-pointer hover:bg-white/80 transition-all group border border-white/60 bg-gradient-to-r from-white/40 to-white/10"
      >
        <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
          <Search size={20} />
        </div>
        <div className="flex-1 px-4">
          <p className="font-bold text-text-main text-sm">Cabo Rojo, PR</p>
          <p className="text-xs text-text-light">{getGuestSummary()}</p>
        </div>
        <div className="bg-gray-100 p-2 rounded-xl text-gray-400 group-hover:text-primary transition-colors">
          <Sliders size={20} />
        </div>
      </div>

      {/* Categories - Modern Pills */}
      <div className="flex items-center gap-3 mt-8 overflow-x-auto no-scrollbar pb-2 relative z-10 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-full border whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeCategory === cat.id
              ? 'bg-secondary text-white border-secondary shadow-xl shadow-secondary/20 scale-105'
              : 'bg-white/80 backdrop-blur-sm border-white/50 text-gray-500 shadow-soft hover:bg-white hover:text-text-main hover:-translate-y-0.5'
              }`}
          >
            <cat.icon size={14} />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 rounded-t-[2.5rem] bg-white/60 backdrop-blur-md border-t border-white/40 min-h-screen px-6 pt-10 pb-32">
        {/* Sabor Local Header & Filters */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 text-center md:text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 opacity-80">Cabo Rojo Experience</p>
              <h2 className="font-serif font-bold text-4xl text-text-main leading-[1.1] tracking-tight">Sabor Local & <span className="text-secondary italic font-medium">Aventura.</span></h2>
            </div>
            
            {/* Experience Pills - ACTIVADORES DINÁMICOS */}
            <div className="flex gap-2 p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-[2rem] border border-white/50 w-fit mx-auto md:mx-0 shadow-inner">
              {[
                { id: 'beaches', label: 'Playas', icon: Palmtree },
                { id: 'gastronomy', label: 'Gastronomía', icon: Utensils },
                { id: 'nearby', label: 'Cerca de Ti', icon: MapPin }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (activeGuideTab === tab.id) {
                      setActiveGuideTab(null);
                    } else {
                      setActiveGuideTab(tab.id);
                      setTimeout(() => {
                        const el = document.getElementById(`section-${tab.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500 shadow-sm active:scale-95 ${
                    activeGuideTab === tab.id 
                    ? 'bg-primary text-white scale-105 shadow-primary/20' 
                    : 'bg-white text-text-light hover:text-primary hover:bg-white'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ON-DEMAND LOCAL CONTENT (Filtros Foto 4) */}
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
              {/* Playas del Paraíso Section */}
              {activeGuideTab === 'beaches' && (
                <div id="section-beaches" className="scroll-mt-32">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Cabo Rojo Suroeste</p>
                      <h2 className="font-serif font-bold text-3xl text-text-main">{siteContent?.sections.beaches || "Playas del Paraíso"}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 text-primary">
                      <Palmtree size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localGuideData.find(g => g.id === 'beaches')?.items.map((item, i) => (
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
              )}

              {/* Ruta Gastronómica Section */}
              {activeGuideTab === 'gastronomy' && (
                <div id="section-gastronomy" className="scroll-mt-32">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-1">Sabor Local</p>
                      <h2 className="font-serif font-bold text-3xl text-text-main">{siteContent?.sections.gastronomy || "Ruta Gastronómica"}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/10 text-secondary">
                      <Utensils size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localGuideData.find(g => g.id === 'gastronomy')?.items.map((item, i) => (
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
              )}

              {/* Cerca de Ti Section */}
              {activeGuideTab === 'nearby' && (
                <div id="section-nearby" className="scroll-mt-32">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light mb-1">Logística & Entorno</p>
                      <h2 className="font-serif font-bold text-3xl text-text-main">{siteContent?.sections.nearby || "Cerca de Ti"}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 text-text-light">
                      <MapPin size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localGuideData.find(g => g.id === 'nearby')?.items.map((item, i) => (
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Banner */}
        <div className="mb-10 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent rounded-3xl p-6 border border-secondary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">📍 Sector Samán, Cabo Rojo</p>
            <h3 className="font-serif font-bold text-lg text-text-main leading-snug mb-2">
              {siteContent?.cta.title || "Hospédate en el corazón del Paraíso."}<br />
              <span className="text-primary italic">{siteContent?.cta.subtitle || "Todo lo que amas de Cabo Rojo a menos de 20 minutos."}</span>
            </h3>
            <p className="text-xs text-text-light mb-4 max-w-md">{siteContent?.cta.description || "Nuestras propiedades están ubicadas estratégicamente cerca de Boquerón, las mejores playas y restaurantes del suroeste."}</p>
            <div className="flex gap-3 flex-wrap">
              <a href="https://share.google/LBxZV0NwKZps4rliR" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-text-main px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100">
                <HomeIcon size={14} className="text-primary" />
                Villa Retiro R en Google
              </a>
              <a href="https://share.google/iQA2MMS4C2Vv7HBIx" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-text-main px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100">
                <HomeIcon size={14} className="text-secondary" />
                Pirata Family en Google
              </a>
            </div>
          </div>
        </div>

        {/* Social Proof - Reviews Carousel */}
        {!isLoading && properties.length > 0 && (
          <div className="mb-16 border-y border-gray-100/50 py-4">
            <div className="text-center mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Lo que dicen nuestros huéspedes</p>
            </div>
            <ReviewCarousel limit={8} />
          </div>
        )}

        {/* Listings Header */}
        <div id="property-grid" ref={resultsRef} className="flex justify-between items-center mb-6 scroll-mt-32">
          <h3 className="font-serif font-bold text-xl text-text-main">
            {getSectionTitle()}
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {filteredProperties.length}
          </span>
        </div>

        {/* Listings Grid - Luxury Stagger Entry */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
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
                    hidden: { opacity: 0, y: 40, scale: 0.96 },
                    show: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1]
                      }
                    },
                    exit: { 
                      opacity: 0, 
                      scale: 0.9, 
                      transition: { duration: 0.4 } 
                    }
                  }}
                >
                  <PropertyCard
                    property={property}
                    index={index}
                    onClick={(id) => navigate(`/property/${id}`)}
                    isFavorite={favorites.includes(property.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 animate-pulse text-gray-300">
                <Search size={40} />
              </div>
              <p className="text-text-main font-bold text-lg">Sin estancias disponibles</p>
              <p className="text-sm text-text-light mt-1 mb-6 max-w-[200px]">
                Intenta cambiar los filtros para encontrar tu estancia ideal.
              </p>
              <button
                onClick={() => { setAdults(1); setChildren(0); setPets(0); setActiveCategory('todo'); }}
                className="text-primary font-bold text-sm bg-primary/10 px-6 py-3 rounded-xl hover:bg-primary/20 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </motion.div>

        {/* Contact / Leads Form Section */}
        <div className="mt-20 mb-10 bg-white rounded-[3rem] p-8 lg:p-12 shadow-float border border-gray-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-orange-400 to-secondary"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-text-main mb-4 leading-tight">
                {siteContent?.contact?.title?.includes('Salty') ? (
                  <>
                    {siteContent.contact.title.replace('Salty', '').replace('.', '')}
                    <span className="text-primary italic"> Salty.</span>
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
                  // 1. Save to Supabase (Backup)
                  const { error: dbError } = await supabase.from('contact_leads').insert(leadData);
                  if (dbError) throw dbError;

                  // 2. Send Emails via Resend
                  const response = await fetch('/api/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'contact',
                      contactData: leadData
                    })
                  });

                  if (!response.ok) throw new Error('Error al enviar el correo');

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
      <StickyBookingBar 
        villaName={properties[0]?.title || "Villa Retiro R & Pirata Family"} 
        onAction={scrollToResults} 
      />

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
