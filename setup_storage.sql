-- SEGURIDAD DE STORAGE: BUCKET 'VILLAS'
-- Copia y pega esto en el SQL Editor de Supabase para activar RLS en tus fotos.

-- 1. Permitir acceso público de LECTURA a cualquier archivo en el bucket 'villas'
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'villas' );

-- 2. Permitir a los usuarios AUTENTICADOS (Hosts) SUBIR archivos
CREATE POLICY "Host Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'villas' 
  AND auth.role() = 'authenticated'
);

-- 3. Permitir a los usuarios AUTENTICADOS (Hosts) ACTUALIZAR sus archivos
CREATE POLICY "Host Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'villas'
  AND auth.role() = 'authenticated'
);

-- 4. Permitir a los usuarios AUTENTICADOS (Hosts) ELIMINAR sus archivos
CREATE POLICY "Host Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'villas'
  AND auth.role() = 'authenticated'
);
