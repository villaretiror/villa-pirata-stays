import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, INITIAL_LOCAL_GUIDE, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // VALIDACIÓN DE API KEY (Buscamos ambas posibles variables)
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is undefined');
            return new Response('Configuración de IA pendiente en Vercel.', { status: 500 });
        }

        // 1. CONFIGURACIÓN BLINDADA (FORZANDO V1 Y HEADER DE SEGURIDAD)
        const google = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1',
            headers: {
                'x-goog-api-key': apiKey,
            }
        });

        // Sistema de conocimiento (Concierge)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title}
Precio: $${p.price}/noche | Capacidad: ${p.guests}
Check-in: ${p.policies.checkInTime} | Check-out: ${p.policies.checkOutTime}
WiFi: ${p.policies.wifiName}
`).join('\n---\n');

        const systemsPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Usa solo esta base de datos:
${propertyInfo}

Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}
Contacto: ${HOST_PHONE}

Regla: No inventes datos. Tono profesional y cálido. Si no tienes la info, ofrece contactar al host.
`.trim();

        // 2. PRUEBA DE FUEGO CON MODELO PRO (Más capacidad y estabilidad en iad1)
        const result = await streamText({
            model: google('gemini-1.5-pro'),
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // 3. RESPUESTA DATA STREAM (ESTÁNDAR SDK V4)
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('CHAT_V1_ERROR:', error.message);
        return new Response('El servicio de chat está en mantenimiento técnico. Por favor, intente de nuevo en unos minutos.', { status: 500 });
    }
}
