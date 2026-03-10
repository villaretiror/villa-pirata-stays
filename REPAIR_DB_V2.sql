
-- DB REPAIR V2: MISSING COLUMNS & TABLES
-- Lead Architect: FUTURA OS (Brian Rojas)

-- 1. [PROFILES] REPAIR (Add missing 'bio')
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
END $$;

-- 2. [TASKS] TABLE CREATION (Expected by HostMenu.tsx)
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  property TEXT DEFAULT 'Todas',
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  host_id UUID REFERENCES public.profiles(id) -- Optional: link to host
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
DROP POLICY IF EXISTS "Anyone can manage tasks in demo" ON public.tasks;
CREATE POLICY "Anyone can manage tasks in demo" ON public.tasks FOR ALL USING (true);

-- 3. [RLS FIX]profiles select access
DROP POLICY IF EXISTS "Profiles are public for joins" ON public.profiles;
CREATE POLICY "Profiles are public for joins" ON public.profiles FOR SELECT USING (true);

-- 4. [BOOKINGS] STATUS ENUM (Ensure valid status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
     -- Using pure text for now to avoid migration issues, but adding comments
     NULL;
  END IF;
END $$;

-- Ensure RLS on Bookings allows host access
DROP POLICY IF EXISTS "Host can see all bookings" ON public.bookings;
CREATE POLICY "Host can see all bookings" ON public.bookings FOR SELECT 
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');
