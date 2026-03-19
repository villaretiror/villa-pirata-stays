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
        desc: '¡M spot favorito para el "chinchorreo" nocturno! No puedes irte sin probar los ostiones frescos en la calle mientras escuchas música en vivo. El ambiente en el Poblado es pura energía boricua. Después de tanta fiesta, el silencio de Pirata Family House te abrazará como un capitán en su puerto.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
        mapUrl: mapRoute('Balneario de Boquerón, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Buyé',
        distance: '12-15 min',
        desc: 'Si buscas ese azul turquesa de postal, Buyé es tu lugar. Yo suelo ir temprano con mi kayak para ver el fondo clarito. Es el sitio perfecto para desconectar del resto del mundo. Al regresar, date un chapuzón en la piscina de Villa Retiro para cerrar el día con broche de oro.',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaBuye.jpeg',
        mapUrl: mapRoute('Playa Buyé, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Sucia (La Playuela) & El Faro',
        distance: '20-25 min',
        desc: '¡La joya de mi corona! Camina hasta el Faro Los Morrillos para unas fotos de película en los acantilados, y luego baja a La Playuela a refrescarte. Es una reserva virgen que te robará el aliento. Luego de esta aventura salvaje, la paz de Villa Retiro te sabrá a gloria.',
        image: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaSucia.jpeg',
        mapUrl: mapRoute('Playa Sucia La Playuela, Cabo Rojo, Puerto Rico')
      },
      {
        name: 'Playa Combate',
        distance: '15-18 min',
        desc: 'Para mí, no hay atardecer más épico que el de Combate. Me encanta sentarme frente al mar con una bebida fría y ver cómo el sol se esconde. Es el cierre perfecto para cualquier día. Disfruta ese último rayo de luz sabiendo que Pirata Family House te espera a solo minutos.',
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
        image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1200',
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
    subtitle: 'Exclusive Boutique Stay · Modern Tropical Retreat · Cabo Rojo',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    description: 'Experimenta un Modern Tropical Retreat diseñado para el descanso sofisticado. Nuestra villa boutique ofrece un entorno íntimo y estratégico, a solo minutos de las joyas de Cabo Rojo: Playa Buyé, Boquerón y La Playuela. Disfruta de una piscina exclusiva en un ambiente de total paz, respaldado por energía garantizada 24/7 y cisterna industrial. El refugio perfecto para quienes valoran el diseño contemporáneo y la serenidad en el corazón del suroeste de Puerto Rico.',
    price: 285,
    cleaning_fee: 85,
    service_fee: 20,
    security_deposit: 0,
    fees: {
      "Limpieza": 85,
      "Service Fee": 20,
      "Security Deposit": 0
    },
    policies: {
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
      guests: 8,
      wifiName: "VillaRetiro_HighSpeed_WiFi",
      wifiPass: "Tropical2024!",
      accessCode: "4829 #",
      cancellationPolicy: 'firm',
      houseRules: [
        'Apagar luces y A/C al salir',
        'Mantener puertas cerradas si el A/C está encendido',
        'No fumar en interiores',
        'No fiestas ni eventos masivos',
        'Horas de silencio: 10:00 PM – 8:00 AM',
        'Mascotas permitidas'
      ]
    },
    blockedDates: [],
    calendarSync: [
      {
        id: 'airbnb-villa-retiro',
        platform: 'Airbnb',
        url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success'
      },
      {
        id: 'booking-villa-retiro',
        platform: 'Booking.com',
        url: 'https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success'
      }
    ],
    rating: 4.78,
    reviews_count: 9,
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
      'SISTEMA SOLAR (Energía 24/7)',
      'Cisterna de Agua Industrial',
      'Internet de Alta Velocidad 65 Mbps (Cable Estable)',
      'Aire Acondicionado Split',
      'Cocina Completa Equipada',
      'Área de BBQ con Carbón',
      'Estacionamiento Techado',
      'Self Check-in con Lockbox',
      'Pet Friendly (Patio Cerrado)',
      'TV con Smart Streaming',
      'Lavadora Disponible',
      'Toallas de Playa',
      'Cámaras de Seguridad (Exterior)',
      'Detector de Humo y CO'
    ],
    featuredAmenity: 'SISTEMA SOLAR (Energía 24/7)',
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
    },
    min_price_floor: 180,
    max_discount_allowed: 15
  },
  {
    id: '42839458',
    title: 'Pirata Family House',
    subtitle: 'Designer Villa · Estratégica & Íntima · Cerca de Boquerón',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Boquerón, Cabo Rojo, Puerto Rico 00622',
    description: 'Descubre un refugio diseñado para el confort y la funcionalidad. Esta Designer Villa es el punto de partida ideal para explorar lo mejor de la costa, ubicada estratégicamente cerca de Buyé y Boquerón. Un espacio moderno e íntimo, perfecto para quienes buscan una estancia sofisticada cerca de las reservas naturales y los mejores restaurantes del suroeste. Vive la paz de Cabo Rojo en un entorno pensado para el descanso real.',
    price: 145,
    cleaning_fee: 85,
    service_fee: 0,
    security_deposit: 0,
    fees: {
      "Limpieza": 85,
      "Mantenimiento de Piscina": 25,
      "Security Deposit": 0
    },
    policies: {
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
      guests: 6,
      wifiName: "PirataHouse_WiFi",
      wifiPass: "Pirata2024!",
      accessCode: "1776 #",
      cancellationPolicy: 'firm',
      houseRules: [
        'Para encender la estufa se requiere fósforo o encendedor',
        'No fumar en interiores',
        'No fiestas ni eventos masivos',
        'Horas de silencio: 10:00 PM – 8:00 AM',
        'Mascotas permitidas'
      ]
    },
    blockedDates: [],
    calendarSync: [
      {
        id: 'airbnb-pirata-family',
        platform: 'Airbnb',
        url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success'
      },
      {
        id: 'booking-pirata-family',
        platform: 'Booking.com',
        url: 'https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669',
        lastSynced: new Date().toISOString(),
        syncStatus: 'success'
      }
    ],
    rating: 4.94,
    reviews_count: 17,
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
      'WiFi de Alta Velocidad (65 Mbps)',
      'SISTEMA SOLAR (Energía Constante)',
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
    },
    min_price_floor: 120,
    max_discount_allowed: 15
  }
];

