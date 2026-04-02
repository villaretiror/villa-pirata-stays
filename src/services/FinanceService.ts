import { Property, SeasonalPrice, PromoCode } from '../types/index.js';
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
   * 🧾 CALCULATE TOTAL (Elite Engine - Standardized)
   * Centralizes all logic for fees, IVU, and price floor protection.
   */
  calculateReservation(params: {
    property: Property;
    startDate: Date;
    endDate: Date;
    promo?: PromoCode | null;
    isOrphanDays?: boolean;
  }) {
    const { property, startDate, endDate, promo, isOrphanDays } = params;
    
    // 1. Initial State
    let nightsTotal = 0;
    const nightlyBreakdown = [];
    let hasSeasonalNight = false;
    const nights = differenceInDays(endDate, startDate);

    // 2. Nightly Logic (Seasonal Detection)
    let current = new Date(startDate);
    while (current < endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const isSeasonal = this.isSeasonalDate(dateStr, property.seasonal_prices);
      if (isSeasonal) hasSeasonalNight = true;

      const price = this.getNightlyPrice(property.price, dateStr, property.seasonal_prices);
      nightsTotal += price;
      nightlyBreakdown.push({ date: dateStr, price, isSeasonal });
      
      current = addDays(current, 1);
    }

    // 3. Subtotal calculation (Nights + Static Fees)
    const cleaningFee = Number(property.cleaning_fee) || 0;
    const serviceFee = Number(property.service_fee) || 0;
    const securityDeposit = Number(property.security_deposit) || 0; // Usually not in total price but held

    let subtotal = nightsTotal + cleaningFee + serviceFee;

    // 4. Promo Logic & Price Floor Guard
    let discountAmount = 0;
    let appliedDiscountPercent = 0;
    
    // 🔱 CAPTAIN'S OFFER (Orphan Days)
    if (isOrphanDays) {
      discountAmount += (subtotal * 0.15); // 15% off automatically
      appliedDiscountPercent = 15;
    }

    if (promo) {
      discountAmount = (subtotal * (promo.discount_percent || 0)) / 100;
      appliedDiscountPercent = promo.discount_percent || 0;
      
      const potentialTotal = subtotal - discountAmount;
      const priceFloor = Number(property.min_price_floor) || 0;

      // 🛡️ REVENUE PROTECTION: Check against price floor
      if (priceFloor > 0 && potentialTotal < priceFloor) {
        console.warn(`[FinanceService] 🔱 Protección de Piso Activa: Diferencia de $${(priceFloor - potentialTotal).toFixed(2)} compensada.`);
        discountAmount = subtotal - priceFloor;
        if (discountAmount < 0) discountAmount = 0;
      }
      
      subtotal -= discountAmount;
    }

    // 5. Tax Logic (IVU)
    // Dynamic tax rate from property or general 7%
    const taxRate = Number(property.tax_rate) || 7; 
    const ivuAmount = subtotal * (taxRate / 100);

    // 6. Final Totaling
    const total = subtotal + ivuAmount;

    // 🔍 DECISION TRACE (Audit Log)
    const trace = {
      timestamp: new Date().toISOString(),
      propertyId: property.id,
      nights,
      isSeasonal: hasSeasonalNight,
      floorProtection: (Number(property.min_price_floor) || 0) > 0,
      calculations: {
        nightsTotal,
        cleaningFee,
        serviceFee,
        discountAmount,
        subtotal,
        taxRate,
        ivuAmount,
        total
      }
    };

    console.log(`[FinanceService] 🔱 Cálculo de Élite finalizado para Reserva #${property.id.slice(-4)}: $${total.toFixed(2)}`);

    return {
      nights,
      nightsTotal,
      cleaningFee,
      serviceFee,
      securityDeposit,
      discountAmount,
      appliedDiscountPercent,
      subtotal,
      ivuAmount,
      taxRate,
      total,
      hasSeasonalNight,
      nightlyBreakdown,
      trace // Para auditoría del Revenue Specialist
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
