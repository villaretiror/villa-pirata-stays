export type ViewState = 'guest' | 'host';

export interface Review {
  id: string;
  booking_id?: string | null;       // FK → bookings.id. null = importada de Airbnb/Booking.com
  property_id?: string;
  user_id?: string | null;           // FK → auth.users
  author: string;
  date: string;                      // ISO string (created_at formateado para display)
  rating: number;                    // 1.0 – 5.0
  text: string;
  source: 'Airbnb' | 'Booking.com' | 'Google' | 'Direct';
  avatar?: string;                   // avatar_url de la DB (opcional)
  is_visible?: boolean;
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

export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  min_stay_nights: number;
  valid_from: string;
  valid_to: string;
  active: boolean;
  max_uses?: number;
  current_uses?: number;
  allow_on_seasonal_prices: boolean;
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

export interface Property {
  id: string;
  host_id?: string;
  title: string;
  subtitle: string;
  location: string;
  address: string;
  description: string;
  price: number;
  original_price?: number | null;   // Precio de referencia para mostrar tachado. Si es null, no se muestra.
  cleaning_fee: number;
  service_fee: number;
  security_deposit: number;
  rating: number;
  reviews_count: number;
  images: string[];
  amenities: string[];
  featuredAmenity?: string;
  category?: 'Boutique' | 'Familiar';
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  reviews_list?: Review[];
  offers?: Offer[];
  fees: FeeStructure;
  policies: Policies;
  blockedDates: string[];
  calendarSync: CalendarSync[];
  availability_urgency_msg?: string;
  general_area_map_url?: string;
  exact_lat_long?: string;
  google_maps_url?: string;
  waze_url?: string;
  review_url?: string;
  isOffline?: boolean;
  min_price_floor: number;
  max_discount_allowed: number;
  cancellation_policy_type?: CancellationPolicyType;
  seasonal_prices?: SeasonalPrice[];
  created_at?: string;
  updated_at?: string;
  host: {
    name: string;
    image: string;
    badges: string[];
    yearsHosting: number;
  };
}

export interface Booking {
  id: string;
  property_id: string;
  user_id?: string;
  customer_name?: string;
  source?: string;
  check_in: string;
  check_out: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'pending_ai_validation' | 'emergency_support' | 'expired';
  guests: number;
  email_sent?: boolean;
  payment_method?: string;
  payment_proof_url?: string;
  total_price: number;
  applied_policy?: {
    type: CancellationPolicyType;
    snapshot: string; // Resumen textual de la regla legal aplicada
  };
  cancelled_at?: string;
  cancellation_reason?: string;
  cleaning_fee_at_booking?: number | null;
  service_fee_at_booking?: number | null;
  refund_amount_calculated?: number | null;
  retained_amount_calculated?: number | null;
  cancellation_snapshot?: any;
  paymentDetails: {
    method: 'Credit Card' | 'ATH Movil' | 'Cash';
    transactionId?: string;
    paidAt?: string;
  };
  nightlyBreakdown: {
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'guest' | 'host' | 'admin';
  avatar?: string;
  phone?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  emergencyContact?: string;
  bio?: string;
  registeredAt: string;
  favoriteProperties?: string[];
  given_concessions?: { date: string; type: string; discount: number }[];
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  date_of_interest?: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  created_at: string;
}

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
  status: 'new' | 'resolved';
  severity: number;
  sentiment_score?: number;
  created_at: string;
}