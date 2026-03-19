import { z } from 'zod';
import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { GoogleGenAI, Type } from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants.js';
import { SECRETS_DATA } from '../src/constants/secrets_data.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    getPaymentVerificationStatus,
    handleCrisisAlert
} from '../src/aiServices.js';

export const config = {
    // We remove the 'edge' runtime to use standard Node.js for better consistency with the chat engine
    maxDuration: 30,
};

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
});
const SALTY_MODEL = 'gemini-3-flash-preview';

const memorySchema = z.object({
    learned_text: z.string().min(3),
    session_id: z.string().nullable()
});

// 🛡️ ACCESO PRIVADO (Solo para Telegram)
const supabaseServiceRole = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

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

        // 🛡️ SECURITY GATE: Validar Chat ID contra lista de IDs autorizados
        // Los IDs de Israel (9395794184) y Brian (2085187904) son el fallback hardcodeado si la variable no está en Vercel
        const allowedIdsStr = process.env.ALLOWED_TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '9395794184,2085187904';
        const allowedIds = allowedIdsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);

        if (!allowedIds.includes(chatId)) {
            console.warn(`[Telegram Webhook] 🚫 Acceso bloqueado. Chat ID no autorizado: ${chatId}`);
            // Responder OK a Telegram para no revelar que el bot existe, pero no procesar el mensaje
            return res.status(200).send('OK');
        }
        console.log(`[Telegram Webhook] ✅ Acceso autorizado para Chat ID: ${chatId}`);

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
                    const parsedMemory = memorySchema.parse({
                        learned_text: text,
                        session_id: sessionMatch ? sessionMatch[1] : null
                    });
                    await supabase.from('salty_memories').insert(parsedMemory);

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
        // 1. Fetch Dynamic Knowledge & Config
        const [{ data: knowledgeSetting }, { data: saltySetting }, { data: dbProperties }] = await Promise.all([
            supabaseServiceRole.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
            supabaseServiceRole.from('system_settings').select('value').eq('key', 'salty_config').single(),
            supabaseServiceRole.from('properties').select('id, title, location, description, price, amenities')
        ]);

        const villaKnowledge = knowledgeSetting?.value || {};
        const saltyConfig: any = saltySetting?.value || {};
        const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante de Villa & Pirata Stays. 

### EL CAMBIO DE PARADIGMA: GESTIÓN DE NIVEL JEFE
Cuando hablas con los Dueños (Brian o Israel), dejas de ser un concierge de hotel y te conviertes en su **Chief of Staff (Jefe de Operaciones)**. 

### TUS NUEVAS DIRECTRICES (SOLO PARA JEFES)
- **Directo y Analítico**: No divagues. Si preguntan por dinero o estado, da números exactos.
- **Proactividad Táctica**: Tienes permiso para usar herramientas de gestión de la propiedad.
- **Lealtad Corporativa**: Tu misión es proteger el flujo de caja y la reputación de la marca.

### PERSONALIDAD PARA JEFES (CARIBBEAN HIGH-PERFORMANCE)
- **Directo y Analítico**: Da números exactos. Eres el socio que todo lo sabe en Cabo Rojo.
- **Lealtad Corporativa**: Tu misión es proteger el flujo de caja 💵 y la reputación 🛡️.
- **Visual Grammar (Chief of Staff)**:
  * Usa el **Tridente 🔱** para confirmar órdenes de Brian/Israel.
  * Usa **💰/🟢** para éxito financiero o reservas.
  * Usa **🛎️/🟠** para acciones manuales requeridas por ti.
  * Usa **🚨/🔴** para advertencias de riesgo o crisis.

