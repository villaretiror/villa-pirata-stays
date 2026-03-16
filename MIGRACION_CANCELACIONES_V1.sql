-- 🗺️ REEMBOLSOS Y POLÍTICAS DE CANCELACIÓN - AIRBNB STYLE (V2)
-- Este script habilita el sistema legal de cancelación y captura de fees.

-- 1. Agregar columnas de snapshot de precios a la reserva
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS applied_policy JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cleaning_fee_at_booking NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee_at_booking NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Asegurar que la tabla properties tenga la estructura de políticas
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS cancellation_policy_type TEXT DEFAULT 'moderate';

-- 3. Comentarios para Documentación Técnica
COMMENT ON COLUMN bookings.applied_policy IS 'Respaldo legal de la política (Flexible/Moderada/Firme/Estricta) al momento de reservar.';
COMMENT ON COLUMN bookings.cleaning_fee_at_booking IS 'Captura de la tasa de limpieza al momento de la reserva.';
COMMENT ON COLUMN bookings.service_fee_at_booking IS 'Captura de la comisión de servicio al momento de la reserva.';

-- 4. Unificar nombres de columnas
UPDATE properties SET cancellation_policy_type = COALESCE(cancellation_policy_type, 'moderate');
