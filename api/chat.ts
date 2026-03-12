import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

// Forzamos Node.js y la región de Frankfurt para saltar bloqueos geográficos de Google en Virginia
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. LIMPIEZA ABSOLUTA DE API KEY (Quitar comillas accidentales de Vercel)
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            console.error('[CHAT_ERROR]: API Key is missing in environment variables');
            return new Response('Configuración de API pendiente en el servidor.', { status: 500 });
        }

        // 2. CONFIGURACIÓN DE PROVEEDOR (V1 ESTABLE)
        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1',
        });

        // 3. BASE DE CONOCIMIENTO (QUICK CONTEXT)
        const propertyInfo = PROPERTIES.map(p => `Propiedad: ${p.title} - $${p.price}/noche`).join('\n');

        const systemsPrompt = `
Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. 
Info: ${propertyInfo}
Contacto: ${HOST_PHONE} | Políticas: ${VILLA_KNOWLEDGE.policies.cancellation}
Regla: No inventes datos. Responde corto y profesional.
`.trim();

        // 4. INYECCIÓN DE CONTEXTO EN MENSAJES (Para compatibilidad con v1 que no admite systemInstruction directo)
        const finalMessages = [
            { role: 'user', content: `[CONTEXTO DE SISTEMA]:\n${systemsPrompt}` },
            ...messages.slice(-15).map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : (m.role === 'system' ? 'user' : m.role),
                content: m.content
            }))
        ];

        // 5. LLAMADA AL MODELO (Probamos con Flash)
        const result = await streamText({
            model: googleProvider('gemini-1.5-flash'),
            messages: finalMessages as any,
        });

        // 6. RETORNO DE TEXTO PLANO (Imprescindible para el decoder del frontend)
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[CHAT_V1_ERROR]:', error.message);

        // Si hay un error de "location not supported", intentamos una respuesta amable
        if (error.message.includes('location') || error.message.includes('403')) {
            return new Response('Nuestro concierge está en mantenimiento regional. Por favor, contáctenos por WhatsApp.', { status: 200 });
        }

        return new Response('Error de conexión con el asistente.', { status: 500 });
    }
}
