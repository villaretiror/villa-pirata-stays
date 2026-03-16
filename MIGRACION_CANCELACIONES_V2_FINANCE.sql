-- 🗺️ REEMBOLSOS Y LOGS FINANCIEROS - VILLA & PIRATA STAYS
-- Este script habilita el seguimiento de devoluciones y retenciones.

-- 1. Agregar columnas financieras a la tabla de reservas
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS refund_amount_calculated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS retained_amount_calculated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_snapshot JSONB DEFAULT '{}';

-- 2. Comentarios para Documentación
COMMENT ON COLUMN bookings.refund_amount_calculated IS 'Monto total a devolver al huésped después de penalidades.';
COMMENT ON COLUMN bookings.retained_amount_calculated IS 'Monto total que el host retiene por política de cancelación.';
COMMENT ON COLUMN bookings.cancellation_snapshot IS 'Copia de las reglas y cálculos aplicados en el momento exacto de la cancelación.';
