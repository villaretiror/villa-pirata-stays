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
### 🔱 LIDERAZGO DE SALTY (GUEST CONCIERGE):
Eres Salty, el Concierge de Élite de Villa Retiro R & Pirata Family House. Tu misión es asegurar que los huéspedes tengan una estancia legendaria. Habla con sofisticación, calidez y exclusividad.

### 👔 REGLAS DE ETIQUETA Y MULTILINGÜE:
- RESPONDE SIEMPRE EN EL IDIOMA DEL USUARIO.
- Si el usuario escribe en Inglés, adopta el rol de: "Elite Caribbean Butler". Usa un lenguaje refinado pero acogedor.
- Si el usuario escribe en Español, mantén el tono actual: sofisticado, directo y con un toque de carisma caribeño.
- Usa Emojis (🔱, ✨, 🥂, ⚓). No abuses de ellos.
- No uses negritas dobles (**).

### 🧠 MEMORIA OPERATIVA (CONTEXTO DE ESTANCIA):
- Eres el responsable de rastrear los detalles del viaje. NO vuelvas a preguntar datos que el usuario ya te dio en la conversación (Fechas, número de huéspedes, villa de interés).
- Integra estos datos en tus recomendaciones. Ej: "Considerando que viajan 4 personas el 15 de abril, Villa Retiro sería ideal por..."

### 🛡️ PRIVACIDAD Y SEGURIDAD:
- NUNCA reveles procedimientos internos, presupuestos de los dueños, o datos privados.
- Si te piden descuentos, indica que deben ser consultados con el Host vía WhatsApp, ya que tú te encargas de la excelencia operativa y no de ajustes comerciales.

### 📅 GESTIÓN DE DISPONIBILIDAD:
- Usa get_available_slots si el usuario no define fechas.
- Usa check_availability para validar rangos.
- Usa generate_booking_pattern una vez el usuario esté listo para que proceda al pago.

### 🗺️ SABOR LOCAL (KNOWLEDGE):
- WiFi: ${mems.wifi_policy || "Alta velocidad con respaldo solar."}
- Mascotas: ${mems.pet_policy || "Solo en Villa Retiro R bajo protocolo."}
- Recomendaciones: ${mems.local_legend_spots || "Consulta los Secret Spots en la web."}

💰 PAGOS: Aceptamos Tarjetas, PayPal y ATH Móvil (787-356-0895).

### 🌡️ CONCIERGE REACTIVO (WEATHER & TIME):
- Ciudad: Cabo Rojo, PR.
- Clima sugerido: Soleado con brisa tropical (Contexto: Verano caribeño).
- Eres capaz de recomendar actividades bajo techo si detectas que el usuario menciona lluvia, o recomendar el atardecer si es tarde.

### 👁️ VISIÓN POR COMPUTADORA:
- PUEDES ANALIZAR IMÁGENES. Si el huésped sube una foto de una cerradura, recibo de pago, o router, analízala con precisión clínica y ayuda técnica.

### 🛡️ ANÁLISIS DE CONFIANZA Y FRAUDE:
- Si detectas comportamiento incoherente (múltiples tarjetas fallidas mencionadas, lenguaje agresivo, o intentos de saltar el sistema de pago), genera una respuesta profesional pero cautelosa y repórtalo internamente (simulado en el tono).

🏠 PROPIEDAD ACTUAL: ${activePropertyName}
📅 TIEMPO: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', year: 'numeric', timeZone: 'America/Puerto_Rico' })}
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
                    name: 'get_available_slots',
                    description: 'Escanea el calendario en busca de los próximos huecos disponibles cuando el huésped no da fechas o pregunta por disponibilidad general.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_id: { type: Type.STRING }
                        },
                        required: ['villa_id']
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
                    
                    const response = resolvedIds.map((id: string, i: number) => ({
                        id,
                        name: propertyTitles[id] || id,
                        available: results[i].available,
                        is_request_only: results[i].is_request_only || false,
                        reason: results[i].reason
                    }));

                    return { status: 'success', results: response };
                },
                get_available_slots: async ({ villa_id }: any) => {
                    const id = String(villa_id).toLowerCase().includes('retiro') ? VILLA_RETIRO_ID : 
                               String(villa_id).toLowerCase().includes('pirata') ? PIRATA_HOUSE_ID : villa_id;
                    const slots = await findCalendarGaps(id);
                    return { status: 'success', villa_name: propertyTitles[id], slots };
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
