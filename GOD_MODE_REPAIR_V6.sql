-- ========================================================
-- SCRIPT: GOD_MODE_REPAIR_V6 (PROTOCOL: ZERO-DRAG)
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Eliminar errores de "Pending" y "Empty Queue"
-- ========================================================

-- 1. ASEGURAR EXTENSIÓN pg_net EN EL ESQUEMA CORRECTO
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. LIMPIEZA TOTAL DE INFRAESTRUCTURA FALLIDA
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.notify_urgent_alert();
DROP FUNCTION IF EXISTS public.notify_new_lead();

-- 3. AUDITORÍA FÍSICA DE TABLAS
CREATE TABLE IF NOT EXISTS public.urgent_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    message TEXT,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aseguramos permisos de inserción pública para el Chat
ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public chat inserts" ON public.urgent_alerts;
CREATE POLICY "Public chat inserts" ON public.urgent_alerts FOR INSERT WITH CHECK (true);

-- 4. FUNCIÓN MAESTRA CON SEARCH_PATH EXPLÍCITO Y USER-AGENT
-- Esto evita que el trigger falle si no encuentra la extensión net
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := json_build_object(
    'type', 'urgent_alert',
    'customer', json_build_object(
      'name', COALESCE(NEW.name, 'Cliente Chat'),
      'message', COALESCE(NEW.message, 'Soporte Urgente'),
      'contact', COALESCE(NEW.contact, 'Sin datos')
    )
  );

  -- LLAMADA ABSOLUTA A LA EXTENSIÓN NET
  PERFORM extensions.net.http_post(
    url := 'https://villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-Bot-V6"}'::jsonb,
    body := payload
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 5. FUNCIÓN PARA LEADS (CONTACT FORM)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM extensions.net.http_post(
    url := 'https://villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-Bot-V6"}'::jsonb,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 6. RE-ACTIVACIÓN DE TRIGGERS
CREATE TRIGGER on_urgent_alert_inserted
  AFTER INSERT ON public.urgent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 7. TEST DE INTEGRACIÓN FORZADO
-- Al ejecutar esto, DEBE aparecer una fila en net.http_request_queue inmediatamente
-- SELECT * FROM extensions.net.http_request_queue ORDER BY created_at DESC;
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('GOD_MODE_V6_TEST', 'Handshake Protocol Zero-Drag', 'villaretiror@gmail.com');

-- 8. MONITOREO DE RESPUESTAS (Opcional)
-- SELECT * FROM extensions.net.http_responses ORDER BY created_at DESC LIMIT 5;
