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
      <div className="flex items-center gap-4 mb-10 mt-2">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md border border-orange-50">
          <span className="material-icons text-primary text-3xl">favorite</span>
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-text-main mb-1">Tus Favoritos</h1>
          <p className="text-sm text-text-light font-medium">{favoriteProperties.length} {favoriteProperties.length === 1 ? 'propiedad guardada' : 'propiedades guardadas'}</p>
        </div>
      </div>

      {favoriteProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
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
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-24 h-24 bg-white shadow-soft rounded-full flex items-center justify-center mb-6 border border-gray-100">
            <span className="material-icons text-5xl text-gray-300">favorite_border</span>
          </div>
          <h3 className="font-serif font-bold text-2xl text-text-main mb-3">Aún no tienes favoritos</h3>
          <p className="text-text-light text-base max-w-xs mb-8">
            Explora nuestras villas y guarda las que más te gusten tocando el corazón en la página principal.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-orange-600 active:scale-95 transition-all text-white font-bold py-3.5 px-8 rounded-xl shadow-md flex items-center gap-2"
          >
            <span className="material-icons text-lg">travel_explore</span>
            Explorar villas
          </button>
        </div>
      )}
    </div>
  );
};

export default Favorites;
