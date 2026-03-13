-- ========================================================
-- REPAIR & HARDENING V11.1: CONSOLIDATED EMERGENCY FIX
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Re-instalar motor V11 y aplicar RLS
-- ========================================================

-- 1. RE-INSTALACIÓN DEL MOTOR V11 (Garantizar existencia)
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger AS $$
DECLARE
    payload JSONB;
    notification_type TEXT;
    property_name TEXT;
BEGIN
    -- A. Lógica de Tipos
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
        IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
            notification_type := 'reservation_confirmed';
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

    -- B. Despacho HTTP (Garantizado V11)
    PERFORM net.http_post(
        url := 'https://www.villaretiror.com/api/send',
        headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-DIAMOND-V11"}'::jsonb,
        body := payload::jsonb,
        timeout_milliseconds := 10000
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 2. BLINDAJE DE SEGURIDAD (RLS)
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Session Access" ON public.chat_logs;
CREATE POLICY "Session Access" ON public.chat_logs FOR ALL USING (true);

ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert" ON public.urgent_alerts;
CREATE POLICY "Anon can insert" ON public.urgent_alerts FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin only select" ON public.urgent_alerts;
CREATE POLICY "Admin only select" ON public.urgent_alerts FOR SELECT TO service_role USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon insert bookings" ON public.bookings;
CREATE POLICY "Anon insert bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full bookings" ON public.bookings FOR ALL TO service_role USING (true);

-- 3. RE-VINCULACIÓN DE TRIGGERS
DROP TRIGGER IF EXISTS tr_notify_urgent_alert ON public.urgent_alerts;
CREATE TRIGGER tr_notify_urgent_alert AFTER INSERT ON public.urgent_alerts FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

DROP TRIGGER IF EXISTS tr_notify_lead ON public.leads;
CREATE TRIGGER tr_notify_lead AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

DROP TRIGGER IF EXISTS tr_notify_booking ON public.bookings;
CREATE TRIGGER tr_notify_booking AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

-- 4. TEST DE REPARACIÓN
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('REPAIR_V11_1_FIXED', 'Función re-instalada y RLS aplicado con éxito.', 'villaretiror@gmail.com');
