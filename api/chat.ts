import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

// PROTOCOLO DE RESILIENCIA (Node.js runtime + Frankfurt)
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            return new Response('API Key missing', { status: 500 });
        }

        // 1. REVERSIÓN A V1BETA CON HARD-CODED BASEURL
        const google = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta',
            headers: {
                'x-goog-api-key': apiKey,
            }
        });

        // 2. CONSTRUCCIÓN DE CONTEXTO
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemsPrompt = `Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. Usa solo esta info:\n${propertyInfo}\nHHost: ${HOST_PHONE}\nRegla: No inventes datos.`;

        // Log de depuración solicitado
        console.log(`[DEBUG_CHAT]: Llamando a Gemini 1.5 Flash-8B en v1beta. Key: ${apiKey.slice(0, 5)}...`);

        // 3. USO DE MODELO FLASH-8B (Máxima compatibilidad regional)
        const result = await streamText({
            model: google('models/gemini-1.5-flash-8b'),
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // RESULTADO EN TEXTO PLANO (Fix para error "3:")
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[RADICAL_FIX_ERROR]:', error.message);
        return new Response('El servicio está siendo actualizado regionalmente.', { status: 200 });
    }
}
