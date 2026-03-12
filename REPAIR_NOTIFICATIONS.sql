-- ==========================================
-- SUPABASE NOTIFICATION REPAIR SCRIPT 2.0
-- Lead Architect: FUTURA OS (Antigravity AI)
-- ==========================================

-- 1. [PG_NET] EXTENSION
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. [URGENT_ALERTS] TABLE AUDIT
CREATE TABLE IF NOT EXISTS public.urgent_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    message TEXT,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS is active but permits insertions from the Chat (Public)
ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can submit alerts" ON public.urgent_alerts;
CREATE POLICY "Public can submit alerts" ON public.urgent_alerts FOR INSERT WITH CHECK (true);

-- 3. [URGENT ALERTS] WEBHOOK FUNCTION
-- Sincronizamos con el contrato que espera /api/send
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'type', 'urgent_alert',
        'contactData', json_build_object(
          'name', NEW.name,
          'message', NEW.message,
          'contact', NEW.contact -- Enviamos 'contact' directamente para simplificar
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. [URGENT ALERTS] TRIGGER
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
CREATE TRIGGER on_urgent_alert_inserted
  AFTER INSERT ON public.urgent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

-- 5. [LEADS/CONTACT] REPAIR (Type: contact)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'type', 'contact',
        'contactData', json_build_object(
          'name', NEW.name,
          'email', NEW.email,
          'phone', NEW.phone,
          'message', COALESCE(NEW.message, 'Interés en reserva')
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 6. [BOOKINGS/PAYMENT] (Opcional: Si quieres automatizar envío al insertar reserva)
-- Por ahora se hace en el frontend (Messages.tsx), pero si falla, 
-- podrías añadir un trigger aquí similar a los de arriba.
