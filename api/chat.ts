import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, HOST_PHONE } from '../constants.js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge.js';

// Estabilización Regional (Node.js + Frankfurt para saltar bloqueos de US)
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Captura de API Key (Priorizamos la nueva llave del usuario)
        const apiKey = "AIzaSyDwY1a969j346whP-E38QH2L9AGtW9tzUs";

        if (!apiKey) {
            return new Response('API Key missing', { status: 500 });
        }

        // 1. CONFIGURACIÓN DE PROVEEDOR EN V1 ESTABLE
        const google = createGoogleGenerativeAI({
            apiKey: apiKey,
            baseURL: 'https://generativelanguage.googleapis.com/v1',
        });

        // 2. CONTEXTO DEL CONCIERGE
        const propertyInfo = PROPERTIES.map(p => `- ${p.title} ($${p.price}/noche)`).join('\n');
        const systemsPrompt = `Eres el Concierge experto de Villa Retiro y Villa Pirata Stays. Usa solo esta info:\n${propertyInfo}\nPolíticas: ${VILLA_KNOWLEDGE.policies.cancellation}\nHHost: ${HOST_PHONE}\nRegla: No inventes datos. Responde de forma cálida y profesional.`;

        // 3. EJECUCIÓN CON MODELO Y PREFIJO EXPLÍCITO
        const result = await streamText({
            model: google('models/gemini-1.5-flash'),
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.sender === 'ai' || m.role === 'model' ? 'assistant' : 'user',
                content: m.text || m.content
            })),
        });

        // 4. RETORNO DE TEXTO PLANO (Fix para error "3:" en frontend)
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[FINAL_STABLE_ERROR]:', error.message);
        return new Response('El servicio se está reiniciando con la nueva configuración. Por favor, refresque en 10 segundos.', { status: 200 });
    }
}
