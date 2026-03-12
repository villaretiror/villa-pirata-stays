import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. CAPTURA LIMPIA DE API KEY (TRIMMED)
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            console.error('CRITICAL: API Key is missing or empty');
            return new Response('Configuración de IA pendiente.', { status: 500 });
        }

        // 2. CONFIGURACIÓN REAL CONFIRMADA (v1beta + Header Explícito)
        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta',
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

Regla: Responde con brevedad y calidez. No inventes datos.
`.trim();

        // 4. MODELO ESTABLE (gemini-1.5-flash)
        const result = await streamText({
            model: googleProvider('gemini-1.5-flash'),
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // 5. RESPUESTA TEXT STREAM (COMPATIBLE CON LECTOR MANUAL DEL FRONTEND)
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('CHAT_V1BETA_ERROR:', error.message);
        return new Response('Servicio temporalmente fuera de línea.', { status: 500 });
    }
}
