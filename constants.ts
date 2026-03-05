import { Property, LocalGuideCategory } from './types';

export const HOST_PHONE = "17873560895";

// Origen: Sector Samán, F 11 C. 5, Cabo Rojo, 00622
// Google Maps origin param: 18.0636,-67.1569
const MAPS_ORIGIN = '18.0636,-67.1569';
const mapRoute = (dest: string) => `https://www.google.com/maps/dir/${MAPS_ORIGIN}/${encodeURIComponent(dest)}`;

export const INITIAL_LOCAL_GUIDE: LocalGuideCategory[] = [
  {
    id: 'beaches',
    category: 'Playas del Paraíso',
    icon: 'beach_access',
    items: [
      {
        name: 'Balneario de Boquerón & El Poblado',
        distance: '5-7 min',
        desc: 'El epicentro de la vida nocturna del suroeste. Ostiones frescos en la calle, bares con música en vivo, y un malecón vibrante. Camina entre colores, sabores y la mejor energía de Cabo Rojo.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute('Balneario de Boquerón, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Buyé',
        distance: '12-15 min',
        desc: 'La favorita de Instagram. Arena blanca, aguas color turquesa cristalino y un ambiente tranquilo. Perfecta para snorkeling, kayak o simplemente desconectar del mundo con un atardecer eterno.',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaBuye.jpeg',
        mapUrl: mapRoute('Playa Buyé, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Sucia (La Playuela) & El Faro',
        distance: '20-25 min',
        desc: 'Reserva natural virgen e indispensable. Acantilados dramáticos, el icónico Faro Los Morrillos, y una playa sin igual. La joya de la corona del suroeste boricua. ¡Imperdible!',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaSucia.jpeg',
        mapUrl: mapRoute('Playa Sucia La Playuela, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Combate',
        distance: '15-18 min',
        desc: 'Los atardeceres más épicos del Caribe. Restaurantes frente al mar, ambiente familiar de día y romántico al caer el sol. El kilómetro más fotogénico de la costa oeste.',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/CombateBeach.jpeg',
        mapUrl: mapRoute('Playa Combate, Cabo Rojo, Puerto Rico')
      }
    ]
  },
  {
    id: 'gastronomy',
    category: 'Ruta Gastronómica',
    icon: 'restaurant',
    items: [
      {
        name: 'Buena Vibra (Boquerón)',
        distance: '6 min',
        desc: 'Cócteles artesanales, ambiente vibrante y la mejor energía nocturna de Boquerón. El punto de encuentro favorito de locales y viajeros. Pide el mojito de parcha y déjate llevar por la buena vibra.',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/BuenaVibra.jpeg',
        mapUrl: mapRoute('Buena Vibra Boquerón, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Milla de Oro (Joyuda)',
        distance: '15 min',
        desc: 'La capital del marisco en Puerto Rico. Más de 30 restaurantes frente al mar con los pescados y mariscos más frescos del Caribe. Pide el chillo entero frito — no te arrepentirás.',
        image: 'https://images.unsplash.com/photo-1551218808-94e220e034a8?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute('Milla de Oro Joyuda, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Costa Brava',
        distance: '8 min',
        desc: 'Mariscos premium con vista al mar. Langosta, pulpo a la parrilla y vinos selectos en un entorno elegante pero accesible. Ideal para celebraciones y cenas románticas al atardecer.',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute('Costa Brava Restaurant, Cabo Rojo, Puerto Rico')
      }
    ]
  },
  {
    id: 'nearby',
    category: 'Cerca de Ti',
    icon: 'place',
    items: [
      {
        name: 'Carr. 100 — Acceso Rápido',
        distance: '2 min',
        desc: 'La arteria principal del suroeste. Desde aquí llegas a Mayagüez, San Germán, Lajas y todas las playas. Gasolineras, farmacias y supermercados a tu alcance en minutos.',
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute('Carr 100, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Zona Tranquila & Segura',
        distance: 'Tu hogar',
        desc: 'Sector Samán es una comunidad residencial pacífica rodeada de naturaleza. Sin ruido, sin estrés. Duerme profundamente y despierta con el canto de los pájaros antes de tu día de playa.',
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200'
      },
      {
        name: 'Supermercados & Esenciales',
        distance: '5 min',
        desc: 'Ralph\'s Food Warehouse y Econo a minutos. Todo lo que necesitas para tu BBQ, snacks de playa y provisiones sin alejarte. Licorerías y panaderías locales también cerca.',
        image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute("Ralph's Food Warehouse, Cabo Rojo, Puerto Rico")
      }
    ]
  }
];

export const PROPERTIES: Property[] = [
  {
    id: '1081171030449673920',
    title: 'Villa Retiro R',
    subtitle: 'Family Pool Retreat · Energía Garantizada · Cabo Rojo',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    description: 'Escápate de la rutina en nuestro espacio diseñado para vacaciones familiares. A solo 9 minutos del colorido centro de "El Poblado" Boquerón y 10 minutos de Playa Buyé, Playa Combate y la famosa Playa Sucia. Villa Retiro R ofrece piscina privada de agua salada, generador eléctrico automático para energía 24/7 y cisterna industrial para agua garantizada. El retiro perfecto para familias que buscan confort, privacidad y acceso inmediato a las mejores playas del suroeste de Puerto Rico.',
    price: 285,
    fees: {
      cleaningShort: 85,
      cleaningMedium: 110,
      cleaningLong: 160,
      petFee: 50,
      securityDeposit: 250
    },
    policies: {
      checkInTime: "4:00 PM",
      checkOutTime: "11:00 AM",
      maxGuests: 8,
      wifiName: "VillaRetiro_Starlink_Premium",
      wifiPass: "Tropical2024!",
      accessCode: "4829 #",
      cancellationPolicy: 'firm',
      houseRules: [
        'No fumar en interiores',
        'No fiestas ni eventos masivos',
        'Horas de silencio: 10:00 PM – 8:00 AM',
        'Máximo 8 huéspedes',
        'Mascotas permitidas con fee adicional'
      ]
    },
    blockedDates: [],
    calendarSync: [
      {
        id: 'airbnb-villa-retiro',
        platform: 'Airbnb',
        url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success' as const
      }
    ],
    rating: 4.78,
    reviews: 9,
    images: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0afd3011-e7b9-4ae2-94b5-5466425b52b2.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/b118ac79-89a6-47b1-adf4-5fea46f6dc33.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/281b582c-ec67-41f7-b2f3-c4e2836e80a4.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/e1f1a0e7-dff5-40f8-95df-d349ff4ad13e.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0d16a2dc-b605-486a-884a-644228e95fb3.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/576f4bf0-2417-455c-8a57-ac41b2ea88e3.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/d3471c3b-3710-4222-8f30-016b7d33c2c4.jpeg"
    ],
    amenities: [
      'Piscina Privada (Agua Salada)',
      'Generador Eléctrico Automático 24/7',
      'Cisterna de Agua Industrial',
      'WiFi Starlink de Alta Velocidad',
      'Aire Acondicionado Split',
      'Cocina Completa Equipada',
      'Área de BBQ con Carbón',
      'Estacionamiento Techado',
      'Self Check-in con Lockbox',
      'Pet Friendly (Patio Cerrado)',
      'TV con Smart Streaming',
      'Lavadora Disponible',
      'Cámaras de Seguridad (Exterior)',
      'Detector de Humo y CO'
    ],
    featuredAmenity: 'Generador Eléctrico FULL Automático',
    category: 'Boutique',
    guests: 8,
    bedrooms: 2,
    beds: 5,
    baths: 2,
    host: {
      name: 'Brian',
      image: 'https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg?aki_policy=profile_x_medium',
      badges: ['4 años como Anfitrión', 'Respuesta en < 1hr'],
      yearsHosting: 4
    }
  },
  {
    id: '42839458',
    title: 'Pirata Family House',
    subtitle: 'Área de Boquerón · Cerca de Todo · Cabo Rojo',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Boquerón, Cabo Rojo, Puerto Rico 00622',
    description: 'Disfruta y recarga energías en nuestra casa familiar. Este espacio es perfecto para parejas o familias que buscan vacacionar estando cerca de todo. Pirata Family House está ubicada a solo minutos de Boquerón, Combate, Buyé y Playa Sucia. Cerca de supermercados, restaurantes y licorerías. Self check-in para acceso fácil. ¡Tu aventura en el suroeste de Puerto Rico comienza aquí!',
    price: 145,
    fees: {
      cleaningShort: 65,
      cleaningMedium: 85,
      cleaningLong: 120,
      petFee: 35,
      securityDeposit: 150
    },
    policies: {
      checkInTime: "4:00 PM",
      checkOutTime: "11:00 AM",
      maxGuests: 6,
      wifiName: "PirataHouse_WiFi",
      wifiPass: "Pirata2024!",
      accessCode: "1776 #",
      cancellationPolicy: 'firm',
      houseRules: [
        'No fumar en interiores',
        'No fiestas ni eventos masivos',
        'Horas de silencio: 10:00 PM – 8:00 AM',
        'Máximo 6 huéspedes',
        'Mascotas permitidas con fee adicional'
      ]
    },
    blockedDates: [],
    calendarSync: [
      {
        id: 'airbnb-pirata-family',
        platform: 'Airbnb',
        url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success' as const
      }
    ],
    rating: 4.94,
    reviews: 17,
    images: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/c2464fa9-f2f9-4709-ae86-e6ace617f7f8.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/b5cf8898-cbe6-4f07-a98e-6818f8b9ae73.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/33a7455c-5e08-4aaa-96dd-13c9c3c3170e.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/e31738ed-102f-426c-82d2-31263eb8d445.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a3fc93d3-5558-4390-8213-2431be1edef5.jpeg"
    ],
    amenities: [
      'WiFi de Alta Velocidad',
      'Aire Acondicionado Split',
      'Cocina Completa Equipada',
      'Self Check-in con Lockbox',
      'Estacionamiento Privado',
      'TV con Smart Streaming',
      'Área de BBQ',
      'Pet Friendly',
      'Lavadora Disponible',
      'Detector de Humo y CO',
      'Plancha y Tabla de Planchar',
      'Botiquín de Primeros Auxilios'
    ],
    featuredAmenity: 'Cerca de Playa Boquerón',
    category: 'Familiar',
    guests: 6,
    bedrooms: 2,
    beds: 4,
    baths: 1,
    host: {
      name: 'Brian',
      image: 'https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg?aki_policy=profile_x_medium',
      badges: ['4 años como Anfitrión', 'Superhost'],
      yearsHosting: 4
    }
  }
];
