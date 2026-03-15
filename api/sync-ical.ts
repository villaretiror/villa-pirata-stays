import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

// 🔑 EXCLUSIVAMENTE Service Role Key — bypass RLS para escritura en bookings
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
// 🛡️ Búsqueda exhaustiva de la Service Role Key
const SUPABASE_SERVICE_KEY = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SERVICE_ROLE_KEY || 
    '';

const ICAL_FEEDS = [
    { property_id: '1081171030449673920', platform: 'Airbnb',      url: 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae' },
    { property_id: '1081171030449673920', platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=246c7179-e44f-458e-bede-2ff3376464b1' },
    { property_id: '42839458',           platform: 'Airbnb',      url: 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331' },
    { property_id: '42839458',           platform: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=424b8257-5e8e-4d8d-9522-b2e63f4bf669' }
];

export default async function handler(req: any, res: any) {
    // 🛡️ AUTH GATE: Acepta Bearer header (Vercel Cron) O query param ?secret= (prueba manual)
    const CRON_SECRET = process.env.CRON_SECRET || 'villaretiror_master_key_2026';
    const authHeader  = req.headers?.authorization || req.headers?.Authorization || '';
    const querySecret = req.query?.secret || '';

    const isAuthorizedHeader = authHeader === `Bearer ${CRON_SECRET}`;
    const isAuthorizedQuery  = querySecret === CRON_SECRET;

    if (!isAuthorizedHeader && !isAuthorizedQuery) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 🔌 Verificar que la Service Role Key está configurada
    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({
            error: 'MISSING_ENV',
            detail: 'SUPABASE_SERVICE_ROLE_KEY is not set. The anon key cannot bypass RLS. Set this variable in Vercel dashboard under Environment Variables.'
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const results: any[] = [];
    let totalSynced = 0;
    let totalErrors = 0;

    for (const feed of ICAL_FEEDS) {
        try {
            console.log(`[iCal Sync] Fetching ${feed.platform} for property ${feed.property_id}...`);
            const data = await ical.fromURL(feed.url);
            const events = Object.values(data).filter((e: any) => e && e.type === 'VEVENT');

            let feedSynced = 0;
            let feedErrors = 0;

            for (const event of events) {
                const ev = event as any;
                if (ev && ev.start && ev.end) {
                    const check_in  = new Date(ev.start).toISOString().split('T')[0];
                    const check_out = new Date(ev.end).toISOString().split('T')[0];
                    const summary   = ev.summary || 'Reserva Externa';

                    const { error: upsertError } = await supabase
                        .from('bookings')
                        .upsert({
                            property_id:   feed.property_id,
                            check_in,
                            check_out,
                            status:        'confirmed',
                            source:        feed.platform,
                            customer_name: summary,
                            total_price:   0
                        }, { onConflict: 'property_id,check_in,check_out' });

                    if (upsertError) {
                        // 🚨 Captura "Permission Denied" de RLS y cualquier otro error de Supabase
                        console.error(`[iCal Sync] ❌ DB ERROR | ${feed.property_id} | ${check_in}→${check_out} | CODE=${upsertError.code} | "${upsertError.message}" | HINT: ${upsertError.hint}`);
                        feedErrors++;
                        totalErrors++;
                    } else {
                        feedSynced++;
                        totalSynced++;
                    }
                }
            }

            results.push({
                property: feed.property_id,
                platform: feed.platform,
                events_found: events.length,
                synced: feedSynced,
                errors: feedErrors
            });

            console.log(`[iCal Sync] ✅ ${feed.platform} → ${feed.property_id}: ${feedSynced} synced, ${feedErrors} errors`);

        } catch (networkError: any) {
            console.error(`[iCal Sync] ❌ NETWORK ERROR | ${feed.property_id} (${feed.platform}): ${networkError.message}`);
            results.push({ property: feed.property_id, platform: feed.platform, error: networkError.message });
            totalErrors++;
        }
    }

    return res.status(200).json({
        status: totalErrors === 0 ? 'ok' : 'partial',
        timestamp: new Date().toISOString(),
        total_synced: totalSynced,
        total_errors: totalErrors,
        summary: results
    });
}
