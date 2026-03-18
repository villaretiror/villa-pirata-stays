
-- 🛒 LEAD CAPTURE & PENDING BOOKINGS SYSTEM
CREATE TABLE IF NOT EXISTS pending_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending_payment', -- 'pending_payment', 'expired', 'converted'
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '15 minutes') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for expiring holds
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires_at ON pending_bookings(expires_at);

-- Enable RLS
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert pending bookings" ON pending_bookings
    FOR INSERT WITH CHECK (true);

-- Policy to allow selection based on session_id or user_id
CREATE POLICY "Users can see their own pending bookings" ON pending_bookings
    FOR SELECT USING (
        auth.uid() = user_id OR session_id IS NOT NULL
    );

CREATE POLICY "Host can manage all pending bookings" ON pending_bookings
    FOR ALL USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- 🧹 CRON CLEANUP HOOK: This function can be called by master-cron to expire old holds
CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS void AS $$
BEGIN
    UPDATE public.pending_bookings
    SET status = 'expired'
    WHERE status = 'pending_payment' AND expires_at < now();
    
    -- Also clean up expired AI holds in the main bookings table
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE status = 'pending_ai_validation' AND hold_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
