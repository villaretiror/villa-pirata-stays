import { useState, useCallback, useMemo } from 'react';
import { Property, PromoCode } from '../types';
import { FinanceService } from '../services/FinanceService';
import { supabase } from '../lib/supabase';
import { differenceInDays } from 'date-fns';

export function useBooking(property?: Property) {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 💰 CALCULATE PRICES
  const pricing = useMemo(() => {
    if (!property || !startDate || !endDate) return null;
    return FinanceService.calculateReservation({
      property,
      startDate,
      endDate,
      promo: appliedPromo
    });
  }, [property, startDate, endDate, appliedPromo]);

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
    nights: pricing?.nights || 0
  };
}
