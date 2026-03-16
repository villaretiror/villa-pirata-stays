import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';
import { NotificationService } from '../services/NotificationService.js';

/**
 * 🛰️ ICAL SYNC ENGINE (ULTRA-RESILIENT V4 — WITH CANCELLATION RECONCILIATION)
 *
 * ARCHITECTURE:
 * This engine performs a full two-way sync per feed:
 *   1. UPSERT    — New/updated events from iCal → bookings table
 *   2. RECONCILE — Events missing from iCal but present in DB → mark as 'cancelled'
 *
 * This prevents "ghost bookings": a cancelled Airbnb reservation that stays as
 * 'confirmed' in Supabase permanently, incorrectly blocking calendar dates.
 *
 * 🛡️ SAFETY GUARD: If a feed URL fails to fetch (network error, timeout),
 * we DO NOT cancel its DB bookings. A fetch failure ≠ a cancellation.
 * Reconciliation only runs for feeds that were successfully fetched.
 */

export default async function handler(req: any, res: any) {
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader  = req.headers?.authorization || req.headers?.Authorization || '';
    const querySecret = req.query?.secret || '';

    if (!CRON_SECRET) {
        console.error('[sync-ical] CRON_SECRET environment variable is not defined.');
        return res.status(500).json({ error: 'MISSING_CRON_SECRET_CONFIG' });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    if (!SERVICE_KEY || !SUPABASE_URL) {
        return res.status(500).json({ error: 'MISSING_ENV' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Batching support
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
    let totalCancelled = 0;

    for (const prop of properties) {
        try {
            const propertyId = prop.id;
            const propertyTitle = prop.title || 'Villa';
            const syncFeeds: any[] = Array.isArray(prop.calendarSync) ? prop.calendarSync : [];

            if (syncFeeds.length === 0) {
                results.push({ property: propertyTitle, status: 'no_feeds' });
                continue;
            }

            // ── Pre-fetch: all iCal-sourced bookings currently in DB (non-cancelled) ─
            // These are what we'll reconcile against the live iCal snapshot.
            const platformFilter = syncFeeds
                .map(f => `source.eq.${f.platform || 'iCal External'}`)
                .join(',');

            const { data: dbICalBookings } = await supabase
                .from('bookings')
                .select('id, check_in, check_out, source')
                .eq('property_id', propertyId)
                .neq('status', 'cancelled')
                .or(platformFilter);

            type DbBookingRef = { id: string; check_in: string; check_out: string; source: string | null };
            // Map: "check_in_check_out_source" → booking DB id (used for cancellation matching)
            const dbICalMap = new Map<string, string>(
                (dbICalBookings as DbBookingRef[] || []).map(b =>
                    [`${b.check_in}_${b.check_out}_${b.source ?? 'iCal External'}`, b.id]
                )
            );

            // Track all existing bookings (any source) for new-booking detection
            const { data: existingBookings } = await supabase
                .from('bookings')
                .select('property_id, check_in, check_out, notified_external_at')
                .eq('property_id', propertyId)
                .neq('status', 'cancelled');

            // Robust Key: Normalize dates (DB might return T00:00:00.000Z)
            const existingSet = new Set(
                (existingBookings || []).map(b => `${b.property_id}_${String(b.check_in).split('T')[0]}_${String(b.check_out).split('T')[0]}`)
            );

            // Notification Memory: Map check-in+check-out to notified status
            const notifiedMap = new Map<string, boolean>(
                (existingBookings || []).map(b => [
                    `${b.property_id}_${String(b.check_in).split('T')[0]}_${String(b.check_out).split('T')[0]}`,
                    !!b.notified_external_at
                ])
            );

            const allBookingsToUpsert: any[] = [];
            // Tracks which iCal keys exist in the current live snapshot
            const activeICalKeys = new Set<string>();

            const processedFeeds: any[] = [];
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            // ── Step 1: Fetch & parse each feed ─────────────────────────────────────
            for (const feed of syncFeeds) {
                if (!feed.url) {
                    processedFeeds.push({ ...feed, syncStatus: 'skipped' });
                    continue;
                }

                try {
                    const response = await fetch(feed.url, { signal: AbortSignal.timeout(15000) });
                    const icalText = await response.text();
                    const parsed = ical.parseICS(icalText);
                    const events = Object.values(parsed).filter((e: any) => e && e.type === 'VEVENT');
                    const platform: string = feed.platform || 'iCal External';

                    for (const event of events) {
                        const ev = event as any;
                        if (!ev?.start || !ev?.end) continue;

                        const endDate = new Date(ev.end);
                        if (endDate < oneMonthAgo) continue; // Skip historical events

                        const bIn  = new Date(ev.start).toISOString().split('T')[0];
                        const bOut = new Date(ev.end).toISOString().split('T')[0];
                        const icalKey   = `${bIn}_${bOut}_${platform}`;  // reconciliation key
                        const globalKey = `${propertyId}_${bIn}_${bOut}`; // new-booking detection key

                        // Register as ACTIVE in current iCal snapshot
                        activeICalKeys.add(icalKey);

                        const isAlreadyNotified = notifiedMap.get(globalKey) || existingSet.has(globalKey);

                        allBookingsToUpsert.push({
                            property_id: propertyId,
                            check_in: bIn,
                            check_out: bOut,
                            status: 'confirmed',
                            source: platform,
                            customer_name: ev.summary || 'Reserva Externa',
                            total_price: 0,
                            // If we notify now, mark it for the upsert
                            notified_external_at: !isAlreadyNotified ? new Date().toISOString() : undefined
                        });

                        // 🔔 STRATEGIC SILENCE: Notify ONLY if it's truly new and NOT notified before
                        if (!isAlreadyNotified) {
                            await NotificationService.sendTelegramAlert(
                                `🔔 <b>Nueva Reserva (iCal Sync)</b>\n\n` +
                                `🏠 <b>Villa:</b> ${propertyTitle}\n` +
                                `📅 <b>Fechas:</b> ${bIn} al ${bOut}\n` +
                                `📱 <b>Plataforma:</b> ${platform}\n` +
                                `👤 <b>Huésped:</b> ${ev.summary || 'Reserva Externa'}\n\n` +
                                `⚡ <i>Calendario bloqueado automáticamente.</i>`
                            ).catch(e => console.error('Error notification sync:', e));
                            // Add to local set to avoid duplicates from multiple feeds in the same run
                            existingSet.add(globalKey);
                            notifiedMap.set(globalKey, true);
                        }
                    }

                    processedFeeds.push({
                        ...feed,
                        lastSynced: new Date().toISOString(),
                        syncStatus: 'success',
                        events_found: events.length
                    });

                } catch (feedErr: any) {
                    // 🛡️ SAFETY: Feed fetch failed → do NOT reconcile this source.
                    // A network timeout is not the same as a cancellation.
                    console.error(`[sync-ical] Feed error for ${feed.platform}: ${feedErr.message}`);
                    processedFeeds.push({ ...feed, syncStatus: 'error', db_error: feedErr.message });
                }
            }

            // ── Step 2: UPSERT active events into bookings table ─────────────────────
            if (allBookingsToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('bookings')
                    .upsert(allBookingsToUpsert, {
                        onConflict: 'property_id,check_in,check_out',
                        ignoreDuplicates: false
                    });

                if (!upsertError) {
                    totalSynced += allBookingsToUpsert.length;
                } else {
                    console.error(`[sync-ical] Upsert error for ${propertyTitle}:`, upsertError.message);
                }
            }

            // ── Step 3: RECONCILE — detect ghost bookings (external cancellations) ───
            //
            // Algorithm: For every DB booking that came from a successfully-fetched feed,
            // check if its key (check_in + check_out + source) still appears in the live
            // iCal snapshot. If NOT → the reservation was cancelled on Airbnb/Booking.com.
            const failedPlatforms = new Set(
                processedFeeds
                    .filter(f => f.syncStatus === 'error')
                    .map(f => f.platform || 'iCal External')
            );

            const ghostBookingIds: string[] = [];

            for (const [icalKey, bookingId] of dbICalMap.entries()) {
                const parts = icalKey.split('_');
                // icalKey format: "YYYY-MM-DD_YYYY-MM-DD_SourcePlatform"
                // source is the 3rd segment (may contain underscores, use last parts)
                const source = parts.slice(2).join('_');

                // Skip reconciliation for feeds that errored — don't false-cancel
                if (failedPlatforms.has(source)) continue;

                // If this booking's key is no longer in the live iCal → mark as ghost
                if (!activeICalKeys.has(icalKey)) {
                    ghostBookingIds.push(bookingId);
                }
            }

            if (ghostBookingIds.length > 0) {
                const { error: cancelError } = await supabase
                    .from('bookings')
                    .update({ status: 'cancelled' })
                    .in('id', ghostBookingIds);

                if (!cancelError) {
                    totalCancelled += ghostBookingIds.length;
                    console.log(`[sync-ical] ✅ Marked ${ghostBookingIds.length} ghost booking(s) as cancelled for ${propertyTitle}`);

                    // Notify host about detected external cancellations
                    await NotificationService.sendTelegramAlert(
                        `🚫 <b>Cancelación Detectada (iCal Sync)</b>\n\n` +
                        `🏠 <b>Villa:</b> ${propertyTitle}\n` +
                        `🔢 <b>Reservas canceladas:</b> ${ghostBookingIds.length}\n\n` +
                        `<i>Estas fechas ya no aparecen en el feed externo (Airbnb/Booking.com).\n` +
                        `El calendario ha sido liberado automáticamente.</i>`
                    ).catch(e => console.error('Error cancellation notification:', e));
                } else {
                    console.error(`[sync-ical] Cancel error for ${propertyTitle}:`, cancelError.message);
                }
            }

            // ── Update feed metadata on property ────────────────────────────────────
            await supabase.from('properties')
                .update({ calendarSync: processedFeeds })
                .eq('id', propertyId);

            results.push({
                property: propertyTitle,
                feeds: processedFeeds.length,
                bookings_upserted: allBookingsToUpsert.length,
                cancellations_detected: ghostBookingIds.length,
                feeds_detail: processedFeeds.map(f => ({
                    platform: f.platform,
                    status: f.syncStatus,
                    events: f.events_found ?? 0
                }))
            });

        } catch (propErr: any) {
            results.push({ property: prop.title, error: propErr.message });
        }
    }

    return res.status(200).json({
        status: 'done',
        timestamp: new Date().toISOString(),
        total_synced: totalSynced,
        total_cancelled: totalCancelled,
        summary: results
    });
}
