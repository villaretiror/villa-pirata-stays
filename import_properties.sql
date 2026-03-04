-- IMPORTACIÓN DE PROPIEDADES: Villa Retiro R & Pirata Family House
-- Ejecuta esto en el SQL Editor de Supabase

-- PASO 1: Añadir columna airbnb_id si no existe
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS airbnb_id TEXT;

-- PASO 2: Eliminar propiedades duplicadas previas (por si acaso)
DELETE FROM public.properties WHERE airbnb_id IN ('1081171030449673920', '42839458');

-- PASO 3: Insertar Villa Retiro R
INSERT INTO public.properties (
  id, airbnb_id, title, description, price_per_night, location, images, amenities, max_guests,
  blocked_dates, calendar_sync, is_offline
) VALUES (
  gen_random_uuid(),
  '1081171030449673920',
  'Villa Retiro R',
  'Escápate de la rutina en nuestro espacio diseñado para vacaciones familiares. A solo 9 minutos del colorido centro de "El Poblado" Boquerón y 10 minutos de Playa Buyé, Playa Combate y la famosa Playa Sucia. Villa Retiro R ofrece piscina privada de agua salada, generador eléctrico automático para energía 24/7 y cisterna industrial para agua garantizada.',
  285,
  'Cabo Rojo, Puerto Rico',
  ARRAY[
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0afd3011-e7b9-4ae2-94b5-5466425b52b2.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/b118ac79-89a6-47b1-adf4-5fea46f6dc33.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/281b582c-ec67-41f7-b2f3-c4e2836e80a4.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/e1f1a0e7-dff5-40f8-95df-d349ff4ad13e.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/0d16a2dc-b605-486a-884a-644228e95fb3.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/576f4bf0-2417-455c-8a57-ac41b2ea88e3.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/d3471c3b-3710-4222-8f30-016b7d33c2c4.jpeg'
  ],
  ARRAY[
    'Generador Eléctrico FULL Automático',
    'Piscina Privada de Agua Salada',
    'Privacidad Total y Seguridad',
    'Cisterna de Agua con Presión Constante',
    'Starlink WiFi de Alta Velocidad',
    'Área de BBQ Profesional',
    'Pet Friendly con Patio Cerrado',
    'Aire Acondicionado Central',
    'Cocina Completa Equipada',
    'Self Check-in con Lockbox'
  ],
  8,
  '{}',
  '[{"id":"airbnb-villa-retiro","platform":"Airbnb","url":"https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae","lastSynced":"","syncStatus":"success"}]'::jsonb,
  false
);

-- PASO 4: Insertar Pirata Family House
INSERT INTO public.properties (
  id, airbnb_id, title, description, price_per_night, location, images, amenities, max_guests,
  blocked_dates, calendar_sync, is_offline
) VALUES (
  gen_random_uuid(),
  '42839458',
  'Pirata Family House',
  'Disfruta y recarga energías en nuestra casa familiar. Este espacio es perfecto para parejas o familias que buscan vacacionar estando cerca de todo. PFH está ubicada a solo minutos de Boquerón, Combate, Buyé y Playa Sucia. Cerca de supermercados, restaurantes y licorerías. Self check-in para acceso fácil. ¡Tu aventura en el suroeste de Puerto Rico comienza aquí!',
  145,
  'Cabo Rojo, Puerto Rico',
  ARRAY[
    'https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/c2464fa9-f2f9-4709-ae86-e6ace617f7f8.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/b5cf8898-cbe6-4f07-a98e-6818f8b9ae73.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/33a7455c-5e08-4aaa-96dd-13c9c3c3170e.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/e31738ed-102f-426c-82d2-31263eb8d445.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a3fc93d3-5558-4390-8213-2431be1edef5.jpeg'
  ],
  ARRAY[
    'WiFi de Alta Velocidad',
    'Aire Acondicionado',
    'Cocina Completa',
    'Self Check-in con Lockbox',
    'Estacionamiento Privado',
    'TV con Streaming',
    'Área de BBQ',
    'Pet Friendly',
    'Cerca de Playa Boquerón',
    'A minutos de Playa Sucia y Buyé'
  ],
  6,
  '{}',
  '[{"id":"airbnb-pirata-family","platform":"Airbnb","url":"https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331","lastSynced":"","syncStatus":"success"}]'::jsonb,
  false
);

-- PASO 5: Verificación
SELECT id, airbnb_id, title, price_per_night, location FROM public.properties;
