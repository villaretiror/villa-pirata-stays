-- 1. Create Salty's memory bank table
CREATE TABLE IF NOT EXISTS public.salty_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    learned_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add takeover_notified flag to chat_logs to avoid duplicate notifications
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS takeover_notified BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.salty_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for salty_memories" ON public.salty_memories FOR ALL USING (true) WITH CHECK (true);
