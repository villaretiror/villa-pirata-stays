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
                .select('title, blockeddates, updated_at')
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
        const lastModified = new Date(property.updated_at || Date.now());

        const calendar = ical({ name: property.title || `Villa ${id}` });
        calendar.prodId({
            company: 'Villa Retiro PR',
            product: 'Calendar Sync Atomic',
            language: 'ES'
        });

        // 2. Add Confirmed Bookings & External Blocks (Deterministic UIDs)
        const userAgent = req.headers['user-agent'] || '';
        const isAirbnb = /airbnb/i.test(userAgent);
        const isBookingStr = /booking/i.test(userAgent);

        bookings.forEach((booking: any) => {
            // 🛡️ ANTI-LOOP ENGINE: Do not export external blocks to the same platform that created them
            if (booking.status === 'external_block') {
                if (isAirbnb && booking.source === 'Airbnb') return;
                if (isBookingStr && booking.source === 'Booking') return; 
            }

            const event = calendar.createEvent({
                id: `vrr-booking-${booking.id}`,
                start: new Date(booking.check_in),
                end: new Date(booking.check_out),
                summary: 'Ocupado (Villa & Pirata Stays)',
                description: `Salty Identity: ${booking.id} - ${booking.source || 'Directo'}`,
                allDay: true,
                lastModified: lastModified,
                sequence: 1
            });
            // 🔱 Redundant Identity Locking
            event.uid(`vrr-booking-${booking.id}`);
        });

        // 3. Add Manual Blocked Dates (CONSOLIDATED RANGES)
        const manualDates = (property.blockeddates || []).sort();
        if (manualDates.length > 0) {
            const ranges: { start: string, end: string }[] = [];
            let currentRange: { start: string, last: string } | null = null;

            manualDates.forEach((dateStr: string) => {
                const typedCurrent = currentRange as { start: string, last: string } | null;
                if (!typedCurrent) {
                    currentRange = { start: dateStr, last: dateStr };
                } else {
                    const lastDate = new Date(typedCurrent.last + 'T12:00:00');
                    const nextDay = new Date(lastDate);
                    nextDay.setDate(lastDate.getDate() + 1);
                    const nextDayStr = nextDay.toISOString().split('T')[0];

                    if (dateStr === nextDayStr) {
                        currentRange = { ...typedCurrent, last: dateStr };
                    } else {
                        // End current range and start new one
                        const endRange = new Date(typedCurrent.last + 'T12:00:00');
                        endRange.setDate(endRange.getDate() + 1);
                        ranges.push({ start: typedCurrent.start, end: endRange.toISOString().split('T')[0] });
                        currentRange = { start: dateStr, last: dateStr };
                    }
                }
            });

            const finalRange = currentRange as { start: string, last: string } | null;
            if (finalRange) {
                const endRange = new Date(finalRange.last + 'T12:00:00');
                endRange.setDate(endRange.getDate() + 1);
                ranges.push({ start: finalRange.start, end: endRange.toISOString().split('T')[0] });
            }

            ranges.forEach((range) => {
                const event = calendar.createEvent({
                    id: `vrr-manual-block-${id}-${range.start}`,
                    start: new Date(range.start + 'T12:00:00'),
                    end: new Date(range.end + 'T12:00:00'),
                    summary: 'Bloqueado (Host)',
                    description: `Bloqueo estratégico manual del Capitán`,
                    allDay: true,
                    lastModified: lastModified,
                    sequence: 1
                });
                // 🔱 Redundant Identity Locking
                event.uid(`vrr-manual-block-${id}-${range.start}`);
            });
        }

        // 4. Add Availability Rules (Hard Blocks)
        rules.forEach((rule: any) => {
            const event = calendar.createEvent({
                id: `vrr-rule-${rule.id}`,
                start: new Date(rule.start_date + 'T12:00:00'),
                end: new Date(rule.end_date + 'T12:00:00'),
                summary: 'Bloqueado (Estratégico)',
                description: `Veda: ${rule.reason || 'Restringido'}`,
                allDay: true,
                lastModified: lastModified,
                sequence: 1
            });
            // 🔱 Redundant Identity Locking
            event.uid(`vrr-rule-${rule.id}`);
        });

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="villa-${id}.ics"`);
        res.status(200).send(calendar.toString());

    } catch (error: any) {
        console.error('EXPORT CALENDAR ERROR:', error);
        return res.status(500).json({ error: 'Failed to generate calendar' });
    }
}
