import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE (MASTER v3.0)
 * Architecture: Autonomous Agentic Concierge
 * Model: Gemini 2.5 Flash
 * Capabilities: Multi-step Reasoning, Database Operations (Availability & Leads), Site Integration (Checkout)
 */

const VILLA_CONCIERGE_PROMPT = `
Eres el Concierge Senior de Cierre de Villa Retiro Stays y Villa Pirata.
Tu éxito se mide por reservas completadas y leads generados. 
Tu tono es Lujoso, cálido y profesional.

### CONOCIMIENTO DE PROPIEDADES
- VILLA RETIRO R (ID: 1081171030449673920): $285/noche + $85 Limpieza + $20 Service + $250 Depósito.
- PIRATA FAMILY HOUSE (ID: 42839458): $145/noche + $85 Limpieza + $25 Piscina + $250 Depósito.

### PROTOCOLO DE ACTUACIÓN (STRICT)
1. IDENTIFICACIÓN: Consigue el nombre y fechas tentativas del cliente en los primeros 3 mensajes.
2. DISPONIBILIDAD: Si preguntan por fechas, EJECUTA la herramienta 'check_availability'. Si una villa está ocupada, ofrece la otra inmediatamente.
3. LEADS (CRM): Si el cliente muestra interés serio pero no reserva, EJECUTA 'create_lead' para guardar su contacto. Solicita WhatsApp/Email amablemente.
4. EL CIERRE (CHECKOUT): Cuando el cliente elija villa y fechas, indícale: "Excelente elección. He preparado su solicitud de reserva. Puede completar el pago de forma segura aquí mismo:". INMEDIATAMENTE incluye el formato [PAYMENT_REQUEST: ...] usando 'generate_booking_pattern'.

### MANEJO DE POST-VENTA
Si el usuario YA TIENE una reserva o ya pagó y reporta algún problema, duda o necesita soporte, EJECUTA INMEDIATAMENTE la herramienta 'notify_host_urgent' para alertar al Host. Dile al cliente que has enviado una alerta prioritaria y que será contactado brevemente.

### DATOS ADICIONALES
Usa VILLA_KNOWLEDGE para políticas y amenidades:
${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}
`.trim();

export const runtime = 'edge';
export const maxDuration = 30;

// Configuración de Supabase para Servidor (Usando Service Role si está disponible o Anon como fallback)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages: rawMessages, sessionId, userId } = await req.json();

        // 1. Limite de Memoria: Solo enviamos los últimos 20 mensajes para optimizar costos y latencia
        const recentMessages = (rawMessages || []).slice(-20);

        // 2. Persistencia y Auditoría de Sesión (chat_logs)
        if (sessionId) {
            // Actualizamos contadores en segundo plano para no bloquear al usuario
            supabase.from('chat_logs').upsert({
                session_id: sessionId,
                user_id: userId || null,
                message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString()
            }, { onConflict: 'session_id' }).then(({ error }) => {
                if (error) console.error('[CHAT_LOG_ERROR]:', error.message);
            });
        }

        // 3. Sanitización de mensajes para forzar contexto en Edge Runtime
        const finalMessages: CoreMessage[] = [
            {
                role: 'user',
                content: `INSTRUCCIONES DE SERVICIO (LEER PRIORITARIAMENTE): ${VILLA_CONCIERGE_PROMPT}.`
            },
            {
                role: 'assistant',
                content: "Entendido. Iniciando protocolo de Concierge de lujo para Villa Retiro y Villa Pirata. Mi éxito hoy depende de sus reservas y satisfacción."
            },
            ...recentMessages.map((m: any): CoreMessage => ({
                role: (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user',
                content: String(m.content || m.text || ''),
            }))
        ];

        // 2. EJECUCIÓN CON TOOL CALLING (Autonomous Mode)
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages: finalMessages,
            maxSteps: 5, // Permite que Gemini ejecute herramientas y las procese antes de responder
            temperature: 0.7,
            tools: {
                check_availability: tool({
                    description: 'Busca reservas que se solapen con las fechas solicitadas para una o ambas villas.',
                    parameters: z.object({
                        villa_ids: z.array(z.string()).describe('Lista de IDs de villas a consultar'),
                        check_in: z.string().describe('Fecha de inicio YYYY-MM-DD'),
                        check_out: z.string().describe('Fecha de fin YYYY-MM-DD'),
                    }),
                    execute: async ({ villa_ids, check_in, check_out }) => {
                        const { data: bookings, error } = await supabase
                            .from('bookings')
                            .select('property_id, check_in, check_out')
                            .in('property_id', villa_ids)
                            .neq('status', 'cancelled');

                        if (error) return { status: 'error', message: 'No pudimos conectar con el calendario.' };

                        const busyVillas = (bookings || []).filter(b => {
                            const bIn = new Date(b.check_in);
                            const bOut = new Date(b.check_out);
                            const qIn = new Date(check_in);
                            const qOut = new Date(check_out);
                            return (qIn < bOut && qOut > bIn);
                        }).map(b => b.property_id);

                        const available = villa_ids.filter(id => !busyVillas.includes(id));
                        return {
                            status: 'success',
                            available_ids: available,
                            message: available.length > 0 ? "Estas villas están libres." : "Lo sentimos, ambas están ocupadas en esas fechas."
                        };
                    },
                }),
                create_lead: tool({
                    description: 'Guarda un prospecto interesado en el CRM de Supabase.',
                    parameters: z.object({
                        name: z.string(),
                        email: z.string().optional(),
                        phone: z.string().optional(),
                        interest: z.string().describe('Descripción breve de lo que busca el cliente (ej: fechas, propiedad)'),
                    }),
                    execute: async ({ name, email, phone, interest }) => {
                        const { error } = await supabase.from('leads').insert({
                            name, email, phone, message: interest, status: 'new'
                        });
                        return error ? { status: 'error' } : { status: 'success', message: 'Lead generado para seguimiento del Host.' };
                    },
                }),
                generate_booking_pattern: tool({
                    description: 'Genera el patrón de texto exacto que activa el botón de PayPal en el sitio.',
                    parameters: z.object({
                        villa_id: z.string(),
                        total: z.number(),
                        check_in: z.string(),
                        check_out: z.string(),
                        guests: z.number(),
                    }),
                    execute: async ({ villa_id, total, check_in, check_out, guests }) => {
                        return `[PAYMENT_REQUEST: ${villa_id}, ${total}, ${check_in}, ${check_out}, ${guests}]`;
                    },
                }),
                notify_host_urgent: tool({
                    description: 'Envía una alerta inmediata al Host por problemas con reservas pagadas o soporte urgente.',
                    parameters: z.object({
                        client_name: z.string(),
                        issue_description: z.string(),
                        contact_info: z.string()
                    }),
                    execute: async ({ client_name, issue_description, contact_info }) => {
                        const { error } = await supabase.from('urgent_alerts').insert({
                            name: client_name,
                            message: issue_description,
                            contact: contact_info
                        });
                        return error ? { status: 'error' } : { status: 'success', message: 'Alerta enviada al celular del Host.' };
                    },
                }),
            },
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Servicio en re-sincronización',
            details: error.message
        }), { status: 500 });
    }
}
