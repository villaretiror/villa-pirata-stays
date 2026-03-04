import { Property } from './types';
import { PROPERTIES } from './constants';

// Helper to parse a date string like "20231201" or "20231201T120000Z" to YYYY-MM-DD
const parseICalDate = (icalDate: string): string => {
  if (!icalDate) return '';
  const year = icalDate.substring(0, 4);
  const month = icalDate.substring(4, 6);
  const day = icalDate.substring(6, 8);
  return `${year}-${month}-${day}`;
};

// Helper to get all dates between start and end
const getDatesInRange = (startDate: Date, endDate: Date) => {
  const date = new Date(startDate.getTime());
  const dates = [];
  
  // Iterate while date is < endDate
  while (date < endDate) {
    dates.push(date.toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

// Main function to parse iCal text content
export const parseICalData = (icalData: string): string[] => {
  const events: string[] = [];
  const lines = icalData.split(/\r\n|\n|\r/);
  
  let inEvent = false;
  let dtStart = '';
  let dtEnd = '';

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      dtStart = '';
      dtEnd = '';
    } else if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (dtStart && dtEnd) {
        const start = new Date(parseICalDate(dtStart));
        const end = new Date(parseICalDate(dtEnd));
        const range = getDatesInRange(start, end);
        events.push(...range);
      }
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) {
        dtStart = line.split(':')[1];
      } else if (line.startsWith('DTEND')) {
        dtEnd = line.split(':')[1];
      }
    }
  }

  // Remove duplicates
  return Array.from(new Set(events));
};

// Mock Fetcher to simulate getting data from Airbnb/VRBO (Bypassing CORS for demo)
export const fetchMockICal = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic to generate dates relative to "Today" so the demo always looks active
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 5);
      const nextWeekEnd = new Date(today);
      nextWeekEnd.setDate(today.getDate() + 10); // 5 day booking

      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 25);
      const nextMonthEnd = new Date(today);
      nextMonthEnd.setDate(today.getDate() + 30); // 5 day booking

      const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

      // Return realistic iCal structure
      resolve(`BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:${fmt(nextWeekEnd)}
DTSTART;VALUE=DATE:${fmt(nextWeek)}
UID:123456-airbnb
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:${fmt(nextMonthEnd)}
DTSTART;VALUE=DATE:${fmt(nextMonth)}
UID:789012-airbnb
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`);
    }, 1500);
  });
};

// SIMULATED SCRAPER FOR "IMPORT FROM LINK" FEATURE
export const mockImportFromLink = async (url: string): Promise<Partial<Property>> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // DETECT SPECIFIC AIRBNB LINKS PROVIDED BY USER
            // Villa Retiro R ID: 1081171030449673920
            if (url.includes('1081171030449673920') || url.includes('Retiro')) {
               const villa = PROPERTIES.find(p => p.id === '1081171030449673920');
               if (villa) {
                   resolve({
                       ...villa,
                       title: "Villa Retiro R (Sincronizado)",
                       subtitle: "Datos actualizados de Airbnb"
                   });
                   return;
               }
            }
            
            // Pirata Family House ID: 42839458
            if (url.includes('42839458') || url.includes('Pirata')) {
               const pirata = PROPERTIES.find(p => p.id === '42839458');
               if (pirata) {
                   resolve({
                       ...pirata,
                       title: "Pirata Family House (Sincronizado)",
                       subtitle: "Datos actualizados de Airbnb"
                   });
                   return;
               }
            }

            // Fallback for unknown links
            const isAirbnb = url.includes('airbnb');
            resolve({
                title: "Propiedad Importada (Demo)",
                description: `Esta descripción fue extraída automáticamente de ${isAirbnb ? 'Airbnb' : 'la web'}. Aquí aparecería todo el texto detallado de tu anuncio original.`,
                price: 250,
                rating: 4.8,
                reviews: 42,
                amenities: ['Wifi', 'Piscina', 'Aire Acondicionado', 'Cocina'],
                images: [
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                ]
            });
        }, 2000);
    });
};