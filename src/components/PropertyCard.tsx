import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart, Sparkles, Flame, Zap, Compass, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Property } from '../types';
import SmartImage from './SmartImage';

interface PropertyCardProps {
  property: Property;
  index: number;
  onClick?: (id: string) => void | Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  priority?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  index,
  onClick,
  isFavorite,
  onToggleFavorite,
  priority = false
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

  const viewers = React.useMemo(() => {
    const base = (property.rating || 0) >= 4.9 ? 7 : 3;
    return Math.floor(Math.random() * 5) + base;
  }, [property.rating]);

  const getBadges = () => {
    return (
      <div className="flex flex-col gap-2 z-10 pointer-events-none mt-2">
        {(property.rating || 0) >= 4.9 && (
          <div className="bg-[#B39B59] px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-[0.25em] text-white shadow-md flex items-center gap-1.5 border border-white/20 animate-fade-in w-fit">
            <Sparkles size={10} className="text-white" />
            Reserva Privada
          </div>
        )}

        {/* 🔱 SALTY POWER BADGES: Reserved for dynamic alerts */}
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
      className="group cursor-pointer relative bg-white rounded-[2.5rem] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-700 flex flex-col border border-secondary/5 transform-gpu"
    >
      {/* Visual Header / Media */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden m-2 rounded-[2rem]">
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            {/* 🔱 VRR SIGNATURE BADGE */}
            <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: delay / 1000 + 0.3 }}
               className="bg-secondary/80 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg"
            >
              <div className="w-4 h-4 text-primary">
                 <svg viewBox="0 0 100 100" fill="currentColor"><text y="70" x="50" text-anchor="middle" font-family="serif" font-weight="black" font-style="italic" font-size="50">VRR</text></svg>
              </div>
              <span className="text-[8px] font-black text-white uppercase tracking-[0.3em] leading-none">Signature Stay</span>
            </motion.div>
            {getBadges()}
        </div>
        
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(property.id); }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border ${
              isFavorite 
                ? 'bg-primary border-primary text-white' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            <Star size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
        </div>

        {/* 🎥 LIQUID IMAGE: Dynamic cropping & parallax */}
        <div 
          className="absolute inset-0 scale-110"
          style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
        >
          <motion.div style={{ y }} className="h-full w-full">
            <SmartImage
              src={property.images[currentImageIndex]}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt={property.title || 'Villa'}
              priority={priority}
            />
          </motion.div>
        </div>

        {/* 📸 VRR WATERMARK (SUBTLE) */}
        <div className="absolute bottom-5 right-5 z-20 opacity-20 pointer-events-none mix-blend-overlay">
           <svg viewBox="0 0 100 100" className="w-12 h-12 text-white fill-current">
              <text y="70" x="50" textAnchor="middle" fontFamily="serif" fontWeight="black" fontStyle="italic" fontSize="40">VRR</text>
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
           </svg>
        </div>

        {/* Gradient Overlay for Legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent"></div>

        {/* Removed floating viewer count to un-obstruct image */}

        {/* 🏹 NAV ARROWS: Premium navigation */}
        <div className="absolute inset-0 z-20 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : property.images.length - 1));
            }}
            className="w-10 h-10 rounded-full bg-secondary/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-secondary transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentImageIndex((prev) => (prev < property.images.length - 1 ? prev + 1 : 0));
            }}
            className="w-10 h-10 rounded-full bg-secondary/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-secondary transition-all active:scale-90"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Stitched Image Navigation (Mobile & Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-5 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-500 z-30">
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
        {/* Integrated Real-time viewer count */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B39B59] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#B39B59]"></span>
          </div>
          <span className="text-[10px] font-semibold text-text-light uppercase tracking-[0.2em]">{viewers} personas mirando ahora</span>
        </div>

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
            <p className="text-[10px] font-bold uppercase text-gray-500 tracking-[0.3em]">{property.location}</p>
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
            <div className="flex items-baseline gap-1.5 bg-primary px-4 py-2 rounded-2xl border border-primary/20 shadow-lg group-hover:shadow-primary/20 transition-all duration-500">
              <span className="font-black text-2xl text-secondary">${property.price || 0}</span>
              <span className="text-[10px] font-semibold uppercase opacity-80 text-secondary/70 tracking-[0.25em]">/noche</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PropertyCard;