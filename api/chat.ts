import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../src/constants.js';
import {
    checkAvailabilityWithICal,
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
                supabase.from('properties').select('id, title, description, price, location, images, amenities, house_rules, rating, reviews, subtitle, address, bedrooms, beds, baths, guests, original_price'),
                supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
                supabase.from('salty_family_knowledge').select('key, value')
            ]);

            const propertyTitles: Record<string, string> = {};
            (dbProperties || []).forEach((p: any) => { propertyTitles[p.id] = p.title; });
            
            const activePropertyName = propertyTitles[effectivePropertyId] || "nuestras Villas";
            const mems: Record<string, string> = {};
            (familyKnowledge || []).forEach((m: any) => { 
                // Security Filter: Skip internal data and sensitive credentials
                const internalKeywords = ['strategy', 'margin', 'cost', 'internal', 'airbnb_id', 'pass', 'code', 'door'];
                if (!internalKeywords.some(k => m.key.toLowerCase().includes(k))) {
                    mems[m.key] = m.value;
                }
            });

            const lastUserMsg = [...(rawMessages || [])].reverse().find(m => m.role === 'user')?.content || "";
            const intentCategory = String(lastUserMsg).toLowerCase().includes('reserva') ? 'booking' : 'general';

            const VILLA_CONCIERGE_PROMPT = `
### 🔱 IDENTIDAD DE SALTY (GUEST CONCIERGE):
Eres Salty, el Concierge de Élite de Villa Retiro R & Pirata Family House. Tu misión es asegurar que los huéspedes tengan una estancia legendaria. Habla con sofisticación, calidez y un aura de exclusividad caribeña.

### 👔 REGLAS DE ETIQUETA:
- Usa Emojis Sofisticados (🔱, 🛡️, ✨, 🧭, 🥂) para estructurar. No abuses.
- SIN negritas (**), SIN Markdown técnico.
- Estructura con espacios limpios.

### 🛡️ PROTOCOLO DE PRIVACIDAD Y SEGURIDAD (CRÍTICO):
1. **Confidencialidad Total**: NUNCA reveles procedimientos internos, IDs de base de datos, nombres de otros huéspedes, estrategias de precios, gastos o márgenes de beneficio del negocio.
2. **Filtro de Información**: Eres un puente de hospitalidad, no un analista de datos. Si se pregunta por temas "detrás de escena", reconduce amablemente hacia la experiencia del huésped.
3. **Respaldo Energético**: Vende el Respaldo Solar como un beneficio de lujo ("WiFi y luces siempre activas 🛡️").

### 🧭 RECURSOS:
- WiFi: ${mems.wifi_policy || "Alta velocidad con respaldo solar."}
- Mascotas: ${mems.pet_policy || "Protocolo de seguridad con verja perimetral en Villa Retiro R."}
- Local: ${mems.local_legend_spots || "Cabo Rojo es un paraíso gastronómico."}

💰 PAGOS: Aceptamos Tarjetas, PayPal y ATH Móvil (787-356-0895).

🏠 PROPIEDAD ACTUAL: ${activePropertyName}
📅 TIEMPO: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Puerto_Rico' })}
`.trim();

            const contents: any[] = rawMessages.map(m => {
                let text = "";
                if (typeof m.content === 'string') text = m.content;
                else if (Array.isArray(m.content)) text = m.content.map((p: any) => p.text || "").join("");
                else text = m.text || "";
                return {
                    role: (m.role === 'assistant' || m.sender === 'ai' || m.role === 'model') ? 'model' : 'user',
                    parts: [{ text }]
                };
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
                    name: 'generate_booking_pattern',
                    description: 'Genera cotización oficial y enlace de reserva.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_id: { type: Type.STRING },
                            check_in: { type: Type.STRING },
                            check_out: { type: Type.STRING },
                            guests: { type: Type.NUMBER }
                        },
                        required: ['villa_id', 'check_in', 'check_out']
                    }
                }
            ];

            const toolExecutors: Record<string, Function> = {
                check_availability: async ({ villa_ids, check_in, check_out }: any) => {
                    const resolvedIds = villa_ids.map((id: string) => {
                        const val = String(id).toLowerCase();
                        if (val.includes("retiro")) return VILLA_RETIRO_ID;
                        if (val.includes("pirata")) return PIRATA_HOUSE_ID;
                        return id;
                    });
                    const results = await Promise.all(resolvedIds.map((id: string) => checkAvailabilityWithICal(id, check_in, check_out)));
                    const available = resolvedIds.filter((_id: string, i: number) => results[i].available);
                    return { status: 'success', available_ids: available, available_names: available.map((id: string) => propertyTitles[id] || id) };
                },
                generate_booking_pattern: async ({ villa_id, check_in, check_out, guests = 2 }: any) => {
                    const id = String(villa_id).toLowerCase().includes('retiro') ? VILLA_RETIRO_ID : 
                               String(villa_id).toLowerCase().includes('pirata') ? PIRATA_HOUSE_ID : villa_id;
                    const quote = await applyAIQuote(id, check_in, check_out);
                    
                    const origin = req.headers.get('origin') || "";
                    const baseUrl = origin ? origin.replace(/\/+$/, '') : "https://www.villaretiror.com";
                    
                    return { 
                        status: 'success', 
                        quote, 
                        action_url: `${baseUrl}/booking/${id}?checkIn=${check_in}&checkOut=${check_out}`,
                        payment_allowed: ['Stripe', 'PayPal', 'ATH Móvil'],
                        ath_movil_phone: HOST_PHONE,
                        villa_name: propertyTitles[id] || "Villa",
                        guests: guests,
                        security_deposit: quote.security_deposit || 0
                    };
                }
            };

            let iterations = 0;
            let finalFullText = "";

            while (iterations < 5) {
                const streamResponse = await ai.models.generateContentStream({
                    model: SALTY_MODEL,
                    contents,
                    config: { 
                        systemInstruction: VILLA_CONCIERGE_PROMPT,
                        tools: [{ functionDeclarations }], 
                        temperature: 0.5 
                    }
                });

                let accumulatedParts: any[] = [];
                for await (const chunk of streamResponse) {
                    const candidate = chunk.candidates?.[0];
                    if (!candidate) continue;
                    if (candidate.content?.parts) {
                        for (const part of candidate.content.parts) {
                            accumulatedParts.push(part);
                            if (part.text) {
                                finalFullText += part.text;
                                writeStream('0', part.text);
                            }
                        }
                    }
                }

                const assistantContent = { role: 'model', parts: accumulatedParts };
                const calls = accumulatedParts.filter(p => p.functionCall).map(p => p.functionCall);

                if (calls.length === 0) break;

                contents.push(assistantContent);
                const toolResultParts = [];
                for (const call of calls) {
                    if (!call || !call.name) continue;
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
            writeStream('0', "Salty está recalibrando sus sensores... Intente de nuevo.");
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
