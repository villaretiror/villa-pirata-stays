import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './NotificationService.js';

export const CalendarSyncService = {
    async syncAll(supabase: SupabaseClient) {
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title, "calendarSync", is_offline')
            .eq('is_offline', false);

        if (error || !properties) {
            console.error('[CalendarSyncService] Error fetching properties:', error);
            return { total: 0, details: 'Error al obtener propiedades.' };
        }

        const reports: string[] = [];
        let totalGlobalImported = 0;

        // 🔱 HYPER-DRIVE SYNC: Parallel property processing
        await Promise.all(properties.map(async (prop) => {
            const feeds: any[] = prop.calendarSync || [];
            if (feeds.length === 0) return;

            const updatedFeeds = [...feeds];
            let propImported = 0;

            // ⚡ PARALLEL FEEDS: Direct sync within the same property
            await Promise.all(feeds.map(async (feed, idx) => {
                if (!feed.url) return;

                try {
                    const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                    const response = await fetch(tsUrl, {
                        headers: { 'User-Agent': 'VillaRetiro-Cron-Engine/3.0' },
                        signal: AbortSignal.timeout(10000) // 10s timeout
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const icsText = await response.text();
                    const blocks = this.parseIcsToBlocks(icsText, prop.id);
                    
                    const { inserted, deleted } = await this.syncBlocksWithDb(supabase, prop.id, prop.title, blocks, feed.platform);
                    propImported += inserted;
                    totalGlobalImported += inserted;

                    updatedFeeds[idx] = { ...feed, syncStatus: 'success', lastSynced: new Date().toISOString() };
                    
                    let msg = `✅ ${prop.title} (${feed.platform}): OK`;
                    if (inserted > 0) msg += ` (+${inserted})`;
                    if (deleted > 0) msg += ` (-${deleted})`;
                    reports.push(msg);

                } catch (err: any) {
                    updatedFeeds[idx] = { ...feed, syncStatus: 'error', lastError: err.message, lastSynced: new Date().toISOString() };
                    reports.push(`❌ ${prop.title} (${feed.platform}): ${err.message}`);
                }
            }));

            // Sync the JSON property back to reflect the new lastSynced status
            await supabase.from('properties').update({ "calendarSync": updatedFeeds }).eq('id', prop.id);
        }));

        // 🛰️ BUNDLE NOTIFICATION: Send one summary instead of 50 alerts
        await NotificationService.notifySyncSummary(totalGlobalImported, reports.join('\n'));

        return { total: totalGlobalImported, details: reports.join('\n') };
    },

    parseIcsToBlocks(icsText: string, propertyId: string) {
        const lines = icsText.split(/\r?\n/);
        let inEvent = false, dtStart = '', dtEnd = '', summary = '', uid = '';
        const blocks = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line === 'BEGIN:VEVENT') { 
                inEvent = true; dtStart = ''; dtEnd = ''; summary = ''; uid = ''; continue; 
            }
            if (line === 'END:VEVENT' && inEvent) {
                inEvent = false;
                if (dtStart.length >= 8 && dtEnd.length >= 8) {
                    const startRaw = dtStart.replace(/T.*/, '').trim();
                    const endRaw = dtEnd.replace(/T.*/, '').trim();
                    const startDate = `${startRaw.substring(0, 4)}-${startRaw.substring(4, 6)}-${startRaw.substring(6, 8)}`;
                    const endDate = `${endRaw.substring(0, 4)}-${endRaw.substring(4, 6)}-${endRaw.substring(6, 8)}`;
                    const eventHash = `${startDate}_${endDate}_${summary}_${uid}`.substring(0, 100);

                    blocks.push({ start: startDate, end: endDate, summary, hash: eventHash });
                }
                continue;
            }
            if (inEvent) {
                if (line.startsWith('DTSTART')) dtStart = (line.split(':').pop() || '').trim();
                if (line.startsWith('DTEND')) dtEnd = (line.split(':').pop() || '').trim();
                if (line.startsWith('SUMMARY')) summary = (line.split(':').pop() || '').trim();
                if (line.startsWith('UID')) uid = (line.split(':').pop() || '').trim();
            }
        }
        return blocks;
    },

    async syncBlocksWithDb(supabase: SupabaseClient, propertyId: string, propertyTitle: string, blocks: any[], platform: string) {
        let insertedCount = 0;
        let deletedCount = 0;
        let updatedCount = 0;

        const { data: existing } = await supabase
            .from('bookings')
            .select('id, check_in, check_out, sync_last_hash')
            .eq('property_id', propertyId)
            .eq('status', 'external_block')
            .eq('source', platform);

        const existingMap = new Map((existing || []).map((b: any) => [`${b.check_in}_${b.check_out}`, b]));
        const incomingKeys = new Set(blocks.map(b => `${b.start}_${b.end}`));

        // 1. Delete expired / cancelled external blocks
        const idsToDelete = (existing || [])
            .filter((b: any) => !incomingKeys.has(`${b.check_in}_${b.check_out}`))
            .map((b: any) => b.id);

        if (idsToDelete.length > 0) {
            const { error: delErr } = await supabase.from('bookings').delete().in('id', idsToDelete);
            if (!delErr) deletedCount = idsToDelete.length;
        }

        // 2. Identify new or changed blocks
        const toInsert = [];
        for (const block of blocks) {
            const key = `${block.start}_${block.end}`;
            const match = existingMap.get(key);

            if (!match) {
                toInsert.push({
                    property_id: propertyId,
                    status: 'external_block',
                    check_in: block.start,
                    check_out: block.end,
                    source: platform,
                    sync_last_hash: block.hash,
                    guests_count: 1,
                    total_price: 0
                });
            } else if (match.sync_last_hash !== block.hash) {
                await supabase.from('bookings').update({ 
                    sync_last_hash: block.hash, 
                    updated_at: new Date().toISOString() 
                }).eq('id', match.id);
                updatedCount++;
            }
        }

        if (toInsert.length > 0) {
            const { data, error } = await supabase.from('bookings').insert(toInsert).select();
            if (!error && data) insertedCount = data.length;
        }

        return { inserted: insertedCount, deleted: deletedCount, updated: updatedCount };
    }
};
