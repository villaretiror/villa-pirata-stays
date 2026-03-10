import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property, LocalGuideCategory } from '../types';
import { INITIAL_LOCAL_GUIDE } from '../constants';
import { supabase } from '../lib/supabase';

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (id: string) => void;
  updateProperties: (updated: Property[]) => void;
  updateGuide: (updated: LocalGuideCategory[]) => void;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('vp_properties');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
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

  // 1. Initial Fresh Fetch & Realtime Subscription
  const fetchPropertiesFromDB = async (signal?: AbortSignal) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from('properties').select('*').or('isOffline.eq.false,isOffline.is.null').abortSignal(signal || new AbortController().signal);
      if (error) throw error;
      if (data) {
        console.log('Propiedades recibidas del DB:', data);
        const isAdmin = session?.user?.email === 'villaretiror@gmail.com';
        const mapped: Property[] = data.map((p: any) => ({
          ...p,
          id: String(p.id), // Ensure ID is always a string to prevent large ID overflow in JS
          // Minimal security spread while maintaining clean structural mapping
          policies: {
            ...p.policies,
            wifiPass: isAdmin ? p.policies?.wifiPass : '********',
            accessCode: isAdmin ? p.policies?.accessCode : 'CONFIDENCIAL'
          }
        })) as Property[];
        setProperties(mapped);
      }
    } catch (err: any) {
      console.error("--- SUPABASE FETCH ERROR (CRITICAL) ---");
      console.error("Message:", err?.message);
      console.error("Details:", err?.details);
      console.error("Hint:", err?.hint);
      console.error("Full Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPropertiesFromDB(controller.signal);

    // 2. Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        () => {
          console.log("Realtime: Property update detected, refreshing state...");
          fetchPropertiesFromDB();
        }
      )
      .subscribe();

    return () => {
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, []);

  // Efectos de Sincronización Local (Backup)
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
      properties,
      localGuideData,
      favorites,
      isLoading,
      toggleFavorite,
      updateProperties,
      updateGuide,
      refreshProperties: fetchPropertiesFromDB
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
