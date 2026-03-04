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
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('vp_properties');
      return saved ? JSON.parse(saved) : PROPERTIES;
    } catch { return PROPERTIES; }
  });

  const [localGuideData, setLocalGuideData] = useState<LocalGuideCategory[]>(() => {
    try {
      const saved = localStorage.getItem('vp_guide');
      return saved ? JSON.parse(saved) : INITIAL_LOCAL_GUIDE;
    } catch { return INITIAL_LOCAL_GUIDE; }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Efectos de Sincronización
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('vp_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('vp_guide', JSON.stringify(localGuideData));
  }, [localGuideData]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const updateProperties = (updated: Property[]) => setProperties(updated);
  const updateGuide = (updated: LocalGuideCategory[]) => setLocalGuideData(updated);

  return (
    <PropertyContext.Provider value={{
      properties, localGuideData, favorites, toggleFavorite, updateProperties, updateGuide
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
