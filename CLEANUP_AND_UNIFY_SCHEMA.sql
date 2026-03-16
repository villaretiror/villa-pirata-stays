-- 🚨 SUPABASE REAL-DATA ENFORCEMENT: AUDITORÍA Y UNIFICACIÓN
-- Este script resuelve los 'cables sueltos' detectados en la auditoría de integridad.

-- 1. Unificación de Política de Cancelación (Top-Level para Filtrado)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS cancellation_policy_type TEXT DEFAULT 'moderate';

-- 2. Limpieza de Sprawl de Columnas (Case-Sensitivity Cleanup)
-- Mantenemos solo el estándar snake_case: is_offline
ALTER TABLE properties DROP COLUMN IF EXISTS isoffline;
ALTER TABLE properties DROP COLUMN IF EXISTS "isOffline";
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false;

-- Unificación de Bloqueos
ALTER TABLE properties DROP COLUMN IF EXISTS "blockedDates";
ALTER TABLE properties ADD COLUMN IF NOT EXISTS blockeddates JSONB DEFAULT '[]';

-- Unificación de Sync
ALTER TABLE properties DROP COLUMN IF EXISTS "calendarSync";
ALTER TABLE properties ADD COLUMN IF NOT EXISTS calendarsync JSONB DEFAULT '[]';

-- 3. Consistencia en Reservas (Audit Req: total_paid_at_booking)
-- El usuario solicitó total_paid_at_booking como estándar. 
-- Agregamos la columna para Snapshot de Seguridad Financiera, 
-- pero mantenemos total_price como la columna de factura principal.
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_paid_at_booking NUMERIC;

-- Migración inicial: Copiar total_price a total_paid_at_booking para reservas existentes
UPDATE bookings SET total_paid_at_booking = total_price WHERE total_paid_at_booking IS NULL;

-- 4. Otros Campos Requeridos por UI (Reviews & Count)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
UPDATE properties SET reviews_count = reviews WHERE reviews_count = 0;

-- ✅ Auditoría Finalizada: Cables Reconectados.
