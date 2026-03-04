-- IMPORTACIÓN DE PROPIEDADES: Villa Retiro R & Pirata Family House
-- Ejecuta esto en el SQL Editor de Supabase para poblar la tabla 'properties'

-- 1. Villa Retiro R (Airbnb ID: 1081171030449673920)
INSERT INTO public.properties (
  id, title, description, price_per_night, location, images, amenities, max_guests,
  blocked_dates, calendar_sync, is_offline
) VALUES (
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
    'https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/d51583c6-3c7e-4c79-a0d1-31501ac4a867.jpeg'
  ],
  ARRAY['Generador Eléctrico FULL Automático','Piscina Privada de Agua Salada','Starlink WiFi','Área de BBQ','Pet Friendly','Aire Acondicionado','Cocina Completa','Self Check-in'],
  8,
  '{}',
  '[{"id":"airbnb-villa-retiro","platform":"Airbnb","url":"https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae","lastSynced":"","syncStatus":"success"}]'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_per_night = EXCLUDED.price_per_night,
  images = EXCLUDED.images,
  amenities = EXCLUDED.amenities,
  max_guests = EXCLUDED.max_guests,
  calendar_sync = EXCLUDED.calendar_sync;

-- 2. Pirata Family House (Airbnb ID: 42839458)
INSERT INTO public.properties (
  id, title, description, price_per_night, location, images, amenities, max_guests,
  blocked_dates, calendar_sync, is_offline
) VALUES (
  '42839458',
  'Pirata Family House',
  'Disfruta y recarga energías en nuestra casa familiar. Este espacio es perfecto para parejas o familias que buscan vacacionar estando cerca de todo. PFH está ubicada a solo minutos de Boquerón, Combate, Buyé y Playa Sucia. Cerca de supermercados, restaurantes y licorerías. Self check-in para acceso fácil.',
  145,
  'Cabo Rojo, Puerto Rico',
  ARRAY[
    'https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/1ace8639-f247-4ebf-b0f0-174e5b3c1b46.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/34ba219d-7f08-402d-9ca5-6580c845d1e9.jpeg',
    'https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/4fddfcb0-1fc7-468d-8ec4-d4a55f767006.jpeg'
  ],
  ARRAY['WiFi de Alta Velocidad','Aire Acondicionado','Cocina Completa','Self Check-in','Estacionamiento Privado','TV con Streaming','Área de BBQ','Pet Friendly'],
  6,
  '{}',
  '[{"id":"airbnb-pirata-family","platform":"Airbnb","url":"https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331","lastSynced":"","syncStatus":"success"}]'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_per_night = EXCLUDED.price_per_night,
  images = EXCLUDED.images,
  amenities = EXCLUDED.amenities,
  max_guests = EXCLUDED.max_guests,
  calendar_sync = EXCLUDED.calendar_sync;
