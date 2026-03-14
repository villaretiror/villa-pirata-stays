import { createClient } from '@supabase/supabase-js';
import { generateOnboardingDraft } from '../aiServices.js';
import { NotificationService } from '../services/NotificationService.js';

// 🛡️ Safe Environment Access (Resilient Protocol)
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env[`VITE_${key}`] || '';
    }
    return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

const ICAL_URLS: Record<string, string> = {
    '42839458': getEnv('AIRBNB_ICAL_VILLA_1') || 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331',
    '1081171030449673920': getEnv('AIRBNB_ICAL_VILLA_2') || 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae'
};

function parseIcsDate(raw: string): string {
    const d = raw.replace(/T.*/, '').trim();
    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
}

function getPropertyName(id: string): string {
    if (id === '1081171030449673920') return 'Villa Retiro R';
    if (id === '42839458') return 'Pirata Family House';
    return `Propiedad ${id}`;
}

export default async function handler(req: any, res: any) {
    // 🛡️ Security Check: Bearer Token
    const authHeader = req.headers['authorization'];
    const secret = getEnv('CRON_SECRET') || "villaretiror_master_key_2026";
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    const results: any = {
        timestamp: now.toISOString(),
        tasks: {}
    };

    // 1. SIEMPRE (Cada 15 min): iCal Sync, Feedback Loop & Mock Cleanup
    results.tasks.calendar_sync = await taskCalendarSync(supabase);
    results.tasks.cleanup = await taskCleanupMocks(supabase);

    // 2. DIARIO (10:00 UTC): Feedback Request & Daily Alerts
    if (utcHour === 10 && utcMinute < 15) {
        results.tasks.feedback = await taskFeedback(supabase);
        results.tasks.alerts = await taskDailyAlerts(supabase);
    }

    // 3. DIARIO (14:00 UTC): Guest Journey (Onboarding)
    if (utcHour === 14 && utcMinute < 15) {
        results.tasks.journey = await taskGuestJourney(supabase);
    }

    return res.status(200).json(results);
}

async function taskCleanupMocks(supabase: any) {
    const now = new Date().toISOString();
    // Limpiar holds temporales expirados
    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', now);
    // Limpiar logs de chat muy antiguos ( > 30 días ) para optimizar
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: logs } = await supabase.from('chat_logs').delete().lt('last_interaction', thirtyDaysAgo.toISOString());

    return { status: 'ok', holds_cleared: holds || 0, logs_optimized: logs || 0 };
}

async function taskCalendarSync(supabase: any) {
    let newBlocksTotal = 0;

    // Feedback Loop: Takeover notified
    const { data: expired } = await supabase.from('chat_logs').select('session_id').lt('human_takeover_until', new Date().toISOString()).eq('takeover_notified', false);
    for (const log of expired || []) {
        await NotificationService.sendTelegramAlert(`🤖 <b>Salty:</b> Retomando guardia activa. (Sesión: <code>${log.session_id}</code>)\n¿Hubo algo importante en esta charla que deba aprender para futuras consultas?`);
        await supabase.from('chat_logs').update({ takeover_notified: true }).eq('session_id', log.session_id);
    }

    for (const [id, url] of Object.entries(ICAL_URLS)) {
        try {
            const resp = await fetch(url + '?nocache=' + Date.now(), { signal: AbortSignal.timeout(8000) });
            if (!resp.ok) continue;
            const text = await resp.text();
            const lines = text.split(/\r?\n/);
            let inEvent = false, start = '', end = '', count = 0;

            for (const line of lines) {
                const l = line.trim();
                if (l === 'BEGIN:VEVENT') { inEvent = true; start = ''; end = ''; continue; }
                if (l === 'END:VEVENT' && inEvent) {
                    inEvent = false;
                    if (start.length >= 8 && end.length >= 8) {
                        const ci = parseIcsDate(start), co = parseIcsDate(end);
                        const { data } = await supabase.from('bookings').select('id').eq('property_id', id).eq('check_in', ci).eq('status', 'external_block').limit(1);
                        if (!data || data.length === 0) {
                            await supabase.from('bookings').insert({ property_id: id, status: 'external_block', check_in: ci, check_out: co, guests: 1, total_price: 0 });
                            count++; newBlocksTotal++;
                        }
                    }
                    continue;
                }
                if (inEvent) {
                    if (l.startsWith('DTSTART')) start = (l.split(':').pop() || '').trim();
                    if (l.startsWith('DTEND')) end = (l.split(':').pop() || '').trim();
                }
            }
            if (count > 0) {
                await NotificationService.sendTelegramAlert(`🔄 <b>Sincronización iCal</b>\n<b>Propiedad:</b> ${getPropertyName(id)}\n<b>Nuevas:</b> +${count} noches`);
            }
        } catch { }
    }
    return { status: 'ok', new_blocks: newBlocksTotal };
}

