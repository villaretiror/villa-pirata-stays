import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';
import {
    checkAvailabilityWithICal,
    logAbandonmentLead,
    getPaymentVerificationStatus,
    findCalendarGaps,
    handleCrisisAlert,
    applyAIQuote,
    createTemporaryHold,
    checkUserConcessions
} from '../aiServices.js';

import { SECRETS_DATA } from '../constants/secrets_data.js';

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE (MASTER v3.1)
 * Architecture: Autonomous Agentic Concierge
 * Model: Gemini 2.5 Flash
 * Hybrid Knowledge: Strict Secrets + Flexible Destination AI
 */

const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante y concierge ejecutivo de Villa & Pirata Stays en Cabo Rojo, Puerto Rico. 
Tu misión: Ser un anfitrión excepcional que combina la eficiencia de un concierge de lujo con la calidez de un amigo local.

### TONALIDAD & PERSONALIDAD (MODERN LUXURY)
- Estilo: Cercano, sofisticado, ejecutivo y acogedor. 
- La Voz: Eres un profesional que brinda soporte impecable. Usa el "Tú" para crear una conexión genuina, pero mantén un nivel de respeto y pulcritud de 5 estrellas. 
- Evita: Respuestas robóticas o excesivamente formales tipo hotelero antiguo. Queremos que el huésped se sienta como el dueño de la villa.

### SISTEMA HÍBRIDO DE CONOCIMIENTO
1. BÓVEDA DE SECRETOS (ESTRICTA): 
   - Usa exclusivamente 'SECRETS_DATA' para hablar de: Ostiones, Belvedere, Guaniquilla, Punta Arenas y Salinas.
   - Prohibido usar fuentes externas para estos 5 lugares. Aquí solo hablas tu "voz local".
   - Si piden más detalles que no están en el archivo, genera curiosidad: "Ese es un secreto de la casa que solo revelo en la guía de bienvenida tras confirmar tu reserva."
   - EXCLUSIVIDAD: Puedes mencionar los nombres de los secretos, pero NUNCA entregues el link '/secret-spots' en el chat. Es un regalo exclusivo que llega por email tras la reserva.

### PROTOCOLO DE CONEXIÓN HUMANA (THE BRIDGE)
- Si detectas frustración, una pregunta técnica sobre pagos que no puedes resolver, o si el huésped pide hablar con alguien directamente:
  1. No te disculpes excesivamente.
  2. Ejecuta 'generate_whatsapp_link' para ofrecer el enlace de contacto directo.
  3. Dile: "Para que no pierdas ni un segundo de tu estadía, te conecto directo con nuestro equipo por WhatsApp aquí: [Link]".

### PRIORIDAD DE CONOCIMIENTO (THE FINAL BRIDGE)
1. REGLAS DE LA CASA & OPERACIÓN: Prioridad Máxima. Usa 'VILLA_KNOWLEDGE.policies' y 'VILLA_KNOWLEDGE.survival_tips' para cada respuesta logística.
2. HISTORIA & ESENCIA: Si preguntan por la villa, usa la descripción de 'PROPERTIES', pero con tu toque. 
3. ACTUALIZACIÓN DE INVENTARIO: Si una amenidad dice "No disponible" o no aparece en la lista de 'amenities' de la villa específica en el JSON de 'PROPERTIES', NO la ofrezcas nunca.

### PROTOCOLO DE AUDITORÍA (KNOWLEDGE GAP)
- Si no sabes algo operativo (ej: "¿Tienen cuna?"): 
  1. Dile: "No tengo ese dato en mi bitácora ahora mismo, pero déjame tu email y te lo confirmo en un segundo."
  2. Ejecuta 'report_knowledge_gap' si proporcionan el email.

### RECONOCIMIENTO & LEALTAD
- Cliente Recurrente: "¡Qué alegría tenerte de vuelta en casa!".
- Cupón FIDELIDAD (10% OFF): Solo si el historial muestra estancias confirmadas.

### BLINDAJE DE INVENTARIO & VERDAD
- AMENIDADES: NO inventes ni uses frases genéricas. Consulta el JSON de 'PROPERTIES'. 
- CIERRE DE VENTA HONESTO: Al cerrar, menciona UN beneficio real y confirmado de la villa de interés según el JSON.

