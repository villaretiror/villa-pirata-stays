-- 🏗️ INDUSTRIAL OPTIMIZATION: Dynamic Properties Schema Expansion
-- Goal: Eliminate all hardcoded data in StayDashboard and API Emails.

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS location_coords TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS waze_url TEXT,
ADD COLUMN IF NOT EXISTS wifi_name TEXT,
ADD COLUMN IF NOT EXISTS wifi_pass TEXT,
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS lockbox_image_url TEXT;

-- Seed data for the two current properties to ensure zero downtime on features
UPDATE properties 
SET 
    location_coords = '18.07065,-67.16544',
    google_maps_url = 'https://www.google.com/maps?q=18.07065,-67.16544',
    waze_url = 'https://waze.com/ul?ll=18.07065,-67.16544&navigate=yes',
    wifi_name = 'VILLA RETIRO R',
    wifi_pass = 'VillaRetiro2024!',
    access_code = '0895',
    lockbox_image_url = '/assets/lockboxes/retiro.jpg'
WHERE title ILIKE '%Retiro%';

UPDATE properties 
SET 
    location_coords = '18.0267,-67.1706',
    google_maps_url = 'https://www.google.com/maps?q=18.0267,-67.1706',
    waze_url = 'https://waze.com/ul?ll=18.0267,-67.1706&navigate=yes',
    wifi_name = 'PIRATA FAMILY HOUSE',
    wifi_pass = 'Pirata2024!',
    access_code = '2197',
    lockbox_image_url = '/assets/lockboxes/pirata.jpg'
WHERE title ILIKE '%Pirata%';
