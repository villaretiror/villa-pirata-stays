import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const ICAL_FEEDS = [
    { property_id: '1081171030449673920', platform: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae' },
    { property_id: '1081171030449673920', platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1' },
    { property_id: '42839458', platform: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331' },
    { property_id: '42839458', platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669' }
];

export default async function handler(req: Request) {
    // Basic Auth Check (optional if running locally vs vercel cron)
    // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    const results = [];

    for (const feed of ICAL_FEEDS) {
        try {
            const data = await ical.fromURL(feed.url);
            const events = Object.values(data).filter(e => e && e.type === 'VEVENT');

            for (const event of events) {
                const ev = event as any;
                if (ev && ev.start && ev.end) {
                    const check_in = new Date(ev.start).toISOString().split('T')[0];
                    const check_out = new Date(ev.end).toISOString().split('T')[0];
                    const summary = ev.summary || "Reserva Externa";

                    // Upsert based on property_id, check_in, check_out
                    await supabase.from('bookings').upsert({
                        property_id: feed.property_id,
                        check_in,
                        check_out,
                        status: 'confirmed',
                        source: (feed as any).platform || 'Airbnb',
                        customer_name: summary,
                        total_price: 0 // External, placeholder
                    }, { onConflict: 'property_id, check_in, check_out' });
                }
            }
            results.push({ property: feed.property_id, synced: events.length });
        } catch (error: any) {
            console.error(`Error syncing ${feed.property_id}:`, error.message);
            results.push({ property: feed.property_id, error: error.message });
        }
    }

    return new Response(JSON.stringify({ status: 'done', summary: results }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
