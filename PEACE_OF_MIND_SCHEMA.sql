-- PEACE OF MIND: EMERGENCY & SERVICE PROVIDERS SCHEMA (v3 - Hybrid Types Corrected)
-- Mission: Align schema with mixed primary key types (UUID for bookings, TEXT for villas).

-- 1. Service Providers Table
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL, -- 'plumber', 'electrician', 'cleaning', 'locksmith', 'hvac'
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    hourly_rate NUMERIC,
    base_fee NUMERIC DEFAULT 0,
    priority INTEGER DEFAULT 3, -- 1 (High) to 5 (Low)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Emergency Tickets Table
-- Correction Audit:
-- bookings.id is UUID (confirmed by email_logs schema).
-- properties.id is TEXT (confirmed by Airbnb ID usage in migracion_constantes).
CREATE TABLE IF NOT EXISTS public.emergency_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL, -- 'water', 'electricity', 'structure', 'access', 'noise'
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    provider_id UUID REFERENCES public.service_providers(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3. Business Activity Log (for CEO Snapshot)
CREATE TABLE IF NOT EXISTS public.business_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    revenue_generated NUMERIC DEFAULT 0,
    inquiries_resolved INTEGER DEFAULT 0,
    emergencies_coordinated INTEGER DEFAULT 0,
    maintenance_tasks INTEGER DEFAULT 0,
    salty_efficiency_score NUMERIC, -- AI calculated
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Admin only for editing, Salty can read)
DROP POLICY IF EXISTS "Admin All Access" ON public.service_providers;
DROP POLICY IF EXISTS "Admin All Access" ON public.emergency_tickets;
DROP POLICY IF EXISTS "Admin All Access" ON public.business_activity_logs;

CREATE POLICY "Admin All Access" ON public.service_providers FOR ALL USING (auth.jwt()->>'email' = 'villaretiror@gmail.com');
CREATE POLICY "Admin All Access" ON public.emergency_tickets FOR ALL USING (auth.jwt()->>'email' = 'villaretiror@gmail.com');
CREATE POLICY "Admin All Access" ON public.business_activity_logs FOR ALL USING (auth.jwt()->>'email' = 'villaretiror@gmail.com');

-- Initial Seed for Service Providers (Examples)
INSERT INTO public.service_providers (name, specialty, phone, whatsapp, priority)
VALUES 
('Técnico José (Electricista)', 'electrician', '+17871112233', '17871112233', 1),
('Plomería Rápida Cabo Rojo', 'plumber', '+17874445566', '17874445566', 1),
('Sra. Carmen (Limpieza)', 'cleaning', '+17877778899', '17877778899', 2)
ON CONFLICT DO NOTHING;
