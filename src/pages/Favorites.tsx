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
    <div className="min-h-screen bg-sand/30 pb-32 px-6 pt-12 animate-fade-in relative overflow-hidden transition-colors duration-1000">
      {/* 🌊 Background Aesthetic elements */}
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-80 h-80 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🔱 Header: Mi Bitácora Section */}
      <header className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-5">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white/60 dark-bg-white-10 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-xl border border-white/40 group overflow-hidden"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Heart className="w-8 h-8 text-primary dark-text-accent shadow-sm" fill="currentColor" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.div>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-black italic text-text-main dark-text-white tracking-tighter leading-none">
              Mi Bitácora
            </h1>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 dark-text-accent/60 mt-2 flex items-center gap-2">
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
            className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10"
          >
            {favoriteProperties.map((property, index) => (
              <motion.div key={property.id} variants={itemVariants}>
                <PropertyCard 
                  property={property} 
                  index={index}
                  onToggleFavorite={() => toggleFavorite(property.id)}
                  isFavorite={true}
                  onClick={() => navigate(`/property/${property.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
              <div className="relative w-32 h-32 bg-white/40 dark-bg-white-10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-2xl">
                <Heart className="w-16 h-16 text-primary/30 dark-text-accent/30" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute"
                >
                  <Compass className="w-12 h-12 text-primary dark-text-accent" />
                </motion.div>
              </div>
            </div>
            
            <h2 className="text-3xl font-serif font-bold text-text-main dark-text-white mb-4">Tu bitácora está esperando su primera entrada</h2>
            <p className="max-w-md text-text-light dark-text-gray-400 mb-10 text-lg leading-relaxed">
              "El primer paso de un gran viaje es elegir el refugio perfecto. Explora nuestras villas y guarda las que te roben el aliento." — <span className="font-bold text-primary dark-text-accent">Salty</span>
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 107, 53, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="group relative flex items-center gap-3 bg-primary dark-bg-accent text-white font-bold py-5 px-10 rounded-2xl shadow-float overflow-hidden transition-all duration-300"
            >
              <span className="relative z-10">Explorar Destinos</span>
              <Sparkles className="w-5 h-5 relative z-10 animate-pulse" />
              <ChevronRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .dark-bg-white-10 {
          transition: background-color 1s;
        }
        .salty-mode .dark-bg-white-10 {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .salty-mode .dark-text-accent {
          color: #F2CC8F !important;
        }
        .salty-mode .dark-text-white {
          color: #FFFFFF !important;
        }
        .salty-mode .dark-bg-accent {
          background-color: #F2CC8F !important;
        }
      `}</style>
    </div>
  );
};

export default Favorites;
