-- ========================================================
-- SCRIPT MAESTRO: REPARACIÓN NUCLEAR DE NOTIFICACIONES
-- v3.0 | Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Sincronizar Supabase Triggers con Resend API
-- ========================================================

-- 1. INFRAESTRUCTURA DE RED (pg_net)
-- Aseguramos que la extensión esté habilitada en el esquema correcto
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. LIMPIEZA DE VERSIONES PREVIAS
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.notify_urgent_alert();
DROP FUNCTION IF EXISTS public.notify_new_lead();

-- 3. TABLA DE ALERTAS URGENTES (Auditoría de Esquema)
CREATE TABLE IF NOT EXISTS public.urgent_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    message TEXT,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS para seguridad
ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir inserciones públicas desde Chat" ON public.urgent_alerts;
CREATE POLICY "Permitir inserciones públicas desde Chat" ON public.urgent_alerts FOR INSERT WITH CHECK (true);

-- 4. FUNCIÓN MAESTRA: NOTIFICAR ALERTA URGENTE
-- Esta función construye el JSON exacto que espera api/send.ts
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
DECLARE
  webhook_url TEXT := 'https://villaretiror.com/api/send';
BEGIN
  PERFORM
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-Webhook-v3-villaretiror'
      ),
      body := json_build_object(
        'type', 'urgent_alert',
        'contactData', json_build_object(
          'name', COALESCE(NEW.name, 'Cliente Anónimo'),
          'message', COALESCE(NEW.message, 'Sin descripción'),
          'contact', COALESCE(NEW.contact, 'Sin contacto provisto')
        )
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN MAESTRA: NOTIFICAR NUEVO LEAD/CONTACTO
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
DECLARE
  webhook_url TEXT := 'https://villaretiror.com/api/send';
BEGIN
  PERFORM
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-Webhook-v3-villaretiror'
      ),
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

-- 6. ACTIVACIÓN DE TRIGGERS
CREATE TRIGGER on_urgent_alert_inserted
  AFTER INSERT ON public.urgent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

CREATE TRIGGER on_lead_inserted
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 7. TEST DE INTEGRACIÓN (Ejecutar esto para forzar un envío)
-- Descomenta la siguiente línea solo si quieres probar instantáneamente:
-- INSERT INTO public.urgent_alerts (name, message, contact) VALUES ('TEST ROBOT', 'Este es un mensaje de prueba del sistema', 'villaretiror@gmail.com');

-- ========================================================
-- REVISIÓN DE COLA (SQL):
-- Puedes ver el estado de tus envios ejecutando:
-- SELECT * FROM net.http_request_queue ORDER BY created_at DESC;
-- ========================================================
