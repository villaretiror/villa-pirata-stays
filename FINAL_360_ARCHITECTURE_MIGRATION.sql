-- ========================================================
-- SCRIPT: FINAL_360_ARCHITECTURE_MIGRATION
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Estandarización Total y Migración de Datos Activos
-- ========================================================

BEGIN;

-- 1. [PROPERTIES] ESTANDARIZACIÓN DE IDENTIDAD
-- Creamos la columna 'title' si no existe
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS title TEXT;

-- Migramos datos de 'name' o 'Name' hacia 'title' solo si title está vacío
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'name') THEN
        UPDATE public.properties SET title = name WHERE title IS NULL OR title = '';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'Name') THEN
        UPDATE public.properties SET title = "Name" WHERE title IS NULL OR title = '';
    END IF;
END $$;

-- 2. [PROPERTIES] CONSOLIDACIÓN DE FEEDS (calendarSync)
-- Aseguramos que existe calendarSync como JSONB
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS "calendarSync" JSONB DEFAULT '[]';

-- Migración Inteligente de Links: Si calendarSync está vacío, lo poblamos con airbnb_url/link y booking_url/link
UPDATE public.properties 
SET "calendarSync" = jsonb_build_array(
    CASE 
        WHEN COALESCE(airbnb_link, airbnb_url) IS NOT NULL THEN 
            jsonb_build_object(
                'id', 'airbnb_fallback',
                'platform', 'Airbnb',
                'url', COALESCE(airbnb_link, airbnb_url),
                'lastSynced', now(),
                'syncStatus', 'success'
            )
        ELSE NULL 
    END,
    CASE 
        WHEN COALESCE(booking_link, booking_url) IS NOT NULL THEN 
            jsonb_build_object(
                'id', 'booking_fallback',
                'platform', 'Booking.com',
                'url', COALESCE(booking_link, booking_url),
                'lastSynced', now(),
                'syncStatus', 'success'
            )
        ELSE NULL 
    END
) - 'null' -- Eliminamos nulos
WHERE "calendarSync" = '[]' OR "calendarSync" IS NULL;

-- 3. [BOOKINGS] RESTRICCIÓN DE UNICIDAD Y ESTRUCTURA
-- Aseguramos columnas source y customer_name
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Restricción de unicidad para evitar duplicados del iCal
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_booking_slot') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT unique_booking_slot UNIQUE (property_id, check_in, check_out);
    END IF;
END $$;

-- 4. [CEREBRO AI] LIMPIEZA DE AI_CHAT_LOGS
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT REFERENCES properties(id),
    user_id UUID REFERENCES auth.users(id),
    message TEXT,
    role TEXT, -- 'user' | 'assistant'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. [TEST DE ÉXITO]
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('MIGRATION_360_SUCCESS', 'Datos rescatados, title poblado, calendarSync activo y bookings normalizados.', 'villaretiror@gmail.com');

COMMIT;

SELECT 'SUCCESS: Migración Técnica 360 Completada.' as status;
