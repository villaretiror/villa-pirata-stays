import { Property } from '../types';

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
    description: 'Experimenta un Modern Tropical Retreat diseñado para el descanso sofisticado. Nuestra villa boutique ofrece un entorno íntimo y estratégico, a solo minutos de las joyas de Cabo Rojo: Playa Buyé, Boquerón y La Playuela. Disfruta de una piscina privada dentro de un ambiente de total paz, respaldado por energía garantizada 24/7 y cisterna industrial. El refugio perfecto para quienes valoran el diseño contemporáneo y la serenidad en el corazón del suroeste de Puerto Rico.',
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
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/281b582c-ec67-41f7-b2f3-c4e2836e80a4.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0afd3011-e7b9-4ae2-94b5-5466425b52b2.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/b118ac79-89a6-47b1-adf4-5fea46f6dc33.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/f5b91aa6-36cf-4070-86ea-87e998933516.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/c54da188-e815-461a-9cd5-f8398d36ad71.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0d16a2dc-b605-486a-884a-644228e95fb3.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/e1f1a0e7-dff5-40f8-95df-d349ff4ad13e.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/d3471c3b-3710-4222-8f30-016b7d33c2c4.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/576f4bf0-2417-455c-8a57-ac41b2ea88e3.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/5cd6ba0c-ded1-472e-b0b8-f7400c51dcf2.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/2c6dad9b-6d36-44f1-9cbe-c77060372a9b.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/334ab574-3dbd-461b-9932-ab88395b3a3e.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTA4MTE3MTAzMDQ0OTY3MzkyMA%3D%3D/original/aa4b7262-6a8d-47cb-a619-0276be5a2921.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/2ce8ebe0-7906-4a94-8c7e-74f95b5fe217.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/9e1ec0df-0abd-4e90-afe5-036c8b65364c.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/13a7ff63-2ff8-49d6-80c0-df6ffb67b7ea.jpeg?im_w=1200"
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
      "https://a0.muscache.com/im/pictures/7995f6a9-6f43-4981-afce-a7dee103c15a.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/33a7455c-5e08-4aaa-96dd-13c9c3c3170e.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/e31738ed-102f-426c-82d2-31263eb8d445.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/c2464fa9-f2f9-4709-ae86-e6ace617f7f8.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/829895c5-4467-47c5-a6a0-f45236822129.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/584f2785-c49a-447e-8726-3efe6b2942fb.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/8a0df9a8-4529-4af6-86ea-6dce9c151760.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/8424aab1-10ca-4861-80a6-f1bd4c08921a.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/02378396-9994-4af7-b850-38f8d9c288da.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/a3827b35-7ee1-4d7b-8aca-1523e49c4f77.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/e898c250-6ba3-443c-b57e-911073afe5ce.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a3fc93d3-5558-4390-8213-2431be1edef5.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/fa1cce5f-f7b7-47e7-8502-b35a67c304d2.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/c48e388a-05ab-45a4-b749-37b822d3c6a0.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/1728d5c6-ad93-4e89-8a91-ded76c4dc125.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/514977cb-3eba-4ac6-a087-1daef13a032d.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/053c0d15-4426-4897-a964-dbb517295f1b.jpg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/b5cf8898-cbe6-4f07-a98e-6818f8b9ae73.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg?im_w=1200",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/56d8a07e-a969-4539-982e-f536dfd08dd3.jpeg?im_w=1200"
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
