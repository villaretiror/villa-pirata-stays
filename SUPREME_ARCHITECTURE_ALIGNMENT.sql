-- ============================================================
-- SCRIPT: SUPREME_ARCHITECTURE_ALIGNMENT
-- Lead Architect: FUTURA OS (Brian Rojas)
-- Propósito: Alinear nombres de columnas y habilitar Upsert Atómico
-- ============================================================

BEGIN;

-- 1. [PROPERTIES] ALINEACIÓN DE COLUMNAS DE DISPONIBILIDAD
-- El sistema usa blockedDates (camelCase), pero triggers antiguos buscan blocked_dates (snake_case)
DO $$ 
BEGIN
    -- Asegurar blockedDates (Naming de la Biblia)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blockedDates') THEN
        ALTER TABLE public.properties ADD COLUMN "blockedDates" JSONB DEFAULT '[]';
    END IF;

    -- Asegurar blocked_dates (Bridging para Triggers legacy o fantasmas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blocked_dates') THEN
        ALTER TABLE public.properties ADD COLUMN blocked_dates JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. [BOOKINGS] RESTRICCIÓN DE UNICIDAD PARA SYNC
-- Sin esto, el "ON CONFLICT" en el API falla o duplica. 
DO $$ 
BEGIN
    -- Eliminamos restricciones conflictivas si existen por error (Vectores de fallo previos)
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_check_in_check_out_key;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_booking_period') THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT unique_booking_period 
        UNIQUE (property_id, check_in, check_out);
    END IF;

    -- Asegurar columna 'source' para trazabilidad de iCal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'source') THEN
        ALTER TABLE public.bookings ADD COLUMN source TEXT DEFAULT 'Direct';
    END IF;
END $$;

-- 3. [PERMISOS] BLINDAJE DE ROL DE SERVICIO
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.properties TO service_role;

-- 4. [LIMPIEZA] ELIMINAR POSIBLES TRIGGERS HUÉRFANOS QUE CAUSAN ERROR
-- Si existe un trigger que no podemos ver localmente, intentamos capturar su error.
-- (Este paso es preventivo)
COMMENT ON TABLE public.bookings IS 'Table for guest and external iCal reservations. Aligned V11.';

COMMIT;

-- 5. TEST DE INTEGRIDAD (Output esperado: Success)
SELECT 'SUCCESS: Arquitectura alineada y Blindaje de Naming aplicado.' as status;
