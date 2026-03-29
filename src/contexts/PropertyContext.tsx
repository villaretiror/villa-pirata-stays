import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property, LocalGuideCategory, SiteContent, VillaKnowledge } from '../types';
import { INITIAL_LOCAL_GUIDE, DEFAULT_SITE_CONTENT, DEFAULT_VILLA_KNOWLEDGE, PROPERTIES } from '../constants';
import { supabase, isConfigured } from '../lib/supabase';
import { mapSupabaseProperty } from '../utils/mappers';
import { Database } from '../supabase_types';
import useSWR from 'swr';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type SettingRow = Database['public']['Tables']['system_settings']['Row'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];

// 🛰️ Local Interface for SyncedBlocks (Since they are missing from generated Types)
interface SyncedBlockRow {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  source?: string;
}

interface PropertyContextType {
  properties: Property[];
  localGuideData: LocalGuideCategory[];
  secretSpots: any[];
  bookings: BookingRow[];
  syncedBlocks: SyncedBlockRow[];
  villaKnowledge: VillaKnowledge;
  siteContent: SiteContent;
  favorites: string[];
  isLoading: boolean;
  error: any;
  toggleFavorite: (id: string) => void;
  updateProperties: (updated: Property[]) => void;
  updateGuide: (updated: LocalGuideCategory[]) => void;
  saveGuideItem: (item: any, category: string) => Promise<void>;
  deleteGuideItem: (id: string) => Promise<void>;
  saveSiteContent: (content: SiteContent) => Promise<void>;
  saveVillaKnowledge: (knowledge: VillaKnowledge) => Promise<void>;
  refreshProperties: () => Promise<void>;
  isRefreshing: boolean;
  getOccupiedDatesForProperty: (propertyId: string) => Date[];
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔱 SWR MASTER FETCHING (SALTY 6.0)
  const { data: dbProperties, error: pError, mutate: mutateProperties } = useSWR(
    isConfigured ? 'properties' : null,
    async () => {
      const { data, error: propResError } = await supabase
        .from('properties')
        .select('*')
        .or('is_offline.eq.false,is_offline.is.null');
      
      if (propResError) throw propResError;
      
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = user?.email === 'villaretiror.pr@gmail.com';
      return (data as PropertyRow[]).map(p => mapSupabaseProperty(p, undefined, { isAdmin }));
    },
    { 
      fallbackData: PROPERTIES,
      revalidateOnFocus: false,
      dedupingInterval: 60000 
    }
  );

  const [localGuideData, setLocalGuideData] = useState<LocalGuideCategory[]>(INITIAL_LOCAL_GUIDE);
  const [secretSpots, setSecretSpots] = useState<any[]>([]);
  const [villaKnowledge, setVillaKnowledge] = useState<VillaKnowledge>(DEFAULT_VILLA_KNOWLEDGE);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [syncedBlocks, setSyncedBlocks] = useState<SyncedBlockRow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const properties = dbProperties || PROPERTIES;
  const isLoading = !dbProperties && !pError;

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPropertiesFromDB = useCallback(async (signal?: AbortSignal) => {
    try {
      const [bookingRes, syncedRes, guideRes, settingsRes] = await Promise.all([
        supabase.from('bookings').select('*').neq('status', 'cancelled').abortSignal(signal),
        supabase.from('synced_blocks').select('*').abortSignal(signal),
        supabase.from('destination_guides').select('*').eq('is_active', true).order('sort_order', { ascending: true }).abortSignal(signal),
        supabase.from('system_settings').select('key, value').abortSignal(signal)
      ]);
      
      if (bookingRes.data) setBookings(bookingRes.data);
      if (syncedRes.data) setSyncedBlocks(syncedRes.data);

      if (guideRes.data && guideRes.data.length > 0) {
        const rows = guideRes.data as any[];
        const idMap: Record<string, string> = {
          beach: 'beaches', playa: 'beaches', beaches: 'beaches',
          food: 'gastronomy', gastronomia: 'gastronomy', restaurantes: 'gastronomy', gastronomy: 'gastronomy',
          landmark: 'nearby', nearby: 'nearby', places: 'nearby'
        };
        const iconMap: Record<string, string> = { beaches: 'beach_access', gastronomy: 'restaurant', nearby: 'place', otros: 'explore' };
        
        const unifiedGroups = new Map<string, any[]>();
        rows.forEach((r) => {
          const raw = (r.category || 'otros').trim().toLowerCase();
          const normId = idMap[raw] || raw;
          if (!unifiedGroups.has(normId)) unifiedGroups.set(normId, []);
          unifiedGroups.get(normId)!.push(r);
        });

        setLocalGuideData(Array.from(unifiedGroups.entries()).map(([id, items]) => ({
          id,
          category: id.charAt(0).toUpperCase() + id.slice(1),
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
          })).sort((a, b) => a.sortOrder - b.sortOrder)
        })));
      }

