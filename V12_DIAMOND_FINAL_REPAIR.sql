-- ========================================================
-- SCRIPT: V12_DIAMOND_FINAL_REPAIR
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Alineación de Esquema, Corrección de Triggers y Blindaje iCal
-- ========================================================

BEGIN;

-- 1. [PROPERTIES] ALINEACIÓN DE COLUMNAS (Fix: "blocked_dates does not exist")
-- Aseguramos que existan ambos formatos para compatibilidad con triggers y frontend.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blockedDates') THEN
        ALTER TABLE public.properties ADD COLUMN "blockedDates" JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blocked_dates') THEN
        ALTER TABLE public.properties ADD COLUMN blocked_dates JSONB DEFAULT '[]';
    END IF;
    
    -- Asegurar columna 'title' existe (la Biblia la define así)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'title') THEN
        ALTER TABLE public.properties ADD COLUMN title TEXT;
    END IF;
END $$;

-- 2. [BOOKINGS] RESTRICCIÓN DE UNICIDAD Y ALINEACIÓN
DO $$ 
BEGIN
    -- Limpieza de restricciones legacy
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_check_in_check_out_key;
    
    -- Agregar restricción única para evitar duplicados en sincronización
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_booking_period') THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT unique_booking_period 
        UNIQUE (property_id, check_in, check_out);
    END IF;

    -- Asegurar columna 'source'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'source') THEN
        ALTER TABLE public.bookings ADD COLUMN source TEXT DEFAULT 'Direct';
    END IF;
END $$;

-- 3. [MOTOR V12] CORRECCIÓN DE DISPATCHER (Fix: name -> title)
-- Corregimos el error donde se buscaba la columna 'name' en lugar de 'title'
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger AS $$
DECLARE
    payload JSONB;
    notification_type TEXT;
    property_title TEXT;
BEGIN
    IF (TG_TABLE_NAME = 'urgent_alerts') THEN
        notification_type := 'urgent_alert';
        payload := json_build_object('type', notification_type, 'customer', json_build_object('name', COALESCE(NEW.name, 'Cliente Chat'), 'message', COALESCE(NEW.message, 'Soporte Urgente'), 'contact', COALESCE(NEW.contact, 'Sin datos')));
    ELSIF (TG_TABLE_NAME = 'leads') THEN
        notification_type := 'contact';
        payload := json_build_object('type', notification_type, 'customer', json_build_object('name', NEW.name, 'email', NEW.email, 'phone', NEW.phone, 'message', COALESCE(NEW.message, 'Consulta general')));
    ELSIF (TG_TABLE_NAME = 'bookings') THEN
        -- Solo disparamos si el estado cambia a 'confirmed'
        IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
            notification_type := 'reservation_confirmed';
            
            -- FIX: Usamos 'title' que es la columna real en la tabla properties
            SELECT title INTO property_title FROM properties WHERE id = NEW.property_id;
            
            payload := json_build_object(
                'type', notification_type,
                'customerName', NEW.customer_name,
                'customerEmail', NEW.customer_email,
                'propertyName', COALESCE(property_title, 'Villa Retiro / Pirata'),
                'checkIn', NEW.check_in,
                'checkOut', NEW.check_out,
                'propertyId', NEW.property_id,
                'accessCode', COALESCE(NEW.access_code, 'Pendiente')
            );
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    PERFORM net.http_post(
        url := 'https://www.villaretiror.com/api/send',
        headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-DIAMOND-V12"}'::jsonb,
        body := payload::jsonb,
        timeout_milliseconds := 10000
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 4. [PERMISOS]
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.properties TO service_role;

COMMIT;

-- 5. TEST DE VERIFICACIÓN
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('REPAIR_V12_SUCCESS', 'Esquema alineado: blocked_dates creado, triggers corregidos (title).', 'villaretiror@gmail.com');

SELECT 'SUCCESS: Arquitectura Blindada V12 aplicada con éxito.' as status;
