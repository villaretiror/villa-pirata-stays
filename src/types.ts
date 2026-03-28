import { Database } from './supabase_types';

export type ViewState = 'guest' | 'host';

// 🔱 EXPLICIT ACCESS TO SUPABASE ROWS
export type PropertyRow = Database['public']['Tables']['properties']['Row'];
export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row'];
export type LeadRow = Database['public']['Tables']['leads']['Row'];

export interface Review extends Partial<ReviewRow> {
  author: string;
  text: string;
  rating: number;
  created_at?: string; 
  avatar_url?: string; 
  source: 'Airbnb' | 'Booking.com' | 'Google' | 'Direct';
}

export interface Offer {
  text: string;
  expiresAt: string;
}

export interface SeasonalPrice {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  label: string;
}

export interface PromoCode extends Partial<PromoCodeRow> {
  code: string;
  discount_percent: number;
}

export type FeeStructure = Record<string, number>;

export type CancellationPolicyType = 'flexible' | 'moderate' | 'firm' | 'strict' | 'non-refundable';

export interface Policies {
  checkInTime: string;
  checkOutTime: string;
  guests: number;
  wifiName: string;
  wifiPass: string;
  accessCode: string;
  cancellationPolicy?: CancellationPolicyType;
  houseRules?: string[];
}

export interface CalendarSync {
  id: string;
  platform: string;
  url: string;
  lastSynced: string;
  syncStatus: 'success' | 'error' | 'syncing';
}

// 🛡️ OMIT ALL FIELDS THAT ARE OVERRIDDEN TO AVOID CONFLICTS
type PropertyOmissions = 'calendarSync' | 'seasonal_prices' | 'host' | 'offers' | 'fees' | 'policies' | 'blockedDates' | 'reviews_list' | 'images' | 'original_price';

export interface Property extends Omit<PropertyRow, PropertyOmissions> {
  original_price?: number | null; 
  images: string[];
  reviews_list?: Review[];
  offers?: Offer[];
  fees: FeeStructure;
  policies: Policies;
  blockedDates: string[];
  calendarSync: CalendarSync[];
  seasonal_prices?: SeasonalPrice[];
  isOffline?: boolean; 
  // Extensiones detectadas en errores de Vercel
  availability_urgency_msg?: string | null;
  exact_lat_long?: string | null;
  general_area_map_url?: string | null;
  is_cleaning_in_progress?: boolean;
  host: {
    name: string;
    image: string;
    badges: string[];
    yearsHosting: number;
  };
}

export interface Booking extends Omit<BookingRow, 'applied_policy'> {
  applied_policy?: {
    type: CancellationPolicyType;
    snapshot: string;
  };
  paymentDetails?: {
    method: 'Credit Card' | 'ATH Movil' | 'Cash';
    transactionId?: string;
    paidAt?: string;
  };
  nightlyBreakdown?: {
    basePrice: number;
    nights: number;
    cleaningFee: number;
    serviceFee: number;
    tax?: number;
    total: number;
  };
}

export interface LocalGuideItem {
  id?: string;
  name: string;
  distance: string;
  desc: string;
  image: string;
  mapUrl?: string;
  saltyTip?: string;
  sortOrder?: number;
}

export interface LocalGuideCategory {
  id: string;
  category: string;
  icon: string;
  items: LocalGuideItem[];
}

export interface User extends Partial<ProfileRow> {
  role: 'guest' | 'host' | 'admin';
  full_name?: string; 
  avatar_url?: string; 
  created_at?: string; // Para compatibilidad con Profile.tsx
  emergency_contact?: string; // Standard naming
  verificationStatus?: 'verified' | 'pending' | 'rejected' | 'none' | 'unverified';
  favoriteProperties?: string[];
}

export interface Lead extends Partial<LeadRow> {}

export interface SiteContent {
  hero: {
    title: string;
    slogan: string;
    welcome_badge: string;
    notif_status: string;
    notif_promo: string;
  };
  sections: {
    beaches: string;
    gastronomy: string;
    nearby: string;
  };
  cta: {
    title: string;
    subtitle: string;
    description: string;
  };
  contact: {
    title: string;
    subtitle: string;
    phone: string;
    email: string;
    whatsapp: string;
  };
  seo: {
    default_title: string;
    description: string;
  };
}

export interface VillaKnowledge {
  location: {
    description: string;
    distances: string;
  };
  policies: {
    checkIn: string;
    checkOut: string;
    rules: string;
    cancellation: string;
    deposit: string;
  };
  amenities: {
    general: string;
  };
  emergencies: {
    contact: string;
    procedures: string;
  };
  survival_tips: {
    parking: string;
    cash: string;
    hours: string;
    cooking: string;
  };
}

export interface UrgentAlert {
  id: string;
  name: string;
  message: string;
  contact: string;
  status: 'pending' | 'resolved'; // Synced with DB default 'pending'
  severity: number;
  sentiment_score?: number;
  created_at: string;
}