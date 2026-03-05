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

export interface FeeStructure {
  cleaningShort: number;
  cleaningMedium: number;
  cleaningLong: number;
  petFee: number;
  securityDeposit: number;
}

export type CancellationPolicyType = 'flexible' | 'moderate' | 'firm' | 'strict' | 'non-refundable';

export interface Policies {
  checkInTime: string;
  checkOutTime: string;
  maxGuests: number;
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
  title: string;
  subtitle: string;
  location: string;
  address: string;
  description: string;
  price: number;
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
  isOffline?: boolean;
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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
  role: 'guest' | 'host';
  avatar?: string;
  phone?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  emergencyContact?: string;
  registeredAt: string;
  favoriteProperties?: string[];
}