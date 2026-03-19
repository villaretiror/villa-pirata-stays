import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../src/constants.js';
import {
    checkAvailabilityWithICal,
    logAbandonmentLead,
    getPaymentVerificationStatus,
    findCalendarGaps,
    handleCrisisAlert,
    applyAIQuote,
    createTemporaryHold,
    } from '../src/aiServices.js';
import { SecurityGovernanceService } from '../src/services/SecurityGovernanceService.js';
import { NotificationService } from '../src/services/NotificationService.js';

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

    // Vercel AI SDK Data Stream Protocol Helper
    const writeStream = (type: string, data: any) => {
        const payload = (type === '0' && typeof data === 'string') ? JSON.stringify(data) : JSON.stringify(data);
        writer.write(encoder.encode(`${type}:${payload}\n`));
    };

    (async () => {
        try {
            const body = await req.json();
            const parsedBody = chatRequestSchema.parse(body);
            const { messages: rawMessages, sessionId, userId: bodyUserId, propertyId, currentUrl, inStay } = parsedBody;

            // --- 🛡️ SECURITY & CONTEXT ---
            const authHeader = req.headers.get('Authorization');
            let verifiedUserId: string | null = null;
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const { data: { user: sbUser } } = await supabase.auth.getUser(token);
                    if (sbUser) verifiedUserId = sbUser.id;
                } catch (err) {}
            }
            const userId = (bodyUserId && verifiedUserId === bodyUserId) ? bodyUserId : (verifiedUserId || undefined);

            const VILLA_RETIRO_ID = "1081171030449673920";
            const PIRATA_HOUSE_ID = "42839458";
            let effectivePropertyId = VILLA_RETIRO_ID;
            if (propertyId) {
                if (propertyId.length > 10 && !isNaN(Number(propertyId))) effectivePropertyId = propertyId;
                else if (propertyId.toLowerCase().includes('retiro')) effectivePropertyId = VILLA_RETIRO_ID;
                else if (propertyId.toLowerCase().includes('pirata')) effectivePropertyId = PIRATA_HOUSE_ID;
            }

            const [{ data: dbProperties }, { data: knowledgeSetting }, { data: saltySetting }, { data: familyKnowledge }, { data: availabilityRules }] = await Promise.all([
                supabase.from('properties').select('*'),
                supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
                supabase.from('system_settings').select('value').eq('key', 'salty_config').single(),
                supabase.from('salty_family_knowledge').select('key, value'),
                supabase.from('availability_rules').select('*')
            ]);

            const propertyTitles: Record<string, string> = {};
            (dbProperties || []).forEach((p: any) => { propertyTitles[p.id] = p.title; });
            const activePropertyName = propertyTitles[effectivePropertyId] || "nuestras Villas";
            const villaKnowledge = knowledgeSetting?.value || {};
            
            const lastUserMsg = [...(rawMessages || [])].reverse().find(m => m.role === 'user')?.content || "";
            const intentCategory = String(lastUserMsg).toLowerCase().includes('reserva') ? 'booking' : 'general';

            // --- 🔱 RESTORED DEEP PROMPT ---
            const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma y Consultor Ejecutivo de Villa & Pirata Stays en Cabo Rojo, PR. 🏝️
No eres un bot; eres el anfitrión caribeño que todos desean: sofisticado, protector y con un conocimiento absoluto de la zona.

### TU IDENTIDAD EJECUTIVA:
- **Tono**: Cálido pero profesional. Exclusividad y relajación. Ocasionalmente emojis tropicales (🏝️, 🌊, 🥥).
- **Misión**: Convertir consultas en Reservas Confirmadas. Eres proactivo.
- **Autoridad**: Conoces cada rincón de Villa Retiro y Pirata Family. No inventes datos.

### 🏠 CONTEXTO DE LA UNIDAD ACTUAL (${activePropertyName}):
- ID: ${effectivePropertyId}
- Link: https://www.villaretiror.com/property/${effectivePropertyId}

### 📅 REGLAS DE DISPONIBILIDAD ESTRICTAS:
${JSON.stringify(availabilityRules || [], null, 2)}

### 📖 CONOCIMIENTO TÉCNICO (VILLA_KNOWLEDGE):
${JSON.stringify(villaKnowledge, null, 2)}

### 🧠 MEMORIAS FAMILIARES / PRIVADAS:
${JSON.stringify(familyKnowledge || [], null, 2)}
`.trim();

            const contents: any[] = rawMessages.map(m => {
                let text = "";
                if (typeof m.content === 'string') text = m.content;
                else if (Array.isArray(m.content)) {
                    text = m.content.map((p: any) => p.text || "").join("");
                } else {
                    text = m.text || "";
                }
                return {
                    role: (m.role === 'assistant' || m.sender === 'ai' || m.role === 'model') ? 'model' : 'user',
                    parts: [{ text }]
                };
            });

            const functionDeclarations: any[] = [
                {
                    name: 'check_availability',
                    description: 'Busca disponibilidad real para una o varias villas filtrando por calendario iCal.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'IDs o nombres de villas (ej: Villa Retiro, Pirata House)' },
                            check_in: { type: Type.STRING, description: 'Fecha ISO YYYY-MM-DD' },
                            check_out: { type: Type.STRING, description: 'Fecha ISO YYYY-MM-DD' }
                        },
                        required: ['villa_ids', 'check_in', 'check_out']
                    }
                },
                {
                    name: 'generate_booking_pattern',
                    description: 'Genera cotización oficial y enlace de reserva directo para una villa.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_id: { type: Type.STRING, description: 'ID o nombre de la villa' },
                            check_in: { type: Type.STRING },
                            check_out: { type: Type.STRING }
                        },
                        required: ['villa_id', 'check_in', 'check_out']
                    }
                },
                {
                    name: 'report_property_emergency',
                    description: 'Protocolo de crisis por daños (agua, luz, acceso).',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            issue_type: { type: Type.STRING, enum: ['water', 'electricity', 'access', 'noise', 'other'] },
                            description: { type: Type.STRING },
                            severity: { type: Type.STRING, enum: ['medium', 'high', 'critical'] }
                        },
                        required: ['issue_type', 'description', 'severity']
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
                    return { 
                        status: 'success', 
                        available_ids: available, 
                        available_names: available.map((id: string) => propertyTitles[id] || id),
                        details: results 
                    };
                },
                generate_booking_pattern: async ({ villa_id, check_in, check_out }: any) => {
                    const id = String(villa_id).toLowerCase().includes('retiro') ? VILLA_RETIRO_ID : 
                               String(villa_id).toLowerCase().includes('pirata') ? PIRATA_HOUSE_ID : villa_id;
                    const quote = await applyAIQuote(id, check_in, check_out);
                    const baseUrl = currentUrl?.split('/booking/')[0]?.split('/property/')[0] || '';
                    return { status: 'success', quote, action_url: `${baseUrl}/booking/${id}?checkIn=${check_in}&checkOut=${check_out}` };
                },
                report_property_emergency: async ({ issue_type, description, severity }: any) => {
                    const { data: ticket } = await supabase.from('emergency_tickets').insert({
                        property_id: effectivePropertyId, issue_type, description, severity, status: 'open', user_id: userId || null
                    }).select().single();
                    await NotificationService.sendTelegramAlert(`🚨 EMERGENCY ${severity}: ${issue_type}\n${description}\nProp: ${activePropertyName}`);
                    return { status: 'emergency_active', ticket_id: ticket?.id };
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
                        temperature: 0.7 
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
                                writeStream('0', part.text); // Standard text stream
                            }
                            if (part.thought) {
                                writeStream('1', ""); // Reasoning indicator
                            }
                        }
                    }
                }

                // Turn the accumulated parts into a single valid 'model' turn
                const assistantContent = { role: 'model', parts: accumulatedParts };
                const calls = accumulatedParts.filter(p => p.functionCall).map(p => p.functionCall);

                if (calls.length === 0) break;

                // Move assistant turn to history
                contents.push(assistantContent);

                // Execute and push tool results
                const toolResultParts = [];
                for (const call of calls) {
                    writeStream('a', call); // Notify frontend of tool use
                    const executor = toolExecutors[call.name];
                    const result = executor ? await executor(call.args) : { error: "Tool not found" };
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
            console.error("⛔ [CRITICAL] Salty Brain Failed:", err);
            writeStream('0', "Salty está recalibrando sus sensores tropicales... Disculpe la demora.");
            writer.close();
        }
    })();

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
