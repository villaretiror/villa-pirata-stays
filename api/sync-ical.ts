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
    
    // 1. Obtener propiedades y sus feeds de sincronización (calendarSync es el estandár)
    const { data: properties, error: pError } = await supabase
        .from('properties')
        .select('id, title, "calendarSync"');

    if (pError || !properties) {
        return res.status(500).json({ error: 'DATABASE_ERROR', message: pError?.message });
    }

    const results: any[] = [];
    let totalSynced = 0;

    for (const prop of properties) {
        const propertyId = prop.id;
        const propertyTitle = prop.title || "Villa";
        const syncFeeds = Array.isArray(prop.calendarSync) ? prop.calendarSync : [];

        if (syncFeeds.length === 0) {
            results.push({ property: propertyTitle, status: 'no_feeds' });
            continue;
        }

        const updatedFeeds = [];

        for (const feed of syncFeeds) {
            try {
                if (!feed.url) continue;

                const response = await fetch(feed.url);
                const icalText = await response.text();
                const data = ical.parseICS(icalText);
                
                const events = Object.values(data).filter((e: any) => e && e.type === 'VEVENT');
                
                let feedCount = 0;
                let lastError = null;

                for (const event of events) {
                    const ev = event as any;
                    if (ev?.start && ev?.end) {
                        const check_in  = new Date(ev.start).toISOString().split('T')[0];
                        const check_out = new Date(ev.end).toISOString().split('T')[0];
                        
                        const { error } = await supabase.from('bookings').upsert({
                            property_id: propertyId,
                            check_in,
                            check_out,
                            status: 'confirmed',
                            source: feed.platform || 'iCal External',
                            customer_name: ev.summary || 'Reserva Externa',
                            total_price: 0
                        }, { onConflict: 'property_id,check_in,check_out' }); // unique_booking_slot constraint

                        if (!error) {
                            feedCount++;
                            totalSynced++;
                        } else {
                            lastError = error.message;
                        }
                    }
                }

                updatedFeeds.push({
                    ...feed,
                    lastSynced: new Date().toISOString(),
                    syncStatus: lastError ? 'error' : 'success',
                    events_found: events.length,
                    synced: feedCount,
                    db_error: lastError
                });

                results.push({ 
                    property: propertyTitle, 
                    platform: feed.platform, 
                    events_found: events.length, 
                    synced: feedCount,
                    db_error: lastError 
                });

            } catch (err: any) {
                updatedFeeds.push({ ...feed, syncStatus: 'error', db_error: err.message });
                results.push({ property: propertyTitle, platform: feed.platform, error: err.message });
            }
        }

        // Actualizar el objeto calendarSync con los nuevos estados
        await supabase.from('properties')
            .update({ calendarSync: updatedFeeds })
            .eq('id', propertyId);
    }

    return res.status(200).json({
        status: 'done',
        timestamp: new Date().toISOString(),
        total_synced: totalSynced,
        summary: results
    });
}