export const DEFAULT_SITE_CONTENT = {
  hero: {
    title: "Villa & Pirata Stays",
    slogan: "Donde la vida tiene sabor a sal y libertad.",
    welcome_badge: "¡Hola, Viajero! 👋",
    notif_status: "¡Hola, Viajero! 👋",
    notif_promo: "¡Pronto! Notificaciones de Élite."
  },
  sections: {
    beaches: "Playas del Paraíso",
    gastronomy: "Ruta Gastronómica",
    nearby: "Cerca de Ti"
  },
  cta: {
    title: "Hospédate en el corazón del Paraíso.",
    subtitle: "Todo lo que amas de Cabo Rojo a menos de 20 minutos.",
    description: "Nuestras propiedades están ubicadas estratégicamente cerca de Boquerón, las mejores playas y restaurantes del suroeste."
  },
  contact: {
    title: "Reserva con Salty.",
    subtitle: "Sin comisiones de plataforma, solo el mejor trato directo garantizado. Si tienes dudas sobre las villas, disponibilidad para grupos grandes o eventos especiales, déjanos un mensaje.",
    phone: "+1 (787) 356-0895",
    email: "reservas@villaretiror.com",
    whatsapp: "17873560895"
  },
  seo: {
    default_title: "Villa & Pirata Stays · Boutique Stays Cabo Rojo",
    description: "Boutique Stays en Cabo Rojo, Puerto Rico. Descubre Villa Retiro R y Pirata Family House."
  }
};

export const DEFAULT_VILLA_KNOWLEDGE = {
  location: {
    description: "Cabo Rojo, Puerto Rico. A 5 minutos de Playa Buyé, 10 minutos del Poblado de Boquerón.",
    distances: "Aeropuerto más cercano (BQN): 45 mins. San Juan (SJU): 2.5 horas."
  },
  policies: {
    checkIn: "Check-in: 3:00 PM (Unificado)",
    checkOut: "11:00 AM",
    rules: "1. No se permiten fiestas ni eventos masivos. 2. Horario de silencio de 10:00 PM a 8:00 AM. 3. Se admiten mascotas. 4. Prohibido fumar dentro de las instalaciones. 5. Apagar luces y A/C al salir.",
    cancellation: "Cancelación Gratuita hasta 5 días antes de la llegada. Después, se retendrá el 50% de la estadía.",
    deposit: "Gestionado manualmente vía Dashboard."
  },
  amenities: {
    general: "Piscina privada o acceso a áreas recreativas, Internet de Alta Velocidad (Cable Estable), Sistema Solar (Energía 24/7), AC en habitaciones, BBQ, Cocina Equipada, Toallas de playa."
  },
  emergencies: {
    contact: "Equipo de Villa & Pirata (vía chat o WhatsApp).",
    procedures: "Hospital Bella Vista a 20 mins. Policía/Ambulancia: 911."
  },
  survival_tips: {
    parking: "En el Poblado y playas populares (Buyé, Combate), el estacionamiento puede ser limitado los fines de semana. Te recomiendo llegar antes de las 10:00 AM.",
    cash: "Aunque la mayoría acepta tarjetas y ATH Móvil, algunos quioscos de abundancia en las playas solo aceptan efectivo. Hay cajeros en los supermercados Econo y Ralph's a 5 mins.",
    hours: "El Poblado cobra vida después de las 6:00 PM. Los restaurantes de Joyuda suelen cerrar cocina entre 9:00 PM y 10:00 PM.",
    cooking: "Para Pirata Family House, recuerda tener encendedor/fósforos para la estufa."
  }
};
