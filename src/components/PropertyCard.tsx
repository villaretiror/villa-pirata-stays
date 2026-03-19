import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import SmartImage from './SmartImage';
import { Property } from '../types';
import { 
  Star, 
  Users, 
  Eye, 
  Flame, 
  AlertTriangle, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Dog
} from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onClick: (id: string) => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, index, isFavorite = false, onToggleFavorite }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // 🌊 LIQUID PARALLAX: Image moves within its frame on scroll
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [-40, 40]);

  // Staggered animation delay based on index
  const delay = index * 100;

  const viewers = React.useMemo(() => Math.floor(Math.random() * (8 - 3 + 1)) + 3, []);

  const getBadges = () => {
    return (
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
        {property.rating >= 4.9 && (
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-main shadow-lg flex items-center gap-1.5 ring-1 ring-black/5 animate-fade-in">
            <Flame size={12} className="text-primary fill-primary" />
            Popular
          </div>
        )}
        
        {/* 🔱 SALTY POWER BADGES: Reveal on hover for a clean default look */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-2"
            >
              <div className="bg-primary/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-xl flex items-center gap-1.5 ring-1 ring-white/20">
                <Shield size={12} fill="white" className="opacity-80" />
                Respaldo Solar Activo
              </div>
              {property.title.includes('Retiro') && (
                  <div className="bg-secondary/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-xl flex items-center gap-1.5 ring-1 ring-white/20">
                    <Dog size={12} fill="white" className="opacity-80" />
                    Patio Seguro 🛡️
                  </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg flex items-center gap-1.5 border border-white/10 animate-fade-in">
          <Eye size={12} className="text-primary animate-pulse" />
          {viewers} Viendo ahora
        </div>
      </div>
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(property.id);
    }
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(property.id)}
      className="group relative bg-white rounded-[2.5rem] shadow-card hover:shadow-float transition-all duration-700 overflow-hidden cursor-none"
    >
      {/* Image Container */}
      <div className="relative h-80 w-full overflow-hidden" data-cursor="experience">
        <motion.div 
            style={{ y }}
            className="absolute inset-0 scale-110"
        >
            <SmartImage
              src={property.images[currentImageIndex]}
              alt={property.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
        </motion.div>

        {/* Gradient Overlay for depth */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 pointer-events-none"></div>

        {/* Badges */}
        {getBadges()}

        {/* Emergency Badge */}
        {property.isOffline && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
            <AlertTriangle size={48} className="mb-3 text-red-500 animate-pulse" />
            <h4 className="font-bold text-lg uppercase tracking-widest">Fuera de Servicio</h4>
            <p className="text-xs opacity-80 mt-1 italic">Mantenimiento Preventivo 🔱</p>
          </div>
        )}

        {/* Fav Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl hover:bg-white transition-all z-10 flex items-center justify-center border border-white/30 group/fav shadow-xl"
        >
          <Heart 
            size={22} 
            fill={isFavorite ? '#EF4444' : 'none'} 
            className={`drop-shadow-sm transition-transform group-active/fav:scale-75 ${isFavorite ? 'text-red-500 scale-110' : 'text-white group-hover/fav:text-red-500'}`} 
          />
        </button>

        {/* Image Nav */}
        {property.images.length > 1 && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Dots */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
          {property.images.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(i);
              }}
              className={`h-1.5 rounded-full shadow-inner transition-all duration-500 ${i === currentImageIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/60'}`}
              aria-label={`Ir a imagen ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-serif font-bold text-text-main text-2xl leading-none flex-1 mr-2 group-hover:text-primary transition-colors tracking-tight">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 bg-secondary/5 px-3 py-1.5 rounded-xl border border-secondary/10 shadow-sm">
            <Star size={14} className="text-primary fill-primary" />
            <span className="text-sm font-black text-secondary">{property.rating}</span>
          </div>
        </div>

        <p className="text-text-light text-[13px] font-medium line-clamp-1 mb-6 opacity-70 italic">{property.subtitle}</p>

        <div className="flex items-end justify-between border-t border-gray-100/50 pt-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{property.location}</p>
            <div className="flex items-center gap-2 text-text-main font-bold text-[11px] uppercase tracking-widest">
              <Users size={14} className="text-primary" />
              {Number(property.guests) || 1} Personas
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[10px] font-black text-red-400/80 line-through decoration-red-400/40 mb-1">
              ${property.original_price && property.original_price > property.price ? property.original_price : Math.round(property.price * 1.15)}
            </span>
            <div className="flex items-baseline gap-1.5 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 shadow-inner">
              <span className="font-black text-2xl text-text-main">${property.price}</span>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">/noche</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PropertyCard;