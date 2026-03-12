
-- MASTER INFRASTRUCTURE UNIFICATION (RESILIENT MODE)
-- Lead Architect: FUTURA OS (Brian Rojas)
-- Project: Villa & Pirata Stays

-- 1. [PROFILES] REPAIR & SYNC
CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY);
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. [PROPERTIES] UNIFIED COLUMNS
CREATE TABLE IF NOT EXISTS public.properties (id TEXT PRIMARY KEY);
DO $$ BEGIN
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id);
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS subtitle TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS service_fee NUMERIC DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviews INT DEFAULT 0;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS featuredAmenity TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS guests INT DEFAULT 1;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INT DEFAULT 1;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS beds INT DEFAULT 1;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS baths NUMERIC DEFAULT 1;
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS fees JSONB DEFAULT '{}';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{}';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS blockedDates JSONB DEFAULT '[]';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS calendarSync JSONB DEFAULT '[]';
  ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS isOffline BOOLEAN DEFAULT false;
END $$;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. [BOOKINGS] SCHEMA REPAIR
CREATE TABLE IF NOT EXISTS public.bookings (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
DO $$ BEGIN
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS property_id TEXT REFERENCES public.properties(id) ON DELETE SET NULL;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in DATE;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out DATE;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price NUMERIC;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting_approval';
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS email_sent_feedback BOOLEAN DEFAULT false;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON public.bookings(property_id);

-- 4. [PROPERTY_COHOSTS] TABLE
CREATE TABLE IF NOT EXISTS public.property_cohosts (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
DO $$ BEGIN
  ALTER TABLE public.property_cohosts ADD COLUMN IF NOT EXISTS property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE;
  ALTER TABLE public.property_cohosts ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.property_cohosts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
  ALTER TABLE public.property_cohosts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

ALTER TABLE public.property_cohosts ENABLE ROW LEVEL SECURITY;

-- 5. [LEADS] TABLE (CRM)
CREATE TABLE IF NOT EXISTS public.leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
DO $$ BEGIN
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS message TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS date_of_interest DATE;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 6. [RLS POLICIES] SECURITY MASTER PLAN
-- Profiles: Users can see all profiles (for joins), but update only their own.
DROP POLICY IF EXISTS "Profiles are public for joins" ON public.profiles;
CREATE POLICY "Profiles are public for joins" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Bookings: Host can see all. Guests see their own.
DROP POLICY IF EXISTS "Host can see all bookings" ON public.bookings;
CREATE POLICY "Host can see all bookings" ON public.bookings FOR SELECT 
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

DROP POLICY IF EXISTS "Guests see their own bookings" ON public.bookings;
CREATE POLICY "Guests see their own bookings" ON public.bookings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable booking insertion for authenticated" ON public.bookings;
CREATE POLICY "Enable booking insertion for authenticated" ON public.bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Leads: Public can insert. Host can see.
DROP POLICY IF EXISTS "Public can submit leads" ON public.leads;
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Host can see leads" ON public.leads;
CREATE POLICY "Host can see leads" ON public.leads FOR SELECT 
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- Property Cohosts: Host can manage. Restricted select.
DROP POLICY IF EXISTS "Host can manage cohosts" ON public.property_cohosts;
CREATE POLICY "Host can manage cohosts" ON public.property_cohosts FOR ALL 
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

DROP POLICY IF EXISTS "Cohosts can see their own status" ON public.property_cohosts;
CREATE POLICY "Cohosts can see their own status" ON public.property_cohosts FOR SELECT 
USING (email = auth.jwt() ->> 'email');

-- Special Property Policies
DROP POLICY IF EXISTS "Admin manages all properties" ON public.properties;
CREATE POLICY "Admin manages all properties" ON public.properties FOR ALL 
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

DROP POLICY IF EXISTS "Public can see properties" ON public.properties;
CREATE POLICY "Public can see properties" ON public.properties FOR SELECT USING (true);

-- 7. [AUTOMATION] AUTH TO PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'avatar',
    COALESCE(new.raw_user_meta_data->>'role', 'guest')
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. [SEED/REPAIR] DATA ALIGNMENT
UPDATE public.properties SET email = 'villaretiror@gmail.com' WHERE id IN ('1081171030449673920', '42839458');
