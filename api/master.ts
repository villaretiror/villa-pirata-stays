import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationService } from '../src/services/NotificationService.js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

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
    const secret = process.env.CRON_SECRET || 'dev_secret_retry';
    const isAuthorized = (secret && authHeader === `Bearer ${secret}`);

    // Allow GET with secret in query for testing or manual triggers from Telegram
    if (!isAuthorized && req.query?.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { action, task } = req.query;

    if (req.method === 'POST' && action === 'notify') {
        const { type, guestName, property, checkIn, checkOut, phone, proofUrl } = req.body;
        try {
            let sent = false;
            if (type === 'new_lead') sent = await NotificationService.notifyNewLead(guestName, property, checkIn, checkOut, phone);
            else if (type === 'payment_proof') sent = await NotificationService.notifyPaymentProof(guestName, property, proofUrl);
            else if (type === 'cohost_action') sent = await NotificationService.notifyCohostAction(req.body.cohost, req.body.property, req.body.action);
            return res.status(200).json({ status: 'ok', sent });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'GET' || (req.method === 'POST' && task)) {
        const results: any = { timestamp: new Date().toISOString(), summary: {} };
        const startTime = Date.now();

        // 1. Task Execution Wrapper for Resilience
        const runTask = async (name: string, fn: () => Promise<any>) => {
            const taskStart = Date.now();
            try {
                const data = await fn();
                results.summary[name] = data;
                await supabase.from('cron_heartbeats').insert({
                    task_name: name,
                    status: 'success',
                    duration_ms: Date.now() - taskStart,
                    details: data
                });
                return data;
            } catch (err: any) {
                console.error(`[Cron Task Error] ${name}:`, err.message);
                results.summary[name] = { status: 'error', error: err.message };
                await supabase.from('cron_heartbeats').insert({
                    task_name: name,
                    status: 'error',
                    duration_ms: Date.now() - taskStart,
                    error_message: err.message
                });
                // Notify if critical
                if (name === 'sync' || name === 'automation') {
                    await NotificationService.sendTelegramAlert(`🔴 🚨 <b>CRON "${name.toUpperCase()}" FAILED</b>\nError: <code>${err.message}</code>`, undefined, false);
                }
            }
        };

        // --- Execution Pipeline ---

        // A. Sync iCal (Modular)
        if (task === 'sync' || !task) {
            await runTask('sync', () => CalendarSyncService.syncAll(supabase));
        }

        // B. Security Purge (Modular)
        if (task === 'cleanup' || !task) {
            await runTask('cleanup', () => taskCleanup(supabase));
        }

        // C. Stats for Report
        const activeChatsCount = await countActiveChats(supabase);
        
        // D. Weekly Rules Report (Periodic)
        if (task === 'weekly_report') {
            await runTask('weekly_report', async () => {
                const { data: activeRules } = await supabase
                    .from('availability_rules')
                    .select('*')
                    .gte('end_date', new Date().toISOString().split('T')[0])
                    .order('start_date', { ascending: true });
                
                let rulesStr = "No hay reglas especiales activas. Aplicando Mínimos Globales.";
                if (activeRules && activeRules.length > 0) {
                    rulesStr = activeRules.map((r: any) => `• Del ${r.start_date} al ${r.end_date}: ${r.min_nights ? `Min ${r.min_nights}N` : 'Sin Min.'} | [${r.reason || 'Salty Rule'}]`).join('\n');
                }
                
                await NotificationService.sendTelegramAlert(`📊 <b>REPORTE SEMANAL DE REGLAS</b>\n\n${rulesStr}`);
                return { rules_count: activeRules?.length || 0 };
            });
        }

        // E. AUTOMATIONS (High Priority)
        if (task === 'automation' || !task) {
            await runTask('automation', async () => {
                const automationResults = { checkins: 0, reviews: 0, recovery: 0 };
                
                // E1. Check-in Instructions (24h)
                const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                const { data: checkinSoon } = await supabase.from('bookings').select('*, profiles(*), properties(*)').eq('check_in', tomorrow).is('instructions_sent_at', null).eq('status', 'confirmed');

                if (checkinSoon) {
                    for (const b of checkinSoon) {
                        await fetch(`${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/api/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'reservation_confirmed',
                                customerName: b.profiles?.full_name || b.customer_name || 'Huésped',
                                customerEmail: b.profiles?.email || b.customer_email || 'reservas@villaretiror.com',
                                propertyName: b.properties?.title || 'Villa Retiro',
                                checkIn: b.check_in,
                                checkOut: b.check_out,
                                accessCode: b.properties?.access_code,
                                wifiName: b.properties?.wifi_name,
                                wifiPass: b.properties?.wifi_pass,
                                propertyId: b.property_id,
                                bookingId: b.id
                            })
                        });
                        await supabase.from('bookings').update({ instructions_sent_at: new Date().toISOString() } as any).eq('id', b.id);
                        automationResults.checkins++;
                    }
                }

                // E2. Review Requests (24h post-checkout)
                const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                const { data: checkoutRecently } = await supabase.from('bookings').select('*, profiles(*), properties(*)').eq('check_out', yesterday).or('email_sent_feedback.is.null,email_sent_feedback.eq.false').eq('status', 'confirmed');

                if (checkoutRecently) {
                    for (const b of checkoutRecently) {
                        await fetch(`${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/api/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'review_request',
                                customerName: b.profiles?.full_name || b.customer_name || 'Huésped',
                                customerEmail: b.profiles?.email || b.customer_email || 'reservas@villaretiror.com',
                                propertyName: b.properties?.title || 'Villa Retiro',
                                propertyId: b.property_id,
                                bookingId: b.id
                            })
                        });
                        await supabase.from('bookings').update({ email_sent_feedback: true } as any).eq('id', b.id);
                        automationResults.reviews++;
                    }
                }

                // E3. SALTY RECOVERY (State-Based: Catch all leaks)
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                const { data: abandonedLeads } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('status', 'new')
                    .filter('tags', 'cs', '{"abandonment"}') 
                    .lt('created_at', twoHoursAgo); // Catch all pending recovery older than 2 hours

                if (abandonedLeads) {
                    for (const lead of abandonedLeads) {
                        const targetPropertyId = lead.tags?.find((t: string) => t === '42839458' || t === '1081171030449673920') || '1081171030449673920';

                        await fetch(`${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/api/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'lead_recovery',
                                customerName: lead.name || 'Viajero',
                                customerEmail: lead.email,
                                propertyId: targetPropertyId
                            })
                        });
                        await supabase.from('leads').update({ status: 'recovered' } as any).eq('id', lead.id);
                        automationResults.recovery++;
                    }
                }

                return automationResults;
            });
        }
        
        // F. HOME HEALTH REPORT (Strategy by Exception)
        const prTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Puerto_Rico', hour: 'numeric', hour12: false }).format(new Date());
        const isMorningBrief = parseInt(prTime) === 8;
        const forceReport = req.query?.force === 'true';

        if (isMorningBrief || forceReport) {
            const syncStatus = results.summary.sync?.total >= 0 ? 'Exitoso' : '⚠️ Alerta';
            await NotificationService.notifyHomeHealth({
                syncStatus,
                syncDetails: results.summary.sync?.details || 'Proceso de sincronización ejecutado.',
                purgedItems: results.summary.cleanup?.total || 0,
                activeLeadsCount: activeChatsCount,
                secret
            });
        }

        return res.status(200).json(results);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function countActiveChats(supabase: SupabaseClient) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await supabase
        .from('chat_logs')
        .select('*', { count: 'exact', head: true })
        .gt('last_interaction', thirtyMinutesAgo);
    return count || 0;
}

async function taskCleanup(supabase: SupabaseClient) {
    const expired = new Date(Date.now()).toISOString();
    let totalCleaned = 0;
    
    // 1. Fetch expiring leads to notify Host before purging
    const { data: expiringLeads } = await supabase.from('pending_bookings').select('*').lt('expires_at', expired);

    if (expiringLeads && expiringLeads.length > 0) {
        for (const lead of expiringLeads) {
            await NotificationService.notifyLeadExpired(
                lead.guest_name || 'Huésped',
                propertyTitles[lead.property_id] || lead.property_id,
                `${humanizeDate(lead.check_in)} al ${humanizeDate(lead.check_out)}`
            );
        }
    }

    // 2. Deletes
    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', expired).is('payment_proof_url', null);
    const { count: pending } = await supabase.from('pending_bookings').delete().eq('status', 'pending_payment').lt('expires_at', expired);

    // 3. Chat Logs Purge (> 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: chatLogs } = await supabase.from('ai_chat_logs').delete().lt('created_at', thirtyDaysAgo);
    
    totalCleaned = (holds || 0) + (pending || 0) + (chatLogs || 0);
    return { status: 'ok', total: totalCleaned };
}