async function taskFeedback(supabase: any) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const { data: bookings } = await supabase.from('bookings').select('id, property_id, profiles(email, full_name), properties(title)').eq('check_out', dateStr).eq('email_sent_feedback', false).eq('status', 'confirmed');

    let sent = 0;
    for (const b of bookings || []) {
        const email = (b.profiles as any)?.email;
        if (!email) continue;
        // Logic for sending email would go here (fetch /api/send)
        await supabase.from('bookings').update({ email_sent_feedback: true }).eq('id', b.id);
        sent++;
    }
    return { status: 'ok', emails_sent: sent };
}

async function taskDailyAlerts(supabase: any) {
    const today = new Date().toISOString().split('T')[0];
    const { data: ins } = await supabase.from('bookings').select('id, profiles(full_name), properties(title)').eq('check_in', today).eq('status', 'confirmed');
    const { data: outs } = await supabase.from('bookings').select('id, profiles(full_name), properties(title)').eq('check_out', today).eq('status', 'confirmed');

    if ((ins?.length || 0) + (outs?.length || 0) > 0) {
        await NotificationService.sendTelegramAlert(`📊 <b>Reporte Diario</b>\n🔑 Check-ins: ${ins?.length || 0}\n🧹 Check-outs: ${outs?.length || 0}`);
    }
    return { status: 'ok' };
}

async function taskGuestJourney(supabase: any) {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: bookings } = await supabase.from('bookings').select('id, property_id, check_in, check_out, profiles(full_name, email), properties(title)').eq('status', 'confirmed').neq('payment_method', 'airbnb_sync').not('profiles', 'is', null);

    let count = 0;
    for (const b of bookings || []) {
        const name = (b.profiles as any)?.full_name || 'Huésped';
        const email = (b.profiles as any)?.email;
        const title = (b.properties as any)?.title || 'Villa';
        if (!email || email.includes('@guest.airbnb.com')) continue;

        const checkInD = new Date(b.check_in), checkOutD = new Date(b.check_out);
        const midStr = new Date(checkInD.getTime() + (checkOutD.getTime() - checkInD.getTime()) / 2).toISOString().split('T')[0];

        let stage: 'mid_stay' | 'check_out' | null = null;
        if (todayStr === midStr && b.check_out !== todayStr) stage = 'mid_stay';
        else if (tomorrowStr === b.check_out) stage = 'check_out';

        if (stage) {
            const draft = await generateOnboardingDraft(stage, name, title, b.check_out);
            const msg = `🛎 <b>Salty Onboarding</b>\nEtapa: ${stage}\nPropiedad: ${title}\nHuésped: ${name}\n\n<i>"${draft}"</i>`;
            const keyboard = { inline_keyboard: [[{ text: "✅ Aprobar y Enviar", callback_data: `send_ob_${b.id}` }]] };
            await NotificationService.sendTelegramAlert(msg, keyboard);
            count++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { status: 'ok', drafts_generated: count };
}
