
-- NUCLEAR DB REPAIR V3: ABSOLUTE SYNC
-- Lead Architect: FUTURA OS (Brian Rojas)

-- 1. [CO-HOSTS] FIX GHOST COLUMN
-- Error confirmed: "null value in column cohost_email"
-- This means cohost_email is NOT NULL in the DB.
-- We will migrate to 'email' and drop 'cohost_email'.

DO $$ 
BEGIN
    -- 1. If cohost_email exists and email doesn't, just rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_cohosts' AND column_name = 'cohost_email') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_cohosts' AND column_name = 'email') THEN
        ALTER TABLE public.property_cohosts RENAME COLUMN cohost_email TO email;
    
    -- 2. If BOTH exist, migrate data and drop cohost_email
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_cohosts' AND column_name = 'cohost_email') 
          AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_cohosts' AND column_name = 'email') THEN
        UPDATE public.property_cohosts SET email = cohost_email WHERE email IS NULL OR email = '';
        ALTER TABLE public.property_cohosts DROP COLUMN cohost_email;
    END IF;

    -- 3. Ensure 'email' is NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_cohosts' AND column_name = 'email') THEN
        ALTER TABLE public.property_cohosts ALTER COLUMN email SET NOT NULL;
    ELSE
        -- If for some reason it doesn't exist yet
        ALTER TABLE public.property_cohosts ADD COLUMN email TEXT NOT NULL;
    END IF;
END $$;

-- 2. [PROFILES] ADD MISSING 'bio'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. [TASKS] SYNC
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  property TEXT DEFAULT 'Todas',
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public task management" ON public.tasks;
CREATE POLICY "Public task management" ON public.tasks FOR ALL USING (true);


-- 4. [RLS] ENSURE BOOKINGS ARE LEGIBLE
DROP POLICY IF EXISTS "Host can see all bookings" ON public.bookings;
CREATE POLICY "Host can see all bookings" ON public.bookings FOR SELECT 
USING (true); -- Set to true for debugging, then restrict back to admin email if needed

-- 5. [RLS] ENSURE PROFILES ARE LEGIBLE FOR JOINS
DROP POLICY IF EXISTS "Profiles are public for joins" ON public.profiles;
CREATE POLICY "Profiles are public for joins" ON public.profiles FOR SELECT USING (true);

-- 6. [RLS] ENSURE PROPERTIES ARE LEGIBLE
DROP POLICY IF EXISTS "Public can see properties" ON public.properties;
CREATE POLICY "Public can see properties" ON public.properties FOR SELECT USING (true);
