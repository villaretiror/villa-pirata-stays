import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../../src/services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || 'salty_cron_2026_secret';

/**
 * 🔱 SALTY SYNC ENGINE (Bunker 6.0)
 * Offloads live iCal fetching to background crons to ensure 
 * Salty responds in <200ms during voice calls.
 */
export default async function handler(req: any, res: any) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { secret: querySecret, manual } = req.query;
    const authHeader = req.headers['authorization'];
    
    // 🔱 DUAL-GATE SECURITY (Manual vs Auto)
    let isAuthorized = false;
    let userEmail = 'automated_cron';

    if (manual === 'true') {
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            const ALLOWED_EMAILS = ['villaretiror.pr@gmail.com', 'villaretiror@gmail.com', 'villaretiror.stays@gmail.com'];
            if (user && (ALLOWED_EMAILS.includes(user.email || '') || user.user_metadata?.role === 'host')) {
                isAuthorized = true;
                userEmail = user.email || 'host';
            }
        }
    } else {
        isAuthorized = authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
    }

    if (!isAuthorized) {
        return res.status(401).json({ error: 'Bunker Access Denied: Unauthorized Sync Attempt' });
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
                        headers: { 
                           'User-Agent': 'VillaRetiro-Cron-Engine/4.0',
                           'Cache-Control': 'no-cache, no-store, must-revalidate',
                           'Pragma': 'no-cache',
                           'Expires': '0'
                        },
                        signal: AbortSignal.timeout(15000)
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status} from ${feed.platform}`);
                    const icsText = await response.text();

                    // B. Parse into blocks
                    const blocks = CalendarSyncService.parseIcsToBlocks(icsText, prop.id);
                    
                    if (blocks.length > 0) {
                        // C. ATOMIC VISION (Session-Based Sync): Eliminates 'Ghost Availability' window.
                        const syncSessionId = `sync_${Date.now()}_${feed.platform}`;
                        
                        const syncedEntries = blocks.map(b => ({
                            property_id: prop.id,
                            check_in: b.start,
                            check_out: b.end,
                            source: feed.platform,
                            sync_hash: b.hash,
                            sync_session_id: syncSessionId // Track this specific run
                        }));

                        // 1. UPSERT NEW BLOCKS: Ensure they are in the DB BEFORE deleting old ones.
                        const { error: upsError } = await supabase
                            .from('synced_blocks')
                            .upsert(syncedEntries, { onConflict: 'sync_hash' });

                        if (upsError) throw new Error(`Atomic Upsert failed: ${upsError.message}`);

                        // 2. PURGE STALE BLOCKS: Delete only those not part of this session.
                        const { error: purgeError } = await supabase
                            .from('synced_blocks')
                            .delete()
                            .eq('property_id', prop.id)
                            .eq('source', feed.platform)
                            .neq('sync_session_id', syncSessionId);

                        if (purgeError) console.warn(`[Sync-iCal] Non-critical purge failure: ${purgeError.message}`);

                        results.synced_blocks += blocks.length;
                        results.log.push(`✅ ${prop.title} (${feed.platform}): Synced ${blocks.length} blocks with Atomic Vision.`);

                        // 🔱 DASHBOARD SYNC (Metadatos en Caliente)
                        const { data: updatedProp } = await supabase.from('properties').select('calendarSync').eq('id', prop.id).single();
                        const feeds = (updatedProp?.calendarSync || []).map((f: any) => {
                            if (f.platform === feed.platform) return { ...f, lastSynced: new Date().toISOString(), syncStatus: 'success', events_found: blocks.length };
                            return f;
                        });
                        await supabase.from('properties').update({ calendarSync: feeds, updated_at: new Date().toISOString() }).eq('id', prop.id);

                    } else {
                        // Fail-safe check
                        const { count } = await supabase.from('synced_blocks').select('*', { count: 'exact', head: true }).eq('property_id', prop.id).eq('source', feed.platform);
                        if ((count || 0) > 0) results.log.push(`⚠️ ${prop.title} (${feed.platform}): Feed empty. Prot. Shield.`);
                    }
                } catch (feedErr: any) {
                    console.error(`[Sync-iCal] Error for ${prop.title} (${feed.platform}):`, feedErr.message);
                    results.errors.push(`${prop.title} (${feed.platform}): ${feedErr.message}`);
                    const { data: updatedProp } = await supabase.from('properties').select('calendarSync').eq('id', prop.id).single();
                    const feeds = (updatedProp?.calendarSync || []).map((f: any) => {
                        if (f.platform === feed.platform) return { ...f, syncStatus: 'error', lastError: feedErr.message };
                        return f;
                    });
                    await supabase.from('properties').update({ calendarSync: feeds }).eq('id', prop.id);
                }
            }
            results.synced_properties++;
        }

        // 3. STORAGE OPTIMIZATION: HISTORICAL CLEANUP (Bunker 6.0)
        // Description: Purge técnico de bloques caducados (>30 días) para mantener el motor ligero.
        // OJO: Bookings (historial de ventas) se mantiene intacto.
        const cleanupThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { count: purged, error: purgeErr } = await supabase
            .from('synced_blocks')
            .delete({ count: 'exact' })
            .lt('check_out', cleanupThreshold);

        if (purgeErr) {
            console.error('[Sync-iCal] Cleanup Failure:', purgeErr.message);
            results.errors.push(`Cleanup Failed: ${purgeErr.message}`);
        } else {
            results.purged = purged || 0;
            results.log.push(`🧹 CLEANUP: Eliminados ${results.purged} bloques caducados (>30d).`);
        }

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
