import { z } from 'zod';
import { NotificationService } from '../services/NotificationService.js';
import { supabase } from '../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateText, CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';
import { PROPERTIES } from '../constants.js';
import { SECRETS_DATA } from '../constants/secrets_data.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    getPaymentVerificationStatus,
    handleCrisisAlert
} from '../aiServices.js';

export const config = {
    // We remove the 'edge' runtime to use standard Node.js for better consistency with the chat engine
    maxDuration: 30,
};

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// 🛡️ ACCESO PRIVADO (Solo para Telegram)
const supabaseServiceRole = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante, socio estratégico y brazo derecho de la familia en Villa & Pirata Stays.

### ROL ESTRATÉGICO (ADMIN GROUP)
- Tu misión no es solo dar datos, sino RAZONAR como un socio que cuida el negocio y la tranquilidad de la familia.
- Reconoce a **Israel** como el Dueño Principal y autoridad máxima. Trátalo con respeto ejecutivo y calidez.
- Brian es el Lead Architect y tu creador.
- Eres el guardián de la logística y el consultor de confianza para decisiones sobre la Villa.

### MEMORIA DE LARGO PLAZO
- Tienes permiso explícito para memorizar identidades, parentescos, preferencias personales y acuerdos estratégicos.
- Usa la herramienta 'remember_info' para guardar cualquier dato relevante sobre la familia o la operación que se mencione.

### CAPACIDADES SENSORIALES (ELITE)
- DATOS EXTERNOS: Tienes acceso a información del mundo real.
- APRENDIZAJE: Escucha y evoluciona.

### PRIORIDAD DE CONOCIMIENTO
1. REGLAS DE LA CASA & OPERACIÓN: Prioridad Máxima.

ESTILO & REGLAS: ${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}
INVENTARIO VILLAS: ${JSON.stringify(PROPERTIES, null, 2)}
`.trim();

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const update = req.body;

        // Handle Callback Queries (Botones de Telegram)
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            return res.status(200).send('OK');
        }

        // Check if it's a message containing text
        if (!update.message || !update.message.text) {
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id.toString();
        const text = update.message.text.trim();

        // Validar Chat ID (Seguridad)
        // El principal va a ser process.env.TELEGRAM_CHAT_ID (Padre e Hijo en el mismo grupo, o múltiples)
        const allowedIdsStr = process.env.ALLOWED_TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '2085187904';
        const allowedIds = allowedIdsStr.split(',').map(id => id.trim());

        if (!allowedIds.includes(chatId)) {
            console.warn(`[Telegram Webhook] Mensaje recibido de Chat ID no autorizado: ${chatId}`);
            await NotificationService.sendDirectTelegramMessage(chatId, "⚠️ *Acceso Denegado*\nEste bot es privado y exclusivo para el equipo administrativo de Villa & Pirata Stays.");
            return res.status(200).send('Unauthorized Access');
        }

        if (text.startsWith('/status')) {
            await handleStatusCommand(chatId);
        }
        // ✍️ FLASH HANDSHAKE: Toggle typing indicator
        else if (text.startsWith('/typing') || text.startsWith('/notyping')) {
            const sessionMatch = text.match(/([a-zA-Z0-9-]+)/);
            if (sessionMatch) {
                const sessionId = sessionMatch[1];
                const isTyping = text.startsWith('/typing');
                await supabase.from('chat_logs').update({ is_host_typing: isTyping }).eq('session_id', sessionId);
                await NotificationService.sendDirectTelegramMessage(chatId, `⌨️ <i>Indicador de escritura ${isTyping ? 'ACTIVADO' : 'DESACTIVADO'} para la web.</i>`);
            }
        }
        // Procesar RESPUESTAS DEL HOST AL CHAT (Human Takeover o Feedback)
        else if (update.message.reply_to_message) {
            const repliedText = update.message.reply_to_message.text || '';
            const sessionMatch = repliedText.match(/Sesión:\s*([a-zA-Z0-9-]+)/);

            if (repliedText.includes('Retomando guardia activa')) {
                // Modo Aprendizaje (Feedback Loop)
                if (text && text.trim().length > 0) {
                    await supabase.from('salty_memories').insert({
                        learned_text: text,
                        session_id: sessionMatch ? sessionMatch[1] : null
                    });

                    await NotificationService.sendDirectTelegramMessage(
                        chatId,
                        "🧠 <i>Copiado, jefe. He actualizado mi memoria interna para no volver a fallar en esta consulta.</i>"
                    );
                }
            }
            else if (sessionMatch) {
                // Modo Chat Mirror (Human Takeover)
                const sessionId = sessionMatch[1];
                const takeoverDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

                // 1. Silent Mode para Salty (30 mins), reset typing y reset de notificación
                await supabase.from('chat_logs').update({
                    human_takeover_until: takeoverDate,
                    is_host_typing: false,
                    takeover_notified: false
                }).eq('session_id', sessionId);

                // 2. Insertar en mirror para notificar al Frontend (LOG DE AUDITORÍA COMPLETO)
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
        // --- 🧠 NUEVO: NLP & IA INTELLIGENCE (Salty Brain) ---
        else if (text.toLowerCase().includes('salty') || text.startsWith('/') || update.message.chat.type === 'private') {
            await handleAIConsultation(chatId, text, update.message.from);
        }
        else {
            // Ignorar mensajes que no mencionen a Salty o no sean comandos para no spamear en grupos
        }

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Telegram Webhook] Error interno:", error.message);
        return res.status(500).send('Internal Server Error');
    }
}

async function handleAIConsultation(chatId: string, text: string, from: any) {
    const senderName = from.first_name || "Host";
    const userId = from.id.toString();
    const isIsrael = userId === "9395794184";
    const isBrian = userId === "2085187904";
    const isOwner = isIsrael || isBrian;

    const authorityContext = isOwner 
        ? `(Nota: Hablas con ${isIsrael ? 'Israel' : 'Brian'}, Dueño de Villa Retiro LLC. Tienen autoridad total. Todo lo desarrollado es propiedad exclusiva de su empresa).` 
        : "(Hablas con un miembro del equipo estratégico).";

    try {
        // 🧠 Cargar memorias privadas de la familia
        const { data: familyKnowledge } = await supabaseServiceRole
            .from('salty_family_knowledge')
            .select('key, value');
        
        const memoryContext = familyKnowledge && familyKnowledge.length > 0
            ? `\n\n[MEMORIAS DE LA FAMILIA]:\n${familyKnowledge.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
            : "";

        const { text: responseText, toolCalls } = await generateText({
            model: google('gemini-1.5-flash'),
            system: `${VILLA_CONCIERGE_PROMPT}${memoryContext}\n\n[CONTEXTO DE AUTORIDAD]: ${authorityContext}`,
            prompt: `Mensaje de ${senderName}: ${text}`,
            temperature: 0.7,
            tools: {
                remember_info: {
                    description: 'Guarda información estratégica o familiar en la memoria de largo plazo.',
                    parameters: z.object({
                        key: z.string().describe('Identificador único (ej: family_dog_name)'),
                        value: z.string().describe('Información a recordar'),
                        category: z.enum(['identity', 'preferences', 'operations']).optional()
                    }),
                    execute: async ({ key, value, category }: { key: string; value: string; category?: 'identity' | 'preferences' | 'operations' }) => {
                        const { error } = await supabaseServiceRole
                            .from('salty_family_knowledge')
                            .upsert({ key, value, category: category || 'general' });
                        return error ? { error: error.message } : { success: true };
                    }
                },
                fetch_reservations: {
                    description: 'Busca las reservas próximas o actuales para informar sobre quién llega y por qué plataforma.',
                    parameters: z.object({
                        daysAhead: z.number().optional().describe('Número de días a futuro para buscar (default 7).')
                    }),
                    execute: async ({ daysAhead = 7 }: { daysAhead?: number }) => {
                        const today = new Date().toISOString().split('T')[0];
                        const future = new Date();
                        future.setDate(future.getDate() + daysAhead);
                        const futureStr = future.toISOString().split('T')[0];

                        const { data: bookings, error } = await supabaseServiceRole
                            .from('bookings')
                            .select('customer_name, check_in, check_out, source, property_id')
                            .eq('status', 'confirmed')
                            .gte('check_in', today)
                            .lte('check_in', futureStr);

                        if (error) return { error: error.message };

                        // Enriquecer con nombre de propiedad
                        const bookingsNamed = (bookings || []).map((b: any) => ({
                            ...b,
                            villa: b.property_id === '1081171030449673920' ? 'Villa Retiro R' : 'Pirata Family'
                        }));

                        return { bookings: bookingsNamed };
                    }
                }
            }
        });

        await NotificationService.sendDirectTelegramMessage(chatId, responseText);
    } catch (error: any) {
        console.error("[Telegram NLP] Error:", error.message);
        await NotificationService.sendDirectTelegramMessage(chatId, `⚠️ <b>Error de IA:</b> ${error.message}\n<i>Reintenta en un momento, jefe.</i>`);
    }
}

