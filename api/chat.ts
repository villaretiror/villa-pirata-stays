import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 📝 BLUEPRINT RADICAL V3: TOTAL COMPATIBILITY (v1beta + CoreMessage)
 * Resolvemos el error 404 regresando a v1beta (donde vive gemini-1.5-flash para esta cuenta)
 * y manteniendo la normalización estricta de mensajes para evitar el error "Invalid prompt".
 */

export const runtime = 'edge';
export const maxDuration = 30;

// Configuración del proveedor a v1beta para asegurar que encuentre el modelo
const googleProvider = createGoogleGenerativeAI({
    apiKey: "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs",
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
});

export async function POST(req: Request) {
    try {
        const { messages: rawMessages } = await req.json();

        // 1. CONSTRUCCIÓN DEL CONTEXTO (Inyectado en USER para evitar líos de esquema)
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemPrompt = `ERES EL CONCIERGE EXPERTO DE VILLA RETIRO Y VILLA PIRATA STAYS.
CONOCIMIENTO: ${propertyInfo}. CONTACTO: ${HOST_PHONE}. POLÍTICAS: ${VILLA_KNOWLEDGE.policies.cancellation}`;

        // 2. NORMALIZACIÓN ESTRICTA A CoreMessage[]
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

        // Mapear los mensajes entrantes limpiando campos no estándar
        if (Array.isArray(rawMessages)) {
            rawMessages.forEach((m: any) => {
                const role = (m.role === 'model' || m.sender === 'ai' || m.role === 'assistant') ? 'assistant' : 'user';
                const content = m.content || m.text || '';

                if (content.trim()) {
                    normalizedMessages.push({ role, content });
                }
            });
        }

        // 3. EJECUCIÓN (Usamos el ID simple que v1beta reconoce mejor)
        const result = await streamText({
            model: googleProvider('gemini-1.5-flash'),
            messages: normalizedMessages,
            temperature: 0.7,
            maxTokens: 1000,
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Error de conexión con el modelo',
            details: error.message
        }), { status: 500 });
    }
}
