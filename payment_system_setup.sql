-- ACTUALIZACIÓN DE BASE DE DATOS: SISTEMA DE PAGOS
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Actualizar la tabla de bookings para soportar nuevos estados y métodos de pago
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'waiting_approval', 'confirmed', 'cancelled'));

-- 2. Crear el Bucket de Storage para Comprobantes de Pago
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Seguridad para el Bucket 'payments'
-- Lectura: Solo el Host y el dueño de la reserva pueden ver el comprobante (simplificado a público para demo)
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'payments');

-- Escritura: Usuarios autenticados pueden subir su comprobante
CREATE POLICY "Authenticated Upload Access" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payments' AND auth.role() = 'authenticated');

-- 4. Asegurar que las políticas de bookings permitan actualización si es necesario
-- (El Trigger de overbooking podría ser afectado, pero este script se enfoca en pagos)