async function handleStatusCommand(chatId: string) {
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Obtener Reservas Actuales (Checkins/Checkouts/Activas de Hoy)
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('property_id, check_in, check_out, status, source, customer_name')
            .eq('status', 'confirmed')
            .or(`check_in.eq.${today},check_out.eq.${today},and(check_in.lte.${today},check_out.gte.${today})`);

        let checkIns = 0;
        let checkOuts = 0;
        let occupied = 0;
        let details = "";

        if (!bookingsError && bookings) {
            for (const b of (bookings as any[])) {
                if (b.check_in === today) {
                    checkIns++;
                    details += `🔑 <b>${b.customer_name || 'Huésped'}</b> llega a ${b.property_id === '42839458' ? 'Pirata' : 'Retiro'} vía <i>${b.source}</i>\n`;
                }
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

${details ? `<b>Logística de Hoy:</b>\n${details}` : ''}
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
        const separator = '───────────────────────';
        const parts = text.split(separator);
        let draftContent = parts.length > 2 ? parts[2].replace('PREVISUALIZACIÓN DEL MENSAJE:', '').trim() : text;

        // Limpiar comillas iniciales/finales si Salty las puso en la previsualización
        draftContent = draftContent.replace(/^"(.*)"$/, '$1').trim();

        // Extraer email del texto si es posible (ignorando tags HTML de Telegram como <code>)
        const emailMatch = text.match(/Email:\s*(?:<code>)?([^\s<]+)(?:<\/code>)?/);
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
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; padding: 20px;">
                            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 12px; border: 1px solid #eee;">
                                <p style="font-size: 16px; white-space: pre-wrap;">${draftContent}</p>
                            </div>
                            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #aaa; text-align: center; letter-spacing: 1px; text-transform: uppercase;">
                                <p>© Villa & Pirata Stays - Cabo Rojo, Puerto Rico</p>
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
                        text: text + `\n\n✅ <b>¡Enviado! El correo ya está en la bandeja de entrada de ${guestEmail}.</b>`,
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
