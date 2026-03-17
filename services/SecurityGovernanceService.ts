
import { createClient } from '@supabase/supabase-js';
import { Tables } from '../supabase_types';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

export type AccessLevel = 0 | 1 | 2 | 3;

export class SecurityGovernanceService {
  /**
   * Calculates the tiered access level for a user in a given property.
   * Leverages the SQL logic implemented in Postgres but available here for API logic.
   */
  static async getAccessLevel(userIdOrSessionId: string, propertyId: string): Promise<AccessLevel> {
    try {
      // 1. Fetch the most relevant upcoming or active booking for this user/property
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, status, check_in, check_out, total_paid_at_booking, total_price')
        .eq(userIdOrSessionId.includes('-') ? 'user_id' : 'session_id', userIdOrSessionId) // Heuristic check for UUID vs short session_id if applicable
        .eq('property_id', propertyId)
        .in('status', ['confirmed', 'Paid', 'completed', 'emergency_support'])
        .order('check_in', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!booking) return 0;

      const now = new Date();
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const status = booking.status?.toLowerCase();
      
      const isPaid = status === 'paid' || 
                    status === 'confirmed' || // Historical fallback
                    (booking.total_paid_at_booking && booking.total_paid_at_booking >= booking.total_price);

      // Baseline Level 1 (Booking confirmed)
      let level: AccessLevel = 1;

      // Level 2: Guide (7 days before)
      const diffDays = (checkIn.getTime() - now.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) {
        level = 2;
      }

      // Level 3: Total Access (24h before + Paid)
      const diffHours = (checkIn.getTime() - now.getTime()) / (1000 * 3600);
      if (level >= 2 && diffHours <= 24 && isPaid) {
        level = 3;
      }

      // Lock: 12h after check-out
      const hoursPostCheckOut = (now.getTime() - checkOut.getTime()) / (1000 * 3600);
      if (hoursPostCheckOut > 12) {
        level = 1; // Locked
      }

      return level;
    } catch (e) {
      console.error("SecurityGovernanceService: Failed to calculate access level", e);
      return 0; // Safe default
    }
  }

  /**
   * Sanitizes property data based on the calculated access level.
   */
  static sanitizeProperty(property: any, level: AccessLevel) {
    const sanitized = { ...property };
    
    // Level 1: Location/General only
    if (level < 2) {
      sanitized.house_rules = [];
      sanitized.wifi_name = "RESERVADO";
    }

    // Level 2: Guide
    if (level < 3) {
      sanitized.access_code = "REVELADO_24H_ANTES";
      sanitized.wifi_pass = "REVELADO_24H_ANTES";
      sanitized.lockbox_image_url = null;
      sanitized.arrival_instructions = "Se enviará 24h antes del check-in.";
    }

    return sanitized;
  }
}
