import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, INITIAL_LOCAL_GUIDE, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL: API Key missing');
            return new Response('Auth Error', { status: 500 });
        }

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

Regla: No inventes datos. Tono profesional y cálido.
`.trim();

        const result = await streamText({
            model: google('gemini-1.5-flash'), // El SDK estable maneja esto correctamente
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // Usamos toDataStreamResponse como solicitaste para mayor estabilidad del SDK v4
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('CHAT_ERROR:', error.message);
        return new Response('Error', { status: 500 });
    }
}
