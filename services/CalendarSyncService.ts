import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './NotificationService.js';

export const CalendarSyncService = {
    async syncAll(supabase: SupabaseClient) {
        // FETCH FROM NEW INTEGRATION PILLAR (calendarSync)
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title, "calendarSync", is_offline')
            .eq('is_offline', false);

        if (error || !properties) {
            console.error('[CalendarSyncService] Error fetching properties:', error);
            return { total: 0, details: 'Error al obtener propiedades.' };
        }

        const results: string[] = [];
        let totalImported = 0;

        for (const prop of properties) {
            const feeds: any[] = prop.calendarSync || [];
            if (feeds.length === 0) continue;

            let updatedFeeds = [...feeds];
            let propImported = 0;

            for (let i = 0; i < feeds.length; i++) {
                const feed = feeds[i];
                if (!feed.url) continue;

                try {
                    // 1. Fetch iCal Feed with Cache Busting
                    const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                    const response = await fetch(tsUrl, {
                        headers: { 'User-Agent': 'VillaRetiro-Cron-Engine/2.0' }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const icsText = await response.text();
                    const blocks = this.parseIcsToBlocks(icsText, prop.id);
                    
                    // 2. Sync with Bookings table
                    const { inserted, deleted } = await this.syncBlocksWithDb(supabase, prop.id, prop.title, blocks, feed.platform);
                    totalImported += inserted;

                    // Mark success in local array state
                    updatedFeeds[i] = { ...feed, syncStatus: 'success', lastSynced: new Date().toISOString() };
                    
                    let resultMsg = `✅ ${prop.title} (${feed.platform}): Sincronizado.`;
                    if (inserted > 0) resultMsg += ` (+${inserted} nuevos)`;
                    if (deleted > 0) resultMsg += ` (-${deleted} liberados)`;
                    results.push(resultMsg);

                } catch (err: any) {
                    console.error(`[CalendarSyncService] Error for ${prop.title} [${feed.platform}]:`, err.message);
                    updatedFeeds[i] = { ...feed, syncStatus: 'error', lastError: err.message, lastSynced: new Date().toISOString() };
                    results.push(`❌ ${prop.title} (${feed.platform}): Error (${err.message})`);
                }
            }

            // 3. Mark last sync directly to properties JSON
            await supabase.from('properties').update({
                "calendarSync": updatedFeeds
            }).eq('id', prop.id);
        }

        return { total: totalImported, details: results.join('\n') };
    },

    parseIcsToBlocks(icsText: string, propertyId: string) {
        const lines = icsText.split(/\r?\n/);
        let inEvent = false, dtStart = '', dtEnd = '';
        const blocks = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; continue; }
            if (line === 'END:VEVENT' && inEvent) {
                inEvent = false;
                if (dtStart.length >= 8 && dtEnd.length >= 8) {
                    const startRaw = dtStart.replace(/T.*/, '').trim();
                    const endRaw = dtEnd.replace(/T.*/, '').trim();
                    blocks.push({
                        start: `${startRaw.substring(0, 4)}-${startRaw.substring(4, 6)}-${startRaw.substring(6, 8)}`,
                        end: `${endRaw.substring(0, 4)}-${endRaw.substring(4, 6)}-${endRaw.substring(6, 8)}`
                    });
                }
                continue;
            }
            if (inEvent) {
                if (line.startsWith('DTSTART')) dtStart = (line.split(':').pop() || '').trim();
                if (line.startsWith('DTEND')) dtEnd = (line.split(':').pop() || '').trim();
            }
        }
        return blocks;
    },

    async syncBlocksWithDb(supabase: SupabaseClient, propertyId: string, propertyTitle: string, blocks: any[], platform: string) {
        let insertedCount = 0;
        let deletedCount = 0;

        // 1. Fetch current 'external_block' records for this property and platform
        const { data: existing } = await supabase
            .from('bookings')
            .select('id, check_in, check_out')
            .eq('property_id', propertyId)
            .eq('status', 'external_block')
            .eq('source', platform);

        const existingMap = new Map((existing || []).map((b: any) => [`${b.check_in}_${b.check_out}`, b.id]));
        const incomingKeys = new Set(blocks.map(b => `${b.start}_${b.end}`));

        // 2. Identify MISSING blocks (Cancellations in Airbnb/Booking)
        const idsToDelete = (existing || [])
            .filter((b: any) => !incomingKeys.has(`${b.check_in}_${b.check_out}`))
            .map((b: any) => b.id);

        if (idsToDelete.length > 0) {
            const { error: delErr } = await supabase.from('bookings').delete().in('id', idsToDelete);
            if (!delErr) {
                deletedCount = idsToDelete.length;
                console.log(`[CalendarSyncService] Freed ${deletedCount} cancelled dates for ${propertyTitle} [${platform}].`);
            }
        }

        // 3. Identify NEW blocks (New reservations in Airbnb/Booking)
        const toInsert = [];
        for (const block of blocks) {
            const key = `${block.start}_${block.end}`;
            if (!existingMap.has(key)) {
                toInsert.push({
                    property_id: propertyId,
                    status: 'external_block',
                    check_in: block.start,
                    check_out: block.end,
                    source: platform,
                    guests_count: 1,
                    total_price: 0
                });
            }
        }

        if (toInsert.length > 0) {
            const { data, error } = await supabase.from('bookings').insert(toInsert).select();
            if (!error && data) {
                insertedCount = data.length;
                for (const b of data) {
                    await NotificationService.notifyNewReservation(b.id, 'Bloqueo Externo', propertyTitle, b.check_in, b.check_out, '0.00', platform);
                }
            }
        }

        return { inserted: insertedCount, deleted: deletedCount };
    }
};
