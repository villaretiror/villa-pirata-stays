import { Property } from './types';
import { PROPERTIES } from './constants';

// 1. iCal Helpers - Precision & Robustness
const parseICalDateStr = (raw: string): string => {
  // Handles DTSTART:20240501 or DTSTART;VALUE=DATE:20240501
  const val = raw.includes(':') ? raw.split(':').pop() || '' : raw;
  if (val.length < 8) return '';
  const y = val.substring(0, 4);
  const m = val.substring(4, 6);
  const d = val.substring(6, 8);
  return `${y}-${m}-${d}`;
};

export const getDatesInRange = (startStr: string, endStr: string): string[] => {
  const dates: string[] = [];
  const curr = new Date(`${startStr}T12:00:00`); // Use T12 to avoid day shifts
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
  const events: string[] = [];
  const lines = icalData.split(/\r\n|\n|\r/);
  let inEvent = false;
  let dtStartRaw = '';
  let dtEndRaw = '';

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      dtStartRaw = ''; dtEndRaw = '';
    } else if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      const start = parseICalDateStr(dtStartRaw);
      const end = parseICalDateStr(dtEndRaw);
      if (start && end) events.push(...getDatesInRange(start, end));
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) dtStartRaw = line;
      else if (line.startsWith('DTEND')) dtEndRaw = line;
    }
  }
  return Array.from(new Set(events));
};

// 2. Formatting Helpers
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('es-PR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

// 3. Mock Scraping Engine
export const fetchMockICal = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url.startsWith('http')) return reject(new Error('URL de calendario inválida.'));
    setTimeout(() => {
      const today = new Date();
      const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
      const d1 = new Date(today); d1.setDate(today.getDate() + 3);
      const d1e = new Date(today); d1e.setDate(today.getDate() + 7);

      resolve(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:${fmt(d1)}\nDTEND;VALUE=DATE:${fmt(d1e)}\nSUMMARY:Reserved\nEND:VEVENT\nEND:VCALENDAR`);
    }, 1200);
  });
};

export const mockImportFromLink = async (url: string): Promise<Partial<Property>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isBooking = url.toLowerCase().includes('booking.com');
      const isAirbnb = url.toLowerCase().includes('airbnb');

      // Logic for specific Villa IDs
      if (url.includes('1081171030449673920')) {
        const villa = PROPERTIES.find(p => p.id === '1081171030449673920');
        if (villa) {
          resolve({
            ...villa,
            title: `${villa.title} (Sync ${isBooking ? 'Booking' : 'Airbnb'})`,
            description: `[Importado de ${isBooking ? 'Booking.com' : 'Airbnb'}] ${villa.description}`
          });
          return;
        }
      }

      resolve({
        title: `Propiedad de ${isBooking ? 'Booking.com' : isAirbnb ? 'Airbnb' : 'Web Link'}`,
        description: `Sincronizada exitosamente. Esta es una descripción boutique optimizada extraída de ${isBooking ? 'Booking.com con el standard de alta demanda.' : 'Airbnb para tu hosting premium.'}`,
        price: isBooking ? 295 : 245,
        rating: 4.9,
        reviews: 88,
        amenities: ['Wifi Starlink', 'Piscina Privada', 'Generador Full'],
        images: ["https://images.unsplash.com/photo-1582268611958-ebaf1615627d?auto=format&fit=crop&q=80&w=1200"]
      });
    }, 1800);
  });
};

// 4. WhatsApp Automation
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const getBookingWAMessage = (data: {
  guestName: string,
  propertyName: string,
  checkIn: string,
  checkOut: string,
  total: number
}): string => {
  return `¡Hola! Soy ${data.guestName}, acabo de reservar ${data.propertyName} para las fechas del ${data.checkIn} al ${data.checkOut} a través de la web oficial de Villa Retiro R. El total de mi inversión es de $${data.total}. Aquí mi confirmación.`;
};

export const getHostInstructionMessage = (data: {
  guestName: string,
  propertyName: string,
  accessCode: string,
  googleMapsLink: string
}): string => {
  return `¡Hola ${data.guestName}! Gracias por elegir ${data.propertyName}. Aquí tus instrucciones de llegada: \n\n📍 Ubicación: ${data.googleMapsLink} \n🔑 Código de puerta: ${data.accessCode} \n\n¡Cualquier duda, estamos a tu orden!`;
};