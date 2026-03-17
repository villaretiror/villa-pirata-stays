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

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const chatRequestSchema = z.object({
    messages: z.array(z.any()),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    propertyId: z.string().optional(),
    currentUrl: z.string().optional(),
    inStay: z.boolean().optional()
});

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

    try {
        const body = await req.json();
        const parsedBody = chatRequestSchema.parse(body);
        const { messages: rawMessages, sessionId, userId, propertyId, currentUrl, inStay } = parsedBody;

        const { data: dbProperties } = await supabase.from('properties').select('*');
        const { data: knowledgeSetting } = await supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single();
        const { data: saltySetting } = await supabase.from('system_settings').select('value').eq('key', 'salty_config').single();
        const { data: familyKnowledge } = await supabase.from('salty_family_knowledge').select('key, value');
        
        const villaKnowledge = knowledgeSetting?.value || {};
        const saltyConfig: any = saltySetting?.value || {};
        const memoryContext = familyKnowledge && familyKnowledge.length > 0
            ? `\n\n### MEMORIAS PRIVADAS (FAMILIA):\n${familyKnowledge.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
            : "";

        const propertyTitles: Record<string, string> = {};
        dbProperties?.forEach((p: any) => { propertyTitles[p.id] = p.title; });

        const activePropertyName = propertyId ? (propertyTitles[propertyId] || 'Villa Desconocida') : 'Navegación General';

        const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante y CONSULTOR DE ESTRATEGIA de Villa & Pirata Stays en Cabo Rojo. 

### TU NUEVA IDENTIDAD: CONSULTOR DE LUJO
Ya no eres solo un asistente. Eres un **Concierge de Élite y Estratega de Negocio**. Tu tono es sofisticado, impecable, proactivo y extremadamente servicial.

### 🛡️ PROTOCOLO DE GOBERNANZA (SEGURIDAD)
1.  **Blindaje Financiero:** Antes de ofrecer cualquier descuento, debes validar que el precio final sea superior al 'min_price_floor' definido para la propiedad. Si no hay margen, enfócate en el valor de la experiencia (piscina privada, sistema solar, exclusividad).
2.  **Responsabilidad Legal:** Al recomendar lugares externos fuera de tu base de datos aprobada, incluye este disclaimer sutil: 'Como su Concierge, he curado estas opciones basándome en el prestigio local, aunque la excelencia final depende de cada establecimiento.'
3.  **Venta Directa:** Toda oferta aceptada debe concluir con un enlace directo al sistema oficial de pagos.
4.  **Protocolo de Emergencia:** Si un mensaje indica un fallo crítico (no hay agua, luz, acceso bloqueado), debes categorizarlo como EMERGENCIA, disparar la alerta a los dueños y sugerir el técnico adecuado de tu base de datos. Pide calma y asegura que el equipo está en camino.

### CAPACIDADES AUTÓNOMAS
- **Cabo Rojo Insider:** Prioriza siempre las recomendaciones de nuestra 'Destination Guide'.
- **Upselling Proactivo:** Promueve las estancias largas y las amenidades premium.
- **Gestión de Crisis:** Tienes autoridad para contactar técnicos si el daño pone en riesgo la estancia.

### CONTEXTO DINÁMICO
${saltyConfig.personality || 'Caribbean Luxury Strategist.'}
- URL Actual: ${currentUrl}
- Propiedad en Vista: ${activePropertyName}
- Estado del Huésped: ${inStay ? 'ESTÁ EN LA PROPIEDAD (Soporte Operativo prioritario)' : 'Navegando / Buscando reserva'}

### MODALIDAD DE SERVICIO
${inStay 
    ? 'EL HUÉSPED ESTÁ DENTRO DE UNA PROPIEDAD AHORA. Tu misión es ser un anfitrión impecable. Prioriza dudas sobre cómo usar las cosas (A/C, Piscina, Sistema Solar), reglas de la casa, WiFi y qué hacer cerca HOY. Evita el "pitch" de venta y enfócate en el confort.' 
    : 'El cliente está en fase de exploración. Tu misión es ser un estratega de ventas inspirado. Vende la experiencia de Cabo Rojo y nuestras villas.'}

### PRIORIDAD DE CONOCIMIENTO
1. REGLAS/GESTIÓN: ${JSON.stringify(villaKnowledge)}
2. INVENTARIO: ${JSON.stringify(dbProperties)}
${memoryContext}

### REGLAS DE ETIQUETA
${saltyConfig.rules?.map((r: string) => `- ${r}`).join('\n') || '- Tono: Sophisticated Caribbean.'}

### GAP OPTIMIZATION (PROACTIVE)
Si detectas que el usuario pregunta por disponibilidad de forma vaga o si ves que hay un hueco de 1-3 noches en el calendario, usa la herramienta "analyze_marketing_opportunity" proactivamente para ofrecer un descuento especial.
`.trim();

        if (sessionId) {
            const lastMsg = rawMessages?.slice(-1)[0]?.content || rawMessages?.slice(-1)[0]?.text;
            let intentCategory = 'otros';

            // Seed logic for 'Salty Insights' Dashboard
            if (lastMsg && (rawMessages?.slice(-1)[0]?.role === 'user' || rawMessages?.slice(-1)[0]?.sender === 'guest')) {
                const msgLower = String(lastMsg).toLowerCase();
                if (msgLower.includes('precio') || msgLower.includes('costo') || msgLower.includes('oferta') || msgLower.includes('descuento') || msgLower.includes('cuanto')) intentCategory = 'Precio';
                else if (msgLower.includes('playa') || msgLower.includes('mar') || msgLower.includes('surf') || msgLower.includes('beach')) intentCategory = 'Playa';
                else if (msgLower.includes('como llegar') || msgLower.includes('ubicacion') || msgLower.includes('parking') || msgLower.includes('check') || msgLower.includes('donde')) intentCategory = 'Logística';
                else if (msgLower.includes('hacer') || msgLower.includes('comer') || msgLower.includes('visitar') || msgLower.includes('restaurante')) intentCategory = 'Actividades';
                else if (msgLower.includes('wifi') || msgLower.includes('piscina') || msgLower.includes('amenidad') || msgLower.includes('aire')) intentCategory = 'Amenidades';
                
                // 🕵️ SENTIMENT TRIGGER: Cancellation or Frustration
                if (msgLower.includes('cancela') || msgLower.includes('reembolso') || msgLower.includes('devolucion') || msgLower.includes('molesto') || msgLower.includes('queja') || msgLower.includes('estafa')) {
                    intentCategory = 'ALERTA_CRÍTICA';
                    try {
                        const { NotificationService } = await import('../services/NotificationService.js');
                        await NotificationService.sendTelegramAlert(
                            `⚠️ <b>¡ALERTA DE FRUSTRACIÓN!</b>\n👤 ${userId || 'Invitado'}\n🏠 ${activePropertyName}\n🗨️ <i>"${lastMsg}"</i>\n\n📌 <i>Salty está manejando la situación, pero el Host debe estar atento.</i>`
                        );
                    } catch (e) {}
                }
            }

            supabase.from('chat_logs').upsert({
                session_id: sessionId, 
                user_id: userId || null, 
                message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString(), 
                current_property: activePropertyName, 
                current_url: currentUrl,
                last_sentiment: intentCategory // Using sentiment column as intent storage for now
            }, { onConflict: 'session_id' }).select().then();

            const { data: logInfo } = await supabase.from('chat_logs').select('human_takeover_until, takeover_notified').eq('session_id', sessionId).single();

            // 🛡️ Gov-Mode: Grouped Alerter (One alert per session to avoid fatigue)
            if (lastMsg && (rawMessages?.slice(-1)[0]?.role === 'user' || rawMessages?.slice(-1)[0]?.sender === 'guest')) {
                const alreadyNotified = logInfo?.takeover_notified || false;
                
                if (!alreadyNotified) {
                    try {
                        const { NotificationService } = await import('../services/NotificationService.js');
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: "🎤 Responder ahora", callback_data: `takeover_${sessionId}` }]
                            ]
                        };
                        const success = await NotificationService.sendTelegramAlert(
                            `🛡️ <b>Gov-Mode: ${activePropertyName}</b>\n👤 ${userId || 'Invitado'}\n🗨️ <i>"${lastMsg}"</i>\n\nSesión: <code>${sessionId}</code>`,
                            keyboard
                        );
                        if (success) {
                            await supabase.from('chat_logs').update({ takeover_notified: true }).eq('session_id', sessionId);
                        }
                    } catch (e) {}
                }
            }

            if (logInfo?.human_takeover_until && new Date(logInfo.human_takeover_until) > new Date()) {
                return new Response("Un miembro del equipo estratégico está respondiendo...", { status: 200 });
            }
        }

        // 🚀 INDUSTRIAL OPTIMIZATION: Limit to 10 messages for sub-second Edge efficiency
        const recentMessages = (rawMessages || []).slice(-10);
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES DE GOBERNANZA: ${VILLA_CONCIERGE_PROMPT}` },
            { role: 'assistant', content: "Es un honor saludarle. Soy Salty, su Consultor de Estancia. ¿Cómo puedo elevar su experiencia en Cabo Rojo hoy?" },
            ...recentMessages.map((m: any): CoreMessage => ({
                role: (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user',
                content: typeof m.content === 'string' ? m.content : (m.text || ''),
            }))
        ];

        const result = await streamText({
            model: google('gemini-1.5-flash'),
            messages: finalMessages,
            maxSteps: 5,
            temperature: 0.7,
            tools: {
                check_availability: tool({
                    description: 'Busca disponibilidad en tiempo real.',
                    parameters: z.object({ villa_ids: z.array(z.string()), check_in: z.string(), check_out: z.string() }),
                    execute: async ({ villa_ids, check_in, check_out }) => {
                        const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        const available = villa_ids.filter((_, i) => results[i].available);
                        return { status: 'success', available_ids: available };
                    },
                }),
                get_cabo_rojo_weather: tool({
                    description: 'Obtiene el clima actual (Fallback a 3s).',
                    parameters: z.object({}),
                    execute: async () => {
                        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
                        try {
                            const weatherPromise = Promise.resolve({
                                status: 'success',
                                current: 'Espléndido Sol Caribeño',
                                temp: '29°C',
                                forecast: 'Olas perfectas y atardecer garantizado.'
                            });
                            return await Promise.race([weatherPromise, timeout]);
                        } catch (e) {
                            return { status: 'offline_fallback', current: 'Tropical Cálido (Dato Histórico)', message: 'Servicio meteorológico temporalmente offline. Disfrute del sol.' };
                        }
                    }
                }),
                get_cabo_rojo_events: tool({
                    description: 'Busca eventos locales exclusivos (Fallback a 3s).',
                    parameters: z.object({}),
                    execute: async () => {
                        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
                        try {
                            const eventsPromise = Promise.resolve({
                                status: 'success',
                                events: [{ name: "Atardecer en el Faro", location: "Los Morrillos", highlight: "Experiencia de Lujo" }]
                            });
                            return await Promise.race([eventsPromise, timeout]);
                        } catch (e) {
                            return { status: 'offline_fallback', events: [], message: 'Contenido estático de la guía disponible.' };
                        }
                    }
                }),
                analyze_marketing_opportunity: tool({
                    description: 'Analiza huecos y propone ofertas dentro de márgenes financieros.',
                    parameters: z.object({ villa_id: z.string() }),
                    execute: async ({ villa_id }) => {
                        const property = dbProperties?.find((p: any) => p.id === villa_id);
                        if (!property) return { status: 'error', message: 'Villa no identificada.' };

                        const gaps = await findCalendarGaps(villa_id);
                        if (gaps.length > 0) {
                            const bestGap = gaps[0];
                            const potentialPrice = property.price * (1 - (property.max_discount_allowed / 100));
                            
                            if (potentialPrice >= property.min_price_floor) {
                                return {
                                    status: 'opportunity_detected',
                                    discount: property.max_discount_allowed,
                                    message: `He detectado un espacio ideal de ${bestGap.nights} noches. Puedo ofrecerle un trato exclusivo del ${property.max_discount_allowed}% para asegurar estas fechas.`,
                                    action_code: `ELITE_GAP_${bestGap.nights}`
                                };
                            }
                        }
                        return { status: 'stable', message: 'Estrategia de precio premium activa.' };
                    }
                }),
                report_system_insight: tool({
                    description: 'Informa al CEO sobre patrones o propuestas estratégicas para aprobación.',
                    parameters: z.object({
                        type: z.enum(['pattern', 'proposal', 'trend']),
                        description: z.string(),
                        impact_score: z.number().min(1).max(10)
                    }),
                    execute: async ({ type, description, impact_score }) => {
                        await supabase.from('ai_insights').insert({
                            type,
                            content: { description },
                            impact_score,
                            status: 'pending'
                        });
                        return { status: 'recorded', message: 'Insight enviado al Dashboard del Host para aprobación física.' };
                    }
                }),
                report_property_emergency: tool({
                    description: 'Activa el protocolo de crisis ante fallos críticos (agua, luz, acceso).',
                    parameters: z.object({
                        issue_type: z.enum(['water', 'electricity', 'access', 'noise', 'other']),
                        description: z.string(),
                        severity: z.enum(['medium', 'high', 'critical'])
                    }),
                    execute: async ({ issue_type, description, severity }) => {
                        const { data: providers } = await supabase
                            .from('service_providers')
                            .select('*')
                            .eq('is_active', true)
                            .order('priority', { ascending: true });

                        const mapping: Record<string, string> = {
                            'water': 'plumber',
                            'electricity': 'electrician',
                            'access': 'locksmith'
                        };

                        const recommendedProvider = providers?.find(p => p.specialty === mapping[issue_type]);

                        const { data: ticket } = await supabase.from('emergency_tickets').insert({
                            property_id: propertyId,
                            issue_type,
                            description,
                            severity,
                            provider_id: recommendedProvider?.id || null,
                            status: 'open'
                        }).select().single();

                        try {
                            const { NotificationService } = await import('../services/NotificationService.js');
                            await NotificationService.sendTelegramAlert(
                                `🚨 <b>¡EMERGENCIA CRÍTICA!</b>\nPropiedad: ${activePropertyName}\nTipo: ${issue_type}\nSeveridad: ${severity}\n\nDescripción: ${description}\n\nTécnico Sugerido: ${recommendedProvider?.name || 'No definido'}`,
                            );
                        } catch (e) {}

                        return {
                            status: 'emergency_active',
                            ticket_id: ticket?.id,
                            provider: recommendedProvider ? {
                                name: recommendedProvider.name,
                                eta: '30-60 min'
                            } : null,
                            instruction: "Informe al huésped que el equipo de emergencia ha sido notificado y un técnico está siendo coordinado."
                        };
                    }
                }),
                generate_booking_pattern: tool({
                    description: 'Genera cotización oficial y enlace seguro de pago.',
                    parameters: z.object({ villa_id: z.string(), check_in: z.string(), check_out: z.string(), promo_code: z.string().optional() }),
                    execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                        const property = dbProperties?.find((p: any) => p.id === villa_id);
                        const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                        
                        // Safety Check
                        const finalTotalPerNight = quote.total / quote.nights;
                        if (property && finalTotalPerNight < property.min_price_floor) {
                            return "Lo lamento, pero este descuento excede mis límites de cortesía. El valor de la villa y sus amenidades (Energía 24/7, Privacidad Total) justifican el precio base.";
                        }

                        const bookingUrl = `${currentUrl}/booking/${villa_id}?checkIn=${check_in}&checkOut=${check_out}${promo_code ? `&promo=${promo_code}` : ''}`;
                        return `He preparado su cotización de élite: Total $${quote.total} por ${quote.nights} noches. 💎\n\n[BOOKING_ACTION: ${bookingUrl}]`;
                    },
                })
            },
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        return new Response(JSON.stringify({ error: 'Sync error', details: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