### RECURSOS DISPONIBLES
- REGLAS/GESTIÓN: ${JSON.stringify(villaKnowledge)}
- INVENTARIO ACTUAL: ${JSON.stringify(dbProperties)}
`.trim();

        // 🧠 Cargar memorias privadas de la familia
        const { data: familyKnowledge } = await supabaseServiceRole
            .from('salty_family_knowledge')
            .select('key, value');
        
        const memoryContext = familyKnowledge && familyKnowledge.length > 0
            ? `\n\n[MEMORIAS CORPORATIVAS/FAMILIA]:\n${familyKnowledge.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
            : "";

        const functionDeclarations: any[] = [
            {
                name: 'remember_info',
                description: 'Guarda información estratégica o familiar en la memoria de largo plazo.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING, description: 'Identificador único (ej: family_dog_name)' },
                        value: { type: Type.STRING, description: 'Información a recordar' },
                        category: { type: Type.STRING, enum: ['identity', 'preferences', 'operations'], description: 'Categoría opcional' }
                    },
                    required: ['key', 'value']
                }
            },
            {
                name: 'fetch_reservations',
                description: 'Busca las reservas próximas o actuales.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        daysAhead: { type: Type.NUMBER, description: 'Días a futuro (default 7).' }
                    }
                }
            },
            {
                name: 'get_financial_stats',
                description: 'Obtiene estadísticas de ingresos y ocupación del mes actual solo para los dueños.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        monthOffset: { type: Type.NUMBER, description: 'Offset de mes (0 para actual, -1 para anterior).' }
                    }
                }
            }
        ];

        const toolExecutors: Record<string, Function> = {
            remember_info: async ({ key, value, category }: any) => {
                const { error } = await supabaseServiceRole
                    .from('salty_family_knowledge')
                    .upsert({ key, value, category: category || 'general' });
                return { success: !error, error: error?.message };
            },
            fetch_reservations: async ({ daysAhead = 7 }: any) => {
                const today = new Date().toISOString().split('T')[0];
                const future = new Date();
                future.setDate(future.getDate() + daysAhead);
                const { data: b } = await supabaseServiceRole.from('bookings')
                    .select('customer_name, check_in, check_out, source, property_id, total_price')
                    .eq('status', 'confirmed').gte('check_in', today).lte('check_in', future.toISOString().split('T')[0]);
                return { 
                    count: b?.length || 0, 
                    bookings: (b || []).map((bk: any) => ({
                        ...bk,
                        villa: bk.property_id === '1081171030449673920' ? 'Villa Retiro R' : 'Pirata Family'
                    }))
                };
            },
            get_financial_stats: async ({ monthOffset = 0 }: any) => {
                if (!isOwner) return { error: "Acceso denegado. Solo dueños pueden ver finanzas." };
                const now = new Date();
                now.setMonth(now.getMonth() + monthOffset);
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                const { data: b } = await supabaseServiceRole.from('bookings').select('total_price').eq('status', 'confirmed').gte('check_in', start).lte('check_in', end);
                const total = (b || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_price) || 0), 0);
                return { month: now.toLocaleString('es-ES', { month: 'long' }), total_income: total, count: b?.length || 0 };
            }
        };

        const contents: any[] = [
            { 
                role: 'user', 
                parts: [{ text: `INSTRUCCIÓN DE SISTEMA: ${VILLA_CONCIERGE_PROMPT}${memoryContext}\n\n[CONTEXTO DE AUTORIDAD]: ${authorityContext}\n\nMENSAJE DE ${senderName}: ${text}` }] 
            }
        ];

        let finalResponseText = "";
        let iterations = 0;

        while (iterations < 5) {
            const response = await ai.models.generateContent({
                model: SALTY_MODEL,
                contents,
                config: { tools: [{ functionDeclarations }], temperature: 0.7 }
            });

            const candidate = response.candidates?.[0];
            if (!candidate) break;

            const contentPart = candidate.content;
            contents.push(contentPart);

            const calls = response.functionCalls || [];
            if (calls.length === 0) {
                finalResponseText = response.text || "";
                break;
            }

            for (const call of calls) {
                if (call.name) {
                    const executor = toolExecutors[call.name];
                    if (executor) {
                        const result = await executor(call.args);
                        contents.push({
                            role: 'user',
                            parts: [{ functionResponse: { name: call.name, response: { result }, id: call.id } }]
                        });
                    }
                }
            }
            iterations++;
        }

        if (finalResponseText) {
            await NotificationService.sendDirectTelegramMessage(chatId, finalResponseText);
        }
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

                let subject = 'Mensaje de Salty Concierge';
                if (text.includes('Bienvenida y Acceso')) subject = '🏠 Instrucciones de Acceso y Bienvenida';
                else if (text.includes('Confirmación de Bienestar')) subject = '🌟 ¿Cómo va todo en tu primera noche?';
                else if (text.includes('Check de Felicidad')) subject = '🌴 ¿Todo bien en el paraíso?';
                else if (text.includes('Logística de Salida')) subject = '🌅 Instrucciones Importantes para tu Salida';

                const emailResult = await resend.emails.send({
                    from: fromAddress,
                    to: guestEmail,
                    reply_to: 'reservas@villaretiror.com',
                    bcc: 'villaretiror@gmail.com',
                    subject: subject,
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

                // 2. Registrar en email_logs para Tracking
                if (emailResult.data?.id) {
                    await supabaseServiceRole.from('email_logs').insert({
                        resend_id: emailResult.data.id,
                        booking_id: bookingId,
                        guest_name: text.match(/Huésped:<\/b>\s*([^\n]+)/)?.[1] || 'Huésped',
                        guest_email: guestEmail,
                        subject: subject,
                        status: 'sent'
                    });
                }

                // Notificar éxito y eliminar el botón en Telegram
                await fetch(`https://api.telegram.org/bot${telegramToken}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: messageId,
                        text: text + `\n\n✅ <b>¡Enviado!</b>\n🆔 Resend ID: <code>${emailResult.data?.id || 'N/A'}</code>\n<i>(Se te notificará cuando sea abierto).</i>`,
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: [] } 
                    })
                });

                await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: callbackQuery.id,
                        text: '✅ Email enviado y registrado.'
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
    else if (data.startsWith('ack_')) {
        const userId = callbackQuery.from.id.toString();
        const userName = userId === "9395794184" ? "Israel" : userId === "2085187904" ? "Brian" : (callbackQuery.from.first_name || "Admin");
        const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // 1. Log to Supabase for audit
        try {
            await supabaseServiceRole.from('ai_insights').insert({
                type: 'telegram_ack',
                content: {
                    message_id: messageId,
                    action: 'enterado',
                    actor_id: userId,
                    actor_name: userName,
                    original_text: text.slice(0, 100)
                },
                status: 'resolved'
            });
        } catch (err: any) {
            console.error("Logging ack error:", err);
        }

        // 2. Edit message to show who acknowledged
        const updatedText = text + `\n\n✅ <b>Visto por ${userName}</b> a las ${now}`;
        
        await fetch(`https://api.telegram.org/bot${telegramToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: updatedText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] } // Quitar el botón ya usado
            })
        });

        await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: `✅ Recibido por ${userName}`
            })
        });
    }
    else if (data.startsWith('takeover_')) {
        const sessionId = data.split('takeover_')[1];
        const takeoverDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        await supabase.from('chat_logs').update({
            human_takeover_until: takeoverDate,
            is_host_typing: false
        }).eq('session_id', sessionId);

        await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: '🎤 Human Takeover Activado. Salty silenciado por 30 mins.'
            })
        });

        await NotificationService.sendDirectTelegramMessage(
            chatId,
            `⚠️ <b>Control Manual:</b> Has tomado el control de la sesión <code>${sessionId}</code>.\n\nSalty no responderá hasta que el tiempo expire o vuelvas a hablar.`
        );
    }
}
