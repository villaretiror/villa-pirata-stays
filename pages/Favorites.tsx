import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { useProperty } from '../contexts/PropertyContext';

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite } = useProperty();
  const favoriteProperties = properties.filter(p => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-sand pb-24 px-4 pt-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-soft">
           <span className="material-icons text-primary text-2xl">favorite</span>
        </div>
        <div>
           <h1 className="text-2xl font-serif font-bold text-text-main">Tus Favoritos</h1>
           <p className="text-xs text-text-light">{favoriteProperties.length} propiedades guardadas</p>
        </div>
      </div>

      {favoriteProperties.length > 0 ? (
        <div className="space-y-6">
          {favoriteProperties.map((property, index) => (
            <PropertyCard 
              key={property.id} 
              property={property} 
              index={index}
              onClick={(id) => navigate(`/property/${id}`)}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
           <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-4xl text-gray-300">favorite_border</span>
           </div>
           <h3 className="font-bold text-lg text-text-main mb-2">Aún no tienes favoritos</h3>
           <p className="text-text-light text-sm max-w-[200px] mb-6">
             Explora nuestras villas y guarda las que más te gusten tocando el corazón.
           </p>
        </div>
      )}
    </div>
  );
};

export default Favorites;
