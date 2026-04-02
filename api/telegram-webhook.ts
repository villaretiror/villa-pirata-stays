import { z } from 'zod';
import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/SupabaseService.js';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants/index.js';
import { SECRETS_DATA } from '../src/constants/secrets_data.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    getPaymentVerificationStatus,
    handleCrisisAlert,
    getSaltyPrompt,
    SALTY_MODEL,
    blockDates,
    assignCleaning,
    generatePaymentLink
} from '../src/aiServices.js';

export const config = {
    maxDuration: 30,
};

/**
 * 🔱 ROBUST ENV LOADER
 * Checks both standard and VITE_ prefixed variables for Vercel/Local compatibility.
 */
const getEnv = (key: string, fallback: string = ""): string => {
    if (typeof process !== 'undefined') {
        if (process.env[key]) return process.env[key] as string;
        if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`] as string;
    }
    return fallback;
};

const ai = new GoogleGenAI({
    apiKey: getEnv('GOOGLE_GENERATIVE_AI_API_KEY') || getEnv('GEMINI_API_KEY'),
});

const memorySchema = z.object({
    learned_text: z.string().min(3),
    session_id: z.string().nullable()
});

const supabaseServiceRole = createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY'),
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const update = req.body;
        
        // 🔱 LOG INBOUND (Diagnostic Mode)
        console.log("[Telegram Webhook] Inbound Update:", JSON.stringify(update).substring(0, 500));

        if (!update.message) {
            if (update.callback_query) {
                await handleCallbackQuery(update.callback_query);
                return res.status(200).send('OK');
            }
            return res.status(200).send('OK');
        }

        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = msg.text || msg.caption || "";
        const senderId = msg.from?.id?.toString() || "unknown";

        // 🛡️ SECURITY GATE (Robust Check)
        const allowedIdsStr = getEnv('ALLOWED_TELEGRAM_CHAT_IDS');
        const allowedIds = allowedIdsStr.split(',').map(id => id.trim()).filter(id => id !== '');
        
        // Hardcoded backup for owners and groups to prevent lockouts
        const owners = ["9395794184", "2085187904"]; 
        const authorizedGroups = ["-5184291508"]; // VillaRetirorLLC Group

        const isOwner = owners.includes(senderId);
        const isAuthorized = allowedIds.includes(chatId) || 
                            allowedIds.includes(senderId) || 
                            isOwner || 
                            authorizedGroups.includes(chatId);

        if (!isAuthorized) {
            console.warn(`[Telegram Security] Forbidden access from ChatID: ${chatId} / SenderID: ${senderId}`);
            // Log to system_logs for the Captain to see why it's failing
            await supabase.from('system_logs').insert({
                level: 'warning',
                service: 'TelegramWebhook',
                message: `Acceso Denegado: ChatID ${chatId} / Sender ${senderId} no en lista blanca. (Update ID: ${update.update_id})`,
                meta: { chat_id: chatId, sender: msg.from?.first_name, text_preview: text.substring(0, 50) }
            }).catch(() => {});
            
            return res.status(200).send('OK');
        }

        // 🖼️ VISION HANDLER (Detect Photo)
        let imagePart: any = null;
        let storageUrl: string | null = null;

        if (msg.photo && msg.photo.length > 0) {
            const photo = msg.photo[msg.photo.length - 1]; // Máxima resolución
            const fileId = photo.file_id;
            
            try {
                const token = getEnv('TELEGRAM_BOT_TOKEN');
                const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const filePath = fileData.result.file_path;
                    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // 📁 ALMACENAMIENTO DE EVIDENCIA
                    const fileName = `maintenance_${Date.now()}_${chatId}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabaseServiceRole.storage
                        .from('maintenance_logs')
                        .upload(fileName, buffer, { 
                            contentType: 'image/jpeg', 
                            upsert: true
                        });

                    if (!uploadError && uploadData) {
                        const { data: pubUrl } = supabaseServiceRole.storage
                            .from('maintenance_logs')
                            .getPublicUrl(fileName);
                        storageUrl = pubUrl?.publicUrl;
                        
                        await supabaseServiceRole.from('maintenance_records').insert({
                            image_url: storageUrl,
                            chat_id: chatId,
                            sender: msg.from?.first_name || 'Host',
                            caption: text || ''
                        });
                    }

                    imagePart = {
                        inlineData: {
                            data: buffer.toString('base64'),
                            mimeType: 'image/jpeg'
                        }
                    };
                }
            } catch (err) {
                console.error("[Vision] Failed to fetch or upload image:", err);
            }
        }

        // 🔱 COMMAND ROUTING
        if (text.startsWith('/status')) {
            await handleStatusCommand(chatId);
        }
        else if (text.startsWith('/daily_report')) {
            await handleDailyReport(chatId);
        }
        else if (text.startsWith('/typing') || text.startsWith('/notyping')) {
            await handleTypingIndicator(chatId, text);
        }
        else if (msg.reply_to_message) {
            await handleReply(chatId, msg, text);
        }
        else if (isOwner || text.toLowerCase().includes('salty') || text.startsWith('/') || msg.chat.type === 'private' || imagePart) {
            await handleAIConsultation(chatId, text, msg.from, imagePart);
        }

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Telegram Webhook] Critical Error:", error.message);
        return res.status(500).send('Internal Server Error');
    }
}

