import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyCard from '../components/PropertyCard';
import { useProperty } from '../contexts/PropertyContext';
import { Heart, Compass, Sparkles, Anchor, MapPin, ChevronRight, Palmtree, Star } from 'lucide-react';

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite } = useProperty();
  const favoriteProperties = properties.filter(p => favorites.includes(p.id));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-sand/30 pb-40 px-5 pt-10 animate-fade-in relative overflow-hidden transition-colors duration-1000">

      {/* ── Ambient background orbs ── */}
      <div className="absolute -top-24 -right-20 w-80 h-80 bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-40 -left-16 w-96 h-96 bg-secondary/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-14 h-14 bg-primary rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/10"
          >
            <Heart className="w-7 h-7 text-white" fill="currentColor" />
          </motion.div>

          <div>
            <h1 className="text-[2.2rem] md:text-5xl font-serif font-black italic text-text-main tracking-tighter leading-none">
              Mi Bitácora
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Anchor className="w-3 h-3 text-primary/60" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                {favoriteProperties.length} {favoriteProperties.length === 1 ? 'Destino guardado' : 'Destinos guardados'}
              </p>
            </div>
          </div>
        </div>

        {favoriteProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/20 rounded-full px-4 py-2 flex items-center gap-1.5"
          >
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">
              {favoriteProperties.length}
            </span>
          </motion.div>
        )}
      </header>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {favoriteProperties.length > 0 ? (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"
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
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-stretch gap-8"
          >
            {/* ── Decorative ghost cards ── */}
            <div className="relative h-44 select-none pointer-events-none mt-4">
              {/* card 3 — far back */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[80%] h-36 rounded-[2.5rem] bg-white/40 border border-gray-100 shadow-sm"
                style={{ top: 16, transform: 'translateX(-50%) rotate(-4deg)' }}
              />
              {/* card 2 */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[86%] h-36 rounded-[2.5rem] bg-white/60 border border-gray-100 shadow-md"
                style={{ top: 8, transform: 'translateX(-50%) rotate(2deg)' }}
              />
              {/* card 1 — front */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="absolute left-1/2 -translate-x-1/2 w-[90%] h-36 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl flex items-center justify-center gap-4"
                style={{ top: 0, transform: 'translateX(-50%)' }}
              >
                <div className="w-16 h-16 rounded-2xl bg-sand flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary/30" />
                </div>
                <div>
                  <div className="h-3 w-28 bg-gray-100 rounded-full mb-2" />
                  <div className="h-2.5 w-20 bg-gray-50 rounded-full mb-2" />
                  <div className="h-2.5 w-14 bg-primary/10 rounded-full" />
                </div>
              </motion.div>
            </div>

            {/* ── Main message ── */}
            <div className="text-center px-4 mt-6">
              <h2 className="text-2xl md:text-3xl font-serif font-black italic text-text-main leading-tight tracking-tighter mb-4">
                Tu bitácora espera<br />su primera entrada
              </h2>
              <p className="text-sm text-text-light leading-relaxed max-w-xs mx-auto">
                Guarda las villas que te roben el aliento y compáralas aquí antes de reservar.
              </p>
            </div>

            {/* ── CTA ── */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/')}
                className="group relative flex items-center gap-3 bg-primary text-white font-black py-5 px-10 rounded-2xl shadow-lg shadow-primary/25 overflow-hidden transition-all duration-300 text-sm uppercase tracking-widest"
              >
                <span className="relative z-10">Explorar Destinos</span>
                <Sparkles className="w-4 h-4 relative z-10" />
                <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </motion.button>

              <p className="text-[10px] text-text-light/50 uppercase tracking-[0.3em] font-semibold">Sin compromisos</p>
            </div>

            {/* ── Salty quote ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-4 bg-secondary/5 border border-secondary/10 rounded-[2rem] p-6 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-lg">⚓</span>
              </div>
              <div>
                <p className="text-xs text-text-main font-semibold leading-relaxed italic">
                  "El primer paso de un gran viaje es elegir el refugio perfecto."
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mt-2">— Salty Concierge</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Favorites;
