import { NotificationService } from '../services/NotificationService.js';
import { supabase } from '../lib/supabase.js';
import { Resend } from 'resend';

export const config = {
    runtime: 'edge', // Using Edge Runtime for faster response
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const update = await req.json();

        // Handle Callback Queries (Botones de Telegram)
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            return new Response('OK', { status: 200 });
        }

        // Check if it's a message containing text
        if (!update.message || !update.message.text) {
            return new Response('OK - No message to process', { status: 200 });
        }

        const chatId = update.message.chat.id.toString();
        const text = update.message.text.trim();

        // Validar Chat ID (Seguridad)
        // El principal va a ser process.env.TELEGRAM_CHAT_ID (Padre e Hijo en el mismo grupo, o múltiples)
        const allowedIdsStr = process.env.ALLOWED_TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '2085187904';
        const allowedIds = allowedIdsStr.split(',').map(id => id.trim());

        if (!allowedIds.includes(chatId)) {
            console.warn(`[Telegram Webhook] Mensaje recibido de Chat ID no autorizado: ${chatId}`);
            // Send a warning to the unauthorized user just in case
            await NotificationService.sendDirectTelegramMessage(chatId, "⚠️ *Acceso Denegado*\nEste bot es privado y exclusivo para el equipo administrativo de Villa & Pirata Stays.");
            return new Response('Unauthorized Access', { status: 200 }); // Retornar 200 para que Telegram no reintente
        }

        // Procesar Comando /status
        if (text.startsWith('/status')) {
            await handleStatusCommand(chatId);
        }
        // Procesar RESPUESTAS DEL HOST AL CHAT (Human Takeover)
        else if (update.message.reply_to_message) {
            const repliedText = update.message.reply_to_message.text || '';
            const sessionMatch = repliedText.match(/Sesión:\s*([a-zA-Z0-9-]+)/);

            if (sessionMatch) {
                const sessionId = sessionMatch[1];
                const takeoverDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

                // 1. Silent Mode para Salty (30 mins)
                await supabase.from('chat_logs').update({
                    human_takeover_until: takeoverDate
                }).eq('session_id', sessionId);

                // 2. Insertar en mirror para notificar al Frontend
                await supabase.from('ai_chat_logs').insert({
                    session_id: sessionId,
                    sender: 'host',
                    text: text
                });

                // 3. Confirmar a Telegram
                await NotificationService.sendDirectTelegramMessage(
                    chatId,
                    "✅ <i>Mensaje entregado en la web. Salty ha sido silenciado por 30 mins para esta sesión.</i>"
                );
            }
        }
        else {
            // Ignorar mensajes que no sean comandos para no spamear
        }

        return new Response('OK', { status: 200 });
    } catch (error: any) {
        console.error("[Telegram Webhook] Error interno:", error.message);
        return new Response('Internal Server Error', { status: 500 }); // Podría ser 200 para evitar reintentos, depende
    }
}

async function handleStatusCommand(chatId: string) {
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Obtener Reservas Actuales (Checkins/Checkouts/Activas de Hoy)
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('property_id, check_in, check_out, status')
            .eq('status', 'confirmed')
            .or(`check_in.eq.${today},check_out.eq.${today},and(check_in.lte.${today},check_out.gte.${today})`);

        let checkIns = 0;
        let checkOuts = 0;
        let occupied = 0;

        if (!bookingsError && bookings) {
            for (const b of bookings) {
                if (b.check_in === today) checkIns++;
                if (b.check_out === today) checkOuts++;
                if (b.check_in <= today && b.check_out >= today) occupied++;
            }
        }

        // 2. Obtener Alertas Activas (System Health)
        const { data: health, error: healthError } = await supabase
            .from('system_health')
            .select('status, service')
            .neq('status', 'healthy');

        const pendingAlerts = health ? health.length : 0;
        const alertDetails = pendingAlerts > 0 ? health!.map((h: any) => `• ${h.service}: ${h.status}`).join('\n') : "Ninguna.";

        // 3. Formatear y Enviar Respuesta
        const message = `
📊 <b>Resumen Diario de Villas</b>
📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

🏠 <b>Villas Ocupadas:</b> ${occupied}
🔑 <b>Check-Ins Hoy:</b> ${checkIns}
🧹 <b>Check-Outs Hoy:</b> ${checkOuts}

⚠️ <b>Alertas de Sistema:</b> ${pendingAlerts}
${pendingAlerts > 0 ? alertDetails : '✅ Todo funcionando en orden.'}
`;

        await NotificationService.sendDirectTelegramMessage(chatId, message);
    } catch (err: any) {
        console.error("Error processando comando /status", err);
        await NotificationService.sendDirectTelegramMessage(chatId, "❌ Error obteniendo el reporte de Supabase.");
    }
}

async function handleCallbackQuery(callbackQuery: any) {
    const data = callbackQuery.data; // ex: "send_ob_12345"
    const messageId = callbackQuery.message.message_id;
    const chatId = callbackQuery.message.chat.id;
    const text = callbackQuery.message.text || "";

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

    if (data.startsWith('send_ob_')) {
        const bookingId = data.split('send_ob_')[1];

        // 1. Extraer el borrador del texto del mensaje
        // Asumimos que el mensaje en Telegram tiene el formato: "... \n---\n[BORRADOR]"
        const parts = text.split('---');
        const draftContent = parts.length > 1 ? parts[1].trim() : text;

        // Extraer email del texto si es posible, o usar la DB
        const emailMatch = text.match(/Email:\s*([^\s]+)/);
        let guestEmail = emailMatch ? emailMatch[1] : null;

        if (!guestEmail) {
            // Intentar recuperar de Supabase
            const { data: booking } = await supabase
                .from('bookings')
                .select('profiles(email)')
                .eq('id', bookingId)
                .single();
            guestEmail = (booking?.profiles as any)?.email;
        }

        if (guestEmail && process.env.RESEND_API_KEY) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const fromAddress = 'Salty <reservas@villaretiror.com>';

                await resend.emails.send({
                    from: fromAddress,
                    to: guestEmail,
                    bcc: 'villaretiror@gmail.com',
                    subject: text.includes('Día Medio') ? '🌴 ¿Todo bien en el paraíso?' : '🌅 Instrucciones Importantes para tu Salida',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #4A4A4A; line-height: 1.6;">
                            <p>${draftContent.replace(/\\n/g, '<br/>')}</p>
                            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
                                <p>Villa & Pirata Stays - Cabo Rojo, Puerto Rico</p>
                            </div>
                        </div>
                    `
                });

                // Notificar éxito y eliminar el botón en Telegram
                await fetch(`https://api.telegram.org/bot${telegramToken}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: messageId,
                        text: text + "\n\n✅ <b>¡Enviado exitosamente a ${guestEmail}!</b>",
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: [] } // Quita el teclado
                    })
                });

                await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: callbackQuery.id,
                        text: '✅ Email enviado exitosamente a ' + guestEmail
                    })
                });

            } catch (err: any) {
                console.error("Resend error from Telegram Webhook:", err);
            }
        } else {
            console.error("No email found or missing Resend API KEY");
            await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: callbackQuery.id,
                    text: '❌ ERROR: Faltan datos (Email no encontrado).',
                    show_alert: true
                })
            });
        }
    }
}
