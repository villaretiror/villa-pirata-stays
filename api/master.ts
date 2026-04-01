import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationService } from '../src/services/NotificationService.js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import { MessagingService } from '../src/services/MessagingService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SITE_URL = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';

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

    if (!isAuthorized && req.query?.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { action, task } = req.query;

    /** 
     * 🔱 DYNAMIC CONCIERGE RESOLUTION
     * Fetch all properties to avoid hardcoding titles.
     */
    const { data: properties } = await supabase.from('properties').select('id, title, access_code, wifi_name, wifi_pass, logo_url');
    const propertyMap: Record<string, any> = {};
    (properties || []).forEach(p => propertyMap[String(p.id)] = p);

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

        // 🛡️ Task Wrapper (Modular & Logged)
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
                try {
                    await supabase.from('cron_heartbeats').insert({
                        task_name: name,
                        status: 'error',
                        duration_ms: Date.now() - taskStart,
                        error_message: err.message
                    });
                } catch (e) {
                    console.error('[Cron Heartbeat Logging Failed]:', e);
                }
                
                if (name === 'sync' || name === 'automation') {
                    // 🛡️ HEARTBEAT REDLINE: Check if this is the second consecutive failure
                    const { data: recentFailures } = await supabase
                        .from('cron_heartbeats')
                        .select('status')
                        .eq('task_name', name)
                        .order('created_at', { ascending: false })
                        .limit(2);
                    
                    const isConsecutive = recentFailures && recentFailures.length >= 2 && recentFailures.every(h => h.status === 'error');
                    
                    if (isConsecutive) {
                        await NotificationService.sendTelegramAlert(
                            `🚨 <b>CRITICAL HEARTBEAT FAILURE: ${name.toUpperCase()}</b>\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `⚠️ <b>Estatus:</b> Segundo fallo consecutivo (30 min sin pulso).\n` +
                            `❌ <b>Error:</b> <code>${err.message}</code>\n\n` +
                            `🔱 <i>Acción: Intervención manual requerida de inmediato.</i>`, 
                            undefined, false
                        );
                    } else {
                        // Silent report for the first failure to avoid spam
                        console.warn(`[Cron Warning] First failure for ${name}. Silent mode activated.`);
                    }
                }
            }
        };

        // --- SENTNEL EXECUTION PIPELINE (Parallel for Speed) ---
        const taskPromises = [];

        // A. iCal Sync (Proprietary Vision)
        if (task === 'sync' || !task) {
            taskPromises.push(runTask('sync', () => CalendarSyncService.syncAll(supabase)));
        }

        // B. Maintenance & Cleanup
        if (task === 'cleanup' || !task) {
            taskPromises.push(runTask('cleanup', () => taskCleanup(supabase, propertyMap)));
        }

        // C. Intelligent Automations (Revenue & Hospitalty)
        if (task === 'automation' || !task) {
            taskPromises.push(runTask('automation', async () => {
                const results_auto = { checkins: 0, reviews: 0, recovery: 0 };
                
                // C1. Check-in Instructions (T-Minus 24h)
                const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                const { data: checkinSoon } = await supabase.from('bookings').select('*, profiles(*)').eq('check_in', tomorrow).is('instructions_sent_at', null).eq('status', 'confirmed');

                if (checkinSoon) {
                    for (const b of checkinSoon) {
                        const p = propertyMap[String(b.property_id)];
                        if (p) {
                            await fetch(`${SITE_URL}/api/send`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'reservation_confirmed',
                                    customerName: b.profiles?.full_name || b.customer_name || 'Huésped',
                                    customerEmail: b.profiles?.email || b.customer_email || 'reservas@villaretiror.com',
                                    propertyName: p.title || 'Villa Retiro',
                                    checkIn: b.check_in,
                                    checkOut: b.check_out,
                                    accessCode: p.access_code,
                                    wifiName: p.wifi_name,
                                    wifiPass: p.wifi_pass,
                                    propertyId: b.property_id,
                                    bookingId: b.id,
                                    isAutomation: true // Signal for pre-arrival template
                                })
                            });
                            await supabase.from('bookings').update({ instructions_sent_at: new Date().toISOString() } as any).eq('id', b.id);
                            results_auto.checkins++;
                        }
                    }
                }

                // C2. Review Requests (T-Plus 24h Checkout)
                const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                const { data: guestsCheckedOut } = await supabase.from('bookings').select('*, profiles(*)').eq('check_out', yesterday).or('email_sent_feedback.is.null,email_sent_feedback.eq.false').eq('status', 'confirmed');

                if (guestsCheckedOut) {
                    for (const b of guestsCheckedOut) {
                        const p = propertyMap[String(b.property_id)];
                        await fetch(`${SITE_URL}/api/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'review_request',
                                customerName: b.profiles?.full_name || b.customer_name || 'Huésped',
                                customerEmail: b.profiles?.email || b.customer_email || 'reservas@villaretiror.com',
                                propertyName: p?.title || 'Villa Retiro',
                                propertyId: b.property_id,
                                bookingId: b.id
                            })
                        });
                        await supabase.from('bookings').update({ email_sent_feedback: true } as any).eq('id', b.id);
                        results_auto.reviews++;
                    }
                }

                // C3. SALTY RECOVERY (Cart Recovery: Email + SMS Fallback)
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                const { data: abandonedLeads } = await supabase.from('leads').select('*').eq('status', 'new')
                    .filter('tags', 'cs', '{"abandonment"}').lt('created_at', twoHoursAgo);

                if (abandonedLeads) {
                    for (const lead of abandonedLeads) {
                        const propId = lead.tags?.find((t: string) => propertyMap[t]) || properties?.[0]?.id || '';
                        
                        // Action 1: Recovery Email
                        await fetch(`${SITE_URL}/api/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                type: 'lead_recovery', 
                                customerName: lead.name || 'Viajero', 
                                customerEmail: lead.email, 
                                propertyId: propId 
                            })
                        });

                        // Action 2: Recovery SMS (Dual Strike)
                        if (lead.phone) {
                            await MessagingService.sendSms({
                                to: lead.phone,
                                content: `¡Hola ${lead.name}! Soy Salty. Vi que estabas interesado en una estancia en el paraíso. Te he enviado un correo con los detalles para asegurar tu reserva.`,
                                propertyId: propId
                            });
                        }

                        await supabase.from('leads').update({ status: 'recovered' } as any).eq('id', lead.id);
                        results_auto.recovery++;
                    }
                }

                return results_auto;
            }));
        }

        // D. System Health Check (Sentinel Vision)
        if (task === 'health') {
            return res.status(200).json(await runTask('health', async () => {
                const results_health: any = { status: 'healthy', services: [] };
                const dbStart = Date.now();
                const { error: dbError } = await supabase.from('properties').select('id').limit(1);
                results_health.services.push({ name: 'Supabase_DB', status: dbError ? 'error' : 'healthy', latency: Date.now() - dbStart });
                const { data: recentSyncs } = await supabase.from('cron_heartbeats').select('*').order('created_at', { ascending: false }).limit(5);
                results_health.sync_history = recentSyncs;
                return results_health;
            }));
        }

        // E. Telegram Life Signal (Test Bot)
        if (task === 'test_bot') {
            return res.status(200).json(await runTask('test_bot', async () => {
                const message = `🔱 <b>Prueba de Vida del Búnker</b>\n━━━━━━━━━━━━━━━━━━━━\n🚀 El Sentinel está operativo.\n🛸 <b>Modo:</b> Diagnóstico Manual.\n\n<i>Salty: "Los sistemas de alerta están despejados, mi Capitán."</i>`;
                const sent = await NotificationService.sendTelegramAlert(message, undefined, false);
                return { success: sent, message: sent ? 'Alerta enviada' : 'Fallo en Telegram' };
            }));
        }

        // Final Wait for all background tasks (if global cron)
        if (!task) await Promise.allSettled(taskPromises);

        // --- Weekly Strategy Report ---
        if (task === 'weekly_report') {
            await runTask('weekly_report', async () => {
                const { data: activeRules } = await supabase.from('availability_rules').select('*').gte('end_date', new Date().toISOString().split('T')[0]).order('start_date', { ascending: true });
                let rulesStr = activeRules?.length ? activeRules.map((r: any) => `• ${pMap(r.property_id)}: ${r.start_date} al ${r.end_date} ${r.min_nights ? `[Min ${r.min_nights}N]` : ''}`).join('\n') : "No hay reglas especiales activas.";
                await NotificationService.sendTelegramAlert(`📊 <b>ESTRATEGIA SEMANAL</b>\n\n${rulesStr}`);
                return { rules_count: activeRules?.length || 0 };
            });
        }

        // Helper for summary
        function pMap(id: string) { return propertyMap[id]?.title || id; }

        // --- Home Health Report ---
        const prTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Puerto_Rico', hour: 'numeric', hour12: false }).format(new Date());
        if (parseInt(prTime) === 8 || req.query?.force === 'true') {
            const activeChatsCount = await countActiveChats(supabase);
            await NotificationService.notifyHomeHealth({
                syncStatus: results.summary.sync?.status === 'error' ? '⚠️ Alerta' : 'Exitoso',
                syncDetails: results.summary.sync?.details || 'Proceso de sincronización verificado.',
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
    const { count } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true }).gt('last_interaction', thirtyMinutesAgo);
    return count || 0;
}

async function taskCleanup(supabase: SupabaseClient, propertyMap: Record<string, any>) {
    const expired = new Date(Date.now()).toISOString();
    const { data: expiringLeads } = await supabase.from('pending_bookings').select('*').lt('expires_at', expired);

    if (expiringLeads) {
        for (const lead of expiringLeads) {
            await NotificationService.notifyLeadExpired(lead.guest_name || 'Huésped', propertyMap[lead.property_id]?.title || lead.property_id, `${humanizeDate(lead.check_in)} al ${humanizeDate(lead.check_out)}`);
        }
    }

    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', expired).is('payment_proof_url', null);
    const { count: pending } = await supabase.from('pending_bookings').delete().eq('status', 'pending_payment').lt('expires_at', expired);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: chatLogs } = await supabase.from('ai_chat_logs').delete().lt('created_at', thirtyDaysAgo);
    
    return { status: 'ok', total: (holds || 0) + (pending || 0) + (chatLogs || 0) };
}
