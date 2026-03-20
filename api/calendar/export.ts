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
        const [bookingsRes, propertyRes, rulesRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('*')
                .eq('property_id', id)
                .in('status', ['confirmed', 'completed', 'external_block']),
            supabase
                .from('properties')
                .select('title, blockeddates')
                .eq('id', id)
                .single(),
            supabase
                .from('availability_rules')
                .select('*')
                .eq('property_id', id)
                .eq('is_blocked', true)
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (propertyRes.error) throw propertyRes.error;

        const bookings = bookingsRes.data || [];
        const property = propertyRes.data;
        const rules = rulesRes.data || [];

        const calendar = ical({ name: property.title || `Villa ${id}` });
        calendar.prodId({
            company: 'Villa Retiro PR',
            product: 'Calendar Sync',
            language: 'ES'
        });

        // 2. Add Confirmed Bookings & External Blocks
        const userAgent = req.headers['user-agent'] || '';
        const isAirbnb = /airbnb/i.test(userAgent);
        const isBooking = /booking/i.test(userAgent);

        bookings.forEach((booking: any) => {
            // 🛡️ ANTI-LOOP ENGINE: Do not export external blocks to the same platform that created them
            if (booking.status === 'external_block') {
                if (isAirbnb && booking.source === 'Airbnb') return;
                if (isBooking && booking.source === 'Booking') return; 
            }

            const start = new Date(booking.check_in);
            const end = new Date(booking.check_out);

            calendar.createEvent({
                start: start,
                end: end,
                summary: 'Ocupado (Villa & Pirata Stays)',
                description: `ID: ${booking.id} - ${booking.source || 'Directo'}`,
                allDay: true
            });
        });

        // 3. Add Manual Blocked Dates (Property Record)
        const manualBlocked = property.blockeddates || [];
        manualBlocked.forEach((dateStr: string) => {
            const date = new Date(dateStr + 'T12:00:00');
            const end = new Date(date);
            end.setDate(date.getDate() + 1);
            calendar.createEvent({
                start: date,
                end: end,
                summary: 'Bloqueado (Host)',
                description: `Bloqueo manual desde el Dashboard`,
                allDay: true
            });
        });

        // 4. Add Availability Rules (Hard Blocks)
        rules.forEach((rule: any) => {
            calendar.createEvent({
                start: new Date(rule.start_date + 'T12:00:00'),
                end: new Date(rule.end_date + 'T12:00:00'),
                summary: 'Bloqueado (Estratégico)',
                description: `Veda: ${rule.reason || 'Restringido'}`,
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
