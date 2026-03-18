import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ical from 'node-ical';
import { generateOnboardingDraft } from '../aiServices.js';
import { NotificationService } from '../services/NotificationService.js';

// 🛡️ Safe Environment Access
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env[`VITE_${key}`] || '';
    }
    return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

const propertyTitles: Record<string, string> = {
    "1081171030449673920": "Villa Retiro R",
    "42839458": "Pirata Family House"
};

const humanizeDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const formatted = format(date, 'eee d MMM', { locale: es });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default async function handler(req: any, res: any) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const secret = process.env.CRON_SECRET;
    const queryKey = req.query?.key || req.query?.secret || req.query?.cron_secret;
    const isAuthorized = (secret && authHeader === `Bearer ${secret}`) || (secret && queryKey === secret);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── ACTION BRIDGE (POST) ──
    if (req.method === 'POST') {
        const { action } = req.query;
        if (action === 'notify') {
            const { type, guestName, property, checkIn, checkOut, phone, proofUrl } = req.body;
            try {
                let sent = false;
                if (type === 'new_lead') sent = await NotificationService.notifyNewLead(guestName, property, checkIn, checkOut, phone);
                else if (type === 'payment_proof') sent = await NotificationService.notifyPaymentProof(guestName, property, proofUrl);
                return res.status(200).json({ status: 'ok', sent });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }
        return res.status(405).json({ error: 'Action not allowed' });
    }

    // ── CRON TASKS (GET) ──
    if (req.method === 'GET') {
        if (!isAuthorized) return res.status(401).json({ error: 'Unauthorized' });

        const task = req.query?.task;
        const isSilent = req.query?.silent === 'true';
        const now = new Date();
        const utcHour = now.getUTCHours();
        const results: any = { timestamp: now.toISOString(), tasks: {} };

        // 🎯 Manual / Test triggers
        if (task === 'sync') return res.status(200).json(await taskCalendarSync(supabase, isSilent));
        if (task === 'alerts') return res.status(200).json(await taskDailyAlerts(supabase));
        if (task === 'cleanup') return res.status(200).json(await taskCleanup(supabase));

        // 🕰️ Default Schedule
        results.tasks.sync = await taskCalendarSync(supabase, isSilent);
        results.tasks.cleanup = await taskCleanup(supabase);

        // 12:00 UTC (8:00 AM AST)
        if (utcHour === 12) {
            results.tasks.morning_report = await taskMorningReport(supabase, isSilent);
            results.tasks.journey = await taskGuestJourney(supabase, isSilent);
            results.tasks.alerts = await taskDailyAlerts(supabase);
        }

        // 18:00 UTC+ (2:00 PM AST)
        if (utcHour >= 18) {
            results.tasks.feedback = await taskFeedback(supabase);
            results.tasks.thanks = await taskPostCheckoutThanks(supabase);
        }

        return res.status(200).json(results);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function taskCalendarSync(supabase: any, isSilent = false) {
    const { data: properties } = await supabase.from('properties').select('id, title, "calendarSync"');
    if (!properties) return { status: 'no_properties' };

    let totalSynced = 0;
    const propertyChanges = new Map<string, any>();

    for (const prop of properties) {
        const syncFeeds = Array.isArray(prop.calendarSync) ? prop.calendarSync : [];
        if (syncFeeds.length === 0) continue;

        const activeICalKeys = new Set<string>();
        const processedFeeds = [];
        const upserts = [];

        // Reconciliation: Detect cancelled Airbnb bookings
        const platformFilter = syncFeeds.map((f: any) => `source.eq.${f.platform || 'iCal External'}`).join(',');
        const { data: dbBookings } = await supabase.from('bookings').select('id, check_in, check_out, source').eq('property_id', prop.id).neq('status', 'cancelled').or(platformFilter);
        const dbMap = new Map<string, string>((dbBookings || []).map((b: any) => [`${b.check_in}_${b.check_out}_${b.source}`, b.id]));

        for (const feed of syncFeeds) {
            if (!feed.url) continue;
            try {
                const response = await fetch(feed.url);
                const text = await response.text();
                const parsed = ical.parseICS(text);
                const events = Object.values(parsed).filter((e: any) => e.type === 'VEVENT');

                for (const event of events as any) {
                    if (!event.start || !event.end) continue;
                    const bIn = new Date(event.start).toISOString().split('T')[0];
                    const bOut = new Date(event.end).toISOString().split('T')[0];
                    const platform = feed.platform || 'iCal External';
                    const key = `${bIn}_${bOut}_${platform}`;
                    activeICalKeys.add(key);

                    if (!dbMap.has(key)) {
                        upserts.push({
                            property_id: prop.id, check_in: bIn, check_out: bOut,
                            status: 'confirmed', source: platform, customer_name: event.summary || 'Reserva Externa',
                            is_manual_block: (event.summary || '').toLowerCase().includes('blocked'),
                            notified_external_at: new Date().toISOString()
                        });
                        if (!propertyChanges.has(prop.title)) propertyChanges.set(prop.title, { news: [] });
                        propertyChanges.get(prop.title).news.push({ checkIn: bIn, checkOut: bOut, platform });
                    }
                }
                processedFeeds.push({ ...feed, lastSynced: new Date().toISOString(), syncStatus: 'success' });
            } catch (e) { processedFeeds.push({ ...feed, syncStatus: 'error' }); }
        }

        // Mark missing as cancelled
        const ghostIds = [];
        for (const [key, id] of dbMap.entries()) { if (!activeICalKeys.has(key)) ghostIds.push(id); }
        if (ghostIds.length > 0) await supabase.from('bookings').update({ status: 'cancelled' }).in('id', ghostIds);

        if (upserts.length > 0) {
            await supabase.from('bookings').upsert(upserts, { onConflict: 'property_id,check_in,check_out' });
            totalSynced += upserts.length;
        }
        await supabase.from('properties').update({ "calendarSync": processedFeeds }).eq('id', prop.id);
    }

    if (propertyChanges.size > 0 && !isSilent) {
        let alert = `🛰️ <b>Sincronización Completada</b>\n`;
        for (const [title, data] of propertyChanges.entries()) {
            alert += `\n🏠 <b>${title}</b>\n` + data.news.map((n: any) => `• ${humanizeDate(n.checkIn)} a ${humanizeDate(n.checkOut)} (<i>${n.platform}</i>)`).join('\n');
        }
        await NotificationService.sendTelegramAlert(alert);
    }

    return { status: 'ok', synced: totalSynced };
}

async function taskCleanup(supabase: any) {
    const expired = new Date(Date.now()).toISOString();
    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', expired).is('payment_proof_url', null);
    const { count: pending } = await supabase.from('pending_bookings').delete().eq('status', 'pending_payment').lt('expires_at', expired);
    return { status: 'ok', cleaned: (holds || 0) + (pending || 0) };
}

async function taskMorningReport(supabase: SupabaseClient, isSilent = false) {
    const today = new Date().toISOString().split('T')[0];
    const { data: ins } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_in', today).eq('status', 'confirmed');
    const { data: outs } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_out', today).eq('status', 'confirmed');
    const report = `🛰️ <b>Reporte Diario</b>\n📅 ${humanizeDate(today)}\n\n🔑 Check-ins: ${ins?.length || 0}\n🧹 Check-outs: ${outs?.length || 0}`;
    if (!isSilent) await NotificationService.sendTelegramAlert(report);
    return { status: 'ok' };
}

async function taskDailyAlerts(supabase: any) {
    const today = new Date().toISOString().split('T')[0];
    const { data: bks } = await supabase.from('bookings').select('profiles(full_name), properties(title), check_in, check_out').or(`check_in.eq.${today},check_out.eq.${today}`).eq('status', 'confirmed');
    for (const b of bks || []) {
        const profile = b.profiles as any;
        const property = b.properties as any;
        const name = profile?.full_name || 'Huésped';
        const title = property?.title || 'Villa';
        if (b.check_in === today) await NotificationService.notifyCheckInReminder(name, title, '15:00');
        else await NotificationService.notifyCheckOutAlert(name, title);
    }
    return { status: 'ok', sent: bks?.length || 0 };
}

async function taskGuestJourney(supabase: any, isSilent = false) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const { data: arrivals } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_in', tomorrow).eq('status', 'confirmed');
    for (const a of arrivals || []) {
        const draft = await generateOnboardingDraft('check_in', (a.profiles as any)?.full_name, (a.properties as any)?.title, tomorrow);
        if (!isSilent) await NotificationService.sendTelegramAlert(`🛎 <b>Onboarding Hub</b>\n<i>"${draft}"</i>`);
    }
    return { status: 'ok', drafts: arrivals?.length || 0 };
}

async function taskFeedback(supabase: any) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const { data: bks } = await supabase.from('bookings').select('id').eq('check_out', yesterday).eq('email_sent_feedback', false).eq('status', 'confirmed');
    for (const b of bks || []) await supabase.from('bookings').update({ email_sent_feedback: true }).eq('id', b.id);
    return { status: 'ok', updated: bks?.length || 0 };
}

async function taskPostCheckoutThanks(supabase: any) {
    const today = new Date().toISOString().split('T')[0];
    const { data: bks } = await supabase.from('bookings').select('id').eq('check_out', today).eq('email_sent_thanks', false).eq('status', 'confirmed');
    for (const b of bks || []) await supabase.from('bookings').update({ email_sent_thanks: true }).eq('id', b.id);
    return { status: 'ok', updated: bks?.length || 0 };
}
