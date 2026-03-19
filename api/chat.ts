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

    const writeStream = (type: string, data: any) => {
        const payload = JSON.stringify(data);
        writer.write(encoder.encode(`${type}:${payload}\n`));
    };

    (async () => {
        try {
            const body = await req.json();
            const parsedBody = chatRequestSchema.parse(body);
            const { messages: rawMessages, sessionId, userId: bodyUserId, propertyId, currentUrl, inStay } = parsedBody;

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

            const VILLA_CONCIERGE_PROMPT = `
### 🔱 LENGUAJE DE CONCIERGE DE ÉLITE:
- Habla como un anfitrión de lujo. Sin negritas (**), sin bloques de código, sin sintaxis Markdown para links.
- **LIMPIEZA VISUAL**: Si necesitas dar un enlace, úsalo como URL limpia.

### 💰 DEPÓSITO DE SEGURIDAD (REGLA DE BRIAN):
- Explica que todas las reservas tienen un **Depósito de Seguridad Reembolsable**.
- Este depósito **NO se paga ahora**. Se procesa 24h antes del Check-in para liberar los códigos de acceso.
- El monto es dinámico y lo fija el Host (Brian). Siempre verifícalo en la cotización generada.

### 🛎️ FLUJO DE CUOTAS Y RESERVA:
1. Usa 'generate_booking_pattern'.
2. Al responder, incluye la etiqueta secreta al final: [PAYMENT_REQUEST: villa_id, total, check_in, check_out, guests, villa_name, hold_id, base, tax, security_deposit]
3. El sistema mostrará un botón interactivo incluyendo el desglose del depósito de garantía.

📅 Tiempo Real: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Puerto_Rico' })}
PROPIEDAD: ${activePropertyName} (${effectivePropertyId}).
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
                },
                {
                    name: 'update_security_deposit',
                    description: 'ACTUALIZA el depósito de daños para una propiedad (SOLO PARA EL HOST).',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_id: { type: Type.STRING },
                            new_amount: { type: Type.NUMBER }
                        },
                        required: ['villa_id', 'new_amount']
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
                        guests: guests
                    };
                },
                update_security_deposit: async ({ villa_id, new_amount }: any) => {
                   const id = String(villa_id).toLowerCase().includes('retiro') ? VILLA_RETIRO_ID : 
                                String(villa_id).toLowerCase().includes('pirata') ? PIRATA_HOUSE_ID : villa_id;
                   const { error } = await supabase.from('properties').update({ security_deposit: new_amount }).eq('id', id);
                   if (error) return { status: 'error', message: error.message };
                   return { status: 'success', message: `Depósito de garantía actualizado a $${new_amount} para ${propertyTitles[id] || id}.` };
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
