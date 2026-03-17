import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../../services/NotificationService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// 🔄 DYNAMIC PROPERTY ENGINE: Fetch active iCal feeds from DB
function parseIcsDate(raw: string): string {
    const d = raw.replace(/T.*/, '').trim(); // YYYYMMDD
    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
}

function generateSyncHash(propertyId: string, checkIn: string, checkOut: string, status: string): string {
    const content = `${propertyId}|${checkIn}|${checkOut}|${status}`;
    // Simple base64 "hash" for consistency without heavy crypto in edge
    if (typeof btoa !== 'undefined') return btoa(content);
    return Buffer.from(content).toString('base64');
}

async function getDynamicProperties(supabase: any) {
    const { data, error } = await supabase
        .from('properties')
        .select('id, title, airbnb_url, is_offline');
    
    if (error) {
        console.error('[SYNC_AUTH_ERROR]: Failed to fetch property directory', error);
        return [];
    }

    return (data || []).filter((p: any) => 
        !p.is_offline && 
        p.airbnb_url && 
        p.airbnb_url.trim() !== ''
    );
}

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed', status: 405 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Missing Supabase credentials', status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let totalImported = 0;
    const results: Record<string, any> = {};

    // 1. Fetch Dynamic Directory
    const activeProperties = await getDynamicProperties(supabase);
    if (activeProperties.length === 0) {
        return res.status(200).json({ success: true, message: 'No active properties to sync' });
    }

    // 🤖 FEEDBACK LOOP: Notificar sobre "Human Takeovers" expirados
    try {
        const { data: expiredLogs } = await supabase.from('chat_logs')
            .select('session_id')
            .lt('human_takeover_until', new Date().toISOString())
            .eq('takeover_notified', false);

        if (expiredLogs && expiredLogs.length > 0) {
            const sessions = expiredLogs.map(l => `<code>${l.session_id}</code>`).join(', ');
            await NotificationService.sendTelegramAlert(
                `🤖 <b>Salty: Guardia Activa Recuperada</b>\n\n` +
                `He retomado el control de ${expiredLogs.length} sesiones expiradas:\n${sessions}\n\n` +
                `¿Deseas revisar si hubo aprendizajes en estas charlas?`
            );
            
            const sessionIds = expiredLogs.map(l => l.session_id);
            await supabase.from('chat_logs').update({ takeover_notified: true }).in('session_id', sessionIds);
        }
    } catch (err) {
        console.error("Error comprobando takeover logs", err);
    }

    const syncAlerts: string[] = [];

    for (const prop of activeProperties) {
        const propertyId = prop.id;
        const url = prop.airbnb_url;
        const propertyTitle = prop.title || `Villa ${propertyId}`;

        results[propertyId] = { status: 'skipped', newBlocks: 0 };

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const tsUrl = url + (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
            const response = await fetch(tsUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'VillaRetiro-Calendar-Sync/1.0',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
            clearTimeout(timeout);

            if (!response.ok) {
                results[propertyId] = { status: `http_error_${response.status}`, newBlocks: 0 };
                continue;
            }

            const icsText = await response.text();
            const lines = icsText.split(/\r?\n/);
            let inEvent = false, dtStart = '', dtEnd = '', newBlocks = 0;

            // 1. Pre-fetch all existing external blocks for this property to avoid N+1 queries
            const { data: dbExistingBookings } = await supabase
                .from('bookings')
                .select('id, check_in, check_out, sync_last_hash')
                .eq('property_id', propertyId)
                .eq('status', 'external_block');

            const existingMap = new Map();
            (dbExistingBookings || []).forEach((b: any) => {
                existingMap.set(`${b.check_in}_${b.check_out}`, b);
            });

            const bookingsToInsert = [];
            const bookingsToUpdate = [];

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; continue; }
                if (line === 'END:VEVENT' && inEvent) {
                    inEvent = false;
                    if (dtStart.length >= 8 && dtEnd.length >= 8) {
                        const checkIn = parseIcsDate(dtStart), checkOut = parseIcsDate(dtEnd);
                        const status = 'external_block';
                        const syncHash = generateSyncHash(propertyId, checkIn, checkOut, status);

                        const existing = existingMap.get(`${checkIn}_${checkOut}`);

                        if (!existing) {
                            bookingsToInsert.push({ 
                                property_id: propertyId, 
                                status: status, 
                                check_in: checkIn, 
                                check_out: checkOut, 
                                guests_count: 1, 
                                total_price: 0,
                                source: 'Airbnb',
                                sync_last_hash: syncHash
                            });
                        } else if (existing.sync_last_hash !== syncHash) {
                            bookingsToUpdate.push({
                                id: existing.id,
                                check_in: checkIn,
                                check_out: checkOut,
                                sync_last_hash: syncHash,
                                notified_external_at: null
                            });
                        }
                    }
                    continue;
                }
                if (inEvent) {
                    if (line.startsWith('DTSTART')) dtStart = (line.split(':').pop() || '').trim();
                    if (line.startsWith('DTEND')) dtEnd = (line.split(':').pop() || '').trim();
                }
            }

            // 2. Batch Operations (Atomic & Fast)
            if (bookingsToInsert.length > 0) {
                const { data: inserted, error: insErr } = await supabase.from('bookings').insert(bookingsToInsert).select();
                if (!insErr && inserted) {
                    newBlocks += inserted.length;
                    totalImported += inserted.length;
                    for (const b of inserted) {
                        await NotificationService.notifyNewReservation(b.id, 'Bloqueo Calendario', propertyTitle, b.check_in, b.check_out, '0.00', 'Airbnb', b.sync_last_hash);
                    }
                }
            }

            if (bookingsToUpdate.length > 0) {
                for (const b of bookingsToUpdate) {
                    await supabase.from('bookings').update(b).eq('id', b.id);
                    await NotificationService.notifyNewReservation(b.id, 'Bloqueo Actualizado', propertyTitle, b.check_in, b.check_out, '0.00', 'Airbnb', b.sync_last_hash);
                }
            }

            results[propertyId] = { status: 'synced', newBlocks };
            if (newBlocks > 0) {
                syncAlerts.push(`🏠 <b>${propertyTitle}</b>: +${newBlocks} noches bloqueadas.`);
            }

        } catch (err: any) {
            const isTimeout = err.name === 'AbortError';
            results[propertyId] = { status: isTimeout ? 'timeout' : 'error', message: err.message };
        }
    }

    // Note: notifyNewReservation handles granular alerts now.
    // Legacy generic alert removed to avoid double notification.

    return res.status(200).json({ success: true, totalNewBlocksAdded: totalImported, details: results });
}
