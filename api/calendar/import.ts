import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../../services/NotificationService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// URLs reales de Airbnb con fallback embebido
const ICAL_URLS: Record<string, string> = {
    '42839458': process.env.AIRBNB_ICAL_VILLA_1 || 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331',
    '1081171030449673920': process.env.AIRBNB_ICAL_VILLA_2 || 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae'
};

function parseIcsDate(raw: string): string {
    const d = raw.replace(/T.*/, '').trim(); // YYYYMMDD
    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
}

function getPropertyName(id: string): string {
    if (id === '1081171030449673920') return 'Villa Retiro R';
    if (id === '42839458') return 'Pirata Family House';
    return `Propiedad ${id}`;
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

    // 🤖 FEEDBACK LOOP: Notificar sobre "Human Takeovers" expirados (CONSOLIDADO)
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

    for (const [propertyId, url] of Object.entries(ICAL_URLS)) {
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

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; continue; }
                if (line === 'END:VEVENT' && inEvent) {
                    inEvent = false;
                    if (dtStart.length >= 8 && dtEnd.length >= 8) {
                        const checkIn = parseIcsDate(dtStart), checkOut = parseIcsDate(dtEnd);
                        try {
                            const { data: existing } = await supabase.from('bookings').select('id').eq('property_id', propertyId).eq('check_in', checkIn).eq('status', 'external_block').limit(1);
                            if (!existing || existing.length === 0) {
                                const { error: insErr } = await supabase.from('bookings').insert({ property_id: propertyId, status: 'external_block', check_in: checkIn, check_out: checkOut, guests: 1, total_price: 0 });
                                if (!insErr) { newBlocks++; totalImported++; }
                            }
                        } catch (_) {}
                    }
                    continue;
                }
                if (inEvent) {
                    if (line.startsWith('DTSTART')) dtStart = (line.split(':').pop() || '').trim();
                    if (line.startsWith('DTEND')) dtEnd = (line.split(':').pop() || '').trim();
                }
            }

            results[propertyId] = { status: 'synced', newBlocks };
            if (newBlocks > 0) {
                syncAlerts.push(`🏠 <b>${getPropertyName(propertyId)}</b>: +${newBlocks} noches bloqueadas.`);
            }

        } catch (err: any) {
            const isTimeout = err.name === 'AbortError';
            results[propertyId] = { status: isTimeout ? 'timeout' : 'error', message: err.message };
        }
    }

    if (syncAlerts.length > 0) {
        await NotificationService.sendTelegramAlert(
            `🔄 <b>Sync iCal (Legacy): Bloqueos Nuevos</b>\n\n` +
            syncAlerts.join('\n') +
            `\n\n⚡ <i>Calendario actualizado.</i>`
        );
    }

    return res.status(200).json({ success: true, totalNewBlocksAdded: totalImported, details: results });
}
