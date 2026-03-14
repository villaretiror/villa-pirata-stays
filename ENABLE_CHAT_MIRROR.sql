-- 1. Habilitar la columna de 'human_takeover_until' en chat_logs
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS human_takeover_until TIMESTAMP WITH TIME ZONE;

-- 2. Asegurarnos de que ai_chat_logs existe y está lista para el Chat Mirror
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('guest', 'host', 'ai')),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla antigua tenía id SERIAL, podemos migrarla o dropearla si está vacía. Suponiendo que la recreamos segura:
-- DROP TABLE IF EXISTS public.ai_chat_logs CASCADE; (Opcional, pero usaremos UUID si es nueva, o mantenemos serial)
-- Nota: La tabla original tenía id SERIAL.

-- 3. Habilitar Realtime para ai_chat_logs para que el Webhook despierte el Frontend
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_logs;
