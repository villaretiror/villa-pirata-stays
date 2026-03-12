import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

/**
 * 📝 BLUEPRINT DEFINITIVO: NORMALIZACIÓN DE PAYLOAD (V1 STABLE)
 * Bypass del error 400 'systemInstruction' inyectando el prompt en el stack de mensajes.
 */

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. EXTRACCIÓN Y LIMPIEZA DE API KEY (Prioridad: Nueva llave del proyecto limpio)
        // Nota: Se usa la llave explícita compartida por el usuario para asegurar el handshake inmediato.
        const apiKey = "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs";

        if (!apiKey) {
            console.error('[FATAL_CHAT_ERROR]: API Key missing');
            return new Response(JSON.stringify({ error: 'Configuración de IA pendiente' }), { status: 500 });
        }

        // Configuración del entorno del proceso para que el SDK use la llave correcta
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;

        // 2. CONSTRUCCIÓN DEL SYSTEM PROMPT (CONCIERGE DE LUJO)
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Básate exclusivamente en esta base de conocimientos:
${propertyInfo}
Contacto directo: ${HOST_PHONE}
Políticas y Cancelaciones: ${VILLA_KNOWLEDGE.policies.cancellation}

REGLAS DE ORO:
- No inventes datos que no estén aquí.
- Mantén un tono lujoso, profesional y cálido.
- Si no sabes algo, ofrece contactar al host directamente.
`.trim();

        // 3. BYPASS DEL ERROR 400 (Invalid Schema)
        // Inyectamos el systemPrompt como el primer mensaje del stack con rol 'system'.
        // Esto evita que el SDK envíe el campo conflictivo 'systemInstruction'.
        const normalizedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({
                role: m.role === 'model' || m.sender === 'ai' ? 'assistant' : 'user',
                content: m.content || m.text
            }))
        ];

        // 4. EJECUCIÓN DEL HANDSHAKE (Endpoint v1 Stable via SDK)
        const result = await streamText({
            model: google('gemini-1.5-flash'), // El SDK v1.1.9 mapea esto correctamente a /v1
            messages: normalizedMessages as any,
            temperature: 0.7,
            maxTokens: 1000,
        });

        // 5. OPTIMIZACIÓN DE RESPUESTA (toTextStreamResponse)
        // Mantenemos TextStream para asegurar que el frontend (decoder manual) renderice texto puro sin prefijos "3:".
        return result.toTextStreamResponse();

    } catch (error: any) {
        // Log detallado para auditoría en el Dashboard de Vercel
        console.error('[FATAL_CHAT_ERROR]:', error.message);
        return new Response(JSON.stringify({
            error: 'Incompatibilidad de esquema detectada',
            details: error.message
        }), { status: 500 });
    }
}
