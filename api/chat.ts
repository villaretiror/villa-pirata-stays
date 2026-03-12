import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * FORCED HANDSHAKE CONFIGURATION
 * Direct targeting of the v1 stable endpoint to resolve 404/v1beta issues.
 */
const googleProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

// Cambiamos a Node.js runtime y forzamos región para evitar bloqueos geográficos
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Check if API Key exists
        if (!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY)) {
            console.error('[CHAT_ERROR]: API Key is missing');
            return new Response(JSON.stringify({ error: 'Authentication missing' }), { status: 500 });
        }

        // Base de Conocimiento (Concierge)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title}
Precio: $${p.price}/noche | Capacidad: ${p.guests}
`).join('\n---\n');

        const systemsPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Básate siempre en esta información:
${propertyInfo}
Contacto Host: ${HOST_PHONE}
Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}

Regla: Responde con elegancia y precisión. No inventes datos.
`.trim();

        // Inyectar contexto en los mensajes para compatibilidad total con v1
        const finalMessages = [
            { role: 'user', content: `Contexto del sistema:\n${systemsPrompt}` },
            ...messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            }))
        ];

        const result = await streamText({
            // Forced stable model identifier
            model: googleProvider('gemini-1.5-flash'),
            messages: finalMessages,
        });

        // Usamos TextStream para que el frontend (con decoder manual) pueda leerlo sin prefijos de protocolo.
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('[CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({ error: 'Endpoint resolution failed' }), { status: 500 });
    }
}
