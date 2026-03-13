-- ==========================================
-- 🛡 REPARACIÓN DE RLS PARA SYSTEM_HEALTH 🛡
-- ==========================================
-- Misión: Permitir a Vercel (service_role) o Admins
-- hacer INSERT o UPDATE en la tabla system_health

-- 1. Habilitar RLS si no lo estaba
ALTER TABLE IF EXISTS public.system_health ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas anteriores (Evitar duplicidad)
DROP POLICY IF EXISTS "system_health_read_all" ON public.system_health;
DROP POLICY IF EXISTS "system_health_write_admin" ON public.system_health;

-- 3. Lectura Pública: Todos pueden ver el estatus
CREATE POLICY "system_health_read_all"
ON public.system_health
FOR SELECT
TO public
USING (true);

-- 4. Escritura Abierta para el servidor / host
-- (Nota: Para un nivel estricto production, podrías cambiar "TO authenticated" a
-- checking of profile.role === 'admin', pero si confías en el backend con key, 
-- service_role sobreescribe esto. Para Host Dashboard usamos authenticated)
CREATE POLICY "system_health_write_admin"
ON public.system_health
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- Aviso: El rol 'service_role' tiene BYPASSRLS por defecto en Supabase, 
-- pero tener políticas claras previene bloqueos si usas anon_key autenticada para el Host Dashboard.
