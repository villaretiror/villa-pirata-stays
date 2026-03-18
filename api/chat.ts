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

        // 🛡️ REINFORCED FALLBACK
        const effectivePropertyId = String(propertyId || "1081171030449673920");

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
        dbProperties?.forEach((p: any) => { propertyTitles[p.id] = p.title; });

        const activeProperty = dbProperties?.find((p: any) => String(p.id) === effectivePropertyId);
        const activePropertyName = activeProperty?.title || 'Villa Desconocida';

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
Eres la personificación de la hospitalidad de lujo en Puerto Rico: **Salty**, la Senior Concierge de **Villa & Pirata Stays**. Tu estilo es **Caribe Chic Profesional**: sofisticada, acogedora y **altamente orientada a la conversión**.

### 🚥 MODO OPERATIVO ACTUAL:
${intentCategory === 'EMERGENCIA_ACTIVA' || intentCategory === 'ALERTA_CRÍTICA' 
    ? "🚨 **MODO SOPORTE VIP ACTIVADO:** El huésped reporta un problema. Prioriza la calma, ofrece soluciones técnicas inmediatas de las House Rules y confirma que el equipo está alertado." 
    : "🌴 **MODO CRECIMIENTO:** Enfócate en la conversión, el cierre de reserva y los beneficios premium."}

### 🎭 PERSONALIZACIÓN DINÁMICA:
• Huésped: **${guestName}**
• Retorno: ${isReturningGuest ? "SÍ (Bienvenido de nuevo)." : "NUEVA SESIÓN."}

### 🌴 PROTOCOLO DE CONVERSIÓN:
1.  **Cierre de Venta (CTA):** Termina con: "¿Le gustaría proceder con la reserva ahora o prefiere ver otra opción?".
2.  **Defensa de Valor:** Resalta Energía Solar, Reserva de Agua y Privacidad Total.
3.  **CTA de Confianza:** Si no hay reserva, cierra con: "Mi meta es que su estancia sea impecable; si tiene dudas sobre la logística, estoy aquí las 24 horas. ✨"

### 🛎️ HOUSE RULES:
${JSON.stringify(HOUSE_RULES, null, 2)}

### 🏠 BASE DE CONOCIMIENTO:
- WiFi: \`${wifiName}\` | Clave: \`${wifiPass}\`
- Acceso: \`${accessCode}\`
- Villa Knowledge: ${JSON.stringify(villaKnowledge, null, 2)}
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
                description: 'Busca disponibilidad en tiempo real.',
                parameters: z.object({ villa_ids: z.array(z.string()), check_in: z.string(), check_out: z.string() }),
                execute: async ({ villa_ids, check_in, check_out }) => {
                    const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                    const available = villa_ids.filter((_, i) => results[i].available);
                    return JSON.stringify({ status: 'success', available_ids: available });
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
                description: 'Genera cotización oficial.',
                parameters: z.object({ villa_id: z.string(), check_in: z.string(), check_out: z.string(), promo_code: z.string().optional() }),
                execute: async ({ villa_id, check_in, check_out, promo_code }) => {
                    const quote = await applyAIQuote(villa_id, check_in, check_out, promo_code);
                    await createTemporaryHold(villa_id, check_in, check_out, userId);
                    return JSON.stringify({ status: 'success', quote, action_url: `${currentUrl}/booking/${villa_id}?checkIn=${check_in}&checkOut=${check_out}` });
                },
            })
        };

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages: finalMessages,
            maxSteps: 5,
            temperature: 0.7,
            tools: allTools,
            onFinish: async ({ text }) => {
                if (sessionId) {
                    await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'ai', text: text, intent: intentCategory });
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("🚨 [CRITICAL BRIDGE FAILURE]:", error);
        return new Response("Estoy verificando tus fechas, dame un segundo adicional mientras calibro mi conexión.", { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
}
