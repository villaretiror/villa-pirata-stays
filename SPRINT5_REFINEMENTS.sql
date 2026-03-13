-- SPRINT 5: REVENUE REFINEMENTS
-- 1. Anti-Abuse fields for Promo Codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 999;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS allow_on_seasonal_prices BOOLEAN DEFAULT false;

-- 2. Increment usage RPC
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE promo_codes
    SET current_uses = current_uses + 1
    WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comment update
COMMENT ON FUNCTION increment_promo_usage IS 'Increments the current_uses count of a promo code atomically.';
