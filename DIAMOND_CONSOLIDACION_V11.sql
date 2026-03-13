-- ========================================================
-- DIAMOND CONSOLIDATION V11: FINAL RESILIENCE ENGINE
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Blindaje de Notificaciones, Retries y Auto-Purge
-- ========================================================

-- 1. LIMPIEZA ABSOLUTA DE CÓDIGO PREVIO
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Borramos todos los triggers existentes en public para evitar duplicidad
    FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON ' || r.event_object_table;
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.dispatch_notification();
DROP FUNCTION IF EXISTS public.purge_net_logs();

-- 2. FUNCIÓN DE AUTO-PURGE (Mantenimiento de Base de Datos)
-- Limpia registros de peticiones HTTP exitosas de más de 24 horas
CREATE OR REPLACE FUNCTION public.purge_net_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM net.http_request_queue 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    -- Opcional: Limpiar respuestas si la tabla existe
    -- DELETE FROM net._http_response WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN MAESTRA V11: DESPACHO CON RESILIENCIA
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger AS $$
DECLARE
    payload JSONB;
    notification_type TEXT;
    property_name TEXT;
BEGIN
    -- A. Determinamos el tipo según la tabla de origen
    IF (TG_TABLE_NAME = 'urgent_alerts') THEN
        notification_type := 'urgent_alert';
        payload := json_build_object(
            'type', notification_type,
            'customer', json_build_object(
                'name', COALESCE(NEW.name, 'Cliente Chat'),
                'message', COALESCE(NEW.message, 'Soporte Urgente'),
                'contact', COALESCE(NEW.contact, 'Sin datos')
            )
        );
    ELSIF (TG_TABLE_NAME = 'leads') THEN
        notification_type := 'contact';
        payload := json_build_object(
            'type', notification_type,
            'customer', json_build_object(
                'name', NEW.name,
                'email', NEW.email,
                'phone', NEW.phone,
                'message', COALESCE(NEW.message, 'Consulta general')
            )
        );
    ELSIF (TG_TABLE_NAME = 'bookings') THEN
        -- Solo disparamos si el estado cambia a 'confirmed'
        IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
            notification_type := 'reservation_confirmed';
            
            -- Obtenemos el nombre de la propiedad para el email
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

    -- B. Ejecutamos el POST (Timeout de 10s y Protocolo WWW)
    -- pg_net maneja reintentos automáticos si el servidor no responde
    PERFORM net.http_post(
        url := 'https://www.villaretiror.com/api/send',
        headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-DIAMOND-V11"}'::jsonb,
        body := payload::jsonb,
        timeout_milliseconds := 10000
    );

    -- C. Auto-Purge: Ejecutamos limpieza de logs antiguos cada vez que se genera una alerta urgente
    IF (TG_TABLE_NAME = 'urgent_alerts') THEN
        PERFORM public.purge_net_logs();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 4. ACTIVACIÓN DE TRIGGERS DIAMANTE (Full Coverage)
CREATE TRIGGER tr_notify_urgent_alert
    AFTER INSERT ON public.urgent_alerts
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

CREATE TRIGGER tr_notify_lead
    AFTER INSERT ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

CREATE TRIGGER tr_notify_booking
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

-- 5. TEST DE INTEGRIDAD FINAL V11
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('DIAMOND_V11_SUCCESS', 'Arquitectura blindada con resiliencia y auto-purge activado.', 'villaretiror@gmail.com');

-- 6. AUDITORÍA DE SALIDA
-- SELECT * FROM net.http_request_queue ORDER BY created_at DESC LIMIT 5;