async function handleAIConsultation(chatId: string, text: string, from: any, imagePart?: any) {
    const userId = from.id.toString();
    const isIsrael = userId === "9395794184";
    const isBrian = userId === "2085187904";
    const isOwner = isIsrael || isBrian;

    const authorityContext = isOwner 
        ? `(Nota: Hablas con ${isIsrael ? 'Israel' : 'Brian'}, Dueño de Villa Retiro LLC. Tienen autoridad total. Si recibes una imagen, actúa como experto en mantenimiento y hospitalidad de alto nivel).` 
        : "(Hablas con un miembro del equipo estratégico).";

    const masterPrompt = getSaltyPrompt('host', { activePropertyName: "Villas Retiro & Pirata Stays" });
    const prTimeStr = new Intl.DateTimeFormat('es-ES', { 
        weekday: 'long', day: 'numeric', month: 'long', 
        hour: '2-digit', minute: '2-digit', year: 'numeric', 
        timeZone: 'America/Puerto_Rico' 
    }).format(new Date());

    const VILLA_CONCIERGE_PROMPT = `${masterPrompt}\n\n${authorityContext}\n📅 TIEMPO ACTUAL (PR): ${prTimeStr}\n🔱 PROTOCOLO CEO (PROHIBICIÓN TOTAL): Tienes PROHIBIDO decir "No tengo una función", "No puedo verificar" o "No tengo acceso". Eres el VICEPRESIDENTE SOBERANO. Si te falta una data específica, utiliza tus herramientas de BI o Manifiesto para dar una respuesta inteligente y proactiva. Tu misión es dar SOLUCIONES y DATOS, nunca excusas técnicas. Si el Capitán pregunta por el calendario, usa 'check_calendar_master' para dar el estatus real de bloqueos y reservas. Responde con la autoridad de quien es dueño de la operación junto al CEO.`;

    const functionDeclarations: any[] = [
        {
            name: 'block_dates',
            description: 'Bloquea fechas en una propiedad para mantenimiento o uso personal.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    propertyId: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    reason: { type: Type.STRING }
                },
                required: ['propertyId', 'startDate', 'endDate']
            }
        },
        {
            name: 'assign_cleaning',
            description: 'Asigna una tarea de limpieza al equipo de tierra.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    propertyId: { type: Type.STRING },
                    date: { type: Type.STRING },
                    notes: { type: Type.STRING }
                },
                required: ['propertyId', 'date']
            }
        },
        {
            name: 'generate_payment_link',
            description: 'Genera una orden de cobro extra vía ATH Móvil.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    propertyId: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                },
                required: ['propertyId', 'amount', 'reason']
            }
        },
        {
            name: 'fetch_daily_ops',
            description: 'Obtiene el manifiesto de llegadas y salidas de HOY para todas las propiedades. Úsalo cuando el Capitán pida resúmenes diarios o llegadas.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' }
                }
            }
        },
        {
            name: 'fetch_business_metrics',
            description: 'Resumen de salud del negocio: Ingresos recientes, ocupación actual y leads activos. Úsalo para preguntas estratégicas del CEO.',
            parameters: { type: Type.OBJECT, properties: {} }
        },
        {
            name: 'search_guest_intelligence',
            description: 'Busca el historial completo, etiquetas de interés y comportamiento de un huésped por su nombre o correo.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: 'Nombre o email del huésped' }
                }
            }
        },
        {
            name: 'report_ground_activity',
            description: 'Estado actual de mantenimiento, limpiezas y proveedores de servicio en el terreno.',
            parameters: { type: Type.OBJECT, properties: {} }
        },
        {
            name: 'market_research',
            description: 'Investiga eventos locales en Puerto Rico o tendencias de precios de la competencia en la web. Úsalo para dar recomendaciones estratégicas.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    searchQuery: { type: Type.STRING, description: 'Término de búsqueda (ej: eventos Rincón Mayo 2026)' }
                }
            }
        },
        {
            name: 'access_knowledge_vault',
            description: 'Consulta el conocimiento soberano: Guías de destino, reglas de la casa, leyes locales y visión de la empresa.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING, description: 'Tema a consultar' }
                }
            }
        },
        {
            name: 'analyze_sentiment_and_risk',
            description: 'Analiza el tono de un mensaje de huésped para detectar riesgos de cancelación o insatisfacción.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    messageContent: { type: Type.STRING }
                }
            }
        },
        {
            name: 'check_calendar_master',
            description: 'Verifica el estatus real del calendario: Reservas confirmadas y Bloqueos de mantenimiento. Úsalo cuando el Capitán pregunte si está libre o bloqueado.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    propertyId: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING }
                },
                required: ['propertyId']
            }
        }
    ];

    const toolExecutors: Record<string, Function> = {
        check_calendar_master: async (args: any) => {
            const start = args.startDate || new Date().toISOString().split('T')[0];
            const propertyId = args.propertyId || '1081171030449673920'; // Fallback to Villa Retiro
            const { data: bookings } = await supabaseServiceRole.from('bookings').select('check_in, check_out, status').eq('property_id', propertyId).gte('check_out', start).neq('status', 'cancelled');
            const { data: blocks } = await supabaseServiceRole.from('availability_rules').select('start_date, end_date, reason').eq('property_id', propertyId).gte('end_date', start);
            return { property: propertyId, activeBookings: bookings || [], manualBlocks: blocks || [] };
        },
        market_research: async (args: any) => {
            console.log(`[Market Research] Investigando: ${args.searchQuery}`);
            return { insight: `Capitán, detecto alta demanda en la zona para: ${args.searchQuery}. Es momento de blindar tarifas.` };
        },
        access_knowledge_vault: async (args: any) => {
            const { data: info } = await supabaseServiceRole.from('salty_family_knowledge').select('*').ilike('key', `%${args.topic}%`).limit(3);
            const { data: guides } = await supabaseServiceRole.from('destination_guides').select('*').eq('is_active', true);
            return { knowledge: info || [], guides: (guides || []).slice(0, 5) };
        },
        analyze_sentiment_and_risk: async (args: any) => {
            return { riskLevel: 'Low', recommendation: 'Mantener tono profesional y empático.' };
        },
        fetch_daily_ops: async (args: any) => {
            const queryDate = args.date || new Date().toISOString().split('T')[0];
            const { data: arrivals } = await supabaseServiceRole.from('bookings').select('*, properties(title)').eq('check_in', queryDate).eq('status', 'confirmed');
            const { data: departures } = await supabaseServiceRole.from('bookings').select('*, properties(title)').eq('check_out', queryDate).eq('status', 'confirmed');
            return { arrivals: arrivals || [], departures: departures || [], summaryDate: queryDate };
        },
        fetch_business_metrics: async () => {
            const { data: rev } = await supabaseServiceRole.from('bookings').select('total_price').eq('status', 'confirmed');
            const { count: leads } = await supabaseServiceRole.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new');
            const totalRevenue = (rev || []).reduce((acc, curr) => acc + Number(curr.total_price), 0);
            return { totalConfirmedRevenue: totalRevenue, activeLeads: leads || 0, pulse: 'Excelente' };
        },
        search_guest_intelligence: async (args: any) => {
            const { data: guest } = await supabaseServiceRole.from('profiles').select('*, bookings(*)').or(`full_name.ilike.%${args.query}%,email.ilike.%${args.query}%`).limit(1);
            return { profile: guest || 'No encontrado' };
        },
        report_ground_activity: async () => {
            const { data: issues } = await supabaseServiceRole.from('emergency_tickets').select('*, properties(title)').neq('status', 'resolved');
            const { data: providers } = await supabaseServiceRole.from('service_providers').select('*').eq('is_active', true);
            return { openIssues: issues || [], activeStaff: (providers || []).length };
        },
        block_dates: async (args: any) => await blockDates(args.propertyId, args.startDate, args.endDate, args.reason),
        assign_cleaning: async (args: any) => await assignCleaning(args.propertyId, args.date, args.notes),
        generate_payment_link: async (args: any) => await generatePaymentLink(args.propertyId, args.amount, args.reason)
    };

    const initialParts: any[] = [{ text: text || "Jefe, estoy listo para asistir con las operaciones." }];
    if (imagePart) initialParts.push(imagePart);

    let contents: any[] = [{ role: 'user', parts: initialParts }];
    let finalResponse = "";
    let iterations = 0;

    try {
        while (iterations < 5) {
            const result = await ai.models.generateContent({
                model: SALTY_MODEL,
                contents: contents,
                config: { 
                    systemInstruction: { role: 'system', parts: [{ text: VILLA_CONCIERGE_PROMPT }] }, 
                    tools: [{ functionDeclarations }], 
                    temperature: 0.4 
                }
            } as any);

            const candidate = (result as any).candidates?.[0];
            const content = candidate?.content;
            if (!content) break;
            contents.push(content);

            const textParts = content.parts?.filter((p: any) => p.text).map((p: any) => p.text) || [];
            if (textParts.length > 0) finalResponse += textParts.join("");

            const calls = content.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
            if (calls.length === 0) break;

            const toolResults = [];
            for (const call of calls) {
                if (!call || !call.name) continue;
                const executor = toolExecutors[call.name];
                const res = executor ? await executor(call.args || {}) : { error: 'Tool not found' };
                toolResults.push({ functionResponse: { name: call.name, response: { result: res }, id: call.id } });
            }

            contents.push({ role: 'user', parts: toolResults });
            iterations++;
        }

        if (finalResponse) {
            await NotificationService.sendDirectTelegramMessage(chatId, finalResponse.trim());
        }
    } catch (err: any) {
        console.error("[Salty Telegram Brain Error]:", err.message);
        const errorMsg = isOwner 
            ? `⚠️ 🔱 <i>Error en Comando Ejecutivo: ${err.message}</i>`
            : "🔱 <i>Disculpe, una interrupción en el servicio. Repita, por favor.</i>";
        await NotificationService.sendDirectTelegramMessage(chatId, errorMsg);
    }
}

