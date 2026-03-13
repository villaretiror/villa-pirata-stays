-- SPRINT 5: REVENUE OPTIMIZATION & CONVERSION
-- 1. Seasonal Prices for Properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS seasonal_prices JSONB DEFAULT '[]';

-- 2. Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    min_stay_nights INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active promo codes (needed for validation)
CREATE POLICY "Public can read active promo codes" 
ON promo_codes FOR SELECT 
USING (active = true AND valid_to >= NOW());

-- Policy: Only admin (villaretiror@gmail.com) can manage promo codes
CREATE POLICY "Admin can manage promo codes" 
ON promo_codes ALL
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- Comment
COMMENT ON COLUMN properties.seasonal_prices IS 'List of seasonal price overrides [{id, startDate, endDate, price, label}]';
