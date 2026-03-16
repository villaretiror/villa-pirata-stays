import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../services/NotificationService.js';

/**
 * 📧 RESEND WEBHOOK HANDLER
 * Escucha eventos de 'email.opened' y notifica al Host vía Telegram.
 */

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const body = req.body;
        const { type, data } = body;

        // Solo nos interesan las aperturas
        if (type === 'email.opened') {
            const emailId = data.email_id;

            // 1. Buscar quién es el huésped en nuestra tabla de logs
            const { data: logEntry } = await supabase
                .from('email_logs')
                .select('guest_name, subject, booking_id')
                .eq('resend_id', emailId)
                .single();

            if (logEntry) {
                // 3. Actualizar log
                await supabase
                    .from('email_logs')
                    .update({ 
                        status: 'opened', 
                        opened_at: new Date().toISOString() 
                    })
                    .eq('resend_id', emailId);
            }
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error("[Resend Webhook Error]:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