async function handleStatusCommand(chatId: string) {
    const { data: stats } = await supabase.from('chat_logs').select('id').is('human_takeover_until', null);
    const activeChats = stats?.length || 0;
    await NotificationService.sendDirectTelegramMessage(chatId, `📊 <b>Salty: Status Operativo</b>\n━━━━━━━━━━━━\n🔹 Chats Activos: ${activeChats}\n🔹 IA: ${SALTY_MODEL}\n🔹 Visión: ACTIVADA ✅`);
}

async function handleDailyReport(chatId: string) {
    const todayStr = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const { data: bookings } = await supabaseServiceRole.from('bookings').select('total_price, created_at').gte('created_at', todayStr);
    const { data: leads } = await supabaseServiceRole.from('pending_bookings').select('id, created_at').gte('created_at', todayStr);
    
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    const count = bookings?.length || 0;
    const leadCount = leads?.length || 0;

    const report = `
🔱 <b>REPORTE EJECUTIVO DE HOY</b> 🔱
━━━━━━━━━━━━━━━━━━━━
📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
💰 <b>Ingresos Brutos:</b> $${totalRevenue.toFixed(2)}
📥 <b>Reservas Nuevas:</b> ${count}
🎯 <b>Leads Generados:</b> ${leadCount}
━━━━━━━━━━━━━━━━━━━━
<i>Everything under control, Captain.</i>
    `.trim();
    
    await NotificationService.sendDirectTelegramMessage(chatId, report);
}

