export type ViewState = 'guest' | 'host';

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
  source: 'Airbnb' | 'Booking.com' | 'Google';
  avatar?: string;
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
  cleaning_fee: number;
  service_fee: number;
  security_deposit: number;
  rating: number;
  reviews: number;
  images: string[];
  amenities: string[];
  featuredAmenity?: string;
  category?: 'Boutique' | 'Familiar';
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  reviewsList?: Review[];
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
  seasonal_prices?: SeasonalPrice[];
  host: {
    name: string;
    image: string;
    badges: string[];
    yearsHosting: number;
  };
}

export interface Booking {
  id: string;
  propertyId: string;
  guestId: string;
  guestName: string;
  guestImage: string;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'pending_ai_validation' | 'emergency_support' | 'expired';
  guests: number;
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
  name: string;
  distance: string;
  desc: string;
  image: string;
  mapUrl?: string;
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