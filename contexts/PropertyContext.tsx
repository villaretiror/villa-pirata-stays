import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property, LocalGuideCategory } from '../types';
import { PROPERTIES, INITIAL_LOCAL_GUIDE } from '../constants';
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

  // 1. Initial Fresh Fetch & Realtime Subscription
  const fetchPropertiesFromDB = async (signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase.from('properties').select('*').abortSignal(signal || new AbortController().signal);
      if (error) throw error;
      if (data) {
        // Map DB schema to Frontend types if necessary (Subtitle, Address, etc.)
        const mapped: Property[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          subtitle: p.subtitle || '',
          location: p.location,
          address: p.address || '',
          description: p.description,
          price: Number(p.price_per_night),
          rating: p.rating || 4.8,
          reviews: p.reviews || 0,
          images: p.images || [],
          amenities: p.amenities || [],
          featuredAmenity: p.featured_amenity || '',
          category: p.category as any,
          guests: Number(p.max_guests),
          bedrooms: p.bedrooms,
          beds: p.beds,
          baths: p.baths,
          fees: p.fees || {},
          policies: {
            checkInTime: p.check_in_time,
            checkOutTime: p.check_out_time,
            maxGuests: p.max_guests,
            cancellationPolicy: p.cancellation_policy,
            houseRules: p.house_rules,
            // Wifi/Access code typically in a private table or encrypted, 
            // but keeping it simple for now if they are in public schema
            wifiName: p.wifi_name || '',
            wifiPass: p.wifi_pass || '',
            accessCode: p.access_code || ''
          },
          blockedDates: (p.blocked_periods || []).flatMap((rangeStr: string) => {
            // Postgres range format: [YYYY-MM-DD, YYYY-MM-DD)
            const match = rangeStr.match(/\[(.*?),(.*?)\)/);
            if (!match) return [];
            const start = new Date(match[1]);
            const end = new Date(match[2]);
            const dates: string[] = [];
            let curr = new Date(start);
            while (curr < end) {
              dates.push(curr.toISOString().split('T')[0]);
              curr.setDate(curr.getDate() + 1);
            }
            return dates;
          }),
          calendarSync: p.calendar_sync || [],
          host: p.host_data || { name: 'Admin', image: '', badges: [], yearsHosting: 3 }
        }));
        setProperties(mapped);
      }
    } catch (err) {
      console.error("Context Sync Error:", err);
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
