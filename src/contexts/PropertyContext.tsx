import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property, LocalGuideCategory, SiteContent, VillaKnowledge } from '../types';
import { INITIAL_LOCAL_GUIDE, DEFAULT_SITE_CONTENT, DEFAULT_VILLA_KNOWLEDGE, PROPERTIES } from '../constants';
import { supabase, isConfigured } from '../lib/supabase';
import { mapSupabaseProperty } from '../utils/mappers';
import { Database } from '../supabase_types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type SettingRow = Database['public']['Tables']['system_settings']['Row'];

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  secretSpots: any[];
  bookings: any[];
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
  // Use local storage for initial state to avoid layout shifts
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('vp_properties');
      return (saved && JSON.parse(saved).length > 0) ? JSON.parse(saved) : PROPERTIES;
    } catch { return PROPERTIES; }
  });

  const [isLoading, setIsLoading] = useState(properties.length === PROPERTIES.length);
  const [localGuideData, setLocalGuideData] = useState<LocalGuideCategory[]>(INITIAL_LOCAL_GUIDE);
  const [secretSpots, setSecretSpots] = useState<any[]>([]);
  const [villaKnowledge, setVillaKnowledge] = useState<VillaKnowledge>(DEFAULT_VILLA_KNOWLEDGE);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [bookings, setBookings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Track the active AbortController to cleanup previous requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable dependency key for site content sections to avoid fetch loops
  const sectionsHash = useMemo(() => 
    JSON.stringify(siteContent?.sections || {}), 
    [siteContent?.sections]
  );

  const fetchPropertiesFromDB = useCallback(async (signal?: AbortSignal) => {
    if (properties.length === 0) setIsLoading(true);
    
    // Safety Fallbacks Setup
    let finalProperties = [...PROPERTIES];
    let finalGuide = [...INITIAL_LOCAL_GUIDE];
    let finalBookings = [];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Parallel Fetch with lux error handling
      const [propRes, bookingRes, guideRes, settingsRes] = await Promise.all([
        supabase.from('properties').select('*').or('is_offline.eq.false,is_offline.is.null').abortSignal(signal),
        supabase.from('bookings').select('*').neq('status', 'cancelled').abortSignal(signal),
        supabase.from('destination_guides').select('*').eq('is_active', true).order('sort_order', { ascending: true }).abortSignal(signal),
        supabase.from('system_settings').select('key, value').abortSignal(signal)
      ]);

      // Handle Properties with fallback
      if (propRes.data && propRes.data.length > 0) {
        const isAdmin = user?.email === 'villaretiror@gmail.com';
        finalProperties = (propRes.data as PropertyRow[]).map(p => mapSupabaseProperty(p, undefined, { isAdmin }));
      } else if (propRes.error) {
        console.warn("🔱 Salty Warning: Property fetch failed, deploying safe landing data.", propRes.error);
      }

      // Handle Bookings
      if (bookingRes.data) {
        setBookings(bookingRes.data);
      }

      // 🔱 DYNAMIC CATEGORY DISCOVERY MOTOR (Salty 6.0)
      if (guideRes.data && guideRes.data.length > 0) {
        const rows = guideRes.data as any[];
        
        // 🛡️ ID NORMALIZATION MAP: Unifies DB categories with Frontend IDs
        const idMap: Record<string, string> = {
          beach: 'beaches',
          playa: 'beaches',
          beaches: 'beaches',
          food: 'gastronomy',
          gastronomia: 'gastronomy',
          restaurantes: 'gastronomy',
          gastronomy: 'gastronomy',
          landmark: 'nearby',
          nearby: 'nearby',
          places: 'nearby'
        };

        const iconMap: Record<string, string> = {
          beaches: 'beach_access',
          gastronomy: 'restaurant',
          nearby: 'place',
          otros: 'explore'
        };

        const displayLabelMap: Record<string, string> = {
          beaches: siteContent?.sections.beaches || 'Playas del Paraíso',
          gastronomy: siteContent?.sections.gastronomy || 'Ruta Gastronómica',
          nearby: siteContent?.sections.nearby || 'Cerca de Ti'
        };

        // Group by normalized ID
        const unifiedGroups = new Map<string, any[]>();
        rows.forEach((r) => {
          const raw = (r.category || 'otros').trim().toLowerCase();
          const normId = idMap[raw] || raw;
          if (!unifiedGroups.has(normId)) unifiedGroups.set(normId, []);
          unifiedGroups.get(normId)!.push(r);
        });

        finalGuide = Array.from(unifiedGroups.entries()).map(([id, items]) => ({
          id,
          dbKey: id, // Mapping back for simpler tracking
          category: displayLabelMap[id] || id.charAt(0).toUpperCase() + id.slice(1),
          icon: iconMap[id] || 'explore',
          items: items.map(r => ({
            id: r.id,
            name: r.title,
            distance: r.distance || '5-10 min',
            desc: r.description || '',
            image: r.image_url?.startsWith('http') || r.image_url?.startsWith('/')
              ? r.image_url 
              : `https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/${r.image_url}`,
            mapUrl: r.map_url || '',
            saltyTip: r.salty_tip || '',
            sortOrder: r.sort_order || 0
          })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        }));
      }

      // Handle Settings
      if (settingsRes.data) {
        const typedSettings = settingsRes.data as SettingRow[];
        const secrets = typedSettings.find(s => s.key === 'secret_spots')?.value;
        if (secrets) setSecretSpots(secrets as any[]);

        const knowledge = typedSettings.find(s => s.key === 'villa_knowledge')?.value;
        if (knowledge) setVillaKnowledge(knowledge as any);

        const content = typedSettings.find(s => s.key === 'site_content')?.value;
        if (content) {
          const fetchedContent = content as any;
          setSiteContent(prev => {
            const next = { 
              ...prev, 
              ...fetchedContent,
              contact: { ...prev.contact, ...(fetchedContent.contact || {}) },
              hero: { ...prev.hero, ...(fetchedContent.hero || {}) },
              sections: { ...prev.sections, ...(fetchedContent.sections || {}) }
            };
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
        }
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("🔱 Salty Critical: Engine failure in fetchPropertiesFromDB. Switching to backup manual controls.", err);
      }
    } finally {
      // Commit final data (either from DB or Fallbacks)
      setProperties(prev => JSON.stringify(prev) === JSON.stringify(finalProperties) ? prev : finalProperties);
      setLocalGuideData(prev => JSON.stringify(prev) === JSON.stringify(finalGuide) ? prev : finalGuide);
      setIsLoading(false);
    }
  }, [sectionsHash, properties.length]);

  // Main Effect with enhanced AbortController cleanup
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchPropertiesFromDB(controller.signal);

    const setupSubscription = async () => {
      if (!isConfigured) return;
      
      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, 
          () => fetchPropertiesFromDB())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, 
          () => fetchPropertiesFromDB())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'destination_guides' }, 
          () => fetchPropertiesFromDB())
        .subscribe();

      return channel;
    };

    const channelPromise = setupSubscription();

    return () => {
      controller.abort();
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [fetchPropertiesFromDB]);

  // Persistence Effects
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

  const updateGuide = useCallback((updated: LocalGuideCategory[]) => {
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
      sort_order: item.sort_order || 0,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    if (item.id) await supabase.from('destination_guides').update(payload).eq('id', item.id);
    else await supabase.from('destination_guides').insert(payload);
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const deleteGuideItem = useCallback(async (id: string) => {
    await supabase.from('destination_guides').update({ is_active: false }).eq('id', id);
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveSiteContent = useCallback(async (content: SiteContent) => {
    await supabase.from('system_settings').upsert({
      key: 'site_content',
      value: content as any,
      updated_at: new Date().toISOString()
    });
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveVillaKnowledge = useCallback(async (knowledge: VillaKnowledge) => {
    await supabase.from('system_settings').upsert({
      key: 'villa_knowledge',
      value: knowledge as any,
      updated_at: new Date().toISOString()
    });
    await fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const value = useMemo(() => ({
    properties,
    localGuideData,
    secretSpots,
    villaKnowledge,
    siteContent,
    bookings,
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
  }), [
    properties, localGuideData, secretSpots, villaKnowledge, siteContent, 
    bookings, favorites, isLoading, toggleFavorite, updateProperties, 
    updateGuide, saveGuideItem, deleteGuideItem, saveSiteContent, 
    saveVillaKnowledge, fetchPropertiesFromDB
  ]);

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) throw new Error('useProperty must be used within a PropertyProvider');
  return context;
};
