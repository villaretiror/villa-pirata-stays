import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../src/constants/index.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    applyAIQuote,
    resolvePropertyId,
    getSaltyPrompt,
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

const SALTY_MODEL = 'gemini-2.5-flash';

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

            const effectivePropertyId = await resolvePropertyId(propertyId || "1081171030449673920", supabase);

            const [{ data: dbProperties }, { data: knowledgeSetting }] = await Promise.all([
                supabase.from('properties').select('*'),
                supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single()
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

            const masterPrompt = getSaltyPrompt('guest', { activePropertyName: activePropertyName });
            const VILLA_CONCIERGE_PROMPT = `${masterPrompt}\n\n🏠 PROPIEDAD: ${activePropertyName}\n📅 TIEMPO: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', year: 'numeric', timeZone: 'America/Puerto_Rico' })}`;

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
                check_availability: async (args: any) => {
                    const villa_ids = args.villa_ids || [args.villa_id] || [args.propertyId];
                    const cin = args.check_in || args.startDate || args.start_date;
                    const cout = args.check_out || args.endDate || args.end_date;
                    const results = await Promise.all(villa_ids.map((id: string) => checkAvailabilityWithICal(id, cin, cout, supabase)));
                    return { status: 'success', results };
                },
                get_available_slots: async (args: any) => {
                    const id = args.villa_id || args.propertyId || '1081171030449673920';
                    const result = await findCalendarGaps(id, supabase);
                    return { status: 'success', ...result };
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
