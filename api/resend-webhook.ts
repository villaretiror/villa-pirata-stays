import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../src/services/NotificationService.js';

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

        // Solo nos interesan las aperturas y los errores (bounces)
        if (type === 'email.opened' || type === 'email.bounced') {
            const emailId = data.email_id;

            // 1. Buscar quién es el huésped en nuestra tabla de logs
            const { data: logEntry } = await supabase
                .from('email_logs')
                .select('guest_name, subject, booking_id, guest_email')
                .eq('resend_id', emailId)
                .single();

            if (logEntry) {
                // 3. Actualizar log y notificar si es error
                if (type === 'email.opened') {
                    await supabase
                        .from('email_logs')
                        .update({ 
                            status: 'opened', 
                            opened_at: new Date().toISOString() 
                        })
                        .eq('resend_id', emailId);
                } else if (type === 'email.bounced') {
                    await supabase
                        .from('email_logs')
                        .update({ status: 'bounced' })
                        .eq('resend_id', emailId);

                    // 🚨 Alerta Directa al Host
                    await NotificationService.notifyEmailBounce(
                        logEntry.guest_email || "Huésped (Email No Registrado)",
                        logEntry.subject || "Sin Asunto",
                        data.bounce_message || "Rebote Desconocido"
                    );
                }
            }
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error("[Resend Webhook Error]:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
