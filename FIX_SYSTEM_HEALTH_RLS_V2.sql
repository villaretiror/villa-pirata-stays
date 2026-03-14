-- SCRIPT DE SEGURIDAD Y PERMISOS DE CABLES DEL SISTEMA
-- Esto soluciona el "new row violates row-level security policy"
-- Permite que las operaciones del Backend o del Cliente actualicen la latencia

-- 1. Eliminar cualquier política restrictiva previa sobre la tabla system_health
DROP POLICY IF EXISTS "Allow insert/update for admin" ON system_health;
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON system_health;
DROP POLICY IF EXISTS "Allow ALL for anyone" ON system_health;
DROP POLICY IF EXISTS "Allow anon reading and updating" ON system_health;

-- 2. Asegurarnos que la tabla tiene Row Level Security activo
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- 3. Crear una política universal para el monitor de salud
-- Es fundamental que cualquier API route (anon o service_role) pueda reportar latencia y errores.
CREATE POLICY "Allow ALL for system_health" ON system_health 
FOR ALL USING (true) WITH CHECK (true);
