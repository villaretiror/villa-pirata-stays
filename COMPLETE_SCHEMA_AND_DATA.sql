-- ============================================================
-- FINAL REPAIR & HYDRATION: Villa & Pirata Stays
-- Asegura que todas las columnas CamelCase existan y tengan datos.
-- ============================================================

DO $$ 
BEGIN
    -- 1. Asegurar Columna 'host' (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='host') THEN
        ALTER TABLE public.properties ADD COLUMN host JSONB DEFAULT '{"name": "Brian", "image": "", "badges": [], "yearsHosting": 4}'::jsonb;
    END IF;

    -- 2. Asegurar Columna 'calendarSync' (JSONB) con comillas para CamelCase
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='calendarSync') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='calendar_sync') THEN
            ALTER TABLE public.properties RENAME COLUMN calendar_sync TO "calendarSync";
        ELSE
            ALTER TABLE public.properties ADD COLUMN "calendarSync" JSONB DEFAULT '[]'::jsonb;
        END IF;
    END IF;

    -- 3. Asegurar Columna 'blockedDates' (TEXT[])
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='blockedDates') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='blocked_dates') THEN
            ALTER TABLE public.properties RENAME COLUMN blocked_dates TO "blockedDates";
        ELSE
            ALTER TABLE public.properties ADD COLUMN "blockedDates" TEXT[] DEFAULT '{}'::text[];
        END IF;
    END IF;

END $$;

-- 4. Hidratación Masiva (Villa Retiro R)
UPDATE public.properties SET 
  policies = jsonb_build_object(
    'checkInTime', '4:00 PM',
    'checkOutTime', '11:00 AM',
    'maxGuests', 8,
    'wifiName', 'VillaRetiro_Starlink_Premium',
    'wifiPass', 'Tropical2024!',
    'accessCode', '4829 #',
    'cancellationPolicy', 'firm',
    'houseRules', ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 8 huéspedes', 'Mascotas permitidas con fee adicional']
  ),
  host = jsonb_build_object(
    'name', 'Brian',
    'image', 'https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg?aki_policy=profile_x_medium',
    'badges', ARRAY['4 años como Anfitrión', 'Respuesta en < 1hr'],
    'yearsHosting', 4
  )
WHERE id = '1081171030449673920';

-- 5. Hidratación Masiva (Pirata Family House)
UPDATE public.properties SET 
  policies = jsonb_build_object(
    'checkInTime', '4:00 PM',
    'checkOutTime', '11:00 AM',
    'maxGuests', 6,
    'wifiName', 'PirataHouse_WiFi',
    'wifiPass', 'Pirata2024!',
    'accessCode', '1776 #',
    'cancellationPolicy', 'firm',
    'houseRules', ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 6 huéspedes', 'Mascotas permitidas con fee adicional']
  ),
  host = jsonb_build_object(
    'name', 'Brian',
    'image', 'https://a0.muscache.com/im/pictures/user/User/original/0d2bef47-283d-4f96-a3be-4c8bbf46862b.jpeg?aki_policy=profile_x_medium',
    'badges', ARRAY['4 años como Anfitrión', 'Superhost'],
    'yearsHosting', 4
  )
WHERE id = '42839458';

-- 6. Limpieza Quirúrgica (Eliminar residuos snake_case que ya fueron migrados)
ALTER TABLE public.properties DROP COLUMN IF EXISTS max_guests;
ALTER TABLE public.properties DROP COLUMN IF EXISTS max_guests_policy;
ALTER TABLE public.properties DROP COLUMN IF EXISTS host_data;
ALTER TABLE public.properties DROP COLUMN IF EXISTS blocked_periods;

-- PRODUCCIÓN LISTA ✅
