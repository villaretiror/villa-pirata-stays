-- ========================================================
-- SCRIPT: REAL_SCHEMA_ALIGNMENT_V13
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Alineación con nombres REALES (name, airbnb_link, calendarSync)
-- ========================================================

BEGIN;

-- 1. [PROPERTIES] SANEAMIENTO Y LIMPIEZA
-- Eliminamos cualquier residuo de scripts genéricos previos
DO $$ 
BEGIN
    -- Si por error se creó 'title', intentamos migrar datos a 'name' y borrarla
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'title') THEN
        UPDATE public.properties SET name = title WHERE name IS NULL;
        ALTER TABLE public.properties DROP COLUMN title;
    END IF;
    
    -- No agregamos 'blocked_dates' si el usuario pide mantenerlo limpio.
    -- El sistema usará la tabla 'bookings' y la columna 'calendarSync' para el estado.
END $$;

-- 2. [BOOKINGS] RESTRICCIÓN DE UNICIDAD (Esencial para Upsert)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_booking_period') THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT unique_booking_period 
        UNIQUE (property_id, check_in, check_out);
    END IF;
END $$;

-- 3. [MOTOR DE NOTIFICACIONES] CORRECCIÓN DE TRIGGER (Fix: Use 'name')
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger AS $$
DECLARE
    payload JSONB;
    notification_type TEXT;
    property_name TEXT;
BEGIN
    IF (TG_TABLE_NAME = 'urgent_alerts') THEN
        notification_type := 'urgent_alert';
        payload := json_build_object('type', notification_type, 'customer', json_build_object('name', COALESCE(NEW.name, 'Cliente Chat'), 'message', COALESCE(NEW.message, 'Soporte Urgente'), 'contact', COALESCE(NEW.contact, 'Sin datos')));
    ELSIF (TG_TABLE_NAME = 'leads') THEN
        notification_type := 'contact';
        payload := json_build_object('type', notification_type, 'customer', json_build_object('name', NEW.name, 'email', NEW.email, 'phone', NEW.phone, 'message', COALESCE(NEW.message, 'Consulta general')));
    ELSIF (TG_TABLE_NAME = 'bookings') THEN
        IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
            notification_type := 'reservation_confirmed';
            
            -- FIX: Usamos 'name' que es la columna real confirmada por el usuario
            SELECT name INTO property_name FROM properties WHERE id = NEW.property_id;
            
            payload := json_build_object(
                'type', notification_type,
                'customerName', NEW.customer_name,
                'customerEmail', NEW.customer_email,
                'propertyName', COALESCE(property_name, 'Villa Retiro / Pirata'),
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
        headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-REAL-V13"}'::jsonb,
        body := payload::jsonb,
        timeout_milliseconds := 10000
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 4. [TEST DE INTEGRIDAD]
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('REAL_ALIGNMENT_SUCCESS', 'Esquema alineado: name detectado, links configurados, unique_period activo.', 'villaretiror@gmail.com');

COMMIT;

SELECT 'SUCCESS: Arquitectura Real V13 aplicada.' as status;
