-- RESTORE: LUXURY BASELINE & AIRBNB SCRAPPING DATA (v1.0.0)
-- Mission: Restore full authentic data and visual effects for Villa Retiro R and Pirata Family House.

-- 1. Restore Villa Retiro R (1081171030449673920)
UPDATE public.properties 
SET 
  title = 'Villa Retiro R',
  subtitle = 'Exclusive Boutique Stay · Modern Tropical Retreat · Cabo Rojo',
  description = 'Experimenta un Modern Tropical Retreat diseñado para el descanso sofisticado. Nuestra villa boutique ofrece un entorno íntimo y estratégico, a solo minutos de las joyas de Cabo Rojo: Playa Buyé, Boquerón y La Playuela. Disfruta de una piscina privada de agua salada en un ambiente de total paz, respaldado por energía garantizada 24/7 y cisterna industrial. El refugio perfecto para quienes valoran el diseño contemporáneo y la serenidad en el corazón del suroeste de Puerto Rico.',
  price = 285.00,
  original_price = 325.00, -- Strikethrough effect restored
  images = ARRAY[
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0afd3011-e7b9-4ae2-94b5-5466425b52b2.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/b118ac79-89a6-47b1-adf4-5fea46f6dc33.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg'
  ],
  amenities = ARRAY[
    'Piscina Privada (Agua Salada)',
    'SISTEMA SOLAR (Energía 24/7)',
    'Cisterna de Agua Industrial',
    'Internet de Alta Velocidad (Cable Estable)',
    'Aire Acondicionado Split',
    'Cocina Completa Equipada',
    'Área de BBQ con Carbón',
    'Pet Friendly (Patio Cerrado)',
    'Toallas de Playa'
  ],
  is_offline = false,
  updated_at = now()
WHERE id = '1081171030449673920';

-- 2. Restore Pirata Family House (42839458)
UPDATE public.properties 
SET 
  title = 'Pirata Family House',
  subtitle = 'Designer Villa · Estratégica & Íntima · Cerca de Boquerón',
  description = 'Descubre un refugio diseñado para el confort y la funcionalidad. Esta Designer Villa es el punto de partida ideal para explorar lo mejor de la costa, ubicada estratégicamente cerca de Buyé y Boquerón. Un espacio moderno e íntimo, perfecto para quienes buscan una estancia sofisticada cerca de las reservas naturales y los mejores restaurantes del suroeste. Vive la paz de Cabo Rojo en un entorno pensado para el descanso real.',
  price = 145.00,
  original_price = 175.00, -- Strikethrough effect restored
  images = ARRAY[
    'https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg'
  ],
  amenities = ARRAY[
    'WiFi de Alta Velocidad (65 Mbps)',
    'SISTEMA SOLAR (Energía Constante)',
    'Aire Acondicionado Split',
    'Cocina Completa Equipada',
    'Estacionamiento Privado',
    'Pet Friendly',
    'Toallas de Playa'
  ],
  is_offline = false,
  updated_at = now()
WHERE id = '42839458';

-- 3. Restore Missing Hero & Section Content (if wiped)
INSERT INTO public.system_settings (key, value)
VALUES ('site_content', '{
  "hero": {
    "title": "Villa & Pirata Stays",
    "slogan": "Donde la vida tiene sabor a sal y libertad.",
    "notif_status": "¡Hola, Viajero! 👋",
    "notif_promo": "¡Pronto! Notificaciones de Élite."
  },
  "sections": {
    "beaches": "Playas del Paraíso",
    "gastronomy": "Ruta Gastronómica",
    "nearby": "Cerca de Ti"
  },
  "cta": {
    "title": "Hospédate en el corazón del Paraíso.",
    "subtitle": "Todo lo que amas de Cabo Rojo a menos de 20 minutos.",
    "description": "Nuestras propiedades están ubicadas estratégicamente cerca de Boquerón, las mejores playas y restaurantes del suroeste."
  }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ✅ Restoration Complete. Villas should now appear with full metadata and images.
