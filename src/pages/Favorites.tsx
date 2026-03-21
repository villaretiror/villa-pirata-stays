import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '../components/PropertyCard';
import { useProperty } from '../contexts/PropertyContext';
import { Heart, Compass, Sparkles, Anchor, ChevronRight } from 'lucide-react';

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite } = useProperty();
  const favoriteProperties = properties.filter(p => favorites.includes(p.id));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-sand/30 pb-32 px-6 pt-12 animate-fade-in relative overflow-hidden">
      {/* 🌊 Background Aesthetic elements */}
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-80 h-80 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🔱 Header: Mi Bitácora Section */}
      <header className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-5">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white/60 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-xl border border-white/40 group overflow-hidden"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Heart className="w-8 h-8 text-primary shadow-sm" fill="#FF7F3F" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.div>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-black italic text-text-main tracking-tighter leading-none">
              Mi Bitácora
            </h1>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 mt-2 flex items-center gap-2">
              <Anchor className="w-3 h-3" />
              {favoriteProperties.length} Reservas en Potencia
            </p>
          </div>
        </div>
      </header>

      {/* 📋 Content Grid */}
      <AnimatePresence mode="wait">
        {favoriteProperties.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 relative z-10"
          >
            {favoriteProperties.map((property, index) => (
              <motion.div key={property.id} variants={itemVariants}>
                <PropertyCard
                  property={property}
                  index={index}
                  onClick={(id) => navigate(`/property/${id}`)}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center px-4 relative z-10"
          >
            {/* Empty State: Glassmorphism Card */}
            <div className="bg-white/40 backdrop-blur-2xl p-12 rounded-[4rem] border border-white/60 shadow-2xl max-w-lg relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
              
              <div className="w-24 h-24 bg-white/80 shadow-inner rounded-[2rem] flex items-center justify-center mb-8 border border-white mx-auto relative">
                <Heart className="w-10 h-10 text-gray-200" />
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute -top-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg"
                >
                  <Compass className="w-4 h-4" />
                </motion.div>
              </div>

              <h3 className="font-serif font-black italic text-3xl text-text-main mb-4 leading-tight">
                "¿Aún no has elegido tu refugio?"
              </h3>
              
              <div className="flex flex-col gap-4 mb-10">
                <p className="text-text-light text-sm font-medium leading-relaxed italic opacity-80">
                  Salty recomienda: Explora nuestras colecciones y guarda las que más vibren con tu estilo de viaje.
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-black/5 to-transparent w-full" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                  Acceso Exclusivo a Tarifas Web Directas
                </p>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full bg-primary hover:bg-[#FF8A66] text-white font-black uppercase tracking-[0.2em] py-6 rounded-[2.5rem] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 group/btn overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                <Sparkles className="w-5 h-5" />
                Explorar Colecciones
                <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
            
            {/* Salty Proactive Tip at bottom of Empty State */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex items-center gap-3 bg-black/5 px-6 py-3 rounded-full border border-black/5"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] shadow-sm">🔱</div>
              <p className="text-[10px] font-bold text-text-main uppercase tracking-widest">
                Salty Note: <span className="text-text-light font-medium normal-case">Guardar una villa te permite comparar calendarios sin prisa.</span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Favorites;
