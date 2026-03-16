import { Property } from '../../types';

/**
 * ARCHIVO DE RECUPERACIÓN (LUXURY BASELINE)
 * Contiene los datos extendidos del scrapping de Airbnb (amenidades, descripciones de lujo, IDs de fotos).
 * Este archivo sirve como caché local y referencia de diseño para el "Perfection Baseline".
 */

export const scratchPadVillas: Property[] = [
  {
    id: '1081171030449673920',
    title: 'Villa Retiro R',
    subtitle: 'Exclusive Boutique Stay · Modern Tropical Retreat · Cabo Rojo',
    location: 'Cabo Rojo, Puerto Rico',
    address: 'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    description: 'Experimenta un Modern Tropical Retreat diseñado para el descanso sofisticado. Nuestra villa boutique ofrece un entorno íntimo y estratégico, a solo minutos de las joyas de Cabo Rojo: Playa Buyé, Boquerón y La Playuela. Disfruta de una piscina privada de agua salada en un ambiente de total paz, respaldado por energía garantizada 24/7 y cisterna industrial. El refugio perfecto para quienes valoran el diseño contemporáneo y la serenidad en el corazón del suroeste de Puerto Rico.',
    price: 285,
    original_price: 325,
    cleaning_fee: 85,
    service_fee: 20,
    security_deposit: 0,
    fees: { "Limpieza": 85, "Service Fee": 20, "Security Deposit": 0 },
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
       { id: 'airbnb-vr', platform: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics... ', lastSynced: new Date().toISOString(), syncStatus: 'success' }
    ],
    rating: 4.78,
    reviews_count: 9,
    images: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0afd3011-e7b9-4ae2-94b5-5466425b52b2.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/b118ac79-89a6-47b1-adf4-5fea46f6dc33.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg"
    ],
    amenities: [
      'Piscina Privada (Agua Salada)',
      'SISTEMA SOLAR (Energía 24/7)',
      'Cisterna de Agua Industrial',
      'Internet de Alta Velocidad',
      'Aire Acondicionado Split',
      'Cocina Completa Equipada',
      'Pet Friendly',
      'Toallas de Playa'
    ],
    guests: 8,
    bedrooms: 2,
    beds: 5,
    baths: 2,
    host: { name: 'Brian', image: '...', badges: ['Superhost'], yearsHosting: 4 },
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
    original_price: 175,
    cleaning_fee: 85,
    service_fee: 0,
    security_deposit: 0,
    fees: { "Limpieza": 85, "Mantenimiento": 25 },
    policies: {
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
      guests: 6,
      wifiName: "PirataHouse_WiFi",
      wifiPass: "Pirata2024!",
      accessCode: "1776 #",
      cancellationPolicy: 'firm',
      houseRules: [
        'No fumar en interiores',
        'No fiestas ni eventos masivos',
        'Horas de silencio: 10:00 PM – 8:00 AM',
        'Mascotas permitidas'
      ]
    },
    blockedDates: [],
    calendarSync: [],
    rating: 4.94,
    reviews_count: 17,
    images: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg"
    ],
    amenities: [
      'WiFi de Alta Velocidad',
      'SISTEMA SOLAR (Energía Constante)',
      'Aire Acondicionado Split',
      'Cocina Completa Equipada',
      'Pet Friendly',
      'Toallas de Playa'
    ],
    guests: 6,
    bedrooms: 2,
    beds: 4,
    baths: 1,
    host: { name: 'Brian', image: '...', badges: ['Superhost'], yearsHosting: 4 },
    min_price_floor: 120,
    max_discount_allowed: 15
  }
];
