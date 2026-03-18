import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
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

    const propertyChanges = new Map<string, { 
        news: { checkIn: string, checkOut: string, platform: string }[], 
        cancels: number,
        manualBlocks: { checkIn: string, checkOut: string, platform: string }[] 
    }>();

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
            const dbICalMap = new Map<string, string>(
                (dbICalBookings as DbBookingRef[] || []).map(b =>
                    [`${b.check_in}_${b.check_out}_${b.source ?? 'iCal External'}`, b.id]
                )
            );

            const { data: existingBookings } = await supabase
                .from('bookings')
                .select('property_id, check_in, check_out, notified_external_at')
                .eq('property_id', propertyId)
                .neq('status', 'cancelled');

            const existingSet = new Set(
                (existingBookings || []).map(b => `${b.property_id}_${String(b.check_in).split('T')[0]}_${String(b.check_out).split('T')[0]}`)
            );

            const notifiedMap = new Map<string, boolean>(
                (existingBookings || []).map(b => [
                    `${b.property_id}_${String(b.check_in).split('T')[0]}_${String(b.check_out).split('T')[0]}`,
                    !!b.notified_external_at
                ])
            );

            const allBookingsToUpsert: any[] = [];
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
                        if (endDate < oneMonthAgo) continue;

                        const bIn  = new Date(ev.start).toISOString().split('T')[0];
                        const bOut = new Date(ev.end).toISOString().split('T')[0];
                        const icalKey   = `${bIn}_${bOut}_${platform}`;
                        const globalKey = `${propertyId}_${bIn}_${bOut}`;

                        const summary = (ev.summary || '').toLowerCase();
                        const isManualBlock = summary.includes('blocked') || 
                                           summary.includes('manual') || 
                                           summary.includes('unavailable') || 
                                           summary.includes('dueño') ||
                                           summary.includes('closed') ||
                                           (platform === 'Airbnb' && summary === 'airbnb (blocked)');

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
                            is_manual_block: isManualBlock,
                            notified_external_at: !isAlreadyNotified ? new Date().toISOString() : undefined
                        });

                        if (!isAlreadyNotified) {
                            if (!propertyChanges.has(propertyTitle)) {
                                propertyChanges.set(propertyTitle, { news: [], cancels: 0, manualBlocks: [] });
                            }
                            const changeData = propertyChanges.get(propertyTitle)!;
                            if (isManualBlock) {
                                changeData.manualBlocks.push({ checkIn: bIn, checkOut: bOut, platform: platform });
                            } else {
                                changeData.news.push({ checkIn: bIn, checkOut: bOut, platform: platform });
                            }
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
                    processedFeeds.push({ ...feed, syncStatus: 'error', db_error: feedErr.message });
                }
            }

            // ── Step 2: UPSERT active events (BATCHED) ──────────────────────────
            if (allBookingsToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('bookings')
                    .upsert(allBookingsToUpsert, {
                        onConflict: 'property_id,check_in,check_out',
                        ignoreDuplicates: false
                    });

                if (!upsertError) totalSynced += allBookingsToUpsert.length;
                else console.error(`[sync-ical] UPSERT ERROR for ${propertyTitle}:`, upsertError.message);
            }

            // ── Step 3: RECONCILE (Cancellations) ────────────────────────────────────
            const failedPlatforms = new Set(processedFeeds.filter(f => f.syncStatus === 'error').map(f => f.platform || 'iCal External'));
            const ghostBookingIds: string[] = [];

            for (const [icalKey, bookingId] of dbICalMap.entries()) {
                const parts = icalKey.split('_');
                const source = parts.slice(2).join('_');
                if (failedPlatforms.has(source)) continue;
                if (!activeICalKeys.has(icalKey)) ghostBookingIds.push(bookingId);
            }

            if (ghostBookingIds.length > 0) {
                const { error: cancelError } = await supabase
                    .from('bookings')
                    .update({ status: 'cancelled' })
                    .in('id', ghostBookingIds);

                if (!cancelError) {
                    totalCancelled += ghostBookingIds.length;
                    if (!propertyChanges.has(propertyTitle)) {
                        propertyChanges.set(propertyTitle, { news: [], cancels: 0, manualBlocks: [] });
                    }
                    propertyChanges.get(propertyTitle)!.cancels += ghostBookingIds.length;
                }
            }

            await supabase.from('properties').update({ "calendarSync": processedFeeds }).eq('id', propertyId);

            results.push({
                property: propertyTitle,
                feeds: processedFeeds.length,
                bookings_upserted: allBookingsToUpsert.length,
                cancellations_detected: ghostBookingIds.length,
                feeds_detail: processedFeeds.map(f => ({ platform: f.platform, status: f.syncStatus, events: f.events_found ?? 0 }))
            });

        } catch (propErr: any) {
            results.push({ property: prop.title, error: propErr.message });
        }
    }

    // ── STEP 4: FLUSH NOTIFICATION BUFFER (Visual Elite) ───────────────────────────
    if (propertyChanges.size > 0) {
        const humanizeDate = (dateStr: string) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d, 12, 0, 0);
            const formatted = format(date, 'eee d MMM', { locale: es });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        };

        const changeBlocks = Array.from(propertyChanges.entries()).map(([title, data]) => {
            let block = `🏠 <b>${title.toUpperCase()}</b>\n`;
            
            if (data.news.length > 0) {
                block += `✨ <b>Reservas Nuevas:</b>\n`;
                data.news.forEach((n: any) => {
                    block += `• <code>${humanizeDate(n.checkIn)}</code> ➔ <code>${humanizeDate(n.checkOut)}</code> (<i>${n.platform}</i>)\n`;
                });
            }

            if (data.manualBlocks && data.manualBlocks.length > 0) {
                block += `\n⚠️ <b>BLOQUEOS DETECTADOS:</b>\n`;
                data.manualBlocks.forEach((b: any) => {
                    block += `• <code>${humanizeDate(b.checkIn)}</code> ➔ <code>${humanizeDate(b.checkOut)}</code> (<i>${b.platform}</i>)\n`;
                });
                block += `\n<i>Jefe, Airbnb bloqueó estas fechas manualmente. ¿Quieres que las bloquee también en la web directa?</i>\n`;
            }

            if (data.cancels > 0) {
                block += `\n🗑️ <b>Cancelaciones:</b> ${data.cancels} reserva(s) liberada(s).\n`;
            }
            return block;
        });

        const isSilent = req.query?.silent === 'true';

        if (!isSilent) {
            const finalMessage = `🛰️ <b>SALTY STRATEGY | iCal Sync</b>\n───────────────────────\n\n` + 
                                changeBlocks.join('\n\n') + 
                                `\n───────────────────────\n<i>Sincronización Multicanal Completada.</i>`;

            const siteUrl = process.env.VITE_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://villaretiror.com');

            await NotificationService.sendDirectTelegramMessage(process.env.TELEGRAM_CHAT_ID || '', finalMessage, {
                inline_keyboard: [[{ text: '🛰️ Ver en Dashboard', url: `${siteUrl}/host` }]]
            });
        } else {
            // 🤫 SILENT MODE: Only alert for NEW bookings (Sales Alert)
            for (const [title, data] of propertyChanges.entries()) {
                if (data.news.length > 0) {
                    for (const n of data.news) {
                        const shortAlert = `🔔 <b>¡Nueva Reserva!</b>\n🏠 ${title.toUpperCase()} | 📅 ${humanizeDate(n.checkIn)} ➔ ${humanizeDate(n.checkOut)}`;
                        await NotificationService.sendTelegramAlert(shortAlert);
                    }
                }
            }
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
