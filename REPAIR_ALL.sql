-- ============================================================
-- REPAIR SCRIPT: Villa & Pirata Stays
-- 1. Create Leads table
-- 2. Repair Guest Capacity (Mapping flat guests from JSONB)
-- ============================================================

-- 1. Create Leads table if missing
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and permissions for Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'Allow public insert'
    ) THEN
        CREATE POLICY "Allow public insert" ON public.leads FOR INSERT WITH CHECK (true);
    END IF;
END $$;

GRANT INSERT ON public.leads TO anon;
GRANT INSERT ON public.leads TO authenticated;

-- 2. Repair Guest Capacity and Policies JSONB
DO $$ 
BEGIN
    -- Update flat guests column from policies.maxGuests
    UPDATE public.properties 
    SET guests = COALESCE((policies->>'maxGuests')::int, (policies->>'guests')::int, 0)
    WHERE guests = 0 OR guests IS NULL;

    -- Also rename the key inside policies for redundancy/alignment
    UPDATE public.properties 
    SET policies = policies || jsonb_build_object('guests', COALESCE((policies->>'maxGuests')::int, (policies->>'guests')::int, 0)) - 'maxGuests'
    WHERE policies ? 'maxGuests';

    RAISE NOTICE 'Guest capacity and Leads table repaired.';
END $$;
