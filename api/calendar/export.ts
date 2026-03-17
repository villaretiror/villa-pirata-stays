import ical from 'ical-generator';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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
        // 1. Fetch Bookings and Property Config (Blocked Dates)
        const [bookingsRes, propertyRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('*')
                .eq('property_id', id)
                .in('status', ['confirmed', 'completed']),
            supabase
                .from('properties')
                .select('title, blockeddates')
                .eq('id', id)
                .single()
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (propertyRes.error) throw propertyRes.error;

        const bookings = bookingsRes.data || [];
        const property = propertyRes.data;

        const calendar = ical({ name: property.title || `Villa ${id}` });
        calendar.prodId({
            company: 'Villa Retiro PR',
            product: 'Calendar Sync',
            language: 'ES'
        });

        // 2. Add Confirmed Bookings
        bookings.forEach((booking: any) => {
            const start = new Date(booking.check_in);
            const end = new Date(booking.check_out);

            calendar.createEvent({
                start: start,
                end: end,
                summary: 'Ocupado (Reserva Villa Retiro)',
                description: `ID: ${booking.id}`,
                allDay: true
            });
        });

        // 3. Add Manual Blocked Dates (Jsonb column)
        const manualBlocks = (property.blockeddates as string[]) || [];
        manualBlocks.forEach((dateStr: string) => {
            const date = new Date(dateStr);
            // End date is next day for 1-day block
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);

            calendar.createEvent({
                start: date,
                end: endDate,
                summary: 'Bloqueado (Mantenimiento/Host)',
                description: 'Bloqueo manual desde el Dashboard',
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
