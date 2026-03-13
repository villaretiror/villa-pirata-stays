-- 1. Official Foreign Key relationship between bookings and profiles
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS fk_bookings_user_id,
ADD CONSTRAINT fk_bookings_user_id 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 2. Ensure RLS allows the join for the host
-- (Assuming authenticated users can read profiles, which is standard for a social/trust app)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 3. Optimization: Index for the user_id and property_id to avoid 400 timeout or slow queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
