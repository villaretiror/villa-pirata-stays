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
    
    // 1. Obtenemos todo de la tabla properties para mapear dinámicamente
    const { data: properties, error: pError } = await supabase
        .from('properties')
        .select('*');

    if (pError || !properties) {
        return res.status(500).json({ error: 'DATABASE_ERROR', message: pError?.message });
    }

    const results: any[] = [];
    let totalSynced = 0;

    for (const prop of properties) {
        // Mapeo Resiliente con Corchetes (evita errores de case-sensitivity)
        const propertyId = prop["id"];
        const propertyName = prop["name"] || prop["Name"] || prop["title"] || "Villa";
        const airbnbUrl = prop["airbnb_link"] || prop["airbnb_url"] || prop["airbnbLink"];
        const bookingUrl = prop["booking_link"] || prop["booking_url"] || prop["bookingLink"];
        const currentSyncSettings = prop["calendarsync"] || prop["calendarSync"] || prop["sync_settings"] || {};

        const feeds = [
            { platform: 'Airbnb',      url: airbnbUrl },
            { platform: 'Booking.com', url: bookingUrl }
        ].filter(f => f.url && f.url.includes('http'));

        const propSyncStats: any = { 
            ...currentSyncSettings, 
            last_sync: new Date().toISOString(), 
            feeds: [] 
        };

        for (const feed of feeds) {
            try {
                // Fetch iCal data
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
                            source: feed.platform,
                            customer_name: ev.summary || 'Reserva Externa',
                            total_price: 0
                        }, { onConflict: 'property_id,check_in,check_out' });

                        if (!error) {
                            feedCount++;
                            totalSynced++;
                        } else {
                            lastError = error.message;
                        }
                    }
                }

                propSyncStats.feeds.push({
                    platform: feed.platform,
                    events_found: events.length,
                    synced: feedCount,
                    error: lastError
                });

                results.push({ 
                    property: propertyName, 
                    platform: feed.platform, 
                    events_found: events.length, 
                    synced: feedCount,
                    db_error: lastError 
                });

            } catch (err: any) {
                results.push({ property: propertyName, platform: feed.platform, error: err.message });
            }
        }

        // Actualización dinámica del estado de sincronización
        // Intentamos actualizar calendarSync o calendarsync según lo que exista
        const syncColumn = prop.hasOwnProperty("calendarsync") ? "calendarsync" : "calendarSync";
        await supabase.from('properties')
            .update({ [syncColumn]: propSyncStats })
            .eq('id', propertyId);
    }

    return res.status(200).json({
        status: 'done',
        timestamp: new Date().toISOString(),
        total_synced: totalSynced,
        summary: results
    });
}
