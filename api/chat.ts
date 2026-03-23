import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../src/constants.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    applyAIQuote,
    } from '../src/aiServices.js';

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
});

const SALTY_MODEL = 'gemini-3-flash-preview';

const chatRequestSchema = z.object({
    messages: z.array(z.any()),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    propertyId: z.string().optional().nullable(),
    currentUrl: z.string().optional(),
    inStay: z.boolean().optional()
});

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeStream = (type: string, data: any) => {
        const payload = JSON.stringify(data);
        writer.write(encoder.encode(`${type}:${payload}\n`));
    };

    (async () => {
        try {
            const body = await req.json();
            const parsedBody = chatRequestSchema.parse(body);
            const { messages: rawMessages, sessionId, userId: bodyUserId, propertyId, currentUrl } = parsedBody;

            const VILLA_RETIRO_ID = "1081171030449673920";
            const PIRATA_HOUSE_ID = "42839458";
            let effectivePropertyId = VILLA_RETIRO_ID;
            if (propertyId) {
                if (propertyId.length > 10 && !isNaN(Number(propertyId))) effectivePropertyId = propertyId;
                else if (propertyId.toLowerCase().includes('retiro')) effectivePropertyId = VILLA_RETIRO_ID;
                else if (propertyId.toLowerCase().includes('pirata')) effectivePropertyId = PIRATA_HOUSE_ID;
            }

            const [{ data: dbProperties }, { data: knowledgeSetting }, { data: familyKnowledge }] = await Promise.all([
                supabase.from('properties').select('*'),
                supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
                supabase.from('salty_family_knowledge').select('key, value')
            ]);

            const propertyTitles: Record<string, string> = {};
            (dbProperties || []).forEach((p: any) => { propertyTitles[p.id] = p.title; });
            const activePropertyName = propertyTitles[effectivePropertyId] || "nuestras Villas";

            const lastUserMsg = [...(rawMessages || [])].reverse().find(m => m.role === 'user')?.content || "";
            const intentCategory = String(lastUserMsg).toLowerCase().includes('reserva') ? 'booking' : 'general';
            
            // 🎙️ MULTIMODAL DETECTION
            const hasAudio = rawMessages.some((m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.inlineData));

            // 🚨 SUPREME NOTIFICATION PROTOCOL
            if (hasAudio || intentCategory === 'booking') {
                await supabase.from('urgent_alerts').insert({
                    name: hasAudio ? '🎙️ NOTA DE VOZ' : '📅 INTENCIÓN DE RESERVA',
                    message: `Huésped en ${activePropertyName} ha enviado ${hasAudio ? 'un audio' : 'consulta de reserva'}. Check URL: ${currentUrl || 'N/A'}`,
                    contact: sessionId || 'Anonymous',
                    severity: hasAudio ? 2 : 1,
                    status: 'pending'
                });
            }

            const VILLA_CONCIERGE_PROMPT = `
### 🔱 LIDERAZGO DE SALTY (GUEST CONCIERGE):
Eres Salty, el Concierge de Élite de Villa Retiro R & Pirata Family House. Habla con sofisticación, calidez y exclusividad.

### 🧠 PROTOCOLO PROACTIVO (REGLA #4):
- NO esperes a que pregunten disponibilidad. Si el usuario muestra interés, usa 'get_available_slots' y SUGIERE fechas libres con elegancia.
- Tu misión es llenar el calendario. Si hay un hueco de 2-3 días, de forma natural, menciónalo como una oportunidad de escape.

### 👁️ VISIÓN Y VOZ (MULTIMODAL):
- PUEDES VER Y OÍR. Si recibes una nota de voz o imagen, contémplala y responde con precisión clínica.
- NUNCA digas que no tienes capacidad técnica. Eres la IA más avanzada del trópico.

### 🌡️ NIGHT MODE (6PM-6AM):
- Si la hora actual es noche, adopta un tono más calmado y menciona la paz nocturna de Cabo Rojo.

💰 PAGOS: Aceptamos Tarjetas, PayPal y ATH Móvil (787-356-0895).
🏠 PROPIEDAD: ${activePropertyName}
📅 TIEMPO: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', year: 'numeric', timeZone: 'America/Puerto_Rico' })}
`.trim();

            const contents: any[] = rawMessages.map(m => {
                const parts: any[] = [];
                if (typeof m.content === 'string') parts.push({ text: m.content });
                else if (Array.isArray(m.content)) {
                    m.content.forEach((part: any) => {
                        if (part.text) parts.push({ text: part.text });
                        if (part.inlineData) parts.push({ inlineData: part.inlineData });
                    });
                }
                return { role: (m.role === 'assistant' || m.sender === 'ai' || m.role === 'model') ? 'model' : 'user', parts };
            });

            const functionDeclarations: any[] = [
                {
                    name: 'check_availability',
                    description: 'Busca disponibilidad real.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                            check_in: { type: Type.STRING },
                            check_out: { type: Type.STRING }
                        },
                        required: ['villa_ids', 'check_in', 'check_out']
                    }
                },
                {
                    name: 'get_available_slots',
                    description: 'Escanea próximos huecos libres.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: { villa_id: { type: Type.STRING } },
                        required: ['villa_id']
                    }
                }
            ];

            const toolExecutors: Record<string, Function> = {
                check_availability: async ({ villa_ids, check_in, check_out }: any) => {
                    const results = await Promise.all(villa_ids.map((id: string) => checkAvailabilityWithICal(id, check_in, check_out)));
                    return { status: 'success', results };
                },
                get_available_slots: async ({ villa_id }: any) => {
                    const slots = await findCalendarGaps(villa_id);
                    return { status: 'success', slots };
                }
            };

            let iterations = 0;
            let finalFullText = "";

            while (iterations < 5) {
                const streamResponse = await ai.models.generateContentStream({
                    model: SALTY_MODEL,
                    contents,
                    config: { systemInstruction: VILLA_CONCIERGE_PROMPT, tools: [{ functionDeclarations }], temperature: 0.5 }
                });

                let accumulatedParts: any[] = [];
                for await (const chunk of streamResponse) {
                    const candidate = chunk.candidates?.[0];
                    if (!candidate?.content?.parts) continue;
                    for (const part of candidate.content.parts) {
                        accumulatedParts.push(part);
                        if (part.text) {
                            finalFullText += part.text;
                            writeStream('0', part.text);
                        }
                    }
                }

                const assistantContent = { role: 'model', parts: accumulatedParts };
                const calls = accumulatedParts.filter(p => p.functionCall).map(p => p.functionCall);
                if (calls.length === 0) break;

                contents.push(assistantContent);
                const toolResultParts = [];
                for (const call of calls) {
                    writeStream('a', call);
                    const executor = toolExecutors[call.name];
                    const result = executor ? await executor(call.args || {}) : { error: "Tool not found" };
                    writeStream('p', { name: call.name, response: { result }, id: call.id });
                    toolResultParts.push({ functionResponse: { name: call.name, response: { result }, id: call.id } });
                }
                contents.push({ role: 'user', parts: toolResultParts });
                iterations++;
            }

            if (sessionId && finalFullText) {
                await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'ai', text: finalFullText, intent: intentCategory });
            }
            writer.close();
        } catch (err: any) {
            console.error("Chat API Error:", err);
            writeStream('0', "Salty está recalibrando sus sensores...");
            writer.close();
        }
    })();

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff'
        }
    });
}
