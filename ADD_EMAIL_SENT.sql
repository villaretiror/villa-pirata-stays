-- Add email_sent column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
