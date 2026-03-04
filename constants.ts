
import { Property, LocalGuideCategory } from './types';

export const INITIAL_LOCAL_GUIDE: LocalGuideCategory[] = [
  {
    id: 'beaches',
    category: 'Playas Brutales',
    icon: 'beach_access',
    items: [
      {
        name: 'Playa Buyé',
        distance: '5 min',
        desc: 'Aguas cristalinas y ese vibe chill que solo consigues en el oeste. Perfecta para el sunset.',
        image: 'https://images.unsplash.com/photo-1590523278135-c59800eac084?auto=format&fit=crop&q=80&w=800'
      },
      {
        name: 'Balneario Boquerón',
        distance: '2 min',
        desc: 'La favorita de la familia. Bandera Azul y cerca de todo el movimiento del Poblado.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800'
      }
    ]
  }
];

export const PROPERTIES: Property[] = [
  {
    id: '1081171030449673920',
    title: 'Villa Retiro R: Tu Oasis Privado',
    subtitle: 'Piscina de Sal • Generador • Cerca de Buyé',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    description: 'Olvídate de las preocupaciones. Villa Retiro R está equipada con generador automático y cisterna para que nada interrumpa tu descanso. Disfruta de una espectacular piscina de agua salada privada en un ambiente de campo exclusivo, pero a minutos de las mejores playas del oeste. Ideal para familias que buscan privacidad y seguridad 24/7.',
    price: 265,
    fees: { cleaningShort: 85, cleaningMedium: 100, cleaningLong: 150, petFee: 50, securityDeposit: 200 },
    policies: { checkInTime: "3:00 PM", checkOutTime: "11:00 AM", maxGuests: 10, wifiName: "VillaRetiro_Starlink", wifiPass: "Tropical2024", accessCode: "4829 #" },
    blockedDates: [],
    calendarSync: [],
    rating: 4.98,
    reviews: 124,
    images: [
      "https://images.unsplash.com/photo-1572331165267-854da2b00cc6?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200"
    ],
    amenities: ['Generador Eléctrico FULL', 'Cisterna de Agua', 'Piscina de Agua Salada', 'Starlink WiFi', 'BBQ Area', 'Pet Friendly'],
    guests: 10,
    bedrooms: 3,
    beds: 6,
    baths: 2,
    host: {
      name: 'Carlos',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg',
      badges: ['Superhost'],
      yearsHosting: 5
    }
  }
];
