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

        await Promise.all(properties.map(async (prop) => {
            const feeds: any[] = prop.calendarSync || [];
            if (feeds.length === 0) return;

            const updatedFeeds = [...feeds];
            let propImported = 0;

            await Promise.all(feeds.map(async (feed, idx) => {
                if (!feed.url) return;

                try {
                    const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                    const response = await fetch(tsUrl, {
                        headers: { 'User-Agent': 'VillaRetiro-Cron-Engine/3.0' },
                        signal: AbortSignal.timeout(10000)
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const icsText = await response.text();

                    // 🛡️ CIRCUIT BREAKER: Evitar wipes catastróficos si el feed externo falla o viene vacío
                    const linesCount = icsText.split(/\r?\n/).length;
                    if (linesCount < 10 || !icsText.includes('BEGIN:VCALENDAR')) {
                        throw new Error(`Feed malformado (${linesCount} líneas). Abortando sync para proteger datos existentes.`);
                    }

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

            await supabase.from('properties').update({ "calendarSync": updatedFeeds }).eq('id', prop.id);
        }));

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

                // 🛡️ ICAL PRECISION PARSER: Manejo explícito de hora UTC hacia AST
                const processICalDate = (raw: string) => {
                    if (raw.includes('T')) {
                        const dt = raw.trim();
                        if (dt.length >= 15) {
                            const isoStr = `${dt.substring(0,4)}-${dt.substring(4,6)}-${dt.substring(6,8)}T${dt.substring(9,11)}:${dt.substring(11,13)}:${dt.substring(13,15)}Z`;
                            const dateObj = new Date(isoStr);
                            if (!isNaN(dateObj.getTime())) {
                                // Forzamos PR Time (UTC - 4)
                                const prTime = new Date(dateObj.getTime() + (3600000 * -4));
                                const y = prTime.getUTCFullYear();
                                const m = String(prTime.getUTCMonth() + 1).padStart(2, '0');
                                const d = String(prTime.getUTCDate()).padStart(2, '0');
                                return `${y}-${m}-${d}`;
                            }
                        }
                    }
                    const dateOnly = raw.replace(/T.*/, '').trim();
                    return `${dateOnly.substring(0, 4)}-${dateOnly.substring(4, 6)}-${dateOnly.substring(6, 8)}`;
                };

                if (dtStart.length >= 8 && dtEnd.length >= 8) {
                    const startDate = processICalDate(dtStart);
                    const endDate = processICalDate(dtEnd);
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

        const idsToDelete = (existing || [])
            .filter((b: any) => !incomingKeys.has(`${b.check_in}_${b.check_out}`))
            .map((b: any) => b.id);

        if (idsToDelete.length > 0) {
            const { error: delErr } = await supabase.from('bookings').delete().in('id', idsToDelete);
            if (!delErr) deletedCount = idsToDelete.length;
        }

        const toInsert = [];
        for (const block of blocks) {
            const key = `${block.start}_${block.end}`;
            const match = existingMap.get(key);

            // 🔱 ELITE HEURISTIC: Detect if it's a real booking or just a block
            const summary = (block.summary || '').trim();
            const lowerSummary = summary.toLowerCase();
            
            // Standard AirBnB/Booking.com reserved markers
            const isRealBooking = lowerSummary.includes('reserved') || 
                                  lowerSummary.includes('hm') || 
                                  lowerSummary.includes('reservation');
            
            const isManual = !isRealBooking;
            const displayLabel = isRealBooking ? 'Reserva Externa' : (summary || 'Bloqueo Administrativo');

            if (!match) {
                toInsert.push({
                    property_id: propertyId,
                    status: 'external_block',
                    check_in: block.start,
                    check_out: block.end,
                    source: platform,
                    sync_last_hash: block.hash,
                    guests_count: 1,
                    total_price: 0,
                    is_manual_block: isManual,
                    customer_name: displayLabel
                });
            } else if (match.sync_last_hash !== block.hash) {
                await supabase.from('bookings').update({ 
                    sync_last_hash: block.hash, 
                    is_manual_block: isManual,
                    customer_name: displayLabel,
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
    },

    async getBlockedDatesFromUrl(url: string): Promise<string[]> {
        try {
            const isFrontend = typeof window !== 'undefined';
            const fetchUrl = isFrontend 
                ? `/api/calendar/export?url=${encodeURIComponent(url)}`
                : url;

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("Fetch failed");
            
            let icsText = '';
            if (isFrontend) {
                const data = await response.json();
                icsText = data.contents;
            } else {
                icsText = await response.text();
            }

            const blocks = this.parseIcsToBlocks(icsText, 'preview');
            const days: string[] = [];
            
            for (const b of blocks) {
                const current = new Date(`${b.start}T12:00:00`);
                const end = new Date(`${b.end}T12:00:00`);
                while (current < end) {
                    days.push(current.toISOString().split('T')[0]);
                    current.setDate(current.getDate() + 1);
                }
            }
            return Array.from(new Set(days));
        } catch (error: any) {
            console.error('[CalendarSyncService] getBlockedDates Error:', error.message);
            return [];
        }
    }
};
