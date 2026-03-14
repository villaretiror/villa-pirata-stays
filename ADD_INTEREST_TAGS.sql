-- Protocolo de Memoria Sensorial: Etiquetas de Interés
-- Ejecuta esto en el Editor SQL de Supabase

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interest_tags text[] DEFAULT '{}';

-- Comentario para auditoría
COMMENT ON COLUMN profiles.interest_tags IS 'Preferencias y gustos del huésped aprendidos por Salty';
