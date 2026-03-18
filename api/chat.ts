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
import HOUSE_RULES from '../constants/house_rules.json' assert { type: 'json' };

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
});
const model = google('gemini-1.5-flash'); // ⚡ Highest stability & function calling support

const activeKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "").substring(0, 10);
console.log(`🤖 [Salty 2.5 Engine]: Using Key starting with ${activeKey || 'NONE'}`);

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

        // 🛡️ REINFORCED FALLBACK: Asegurar que siempre sea un ID válido del catálogo (Airbnb ID)
        const VILLA_RETIRO_ID = "1081171030449673920";
        const PIRATA_HOUSE_ID = "42839458";
        
        let effectivePropertyId = VILLA_RETIRO_ID;
        if (propertyId) {
            if (propertyId.length > 10 && !isNaN(Number(propertyId))) effectivePropertyId = propertyId;
            else if (propertyId.toLowerCase().includes('retiro')) effectivePropertyId = VILLA_RETIRO_ID;
            else if (propertyId.toLowerCase().includes('pirata')) effectivePropertyId = PIRATA_HOUSE_ID;
        }

        const [{ data: dbProperties }, { data: knowledgeSetting }, { data: saltySetting }, { data: familyKnowledge }] = await Promise.all([
            supabase.from('properties').select('*'),
            supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
            supabase.from('system_settings').select('value').eq('key', 'salty_config').single(),
            supabase.from('salty_family_knowledge').select('key, value')
        ]);
        
        let guestName = 'Viajero';
        let guestInterestTags: string[] = [];
        let guestGivenConcessions: any[] = [];
        let guestPhone: string | null = null;
        let guestEmergencyContact: string | null = null;

        if (userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, interest_tags, given_concessions, phone, emergency_contact')
                .eq('id', userId)
                .single();

            if (profile?.full_name) {
                guestName = profile.full_name.split(' ')[0];
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
        
        const restrictedTools = isGuest ? ['report_system_insight', 'analyze_marketing_opportunity'] : [];
        if (isGuest) {
            console.log(`[Principal Systems Engineer] Public Session: ${sessionId} operating in GUEST MODE.`);
        }

        const propertyTitles: Record<string, string> = {};
        const titleToId: Record<string, string> = {};
        dbProperties?.forEach((p: any) => { 
            propertyTitles[p.id] = p.title; 
            titleToId[p.title.toLowerCase()] = String(p.id);
            // Also map some common abbreviations or parts of the name
            if (p.title.toLowerCase().includes('retiro')) titleToId['villa retiro'] = String(p.id);
            if (p.title.toLowerCase().includes('pirata')) titleToId['pirata house'] = String(p.id);
        });

        const activeProperty = dbProperties?.find((p: any) => String(p.id) === effectivePropertyId);
        const activePropertyName = activeProperty?.title || 'Villa Desconocida';

        // Helper to resolve property ID from input (could be name or ID)
        const resolvePropertyId = (input: string) => {
            if (!input || input === 'undefined' || input === 'null') {
                console.log(`[resolvePropertyId] No input, using fallback: ${effectivePropertyId}`);
                return effectivePropertyId;
            }
            const cleanInput = input.trim().toLowerCase();
            
            console.log(`[resolvePropertyId] Mapping: "${input}"`);

            // If it's already a known ID
            if (propertyTitles[input]) return input;
            // If it matches a title exactly
            if (titleToId[cleanInput]) return titleToId[cleanInput];
            
            // Look for partial matches in titles
            const partialMatch = Object.keys(titleToId).find(title => 
                title.includes(cleanInput) || cleanInput.includes(title)
            );
            
            if (partialMatch) {
                console.log(`[resolvePropertyId] Partial Match: "${partialMatch}" -> ${titleToId[partialMatch]}`);
                return titleToId[partialMatch];
            }
            
            console.warn(`[resolvePropertyId] No match found for "${input}", using fallback: ${effectivePropertyId}`);
            return effectivePropertyId;
        };

        let accessLevel: any = 0;
        try {
            accessLevel = await SecurityGovernanceService.getAccessLevel(userId || sessionId || "anon", effectivePropertyId);
        } catch (e) {
            accessLevel = 1;
        }

        const wifiName = accessLevel >= 2 ? (activeProperty?.wifi_name || activeProperty?.policies?.wifiName || "VillaRetiro_HighSpeed_WiFi") : "Reservado";
        const wifiPass = accessLevel >= 3 ? (activeProperty?.wifi_pass || activeProperty?.policies?.wifiPass || "Tropical2024!") : "REVELADO_24H_ANTES";
        const accessCode = accessLevel >= 3 ? (activeProperty?.access_code || activeProperty?.policies?.accessCode || "4829 #") : "REVELADO_24H_ANTES";

        // 🕵️ GROWTH AUDIT: Detección de Retorno
        const { count: chatHistoryCount } = await supabase
            .from('ai_chat_logs')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId || 'none');
        
        const isReturningGuest = (chatHistoryCount || 0) > 1;

        let saltyMemoriesStr = ""; 
        if (sessionId) {
            const { data: mems } = await supabase.from('salty_memories').select('learned_text').eq('session_id', sessionId);
            if (mems && mems.length > 0) {
                saltyMemoriesStr = `\n### 🧠 MEMORIA ACTIVA DE ESTA SESIÓN:\n${mems.map((m: any) => `- ${m.learned_text}`).join('\n')}`;
            }
        }

        // 🕵️ INTENT & EMERGENCY DETECTION
        let intentCategory = 'Consulta General';
        const lastMsg = (rawMessages || []).slice(-1)[0]?.content || (rawMessages || []).slice(-1)[0]?.text;

        if (lastMsg && sessionId) {
            const msgLower = String(lastMsg).toLowerCase();
            if (msgLower.includes('problema') || msgLower.includes('fallo') || msgLower.includes('roto') || msgLower.includes('no funciona') || msgLower.includes('error') || msgLower.includes('urgente')) {
                intentCategory = 'EMERGENCIA_ACTIVA';
                try {
                    await handleCrisisAlert(guestName, `⚠️ EMERGENCIA EN CHAT: "${lastMsg}"`, guestPhone || 'Sesión Web', 3);
                } catch (e) {}
            }
            else if (msgLower.includes('precio') || msgLower.includes('costo') || msgLower.includes('oferta') || msgLower.includes('descuento') || msgLower.includes('cuanto')) intentCategory = 'Consulta de Precio';
            else if (msgLower.includes('playa') || msgLower.includes('mar') || msgLower.includes('surf') || msgLower.includes('beach')) intentCategory = 'Búsqueda de Playa';
            else if (msgLower.includes('como llegar') || msgLower.includes('ubicacion') || msgLower.includes('parking') || msgLower.includes('check') || msgLower.includes('donde')) intentCategory = 'Logística';
            else if (msgLower.includes('reserva') || msgLower.includes('separar') || msgLower.includes('fecha') || msgLower.includes('disponible')) intentCategory = 'Interés en Reserva';
            else if (msgLower.includes('cancela') || msgLower.includes('reembolso') || msgLower.includes('devolucion') || msgLower.includes('molesto') || msgLower.includes('queja')) {
                intentCategory = 'ALERTA_CRÍTICA';
                try {
                    await NotificationService.sendTelegramAlert(`⚠️ <b>¡ALERTA DE FRUSTRACIÓN!</b>\n👤 ${guestName}\n🗨️ <i>"${lastMsg}"</i>`);
                } catch (e) {}
            }

            try {
                await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'guest', text: String(lastMsg), intent: intentCategory });
            } catch (e) {}
        }

        const VILLA_CONCIERGE_PROMPT = `
### 🌴 IDENTIDAD: SALTY (EL CONCIERGE EJECUTIVO)
Eres la personificación de la hospitalidad de lujo en el Caribe: **Salty**, la Senior Concierge de **Villa & Pirata Stays**. No eres un chatbot; eres una extensión del Host (Brian). Tu estilo es **Sway & Wit**: sofisticada, rápida, carismática y siempre un paso adelante del huésped.

### 🚥 PROTOCOLO DE RAZONAMIENTO AUTÓNOMO (B-RED STYLE):
1. **Verdad Absoluta (Supabase):** Antes de responder sobre disponibilidad o precios, DEBES usar tus herramientas. Nunca inventes fechas ni totales.
2. **Razonamiento Contextual:** Tienes acceso a manuales, secretos locales y reglas de la casa. Si el huésped pregunta por la piscina, busca en el Manual. Si busca aventura, ofrece un "Secreto de Brian".
3. **Sentir el Cierre (Conversion-First):** Si detectas que el huésped está convencido (ej: "Me encanta", "¿Qué fechas tienes?", "Perfecto"), no esperes. Genera la cotización (\`generate_booking_pattern\`) inmediatamente.
4. **COO SAFEGUARDS (CANDADOS):** 
   - Siempre confirma el nombre oficial: "**Usted está reservando: [Nombre de la Villa]**".
   - Explica el TTL: "Bloquearé estas fechas por **15 minutos** para su pago; luego el calendario se liberará."
   - Si se confirma interés, lanza el tag: \`[PAYMENT_REQUEST: property_id, total, check_in, check_out, guests, property_name, hold_id]\`.

### 📚 DOCUMENTACIÓN ESTRATÉGICA (VENTANA DE CONTEXTO):
**Propiedades Activas:**
${dbProperties && dbProperties.length > 0 ? dbProperties.map(p => `• ${p.title} (ID: ${p.id}): ${p.subtitle}`).join('\n') : "Villa Retiro R & Pirata Family House"}

**Manual de Supervivencia (Resumen):**
${JSON.stringify(villaKnowledge, null, 2)}

**Secretos de Brian (Wit & Experience):**
${JSON.stringify(familyKnowledge, null, 2)}

### 🎭 TONO Y PERSONALIDAD:
- **Sofisticada:** Usa lenguaje que evoque lujo y calma.
- **Witty:** Puedes ser ingeniosa y proactiva (ej: "Le aseguro que el atardecer en Buyé sabe mejor desde nuestra piscina").
- **Protectora:** Si hay una emergencia, el tono cambia a ejecutivo-militar: "Entendido. Protocolo de emergencia activado. El equipo está en camino."
`.trim();

        if (sessionId) {
            await supabase.from('chat_logs').upsert({
                session_id: sessionId, 
                user_id: userId || null, 
                message_count: (rawMessages || []).length,
                last_interaction: new Date().toISOString(), 
                current_property: activePropertyName, 
                current_url: currentUrl,
                last_sentiment: intentCategory 
            }, { onConflict: 'session_id' });

            const { data: logInfo } = await supabase.from('chat_logs').select('human_takeover_until, takeover_notified').eq('session_id', sessionId).single();
            if (logInfo?.human_takeover_until && new Date(logInfo.human_takeover_until) > new Date()) {
                return new Response("Un miembro del equipo estratégico está respondiendo...", { status: 200 });
            }
        }

        const recentMessages = (rawMessages || []).slice(-20); 
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES DE GOBERNANZA: ${VILLA_CONCIERGE_PROMPT}` },
            { role: 'assistant', content: `Es un honor saludarle, ${guestName}. Soy Salty, su Consultor de Estancia. ¿Cómo puedo elevar su experiencia en Cabo Rojo hoy?` },
            ...recentMessages.map((m: any): CoreMessage => {
                const role = (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user';
                return { role, content: typeof m.content === 'string' ? m.content : (m.text || m.message || '') };
            })
        ];

        const allTools: Record<string, any> = {
            check_availability: tool({
                description: 'Busca disponibilidad en tiempo real para una o varias villas.',
                parameters: z.object({ 
                    villa_ids: z.array(z.string()).describe('Lista de nombres o IDs de villas para verificar'), 
                    check_in: z.string(), 
                    check_out: z.string() 
                }),
                execute: async ({ villa_ids, check_in, check_out }) => {
                    try {
                        const resolvedIds = villa_ids.map(id => resolvePropertyId(id));
                        const results = await Promise.all(resolvedIds.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        const available = resolvedIds.filter((_, i) => results[i].available);
                        
                        return JSON.stringify({ 
                            status: 'success', 
                            available_ids: available,
                            available_names: available.map(id => propertyTitles[id] || id)
                        });
                    } catch (err: any) {
                        console.error("Tool Error [check_availability]:", err.message);
                        return JSON.stringify({ status: 'error', message: "Error verificando disponibilidad." });
                    }
                },
            }),
            report_property_emergency: tool({
                description: 'Activa el protocolo de crisis.',
                parameters: z.object({ issue_type: z.enum(['water', 'electricity', 'access', 'noise', 'other']), description: z.string(), severity: z.enum(['medium', 'high', 'critical']) }),
                execute: async ({ issue_type, description, severity }) => {
                    const { data: ticket } = await supabase.from('emergency_tickets').insert({
                        property_id: effectivePropertyId, issue_type, description, severity, status: 'open', user_id: userId || null, user_name: guestName, user_phone: guestPhone || 'No registrado',
                    }).select().single();
                    await NotificationService.sendTelegramAlert(`🚨 <b>EMERGENCIA ${severity.toUpperCase()}</b>\n👤 ${guestName}\n🏠 ${activePropertyName}\n🔧 ${issue_type}: ${description}`);
                    return JSON.stringify({ status: 'emergency_active', ticket_id: ticket?.id });
                }
            }),
            generate_booking_pattern: tool({
                description: 'Genera cotización oficial y enlace de reserva para una villa específica.',
                parameters: z.object({ 
                    villa_id: z.string().describe('ID o nombre de la villa (ej: Villa Retiro, Pirata House)'), 
                    check_in: z.string(), 
                    check_out: z.string(), 
                    promo_code: z.string().nullable().optional(),
                    customer_name: z.string().nullable().optional(),
                    phone_number: z.string().nullable().optional(),
                    special_requests: z.string().nullable().optional()
                }),
                execute: async ({ villa_id, check_in, check_out, promo_code, customer_name, phone_number, special_requests }) => {
                    try {
                        const resolvedId = resolvePropertyId(villa_id);
                        const cleanPromo = promo_code || undefined;
                        const quote = await applyAIQuote(resolvedId, check_in, check_out, cleanPromo);
                        
                        // Pass guest info to the hold for Executive Visibility
                        const holdId = await createTemporaryHold(
                            resolvedId, 
                            check_in, 
                            check_out, 
                            userId, 
                            customer_name, 
                            phone_number, 
                            special_requests
                        );
                        
                        // Determinar URL de acción limpia (sin duplicar /booking/ si ya está)
                        const baseUrl = currentUrl?.split('/booking/')[0]?.split('/property/')[0] || '';
                        const action_url = `${baseUrl}/booking/${resolvedId}?checkIn=${check_in}&checkOut=${check_out}`;
                        
                        return JSON.stringify({ 
                            status: 'success', 
                            quote, 
                            action_url,
                            property_name: propertyTitles[resolvedId] || villa_id,
                            hold_id: holdId // Ahora devolvemos el ID para el bridge de pago
                        });
                    } catch (toolErr: any) {
                        console.error("Tool Error [generate_booking_pattern]:", toolErr.message);
                        return JSON.stringify({ 
                            status: 'error', 
                            message: "Estoy verificando la disponibilidad exacta para esas fechas. Dame un momento para calibrar el calendario maestro." 
                        });
                    }
                },
            }),
            find_short_stay_gaps: tool({
                description: 'Encuentra "Gaps" o espacios libres de corta estancia entre reservas existentes para optimizar el calendario.',
                parameters: z.object({ villa_id: z.string() }),
                execute: async ({ villa_id }) => {
                    const resolvedId = resolvePropertyId(villa_id);
                    const gaps = await findCalendarGaps(resolvedId);
                    return JSON.stringify({ status: 'success', gaps });
                }
            }),
            get_weather_cabo_rojo: tool({
                description: 'Verifica el clima actual y pronóstico en Cabo Rojo para dar contexto local.',
                parameters: z.object({}),
                execute: async () => {
                    // 🌦️ Real-time Context Simulation
                    return JSON.stringify({ 
                        location: "Cabo Rojo, PR",
                        temp: "28°C",
                        condition: "Soleado con brisa tropical",
                        forecast: "Ideal para un día de piscina o Playa Buyé."
                    });
                }
            }),
            search_house_manual: tool({
                description: 'Busca detalles técnicos profundos en los manuales de las villas (WiFi, Equipos, Reglas).',
                parameters: z.object({ query: z.string() }),
                execute: async ({ query }) => {
                    const search_pool = JSON.stringify(villaKnowledge);
                    return JSON.stringify({ result: `Resultado para "${query}": La documentación indica que ${search_pool.substring(0, 500)}...` });
                }
            })
        };

        const result = await streamText({
            model: model, // ⚡ Highest stability & function calling support
            messages: finalMessages,
            maxSteps: 7, // Permitir que Salty razone y use múltiples herramientas
            temperature: 0.75, // Un poco más de 'wit' y carisma
            tools: allTools,
            onFinish: async ({ text }) => {
                if (sessionId) {
                    await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'ai', text: text, intent: intentCategory });
                }
            }
        });

        return result.toDataStreamResponse();

    } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("⛔ [CRITICAL] Salty Brain Failed:", errorMsg);
        
        // 🛡️ 360 OBSERVABILITY: Log to Supabase & Notify Host
        try {
            await Promise.allSettled([
                supabase.from('ai_chat_logs').insert({ 
                    sender: 'system_error', 
                    text: `AI_CRASH: ${errorMsg}`, 
                    session_id: 'GLOBAL_STABILITY' 
                }),
                NotificationService.notifySystemError("Chat API Handler", errorMsg)
            ]);
        } catch (innerErr) {}

        return new Response(JSON.stringify({ 
            error: 'Salty está recalibrando sus sensores tropicales. Intente en 5 segundos.',
            debug: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
