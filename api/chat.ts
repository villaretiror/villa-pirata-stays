import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, INITIAL_LOCAL_GUIDE, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

// 1. FORZAR RUNTIME EDGE
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 2. VALIDACIÓN DE API KEY (Prioridad GOOGLE_GENERATIVE_AI_API_KEY)
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is undefined in Edge Runtime');
            return new Response('Configuración de IA incompleta.', { status: 500 });
        }

        // 3. BASE DE CONOCIMIENTO (STRICT CONTEXT)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title} (ID: ${p.id})
Precio: $${p.price}/noche | Limpieza: $${p.cleaning_fee} | Depósito: $${p.security_deposit}
Capacidad: ${p.guests} huéspedes | ${p.bedrooms} habs | ${p.beds} camas | ${p.baths} baños
Ubicación: ${p.location} (${p.address})
Check-in: ${p.policies.checkInTime} | Check-out: ${p.policies.checkOutTime}
Reglas: ${p.policies.houseRules?.join(', ') || 'Consultar'}
Descripción: ${p.description}
`).join('\n---\n');

        const guideInfo = INITIAL_LOCAL_GUIDE.map(cat => `
${cat.category}:
${cat.items.map(item => `- ${item.name}: ${item.desc}`).join('\n')}
`).join('\n');

        const systemsPrompt = `
Eres el Concierge Digital experto de Villa Retiro y Villa Pirata Stays. 
Responde siempre basándote en esta información oficial:

PROPIEDADES:
${propertyInfo}

GUÍA LOCAL:
${guideInfo}

POLÍTICAS:
- Cancelación: ${VILLA_KNOWLEDGE.policies.cancellation}
- Emergencias: ${VILLA_KNOWLEDGE.emergencies.contact}
- Contacto Host: ${HOST_PHONE}

Usa un tono de lujo, profesional y cálido. Si no tienes la información, ofrece contactar al host.
`.trim();

        // 4. EJECUCIÓN CON ESTRUCTURA ESTÁNDAR (v1beta automática por el SDK)
        const result = await streamText({
            model: google('gemini-1.5-flash'), // El SDK maneja el mapeo correcto internamente
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // 5. RESPUESTA DATA STREAM (REQUERIDO POR VERCEL AI SDK LATEST)
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('CHAT_EDGE_ERROR:', error.message);
        return new Response('Error en el servicio de chat. Por favor, intente de nuevo.', { status: 500 });
    }
}
