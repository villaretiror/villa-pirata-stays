import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property, LocalGuideCategory } from '../types';
import { PROPERTIES, INITIAL_LOCAL_GUIDE } from '../constants';

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  updateProperties: (updated: Property[]) => void;
  updateGuide: (updated: LocalGuideCategory[]) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>(PROPERTIES);
  const [localGuideData, setLocalGuideData] = useState<LocalGuideCategory[]>(INITIAL_LOCAL_GUIDE);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(favId => favId !== id) 
        : [...prev, id]
    );
  };

  const updateProperties = (updated: Property[]) => {
    setProperties(updated);
  };

  const updateGuide = (updated: LocalGuideCategory[]) => {
    setLocalGuideData(updated);
  };

  return (
    <PropertyContext.Provider value={{
      properties,
      localGuideData,
      favorites,
      toggleFavorite,
      updateProperties,
      updateGuide
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
