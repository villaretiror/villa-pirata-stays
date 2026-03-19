-- 🗺️ REINGENIERÍA DE DESTINOS: GUÍAS DINÁMICAS
-- Transformación de contenido estático a Gestión Curada desde Supabase.

-- 1. Crear la tabla maestra de Guías de Destino
CREATE TABLE IF NOT EXISTS destination_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'beach', 'food', 'landmark', 'essentials'
    title TEXT NOT NULL,
    distance TEXT,
    description TEXT,
    image_url TEXT,
    map_url TEXT,
    salty_tip TEXT, -- El toque personal de Salty
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para rendimiento en filtrado
CREATE INDEX IF NOT EXISTS idx_guides_category ON destination_guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_sort ON destination_guides(sort_order);

-- 3. Migración de Datos Iniciales (Seed Data)
-- Convertimos INITIAL_LOCAL_GUIDE al nuevo esquema relacional.

INSERT INTO destination_guides (category, title, distance, description, image_url, map_url, salty_tip, sort_order)
VALUES 
-- PLAYAS (beaches)
('beach', 'Balneario de Boquerón & El Poblado', '5-7 min', 'El epicentro de la cultura costera. Playa tranquila de día y vibrante de noche.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200', 'https://www.google.com/maps/dir/18.0636,-67.1569/Balneario%20de%20Boquer%C3%B3n,%20Cabo%20Rojo,%20Puerto%20Rico', 'No puedes irte sin probar los ostiones frescos en la calle mientras escuchas música en vivo.', 1),
('beach', 'Playa Buyé', '12-15 min', 'Aguas cristalinas y arena blanca. Un paraíso turquesa ideal para kayak y desconexión.', 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaBuye.jpeg', 'https://www.google.com/maps/dir/18.0636,-67.1569/Playa%20Buy%C3%A9,%20Cabo%20Rojo,%20Puerto%20Rico', 'Ve temprano para disfrutar de la paz absoluta antes de que llegue la multitud.', 2),
('beach', 'Playa Sucia & El Faro', '20-25 min', 'Reserva natural virgen con vistas de acantilados impresionantes.', 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/PlayaSucia.jpeg', 'https://www.google.com/maps/dir/18.0636,-67.1569/Playa%20Sucia%20La%20Playuela,%20Cabo%20Rojo,%20Puerto%20Rico', 'Camina hasta el Faro Los Morrillos para unas fotos de película.', 3),

-- GASTRONOMÍA (food)
('food', 'Buena Vibra (Boquerón)', '6 min', 'Cócteles artesanales y la mejor energía nocturna del Poblado.', 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/experiencia/BuenaVibra.jpeg', 'https://www.google.com/maps/dir/18.0636,-67.1569/Buena%20Vibra%20Boquer%C3%B3n,%20Cabo%20Rojo,%20Puerto%20Rico', 'Pide el mojito de parcha, es legendario.', 1),
('food', 'Milla de Oro (Joyuda)', '15 min', 'La capital del marisco en Puerto Rico con más de 30 restaurantes frente al mar.', 'https://images.unsplash.com/photo-1551218808-94e220e034a8?auto=format&fit=crop&q=80&w=1200', 'https://www.google.com/maps/dir/18.0636,-67.1569/Milla%20de%20Oro%20Joyuda,%20Cabo%20Rojo,%20Puerto%20Rico', 'Pide el chillo entero frito, es la especialidad de la casa.', 2),
('food', 'Costa Brava', '8 min', 'Mariscos premium y cenas elegantes al atardecer.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200', 'https://www.google.com/maps/dir/18.0636,-67.1569/Costa%20Brava%20Restaurant,%20Cabo%20Rojo,%20Puerto%20Rico', 'Ideal para una cena romántica con vista al mar.', 3),

-- CERCA DE TI (landmark/essentials)
('landmark', 'Carr. 100 — Acceso Rápido', '2 min', 'Conexión total con todo el suroeste.', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200', 'https://www.google.com/maps/dir/18.0636,-67.1569/Carr%20100,%20Cabo%20Rojo,%20Puerto%20Rico', 'Es tu arteria principal para llegar a Mayagüez o Lajas.', 1);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE destination_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública para todos" ON destination_guides
FOR SELECT USING (true);

CREATE POLICY "Solo Administrador puede modificar" ON destination_guides
FOR ALL USING (auth.jwt() -\u003e\u003e 'email' = 'villaretiror@gmail.com');

COMMENT ON TABLE destination_guides IS 'Guías de destino gestionadas dinámicamente para la Landing Page.';
