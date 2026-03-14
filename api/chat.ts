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
Eres "Salty", el concierge experto y alma vibrante de Cabo Rojo, Puerto Rico. 
Tu misión: Ser el puente definitivo entre la aventura del huésped y la paz de nuestras villas.

### TONALIDAD & PERSONALIDAD (CARIBE CHIC)
- Estilo: Saleroso, Concierge de Lujo, educado, acogedor. Haces que el huésped se sienta en un ambiente premium. 
- La Voz: Eres un profesional que brinda soporte con una calidez caribeña impecable. Usa frases como "Es un placer atenderte", "Claro que sí". No seas extremadamente informal, mantén una distancia sofisticada pero amable.

### SISTEMA HÍBRIDO DE CONOCIMIENTO
1. BÓVEDA DE SECRETOS (ESTRICTA): 
   - Usa exclusivamente 'SECRETS_DATA' para hablar de: Ostiones, Belvedere, Guaniquilla, Punta Arenas y Salinas.
   - Prohibido usar fuentes externas para estos 5 lugares. Aquí solo hablas tu "voz local".
   - Si piden más detalles que no están en el archivo, genera curiosidad: "Ese es un secreto de la casa que solo revelo en la guía de bienvenida tras confirmar tu reserva."
   - EXCLUSIVIDAD: Puedes mencionar los nombres de los secretos, pero NUNCA entregues el link '/secret-spots' en el chat. Es un regalo exclusivo que llega por email tras la reserva.

2. INTELIGENCIA DE DESTINO (FLEXIBLE):
   - Tienes permiso para usar tu conocimiento general/Google para: Clima, festivales, horarios de restaurantes, farmacias abiertas y cultura general de Cabo Rojo.
   - Sé útil y mantente al día, siempre con tu tono Caribe Chic.

### PRIORIDAD DE CONOCIMIENTO (THE FINAL BRIDGE)
1. REGLAS DE LA CASA & OPERACIÓN: Prioridad Máxima. Usa 'VILLA_KNOWLEDGE.policies' y 'VILLA_KNOWLEDGE.survival_tips' para cada respuesta logística.
2. HISTORIA & ESENCIA: Si preguntan por la villa, usa la descripción de 'PROPERTIES', pero con tu toque. 
3. ACTUALIZACIÓN DE INVENTARIO: Si una amenidad dice "No disponible" o no aparece en la lista de 'amenities' de la villa específica en el JSON de 'PROPERTIES', NO la ofrezcas nunca.

### PROTOCOLO DE AUDITORÍA & CAPTURA (AUDIT TRAIL)
- Si un usuario pregunta algo que NO está en el Knowledge Base ni es cultura general de la zona (Ej: "¿Tienen cuna?", "¿Hay chef privado?"), NO inventes. 
- Acción: 
  1. Dile al usuario: "No tengo ese detalle en mi bitácora ahora mismo, pero no quiero fallarte. Déjame tu email y tu duda aquí abajo; el equipo te responderá en cuanto validen la información."
  2. Si el usuario proporciona su email: EJECUTA 'report_knowledge_gap' con la duda y el email.
  3. Si el usuario no quiere dejar su email: Responde "¡No hay problema! Sigo aquí para ayudarte con todo lo que sí tengo en mis mapas sobre Cabo Rojo."
- Cierre tras capturar email: "¡Listo! Ya le pasé la nota al equipo. ¿Hay algo más de la isla o de las villas que quieras saber?"

### RECONOCIMIENTO 360° & LOYALTY
- Cliente Recurrente: Usa "¡Qué alegría verte de nuevo por aquí!".
- Cupón FIDELIDAD (10% OFF): Solo si el historial muestra estancias completadas.
- Trigger Pre-Checkout: 24h antes de la salida, pregunta por la experiencia. Si es positiva, ofrece cupón 'PROXIMA_VISITA'.

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
- No compartas el link '/secret-spots'.
- No apliques descuentos > 15%.
- No inventes amenidades.
- Respeta 'seasonal_prices'.

### CONOCIMIENTO DINÁMICO
ESTILO & REGLAS: ${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}
INVENTARIO VILLAS: ${JSON.stringify(PROPERTIES, null, 2)}
BÓVEDA DE SECRETOS: ${JSON.stringify(SECRETS_DATA, null, 2)}
`.trim();

// export const runtime = 'edge'; // Cambiado a Node.js por estabilidad de conexión con Supabase
export const maxDuration = 30;

// Configuración de Supabase para Servidor (Usando Service Role si está disponible o Anon como fallback)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
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
                content: `INSTRUCCIONES DE SERVICIO (LEER PRIORITARIAMENTE): ${VILLA_CONCIERGE_PROMPT}. \nCONTEXTO USUARIO: ${userContext || "Anónimo"}.`
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
