import { Property, Review, Offer, CalendarSync, SeasonalPrice } from '../types';
import { Tables } from '../supabase_types';

/**
 * Mappers to centralize data transformation between Supabase and Frontend.
 * This ensures "Source of Truth" consistency across the Platform. 🔱
 */

export const mapSupabaseProperty = (
  p: Tables<'properties'>, 
  user?: { name?: string; avatar?: string; role?: string },
  options: { isAdmin?: boolean } = {}
): Property => {
  const rawPolicies = (p.policies as any) || {};
  const isAdmin = options.isAdmin || false;

  return {
    ...p,
    id: String(p.id),
    title: p.title || 'Villa',
    subtitle: p.subtitle || '',
    price: Number(p.price) || 0,
    cleaning_fee: Number(p.cleaning_fee) || 0,
    service_fee: Number(p.service_fee) || 0,
    security_deposit: Number(p.security_deposit) || 0,
    rating: Number(p.rating) || 5,
    reviews_count: Number(p.reviews || (p as any).reviews_count) || 0,
    images: p.images || [],
    amenities: p.amenities || [],
    guests: p.guests || 2,
    bedrooms: p.bedrooms || 1,
    beds: p.beds || 1,
    baths: p.baths || 1,
    fees: (p.fees as any) || {},
    policies: {
      cancellationPolicy: rawPolicies.cancellationPolicy || 'moderate',
      checkInTime: rawPolicies.checkInTime || '3:00 PM',
      checkOutTime: rawPolicies.checkOutTime || '11:00 AM',
      guests: p.guests || 2,
      houseRules: p.house_rules || rawPolicies.houseRules || [],
      wifiName: rawPolicies.wifiName || p.wifi_name || '',
      // 🛡️ SECURITY: Mask sensitive data based on admin status
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
      name: user?.name || 'Anfitrión',
      image: user?.avatar || '',
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
