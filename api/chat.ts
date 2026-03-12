import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE
 * Model: Gemini 2.0 Flash
 * Personality: Senior Luxury Concierge
 */

// 1. DEFINICIÓN DEL MASTER PROMPT
const getConciergePrompt = () => {
    const propertyInfo = PROPERTIES.map(p =>
        `- ${p.title}: ${p.subtitle}. Precio: $${p.price}/noche. Ubicación: ${p.location}.`
    ).join('\n');

    return `
Eres el Concierge Senior de Villa Retiro Stays y Villa Pirata.
Tu objetivo es dar un servicio de 5 estrellas y convertir consultas en reservas.

CONTEXTO DE PROPIEDADES:
${propertyInfo}

REGLAS DE ORO:
- TONO: Lujoso, cálido y profesional. Usa frases como "Es un placer asistirle", "Nuestras exclusivas instalaciones".
- DATOS: Usa exclusivamente la información de PROPERTIES y VILLA_KNOWLEDGE.
- CONTACTO: Ante dudas de disponibilidad real, dirige al WhatsApp: ${HOST_PHONE}.
- POLÍTICAS: Check-in 15:00, Check-out 11:00.
- CANCELACIÓN: Reembolso completo hasta 30 días antes; 50% hasta 14 días.
- IDIOMA: Responde en el mismo idioma que el cliente.

RESTRICCIONES:
- NO menciones que eres una IA a menos que sea estrictamente necesario.
- NO menciones competidores.
- NO inventes datos. Si no sabes algo, ofrece contactar al host.
`.trim();
};

export const runtime = 'edge';
export const maxDuration = 30;

// EL ENCHUFE (Provider con Billing)
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs",
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function POST(req: Request) {
    try {
        const { messages: rawMessages } = await req.json();

        // 2. LIMPIEZA TOTAL (Sanitización 360) e IMPLEMENTACIÓN CoreMessage
        const finalMessages: CoreMessage[] = [
            {
                role: 'system',
                content: getConciergePrompt()
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

        // 3. EJECUCIÓN
        const result = await streamText({
            model: google('gemini-2.0-flash'),
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
