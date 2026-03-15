-- FIX MIGRATION V2: ALIGNING SCHEMA WITH RECENT ICAL SYNC REQUIREMENTS
-- Lead Architect: FUTURA OS (Brian Rojas)

-- 1. Unify Property schema with iCal expectations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blocked_dates') THEN
        ALTER TABLE public.properties ADD COLUMN blocked_dates JSONB DEFAULT '[]';
    END IF;
    
    -- Ensure camelCase version exists too (Bible alignment)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'blockedDates') THEN
        ALTER TABLE public.properties ADD COLUMN "blockedDates" JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. Unify Bookings schema for unicity and external sync
DO $$ 
BEGIN
    -- Ensure unique constraint for iCal sync to prevent duplicates
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_booking_period'
    ) THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT unique_booking_period 
        UNIQUE (property_id, check_in, check_out);
    END IF;

    -- Add a source column if missing to track where the sync came from
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'source') THEN
        ALTER TABLE public.bookings ADD COLUMN source TEXT DEFAULT 'Direct';
    END IF;
END $$;

-- 3. Permissions
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.properties TO service_role;

RAISE NOTICE 'Migration V2 applied. unique_booking_period constraint and blocked_dates column verified.';
