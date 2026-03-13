-- TABLA DE MONITOREO DE SALUD DEL SISTEMA (HEALTH CHECK 360°)
-- Generada para integrar monitoreo nativo de iCals y Base de Datos

CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE, -- Ej: 'Airbnb Sync', 'Booking Sync', 'Supabase DB'
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'error', 'maintenance')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latency_ms INTEGER DEFAULT 0,
    error_details TEXT,
    property_id TEXT, -- Airbnb ID o similar
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para búsqueda rápida del último estado
CREATE INDEX IF NOT EXISTS idx_system_health_service_name ON system_health (service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_last_check ON system_health (last_check DESC);

-- Permisos para el GM AI y Dashboard
-- Se permite lectura a todos los autenticados para que el Dashboard y el AI puedan informar el estado
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all authenticated users" ON system_health;
CREATE POLICY "Allow select for all authenticated users" ON system_health 
FOR SELECT USING (true);

-- Política de escritura solo para el Admin (Anfitrión)
DROP POLICY IF EXISTS "Allow insert/update for admin" ON system_health;
CREATE POLICY "Allow insert/update for admin" ON system_health 
FOR ALL USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- Inserción de estados iniciales (Placeholder)
INSERT INTO system_health (service_name, status, last_check) 
VALUES 
('Supabase DB', 'healthy', NOW()),
('Airbnb Sync', 'healthy', NOW()),
('Booking Sync', 'healthy', NOW())
ON CONFLICT DO NOTHING;
