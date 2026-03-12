import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 📝 BLUEPRINT DEFINITIVO V2: PROVIDER HARDENING
 * Pasamos la llave directamente al constructor y forzamos v1 estable para evitar 
 * las restricciones de lectura en el Edge Runtime de Vercel.
 */

export const runtime = 'edge';
export const maxDuration = 30;

// Configuración del proveedor fuera del handler para eficiencia
const googleProvider = createGoogleGenerativeAI({
    apiKey: "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs",
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. CONSTRUCCIÓN DEL SYSTEM PROMPT (CONCIERGE DE LUJO)
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Básate exclusivamente en esta base de conocimientos:
${propertyInfo}
Contacto directo: ${HOST_PHONE}
Políticas y Cancelaciones: ${VILLA_KNOWLEDGE.policies.cancellation}

REGLAS DE ORO:
- No inventes datos que no estén aquí.
- Mantén un tono lujoso, profesional y cálido.
- Si no sabes algo, ofrece contactar al host directamente.
`.trim();

        // 2. BYPASS DEL ERROR 400 (Invalid Schema)
        // Inyectamos el systemPrompt como el primer mensaje del stack con rol 'system'.
        const normalizedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({
                role: m.role === 'model' || m.sender === 'ai' ? 'assistant' : 'user',
                content: m.content || m.text
            }))
        ];

        // 3. EJECUCIÓN DEL HANDSHAKE (Endpoint v1 Stable)
        const result = await streamText({
            model: googleProvider('gemini-1.5-flash'),
            messages: normalizedMessages as any,
            temperature: 0.7,
            maxTokens: 1000,
        });

        // 4. RETORNO DE TEXTO PLANO
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Servicio en actualización regional',
            details: error.message
        }), { status: 500 });
    }
}
