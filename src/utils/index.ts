import { CalendarSyncService } from '../services/CalendarSyncService';
import { FinanceService } from '../services/FinanceService';
import { SeasonalPrice } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// 1. Date Helpers
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatDateLong = (dateStr: string): string => {
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'dd MMM yyyy', { locale: es });
  } catch (e) {
    return dateStr;
  }
};

export const getDatesInRange = (startStr: string, endStr: string): string[] => {
  const dates: string[] = [];
  const curr = new Date(`${startStr}T12:00:00`);
  const end = new Date(`${endStr}T12:00:00`);
  while (curr < end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const parseICalData = (icalData: string): string[] => {
  const blocks = CalendarSyncService.parseIcsToBlocks(icalData, 'frontend-utils');
  const dates: string[] = [];
  blocks.forEach(b => {
    dates.push(...getDatesInRange(b.start, b.end));
  });
  return Array.from(new Set(dates));
};

// 2. Formatting Helpers
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// 3. iCal Fetching (Frontend only due to proxy)
export const fetchICalData = async (url: string): Promise<string[]> => {
  return CalendarSyncService.getBlockedDatesFromUrl(url);
};

// 4. Salty Message Generators
export const getWhatsAppWelcomeMsg = (data: {
  guestName: string,
  propertyName: string,
  accessCode: string,
  googleMapsLink: string
}): string => {
  return `¡Hola ${data.guestName}! Gracias por elegir ${data.propertyName}. Aquí tus instrucciones de llegada: \n\n📍 Ubicación: ${data.googleMapsLink} \n🔑 Código de puerta: ${data.accessCode} \n\n¡Cualquier duda, estamos a tu orden!`;
};

export const getBookingWAMessage = (data: {
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  total: number | string;
  method?: string;
}) => {
  return `¡Hola! Confirmo mi reserva en *${data.propertyName}*.\n\n👤 Huésped: ${data.guestName}\n📅 Check-in: ${data.checkIn}\n📅 Check-out: ${data.checkOut}\n💰 Total: $${data.total}\n💳 Pago: ${data.method || 'Pendiente'}\n\n¡Estamos muy emocionados! 🏝️`;
};

export const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const getHostInstructionMessage = (data: {
  guestName: string,
  propertyName: string,
  accessCode: string,
  googleMapsLink?: string
}): string => {
  return `¡Hola ${data.guestName}! Solo quería saludarte y confirmar que ya estamos listos para recibirte en ${data.propertyName}. El código de acceso para tu llegada será: ${data.accessCode}. ¿Tienes alguna duda sobre la ubicación (${data.googleMapsLink || ''}) o el check-in?`;
};

// 5. Ported Helpers (Internal)
export const importPropertyFromUrl = async (url: string) => {
  console.warn("importPropertyFromUrl no implementado en esta versión consolidada.");
  return null;
};

// 6. Finance Redirects
export const getNightlyPrice = (basePrice: number, dateStr: string, seasonalPrices?: SeasonalPrice[]): number => {
  return FinanceService.getNightlyPrice(basePrice, dateStr, seasonalPrices);
};

export const isSeasonalDate = (dateStr: string, seasonalPrices?: SeasonalPrice[]): boolean => {
  return FinanceService.isSeasonalDate(dateStr, seasonalPrices);
};

export const validatePromoCode = (promo: any, nights: number, hasSeasonal: boolean) => {
  return FinanceService.validatePromo(promo, nights, hasSeasonal);
};
