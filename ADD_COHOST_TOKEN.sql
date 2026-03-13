-- ==========================================
-- 🛠 MIGRACIÓN: TOKEN DE INVITACIÓN CO-HOST 🛠
-- ==========================================
-- Agrega un token único para onboarding seguro. 

-- 1. Agregar la columna
ALTER TABLE public.property_cohosts ADD COLUMN IF NOT EXISTS invitation_token TEXT;

-- 2. Asegurar unicidad
ALTER TABLE public.property_cohosts ADD CONSTRAINT unique_invitation_token UNIQUE (invitation_token);
