import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

// 1. PROTOCOLO DE RESILIENCIA (Runtime Node.js para estabilidad regional)
export const runtime = 'nodejs';
export const preferredRegion = 'fra1'; // Frankfurt para saltar bloqueos de US iad1
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Limpieza de API Key
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            return new Response('API Key missing', { status: 500 });
        }

        // 2. FORZADO DE ENDPOINT V1 (Evita el 404 de v1beta)
        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1',
        });

        // 3. CONTEXTO DEL CONCIERGE
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemsPrompt = `Eres el Concierge de Villa Retiro/Pirata. Info:\n${propertyInfo}\nPolíticas: ${VILLA_KNOWLEDGE.policies.cancellation}\nHHost: ${HOST_PHONE}\nRegla: Responde corto. No inventes datos.`;

        // 4. INYECCIÓN DE CONTEXTO (Workaround para v1)
        const finalMessages = [
            { role: 'user', content: `[SYSTEM_DIRECTIVE]: ${systemsPrompt}` },
            ...messages.slice(-10).map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : (m.role === 'system' ? 'user' : m.role),
                content: m.content
            }))
        ];

        // 5. SAFE STREAM INITIALIZATION
        const result = await streamText({
            model: googleProvider('gemini-1.5-flash'),
            messages: finalMessages as any,
        });

        // 6. RESULTADO EN TEXTO PLANO (Fix para error "3:")
        // Esto elimina los prefijos del protocolo y envía texto puro al frontend.
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[SAFE_STREAM_ERROR]:', error.message);
        return new Response('Servicio en mantenimiento regional.', { status: 200 });
    }
}
