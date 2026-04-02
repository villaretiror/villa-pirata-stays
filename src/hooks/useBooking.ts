import { useState, useCallback, useMemo } from 'react';
import { Property, PromoCode } from '../types/index.js';
import { FinanceService } from '../services/FinanceService.js';
import { supabase } from '../lib/SupabaseService.js';
import { differenceInDays, format, subDays, addDays } from 'date-fns';
import { useProperty } from '../contexts/PropertyContext.js';

export function useBooking(property?: Property) {
  const { getOccupiedDatesForProperty } = useProperty();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrphanOffer, setIsOrphanOffer] = useState(false);

  // 💰 CALCULATE PRICES
  const pricing = useMemo(() => {
    if (!property || !startDate || !endDate) return null;
    
    // 🕵️ ORPHAN DAYS DETECTOR (Salty's Captain Offer)
    let orphan = false;
    const nights = differenceInDays(endDate, startDate);
    if (nights === 2) {
      const occupied = getOccupiedDatesForProperty(String(property.id)).map(d => format(d, 'yyyy-MM-dd'));
      const dayBeforeStr = format(subDays(startDate, 1), 'yyyy-MM-dd');
      const dayAfterStr = format(addDays(endDate, 0), 'yyyy-MM-dd'); // CheckOut day
      if (occupied.includes(dayBeforeStr) && occupied.includes(dayAfterStr)) {
        orphan = true;
      }
    }
    setIsOrphanOffer(orphan);

    return FinanceService.calculateReservation({
      property,
      startDate,
      endDate,
      promo: appliedPromo,
      isOrphanDays: orphan
    });
  }, [property, startDate, endDate, appliedPromo, getOccupiedDatesForProperty]);

  // 🏷️ APPLY PROMO
  const applyPromo = useCallback(async (code: string) => {
    setPromoError('');
    if (!code || !property || !startDate || !endDate) return;

    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single();

      if (error || !promo) {
        setPromoError('Código inválido.');
        return;
      }

      const nights = differenceInDays(endDate, startDate);
      const tempCalculation = FinanceService.calculateReservation({ property, startDate, endDate });
      
      const v = FinanceService.validatePromo(promo as any, nights, tempCalculation.hasSeasonalNight);
      if (!v.valid) {
        setPromoError(v.message || 'Error validando código.');
        return;
      }

      setAppliedPromo(promo as any);
      setPromoError('');
    } catch (err) {
      setPromoError('Error de servidor.');
    }
  }, [property, startDate, endDate]);

  return {
    dateRange,
    setDateRange,
    startDate,
    endDate,
    promoCode,
    setPromoCode,
    appliedPromo,
    setAppliedPromo,
    promoError,
    applyPromo,
    pricing,
    isProcessing,
    setIsProcessing,
    isOrphanOffer,
    nights: pricing?.nights || 0
  };
}
