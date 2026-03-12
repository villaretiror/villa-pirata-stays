-- ========================================================
-- SUPREME REPAIR V8: CONSOLIDATED INFRASTRUCTURE
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Blindar Notificaciones, Chat Logs y Extensiones
-- ========================================================

-- 1. ASEGURAR EXTENSIÓN pg_net
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. REPARACIÓN DE TABLA chat_logs (Asegurar user_id opcional)
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE,
    user_id UUID REFERENCES public.profiles(id),
    message_count INT DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);

-- Aseguramos que user_id permita nulos (en caso de que se haya creado mal)
ALTER TABLE public.chat_logs ALTER COLUMN user_id DROP NOT NULL;

-- 3. LIMPIEZA DE TRIGGERS Y FUNCIONES PREVIAS
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.notify_urgent_alert();
DROP FUNCTION IF EXISTS public.notify_new_lead();

-- 4. FUNCIÓN MAESTRA: ALERTA URGENTE (Optimizado V8)
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-V8-Resilient"}'::jsonb,
    body := json_build_object(
      'type', 'urgent_alert',
      'customer', json_build_object(
        'name', COALESCE(NEW.name, 'Cliente Chat'),
        'message', COALESCE(NEW.message, 'Soporte Urgente'),
        'contact', COALESCE(NEW.contact, 'Sin datos')
      )
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 5. FUNCIÓN MAESTRA: LEADS (Optimizado V8)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-V8-Resilient"}'::jsonb,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net;

-- 6. ACTIVAR TRIGGERS DE ALTA CONFIABILIDAD
CREATE TRIGGER on_urgent_alert_inserted 
    AFTER INSERT ON public.urgent_alerts 
    FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

CREATE TRIGGER on_lead_inserted 
    AFTER INSERT ON public.leads 
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 7. TEST DE INTEGRIDAD (Ejecutar para verificar)
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('REPAIR_V8_SUCCESS', 'Arquitectura consolidada y user_id opcional.', 'villaretiror@gmail.com');

-- 8. MONITOREO (Check post-ejecución)
-- SELECT * FROM net.http_responses ORDER BY created_at DESC LIMIT 5;
