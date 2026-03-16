import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Property, LocalGuideCategory, SiteContent, VillaKnowledge } from '../types';
import { INITIAL_LOCAL_GUIDE, DEFAULT_SITE_CONTENT, DEFAULT_VILLA_KNOWLEDGE, PROPERTIES } from '../constants';
import { supabase, isConfigured } from '../lib/supabase';
import { Database } from '../supabase_types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type SettingRow = Database['public']['Tables']['system_settings']['Row'];

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  secretSpots: any[];
  villaKnowledge: VillaKnowledge;
  siteContent: SiteContent;
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (id: string) => void;
  updateProperties: (updated: Property[]) => void;
  updateGuide: (updated: LocalGuideCategory[]) => void;
  saveGuideItem: (item: any, category: string) => Promise<void>;
  deleteGuideItem: (id: string) => Promise<void>;
  saveSiteContent: (content: SiteContent) => Promise<void>;
  saveVillaKnowledge: (knowledge: VillaKnowledge) => Promise<void>;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('vp_properties');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : PROPERTIES;
    } catch { return PROPERTIES; }
  });

  const [localGuideData, setLocalGuideData] = useState<LocalGuideCategory[]>(INITIAL_LOCAL_GUIDE);
  const [secretSpots, setSecretSpots] = useState<any[]>([]);
  const [villaKnowledge, setVillaKnowledge] = useState<VillaKnowledge>(DEFAULT_VILLA_KNOWLEDGE);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

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
      
      // A. Fetch Properties
      const { data: propData, error: propError } = await supabase.from('properties')
        .select('*', { abortSignal: signal || new AbortController().signal })
        .or('is_offline.eq.false,is_offline.is.null');
      
      if (propError) throw propError;

      // B. Fetch Dynamic Destination Guides (Integridad 360)
      const { data: guideRows, error: guideError } = await supabase
        .from('destination_guides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (guideError) console.error("Guide Fetch Error:", guideError);

      if (guideRows && guideRows.length > 0) {
        const categories = [
          { id: 'beaches', category: 'Playas del Paraíso', icon: 'beach_access', dbKey: 'beach' },
          { id: 'gastronomy', category: 'Ruta Gastronómica', icon: 'restaurant', dbKey: 'food' },
          { id: 'nearby', category: 'Cerca de Ti', icon: 'place', dbKey: 'landmark' }
        ];

        const mappedGuide: LocalGuideCategory[] = categories.map(cat => ({
          ...cat,
          items: (guideRows as any[])
            .filter(r => r.category === cat.dbKey)
            .map(r => ({
              id: r.id,
              name: r.title,
              distance: r.distance || '5-10 min',
              desc: r.description || '',
              image: r.image_url?.startsWith('http') 
                ? r.image_url 
                : r.image_url 
                  ? `https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/${r.image_url}`
                  : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1200', // Alt fallback
              mapUrl: r.map_url || '',
              saltyTip: r.salty_tip || '',
              sortOrder: r.sort_order || 0
            }))
        }));
        setLocalGuideData(mappedGuide);
      } else {
        // Anti-Error Protection: If DB results are empty, restore the luxury baseline immediately
        setLocalGuideData(INITIAL_LOCAL_GUIDE);
      }
      
      if (propData && propData.length > 0) {
        console.log('Propiedades recibidas del DB:', propData.length);
        const isAdmin = session?.user?.email === 'villaretiror@gmail.com';
        const mapped: Property[] = (propData as PropertyRow[]).map(p => {
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
            reviews_count: Number(p.reviews || (p as any).reviews_count) || 0,
            images: p.images || [],
            amenities: p.amenities || [],
            guests: Number(p.guests) || 1,
            bedrooms: Number(p.bedrooms) || 0,
            beds: Number(p.beds) || 0,
            baths: Number(p.baths) || 0,
            fees: (p.fees as any) || {},
            policies: policies,
            blockedDates: p.blockeddates || p.blockedDates || [],
            calendarSync: (p.calendarsync as any[]) || (p.calendarSync as any[]) || [],
            seasonal_prices: (p.seasonal_prices as any[]) || [],
            isOffline: p.is_offline || (p as any).isoffline || (p as any).isOffline || false,
            min_price_floor: Number(p.min_price_floor) || 0,
            max_discount_allowed: Number(p.max_discount_allowed) || 15,
            offers: (p as any).offers || [],
            reviews_list: (p as any).reviews_list || [],
            host: (p as any).host || { name: 'Anfitrión', image: '', badges: [], yearsHosting: 0 }
          } as Property;
        });
        setProperties(prev => JSON.stringify(prev) === JSON.stringify(mapped) ? prev : mapped);

        // C. Fetch Global System Settings (Integridad 360)
        const { data: settings } = await supabase.from('system_settings').select('key, value');
        if (settings) {
          const typedSettings = settings as SettingRow[];
          
          const secrets = typedSettings.find(s => s.key === 'secret_spots')?.value;
          if (secrets) setSecretSpots(secrets as any[]);

          const knowledge = typedSettings.find(s => s.key === 'villa_knowledge')?.value;
          if (knowledge) setVillaKnowledge(knowledge as any);

          const content = typedSettings.find(s => s.key === 'site_content')?.value;
          if (content) {
            setSiteContent(prev => ({ 
              ...prev, 
              ...(content as any),
              // Sanctuary of Data Rules: Ensure crucial sections (hero, contact) are merged, never wiped
              contact: { ...(prev.contact), ...((content as any).contact || {}) },
              hero: { ...(prev.hero), ...((content as any).hero || {}) },
              sections: { ...(prev.sections), ...((content as any).sections || {}) }
            }));
          }
        }
      } else {
        // Hybrid Mode Safe-Guard: If Supabase returns nothing, maintain local sanctuary
        console.warn("Properties table is empty or null, preserving local sanctuary data.");
        setProperties(prev => prev.length > 0 ? prev : PROPERTIES);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("fetchPropertiesFromDB Error:", err);
        // Emergency Fallback on Network Error
        setProperties(prev => prev.length > 0 ? prev : PROPERTIES);
        setLocalGuideData(prev => prev.length > 0 ? prev : INITIAL_LOCAL_GUIDE);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPropertiesFromDB(controller.signal);

    // 2. Realtime Subscription
    let channel: any = null;
    if (isConfigured) {
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'properties' },
          () => fetchPropertiesFromDB()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings' },
          () => fetchPropertiesFromDB()
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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const updateProperties = useCallback((updated: Property[]) => {
    setProperties(prev => JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated);
  }, []);

  const updateGuide = useCallback(async (updated: LocalGuideCategory[]) => {
    setLocalGuideData(prev => JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated);
  }, []);

  const saveGuideItem = useCallback(async (item: any, category: string) => {
    const payload = {
      category,
      title: item.name,
      distance: item.distance,
      description: item.desc,
      image_url: item.image,
      map_url: item.mapUrl,
      salty_tip: item.saltyTip,
      sort_order: item.sortOrder || 0,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (item.id) {
      result = await supabase.from('destination_guides').update(payload).eq('id', item.id);
    } else {
      result = await supabase.from('destination_guides').insert(payload);
    }

    if (result.error) throw result.error;
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const deleteGuideItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('destination_guides').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveSiteContent = useCallback(async (content: SiteContent) => {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'site_content',
      value: content as any,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveVillaKnowledge = useCallback(async (knowledge: VillaKnowledge) => {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'villa_knowledge',
      value: knowledge as any,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const value = useMemo(() => ({
    properties,
    localGuideData,
    secretSpots,
    villaKnowledge,
    siteContent,
    favorites,
    isLoading,
    toggleFavorite,
    updateProperties,
    updateGuide,
    saveGuideItem,
    deleteGuideItem,
    saveSiteContent,
    saveVillaKnowledge,
    refreshProperties: fetchPropertiesFromDB
  }), [properties, localGuideData, secretSpots, villaKnowledge, siteContent, favorites, isLoading, toggleFavorite, updateProperties, updateGuide, saveGuideItem, deleteGuideItem, saveSiteContent, saveVillaKnowledge, fetchPropertiesFromDB]);

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
