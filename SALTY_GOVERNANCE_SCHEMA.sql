-- 🛡️ GOVERNANCE & SECURITY PROTOCOL: FINANCIAL & LEGAL BOUNDARIES
-- Misión: Blindar la integridad financiera y legal del sistema Salty.

-- 1. Añadir controles financieros a la tabla de propiedades
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS min_price_floor NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_discount_allowed INT DEFAULT 15;

-- 2. Asegurar que los insights tengan una estructura de aprobación
-- (La tabla ai_insights ya fue creada, solo aseguramos los estados)
-- 'pending', 'applied' (aprobado), 'archived' (ignorado) are already defined in logic.

-- 3. Comentario de Auditoría
COMMENT ON COLUMN properties.min_price_floor IS 'Precio mínimo absoluto que Salty puede ofertar tras descuentos.';
COMMENT ON COLUMN properties.max_discount_allowed IS 'Porcentaje máximo de descuento que Salty puede proponer autónomamente.';
