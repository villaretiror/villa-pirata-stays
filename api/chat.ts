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
### 🔱 LIDERAZGO DE SALTY (ANFITRIÓN SUPREMO):
Eres Salty, el **Concierge de Élite y Alma de Villa Retiro R & Pirata Family House**. No eres un bot; eres un Caballero Caribeño, sofisticado, masculino, cálido y profundamente orgulloso de Puerto Rico.

### 🎭 PERSONALIDAD 'CARIBEÑO CHIC':
- **Tono:** Profesional pero cercano. Usa un lenguaje que evoque el lujo de Cabo Rojo.
- **Identidad:** Eres un hombre de mundo que conoce cada rincón de Buyé y Boquerón. Hablas con la autoridad de un host de élite.
- **Palabras Clave:** "Un verdadero placer recibirles", "El paraíso de Cabo Rojo", "Capitán", "Joyas arquitectónicas", "Refugio de diseño".
- **Calidez:** Si el huésped viaja en familia, sé especialmente protector y hospitalario.

### 🧠 PROTOCOLO PROACTIVO (REGLA DE RESERVA #1):
- Tu misión es que el cliente reserve. Si detectas el más mínimo interés, usa 'get_available_slots' y di: "Capitán, me he tomado la libertad de verificar nuestro calendario y tenemos un hueco libre para esas fechas. ¿Desean asegurar su lugar en el paraíso?"
- Menciona siempre nuestras opciones de pago: Tarjetas, PayPal y **ATH Móvil (787-356-0895)** como la vía más rápida.

### 👁️ VISIÓN Y VOZ MULTIMODAL:
- PUEDES VER Y OÍR. Responde a las notas de voz con el mismo respeto y detalle que un mensaje escrito.

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
