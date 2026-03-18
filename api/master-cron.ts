import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationService } from '../services/NotificationService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

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
    const isAuthorized = (secret && authHeader === `Bearer ${secret}`);

    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isAuthorized && req.query?.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { action, task } = req.query;

    if (req.method === 'POST' && action === 'notify') {
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

    if (req.method === 'GET') {
        const now = new Date();
        const results: any = { timestamp: now.toISOString(), tasks: {} };

        if (task === 'cleanup' || !task) {
            results.tasks.cleanup = await taskCleanup(supabase);
        }

        if (task === 'reports') {
            // Future Morning Report would go here.
        }

        return res.status(200).json(results);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function taskCleanup(supabase: SupabaseClient) {
    const expired = new Date(Date.now()).toISOString();
    
    // 1. Fetch expiring leads to notify Host before purging (Observability)
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

    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', expired).is('payment_proof_url', null);
    const { count: pending } = await supabase.from('pending_bookings').delete().eq('status', 'pending_payment').lt('expires_at', expired);
    
    return { status: 'ok', cleaned: (holds || 0) + (pending || 0) };
}
