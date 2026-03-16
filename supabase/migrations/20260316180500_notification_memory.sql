-- 🛰️ NOTIFICATION MEMORY PROTOCOL: Prevent duplicate alerts for iCal sync
-- Mission: Ensure each external reservation triggers exactly ONE Telegram notification.

-- 1. Add notification tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS notified_external_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_last_hash TEXT; -- Optional: to detect content changes (summary, etc)

-- 2. Audit Comment
COMMENT ON COLUMN bookings.notified_external_at IS 'Timestamp of when the host was last notified of this external booking via Telegram.';
COMMENT ON COLUMN bookings.sync_last_hash IS 'Hash of the iCal event content to detect updates without re-notifying if dates remain the same.';

-- 3. Optimization: Index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_bookings_notified_external ON bookings(notified_external_at) WHERE notified_external_at IS NULL;
