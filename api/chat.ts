import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. CAPTURA Y SANITIZACIÓN DE API KEY (TRIMMED)
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            console.error('CRITICAL: API Key is missing');
            return new Response('Auth Error', { status: 500 });
        }

        // 2. FORZADO A VERSIÓN V1 ESTABLE (Mata el 404 de v1beta)
        const google = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1',
            headers: {
                'x-goog-api-key': apiKey,
            }
        });

        // 3. BASE DE CONOCIMIENTO (STRICT CONTEXT)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title}
Precio: $${p.price}/noche | Capacidad: ${p.guests}
Check-in: ${p.policies.checkInTime} | Check-out: ${p.policies.checkOutTime}
`).join('\n---\n');

        const systemsPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Usa solo esta base de datos:
${propertyInfo}

Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}
Contacto: ${HOST_PHONE}

Regla: No inventes datos. Tono profesional y cálido.
`.trim();

        // 4. PREVENCIÓN DE CARGA CORRUPTA + WORKAROUND DE SISTEMA (Soporte v1)
        // La versión v1 no acepta 'systemInstruction' nativamente vía SDK en algunas versiones críticas.
        // Prependemos el prompt como el primer mensaje del usuario.
        const chatHistory = [
            {
                role: 'user',
                content: `INSTRUCCIONES DE SISTEMA (CONSERVAR SIEMPRE):\n${systemsPrompt}\n--- (FIN DE INSTRUCCIONES) ---`
            },
            ...messages.slice(-20).map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            }))
        ];

        // 5. MODELO ESTABLE SIN 'LATEST'
        const result = await streamText({
            model: google('gemini-1.5-flash'),
            // system: systemsPrompt, // Eliminado para evitar error 400 en v1
            messages: chatHistory as any,
        });

        // 6. RESPUESTA TEXT STREAM (COMPATIBLE CON FRONTEND)
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('CHAT_V1_ERROR:', error.message);
        return new Response('Mantenimiento', { status: 500 });
    }
}
