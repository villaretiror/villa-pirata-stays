-- SPRINT 6.1: SENTINEL & SYNC HARDENING
-- 1. AI-Hold & Emergency Support Statuses
-- Ensuring status allows the new types (if using check constraint, but Supabase usually handles strings)
-- Adding a column to track the hold expiration for AI-Hold
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

-- 2. Gravity Matrix for Urgent Alerts
ALTER TABLE urgent_alerts ADD COLUMN IF NOT EXISTS severity INTEGER DEFAULT 1; -- 1 to 5
ALTER TABLE urgent_alerts ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;

-- 3. Concessions & Anti-Manipulation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS given_concessions JSONB DEFAULT '[]';

-- 4. Automatic Cleanup of Expired AI Holds
-- This can be run as a cron or checked during availability checks
CREATE OR REPLACE FUNCTION cleanup_expired_holds() 
RETURNS void AS $$
BEGIN
    UPDATE bookings 
    SET status = 'expired' 
    WHERE status = 'pending_ai_validation' 
    AND hold_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON COLUMN profiles.given_concessions IS 'History of special discounts or concessions given to prevent abuse.';
COMMENT ON COLUMN bookings.hold_expires_at IS 'Expiration time for temporary blocks created by the AI Concierge.';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_features JSONB DEFAULT '[]';
COMMENT ON COLUMN properties.property_features IS 'List of special features for upselling (e.g. {tag: "family", text: "Baby crib available"})';
