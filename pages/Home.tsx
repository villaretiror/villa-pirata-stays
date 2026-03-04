import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import GuideCard from '../components/GuideCard';
import { useProperty } from '../contexts/PropertyContext';

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
        window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  const handleCategorySelect = (cat: Category) => {
    setActiveCategory(cat);
    // Give a tiny delay so the state updates and feels like a new "search"
    setTimeout(scrollToResults, 100);
  };

  // Filter Logic based on Guests (Adults + Kids) AND Pets AND Category
  const filteredProperties = properties.filter(property => {
    const totalHumans = adults + children;
    
    // 1. Check Capacity
    if (property.guests < totalHumans) return false;

    // 2. Check Pets (Automatic filter if pets > 0)
    if (pets > 0) {
        const amenitiesText = property.amenities.join(' ').toLowerCase();
        const isPetFriendly = amenitiesText.includes('pet') || amenitiesText.includes('mascota');
        if (!isPetFriendly) return false;
    }

    // 3. Check Category
    if (activeCategory === 'todo') return true;
    
    const amenitiesText = property.amenities.join(' ').toLowerCase();
    const descText = property.description.toLowerCase();
    
    if (activeCategory === 'piscina') {
        return amenitiesText.includes('piscina') || descText.includes('piscina');
    }
    
    if (activeCategory === 'playa') {
        return descText.includes('playa') || descText.includes('mar') || descText.includes('beach') || descText.includes('buyé') || descText.includes('boquerón');
    } 
    
    if (activeCategory === 'mascotas') {
        return amenitiesText.includes('pet') || amenitiesText.includes('mascota');
    }

    return true;
  });

  const getSectionTitle = () => {
      if (pets > 0) return 'Alojamientos Pet Friendly';
      switch(activeCategory) {
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
      <div className="flex items-center gap-4 bg-gray-50 rounded-full p-1">
        <button 
          onClick={() => setVal(Math.max(min, val - 1))}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${val <= min ? 'text-gray-300' : 'bg-white text-text-main shadow-sm'}`}
          disabled={val <= min}
        >
          <span className="material-icons text-sm">remove</span>
        </button>
        <span className="font-bold text-lg w-4 text-center">{val}</span>
        <button 
          onClick={() => setVal(Math.min(10, val + 1))} // Cap at 10 for safety
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-primary shadow-sm"
        >
          <span className="material-icons text-sm">add</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 relative bg-sand overflow-hidden">
      
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
              Explorar {filteredProperties.length} lugares
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
              Descubre tu <br/>
              <span className="text-primary italic">paraíso privado.</span>
            </h1>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-card flex items-center justify-center border border-white/50">
            <span className="material-icons text-secondary">notifications_none</span>
          </div>
        </div>

        {/* Search Bar - Modern Glass */}
        <div 
          onClick={() => setIsSearchOpen(true)}
          className="glass rounded-2xl p-2 flex items-center shadow-glass cursor-pointer hover:bg-white/60 transition-all group"
        >
          <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
            <span className="material-icons">search</span>
          </div>
          <div className="flex-1 px-4">
            <p className="font-bold text-text-main text-sm">Cabo Rojo, PR</p>
            <p className="text-xs text-text-light">{getGuestSummary()}</p>
          </div>
          <div className="bg-gray-100 p-2 rounded-xl text-gray-400">
             <span className="material-icons text-xl">tune</span>
          </div>
        </div>

        {/* Categories - Modern Pills */}
        <div className="flex items-center gap-3 mt-8 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border whitespace-nowrap transition-all duration-300 ${
                activeCategory === cat.id 
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
             <h2 className="font-serif font-bold text-xl text-text-main">Vive Cabo Rojo</h2>
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
        <div className="space-y-6">
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
              <p className="text-text-main font-bold text-lg">No encontramos resultados</p>
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
      </div>
    </div>
  );
};

export default Home;
