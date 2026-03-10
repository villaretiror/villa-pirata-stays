import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

type Category = 'todo' | 'piscina' | 'playa' | 'mascotas';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { properties, localGuideData, favorites, toggleFavorite } = useProperty();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Advanced Guest State
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);

  const [activeCategory, setActiveCategory] = useState<Category>('todo');
  const [activeGuideTab, setActiveGuideTab] = useState(0);

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

  // Filter Logic - TEMPORARY BYPASS (PLAN DE CHOQUE)
  const filteredProperties = properties.filter(property => {
    // We are temporarily showing everything to debug the data flow
    console.log(`Checking property ${property.id}: isOffline=${property.isOffline}`);

    // Original filter (Commented out):
    // if (property.isOffline) return false;
    // const totalHumans = adults + children;
    // if (property.guests < totalHumans) return false;

    return true; // SHOW ALL
  });

  const getSectionTitle = () => {
    if (pets > 0) return 'Alojamientos Pet Friendly';
    switch (activeCategory) {
      case 'piscina': return 'Oasis con Piscina';
      case 'playa': return 'Escapadas cerca del Mar';
      case 'mascotas': return 'Pet Friendly';
      default: return 'Recomendado para ti';
    }
  };

  const getGuestSummary = () => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} ad`);
    if (children > 0) parts.push(`${children} ni`);
    if (pets > 0) parts.push(`${pets} masc`);
    return parts.join(', ');
  };

  const categories: { id: Category; label: string; icon: string }[] = [
    { id: 'todo', label: 'Todo', icon: 'grid_view' },
    { id: 'piscina', label: 'Piscina', icon: 'pool' },
    { id: 'playa', label: 'Playa', icon: 'beach_access' },
    { id: 'mascotas', label: 'Mascotas', icon: 'pets' },
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
          <span className="material-icons text-sm">remove</span>
        </button>
        <span className="font-bold text-lg w-5 text-center select-none">{val}</span>
        <button
          onClick={() => setVal(Math.min(10, val + 1))} // Cap at 10 for safety
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-primary shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-icons text-sm">add</span>
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
                <span className="material-icons text-gray-400">close</span>
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
              <span className="material-icons text-xl">search</span>
              Explorar {filteredProperties.length} propiedades
            </button>
          </div>
        </div>
      )}

      {/* Header Content */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-text-light text-sm font-medium mb-1">¡Hola, Viajero! 👋</p>
            <h1 className="text-3xl font-serif font-bold text-text-main leading-tight">
              Descubre tu <br />
              <span className="text-primary italic">paraíso privado.</span>
            </h1>
          </div>
          <div
            onClick={() => alert("¡Próximamente! Recibirás notificaciones sobre tus estancias exclusivas aquí.")}
            className="w-12 h-12 bg-white rounded-2xl shadow-card flex items-center justify-center border border-white/50 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
          >
            <span className="material-icons text-secondary">notifications_none</span>
          </div>
        </div>

        {/* Search Bar - Modern Glass */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="glass rounded-2xl p-2 flex items-center shadow-glass cursor-pointer hover:bg-white/80 transition-all group border border-white/60 bg-gradient-to-r from-white/40 to-white/10"
        >
          <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
            <span className="material-icons">search</span>
          </div>
          <div className="flex-1 px-4">
            <p className="font-bold text-text-main text-sm">Cabo Rojo, PR</p>
            <p className="text-xs text-text-light">{getGuestSummary()}</p>
          </div>
          <div className="bg-gray-100 p-2 rounded-xl text-gray-400 group-hover:text-primary transition-colors">
            <span className="material-icons text-xl">tune</span>
          </div>
        </div>

        {/* Categories - Modern Pills */}
        <div className="flex items-center gap-3 mt-8 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border whitespace-nowrap transition-all duration-300 ${activeCategory === cat.id
                ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20 scale-105'
                : 'bg-white border-transparent text-gray-500 shadow-sm hover:bg-gray-50'
                }`}
            >
              <span className="material-icons text-sm">{cat.icon}</span>
              <span className="text-xs font-bold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 rounded-t-[2.5rem] bg-white/60 backdrop-blur-md border-t border-white/40 min-h-screen px-6 pt-8 pb-32">

        {/* Guide Section */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-serif font-bold text-xl text-text-main">Experiencia Cabo Rojo</h2>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {localGuideData.map((guide, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGuideTab(idx)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeGuideTab === idx ? 'bg-white text-text-main shadow-sm' : 'text-gray-400'}`}
                >
                  {guide.category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 no-scrollbar">
            {localGuideData[activeGuideTab].items.map((item, i) => (
              <GuideCard key={i} item={item} />
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mb-10 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent rounded-3xl p-6 border border-secondary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">📍 Sector Samán, Cabo Rojo</p>
            <h3 className="font-serif font-bold text-lg text-text-main leading-snug mb-2">
              Hospédate en el corazón del Paraíso.<br />
              <span className="text-primary italic">Todo lo que amas de Cabo Rojo a menos de 20 minutos.</span>
            </h3>
            <p className="text-xs text-text-light mb-4 max-w-md">Nuestras propiedades están ubicadas estratégicamente cerca de Boquerón, las mejores playas y restaurantes del suroeste.</p>
            <div className="flex gap-3 flex-wrap">
              <a href="https://share.google/LBxZV0NwKZps4rliR" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-text-main px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100">
                <span className="material-icons text-sm text-primary">villa</span>
                Villa Retiro R en Google
              </a>
              <a href="https://share.google/iQA2MMS4C2Vv7HBIx" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-text-main px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100">
                <span className="material-icons text-sm text-secondary">house</span>
                Pirata Family en Google
              </a>
            </div>
          </div>
        </div>

        {/* Listings Header */}
        <div ref={resultsRef} className="flex justify-between items-center mb-6 scroll-mt-32">
          <h3 className="font-serif font-bold text-xl text-text-main">
            {getSectionTitle()}
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {filteredProperties.length}
          </span>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                onClick={(id) => navigate(`/property/${id}`)}
                isFavorite={favorites.includes(property.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <span className="material-icons text-4xl text-gray-300">search_off</span>
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
        </div>

        {/* Contact / Leads Form Section */}
        <div className="mt-20 mb-10 bg-white rounded-[3rem] p-8 lg:p-12 shadow-float border border-gray-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-orange-400 to-secondary"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-text-main mb-4 leading-tight">
                ¿Tienes planes para <br />
                <span className="text-primary italic">tu próxima escapada?</span>
              </h2>
              <p className="text-sm text-text-light mb-8 leading-relaxed">
                Si tienes dudas sobre las villas, disponibilidad para grupos grandes o eventos especiales,
                déjanos un mensaje. Villa Retiro R LLC te responderá en menos de 24 horas.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm font-bold text-text-main">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-icons">phone</span>
                  </div>
                  +1 (787) 356-0895
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-text-main">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                    <span className="material-icons">email</span>
                  </div>
                  carlos@villaretiror.com
                </div>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const target = e.target as any;
                const leadData = {
                  name: target.name.value,
                  email: target.email.value,
                  message: target.message.value,
                  status: 'new'
                };

                const btn = target.querySelector('button[type="submit"]');
                const originalText = btn.innerText;
                btn.disabled = true;
                btn.innerText = "Enviando...";

                const { error } = await supabase.from('leads').insert(leadData);

                if (error) {
                  alert("Error al enviar mensaje: " + error.message);
                } else {
                  alert("¡Mensaje enviado con éxito! Nos comunicaremos pronto.");
                  target.reset();
                }
                btn.disabled = false;
                btn.innerText = originalText;
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
              <button type="submit" className="w-full bg-secondary text-white font-black py-4 rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs">
                Enviar Mensaje Directo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
