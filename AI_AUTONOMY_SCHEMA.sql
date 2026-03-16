-- 🧠 AI AUTONOMY LAYER: INSIGHTS & PROPOSALS TABLE
-- Misión: Proveer memoria estratégica a Salty para evolución autónoma.

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'pattern' (duchas/reglas), 'proposal' (descuentos/marketing), 'trend' (precios)
    content JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'archived'
    impact_score INT DEFAULT 0, -- 1-10 (estimado por Salty)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS si es necesario (para el dashboard del host)
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON ai_insights FOR ALL TO authenticated USING (true);
