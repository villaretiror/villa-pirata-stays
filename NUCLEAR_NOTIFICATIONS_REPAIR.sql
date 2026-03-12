-- ========================================================
-- SCRIPT NUCLEAR DE SINCRONIZACIÓN DE NOTIFICACIONES
-- v4.0 | Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Reconstruir el cableado Supabase -> Vercel -> Resend
-- ========================================================

-- 1. INFRAESTRUCTURA DE RED (PG_NET)
-- Aseguramos que pg_net esté presente y accesible
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. LIMPIEZA ABSOLUTA
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.notify_urgent_alert();
DROP FUNCTION IF EXISTS public.notify_new_lead();

-- 3. AUDITORÍA DE TABLAS
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

-- Permisos de RLS para inserción pública (necesario para el Chat/Web)
ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable public insert" ON public.urgent_alerts;
CREATE POLICY "Enable public insert" ON public.urgent_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable public insert" ON public.leads;
CREATE POLICY "Enable public insert" ON public.leads FOR INSERT WITH CHECK (true);

-- 4. FUNCIÓN MAESTRA: NOTIFICAR ALERTA URGENTE
-- Envia los datos directamente en el body para máxima compatibilidad
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-V4-Reliability-Worker'
      ),
      body := json_build_object(
        'type', 'urgent_alert',
        'customer', json_build_object(
          'name', NEW.name,
          'message', NEW.message,
          'contact', NEW.contact
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 5. FUNCIÓN MAESTRA: NOTIFICAR LEADS (Formulario de Contacto)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://villaretiror.com/api/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-V4-Reliability-Worker'
      ),
      body := json_build_object(
        'type', 'contact',
        'customer', json_build_object(
          'name', NEW.name,
          'email', NEW.email,
          'phone', NEW.phone,
          'message', COALESCE(NEW.message, 'Interés en reserva')
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 6. ACTIVACIÓN DE TRIGGERS
CREATE TRIGGER on_urgent_alert_inserted
  AFTER INSERT ON public.urgent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 7. TEST DE INTEGRACIÓN OBLIGATORIO
-- Al ejecutar esto, deberías ver una fila en net.http_request_queue
-- y recibir un correo en villaretiror@gmail.com
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('VERIFICACIÓN NUCLEAR', 'Si recibes esto, el cableado está reparado al 100%.', 'villaretiror@gmail.com');

-- 8. MONITOREO (Ejecuta estas consultas para ver el estado)
-- SELECT * FROM net.http_request_queue ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM urgent_alerts ORDER BY created_at DESC LIMIT 5;
