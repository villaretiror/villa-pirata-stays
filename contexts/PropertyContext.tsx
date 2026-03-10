import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Property, LocalGuideCategory } from '../types';
import { INITIAL_LOCAL_GUIDE } from '../constants';
import { supabase, isConfigured } from '../lib/supabase';

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
  const fetchPropertiesFromDB = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from('properties').select('*').or('isOffline.eq.false,isOffline.is.null').abortSignal(signal || new AbortController().signal);
      if (error) throw error;
      if (data) {
        console.log('Propiedades recibidas del DB:', data);
        const isAdmin = session?.user?.email === 'villaretiror@gmail.com';
        const mapped: Property[] = data.map((p: any) => ({
          ...p,
          id: String(p.id),
          guests: Number(p.guests || p.policies?.guests || p.policies?.maxGuests) || 1,
          price: Number(p.price) || 0,
          policies: {
            ...p.policies,
            guests: Number(p.policies?.guests || p.policies?.maxGuests || p.guests) || 1,
            wifiPass: isAdmin ? p.policies?.wifiPass : '********',
            accessCode: isAdmin ? p.policies?.accessCode : 'CONFIDENCIAL'
          }
        })) as Property[];
        setProperties(prev => JSON.stringify(prev) === JSON.stringify(mapped) ? prev : mapped);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("fetchPropertiesFromDB Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPropertiesFromDB(controller.signal);

    // 2. Realtime Subscription (Only if production keys present)
    let channel: any = null;
    if (isConfigured) {
      channel = supabase
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
    }

    return () => {
      controller.abort();
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchPropertiesFromDB]);

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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const updateProperties = useCallback((updated: Property[]) => {
    setProperties(prev => JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated);
  }, []);

  const updateGuide = useCallback((updated: LocalGuideCategory[]) => {
    setLocalGuideData(prev => JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated);
  }, []);

  const value = useMemo(() => ({
    properties,
    localGuideData,
    favorites,
    isLoading,
    toggleFavorite,
    updateProperties,
    updateGuide,
    refreshProperties: fetchPropertiesFromDB
  }), [properties, localGuideData, favorites, isLoading, toggleFavorite, updateProperties, updateGuide, fetchPropertiesFromDB]);

  return (
    <PropertyContext.Provider value={value}>
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
