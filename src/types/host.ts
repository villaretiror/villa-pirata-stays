import { Tables } from './supabase';
import { Property, Review, User } from './index';

export type BookingRow = Tables<'bookings'>;
export type ExpenseRow = Tables<'property_expenses'>;
export type LeadRow = Tables<'leads'>;
export type AlertRow = Tables<'urgent_alerts'>;
export type CohostRow = Tables<'property_cohosts'>;
export type TaskRow = Tables<'tasks'>;

/**
 * 🔱 COMPOSITE TYPES: Extended data objects with joined relations
 */
export type BookingWithDetails = BookingRow & {
  profiles: { 
    full_name: string | null; 
    avatar_url: string | null; 
    phone: string | null; 
    email?: string | null; 
    tags: string[] | null 
  } | null;
  properties: { 
    title: string; 
    images: string[] | null; 
    policies?: any 
  } | null;
};

/**
 * 📊 ANALYTICS TYPES: Data structures for Recharts & ROI
 */
export interface ChartDataPoint {
  name: string;
  Total: number;
  Web: number;
  OTA: number;
  Gastos: number;
  Profit: number;
  Ocupación: number;
}

export interface DemandDataPoint {
  name: string;
  value: number;
}

export interface PerformanceStats {
  performance: Record<string, number>;
  chartData: Array<{ label: string; val: number }>;
}

export interface RescueCandidate extends Partial<LeadRow> {
  id: string;
  lead_email: string;
  check_in?: string;
  check_out?: string;
  matchGap: {
    property_id: string;
    property_title: string;
    check_in: string;
    check_out: string;
    nights: number;
  };
  isFatigued: boolean;
  rescueAttempts: number;
}

/**
 * 🛰️ NOTIFICATION ENGINE: Unified types for the Salty Inbox
 */
export type NotificationType = 'lead' | 'alert' | 'payment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  icon: any; // Lucide Icon component
  color: string;
  full_name?: string;
  name?: string;
  message?: string;
  severity?: number;
  created_at: string;
  source?: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

/**
 * 🔱 DASHBOARD STATE & NAVIGATION
 */
export type HostTab = 
  | 'today' 
  | 'calendar' 
  | 'listings' 
  | 'guidebook' 
  | 'messages' 
  | 'reviews' 
  | 'menu' 
  | 'leads' 
  | 'payments' 
  | 'analytics' 
  | 'seasonal' 
  | 'conversion' 
  | 'settings' 
  | 'insights' 
  | 'team' 
  | 'help' 
  | 'availability' 
  | 'concierge';

/**
 * 🚀 DASHBOARD BUNDLE: The direct shape of the RCP response
 */
export interface HostDashboardBundle {
  properties: any[];
  bookings: any[];
  expenses: any[];
  leads: any[];
  alerts: any[];
  pending_payments: any[];
}
