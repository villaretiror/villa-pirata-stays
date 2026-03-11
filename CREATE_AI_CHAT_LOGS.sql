CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('guest', 'host', 'ai')),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.ai_chat_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read" ON public.ai_chat_logs FOR SELECT TO public USING (true);
