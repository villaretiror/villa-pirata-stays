import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../constants.js';
import {
    checkAvailabilityWithICal,
    logAbandonmentLead,
    getPaymentVerificationStatus,
    findCalendarGaps,
    handleCrisisAlert,
    applyAIQuote,
    createTemporaryHold,
    checkUserConcessions
} from '../aiServices.js';

export const maxDuration = 30;

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

export default async function handler(req: any, res: any) {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages: rawMessages, sessionId, userId, propertyId, currentUrl } = req.body;

        const { data: dbProperties } = await supabase.from('properties').select('*');
        const { data: knowledgeSetting } = await supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single();
        const villaKnowledge = knowledgeSetting?.value || {};

        const propertyTitles: Record<string, string> = {};
        dbProperties?.forEach((p: any) => { propertyTitles[p.id] = p.title; });

        const activePropertyName = propertyId ? (propertyTitles[propertyId] || 'Villa Desconocida') : 'Navegación General';

        const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante y concierge ejecutivo de Villa & Pirata Stays en Cabo Rojo. 
Tu misión: Ser un anfitrión excepcional "Real-Time". Caribe Chic Style.

### CAPACIDADES SENSORIALES
- CONTEXTO: Sabes que el usuario está viendo: ${activePropertyName} (URL: ${currentUrl}).
- APRENDIZAJE: Usa 'update_guest_interests' para recordar preferencias.

### PRIORIDAD DE CONOCIMIENTO
1. REGLAS: ${JSON.stringify(villaKnowledge)}
2. INVENTARIO: ${JSON.stringify(dbProperties)}

- Tono: Eres el Concierge de una propiedad de lujo. Tu lenguaje es impecable, extremadamente cordial y acogedor. 
- Estilo: Sophisticated Caribbean. Mantén una distancia profesional pero proyecta una calidez genuina que haga sentir al huésped en el paraíso.
- Palabras Clave: Excelencia, confort, estancia impecable, instalaciones exclusivas, deleite.
- Límites: NO gestiones servicios externos ni transporte. Solo soporte técnico y reglas de la casa.

### TONALIDAD & PERSONALIDAD (CONCIERGE INFORMATIVO)
- Rol: Eres un guía experto en el uso y disfrute de la villa.
- Enfoque: WiFi, agua caliente, reglas de la casa, electrodomésticos y recomendaciones locales de "Secret Spots".
- Límites: NO gestiones servicios externos, transporte ni reservas fuera del sistema. 
- Restricción: Solo asistes a huéspedes de reservas directas. Si mencionan Airbnb, remítelos a su plataforma para soporte de pago/reserva.
- Escalación: Si un huésped pregunta algo muy específico que no está en las REGLAS o INVENTARIO (ej: reparaciones urgentes, temas legales), responde cordialmente que estás consultando con el equipo y usa el tono de espera.
`.trim();

        if (sessionId) {
            supabase.from('chat_logs').upsert({
                session_id: sessionId, user_id: userId || null, message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString(), current_property: activePropertyName, current_url: currentUrl
            }, { onConflict: 'session_id' }).select().then();

            const lastMsg = rawMessages?.slice(-1)[0]?.content || rawMessages?.slice(-1)[0]?.text;
            if (lastMsg && (rawMessages?.slice(-1)[0]?.role === 'user' || rawMessages?.slice(-1)[0]?.sender === 'guest')) {
                try {
                    const { NotificationService } = await import('../services/NotificationService.js');
                    const keyboard = {
                        inline_keyboard: [
                            [{ text: "🎤 Responder ahora", callback_data: `takeover_${sessionId}` }]
                        ]
                    };
                    await NotificationService.sendTelegramAlert(
                        `💬 <b>Mirror: ${activePropertyName}</b>\n👤 ${userId || 'Invitado'}\n🗨️ <i>"${lastMsg}"</i>\n\nSesión: <code>${sessionId}</code>`,
                        keyboard
                    );
                } catch (e) {}
            }

            const { data: logInfo } = await supabase.from('chat_logs').select('human_takeover_until').eq('session_id', sessionId).single();
            if (logInfo?.human_takeover_until && new Date(logInfo.human_takeover_until) > new Date()) {
                return new Response("Un miembro del equipo está respondiendo...", { status: 200 });
            }
        }

        const recentMessages = (rawMessages || []).slice(-15);
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES: ${VILLA_CONCIERGE_PROMPT}` },
            { role: 'assistant', content: "¡Hola! Soy Salty. ¿Qué villa vamos a gestionar hoy?" },
            ...recentMessages.map((m: any): CoreMessage => ({
                role: (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user',
                content: String(m.content || m.text || ''),
            }))
        ];

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages: finalMessages,
            maxSteps: 5,
            temperature: 0.7,
            tools: {
                check_availability: tool({
                    description: 'Busca disponibilidad.',
                    parameters: z.object({ villa_ids: z.array(z.string()), check_in: z.string(), check_out: z.string() }),
                    execute: async ({ villa_ids, check_in, check_out }) => {
                        const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        const available = villa_ids.filter((_, i) => results[i].available);
                        return { status: 'success', available_ids: available };
                    },
                }),
                generate_booking_pattern: tool({
                    description: 'Genera cotización.',
                    parameters: z.object({ villa_id: z.string(), check_in: z.string(), check_out: z.string(), promo_code: z.string().optional() }),
                    execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                        const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                        return `[PAYMENT_REQUEST: ${villa_id}, ${quote.total}, ${check_in}, ${check_out}, ${quote.nights}, ${quote.discount}]`;
                    },
                }),
                notify_host_urgent: tool({
                    description: 'Alerta urgente.',
                    parameters: z.object({ client_name: z.string(), issue_description: z.string(), contact_info: z.string(), severity: z.number() }),
                    execute: async ({ client_name, issue_description, contact_info, severity }) => {
                        await handleCrisisAlert(client_name, issue_description, contact_info, severity);
                        return { status: 'success' };
                    }
                }),
                google_places_search: tool({
                    description: 'Busca lugares locales.',
                    parameters: z.object({ query: z.string() }),
                    execute: async ({ query }) => {
                        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
                        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in Cabo Rojo, PR')}&key=${apiKey}`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        return { status: 'success', results: (data.results || []).slice(0, 3).map((r: any) => ({ name: r.name, rating: r.rating })) };
                    }
                })
            },
        });

        return result.pipeTextStreamToResponse(res);
    } catch (error: any) {
        return res.status(500).json({ error: 'Sync error', details: error.message });
    }
}
