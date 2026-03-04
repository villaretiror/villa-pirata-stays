-- FIX INFRAESTRUCTURA: VILLAS BUCKET & PROPERTIES COLUMNS
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Crear el Bucket 'villas' para las fotos de las propiedades
INSERT INTO storage.buckets (id, name, public) 
VALUES ('villas', 'villas', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de RLS para el Bucket 'villas'
-- Lectura pública
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'villas');

-- Escritura solo para usuarios autenticados (Host)
CREATE POLICY "Host Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'villas');

-- Borrado y actualización para el Host
CREATE POLICY "Host Delete & Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'villas');

CREATE POLICY "Host Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'villas');

-- 3. Actualizar Tabla Properties con campos faltantes
DO $$ 
BEGIN 
    -- Campo blocked_dates para el calendario
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'blocked_dates') THEN
        ALTER TABLE public.properties ADD COLUMN blocked_dates TEXT[] DEFAULT '{}';
    END IF;

    -- Campo calendar_sync para links de Airbnb/Booking
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'calendar_sync') THEN
        ALTER TABLE public.properties ADD COLUMN calendar_sync JSONB DEFAULT '[]';
    END IF;

    -- Asegurar que images sea un array
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'images') THEN
        ALTER TABLE public.properties ADD COLUMN images TEXT[] DEFAULT '{}';
    END IF;
END $$;
