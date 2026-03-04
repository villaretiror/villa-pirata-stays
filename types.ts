
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
  expiresAt: string; // ISO String
}

export interface FeeStructure {
  cleaningShort: number; // 1-2 nights
  cleaningMedium: number; // 3-7 nights
  cleaningLong: number; // 7+ nights
  petFee: number;
  securityDeposit: number;
}

export interface Policies {
  checkInTime: string;
  checkOutTime: string;
  maxGuests: number;
  wifiName: string;
  wifiPass: string;
  accessCode: string;
}

export interface CalendarSync {
  id: string;
  platform: string; // 'Airbnb', 'Booking', 'VRBO', 'Other'
  url: string;
  lastSynced: string;
}

export interface Property {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  address: string; // For reservation details
  description: string;
  price: number; // Base nightly price
  rating: number;
  reviews: number;
  images: string[];
  amenities: string[];
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  reviewsList?: Review[];
  offers?: Offer[];
  fees: FeeStructure;
  policies: Policies;
  blockedDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
  calendarSync: CalendarSync[];
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
  guestName: string;
  guestImage: string;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total: number;
  guests: number;
}

export interface LocalGuideItem {
  name: string;
  distance: string;
  desc: string;
  image: string;
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
}