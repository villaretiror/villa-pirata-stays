-- ============================================================
-- REPAIR SCHEMA: Villa & Pirata Stays
-- Pega este bloque COMPLETO en Supabase → SQL Editor → Run
-- ============================================================

-- ==========================================
-- 1. ENUM: Cancellation Policy
-- ==========================================
DO $$ BEGIN
  CREATE TYPE cancellation_policy_enum AS ENUM ('flexible', 'moderate', 'firm', 'strict', 'non-refundable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 2. ALTER properties: columnas faltantes
-- ==========================================
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS blocked_dates TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS calendar_sync JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cancellation_policy cancellation_policy_enum DEFAULT 'firm';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS house_rules TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS check_in_time TEXT DEFAULT '4:00 PM';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS check_out_time TEXT DEFAULT '11:00 AM';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS max_guests_policy INTEGER DEFAULT 8;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS featured_amenity TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS baths INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS fees JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ==========================================
-- 3. ALTER bookings: columnas faltantes
-- ==========================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 1;

-- ==========================================
-- 4. TABLA tasks (HostMenu)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  property TEXT DEFAULT 'Todas',
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 5. TABLA earnings (HostMenu)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.earnings (
  id SERIAL PRIMARY KEY,
  property_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 6. TABLA messages (HostChat)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  sender TEXT DEFAULT 'guest' CHECK (sender IN ('guest', 'host', 'ai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 7. RLS: Habilitar en tablas nuevas
-- ==========================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. RLS POLICIES: properties (Host puede CRUD)
-- ==========================================
-- Eliminar policies viejas si existen para evitar conflictos
DROP POLICY IF EXISTS "Anyone can view properties." ON public.properties;
DROP POLICY IF EXISTS "Host can insert properties." ON public.properties;
DROP POLICY IF EXISTS "Host can update properties." ON public.properties;
DROP POLICY IF EXISTS "Host can delete properties." ON public.properties;

CREATE POLICY "Anyone can view properties."
  ON public.properties FOR SELECT USING (true);

CREATE POLICY "Host can insert properties."
  ON public.properties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Host can update properties."
  ON public.properties FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Host can delete properties."
  ON public.properties FOR DELETE
  USING (auth.role() = 'authenticated');

-- ==========================================
-- 9. RLS POLICIES: bookings (Host manage + User create)
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own bookings." ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings." ON public.bookings;
DROP POLICY IF EXISTS "Host can view all bookings." ON public.bookings;
DROP POLICY IF EXISTS "Host can update bookings." ON public.bookings;

CREATE POLICY "Users can view their own bookings."
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can create their own bookings."
  ON public.bookings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Host can update bookings."
  ON public.bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ==========================================
-- 10. RLS POLICIES: tasks (Host full access)
-- ==========================================
CREATE POLICY "Authenticated users can manage tasks."
  ON public.tasks FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- 11. RLS POLICIES: earnings (Host read)
-- ==========================================
CREATE POLICY "Authenticated users can manage earnings."
  ON public.earnings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- 12. RLS POLICIES: messages (Full access for auth)
-- ==========================================
CREATE POLICY "Authenticated users can manage messages."
  ON public.messages FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- 13. RLS POLICIES: profiles (User can insert own)
-- ==========================================
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- DONE ✅
-- ==========================================
