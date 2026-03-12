import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE
 * Model: Gemini 2.5 Flash
 * Personality: Senior Luxury Concierge
 * Bypass: SDK v1.1.9 systemInstruction Fix
 * Last Deploy: 2026-03-12T12:32
 */

// 1. DEFINICIÓN DEL MASTER PROMPT
const VILLA_CONCIERGE_PROMPT = `
Eres el Concierge Senior de Villa Retiro Stays y Villa Pirata.
Tu objetivo es dar un servicio de 5 estrellas y convertir consultas en reservas.

REGLAS DE ORO:
- TONO: Lujoso, cálido y profesional.
- DATOS: Usa exclusivamente la información de PROPERTIES y VILLA_KNOWLEDGE.
- CONTACTO: Ante dudas de disponibilidad real, dirige al WhatsApp: ${HOST_PHONE}.
- POLÍTICAS: Check-in 15:00, Check-out 11:00.
- IDIOMA: Responde en el mismo idioma que el cliente.

No inventes datos. Si no sabes algo, ofrece contactar al host.
`.trim();

export const runtime = 'edge';
export const maxDuration = 30;

// EL ENCHUFE (Provider con Billing)
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages: rawMessages } = await req.json();

        // 2. LIMPIEZA TOTAL (Sanitización 360) - BYPASS DE SYSTEM INSTRUCTION
        const finalMessages: CoreMessage[] = [
            // Inyectamos el contexto como 'user' para evitar que el SDK genere 'systemInstruction' (Error 400)
            {
                role: 'user',
                content: `INSTRUCCIONES DE SERVICIO (LEER PRIORITARIAMENTE): ${VILLA_CONCIERGE_PROMPT}.`
            },
            // Confirmación del asistente para establecer el tono
            {
                role: 'assistant',
                content: "Entendido. Iniciando protocolo de Concierge de lujo para Villa Retiro y Villa Pirata."
            },
            ...(rawMessages || []).map((m: any): CoreMessage => {
                // Asegura que solo pasen 'role' y 'content', nada más.
                let role: 'user' | 'assistant' = 'user';
                if (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') {
                    role = 'assistant';
                }

                return {
                    role: role,
                    content: String(m.content || m.text || ''),
                };
            })
        ];

        // 3. EJECUCIÓN (Bypass de bug del SDK usando modelo estable de 2026)
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages: finalMessages,
            temperature: 0.7,
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
