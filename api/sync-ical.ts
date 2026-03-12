import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const ICAL_FEEDS = [
    { property_id: '1081171030449673920', url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae' },
    { property_id: '42839458', url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331' }
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

                    // Upsert based on some hash of the event or property+dates
                    // Note: This is an EXTERNAL booking from iCal
                    await supabase.from('bookings').upsert({
                        property_id: feed.property_id,
                        check_in,
                        check_out,
                        status: 'confirmed',
                        payment_method: 'airbnb_sync',
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
