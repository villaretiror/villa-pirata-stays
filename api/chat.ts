import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 📝 BLUEPRINT ESTABILIZADO: CORE MESSAGE COMPLIANCE
 * Resolvemos el error "Invalid prompt" asegurando que el array de mensajes 
 * cumpla estrictamente con la interfaz CoreMessage de la SDK ai@4.1.20.
 */

export const runtime = 'edge';
export const maxDuration = 30;

const googleProvider = createGoogleGenerativeAI({
    apiKey: "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs",
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function POST(req: Request) {
    try {
        const { messages: rawMessages } = await req.json();

        // 1. CONSTRUCCIÓN DEL CONTEXTO (Inyectado como primer mensaje USER)
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemPrompt = `ERES EL CONCIERGE EXPERTO DE VILLA RETIRO Y VILLA PIRATA STAYS.
CONOCIMIENTO: ${propertyInfo}. CONTACTO: ${HOST_PHONE}. POLÍTICAS: ${VILLA_KNOWLEDGE.policies.cancellation}`;

        // 2. NORMALIZACIÓN ESTRICTA A CoreMessage[]
        // El SDK requiere un array de objetos con { role: 'user' | 'assistant', content: string }
        const normalizedMessages: any[] = [
            {
                role: 'user',
                content: `[CONFIG]: ${systemPrompt}\n\n¡Hola! Por favor actúa como mi concierge.`
            },
            {
                role: 'assistant',
                content: '¡Hola! Es un placer saludarte. Soy el Concierge de Villa Retiro y Villa Pirata Stays. ¿En qué puedo ayudarte hoy?'
            }
        ];

        // Mapear los mensajes entrantes limpiando cualquier campo no estándar (como 'sender' o 'text')
        if (Array.isArray(rawMessages)) {
            rawMessages.forEach((m: any) => {
                const role = (m.role === 'model' || m.sender === 'ai' || m.role === 'assistant') ? 'assistant' : 'user';
                const content = m.content || m.text || '';

                // Solo añadir si tiene contenido para evitar errores de validación de la SDK
                if (content.trim()) {
                    normalizedMessages.push({ role, content });
                }
            });
        }

        // 3. EJECUCIÓN CON HANDSHAKE V1 (Sin parámetro 'system')
        const result = await streamText({
            model: googleProvider('models/gemini-1.5-flash'),
            messages: normalizedMessages,
            temperature: 0.7,
            maxTokens: 1000,
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Error de validación en mensajes',
            details: error.message
        }), { status: 500 });
    }
}
