-- ========================================================
-- SPRINT 3: OPERATIVIDAD AVANZADA - SISTEMA DE EGRESOS
-- Lead Architect: FUTURA OS (Antigravity AI)
-- Proposito: Tabla para gestión de gastos y rentabilidad
-- ========================================================

-- 1. Crear tabla de gastos
CREATE TABLE IF NOT EXISTS public.property_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('maintenance', 'cleaning', 'tax', 'utilities', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Habilitar RLS
ALTER TABLE public.property_expenses ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (Nivel Bancario)
-- Solo Admin y Co-hosts con acceso a la propiedad pueden ver y gestionar gastos
CREATE POLICY "Admin full expenses" ON public.property_expenses
    FOR ALL TO service_role USING (true);

CREATE POLICY "Owners manage expenses" ON public.property_expenses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_expenses.property_id
            AND (p.email = auth.jwt()->>'email' OR auth.jwt()->>'email' = 'villaretiror@gmail.com')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.property_cohosts pc
            WHERE pc.property_id = property_expenses.property_id
            AND pc.email = auth.jwt()->>'email'
            AND pc.status = 'active'
        )
    );

-- 4. Extensión de Co-hosts: Checklist de Operaciones
-- Añadimos columna para tareas en la tabla de co-hosts o una nueva tabla de tareas
CREATE TABLE IF NOT EXISTS public.operation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    assigned_to TEXT, -- email del co-host
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management tasks access" ON public.operation_tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = operation_tasks.property_id
            AND (p.email = auth.jwt()->>'email' OR auth.jwt()->>'email' = 'villaretiror@gmail.com')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.property_cohosts pc
            WHERE pc.property_id = operation_tasks.property_id
            AND pc.email = auth.jwt()->>'email'
        )
    );
