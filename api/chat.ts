import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 📝 BLUEPRINT MAESTRO: NORMALIZACIÓN TOTAL DE PAYLOAD
 * Resolvemos el error 400 'systemInstruction' moviendo las instrucciones 
 * a un mensaje de tipo 'user' al inicio de la conversación.
 * Esto evita que el SDK intente usar el campo rechazado por el endpoint v1.
 */

export const runtime = 'edge';
export const maxDuration = 30;

// Configuración de blindaje para el proveedor (v1 Estable)
const googleProvider = createGoogleGenerativeAI({
    apiKey: "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs",
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. CONSTRUCCIÓN DEL CONTEXTO
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemPrompt = `
ERES EL CONCIERGE EXPERTO DE VILLA RETIRO Y VILLA PIRATA STAYS.
INSTRUCCIONES CRÍTICAS:
- Bases de conocimiento: ${propertyInfo}
- Contacto: ${HOST_PHONE}
- Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}
- Tono: Lujoso, cálido y profesional.
- Regla: No inventes datos. Si no sabes, ofrece el contacto del host.
`.trim();

        // 2. NORMALIZACIÓN DE MENSAJES (BYPASS ERROR 400)
        // Eliminamos el rol 'system' completamente para evitar que el SDK genere el campo 'systemInstruction'.
        const normalizedMessages = [
            {
                role: 'user',
                content: `[SISTEMA]: ${systemPrompt}\n\n[MENSAJE DEL HUÉSPED]: Empecemos la conversación. Preséntate brevemente.`
            },
            {
                role: 'assistant',
                content: '¡Hola! Es un placer saludarte. Soy el Concierge de Villa Retiro y Villa Pirata Stays. ¿En qué puedo ayudarte hoy con tu estancia?'
            },
            ...messages.map((m: any) => ({
                role: m.role === 'model' || m.sender === 'ai' ? 'assistant' : 'user',
                content: m.content || m.text
            }))
        ];

        // 3. EJECUCIÓN (Uso de models/gemini-1.5-flash para máxima precisión en v1)
        const result = await streamText({
            model: googleProvider('models/gemini-1.5-flash'),
            messages: normalizedMessages as any,
            temperature: 0.7,
            maxTokens: 1000,
        });

        // 4. RETORNO DE STREAM LIMPIO
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Incompatibilidad de esquema resuelta. Reintentando...',
            details: error.message
        }), { status: 500 });
    }
}
