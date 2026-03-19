-- AVAILABILITY RULES SCHEMA (Dynamic Constraints)
-- This table allows overriding global property settings per specific date ranges.

CREATE TABLE IF NOT EXISTS availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Overrides
    min_nights INTEGER, -- Overrides global minimum nights (e.g., 4 nights for Holidays)
    advance_notice_days INTEGER, -- Lead time override (e.g., 0 for same-day, 2 for standard)
    buffer_nights_before INTEGER DEFAULT 0, -- Block N nights before
    buffer_nights_after INTEGER DEFAULT 0, -- Block N nights after
    
    -- Check-in / Check-out restrictions (JSONB array of ints: 0=Sun, 1=Mon, etc.)
    restricted_checkin_days JSONB DEFAULT '[]'::jsonb,
    restricted_checkout_days JSONB DEFAULT '[]'::jsonb,
    
    -- Salty AI configuration
    requires_manual_approval BOOLEAN DEFAULT false, -- If true, Salty must route to Brian
    reason TEXT, -- Internal notes (e.g., "Semana Santa", "Hueco de 1 día")

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast gap/date queries by the booking engine
CREATE INDEX idx_availability_rules_property_dates ON availability_rules(property_id, start_date, end_date);
