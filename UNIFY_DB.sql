-- Clean unused UUIDs and any row that is not the two official Airbnb IDs
DELETE FROM public.properties
WHERE id NOT IN ('1081171030449673920', '42839458');

-- Upsert Villa Retiro R (1081171030449673920)
INSERT INTO public.properties (
  id, title, subtitle, location, address, description, price_per_night,
  cleaning_fee, service_fee, security_deposit, fees,
  check_in_time, check_out_time, max_guests_policy, max_guests, cancellation_policy, house_rules,
  wifi_name, wifi_pass, access_code,
  rating, reviews_count, images, amenities, featured_amenity,
  category, bedrooms, beds, baths, email, calendar_sync
) VALUES (
  '1081171030449673920',
  'Villa Retiro R',
  'Family Pool Retreat · Energía Garantizada · Cabo Rojo',
  'Cabo Rojo, Puerto Rico',
  'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
  'Escápate de la rutina en nuestro espacio diseñado para vacaciones familiares. A solo 9 minutos del colorido centro de "El Poblado" Boquerón y 10 minutos de Playa Buyé, Playa Combate y la famosa Playa Sucia. Villa Retiro R ofrece piscina privada de agua salada, generador eléctrico automático para energía 24/7 y cisterna industrial para agua garantizada. El retiro perfecto para familias que buscan confort, privacidad y acceso inmediato a las mejores playas del suroeste de Puerto Rico.',
  285,
  85,
  20,
  250,
  '{"Limpieza": 85, "Service Fee": 20, "Security Deposit": 250}'::jsonb,
  '4:00 PM',
  '11:00 AM',
  8,
  8,
  'firm',
  ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 8 huéspedes', 'Mascotas permitidas con fee adicional'],
  'VillaRetiro_Starlink_Premium',
  'Tropical2024!',
  '4829 #',
  4.78,
  9,
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
    'Piscina Privada (Agua Salada)', 'Generador Eléctrico Automático 24/7', 'Cisterna de Agua Industrial', 'WiFi Starlink de Alta Velocidad', 'Aire Acondicionado Split', 'Cocina Completa Equipada', 'Área de BBQ con Carbón', 'Estacionamiento Techado', 'Self Check-in con Lockbox', 'Pet Friendly (Patio Cerrado)', 'TV con Smart Streaming', 'Lavadora Disponible', 'Cámaras de Seguridad (Exterior)', 'Detector de Humo y CO'
  ],
  'Generador Eléctrico FULL Automático',
  'Boutique',
  2,
  5,
  2,
  'villaretiror@gmail.com',
  '[{"id": "airbnb-villa-retiro", "url": "https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae", "platform": "Airbnb", "lastSynced": "2024-01-01T00:00:00.000Z", "syncStatus": "success"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, location = EXCLUDED.location, address = EXCLUDED.address,
  description = EXCLUDED.description, price_per_night = EXCLUDED.price_per_night,
  cleaning_fee = EXCLUDED.cleaning_fee, service_fee = EXCLUDED.service_fee, security_deposit = EXCLUDED.security_deposit,
  fees = EXCLUDED.fees, check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time,
  max_guests_policy = EXCLUDED.max_guests_policy, max_guests = EXCLUDED.max_guests, cancellation_policy = EXCLUDED.cancellation_policy,
  house_rules = EXCLUDED.house_rules, wifi_name = EXCLUDED.wifi_name, wifi_pass = EXCLUDED.wifi_pass,
  access_code = EXCLUDED.access_code, rating = EXCLUDED.rating, reviews_count = EXCLUDED.reviews_count,
  images = EXCLUDED.images, amenities = EXCLUDED.amenities, featured_amenity = EXCLUDED.featured_amenity,
  category = EXCLUDED.category, bedrooms = EXCLUDED.bedrooms, beds = EXCLUDED.beds,
  baths = EXCLUDED.baths, email = EXCLUDED.email, calendar_sync = EXCLUDED.calendar_sync;

-- Upsert Pirata Family House (42839458)
INSERT INTO public.properties (
  id, title, subtitle, location, address, description, price_per_night,
  cleaning_fee, service_fee, security_deposit, fees,
  check_in_time, check_out_time, max_guests_policy, max_guests, cancellation_policy, house_rules,
  wifi_name, wifi_pass, access_code,
  rating, reviews_count, images, amenities, featured_amenity,
  category, bedrooms, beds, baths, email, calendar_sync
) VALUES (
  '42839458',
  'Pirata Family House',
  'Área de Boquerón · Cerca de Todo · Cabo Rojo',
  'Cabo Rojo, Puerto Rico',
  'Boquerón, Cabo Rojo, Puerto Rico 00622',
  'Disfruta y recarga energías en nuestra casa familiar. Este espacio es perfecto para parejas o familias que buscan vacacionar estando cerca de todo. Pirata Family House está ubicada a solo minutos de Boquerón, Combate, Buyé y Playa Sucia. Cerca de supermercados, restaurantes y licorerías. Self check-in para acceso fácil. ¡Tu aventura en el suroeste de Puerto Rico comienza aquí!',
  145,
  85,
  0,
  250,
  '{"Limpieza": 85, "Mantenimiento de Piscina": 25, "Security Deposit": 250}'::jsonb,
  '4:00 PM',
  '11:00 AM',
  6,
  6,
  'firm',
  ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 6 huéspedes', 'Mascotas permitidas con fee adicional'],
  'PirataHouse_WiFi',
  'Pirata2024!',
  '1776 #',
  4.94,
  17,
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
    'WiFi de Alta Velocidad', 'Aire Acondicionado Split', 'Cocina Completa Equipada', 'Self Check-in con Lockbox', 'Estacionamiento Privado', 'TV con Smart Streaming', 'Área de BBQ', 'Pet Friendly', 'Lavadora Disponible', 'Detector de Humo y CO', 'Plancha y Tabla de Planchar', 'Botiquín de Primeros Auxilios'
  ],
  'Cerca de Playa Boquerón',
  'Familiar',
  2,
  4,
  1,
  'villaretiror@gmail.com',
  '[{"id": "airbnb-pirata-family", "url": "https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331", "platform": "Airbnb", "lastSynced": "2024-01-01T00:00:00.000Z", "syncStatus": "success"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, location = EXCLUDED.location, address = EXCLUDED.address,
  description = EXCLUDED.description, price_per_night = EXCLUDED.price_per_night,
  cleaning_fee = EXCLUDED.cleaning_fee, service_fee = EXCLUDED.service_fee, security_deposit = EXCLUDED.security_deposit,
  fees = EXCLUDED.fees, check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time,
  max_guests_policy = EXCLUDED.max_guests_policy, max_guests = EXCLUDED.max_guests, cancellation_policy = EXCLUDED.cancellation_policy,
  house_rules = EXCLUDED.house_rules, wifi_name = EXCLUDED.wifi_name, wifi_pass = EXCLUDED.wifi_pass,
  access_code = EXCLUDED.access_code, rating = EXCLUDED.rating, reviews_count = EXCLUDED.reviews_count,
  images = EXCLUDED.images, amenities = EXCLUDED.amenities, featured_amenity = EXCLUDED.featured_amenity,
  category = EXCLUDED.category, bedrooms = EXCLUDED.bedrooms, beds = EXCLUDED.beds,
  baths = EXCLUDED.baths, email = EXCLUDED.email, calendar_sync = EXCLUDED.calendar_sync;
