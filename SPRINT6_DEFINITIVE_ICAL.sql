-- SPRINT 6.2: MULTI-CHANNEL ICAL SYNC (DEFINITIVE LINKS)
-- Update Villa Retiro R (1081171030449673920)
UPDATE properties 
SET calendarSync = '[
  {
    "id": "airbnb-villa-retiro",
    "platform": "Airbnb",
    "url": "https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae",
    "lastSynced": "' || NOW() || '",
    "syncStatus": "success"
  },
  {
    "id": "booking-villa-retiro",
    "platform": "Booking.com",
    "url": "https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1",
    "lastSynced": "' || NOW() || '",
    "syncStatus": "success"
  }
]'::jsonb
WHERE id = '1081171030449673920';

-- Update Pirata Family House (42839458)
UPDATE properties 
SET calendarSync = '[
  {
    "id": "airbnb-pirata-family",
    "platform": "Airbnb",
    "url": "https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331",
    "lastSynced": "' || NOW() || '",
    "syncStatus": "success"
  },
  {
    "id": "booking-pirata-family",
    "platform": "Booking.com",
    "url": "https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669",
    "lastSynced": "' || NOW() || '",
    "syncStatus": "success"
  }
]'::jsonb
WHERE id = '42839458';

-- Log
COMMENT ON COLUMN properties.calendarSync IS 'Multi-channel iCal feeds (Airbnb, Booking.com, etc) for real-time synchronization.';
