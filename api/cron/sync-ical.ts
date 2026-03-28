import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../../src/services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || 'salty_cron_2026_secret';

/**
 * 🔱 SALTY SYNC ENGINE (Bunker 6.0)
 * Offloads live iCal fetching to background crons to ensure 
 * Salty responds in <200ms during voice calls.
 */
export default async function handler(req: any, res: any) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 1. ELITE SECURITY GUARD (STRICT CRON_SECRET ONLY)
    const authHeader = req.headers['authorization'];
    const querySecret = req.query?.secret;
    const isCronAuthorized = authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;

    if (!isCronAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: CRON_SECRET Required' });
    }

    const startTime = Date.now();
    const results: any = { 
        status: 'success', 
        synced_properties: 0, 
        synced_blocks: 0, 
        purged: 0,
        errors: [], 
        log: [] 
    };

    try {
        // 2. FETCH ACTIVE PROPERTIES
        const { data: properties, error: propError } = await supabase
            .from('properties')
            .select('id, title, "calendarSync"')
            .eq('is_offline', false);

        if (propError || !properties) throw new Error(`Failed to fetch properties: ${propError?.message}`);

        for (const prop of properties) {
            const feeds = prop.calendarSync || [];
            if (feeds.length === 0) continue;

            for (const feed of feeds) {
                if (!feed.url) continue;

                try {
                    // A. Fetch iCal content (Server-side directly, bypass caching)
                    const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                    const response = await fetch(tsUrl, {
                        headers: { 'User-Agent': 'VillaRetiro-Cron-Engine/4.0' },
                        signal: AbortSignal.timeout(15000)
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status} from ${feed.platform}`);
                    const icsText = await response.text();

                    // B. Parse into blocks
                    const blocks = CalendarSyncService.parseIcsToBlocks(icsText, prop.id);
                    
                    if (blocks.length > 0) {
                        // C. PREPARE SYNCED_BLOCKS DATA
                        const syncedEntries = blocks.map(b => ({
                            property_id: prop.id,
                            check_in: b.start,
                            check_out: b.end,
                            source: feed.platform,
                            sync_hash: b.hash
                        }));

                        // D. ATOMIC TRANSACTION: Replace blocks for this source
                        await supabase
                            .from('synced_blocks')
                            .delete()
                            .eq('property_id', prop.id)
                            .eq('source', feed.platform);

                        const { error: insError } = await supabase
                            .from('synced_blocks')
                            .insert(syncedEntries);

                        if (insError) throw insError;

                        results.synced_blocks += blocks.length;
                        results.log.push(`✅ ${prop.title} (${feed.platform}): Synced ${blocks.length} blocks.`);
                    } else {
                        results.log.push(`ℹ️ ${prop.title} (${feed.platform}): No blocks in current feed.`);
                        await supabase
                            .from('synced_blocks')
                            .delete()
                            .eq('property_id', prop.id)
                            .eq('source', feed.platform);
                    }
                } catch (feedErr: any) {
                    console.error(`[Sync-iCal] Error for ${prop.title} (${feed.platform}):`, feedErr.message);
                    results.errors.push(`${prop.title} (${feed.platform}): ${feedErr.message}`);
                }
            }
            results.synced_properties++;
        }

        // 3. OPTIMIZATION: CLEANUP HISTORICAL DATA (Purge blocks older than yesterday)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { count: purged } = await supabase
            .from('synced_blocks')
            .delete()
            .lt('check_out', yesterday);

        results.purged = purged || 0;
        results.duration_ms = Date.now() - startTime;

        // 4. LOG HEARTBEAT
        const { error: logErr } = await supabase.from('cron_heartbeats').insert({
            task_name: 'sync-ical-v2',
            status: results.errors.length > 0 ? 'partially_failed' : 'success',
            duration_ms: results.duration_ms,
            details: results
        });

        if (logErr) console.error('[Sync-iCal] Failed to log heartbeat:', logErr.message);

        return res.status(200).json(results);

    } catch (globalErr: any) {
        console.error('[Sync-iCal] Global Failure:', globalErr.message);
        return res.status(500).json({ error: globalErr.message });
    }
}
