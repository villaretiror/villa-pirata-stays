import React, { useState } from 'react';
import SmartImage from './SmartImage';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onClick: (id: string) => void;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, index, isFavorite = false, onToggleFavorite }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Staggered animation delay based on index
  const delay = index * 100;

  const getBadge = () => {
    if (property.rating >= 4.9) {
      return (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-text-main shadow-lg z-10 flex items-center gap-1.5 ring-1 ring-black/5">
          <span className="material-icons text-sm text-primary">local_fire_department</span>
          Popular
        </div>
      );
    }
    return (
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-secondary shadow-lg z-10 flex items-center gap-1.5 ring-1 ring-black/5">
        <span className="material-icons text-sm text-secondary">diamond</span>
        Exclusivo
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
    <article
      onClick={() => onClick(property.id)}
      className="group relative bg-white rounded-[2rem] shadow-card hover:shadow-float transition-all duration-500 transform hover:-translate-y-1 overflow-hidden animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image Container */}
      <div className="relative h-80 w-full overflow-hidden">
        <SmartImage
          src={property.images[currentImageIndex]}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Gradient Overlay for Text Readability at bottom (if we put text over image) - Used here for depth */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>

        {/* Badges */}
        {getBadge()}

        {/* Emergency Badge */}
        {property.isOffline && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
            <span className="material-icons text-5xl mb-3 text-red-500 animate-pulse">report_problem</span>
            <h4 className="font-bold text-lg uppercase tracking-widest">Fuera de Servicio</h4>
            <p className="text-xs opacity-80 mt-1">Esta propiedad está en mantenimiento o bajo emergencia. Regresa pronto.</p>
          </div>
        )}

        {/* Fav Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-white transition-all z-10 flex items-center justify-center border border-white/20 group/fav"
        >
          <span className={`material-icons text-xl drop-shadow-sm transition-transform group-active/fav:scale-75 ${isFavorite ? 'text-red-500 scale-110' : 'text-white group-hover/fav:text-red-500'}`}>
            {isFavorite ? 'favorite' : 'favorite_border'}
          </span>
        </button>

        {/* Image Nav */}
        {property.images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
            >
              <span className="material-icons text-sm">chevron_left</span>
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
            >
              <span className="material-icons text-sm">chevron_right</span>
            </button>
          </div>
        )}

        {/* Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
          {property.images.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(i);
              }}
              className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${i === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
              aria-label={`Ir a imagen ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-serif font-bold text-text-main text-xl leading-snug flex-1 mr-2 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            <span className="material-icons text-sm text-primary">star</span>
            <span className="text-xs font-bold">{property.rating}</span>
          </div>
        </div>

        <p className="text-text-light text-sm line-clamp-1 mb-4">{property.subtitle}</p>

        <div className="flex items-end justify-between border-t border-gray-100 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5">{property.location}</p>
            <div className="flex items-center gap-1 text-secondary font-medium text-xs">
              <span className="material-icons text-sm">group</span>
              {property.guests} Huéspedes
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-gray-400 line-through decoration-red-400 mb-0.5">${Math.round(property.price * 1.15)}</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-xl text-text-main">${property.price}</span>
              <span className="text-xs font-medium text-gray-400">/noche</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;