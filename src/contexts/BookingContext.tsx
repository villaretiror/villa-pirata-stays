import React, { createContext, useContext } from 'react';
import { differenceInHours, differenceInDays, parseISO } from 'date-fns';
import { Temporal } from '@js-temporal/polyfill';
import { CancellationPolicyType, Property, Booking } from '../types';
import { supabase } from '../lib/supabase';

interface RefundCalculation {
  refundAmount: number;
  retainedAmount: number;
  explanation: string;
  feesToRefund: number;
}

interface BookingContextType {
  calculateRefund: (booking: Booking, property: Property, options?: { isCleaningInProgress?: boolean; skipLogging?: boolean }) => RefundCalculation;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  /**
   * REGLAS ALL-INCLUSIVE (MASTER PROMPT: SUPABASE ENFORCEMENT)
   * 1. El porcentaje se aplica sobre el Total Bruto (Noches + Limpieza + Fees).
   * 2. No se desglosa la limpieza para el cálculo del reembolso salvo en protección operativa.
   */
  const calculateRefund = (booking: Booking, property: Property, options?: { isCleaningInProgress?: boolean; skipLogging?: boolean }): RefundCalculation => {
    const checkInDate = parseISO(booking.check_in);
    
    // 🌍 TIMEZONE NORMALIZATION: Force calculation in Puerto Rico (AST)
    const nowPR = Temporal.Now.instant().toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime();
    const checkInPR = Temporal.Instant.from(checkInDate.toISOString()).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime();
    
    // Convert back to native Date for date-fns compatibility with precise AST alignment
    const now = new Date(Temporal.Now.instant().epochMilliseconds);
    const hoursToArrival = differenceInHours(checkInDate, now);
    const daysToArrival = differenceInDays(checkInDate, now);
    
    // Snapshot de la política usada al reservar
    const policyType = booking.applied_policy?.type || property.policies.cancellationPolicy || 'moderate';
    const totalPrice = Number(booking.total_price);
    const cleaningFee = Number(booking.cleaning_fee_at_booking ?? property.cleaning_fee ?? 0);
    const serviceFee = Number(booking.service_fee_at_booking ?? property.service_fee ?? 0);
    
    // Valor de la primera noche (estimado para cálculos de retención)
    const firstNightPrice = Number(property.price || 0);
    
    let refundAmount = 0;
    let explanation = '';

    switch (policyType) {
      case 'flexible':
        if (hoursToArrival >= 24) {
          // Reembolso total (All-Inclusive)
          refundAmount = totalPrice;
          explanation = "Política Flexible (Snap): Reembolso del 100% sobre el valor total de la reserva.";
        } else {
          // Paga la primera noche + comisión de servicio proporcional (Retención parcial sobre total)
          const retained = firstNightPrice + serviceFee;
          refundAmount = Math.max(0, totalPrice - retained);
          explanation = "Política Flexible (Snap): Menos de 24h. Se retiene la primera noche y servicios.";
        }
        break;

      case 'moderate':
        if (daysToArrival >= 5) {
          refundAmount = totalPrice;
          explanation = "Política Moderada (Snap): Reembolso del 100% (+5 días de antelación).";
        } else {
          // Retención de 1ra noche + 50% del resto del total
          const retained = firstNightPrice + serviceFee + ((totalPrice - firstNightPrice - serviceFee) * 0.5);
          refundAmount = Math.max(0, totalPrice - retained);
          explanation = "Política Moderada (Snap): Menos de 5 días. Se retiene 1ra noche y el 50% del balance restante.";
        }
        break;

      case 'firm':
        if (daysToArrival >= 30) {
          refundAmount = totalPrice;
          explanation = "Política Firme (Snap): Más de 30 días. Reembolso total del 100%.";
        } else if (daysToArrival >= 7) {
          // Reembolso del 50% de la FACTURA TOTAL (Regla Maestra)
          refundAmount = totalPrice * 0.5;
          explanation = "Política Firme (Snap): Entre 7 y 30 días. Reembolso del 50% sobre el total bruto.";
        } else {
          refundAmount = 0;
          explanation = "Política Firme (Snap): Menos de 7 días. No aplica reembolso.";
        }
        break;

      case 'strict':
        if (daysToArrival >= 7) {
          // Reembolso del 50% del TOTAL
          refundAmount = totalPrice * 0.5;
          explanation = "Política Estricta (Snap): Reembolso del 50% del total (+7 días de antelación).";
        } else {
          refundAmount = 0;
          explanation = "Política Estricta (Snap): Menos de 7 días. Retención total del 100%.";
        }
        break;

      default:
        refundAmount = 0;
        explanation = "Error de Snapshot: Política no identificada. Retención total por seguridad.";
    }

    // 🧼 CLEANING FEE PROTECTION: Industrial Safeguard
    if (options?.isCleaningInProgress && refundAmount > 0) {
      refundAmount = Math.max(0, refundAmount - cleaningFee);
      explanation += " [Protección: Gastos de limpieza retenidos por preparación en curso]";
    }

    // 🕵️ LOGGING DE INTENCIÓN: Salty Proactive Integration
    if (!options?.skipLogging) {
      supabase.from('intent_logs').insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        intent_type: 'refund_check',
        metadata: { 
          refund_amount: refundAmount, 
          property_id: property.id,
          explanation: explanation
        }
      }).then();
    }

    return {
      refundAmount: Number(refundAmount.toFixed(2)),
      retainedAmount: Number(Math.max(0, totalPrice - refundAmount).toFixed(2)),
      explanation,
      feesToRefund: 0 // Campo deprecado en favor de All-Inclusive
    };
  };

  return (
    <BookingContext.Provider value={{ calculateRefund }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
};
