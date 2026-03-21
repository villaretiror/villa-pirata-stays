import { Property, SeasonalPrice, PromoCode } from '../types';
import { differenceInDays, addDays, format } from 'date-fns';

export const FinanceService = {
  /**
   * 📅 SEASONAL PRICE DETECTOR
   */
  isSeasonalDate(dateStr: string, seasonalPrices?: SeasonalPrice[]): boolean {
    if (!seasonalPrices) return false;
    return seasonalPrices.some(sp => dateStr >= sp.startDate && dateStr <= sp.endDate);
  },

  /**
   * 💰 NIGHTLY PRICE CALCULATOR
   */
  getNightlyPrice(basePrice: number, dateStr: string, seasonalPrices?: SeasonalPrice[]): number {
    if (!seasonalPrices) return basePrice;
    const seasonal = seasonalPrices.find(sp => dateStr >= sp.startDate && dateStr <= sp.endDate);
    return seasonal ? seasonal.price : basePrice;
  },

  /**
   * 🧾 CALCULATE TOTAL (Standardized)
   */
  calculateReservation(params: {
    property: Property;
    startDate: Date;
    endDate: Date;
    promo?: PromoCode | null;
  }) {
    const { property, startDate, endDate, promo } = params;
    
    let baseTotal = 0;
    const nightlyBreakdown = [];
    let hasSeasonalNight = false;

    let current = new Date(startDate);
    while (current < endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const isSeasonal = this.isSeasonalDate(dateStr, property.seasonal_prices);
      if (isSeasonal) hasSeasonalNight = true;

      const price = this.getNightlyPrice(property.price, dateStr, property.seasonal_prices);
      baseTotal += price;
      nightlyBreakdown.push({ date: dateStr, price, isSeasonal });
      
      current = addDays(current, 1);
    }

    const nights = differenceInDays(endDate, startDate);
    let discountAmount = 0;
    let subtotal = baseTotal;

    if (promo) {
      discountAmount = (subtotal * promo.discount_percent) / 100;
      subtotal -= discountAmount;
    }

    const taxRate = property.tax_rate || 7;
    const ivuAmount = subtotal * (taxRate / 100);
    const total = subtotal + ivuAmount;

    return {
      nights,
      baseTotal,
      discountAmount,
      subtotal,
      ivuAmount,
      taxRate,
      total,
      hasSeasonalNight,
      nightlyBreakdown
    };
  },

  /**
   * 🏷️ PROMO VALIDATOR
   */
  validatePromo(promo: PromoCode, nights: number, hasSeasonal: boolean) {
    if (!promo.active) return { valid: false, message: "Código inactivo." };
    
    // Check dates
    const now = new Date().toISOString().split('T')[0];
    if (promo.valid_from && now < promo.valid_from) return { valid: false, message: "Aún no disponible." };
    if (promo.valid_to && now > promo.valid_to) return { valid: false, message: "Código expirado." };

    // Check usage
    if (promo.max_uses && promo.current_uses && promo.current_uses >= promo.max_uses) {
      return { valid: false, message: "Límite de usos alcanzado." };
    }

    // Check min stay
    if (promo.min_stay_nights && nights < promo.min_stay_nights) {
      return { valid: false, message: `Mínimo ${promo.min_stay_nights} noches requerido.` };
    }

    // Check seasonal restriction
    if (!promo.allow_on_seasonal_prices && hasSeasonal) {
      return { valid: false, message: "No válido para fechas de temporada alta." };
    }

    return { valid: true };
  }
};
