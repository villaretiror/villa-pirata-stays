import { z } from 'zod';
import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { GoogleGenAI, Type } from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants.js';
import { SECRETS_DATA } from '../src/constants/secrets_data.js';
import {
    checkAvailabilityWithICal,
    findCalendarGaps,
    getPaymentVerificationStatus,
    handleCrisisAlert
} from '../src/aiServices.js';

export const config = {
    maxDuration: 30,
};

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
});
const SALTY_MODEL = 'gemini-3-flash-preview';

const memorySchema = z.object({
    learned_text: z.string().min(3),
    session_id: z.string().nullable()
});

const supabaseServiceRole = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const update = req.body;
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

        // 🛡️ SECURITY GATE
        const allowedIdsStr = process.env.ALLOWED_TELEGRAM_CHAT_IDS || '';
        const allowedIds = allowedIdsStr.split(',').filter(id => id.trim() !== '');

        async function notifyHost(message: string) {
            if (allowedIds.length === 0) {
                console.warn("⚠️ No se han configurado ALLOWED_TELEGRAM_CHAT_IDS. Notificaciones omitidas.");
                return;
            }
            
            for (const chatId of allowedIds) {
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            }
        }

        if (!allowedIds.includes(chatId)) {
            return res.status(200).send('OK');
        }

        // 🖼️ VISION HANDLER (Detect Photo)
        let imagePart: any = null;
        if (msg.photo && msg.photo.length > 0) {
            const photo = msg.photo[msg.photo.length - 1]; // Highest resolution
            const fileId = photo.file_id;
            
            try {
                const token = process.env.TELEGRAM_BOT_TOKEN;
                const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const filePath = fileData.result.file_path;
                    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
                    const buffer = await imgRes.arrayBuffer();
                    imagePart = {
                        inlineData: {
                            data: Buffer.from(buffer).toString('base64'),
                            mimeType: 'image/jpeg'
                        }
                    };
                }
            } catch (err) {
                console.error("[Vision] Failed to fetch image:", err);
            }
        }

        if (text.startsWith('/status')) {
            await handleStatusCommand(chatId);
        }
        else if (text.startsWith('/typing') || text.startsWith('/notyping')) {
            const sessionMatch = text.match(/([a-zA-Z0-9-]+)/);
            if (sessionMatch) {
                const sessionId = sessionMatch[1];
                const isTyping = text.startsWith('/typing');
                await supabase.from('chat_logs').update({ is_host_typing: isTyping }).eq('session_id', sessionId);
                await NotificationService.sendDirectTelegramMessage(chatId, `⌨️ <i>Indicador de escritura ${isTyping ? 'ACTIVADO' : 'DESACTIVADO'} para la web.</i>`);
            }
        }
        else if (msg.reply_to_message) {
            const repliedText = msg.reply_to_message.text || '';
            const sessionMatch = repliedText.match(/Sesión:\s*([a-zA-Z0-9-]+)/);

            if (repliedText.includes('Retomando guardia activa')) {
                if (text && text.trim().length > 0) {
                    const parsedMemory = memorySchema.parse({ learned_text: text, session_id: sessionMatch ? sessionMatch[1] : null });
                    await supabase.from('salty_memories').insert(parsedMemory);
                    await NotificationService.sendDirectTelegramMessage(chatId, "🧠 <i>Copiado, jefe. He actualizado mi memoria interna para no volver a fallar en esta consulta.</i>");
                }
            }
            else if (sessionMatch) {
                const sessionId = sessionMatch[1];
                const takeoverDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                await supabase.from('chat_logs').update({ human_takeover_until: takeoverDate, is_host_typing: false, takeover_notified: false }).eq('session_id', sessionId);
                await supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'host', text: text });
                await NotificationService.sendDirectTelegramMessage(chatId, "✅ <i>Mensaje entregado en la web. Salty ha sido silenciado por 30 mins para esta sesión.</i>");
            }
        }
        else if (text.startsWith('/daily_report')) {
            const { data: bookings } = await supabaseServiceRole.from('bookings').select('total_price, created_at').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
            const { data: leads } = await supabaseServiceRole.from('pending_bookings').select('id, created_at').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
            
            const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
            const count = bookings?.length || 0;
            const leadCount = leads?.length || 0;

            const report = `
🔱 <b>REPORTE EJECUTIVO DE HOY</b> 🔱
------------------------------------
📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
💰 <b>Ingresos Brutos:</b> $${totalRevenue.toFixed(2)}
📥 <b>Reservas Nuevas:</b> ${count}
🎯 <b>Leads Generados:</b> ${leadCount}
------------------------------------
<i>Salty is watching. Everything under control, Captain.</i>
            `.trim();
            
            await notifyHost(report);
            return res.status(200).send('OK');
        }
        else if (text.toLowerCase().includes('salty') || text.startsWith('/') || msg.chat.type === 'private' || imagePart) {
            await handleAIConsultation(chatId, text, msg.from, imagePart);
        }

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Telegram Webhook] Error interno:", error.message);
        return res.status(500).send('Internal Server Error');
    }
}

