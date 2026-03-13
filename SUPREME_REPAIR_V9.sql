-- ========================================================
-- SUPREME REPAIR V9: WWW DOMAIN ALIGNMENT & NODE SYNC
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Eliminar el 405 Redirect y asegurar POST
-- ========================================================

-- 1. FUNCIÓN MAESTRA: ALERTA URGENTE (Protocolo WWW)
CREATE OR REPLACE FUNCTION public.notify_urgent_alert()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    -- ✅ Agregamos WWW para evitar la redirección 308 que convierte POST en GET
    url := 'https://www.villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-V9-WWW"}'::jsonb,
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

-- 2. FUNCIÓN MAESTRA: LEADS (Protocolo WWW)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    -- ✅ Agregamos WWW para evitar la redirección 308 que convierte POST en GET
    url := 'https://www.villaretiror.com/api/send',
    headers := '{"Content-Type": "application/json", "User-Agent": "Supabase-V9-WWW"}'::jsonb,
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

-- 3. RE-ACTIVAR TRIGGERS
DROP TRIGGER IF EXISTS on_urgent_alert_inserted ON public.urgent_alerts;
CREATE TRIGGER on_urgent_alert_inserted 
    AFTER INSERT ON public.urgent_alerts 
    FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_alert();

DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
CREATE TRIGGER on_lead_inserted 
    AFTER INSERT ON public.leads 
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 4. TEST DE ALTA PRECISIÓN (WWW)
INSERT INTO public.urgent_alerts (name, message, contact) 
VALUES ('DOMAIN_SYNC_V9', 'Validando impacto directo a WWW para evitar 405.', 'villaretiror@gmail.com');

-- 5. AUDITORÍA (Verifica que no hay 308/405)
-- SELECT url, status, headers, body_out FROM net.http_request_queue ORDER BY id DESC LIMIT 5;
