import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../../src/services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * 🔱 HOST MANUAL SYNC (Panic Button)
 * Dedicated endpoint for authenticated hosts to force a re-sync
 * of all property calendars from the dashboard.
 */
export default async function handler(req: any, res: any) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 🛡️ SECURITY: Session Token Required for Manual Trigger
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Bunker Access Denied: Missing Session Token' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || (user.email !== 'villaretiror.pr@gmail.com' && user.user_metadata?.role !== 'host' && user.user_metadata?.role !== 'admin')) {
        return res.status(403).json({ error: 'Unauthorized: Only Captains can trigger manual sync. ⚓' });
    }

    const startTime = Date.now();
    const results: any = { status: 'success', synced_blocks: 0, log: [] };

    try {
        const { data: properties, error: propError } = await supabase
            .from('properties')
            .select('id, title, "calendarSync"')
            .eq('is_offline', false);

        if (propError || !properties) throw new Error(`Failed to fetch properties: ${propError?.message}`);

        for (const prop of properties) {
            const feeds = prop.calendarSync || [];
            for (const feed of feeds) {
                if (!feed.url) continue;
                try {
                    // Force cache bypass with timestamp
                    const response = await fetch(`${feed.url}${feed.url.includes('?') ? '&' : '?'}nocache=${Date.now()}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const icsText = await response.text();
                    
                    const blocks = CalendarSyncService.parseIcsToBlocks(icsText, prop.id);
                    if (blocks.length > 0) {
                        const syncSessionId = `manual_sync_${Date.now()}_${feed.platform}`;
                        
                        const syncedEntries = blocks.map(b => ({
                            property_id: prop.id,
                            check_in: b.start,
                            check_out: b.end,
                            source: feed.platform,
                            sync_hash: b.hash,
                            sync_session_id: syncSessionId
                        }));

                        // 🔱 ATOMIC UPSERT: Keep the old ones until the new ones are in.
                        const { error: upsError } = await supabase.from('synced_blocks').upsert(syncedEntries, { onConflict: 'sync_hash' });
                        if (upsError) throw upsError;

                        // 🧹 SCOPED PURGE: Delete only what NO LONGER exists in this platform's feed
                        await supabase.from('synced_blocks')
                           .delete()
                           .eq('property_id', prop.id)
                           .eq('source', feed.platform)
                           .neq('sync_session_id', syncSessionId);

                        results.synced_blocks += blocks.length;
                    }
                } catch (e: any) {
                    results.log.push(`Error in ${prop.title} (${feed.platform}): ${e.message}`);
                }
            }
        }

        results.duration_ms = Date.now() - startTime;
        
        // Log manual sync heartbeat
        await supabase.from('cron_heartbeats').insert({
            task_name: 'manual_sync',
            status: 'success',
            duration_ms: results.duration_ms,
            details: { trigger_by: user.email, ...results }
        });

        return res.status(200).json(results);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
