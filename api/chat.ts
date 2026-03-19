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

const SALTY_MODEL = 'gemini-3-flash-preview'; // ⚡ MAR 2026

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
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        writer.write(encoder.encode(`${type}:${payload}\n`));
    };

    // Use a background promise to process the AI logic while returning the stream
    (async () => {
        try {
            const body = await req.json();
            const parsedBody = chatRequestSchema.parse(body);
            const { messages: rawMessages, sessionId, userId: bodyUserId, propertyId, currentUrl, inStay } = parsedBody;

            // Security & Context
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

            const lastUserMsg = [...(rawMessages || [])].reverse().find(m => m.role === 'user')?.text || "";
            const intentCategory = lastUserMsg.toLowerCase().includes('reserva') ? 'booking' : 'general';

            const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma y Consultor Ejecutivo de Villa & Pirata Stays. 🏖️ Sophisticated, Caribbean, and focused on Guest Excellence.
Current Property: ${activePropertyName} (${effectivePropertyId}).
Goal: Convert inquiries into bookings.
Rules: ${JSON.stringify(availabilityRules || [])}.
Knowledge: ${JSON.stringify(villaKnowledge)}.
`.trim();

            const contents: any[] = [
                { role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION: ${VILLA_CONCIERGE_PROMPT}` }] },
                ...rawMessages.map(m => ({
                    role: (m.role === 'assistant' || m.sender === 'ai') ? 'assistant' : 'user',
                    parts: [{ text: m.text || m.content || "" }]
                }))
            ];

            const functionDeclarations: any[] = [
                {
                    name: 'check_availability',
                    description: 'Busca disponibilidad real para villas.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            villa_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'IDs o nombres' },
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
                            check_out: { type: Type.STRING }
                        },
                        required: ['villa_id', 'check_in', 'check_out']
                    }
                },
                {
                    name: 'report_property_emergency',
                    description: 'Activa protocolo de crisis.',
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
                        const val = id.toLowerCase();
                        if (val.includes("retiro")) return "1081171030449673920";
                        if (val.includes("pirata")) return "42839458";
                        return id;
                    });
                    const results = await Promise.all(resolvedIds.map((id: string) => checkAvailabilityWithICal(id, check_in, check_out)));
                    const available = resolvedIds.filter((_: any, i: number) => results[i].available);
                    return { status: 'success', available_ids: available, available_names: available.map((id: string) => propertyTitles[id] || id) };
                },
                generate_booking_pattern: async ({ villa_id, check_in, check_out }: any) => {
                    const id = villa_id.toLowerCase().includes('retiro') ? "1081171030449673920" : 
                               villa_id.toLowerCase().includes('pirata') ? "42839458" : villa_id;
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
            let fullText = "";

            while (iterations < 5) {
                const streamResponse = await ai.models.generateContentStream({
                    model: SALTY_MODEL,
                    contents,
                    config: { tools: [{ functionDeclarations }], temperature: 0.7 }
                });

                let lastContent: any = null;
                for await (const chunk of streamResponse) {
                    if (chunk.candidates?.[0]?.content?.parts?.some((p: any) => p.thought)) {
                        writeStream('1', ""); // Reasoning indicator
                    }
                    if (chunk.text) {
                        fullText += chunk.text;
                        writeStream('0', chunk.text);
                    }
                    lastContent = chunk.candidates?.[0]?.content;
                }

                const calls = lastContent?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
                if (calls.length === 0) break;

                contents.push(lastContent);
                const toolResults = [];
                for (const call of calls) {
                    writeStream('a', call);
                    const executor = toolExecutors[call.name];
                    const result = executor ? await executor(call.args) : { error: "Tool not found" };
                    writeStream('p', { name: call.name, response: { result }, id: call.id });
                    toolResults.push({ functionResponse: { name: call.name, response: { result }, id: call.id } });
                }
                contents.push({ role: 'user', parts: toolResults });
                iterations++;
            }

            if (sessionId && fullText) {
                await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'ai', text: fullText, intent: intentCategory });
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