      if (settingsRes.data) {
        const typedSettings = settingsRes.data as SettingRow[];
        const secrets = typedSettings.find(s => s.key === 'secret_spots')?.value;
        if (secrets) setSecretSpots(secrets as any[]);
        const knowledge = typedSettings.find(s => s.key === 'villa_knowledge')?.value;
        if (knowledge) setVillaKnowledge(knowledge as any);
        const content = typedSettings.find(s => s.key === 'site_content')?.value;
        if (content) setSiteContent(prev => ({ ...prev, ...(content as any) }));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("🔱 Salty Error:", err);
    }
  }, []);

  // 🔱 UNIFIED AVAILABILITY SELECTOR (Elite Standard - v6.1)
  const getOccupiedDatesForProperty = useCallback((propertyId: string) => {
    // 🛡️ INVENTORY PROTECTION: Leads/Drafts do NOT block inventory
    const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
    
    const propertyBookings = bookings.filter(b => 
      b.property_id === propertyId && 
      BLOCKING_STATUSES.includes(b.status || '') &&
      b.status !== 'cancelled' && 
      b.status !== 'expired'
    );
    const propertySynced = syncedBlocks.filter(b => b.property_id === propertyId);
    const property = properties.find(p => p.id === propertyId);
    
    const blockedSet = new Set<string>();
    
    // 1. Bookings (Direct)
    propertyBookings.forEach(b => {
      let current = new Date(b.check_in + 'T12:00:00');
      const out = new Date(b.check_out + 'T12:00:00');
      while (current < out) {
        blockedSet.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    // 2. iCal Blocks
    propertySynced.forEach(b => {
      let current = new Date(b.check_in + 'T12:00:00');
      const out = new Date(b.check_out + 'T12:00:00');
      while (current < out) {
        blockedSet.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    // 3. Manual Blocks (from property JSON)
    const manual = (property?.blockeddates as string[]) || (property?.blockedDates as string[]) || [];
    manual.forEach(d => blockedSet.add(d));

    return Array.from(blockedSet).map(d => new Date(d + 'T12:00:00'));
  }, [bookings, syncedBlocks, properties]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchPropertiesFromDB(controller.signal);
    mutateProperties();

    if (isConfigured) {
      const channel = supabase.channel('schema-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => mutateProperties())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload: { new: BookingRow }) => {
           // 🔱 TRAFFIC OPTIMIZATION: Ignore silent lead/draft updates to prevent global re-renders
           const newStatus = payload.new ? (payload.new as any).status : null;
           if (newStatus === 'draft' || newStatus === 'lead' || newStatus === 'Web Direct (Lead)') {
             console.log("🔱 SALTY RADAR: Lead detectado (Silencioso).");
             return; 
           }
           
           console.log("🔱 SALTY RADAR: Cambios en reservas directas.");
           setIsRefreshing(true);
           await fetchPropertiesFromDB();
           setIsRefreshing(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'synced_blocks' }, async () => {
           console.log("🔱 SALTY RADAR: Bloqueo externo (iCal) detectado. Refrescando...");
           setIsRefreshing(true);
           await fetchPropertiesFromDB();
           setIsRefreshing(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => fetchPropertiesFromDB())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'destination_guides' }, () => fetchPropertiesFromDB())
        .subscribe();
      return () => { 
        controller.abort(); 
        supabase.removeChannel(channel); 
      };
    }
  }, [fetchPropertiesFromDB, mutateProperties]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const updateProperties = useCallback((updated: Property[]) => {
    mutateProperties(updated, { revalidate: false });
  }, [mutateProperties]);

  const updateGuide = useCallback((updated: LocalGuideCategory[]) => {
    setLocalGuideData(updated);
  }, []);

  const saveGuideItem = useCallback(async (item: any, category: string) => {
    const payload = { category, title: item.name, distance: item.distance, description: item.desc, image_url: item.image, map_url: item.mapUrl, salty_tip: item.saltyTip, sort_order: item.sort_order || 0, is_active: true, updated_at: new Date().toISOString() };
    if (item.id) await supabase.from('destination_guides').update(payload).eq('id', item.id);
    else await supabase.from('destination_guides').insert(payload);
    fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const deleteGuideItem = useCallback(async (id: string) => {
    await supabase.from('destination_guides').update({ is_active: false }).eq('id', id);
    fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveSiteContent = useCallback(async (content: SiteContent) => {
    await supabase.from('system_settings').upsert({ key: 'site_content', value: content as any, updated_at: new Date().toISOString() });
    fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const saveVillaKnowledge = useCallback(async (knowledge: VillaKnowledge) => {
    await supabase.from('system_settings').upsert({ key: 'villa_knowledge', value: knowledge as any, updated_at: new Date().toISOString() });
    fetchPropertiesFromDB();
  }, [fetchPropertiesFromDB]);

  const value: PropertyContextType = {
    properties, localGuideData, secretSpots, bookings, syncedBlocks, villaKnowledge, siteContent, favorites, isLoading, error: pError, isRefreshing,
    toggleFavorite, updateProperties, updateGuide, saveGuideItem, deleteGuideItem, saveSiteContent, saveVillaKnowledge, getOccupiedDatesForProperty,
    refreshProperties: async () => { 
      setIsRefreshing(true);
      await Promise.all([mutateProperties(), fetchPropertiesFromDB()]); 
      setIsRefreshing(false);
    }
  };

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) throw new Error('useProperty must be used within a PropertyProvider');
  return context;
};
