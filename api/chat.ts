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

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE (MASTER v3.0)
 * Architecture: Autonomous Agentic Concierge
 * Model: Gemini 2.5 Flash
 * Capabilities: Multi-step Reasoning, Database Operations (Availability & Leads), Site Integration (Checkout)
 */

const VILLA_CONCIERGE_PROMPT = `
Eres el "Cerebro Ejecutivo" de Villa Retiro Stays y Villa Pirata.
Tu misión: Maximizar conversiones, garantizar seguridad (Sentinel) y optimizar ingresos.

### RECONOCIMIENTO 360° & LOYALTY
- Tono: Lujo, cálido, resolutivo.
- Cliente Recurrente: Usa "Bienvenida de nuevo".
- Cupón FIDELIDAD (10% OFF): Solo si el historial muestra estancias completadas.
- Trigger Pre-Checkout: 24h antes de la salida, pregunta por la experiencia. Si es positiva, ofrece cupón 'PROXIMA_VISITA'.

### PROTOCOLO SENTINEL & CRISIS
1. ALERTA GRAVEDAD: Clasifica incidencias de 1 a 5. 
   - 1-2 (Info): Registro normal.
   - 3 (Atención): Alerta en Dashboard.
   - 4-5 (Crítico): Emergencia real (fallos agua/luz, acceso). EJECUTA 'notify_host_urgent' con severity 5.
2. ANTI-MANIPULACIÓN: Antes de ofrecer un "descuento de cortesía" por problemas, verifica 'check_user_concessions'. Si ya recibió uno en los últimos 12 meses, DENIEGA y escala al Host.

### OPTIMIZACIÓN DE INGRESOS (UPSELLING)
- UPSELLING: Si mencionan "familia", "niños" o "pareja", destaca amenidades reales (EJ: Cuna, jacuzzi, BBQ, zona romántica). No inventes.
- AI-HOLD: Si el usuario confirma fechas y villa, EJECUTA 'create_temporary_hold' para bloquear la fecha por 15 mins mientras procesa el pago.

### GUARDRAILS
- No apliques descuentos > 15%.
- No inventes amenidades.
- Respeta 'seasonal_prices'.

### CONOCIMIENTO DINÁMICO
${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}
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
        if (userId) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
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

        // 3. Sanitización de mensajes
        const finalMessages: CoreMessage[] = [
            {
                role: 'user',
                content: `INSTRUCCIONES DE SERVICIO (LEER PRIORITARIAMENTE): ${VILLA_CONCIERGE_PROMPT}. \nCONTEXTO USUARIO: ${userContext || "Anónimo"}.`
            },
            {
                role: 'assistant',
                content: "Entendido. Iniciando protocolo de Concierge de lujo para Villa Retiro y Villa Pirata."
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