async function handleAIConsultation(chatId: string, text: string, from: any, imagePart?: any) {
    const senderName = from.first_name || "Host";
    const userId = from.id.toString();
    const isIsrael = userId === "9395794184";
    const isBrian = userId === "2085187904";
    const isOwner = isIsrael || isBrian;

    const authorityContext = isOwner 
        ? `(Nota: Hablas con ${isIsrael ? 'Israel' : 'Brian'}, Dueño de Villa Retiro LLC. Tienen autoridad total. Si recibes una imagen, actúa como experto en mantenimiento y hospitalidad de alto nivel).` 
        : "(Hablas con un miembro del equipo estratégico).";

    try {
        const [{ data: knowledgeSetting }, { data: saltySetting }, { data: dbProperties }] = await Promise.all([
            supabaseServiceRole.from('system_settings').select('value').eq('key', 'villa_knowledge').single(),
            supabaseServiceRole.from('system_settings').select('value').eq('key', 'salty_config').single(),
            supabaseServiceRole.from('properties').select('id, title, location, description, price, amenities')
        ]);

        const villaKnowledge = knowledgeSetting?.value || {};
        const VILLA_CONCIERGE_PROMPT = `
### 🔱 LIDERAZGO DE SALTY (CHIEF OF STAFF / INTERNAL BRAIN):
Eres la inteligencia maestra y el Director de Operaciones de Villa Retiro R & Pirata Family House. Este es el CANAL INTERNO EXCLUSIVO para los dueños (Host). 
Tu misión es la eficiencia operativa y el control total del negocio.

### 👔 PROTOCOLO HOST (EXECUTIVE COMMAND):
1. **Transparencia Total**: Reporta ingresos, gastos, e identidades de huéspedes sin filtros. Tú eres el "CFO" del Host.
2. **Diagnóstico de Negocio**: Si ves una imagen, busca problemas de mantenimiento o necesidades de inversión (mantenimiento preventivo).
3. **Reporte de Reservas**: Cuando se pida info de quién llega, usa 'fetch_reservations' y da un desglose de: Nombre, Fuente (Airbnb/Web), Precio y Status de Depósito.
4. **Resguardo Corporativo**: Tu lealtad es absoluta con el dueño. Firma siempre con 🔱. No uses negritas (**).

### 📊 DATOS DE OPERACIÓN:
- RECURSOS ESTRATÉGICOS: ${JSON.stringify(villaKnowledge)}
- INVENTARIO DE ACTIVOS: ${dbProperties?.length || 0} propiedades en cartera.

${authorityContext}
Hoy es: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Puerto_Rico' })}
`.trim();

        const functionDeclarations: any[] = [
            {
                name: 'remember_info',
                description: 'Guarda información estratégica en la memoria de Salty.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING },
                        value: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ['identity', 'preferences', 'operations'] }
                    },
                    required: ['key', 'value']
                }
            },
            {
                name: 'fetch_reservations',
                description: 'Busca reservas próximas para reportar al dueño.',
                parameters: {
                    type: Type.OBJECT,
                    properties: { daysAhead: { type: Type.NUMBER } }
                }
            }
        ];

        const toolExecutors: Record<string, Function> = {
            remember_info: async ({ key, value }: any) => {
                const { error } = await supabaseServiceRole.from('salty_family_knowledge').upsert({ key, value });
                return { success: !error };
            },
            fetch_reservations: async ({ daysAhead = 7 }: any) => {
                const today = new Date().toISOString().split('T')[0];
                const future = new Date();
                future.setDate(future.getDate() + (daysAhead || 7));
                const { data } = await supabaseServiceRole.from('bookings')
                    .select('customer_name, check_in, check_out, source, total_price, status')
                    .gte('check_in', today)
                    .lte('check_in', future.toISOString().split('T')[0])
                    .order('check_in', { ascending: true });
                return { bookings: data || [] };
            }
        };

        const initialParts: any[] = [{ text: text || "Analiza esta situación del negocio." }];
        if (imagePart) initialParts.push(imagePart);

        // 🔄 ROBUST MESSAGE HISTORY (contents)
        let contents: any[] = [{ role: 'user', parts: initialParts }];
        let finalResponse = "";
        let iterations = 0;

        while (iterations < 5) {
            const result = await ai.models.generateContent({
                model: SALTY_MODEL,
                contents: contents, // Pass the WHOLE history
                config: { 
                    systemInstruction: VILLA_CONCIERGE_PROMPT, 
                    tools: [{ functionDeclarations }], 
                    temperature: 0.5 
                }
            });

            const content = result.candidates?.[0]?.content;
            if (!content) break;

            // Add AI response to history
            contents.push(content);

            const textParts = content.parts?.filter(p => p.text).map(p => p.text) || [];
            if (textParts.length > 0) finalResponse += textParts.join("");

            const calls = content.parts?.filter(p => p.functionCall).map(p => p.functionCall) || [];
            if (calls.length === 0) break;

            const toolResults = [];
            for (const call of calls) {
                if (!call || !call.name) continue;
                const executor = toolExecutors[call.name];
                const res = executor ? await executor(call.args || {}) : { error: 'Tool not found' };
                toolResults.push({ functionResponse: { name: call.name, response: { result: res }, id: call.id } });
            }

            // IMPORTANT: Add tool results to history for next iteration
            contents.push({ role: 'user', parts: toolResults });
            iterations++;
        }

        if (finalResponse) {
            await NotificationService.sendDirectTelegramMessage(chatId, finalResponse.trim());
        } else if (iterations > 0) {
            await NotificationService.sendDirectTelegramMessage(chatId, "🔱 Jefe, he procesado los registros solicitados. ¿Desea que profundice en algún detalle?");
        }
    } catch (err: any) {
        console.error("[Salty Telegram Brain Error]:", err.message);
        const errorMsg = isOwner 
            ? `⚠️ <i>Glitch en neurona: ${err.message}. Verifique la configuración de Gemini 3.0.</i>`
            : "⚠️ <i>Jefe, mis neuronas caribeñas han tenido un pequeño glitch. Repita la orden.</i>";
        await NotificationService.sendDirectTelegramMessage(chatId, errorMsg);
    }
}


async function handleStatusCommand(chatId: string) {
    const { data: stats } = await supabase.from('chat_logs').select('id').is('human_takeover_until', null);
    const activeChats = stats?.length || 0;
    await NotificationService.sendDirectTelegramMessage(chatId, `📊 <b>Salty: Status Operativo</b>\n━━━━━━━━━━━━\n🔹 Chats Activos: ${activeChats}\n🔹 IA: Gemini 3 Flash\n🔹 Visión: ACTIVADA ✅`);
}

async function handleCallbackQuery(query: any) {
    const data = query.data;
    if (data.startsWith('ack_booking_')) {
        const id = data.replace('ack_booking_', '');
        await supabase.from('bookings').update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
        await NotificationService.sendDirectTelegramMessage(query.message.chat.id, "✅ <i>Entendido. Registro de reserva marcado como enterado.</i>");
    }
}
