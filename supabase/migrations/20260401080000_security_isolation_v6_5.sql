-- 🛡️ WARDEN PROTOCOL [Security Patch v6.5]
-- Finalizando Aislamiento de Propiedades y Sellado de Secretos

-- 1. Aislamiento de Alertas por Propiedad
ALTER TABLE public.urgent_alerts 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id);

-- 2. Restricción de RLS para Co-anfitriones en Alertas
ALTER TABLE public.urgent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Co-hosts only see their property alerts" 
ON public.urgent_alerts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.property_cohosts pc 
    WHERE pc.email = auth.jwt() ->> 'email' 
    AND pc.property_id = urgent_alerts.property_id
  )
);

CREATE POLICY "Master Host sees all alerts"
ON public.urgent_alerts FOR ALL
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- 3. Protección de Leads (Write-Only para Anon)
-- Se quita el acceso público a SELECT para proteger emails/teléfonos
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can only INSERT leads"
ON public.leads FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Protocolo de "Minimo Privilegio" en Perfiles
-- Los perfiles privados no deben ser legibles por anon para evitar scraping
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
