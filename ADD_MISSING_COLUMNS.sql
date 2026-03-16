-- 🗺️ REFACTORIZACIÓN INTEGRAL DE ESQUEMA - VILLA & PIRATA STAYS
-- Este script unifica la tabla properties con la UI de la aplicación.

-- 1. Unificación de Contadores de Reseñas
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'reviews') THEN
        ALTER TABLE properties RENAME COLUMN reviews TO reviews_count;
    END IF;
END $$;

-- 2. Creación de Columnas de Datos Dinámicos
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS offers JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reviews_list JSONB DEFAULT '[]';

-- 3. Unificación de Status Offline
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'is_offline') THEN
        ALTER TABLE properties ADD COLUMN is_offline BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Traspasar datos si existen columnas antiguas
UPDATE properties SET is_offline = COALESCE(is_offline, "isOffline", isoffline, false);

-- 4. Asegurar integridad de tipos JSONB
ALTER TABLE properties 
ALTER COLUMN seasonal_prices SET DATA TYPE JSONB USING seasonal_prices::jsonb,
ALTER COLUMN fees SET DATA TYPE JSONB USING fees::jsonb;

-- 5. Comentarios para Documentación
COMMENT ON COLUMN properties.reviews_count IS 'Número total de reseñas (Sincronizado con UI)';
COMMENT ON COLUMN properties.offers IS 'Lista de ofertas activas para la propiedad (JSONBArray)';
COMMENT ON COLUMN properties.reviews_list IS 'Historial extendido de reseñas manuales (JSONBArray)';

-- 6. Trigger para actualización de updated_at (Si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_properties_updated_at ON properties;
CREATE TRIGGER tr_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
