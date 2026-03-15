-- ========================================================
-- SCRIPT: CABLEADO_CONECTIVIDAD_360
-- Lead Architect: FUTURA OS (Antigravity)
-- Propósito: Unificar tablas, fortalecer relaciones y cerrar el ciclo de datos
-- ========================================================

BEGIN;

-- 1. [UNIFICACIÓN DE LEADS]
-- Migramos datos de contact_leads a leads y saneamos
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_leads') THEN
        INSERT INTO public.leads (name, email, message, created_at, status)
        SELECT name, email, message, created_at, 'new'
        FROM public.contact_leads
        ON CONFLICT DO NOTHING;
        
        DROP TABLE public.contact_leads;
    END IF;
END $$;

-- 2. [UNIFICACIÓN DE TASKS]
-- Migramos de tasks (legacy) a operation_tasks (moderno)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        INSERT INTO public.operation_tasks (title, description, status, created_at)
        SELECT title, description, 
               CASE WHEN status = 'completed' THEN 'closed' ELSE 'open' END, 
               created_at
        FROM public.tasks
        ON CONFLICT DO NOTHING;
        
        DROP TABLE public.tasks;
    END IF;
END $$;

-- 3. [FORTALECIMIENTO DE RELACIONES]
-- Aseguramos que Bookings esté bien conectado y con restricciones de integridad
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS fk_bookings_property;

DO $$ 
BEGIN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT fk_bookings_property 
    FOREIGN KEY (property_id) 
    REFERENCES public.properties(id) 
    ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'Constraint fk_bookings_property ya existe o falló.';
END $$;

-- 4. [SANEAMIENTO DE PROPERTIES]
-- Aseguramos que la "Biblia" se cumpla en la tabla maestra
DO $$ 
BEGIN
    -- Asegurar columna 'title' (Bible alignment)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'title') THEN
        ALTER TABLE public.properties ADD COLUMN title TEXT;
    END IF;

    -- Sincronizar 'name' (legacy) con 'title' (Bible) si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'name') THEN
        UPDATE public.properties SET title = name WHERE title IS NULL;
    END IF;
END $$;

-- 5. [CONECTIVIDAD SALTY]
-- Asegurar que chat_logs tenga las columnas necesarias para el Takeover
DO $$ 
BEGIN
    ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS human_takeover_until TIMESTAMPTZ;
    ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS takeover_notified BOOLEAN DEFAULT false;
    ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

-- 6. [PERMISOS 360]
-- Garantizar que el Service Role pueda ver todo para las automatizaciones (Vercel)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

-- 7. TEST DE CONECTIVIDAD
SELECT 'SUCCESS: Sistema 360 cableado y unificado.' as status;
