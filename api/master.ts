import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationService } from '../services/NotificationService.js';
import { CalendarSyncService } from '../services/CalendarSyncService.js';

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

        // 1. Sync iCal (Inbound/Outbound Logic)
        if (task === 'sync' || !task) {
            results.summary.sync = await CalendarSyncService.syncAll(supabase);
        }

        // 2. Security Purge
        if (task === 'cleanup' || !task) {
            results.summary.cleanup = await taskCleanup(supabase);
        }

        // 3. Stats for Report
        const activeChatsCount = await countActiveChats(supabase);
        
        // NEW: Weekly Rule Report
        if (task === 'weekly_report') {
            const { data: activeRules } = await supabase
                .from('availability_rules')
                .select('*')
                .gte('end_date', new Date().toISOString().split('T')[0])
                .order('start_date', { ascending: true });
            
            let rulesStr = "No hay reglas especiales activas. Aplicando Mínimos Globales (2 Noches / 2 Días antelación).";
            if (activeRules && activeRules.length > 0) {
                rulesStr = activeRules.map((r: any) => `• Del ${r.start_date} al ${r.end_date}: ${r.min_nights ? `Min ${r.min_nights}N` : 'Sin Min.'} | Antel: ${r.advance_notice_days === 0 ? 'Mismo Día' : `${r.advance_notice_days}D`} | [${r.reason || 'Sin título'}]`).join('\n');
            }
            
            await NotificationService.sendTelegramAlert(`
📊 <b>REPORTE SEMANAL DE REGLAS (LUNES)</b>
━━━━━━━━━━━━━━━━━━━━
Configuración actual del motor de reservas dinámico:

${rulesStr}

Si necesitas modificar algo esta semana, accede al 
<a href="https://www.villaretiror.com/host">Host Dashboard</a>.`);
            
            return res.status(200).json({ status: 'Weekly report sent' });
        }
        
        // 4. STRATEGY: Management by Exception
        // Send "Home Health" Report ONLY at 8:00 AM AST (Morning Brief)
        const prTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Puerto_Rico',
            hour: 'numeric',
            hour12: false
        }).format(new Date());

        const isMorningBrief = parseInt(prTime) === 8;
        const forceReport = req.query?.force === 'true'; // Allow manual force from Telegram

        if (isMorningBrief || forceReport) {
            const syncStatus = results.summary.sync?.total >= 0 ? 'Exitoso (Mantenimiento Silencioso)' : '⚠️ Alerta de Sincronización';
            const syncDetails = results.summary.sync?.details || 'Proceso de fondo ejecutado.';
            
            await NotificationService.notifyHomeHealth({
                syncStatus,
                syncDetails: `📋 Resumen Diario:\n${syncDetails}`,
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
