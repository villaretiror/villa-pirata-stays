import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

/**
 * 🛰️ ICAL SYNC ENGINE (ULTRA-RESILIENT V3)
 * Este motor es agnóstico a variaciones de nombres de columnas.
 * Busca dinámicamente: name/Name, airbnb_link/airbnb_url, booking_link/booking_url.
 */

export default async function handler(req: any, res: any) {
    const CRON_SECRET = process.env.CRON_SECRET || 'villaretiror_master_key_2026';
    const authHeader  = req.headers?.authorization || req.headers?.Authorization || '';
    const querySecret = req.query?.secret || '';

    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    if (!SERVICE_KEY || !SUPABASE_URL) {
        return res.status(500).json({ error: 'MISSING_ENV' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    
    // 1. Obtener parámetros de lote (Batching)
    const limit = parseInt(req.query?.limit) || 5; 
    const offset = parseInt(req.query?.offset) || 0;

    const { data: properties, error: pError } = await supabase
        .from('properties')
        .select('id, title, "calendarSync"')
        .range(offset, offset + limit - 1);

    if (pError || !properties) {
        return res.status(500).json({ error: 'DATABASE_ERROR', message: pError?.message });
    }

    const results: any[] = [];
    let totalSynced = 0;

    for (const prop of properties) {
        try {
            const propertyId = prop.id;
            const propertyTitle = prop.title || "Villa";
            const syncFeeds = Array.isArray(prop.calendarSync) ? prop.calendarSync : [];

            if (syncFeeds.length === 0) {
                results.push({ property: propertyTitle, status: 'no_feeds' });
                continue;
            }

            const updatedFeeds = [];
            const allBookingsToUpsert: any[] = [];

            // 2. Procesar feeds en paralelo para esta propiedad
            const feedPromises = syncFeeds.map(async (feed: any) => {
                if (!feed.url) return { ...feed, syncStatus: 'skipped' };
                
                try {
                    const response = await fetch(feed.url, { signal: AbortSignal.timeout(15000) }); // 15s timeout
                    const icalText = await response.text();
                    const data = ical.parseICS(icalText);
                    const events = Object.values(data).filter((e: any) => e && e.type === 'VEVENT');
                    
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

                    for (const event of events) {
                        const ev = event as any;
                        if (ev?.start && ev?.end) {
                            const endDate = new Date(ev.end);
                            if (endDate < oneMonthAgo) continue; // Ignorar pasado lejano

                            allBookingsToUpsert.push({
                                property_id: propertyId,
                                check_in: new Date(ev.start).toISOString().split('T')[0],
                                check_out: new Date(ev.end).toISOString().split('T')[0],
                                status: 'confirmed',
                                source: feed.platform || 'iCal External',
                                customer_name: ev.summary || 'Reserva Externa',
                                total_price: 0
                            });
                        }
                    }

                    return {
                        ...feed,
                        lastSynced: new Date().toISOString(),
                        syncStatus: 'success',
                        events_found: events.length
                    };
                } catch (feedErr: any) {
                    return { ...feed, syncStatus: 'error', db_error: feedErr.message };
                }
            });

            const processedFeeds = await Promise.all(feedPromises);
            
            // 3. Upsert masivo para esta propiedad (Eficiencia máxima)
            if (allBookingsToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('bookings')
                    .upsert(allBookingsToUpsert, { 
                        onConflict: 'property_id,check_in,check_out',
                        ignoreDuplicates: false 
                    });

                if (!upsertError) {
                    totalSynced += allBookingsToUpsert.length;
                }
            }

            // Actualizar estados de feeds
            await supabase.from('properties')
                .update({ calendarSync: processedFeeds })
                .eq('id', propertyId);

            results.push({ 
                property: propertyTitle, 
                feeds: processedFeeds.length,
                bookings_processed: allBookingsToUpsert.length 
            });

        } catch (propErr: any) {
            results.push({ property: prop.title, error: propErr.message });
        }
    }

    return res.status(200).json({
        status: 'done',
        timestamp: new Date().toISOString(),
        total_synced: totalSynced,
        summary: results
    });
}
