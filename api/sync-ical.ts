import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

const ICAL_FEEDS = [
    { property_id: '1081171030449673920', platform: 'Airbnb',      url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae' },
    { property_id: '1081171030449673920', platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1' },
    { property_id: '42839458',           platform: 'Airbnb',      url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331' },
    { property_id: '42839458',           platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669' }
];

export default async function handler(req: any, res: any) {
    // 🛡️ AUTH GATE
    const CRON_SECRET = process.env.CRON_SECRET || 'villaretiror_master_key_2026';
    const authHeader  = req.headers?.authorization || req.headers?.Authorization || '';
    const querySecret = req.query?.secret || '';

    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 🔍 LECTURA RESILIENTE DE VARIABLES
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    if (!SERVICE_KEY || !SUPABASE_URL) {
        return res.status(500).json({
            error: 'MISSING_ENV_DIAGNOSTIC',
            diagnostic: {
                SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                SERVICE_ROLE_KEY: !!process.env.SERVICE_ROLE_KEY,
                SUPABASE_URL: !!process.env.SUPABASE_URL,
                VITE_URL: !!process.env.VITE_SUPABASE_URL
            }
        });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const results: any[] = [];
    let totalSynced = 0;

    for (const feed of ICAL_FEEDS) {
        try {
            const data = await ical.fromURL(feed.url);
            const events = Object.values(data).filter((e: any) => e && e.type === 'VEVENT');

            for (const event of events) {
                const ev = event as any;
                if (ev?.start && ev?.end) {
                    const check_in  = new Date(ev.start).toISOString().split('T')[0];
                    const check_out = new Date(ev.end).toISOString().split('T')[0];
                    
                    const { error } = await supabase.from('bookings').upsert({
                        property_id: feed.property_id,
                        check_in,
                        check_out,
                        status: 'confirmed',
                        source: feed.platform,
                        customer_name: ev.summary || 'Reserva Externa',
                        total_price: 0
                    }, { onConflict: 'property_id,check_in,check_out' });

                    if (!error) totalSynced++;
                }
            }
            results.push({ property: feed.property_id, platform: feed.platform, synced: true });
        } catch (err: any) {
            results.push({ property: feed.property_id, error: err.message });
        }
    }

    return res.status(200).json({
        status: 'done',
        total_synced: totalSynced,
        summary: results
    });
}
