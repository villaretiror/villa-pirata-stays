import { Property, LocalGuideCategory } from './types';

export const INITIAL_LOCAL_GUIDE: LocalGuideCategory[] = [
  {
    id: 'beaches',
    category: 'Playas del Paraíso',
    icon: 'beach_access',
    items: [
      {
        name: 'Playa Buyé',
        distance: '5 min',
        desc: 'Aguas cristalinas y arena blanca en el corazón de Cabo Rojo. El spot perfecto para un sunset inolvidable en el oeste.',
        image: 'https://images.unsplash.com/photo-1590523278135-c59800eac084?auto=format&fit=crop&q=80&w=1200'
      },
      {
        name: 'Playa Combate',
        distance: '12 min',
        desc: 'Ambiente vibrante y aguas tranquilas. Ideal para familias que buscan lo mejor de la costa suroeste de Puerto Rico.',
        image: 'https://images.unsplash.com/photo-1544949132-c41c59fe95d4?auto=format&fit=crop&q=80&w=1200'
      }
    ]
  },
  {
    id: 'gastronomy',
    category: 'Ruta Gastronómica',
    icon: 'restaurant',
    items: [
      {
        name: 'Milla de Oro (Joyuda)',
        distance: '15 min',
        desc: 'La capital del marisco. Disfruta de una cena frente al mar con los sabores más frescos del Caribe.',
        image: 'https://images.unsplash.com/photo-1551218808-94e220e034a8?auto=format&fit=crop&q=80&w=1200'
      }
    ]
  },
  {
    id: 'adventure',
    category: 'Aventura & Exploración',
    icon: 'explore',
    items: [
      {
        name: 'Faro Los Morrillos',
        distance: '20 min',
        desc: 'Acantilados imponentes y vistas panorámicas. Un destino obligatorio para senderismo y fotografía en tu Staycation PR.',
        image: 'https://images.unsplash.com/photo-1541315878235-ef728e6789f2?auto=format&fit=crop&q=80&w=1200'
      }
    ]
  }
];

export const PROPERTIES: Property[] = [
  {
    id: '1081171030449673920',
    title: 'Villa Retiro R: Tu Refugio de Lujo',
    subtitle: 'Energía y Agua Garantizada • Piscina Privada • Cabo Rojo',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    description: 'Nuestra Villa Retiro R es la joya del oeste, donde la exclusividad se encuentra con la paz total. Energía y agua garantizada para un confort ininterrumpido gracias a nuestro sistema de generador automático y cisterna industrial. Relájate en tu piscina de agua salada privada rodeado de un entorno natural sereno. Ubicada estratégicamente cerca de Combate y Buyé, es el destino definitivo para una staycation PR de alto nivel con total privacidad.',
    price: 285,
    fees: {
      cleaningShort: 85,
      cleaningMedium: 110,
      cleaningLong: 160,
      petFee: 50,
      securityDeposit: 250
    },
    policies: {
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
      maxGuests: 10,
      wifiName: "VillaRetiro_Starlink_Premium",
      wifiPass: "Tropical2024!",
      accessCode: "4829 #"
    },
    blockedDates: [],
    calendarSync: [],
    rating: 4.99,
    reviews: 142,
    images: [
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1556912177-eb6369ee09d3?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200"
    ],
    amenities: [
      'Generador Eléctrico FULL Automático',
      'Piscina Privada de Agua Salada',
      'Privacidad Total & Seguridad',
      'Cisterna de Agua con Presión Constante',
      'Starlink WiFi de Alta Velocidad',
      'Área de BBQ Profesional',
      'Pet Friendly con Patio Cerrado',
      'Minutos de Playa Buyé & Combate'
    ],
    guests: 10,
    bedrooms: 3,
    beds: 6,
    baths: 2,
    host: {
      name: 'Carlos',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg',
      badges: ['Superhost Elite', 'Respuesta en < 1hr'],
      yearsHosting: 6
    }
  }
];
