-- 🗺️ MIGRACIÓN DE CONSTANTES A SUPABASE
-- Este script inserta los datos de constants.ts y villa_knowledge.ts en las tablas correspondientes.

-- 1. Insertar Propiedades (Villa Retiro R)
INSERT INTO properties (
    id, title, subtitle, location, address, description, price, 
    cleaning_fee, service_fee, security_deposit, fees, policies, 
    "calendarSync", rating, reviews_count, images, amenities, 
    "featuredAmenity", category, guests, bedrooms, beds, baths, host
) VALUES (
    '1081171030449673920', 
    'Villa Retiro R', 
    'Exclusive Boutique Stay · Modern Tropical Retreat · Cabo Rojo',
    'Cabo Rojo, Puerto Rico',
    'Carr 307 Km 6.2, Interior, Cabo Rojo, 00623',
    'Experimenta un Modern Tropical Retreat diseñado para el descanso sofisticado. Nuestra villa boutique ofrece un entorno íntimo y estratégico, a solo minutos de las joyas de Cabo Rojo: Playa Buyé, Boquerón y La Playuela. Disfruta de una piscina privada de agua salada en un ambiente de total paz, respaldado por energía garantizada 24/7 y cisterna industrial. El refugio perfecto para quienes valoran el diseño contemporáneo y la serenidad en el corazón del suroeste de Puerto Rico.',
    285, 85, 20, 0,
    '{"Limpieza": 85, "Service Fee": 20, "Security Deposit": 0}'::jsonb,
    '{"checkInTime": "3:00 PM", "checkOutTime": "11:00 AM", "guests": 8, "wifiName": "VillaRetiro_HighSpeed_WiFi", "wifiPass": "Tropical2024!", "accessCode": "4829 #", "cancellationPolicy": "firm", "houseRules": ["Apagar luces y A/C al salir", "Mantener puertas cerradas si el A/C está encendido", "No fumar en interiores", "No fiestas ni eventos masivos", "Horas de silencio: 10:00 PM – 8:00 AM", "Mascotas permitidas"]}'::jsonb,
    '[{"id": "airbnb-villa-retiro", "platform": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae", "syncStatus": "success"}, {"id": "booking-villa-retiro", "platform": "Booking.com", "url": "https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1", "syncStatus": "success"}]'::jsonb,
    4.78, 9,
    '["https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg", "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg"]'::jsonb,
    '["Piscina Privada (Agua Salada)", "SISTEMA SOLAR (Energía 24/7)", "Cisterna de Agua Industrial", "Internet de Alta Velocidad 65 Mbps", "Aire Acondicionado Split", "Cocina Completa Equipada", "Área de BBQ con Carbón", "Pet Friendly", "TV con Smart Streaming"]'::jsonb,
    'SISTEMA SOLAR (Energía 24/7)',
    'Boutique', 8, 2, 5, 2,
    '{"name": "Brian", "image": "https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg", "badges": ["4 años como Anfitrión", "Respuesta en < 1hr"], "yearsHosting": 4}'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    amenities = EXCLUDED.amenities,
    "calendarSync" = EXCLUDED."calendarSync";

-- 2. Insertar Propiedades (Pirata Family House)
INSERT INTO properties (
    id, title, subtitle, location, address, description, price, 
    cleaning_fee, service_fee, security_deposit, fees, policies, 
    "calendarSync", rating, reviews_count, images, amenities, 
    "featuredAmenity", category, guests, bedrooms, beds, baths, host
) VALUES (
    '42839458', 
    'Pirata Family House', 
    'Designer Villa · Estratégica & Íntima · Cerca de Boquerón',
    'Cabo Rojo, Puerto Rico',
    'Boquerón, Cabo Rojo, Puerto Rico 00622',
    'Descubre un refugio diseñado para el confort y la funcionalidad. Esta Designer Villa es el punto de partida ideal para explorar lo mejor de la costa, ubicada estratégicamente cerca de Buyé y Boquerón. Un espacio moderno e íntimo, perfecto para quienes buscan una estancia sofisticada cerca de las reservas naturales y los mejores restaurantes del suroeste. Vive la paz de Cabo Rojo en un entorno pensado para el descanso real.',
    145, 85, 0, 0,
    '{"Limpieza": 85, "Mantenimiento de Piscina": 25}'::jsonb,
    '{"checkInTime": "3:00 PM", "checkOutTime": "11:00 AM", "guests": 6, "wifiName": "PirataHouse_WiFi", "wifiPass": "Pirata2024!", "accessCode": "1776 #", "cancellationPolicy": "firm", "houseRules": ["Para encender la estufa se requiere fósforo o encendedor", "No fumar en interiores", "No fiestas ni eventos masivos", "Horas de silencio: 10:00 PM – 8:00 AM", "Mascotas permitidas"]}'::jsonb,
    '[{"id": "airbnb-pirata-family", "platform": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331", "syncStatus": "success"}, {"id": "booking-pirata-family", "platform": "Booking.com", "url": "https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669", "syncStatus": "success"}]'::jsonb,
    4.94, 17,
    '["https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg", "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg"]'::jsonb,
    '["WiFi de Alta Velocidad (65 Mbps)", "SISTEMA SOLAR (Energía Constante)", "Aire Acondicionado Split", "Cocina Completa Equipada", "Pet Friendly", "Área de BBQ"]'::jsonb,
    'Cerca de Playa Boquerón',
    'Familiar', 6, 2, 4, 1,
    '{"name": "Brian", "image": "https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg", "badges": ["4 años como Anfitrión", "Superhost"], "yearsHosting": 4}'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    amenities = EXCLUDED.amenities,
    "calendarSync" = EXCLUDED."calendarSync";

-- 3. Insertar System Settings (Local Guide)
INSERT INTO system_settings (key, value, updated_at) VALUES (
    'local_guide_data',
    '[{"id": "beaches", "category": "Playas del Paraíso", "icon": "beach_access", "items": [{"name": "Balneario de Boquerón", "distance": "5-7 min", "desc": "Mi spot favorito para el chinchorreo nocturno."}, {"name": "Playa Buyé", "distance": "12-15 min", "desc": "Azul turquesa de postal."}]}]'::jsonb,
    now()
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 4. Insertar System Settings (Villa Knowledge)
INSERT INTO system_settings (key, value, updated_at) VALUES (
    'villa_knowledge',
    '{"location": {"description": "Cabo Rojo, Puerto Rico."}, "policies": {"checkIn": "3:00 PM", "checkOut": "11:00 AM", "rules": "No fiestas, no fumar, pets ok."}, "survival_tips": {"parking": "Llega temprano el fin de semana."}}'::jsonb,
    now()
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 5. Insertar System Settings (Secret Spots)
INSERT INTO system_settings (key, value, updated_at) VALUES (
    'secret_spots',
    '[{"title": "Cueva del Pirata", "desc": "Caminata mágica al atardecer.", "tip": "Usa tenis cerrados."}]'::jsonb,
    now()
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