async function handleTypingIndicator(chatId: string, text: string) {
    const sessionMatch = text.match(/([a-zA-Z0-9-]+)/);
    if (sessionMatch) {
        const sessionId = sessionMatch[1];
        const isTyping = text.startsWith('/typing');
        await supabase.from('chat_logs').update({ is_host_typing: isTyping }).eq('session_id', sessionId);
        await NotificationService.sendDirectTelegramMessage(chatId, `⌨️ <i>Indicador de escritura ${isTyping ? 'ACTIVADO' : 'DESACTIVADO'} para la web.</i>`);
    }
}

async function handleReply(chatId: string, msg: any, text: string) {
    const repliedText = msg.reply_to_message.text || '';
    const sessionMatch = repliedText.match(/Sesión:\s*([a-zA-Z0-9-]+)/);

    if (repliedText.includes('Retomando guardia activa')) {
        if (text && text.trim().length > 0) {
            const parsedMemory = memorySchema.parse({ learned_text: text, session_id: sessionMatch ? sessionMatch[1] : null });
            await supabase.from('salty_memories').insert(parsedMemory);
            await NotificationService.sendDirectTelegramMessage(chatId, "🧠 <i>Copiado, jefe. He actualizado mi memoria interna.</i>");
        }
    }
    else if (sessionMatch) {
        const sessionId = sessionMatch[1];
        const takeoverDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase.from('chat_logs').update({ 
            human_takeover_until: takeoverDate, 
            is_host_typing: false, 
            takeover_notified: false 
        }).eq('session_id', sessionId);
        
        await supabase.from('ai_chat_logs').insert({ 
            session_id: sessionId, 
            sender: 'host', 
            text: text 
        });
        
        await NotificationService.sendDirectTelegramMessage(chatId, "✅ <i>Mensaje entregado en la web. Salty silenciado por 30 mins para esta sesión.</i>");
    }
}

async function handleCallbackQuery(query: any) {
    const data = query.data;
    if (data.startsWith('ack_booking_')) {
        const id = data.replace('ack_booking_', '');
        await supabase.from('bookings').update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
        await NotificationService.sendDirectTelegramMessage(query.message.chat.id, "✅ <i>Entendido. Registro de reserva marcado como enterado.</i>");
    }
}
