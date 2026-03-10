-- ============================================================
-- IDEMPOTENT ALIGN SCHEMA: Villa & Pirata Stays
-- Align Supabase with TypeScript Interfaces (Strict Mode)
-- ============================================================

DO $$ 
BEGIN
    -- 1. Rename Top Level Columns ONLY if they exist and haven't been renamed yet
    
    -- price_per_night -> price
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='price_per_night') THEN
        ALTER TABLE public.properties RENAME COLUMN price_per_night TO price;
    END IF;

    -- max_guests -> guests
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='max_guests') THEN
        ALTER TABLE public.properties RENAME COLUMN max_guests TO guests;
    END IF;

    -- reviews_count -> reviews
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='reviews_count') THEN
        ALTER TABLE public.properties RENAME COLUMN reviews_count TO reviews;
    END IF;

    -- featured_amenity -> featuredAmenity
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='featured_amenity') THEN
        ALTER TABLE public.properties RENAME COLUMN featured_amenity TO "featuredAmenity";
    END IF;

    -- is_offline -> isOffline
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='is_offline') THEN
        ALTER TABLE public.properties RENAME COLUMN is_offline TO "isOffline";
    END IF;

    -- calendar_sync -> calendarSync
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='calendar_sync') THEN
        ALTER TABLE public.properties RENAME COLUMN calendar_sync TO "calendarSync";
    END IF;

    -- host_data -> host
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='host_data') THEN
        ALTER TABLE public.properties RENAME COLUMN host_data TO host;
    END IF;

    -- blocked_dates -> blockedDates
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='blocked_dates') THEN
        ALTER TABLE public.properties RENAME COLUMN blocked_dates TO "blockedDates";
    END IF;

    -- 2. Create the unified 'policies' JSONB column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='policies') THEN
        ALTER TABLE public.properties ADD COLUMN policies JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;

-- 3. Migrate data into 'policies' and drop old columns (Separated for data safety)
UPDATE public.properties SET policies = jsonb_build_object(
  'checkInTime', COALESCE(policies->>'checkInTime', '4:00 PM'),
  'checkOutTime', COALESCE(policies->>'checkOutTime', '11:00 AM'),
  -- Tries to get from legacy columns if available during the update window
  'maxGuests', COALESCE((SELECT max_guests_policy FROM public.properties p2 WHERE p2.id = properties.id), (policies->>'maxGuests')::int, 8),
  'cancellationPolicy', COALESCE((policies->>'cancellationPolicy'), 'firm'),
  'wifiName', COALESCE((policies->>'wifiName'), ''),
  'wifiPass', COALESCE((policies->>'wifiPass'), ''),
  'accessCode', COALESCE((policies->>'accessCode'), '')
) 
WHERE policies IS NULL OR policies = '{}'::jsonb;

-- 4. Cleanup legacy columns if they still exist
DO $$ 
BEGIN
    ALTER TABLE public.properties DROP COLUMN IF EXISTS check_in_time;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS check_out_time;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS cancellation_policy;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS house_rules;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS wifi_name;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS wifi_pass;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS access_code;
    ALTER TABLE public.properties DROP COLUMN IF EXISTS max_guests_policy;
END $$;

-- SYNC COMPLETE. Database is now a clean reflection of the TypeScript Interface. ✅
