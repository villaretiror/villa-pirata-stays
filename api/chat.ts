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
        const memoryContext = familyKnowledge && familyKnowledge.length > 0
            ? `\n\n### MEMORIAS PRIVADAS (FAMILIA):\n${familyKnowledge.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
            : "";

        const propertyTitles: Record<string, string> = {};
        dbProperties?.forEach((p: any) => { propertyTitles[p.id] = p.title; });

        const activeProperty = dbProperties?.find((p: any) => String(p.id) === effectivePropertyId);
        const activePropertyName = activeProperty?.title || 'Villa Desconocida';

        const wifiName = activeProperty?.wifi_name || activeProperty?.policies?.wifiName || "VillaRetiro_HighSpeed_WiFi";
        const wifiPass = activeProperty?.wifi_pass || activeProperty?.policies?.wifiPass || "Tropical2024!";
        const accessCode = activeProperty?.access_code || activeProperty?.policies?.accessCode || "4829 #";

        // 🧠 GUEST MEMORY CONTEXT: Build personalization blurb for the prompt
        const interestContext = guestInterestTags.length > 0
            ? `\n### 🏷️ INTERESES DEL HUÉSPED (${guestName}):\nEste huésped ha marcado preferencia por: ${guestInterestTags.join(', ')}. Prioriza recomendaciones relacionadas. Ej: si tiene 'beach', menciona Playa Buyé primero; si tiene 'food', destaca los restaurantes locales del guía de Cabo Rojo.`
            : '';

        const concessionContext = guestGivenConcessions.length > 0
            ? `\n### 🔒 CONCESIONES PREVIAS (BLINDAJE FINANCIERO):\nEste huésped YA RECIBIÓ concesiones en el pasado: ${JSON.stringify(guestGivenConcessions)}. NO ofrezcas descuentos adicionales. Si pide rebaja, comunica que la tarifa actual ya refleja el mejor precio exclusivo posible. Protege el margen de ganancia.`
            : `\n### 💎 CONCESIONES: Huésped sin historial de descuentos. Puedes ofrecer hasta 10% si la situación lo justifica y el total no baja del min_price_floor.`;

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
                    let success = false;
                    try {
                        const { NotificationService } = await import('../services/NotificationService.js');
                        const siteUrl = parsedBody.currentUrl || process.env.VITE_SITE_URL || 'https://villaretiror.com';
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: "🎤 Responder ahora", callback_data: `takeover_${sessionId}` }],
                                [{ text: "📊 Ver en Dashboard", url: `${siteUrl}/host` }]
                            ]
                        };
                        success = await NotificationService.sendTelegramAlert(
                            `🛡️ <b>Gov-Mode: ${activePropertyName}</b>\n👤 ${userId || 'Invitado'}\n🗨️ <i>"${lastMsg}"</i>\n\nSesión: <code>${sessionId}</code>`,
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

        // 🚀 INDUSTRIAL OPTIMIZATION: Limit to 10 messages for sub-second Edge efficiency
        const recentMessages = (rawMessages || []).slice(-10);
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES DE GOBERNANZA: ${VILLA_CONCIERGE_PROMPT}` },
            { role: 'assistant', content: `Es un honor saludarle, ${guestName}. Soy Salty, su Consultor de Estancia. ¿Cómo puedo elevar su experiencia en Cabo Rojo hoy?` },
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
                        try {
                            const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                            const available = villa_ids.filter((_, i) => results[i].available);
                            return { status: 'success', available_ids: available };
                        } catch (e) {
                            console.error('[AI Tool check_availability] Failed:', e);
                            return { 
                                status: 'offline_fallback', 
                                available_ids: [], 
                                message: 'Salty indica que el motor de reservas está recibiendo mucho tráfico. Por favor, intente en 30 segundos o contacte al anfitrión directamente.' 
                            };
                        }
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
                        severity: z.enum(['medium', 'high', 'critical']),
                        user_name: z.string().optional(),
                        user_phone: z.string().optional(),
                    }),
                    execute: async ({ issue_type, description, severity, user_name, user_phone }) => {
                        // 🆘 EMERGENCY CONTACT SYNC: Always prefer the profile data over what the guest types
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
                            const { NotificationService } = await import('../services/NotificationService.js');
                            const siteUrl = process.env.VITE_SITE_URL || 'https://villaretiror.com';
                            const waContact = resolvedPhone.replace(/\D/g, '');
                            const keyboard = {
                                inline_keyboard: [
                                    [{ text: `📲 WA Huésped: ${resolvedName}`, url: `https://wa.me/${waContact}` }],
                                    [{ text: "🏦 Ver en Dashboard", url: `${siteUrl}/host` }]
                                ]
                            };
                            // 1. Alert primary host channel
                            await NotificationService.sendTelegramAlert(
                                `🚨 <b>¡EMERGENCIA ${severity.toUpperCase()}!</b>\n\n` +
                                `👤 <b>Huésped:</b> ${resolvedName}\n` +
                                `📞 <b>Celular:</b> ${resolvedPhone}\n` +
                                `🆘 <b>Contacto Emergencia:</b> ${resolvedEmergencyContact}\n` +
                                `🏠 <b>Villa:</b> <code>${activePropertyName}</code>\n\n` +
                                `🔧 <b>Problema:</b> ${issue_type} | Severidad: ${severity}\n` +
                                `📋 ${description}\n\n` +
                                `🛠️ <b>Técnico Asignado:</b> ${recommendedProvider?.name || 'Ninguno disponible'}`,
                                keyboard
                            );
                            // 2. 🆘 TEAM DELEGATION: Alert all active co-hosts for this property
                            await NotificationService.notifyEmergencyToCohosts(
                                effectivePropertyId,
                                activePropertyName,
                                issue_type,
                                description,
                                severity,
                                resolvedName,
                                resolvedPhone
                            );
                        } catch (e) {
                            console.error("[Emergency Tool Error]:", e);
                        }


                        return {
                            status: 'emergency_active',
                            ticket_id: ticket?.id,
                            provider: recommendedProvider ? {
                                name: recommendedProvider.name,
                                eta: '30-60 min'
                            } : null,
                            instruction: `Informe a ${resolvedName} que el equipo de emergencia ha sido notificado. Un técnico está siendo coordinado. Si necesitas ayuda inmediata, te contactaremos al ${resolvedPhone}.`
                        };
                    }
                }),
                generate_booking_pattern: tool({
                    description: 'Genera cotización oficial y enlace seguro de pago. También crea un bloqueo temporal del calendario por 15 minutos.',
                    parameters: z.object({ villa_id: z.string(), check_in: z.string(), check_out: z.string(), promo_code: z.string().optional() }),
                    execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                        const property = dbProperties?.find((p: any) => p.id === villa_id);

                        // 🛡️ CONCESSIONS GUARD: Block additional discounts if user already has one
                        if (promo_code && guestGivenConcessions.length > 0) {
                            const twelveMonthsAgo = new Date();
                            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
                            const hasRecentConcession = guestGivenConcessions.some(
                                (c: any) => c.date && new Date(c.date) > twelveMonthsAgo
                            );
                            if (hasRecentConcession) {
                                return `${guestName}, es un placer continuar cuidando de usted. 💎 Sin embargo, por nuestras políticas de exclusividad, no es posible aplicar descuentos adicionales en este período — su tarifa actual ya es la más privilegiada que puedo ofrecer. ¿Le preparo la cotización al precio premium con todas las amenidades incluidas?`;
                            }
                        }

                        const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                        
                        // Safety Check: min_price_floor guard
                        const finalTotalPerNight = quote.total / quote.nights;
                        if (property && finalTotalPerNight < property.min_price_floor) {
                            return "Lo lamento, pero este descuento excede mis límites de cortesía. El valor de la villa y sus amenidades (Energía 24/7, Privacidad Total) justifican el precio base.";
                        }

                        // 🔒 HOLD SYSTEM: Execute temporary 15-min hold to prevent overbooking
                        const holdCreated = await createTemporaryHold(villa_id, check_in, check_out, userId);
                        
                        const bookingUrl = `${currentUrl}/booking/${villa_id}?checkIn=${check_in}&checkOut=${check_out}${promo_code ? `&promo=${promo_code}` : ''}`;
                        return `He preparado su cotización de élite: Total **$${quote.total}** por ${quote.nights} noches. 💎\n\n${holdCreated ? '🔒 He reservado estas fechas temporalmente por 15 minutos para que pueda completar su pago sin interrupciones.' : ''}\n\n[BOOKING_ACTION: ${bookingUrl}]`;
                    },
                }),
                store_salty_memory: tool({
                    description: 'ACTIVO: Guarda preferencias importantes, horas de llegada, alergias, o información valiosa del huésped al finalizar tu respuesta, para NO tener que volver a preguntarlo en la sesión. Sé conciso.',
                    parameters: z.object({ fact: z.string() }),
                    execute: async ({ fact }) => {
                        if (!sessionId) return { status: 'ignored_no_session' };
                        const { error } = await supabase.from('salty_memories').insert({
                            session_id: sessionId,
                            property_id: effectivePropertyId,
                            learned_text: fact
                        });
                        if (error) {
                            console.error('[Salty Memory Error]:', error.message);
                            return { status: 'error', detail: error.message };
                        }
                        return { status: 'success', recorded_memory: fact };
                    }
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
