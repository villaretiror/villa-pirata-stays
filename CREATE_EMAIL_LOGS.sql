-- 📧 EMAIL TRACKING SYSTEM
-- Sistema de trazabilidad para confirmaciones de lectura

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resend_id TEXT UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    guest_name TEXT,
    subject TEXT,
    status TEXT DEFAULT 'sent',
    opened_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS si es necesario (generalmente interno para el Bot/API)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servicio interno puede todo en email_logs" ON email_logs FOR ALL USING (true);