### PROTOCOLO SENTINEL & CRISIS
1. ALERTA GRAVEDAD: Clasifica incidencias de 1 a 5. 
   - 1-2 (Info): Registro normal.
   - 3 (Atención): Alerta en Dashboard.
   - 4-5 (Crítico): Emergencia real (fallos agua/luz, acceso). EJECUTA 'notify_host_urgent' con severity 5.

### OPTIMIZACIÓN DE INGRESOS (UPSELLING)
- UPSELLING: Si mencionan "familia", "niños" o "pareja", destaca amenidades reales de la villa (piscina, cuna, etc). 

### GUARDRAILS
- MÁXIMO respeto a 'seasonal_prices'.
- No compartas el link '/secret-spots'.
- No apliques descuentos > 15%.

### CONOCIMIENTO DINÁMICO
ESTILO & REGLAS: ${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}
INVENTARIO VILLAS: ${JSON.stringify(PROPERTIES, null, 2)}
BÓVEDA DE SECRETOS: ${JSON.stringify(SECRETS_DATA, null, 2)}
`.trim();

// export const runtime = 'edge'; // Cambiado a Node.js por estabilidad de conexión con Supabase
export const maxDuration = 30;

// Configuración de Supabase para Servidor (Usando Service Role si está disponible o Anon como fallback)
const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// ✅ Versión Node.js para Vercel Functions (v9.0 - Final Resilience Sync)
export default async function handler(req: any, res: any) {
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages: rawMessages, sessionId, userId } = req.body;

        // 1. Limite de Memoria: Solo enviamos los últimos 20 mensajes
        const recentMessages = (rawMessages || []).slice(-20);

        // 2. Persistencia y Auditoría de Sesión + Contexto 360°
        let userContext = "";
        let profile: any = null;
        let extendedMemory = "";

        // 🧠 Cargar memoria dinámica de aprendizajes previos de Salty
        const { data: memories } = await supabase.from('salty_memories')
            .select('learned_text')
            .order('created_at', { ascending: false })
            .limit(10);

        if (memories && memories.length > 0) {
            extendedMemory = `\n\n[MEMORIA DINÁMICA (APRENDIZAJE RECIENTE DEL HOST)]:\nAplica estas reglas/información nueva si el usuario pregunta sobre ello: ` + memories.map(m => `- ${m.learned_text}`).join('\n');
        }

        if (userId) {
            const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
            profile = p;
            const { data: history } = await supabase.from('bookings').select('status, check_in, property_id').eq('user_id', userId).limit(3);

            if (profile) userContext += `Huésped: ${profile.full_name}. `;
            if (history && history.length > 0) {
                userContext += `Historial: ${history.map(b => `${b.status} en ${b.check_in}`).join(', ')}. `;
            }
        }

        if (sessionId) {
            const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const validUserId = (userId && isUUID(userId)) ? userId : null;

            supabase.from('chat_logs').upsert({
                session_id: sessionId,
                user_id: validUserId,
                message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString()
            }, { onConflict: 'session_id' }).then(({ error }) => {
                if (error) console.error('[CHAT_LOG_ERROR]:', error.message);
            });
        }

        // 🔗 CHAT MIRROR: Human Takeover & Notify Telegram
        let isHumanTakeover = false;
        const lastGuestMessage = recentMessages.length > 0 ? String(recentMessages[recentMessages.length - 1].content || recentMessages[recentMessages.length - 1].text || '') : null;

        if (sessionId) {
            // Check if Host took over
            const { data: logInfo } = await supabase.from('chat_logs').select('human_takeover_until').eq('session_id', sessionId).single();
            if (logInfo && logInfo.human_takeover_until) {
                if (new Date(logInfo.human_takeover_until) > new Date()) {
                    isHumanTakeover = true;
                }
            }

            // Notificamos a Telegram el mensaje en tiempo real (si es nuevo y tiene texto)
            if (lastGuestMessage) {
                try {
                    const { NotificationService } = await import('../services/NotificationService.js');
                    await NotificationService.sendTelegramAlert(
                        `💬 <b>Chat Web (Espejo)</b>\n\n` +
                        `<b>Sesión:</b> <code>${sessionId}</code>\n` +
                        `<b>Huésped:</b> ${profile ? profile.full_name : 'Anónimo'}\n\n` +
                        `🗨️ <i>"${lastGuestMessage}"</i>\n\n` +
                        `👉 <i>Responde a este mensaje de Telegram para tomar el control por 30 mins y detener a Salty.</i>`
                    );
                } catch (e) {
                    // Ignorar silenciosamente si Telegram falla
                }

                // Si el host tomó control, NO ejecutamos Gemini. Devolvemos el control silencioso.
                if (isHumanTakeover) {
                    return new Response("[Host conectado] Te leemos en directo. Un miembro de nuestro equipo responde en seguida...", {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }
            }
        }

        // 3. Sanitización de mensajes
        const finalMessages: CoreMessage[] = [
            {
                role: 'user',
                content: `INSTRUCCIONES DE SERVICIO (LEER PRIORITARIAMENTE): ${VILLA_CONCIERGE_PROMPT}. \nCONTEXTO USUARIO: ${userContext || "Anónimo"}.${extendedMemory}`
            },
            {
                role: 'assistant',
                content: "¡Hola! Soy Salty, tu concierge en Cabo Rojo. Estoy listo para ayudarte a planificar la escapada perfecta."
            },
            ...recentMessages.map((m: any): CoreMessage => ({
                role: (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user',
                content: String(m.content || m.text || ''),
            }))
        ];

        // 4. EJECUCIÓN CON TOOL CALLING
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages: finalMessages,
            maxSteps: 5,
            temperature: 0.7,
            tools: {
                check_availability: tool({
                    description: 'Busca reservas que se solapen con las fechas solicitadas.',
                    parameters: z.object({
                        villa_ids: z.array(z.string()),
                        check_in: z.string(),
                        check_out: z.string(),
                    }),
                    execute: async ({ villa_ids, check_in, check_out }) => {
                        const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        const available = villa_ids.filter((_, i) => results[i].available);

                        // Check for Gaps if not available
                        let gapMessage = "";
                        if (available.length === 0) {
                            const gaps = await Promise.all(villa_ids.map(id => findCalendarGaps(id)));
                            const validGaps = gaps.flat().filter(g => g.nights > 0);
                            if (validGaps.length > 0) {
                                gapMessage = `\nTip: Hay huecos cortos disponibles: ${validGaps.map(g => `${g.start} al ${g.end}`).join(', ')}.`;
                            }
                        }

                        return {
                            status: 'success',
                            available_ids: available,
                            message: (available.length > 0 ? "Villas libres encontradas." : "Sin disponibilidad exacta.") + gapMessage
                        };
                    },
                }),
                create_lead: tool({
                    description: 'Guarda un prospecto interesado en el CRM.',
                    parameters: z.object({
                        name: z.string(),
                        email: z.string().optional(),
                        phone: z.string().optional(),
                        interest: z.string(),
                    }),
                    execute: async ({ name, email, phone, interest }) => {
                        const success = await logAbandonmentLead({ name, email, phone, interest });
                        return success ? { status: 'success', message: 'Lead generado.' } : { status: 'error' };
                    },
                }),
                generate_booking_pattern: tool({
                    description: 'Genera el presupuesto detallado y el patrón de pago PayPal.',
                    parameters: z.object({
                        villa_id: z.string(),
                        check_in: z.string(),
                        check_out: z.string(),
                        promo_code: z.string().optional(),
                    }),
                    execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                        const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                        return `[PAYMENT_REQUEST: ${villa_id}, ${quote.total}, ${check_in}, ${check_out}, ${quote.nights}, ${quote.discount}] (Desglose: Base $${quote.basePrice} + Tasas $${quote.fees})`;
                    },
                }),
                check_payment_status: tool({
                    description: 'Verifica si una reserva tiene comprobante de pago subido.',
                    parameters: z.object({
                        booking_id: z.string()
                    }),
                    execute: async ({ booking_id }) => {
                        const message = await getPaymentVerificationStatus(booking_id);
                        return { status: 'success', message };
                    }
                }),
                notify_host_urgent: tool({
                    description: 'Notifica al host sobre soporte urgente o incidencias graves.',
                    parameters: z.object({
                        client_name: z.string(),
                        issue_description: z.string(),
                        contact_info: z.string(),
                        severity: z.number().min(1).max(5).default(1)
                    }),
                    execute: async ({ client_name, issue_description, contact_info, severity }) => {
                        const success = await handleCrisisAlert(client_name, issue_description, contact_info, severity);
                        return success ? { status: 'success', message: 'Alerta enviada.' } : { status: 'error' };
                    },
                }),
                create_temporary_hold: tool({
                    description: 'Bloquea temporalmente fechas para evitar overbooking (15 mins).',
                    parameters: z.object({
                        villa_id: z.string(),
                        check_in: z.string(),
                        check_out: z.string(),
                    }),
                    execute: async ({ villa_id, check_in, check_out }) => {
                        const success = await createTemporaryHold(villa_id, check_in, check_out, userId);
                        return success ? { status: 'success', message: 'Bloqueo temporal activo (15 mins).' } : { status: 'error' };
                    }
                }),
                check_user_concessions: tool({
                    description: 'Verifica si el usuario ya ha recibido descuentos por cortesía recientemente.',
                    parameters: z.object({
                        user_id: z.string().optional()
                    }),
                    execute: async ({ user_id }) => {
                        const id = user_id || userId;
                        if (!id) return { status: 'error', message: 'Usuario no identificado.' };
                        const { allowed, lastGrant } = await checkUserConcessions(id);
                        return { status: 'success', allowed, lastGrant };
                    }
                }),
                generate_whatsapp_link: tool({
                    description: 'Genera un enlace directo al WhatsApp del Host para soporte humano.',
                    parameters: z.object({
                        reason: z.string().optional()
                    }),
                    execute: async ({ reason }) => {
                        const message = encodeURIComponent(`Hola, soy un huésped de Villa & Pirata Stays. Necesito ayuda con: ${reason || 'Soporte General'}`);
                        const url = `https://wa.me/${HOST_PHONE}?text=${message}`;
                        return { status: 'success', url, message: 'Enlace generado. Por favor, compártelo con el usuario.' };
                    }
                }),
                report_knowledge_gap: tool({
                    description: 'NOTIFICACIÓN INTERNA: Informa al equipo cuando un usuario pregunta por algo que no está en el cerebro de Salty.',
                    parameters: z.object({
                        query: z.string(),
                        missing_info: z.string(),
                        user_email: z.string().optional()
                    }),
                    execute: async ({ query, missing_info, user_email }) => {
                        try {
                            const { NotificationService } = await import('../services/NotificationService.js');
                            await NotificationService.sendTelegramAlert(
                                `🧠 <b>#ConsultaPendiente</b>\n\n` +
                                `Un cliente tiene una duda que Salty no pudo resolver:\n` +
                                `❓ <b>Duda:</b> ${query}\n` +
                                `📧 <b>Email Cliente:</b> ${user_email || 'No provisto'}\n` +
                                `📝 <b>Falta info de:</b> ${missing_info}\n\n` +
                                `<i>Por favor, responde al cliente y actualiza el cerebro.</i>`,
                                {
                                    inline_keyboard: [
                                        [{ text: "🎤 Responder ahora", url: process.env.VITE_SITE_URL ? `${process.env.VITE_SITE_URL}/host/dashboard?chat=${encodeURIComponent(user_email || '')}` : `https://villaretiror.com/host/dashboard` }]
                                    ]
                                }
                            );
                            return { status: 'success', message: 'Nota enviada al equipo.' };
                        } catch (e) {
                            return { status: 'error', message: 'Fallo al enviar alerta.' };
                        }
                    }
                })
            },
        });

        // Tubería de streaming para Node.js
        return result.pipeTextStreamToResponse(res);

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return res.status(500).json({
            error: 'Servicio en re-sincronización',
            details: error.message
        });
    }
}
// Deploy Trigger: Sat Mar 14 00:34:49 AST 2026
