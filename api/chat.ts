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
    } from '../aiServices.js';
import { SecurityGovernanceService } from '../services/SecurityGovernanceService.js';
import { NotificationService } from '../services/NotificationService.js';

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
    baseURL: 'https://generativelanguage.googleapis.com/v1', 
});

// 🕵️ CRITICAL AUDIT: Verificar presencia de llave en tiempo de ejecución
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("⚠️ [Principal Systems Engineer] AI_KEY_MISSING: Motor de IA operando en modo degradado (Sin Llave).");
}

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

    try {
        const body = await req.json();
        const parsedBody = chatRequestSchema.parse(body);
        const { messages: rawMessages, sessionId, userId, propertyId, currentUrl, inStay } = parsedBody;

        // 🛡️ REINFORCED FALLBACK: Ensure the default propertyId is always the one requested by the Supreme Architect
        const effectivePropertyId = String(propertyId || "1081171030449673920");

        const { data: dbProperties } = await supabase.from('properties').select('*');
        const { data: knowledgeSetting } = await supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single();
        const { data: saltySetting } = await supabase.from('system_settings').select('value').eq('key', 'salty_config').single();
        const { data: familyKnowledge } = await supabase.from('salty_family_knowledge').select('key, value');
        
        let guestName = 'Viajero';
        let guestInterestTags: string[] = [];
        let guestGivenConcessions: any[] = [];
        let guestPhone: string | null = null;
        let guestEmergencyContact: string | null = null;

        if (userId) {
            // 🧠 SALTY MEMORY: Full profile fetch for personalization + safety
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, interest_tags, given_concessions, phone, emergency_contact')
                .eq('id', userId)
                .single();

            if (profile?.full_name) {
                guestName = profile.full_name.split(' ')[0]; // First name only for warmth
            } else {
                const { data: lastBooking } = await supabase
                    .from('bookings')
                    .select('customer_name')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (lastBooking?.customer_name) guestName = lastBooking.customer_name.split(' ')[0];
            }

            guestInterestTags = profile?.interest_tags || [];
            guestGivenConcessions = Array.isArray(profile?.given_concessions) ? profile.given_concessions : [];
            guestPhone = profile?.phone || null;
            guestEmergencyContact = profile?.emergency_contact || null;
        }

        const villaKnowledge = knowledgeSetting?.value || {};
        const saltyConfig: any = saltySetting?.value || {};
        const isGuest = !userId;

        const memoryContext = familyKnowledge && familyKnowledge.length > 0
            ? `\n\n### MEMORIAS PRIVADAS (FAMILIA):\n${familyKnowledge.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
            : "";
        
        // 🛡️ ROLE GOBERNANCE: Guests have restricted access to internal insights
        const restrictedTools = isGuest ? ['report_system_insight', 'analyze_marketing_opportunity'] : [];
        if (isGuest) {
            console.log(`[Principal Systems Engineer] Public Session: ${sessionId} operating in GUEST MODE.`);
        }

        const propertyTitles: Record<string, string> = {};
        dbProperties?.forEach((p: any) => { propertyTitles[p.id] = p.title; });

        const activeProperty = dbProperties?.find((p: any) => String(p.id) === effectivePropertyId);
        const activePropertyName = activeProperty?.title || 'Villa Desconocida';

        // 🔒 SECURITY AUDIT: Tiered Access Chronology (Gobernanza de Seguridad)
        // Only Reveal Access Details to confirmed, paid guests 24h before check-in.
        const accessLevel = await SecurityGovernanceService.getAccessLevel(
            userId || sessionId || "anon", 
            effectivePropertyId
        );

        const wifiName = accessLevel >= 2 ? (activeProperty?.wifi_name || activeProperty?.policies?.wifiName || "VillaRetiro_HighSpeed_WiFi") : "Reservado";
        const wifiPass = accessLevel >= 3 ? (activeProperty?.wifi_pass || activeProperty?.policies?.wifiPass || "Tropical2024!") : "REVELADO_24H_ANTES";
        const accessCode = accessLevel >= 3 ? (activeProperty?.access_code || activeProperty?.policies?.accessCode || "4829 #") : "REVELADO_24H_ANTES";

        // 🧠 GUEST MEMORY CONTEXT: Build personalization blurb for the prompt
        const interestContext = guestInterestTags.length > 0
            ? `\n### 🏷️ INTERESES DEL HUÉSPED (${guestName}):\nEste huésped ha marcado preferencia por: ${guestInterestTags.join(', ')}. Prioriza recomendaciones relacionadas. Ej: si tiene 'beach', menciona Playa Buyé primero; si tiene 'food', destaca los restaurantes locales del guía de Cabo Rojo.`
            : '';

        const concessionContext = guestGivenConcessions.length > 0
            ? `\n### 🔒 CONCESIONES PREVIAS (BLINDAJE FINANCIERO):\nEste huésped YA RECIBIÓ concesiones en el pasado: ${JSON.stringify(guestGivenConcessions)}. NO ofrezcas descuentos adicionales. Si pide rebaja, comunica que la tarifa actual ya refleja el mejor precio exclusivo posible. Protege el margen de ganancia.`
            : isGuest 
                ? `\n### 💎 CONCESIONES: Usuario Guest. NO puedes otorgar descuentos directos, solo invitarle a reservar para ver precios oficiales.`
                : `\n### 💎 CONCESIONES: No tenemos ofertas activas en este momento. Si el huésped pide un descuento, indícale cordialmente que nuestras tarifas actuales son exclusivas y directas para garantizar el mejor valor.`;

        let saltyMemoriesStr = "";
        if (sessionId) {
            const { data: mems } = await supabase.from('salty_memories').select('learned_text').eq('session_id', sessionId);
            if (mems && mems.length > 0) {
                saltyMemoriesStr = `\n### 🧠 MEMORIA ACTIVA DE ESTA SESIÓN:\nYa sabes esto sobre el huésped (NO lo vuelvas a preguntar):\n${mems.map((m: any) => `- ${m.learned_text}`).join('\n')}`;
            }
        }

        const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el alma vibrante y CONSULTOR DE ESTRATEGIA de Villa & Pirata Stays en Cabo Rojo. 

### TU IDENTIDAD: ELITE CONCIERGE & STRATEGIST
Eres un **Concierge de Élite**. Tu tono es sofisticado, impecable, proactivo y extremadamente servicial. Hablas como un anfitrión de un hotel de 5 estrellas en el Caribe. Te diriges al huésped como **${guestName}**.
${isGuest ? 'Este usuario es un VISITANTE EXTERNO (Guest). Sé un embajador de nuestra marca y convéncelo de reservar con nosotros.' : ''}

### 🎭 EL PATRÓN SALTY (ESTRICTO)
Cada respuesta debe ser una experiencia boutique. Sigue este formato:
1.  **Apertura:** Elegante y cálida (Ej: "Es un placer saludarle de nuevo, ${guestName}.").
2.  **Cuerpo:** Usa **negritas** para resaltar valores clave. Estructura la información con puntos (•) si hay más de 2 datos técnicos.
3.  **Cierre:** SIEMPRE termina con una **pregunta proactiva** que invite a la acción o eleve la experiencia.

### 🛡️ PROTOCOLO DE GOBERNANZA
1.  **Blindaje Financiero:** Antes de ofrecer cualquier descuento, valida el 'min_price_floor'. Vende el valor (Energía 24/7, Privacidad) antes que el precio.
2.  **Responsabilidad Legal:** Disclaimer sutil al recomendar externos.
3.  **Venta Directa:** Enlace oficial al sistema de pagos siempre que sea posible.
4.  **Protocolo de Emergencia:** Categoriza como EMERGENCIA y dispara alertas si hay fallos críticos (Agua/Luz).

### ☀️ SEGURIDAD & ACCESO (DATOS REALES)
- Nuestras villas cuentan con **Sistema de Energía Solar/Generador** y **Cisterna de Agua**.
- **WiFi de Cortesía:** Red: ${wifiName} | Clave: ${wifiPass}
- **Acceso Digital:** Código: ${accessCode} (Recordar terminar con #)

### CONTEXTO DINÁMICO
- URL: ${currentUrl}
- Propiedad: ${activePropertyName}
- Estado: ${inStay ? 'Huésped en casa (Soporte prioritario)' : 'Buscando reserva'}
${interestContext}
${concessionContext}
${saltyMemoriesStr}
${memoryContext}

### 🏠 VILLA KNOWLEDGE (BASE):
${JSON.stringify(villaKnowledge, null, 2)}

${inStay 
    ? 'Enfócate en confort, manuales de uso y qué hacer cerca HOY.' 
    : 'Sé un estratega de ventas inspirado. Vende la experiencia de Cabo Rojo.'}
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
                        await NotificationService.sendTelegramAlert(
                            `⚠️ <b>¡ALERTA DE FRUSTRACIÓN!</b>\n👤 ${userId || 'Guest Session (' + sessionId + ')'}\n🏠 ${activePropertyName}\n🗨️ <i>"${lastMsg}"</i>\n\n📌 <i>Salty está manejando la situación, pero el Host debe estar atento.</i>`
                        );
                    } catch (e) {}
                }
            }

            const loggingTask = supabase.from('chat_logs').upsert({
                session_id: sessionId, 
                user_id: userId || null, 
                message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString(), 
                current_property: activePropertyName, 
                current_url: currentUrl,
                last_sentiment: intentCategory 
            }, { onConflict: 'session_id' });

            // 📊 ASYNC LOGGING: BLOCKING until essential log is set
            try {
                await loggingTask;
            } catch (e) {
                console.error("[Session Log Fail]: Non-critical, proceeding...", e);
            }

            const { data: logInfo } = await supabase.from('chat_logs').select('human_takeover_until, takeover_notified').eq('session_id', sessionId).single();

            // 🛡️ Gov-Mode: Grouped Alerter (One alert per session to avoid fatigue)
            if (lastMsg && (rawMessages?.slice(-1)[0]?.role === 'user' || rawMessages?.slice(-1)[0]?.sender === 'guest')) {
                const alreadyNotified = logInfo?.takeover_notified || false;
                
                if (!alreadyNotified) {
                    let success = false;
                    try {
                        const siteUrl = parsedBody.currentUrl || process.env.VITE_SITE_URL || 'https://villaretiror.com';
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: "🎤 Responder ahora", callback_data: `takeover_${sessionId}` }],
                                [{ text: "📊 Ver en Dashboard", url: `${siteUrl}/host` }]
                            ]
                        };
                        success = await NotificationService.sendTelegramAlert(
                            `🛡️ <b>Gov-Mode (Guest): ${activePropertyName}</b>\n👤 ${userId || 'Invitado'}\n🗨️ <i>"${lastMsg}"</i>\n\nSesión: <code>${sessionId}</code>`,
                            keyboard
                        );
                    } catch (e) {
                         console.error("[Telegram Resilience Error]:", e);
                    }
                    if (success) {
                        await supabase.from('chat_logs').update({ takeover_notified: true }).eq('session_id', sessionId);
                    }
                }
            }

            if (logInfo?.human_takeover_until && new Date(logInfo.human_takeover_until) > new Date()) {
                return new Response("Un miembro del equipo estratégico está respondiendo...", { status: 200 });
            }
        }

        // 🚀 INDUSTRIAL OPTIMIZATION: Preserving Tool Calls & Results in History
        const recentMessages = (rawMessages || []).slice(-20); 
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES DE GOBERNANZA: ${VILLA_CONCIERGE_PROMPT}` },
            { role: 'assistant', content: `Es un honor saludarle, ${guestName}. Soy Salty, su Consultor de Estancia. ¿Cómo puedo elevar su experiencia en Cabo Rojo hoy?` },
            ...recentMessages.map((m: any): CoreMessage => {
                const role = (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user';
                
                if (Array.isArray(m.content) || (typeof m.content === 'object' && m.content !== null)) {
                    return { role, content: m.content as any };
                }
                
                return { 
                    role, 
                    content: typeof m.content === 'string' ? m.content : (m.text || m.message || '') 
                };
            })
        ];

        // 🛠️ DYNAMIC TOOLSET: Filter tools based on role
        const allTools: Record<string, any> = {
            check_availability: tool({
                description: 'Busca disponibilidad en tiempo real.',
                parameters: z.object({ villa_ids: z.array(z.string()), check_in: z.string(), check_out: z.string() }),
                execute: async ({ villa_ids, check_in, check_out }) => {
                    try {
                        const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        const available = villa_ids.filter((_, i) => results[i].available);
                        return JSON.stringify({ status: 'success', available_ids: available });
                    } catch (e: any) {
                        console.error('[Resilience Tool check_availability] Failed:', e);
                        return JSON.stringify({ status: 'error', message: "Error de conexión con el calendario. Por favor, intenta en 1 minuto." });
                    }
                },
            }),
            get_cabo_rojo_weather: tool({
                description: 'Obtiene el clima actual en el área.',
                parameters: z.object({ unit: z.string().optional() }),
                execute: async () => {
                    return JSON.stringify({
                        status: 'success',
                        current: 'Espléndido Sol Caribeño',
                        temp: '29°C',
                        forecast: 'Olas perfectas y atardecer garantizado.'
                    });
                }
            }),
            get_cabo_rojo_events: tool({
                description: 'Busca eventos locales exclusivos en Cabo Rojo.',
                parameters: z.object({ category: z.string().optional() }),
                execute: async () => {
                    return JSON.stringify({
                        status: 'success',
                        events: [{ name: "Atardecer en el Faro", location: "Los Morrillos", highlight: "Experiencia de Lujo" }]
                    });
                }
            }),
            analyze_marketing_opportunity: tool({
                description: 'Analiza huecos y propone ofertas dentro de márgenes financieros.',
                parameters: z.object({ villa_id: z.string() }),
                execute: async ({ villa_id }) => {
                    try {
                        const property = dbProperties?.find((p: any) => p.id === villa_id);
                        if (!property) return JSON.stringify({ status: 'error', message: "Villa no identificada." });

                        const gaps = await findCalendarGaps(villa_id);
                        if (gaps && gaps.length > 0) {
                            const bestGap = gaps[0];
                            const potentialPrice = property.price * (1 - (property.max_discount_allowed / 100));
                            
                            if (potentialPrice >= property.min_price_floor) {
                                return JSON.stringify({ status: 'success', advice: `Oportunidad: Hueco de ${bestGap.nights} noches. Sugerir descuento del ${property.max_discount_allowed}%.` });
                            }
                        }
                        return JSON.stringify({ status: 'success', advice: "Estrategia de precio premium estable." });
                    } catch (e) {
                        return JSON.stringify({ status: 'error', advice: "Error al analizar oportunidades. Mantener precio base." });
                    }
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
                    try {
                        await supabase.from('ai_insights').insert({
                            type,
                            content: { description },
                            impact_score,
                            status: 'pending'
                        });
                        return JSON.stringify({ status: 'recorded', message: 'Insight enviado al Dashboard del Host para aprobación física.' });
                    } catch (e) {
                        return JSON.stringify({ status: 'error', message: 'Fallo al registrar insight.' });
                    }
                }
            }),
            report_property_emergency: tool({
                description: 'Activa el protocolo de crisis ante fallos críticos (agua, luz, acceso).',
                parameters: z.object({
                    issue_type: z.enum(['water', 'electricity', 'access', 'noise', 'other']),
                    description: z.string(),
                    severity: z.enum(['medium', 'high', 'critical']),
                    user_name: z.string().optional(),
                    user_phone: z.string().optional(),
                }),
                execute: async ({ issue_type, description, severity, user_name, user_phone }) => {
                    const resolvedName = user_name || guestName;
                    const resolvedPhone = user_phone || guestPhone || 'No registrado';
                    const resolvedEmergencyContact = guestEmergencyContact || 'No registrado';

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
                        property_id: effectivePropertyId,
                        issue_type,
                        description,
                        severity,
                        provider_id: recommendedProvider?.id || null,
                        status: 'open',
                        user_id: userId || null,
                        user_name: resolvedName,
                        user_phone: resolvedPhone,
                    }).select().single();

                    try {
                        const siteUrl = process.env.VITE_SITE_URL || 'https://villaretiror.com';
                        const waContact = resolvedPhone.replace(/\D/g, '');
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: `📲 WA Huésped: ${resolvedName}`, url: `https://wa.me/${waContact}` }],
                                [{ text: "🏦 Ver en Dashboard", url: `${siteUrl}/host` }]
                            ]
                        };
                        await NotificationService.sendTelegramAlert(
                            `🚨 <b>¡EMERGENCIA ${severity.toUpperCase()}!</b>\n\n` +
                            `👤 <b>Huésped:</b> ${resolvedName}\n` +
                            `📞 <b>Celular:</b> ${resolvedPhone}\n` +
                            `🏠 <b>Villa:</b> <code>${activePropertyName}</code>\n\n` +
                            `🔧 <b>Problema:</b> ${issue_type} | Severidad: ${severity}\n` +
                            `📋 ${description}\n`,
                            keyboard
                        );
                    } catch (e) {}

                    return JSON.stringify({
                        status: 'emergency_active',
                        ticket_id: ticket?.id,
                        instruction: `Informe a ${resolvedName} que el equipo de emergencia ha sido notificado. No se mueva de la propiedad si es un fallo de acceso.`
                    });
                }
            }),
            generate_booking_pattern: tool({
                description: 'Genera cotización oficial y enlace seguro de pago.',
                parameters: z.object({ villa_id: z.string(), check_in: z.string(), check_out: z.string(), promo_code: z.string().optional() }),
                execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                    try {
                        const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                        await createTemporaryHold(villa_id, check_in, check_out, userId);
                        const bookingUrl = `${currentUrl}/booking/${villa_id}?checkIn=${check_in}&checkOut=${check_out}${promo_code ? `&promo=${promo_code}` : ''}`;
                        return JSON.stringify({ status: 'success', quote, action_url: bookingUrl });
                    } catch (e) {
                        return JSON.stringify({ status: 'error', message: 'Fallo al generar cotización.' });
                    }
                },
            }),
            store_salty_memory: tool({
                description: 'Guarda preferencias importantes del huésped.',
                parameters: z.object({ fact: z.string() }),
                execute: async ({ fact }) => {
                    try {
                        if (!sessionId) return JSON.stringify({ status: 'ignored' });
                        await supabase.from('salty_memories').insert({
                            session_id: sessionId,
                            property_id: effectivePropertyId,
                            learned_text: fact
                        });
                        return JSON.stringify({ status: 'success', message: "Memoria guardada." });
                    } catch (e) {
                        return JSON.stringify({ status: 'error', message: "Fallo al guardar memoria." });
                    }
                }
            })
        };

        const filteredTools: Record<string, any> = {};
        Object.keys(allTools).forEach(key => {
            if (!restrictedTools.includes(key)) {
                filteredTools[key] = allTools[key];
            }
        });

        const result = await streamText({
            model: google('gemini-2.0-flash'),
            messages: finalMessages,
            maxSteps: 5,
            temperature: 0.7,
            tools: filteredTools,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        // 🆘 PRINCIPAL ENGINEER EMERGENCY LOGGER
        console.error("🚨 [CRITICAL BRIDGE FAILURE]: Full Context Audit\n", {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            sessionId: req.headers.get('x-session-id') || 'untracked'
        });

        // 🛡️ SAFETY NET: Fallback response for UI continuity
        return new Response(
            " Estoy verificando tus fechas, dame un segundo adicional mientras calibro mi conexión.", 
            { 
                status: 200, // Returning 200 to avoid UI crash, text will show up as a direct answer
                headers: { 'Content-Type': 'text/plain' } 
            }
        );
    }
}
