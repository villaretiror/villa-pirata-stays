import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. CAPTURA Y SANITIZACIÓN DE API KEY
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            console.error('CRITICAL: API Key is missing');
            return new Response('Auth Error', { status: 500 });
        }

        // 2. CONFIGURACIÓN LIMPIA DEL PROVEEDOR
        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
            headers: {
                'x-goog-api-key': apiKey,
            }
        });

        // 3. BASE DE CONOCIMIENTO (CONCIERGE)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title}
Precio: $${p.price}/noche | Capacidad: ${p.guests}
Check-in: ${p.policies.checkInTime} | Check-out: ${p.policies.checkOutTime}
WiFi: ${p.policies.wifiName}
`).join('\n---\n');

        const systemsPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Responde basándote en esta base de datos:
${propertyInfo}

Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}
Contacto Host: ${HOST_PHONE}

Regla: No inventes datos. Tono profesional, cálido y conciso.
`.trim();

        // 4. EJECUCIÓN CON PREFIJO PARA ESTABILIDAD
        const result = await streamText({
            model: googleProvider('models/gemini-1.5-flash'),
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // 5. RESPUESTA TEXT STREAM (COMPATIBLE CON FRONTEND)
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('CHAT_AUDIT_ERROR:', error.message);
        return new Response('Error de conexión con el servicio de IA.', { status: 500 });
    }
}
