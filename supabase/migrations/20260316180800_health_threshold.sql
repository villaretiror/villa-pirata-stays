-- 🛡️ TECHNICAL RESILIENCE PROTOCOL: 3-Strike Threshold
-- Mission: Prevent alert fatigue from micro-interruptions in external feeds.

-- 1. Add failure counter to system_health
ALTER TABLE system_health 
ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0;

-- 2. Audit Comment
COMMENT ON COLUMN system_health.consecutive_failures IS 'Number of consecutive times this service has failed. Resets to 0 on success.';
