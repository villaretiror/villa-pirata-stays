-- SPRINT 6: THE EXECUTIVE BRAIN (CEREBRO EJECUTIVO) - REVISED
-- 1. Urgent Alerts Table (Sentinel Middleware)
CREATE TABLE IF NOT EXISTS urgent_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT DEFAULT 'new', -- 'new' or 'resolved'
    sentiment_score FLOAT, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for urgent_alerts
ALTER TABLE urgent_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin (villaretiror@gmail.com) can read/manage alerts
CREATE POLICY "Admin can manage urgent alerts" 
ON urgent_alerts ALL
USING (auth.jwt() ->> 'email' = 'villaretiror@gmail.com');

-- Policy: Chatbot can insert alerts (Anonymously or as Authenticated User)
CREATE POLICY "Anyone can insert urgent alerts" 
ON urgent_alerts FOR INSERT 
WITH CHECK (true);

-- 2. Enhance chat_logs for Relational Memory
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS last_sentiment TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS booking_history_ref JSONB DEFAULT '[]';

-- Comment
COMMENT ON TABLE urgent_alerts IS 'System alerts for the Host triggered by the AI Concierge in crisis mode.';
