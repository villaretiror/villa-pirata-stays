import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, Sparkles, Flame, Zap, Compass, MessageCircle } from 'lucide-react';
import { Property } from '../types';
import SmartImage from './SmartImage';

interface PropertyCardProps {
  property: Property;
  index: number;
  onClick?: (id: string) => void | Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  index, 
  onClick, 
  isFavorite, 
  onToggleFavorite 
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
        {(property.rating || 0) >= 4.9 && (
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-text-main shadow-lg flex items-center gap-1.5 ring-1 ring-black/5 animate-fade-in opacity-80 group-hover:opacity-100 transition-opacity">
            <Flame size={10} className="text-primary fill-primary" />
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
              <div className="bg-black text-[#F4EBD0] px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5 ring-1 ring-white/10">
                <Zap size={10} className="text-secondary fill-secondary" />
                Salty Direct™ -15%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.21, 1.11, 0.81, 0.99] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (onClick) onClick(property.id);
        else navigate(`/property/${property.id}`);
      }}
      className="group cursor-pointer relative bg-white rounded-[2.5rem] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-700 flex flex-col border border-black/5"
    >
      {/* Visual Header / Media */}
      <div className="relative aspect-[4/5] overflow-hidden m-2 rounded-[2rem]">
        {getBadges()}
        
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                if (onToggleFavorite) onToggleFavorite(property.id);
            }}
            className={`w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center transition-all active:scale-90 ${isFavorite ? 'text-red-500 bg-white/40' : 'text-white hover:bg-white hover:text-red-500'}`}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* 🎥 LIQUID IMAGE: Dynamic cropping & parallax */}
        <div className="absolute inset-0 scale-110">
          <motion.div style={{ y }} className="h-full w-full">
            <SmartImage 
              src={property.images[currentImageIndex]} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt={property.title || 'Villa'}
            />
          </motion.div>
        </div>

        {/* Gradient Overlay for Legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent"></div>

        {/* Real-time viewer count */}
        <div className="absolute bottom-5 left-5 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 group/viewer">
           <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">{viewers} mirando ahora</span>
        </div>

        {/* Stitched Image Navigation (Mobile & Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-5 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-500">
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
          <h3 className="text-xl font-serif font-black italic tracking-tighter text-text-main mb-1 group-hover:text-primary transition-colors">
            {property.title || 'Estancia De Colección'}
          </h3>
          <div className="flex items-center gap-1.5 bg-secondary/5 px-3 py-1.5 rounded-xl border border-secondary/10 shadow-sm">
            <Star size={14} className="text-primary fill-primary" />
            <span className="text-sm font-black text-secondary">{(property.rating || 0).toFixed(2)}</span>
          </div>
        </div>

        <p className="text-text-light text-[13px] font-medium line-clamp-1 mb-6 opacity-70 italic">{property.subtitle || 'Boutique Stay'}</p>

        <div className="flex items-end justify-between border-t border-gray-100/50 pt-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{property.location}</p>
            <div className="flex items-center gap-2 text-text-main font-bold text-[11px] uppercase tracking-widest">
              <Users size={14} className="text-primary" />
              {Number(property.guests) || 1} Personas
            </div>
          </div>

          <div className="text-right">
             {property.original_price && (
                <span className="block text-[10px] font-black text-red-500 line-through decoration-red-500/60 mb-1 drop-shadow-sm">
                  ${property.original_price}
                </span>
             )}
            <div className="flex items-baseline gap-1.5 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 shadow-inner">
              <span className="font-black text-2xl text-text-main">${property.price || 0}</span>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">/noche</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PropertyCard;