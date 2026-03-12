-- ========================================================
-- SINCRONIZACIÓN MAESTRA DE NOTIFICACIONES (PROTOCOLO V5)
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Blindar el flujo Supabase -> Vercel -> Resend
-- ========================================================

-- 1. ASEGURAR EXTENSIÓN PG_NET
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. LIMPIEZA DE TRIGGERS Y FUNCIONES PREVIAS
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.notify_urgent_alert();
DROP FUNCTION IF EXISTS public.notify_new_lead();

-- 3. VERIFICACIÓN DE TABLAS (Aseguramos que existan)
CREATE TABLE IF NOT EXISTS public.urgent_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    message TEXT,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FUNCIÓN MAESTRA: NOTIFICAR ALERTA URGENTE
-- Esta función dispara el webhook hacia Vercel
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-Bot"}'::jsonb,
      body := json_build_object(
        'type', 'urgent_alert',
        'customer', json_build_object(
          'name', COALESCE(NEW.name, 'Cliente'),
          'message', COALESCE(NEW.message, 'Soporte solicitado'),
          'contact', COALESCE(NEW.contact, 'Sin datos')
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN MAESTRA: NOTIFICAR LEADS (Consultas)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-Bot"}'::jsonb,
      body := json_build_object(
        'type', 'contact',
        'customer', json_build_object(
          'name', NEW.name,
          'email', NEW.email,
          'phone', NEW.phone,
          'message', COALESCE(NEW.message, 'Consulta general')
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RE-ACTIVACIÓN DE TRIGGERS
CREATE TRIGGER on_urgent_alert_inserted
  AFTER INSERT ON public.urgent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 7. TEST DE INTEGRACIÓN (Ejecutar para forzar el flujo)
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('TEST_NUCLEAR_V5', 'Si recibes esto, el sistema es 100% operativo.', 'villaretiror@gmail.com');

-- 8. MONITOREO DE WEBHOOKS
-- Si quieres ver si el mensaje salió, ejecuta:
-- SELECT * FROM net.http_responses ORDER BY created_at DESC LIMIT 10;
