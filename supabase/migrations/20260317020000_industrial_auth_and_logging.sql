-- 🏗️ INDUSTRIAL AUTH & LOGGING INFRASTRUCTURE

-- 1. AUTH AUDIT LOGS
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    event_type TEXT NOT NULL, -- 'login', 'logout', 'failed_attempt'
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_cleaning_in_progress BOOLEAN DEFAULT false;

-- 2. INTENT LOGGING (Salty Proactive Hook)
CREATE TABLE IF NOT EXISTS intent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    booking_id TEXT,
    intent_type TEXT NOT NULL, -- 'refund_check'
    metadata JSONB, -- { refund_amount: 0, property_id: '...' }
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ATOMIC PROFILE TRIGGER
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'guest'),
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'name', 'User') || '&background=FF7F3F&color=fff'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on Log Tables
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_logs ENABLE ROW LEVEL SECURITY;

-- Host-only access for auth_logs
CREATE POLICY "Hosts can read auth logs" ON auth_logs
    FOR SELECT USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- 4. PROFILE LOYALTY EXPANSION
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_returning_guest BOOLEAN DEFAULT false;

-- Anyone can insert intent logs (client-side triggers)
CREATE POLICY "Anyone can insert intent logs" ON intent_logs
    FOR INSERT WITH CHECK (true);
