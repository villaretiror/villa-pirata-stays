-- 🌟 REVIEWS SCHEMA: REPLACEMENT FOR 404 ERRORS
-- Misión: Asegurar que el ReviewCarousel tenga una fuente de datos sólida.

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    property_id TEXT NOT NULL, -- ID Airbnb o UUID texto a discreción
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    source TEXT DEFAULT 'direct', -- 'direct', 'airbnb', 'google'
    avatar_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Hosts can manage reviews" 
ON public.reviews FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'host'));

-- Indices
CREATE INDEX IF NOT EXISTS idx_reviews_property ON public.reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON public.reviews(is_visible);
