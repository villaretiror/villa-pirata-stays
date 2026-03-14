import ical from 'ical-generator';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query; // villa id

    if (!id) {
        return res.status(400).json({ error: 'Villa ID is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('property_id', id)
            .eq('status', 'confirmed');

        if (error) throw error;

        const calendar = ical({ name: `Reservas Villa ${id}` });
        calendar.prodId({
            company: 'Villa Retiro PR',
            product: 'Calendar Sync',
            language: 'ES'
        });

        (bookings || []).forEach((booking: any) => {
            // Formatear fechas para iCal
            const start = new Date(booking.check_in);
            const end = new Date(booking.check_out);

            calendar.createEvent({
                start: start,
                end: end,
                summary: 'Reservado (Villa Retiro)',
                description: `Ocupado - Reserva ID: ${booking.id}`,
                allDay: true
            });
        });

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="villa-${id}.ics"`);
        res.status(200).send(calendar.toString());

    } catch (error: any) {
        console.error('EXPORT CALENDAR ERROR:', error);
        return res.status(500).json({ error: 'Failed to generate calendar' });
    }
}
