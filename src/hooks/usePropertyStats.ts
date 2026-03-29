import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { useAvailability } from './useAvailability';

/**
 * 🔱 HOOK: REAL-TIME OCCUPANCY STATS
 * Calculates "Eficiencia Local" (Occupancy %) for the CURRENT month
 * based on live Bookings, iCal Sync Blocks, and Manual Blocks.
 */
export function usePropertyStats(propertyId: string, blockedDatesFromProp: string[] = []) {
  const { allBookings, refresh } = useAvailability(propertyId);
  const [stats, setStats] = useState({
    occupancyRate: 0,
    totalNights: 0,
    occupiedNights: 0,
    monthName: format(new Date(), 'MMMM')
  });

  useEffect(() => {
    if (!propertyId) return;

    const calculate = () => {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const daysInMonth = eachDayOfInterval({ start, end });
      
      let occupiedCount = 0;

      daysInMonth.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        
        // 1. Check direct bookings & external sync blocks
        const isBooked = allBookings.some(b => {
          if (b.status === 'cancelled' || b.status === 'expired') return false;
          const bIn = new Date(b.check_in);
          const bOut = new Date(b.check_out);
          return day >= bIn && day < bOut;
        });

        // 2. Check manual blocks (from property record)
        const isManual = (blockedDatesFromProp || []).includes(dStr);

        if (isBooked || isManual) {
          occupiedCount++;
        }
      });

      const rate = Math.round((occupiedCount / daysInMonth.length) * 100);
      
      setStats({
        occupancyRate: rate,
        totalNights: daysInMonth.length,
        occupiedNights: occupiedCount,
        monthName: format(now, 'MMMM')
      });
    };

    calculate();
  }, [propertyId, allBookings, blockedDatesFromProp]);

  return { ...stats, refreshStats: refresh };
}
