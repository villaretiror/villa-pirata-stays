import { Property, Review, Offer, CalendarSync, SeasonalPrice } from '../types';
import { Tables } from '../supabase_types';

/**
 * Mappers to centralize data transformation between Supabase and Frontend.
 * This ensures "Source of Truth" consistency across the Platform. 🔱
 */

export const mapSupabaseProperty = (
  p: Tables<'properties'>, 
  user?: { full_name?: string; avatar_url?: string; role?: string },
  options: { isAdmin?: boolean } = {}
): Property => {
  const rawPolicies = (p.policies as any) || {};
  const isAdmin = options.isAdmin || false;

  // 🔱 ULTIMATE CLEANUP: Extract only what the UI needs
  return {
    id: String(p.id),
    title: p.title || 'Villa Boutique',
    subtitle: p.subtitle || '',
    description: p.description || '',
    location: p.location || 'Cabo Rojo, PR',
    address: p.address || '',
    price: Number(p.price) || 0,
    original_price: p.original_price ? Number(p.original_price) : null,
    cleaning_fee: Number(p.cleaning_fee) || 0,
    service_fee: Number(p.service_fee) || 0,
    security_deposit: Number(p.security_deposit) || 0,
    rating: Number(p.rating) || 5,
    reviews: Number(p.reviews) || 0,
    images: Array.isArray(p.images) ? p.images : [],
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    guests: Number(p.guests) || 2,
    bedrooms: Number(p.bedrooms) || 1,
    beds: Number(p.beds) || 1,
    baths: Number(p.baths) || 1,
    is_offline: p.is_offline || false,
    google_maps_url: p.google_maps_url || '',
    
    // Complex Objects
    fees: (p.fees as any) || {},
    policies: {
      cancellationPolicy: rawPolicies.cancellationPolicy || p.cancellation_policy_type || 'moderate',
      checkInTime: rawPolicies.checkInTime || '3:00 PM',
      checkOutTime: rawPolicies.checkOutTime || '11:00 AM',
      guests: Number(p.guests) || 2,
      houseRules: p.house_rules || rawPolicies.houseRules || [],
      wifiName: rawPolicies.wifiName || p.wifi_name || '',
      wifiPass: isAdmin ? (rawPolicies.wifiPass || p.wifi_pass || '') : '********',
      accessCode: isAdmin ? (rawPolicies.accessCode || p.access_code || '') : 'CONFIDENCIAL'
    },
    blockedDates: p.blockeddates || [],
    calendarSync: (p.calendarSync as any[]) || [],
    seasonal_prices: (p.seasonal_prices as any[]) || [],
    min_price_floor: Number(p.min_price_floor) || 0,
    max_discount_allowed: Number(p.max_discount_allowed) || 15,
    offers: (p.offers as any) || [],
    reviews_list: (p.reviews_list as any) || [],
    host: (p.host as any) || {
      name: user?.full_name || 'Anfitrión VRR',
      image: user?.avatar_url || '',
      yearsHosting: 1,
      badges: user?.role === 'host' ? ['Pro Host'] : []
    }
  } as unknown as Property;
};

export const mapSupabaseBooking = (b: any): any => {
  return {
    ...b,
    total_price: Number(b.total_price) || 0,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status || 'pending'
  };
};
