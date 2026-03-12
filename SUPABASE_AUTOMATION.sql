-- 1. INFRAESTRUCTURA DE RED (Activa pg_net para Webhooks)
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. [LEADS] WEBHOOK AUTOMATION
-- Al insertar un nuevo Lead, notificamos a nuestro backend para enviar el email de bienvenida.

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

-- Trigger para automatizar Resend desde Supabase
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 3. [SYNC/BOOKINGS] INFRASTRUCTURE ENHANCEMENT
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS email_sent_feedback BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in, check_out);

-- 4. [STORAGE] BRANDING BUCKET PREP
-- Asegúrate de que el bucket 'villas' sea público en el dashboard.
-- Este SQL intenta crearlo si tienes permisos.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('villas', 'villas', true)
ON CONFLICT (id) DO NOTHING;

-- 5. [AUDIT LOGS] PARA EL CHAT
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    message_count INT DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);
