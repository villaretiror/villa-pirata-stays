import { Property } from './types';


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

// 3. Real iCal Fetching Engine
export const fetchICalData = async (url: string): Promise<string> => {
  if (!url.startsWith('http')) throw new Error('URL de calendario inválida.');

  // Usamos un proxy de CORS para poder leer feeds de Airbnb/Booking desde el navegador
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Error al conectar con el servidor externo.');

    const data = await response.json();
    if (!data.contents) throw new Error('El calendario está vacío o no es accesible.');

    return data.contents;
  } catch (error: any) {
    console.error("iCal Fetch Error:", error);
    throw new Error(`Error de sincronización: ${error.message}`);
  }
};

// 4. Magic Importer - Metadata Extraction via CORS Proxy
export const importPropertyFromUrl = async (url: string): Promise<Partial<Property>> => {
  if (!url.startsWith('http')) throw new Error('URL inválida.');

  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Error de conexión con el proxy.');

    const data = await response.json();
    const html = data.contents;

    // Función auxiliar para extraer contenido de meta tags específicos
    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || "Nueva Villa Importada";
    const description = getMeta('og:description') || "Descripción no disponible.";
    const image = getMeta('og:image');

    return {
      title: title.split(' - ')[0], // Limpiar títulos largos de Airbnb
      description: description,
      images: image ? [image] : ["https://images.unsplash.com/photo-1582268611958-ebaf1615627d?auto=format&fit=crop&q=80&w=1200"],
      price: 250, // Default price
      rating: 4.9,
      reviews: 15,
      amenities: ['Wifi Starlink', 'Check-in Autónomo', 'Cocina Completa']
    };
  } catch (error: any) {
    console.error("Import Error:", error);
    throw new Error('No pudimos extraer los datos automáticamente.');
  }
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