import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Property, LocalGuideCategory } from '../types';
import { INITIAL_LOCAL_GUIDE } from '../constants';
import { supabase, isConfigured } from '../lib/supabase';
import { Database } from '../supabase_types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type SettingRow = Database['public']['Tables']['system_settings']['Row'];

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  secretSpots: any[];
  villaKnowledge: any;
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

  const [secretSpots, setSecretSpots] = useState<any[]>([]);
  const [villaKnowledge, setVillaKnowledge] = useState<any>(null);

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
      const { data, error } = await supabase.from('properties')
        .select('*')
        .or('isOffline.eq.false,isOffline.is.null')
        .abortSignal(signal || new AbortController().signal);
      
      if (error) throw error;
      if (data) {
        console.log('Propiedades recibidas del DB:', data);
        const isAdmin = session?.user?.email === 'villaretiror@gmail.com';
        const mapped: Property[] = (data as PropertyRow[]).map(p => {
          // Safe JSON parsing for policies
          const rawPolicies: any = p.policies;
          const policies = {
            checkInTime: rawPolicies?.checkInTime || '15:00',
            checkOutTime: rawPolicies?.checkOutTime || '11:00',
            guests: Number(rawPolicies?.guests || p.guests) || 1,
            wifiName: rawPolicies?.wifiName || '',
            wifiPass: isAdmin ? rawPolicies?.wifiPass || 'N/A' : '********',
            accessCode: isAdmin ? rawPolicies?.accessCode || 'N/A' : 'CONFIDENCIAL',
            cancellationPolicy: rawPolicies?.cancellationPolicy,
            houseRules: p.house_rules || rawPolicies?.houseRules || []
          };

          return {
            ...p,
            id: String(p.id),
            title: p.title || 'Propiedad sin título',
            subtitle: p.subtitle || '',
            location: p.location || '',
            address: p.address || '',
            description: p.description || '',
            price: Number(p.price) || 0,
            original_price: p.original_price != null ? Number(p.original_price) : null,
            cleaning_fee: Number(p.cleaning_fee) || 0,
            service_fee: Number(p.service_fee) || 0,
            security_deposit: Number(p.security_deposit) || 0,
            rating: Number(p.rating) || 0,
            reviews_count: Number(p.reviews) || 0,
            images: p.images || [],
            amenities: p.amenities || [],
            guests: Number(p.guests) || 1,
            bedrooms: Number(p.bedrooms) || 0,
            beds: Number(p.beds) || 0,
            baths: Number(p.baths) || 0,
            fees: (p.fees as any) || {},
            policies: policies,
            blockedDates: p.blockedDates || [],
            calendarSync: (p.calendarSync as any[]) || [],
            seasonal_prices: (p.seasonal_prices as any[]) || [],
            host: (p.host as any) || { name: 'Anfitrión', image: '', badges: [], yearsHosting: 0 }
          } as Property;
        });
        setProperties(prev => JSON.stringify(prev) === JSON.stringify(mapped) ? prev : mapped);

        // 1b. Fetch System Settings (Guidebook)
        const { data: settings } = await supabase.from('system_settings').select('key, value');
        if (settings) {
          const typedSettings = settings as SettingRow[];
          const guide = typedSettings.find(s => s.key === 'local_guide_data')?.value;
          if (guide) setLocalGuideData(guide as any);

          const secrets = typedSettings.find(s => s.key === 'secret_spots')?.value;
          if (secrets) setSecretSpots(secrets as any[]);

          const knowledge = typedSettings.find(s => s.key === 'villa_knowledge')?.value;
          if (knowledge) setVillaKnowledge(knowledge);
        }
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

  const updateGuide = useCallback(async (updated: LocalGuideCategory[]) => {
    setLocalGuideData(prev => JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated);
    
    // Persistir en Supabase
    const { error } = await supabase.from('system_settings').upsert({
      key: 'local_guide_data',
      value: updated,
      updated_at: new Date().toISOString()
    });
    
    if (error) console.error("Error saving guide to DB:", error);
  }, []);

  const value = useMemo(() => ({
    properties,
    localGuideData,
    secretSpots,
    villaKnowledge,
    favorites,
    isLoading,
    toggleFavorite,
    updateProperties,
    updateGuide,
    refreshProperties: fetchPropertiesFromDB
  }), [properties, localGuideData, secretSpots, villaKnowledge, favorites, isLoading, toggleFavorite, updateProperties, updateGuide, fetchPropertiesFromDB]);

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
