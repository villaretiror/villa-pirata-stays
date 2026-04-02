import { z } from 'zod';
import { NotificationService } from '../src/services/NotificationService';
import { supabase } from '../src/lib/SupabaseService';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { GoogleGenAI, Type } from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge';
import { PROPERTIES } from '../src/constants';
import { SECRETS_DATA } from '../src/constants/secrets_data';
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
} from '../src/aiServices';

export const config = {
    maxDuration: 30,
};

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || "",
});

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
        let storageUrl: string | null = null;

        if (msg.photo && msg.photo.length > 0) {
            const photo = msg.photo[msg.photo.length - 1]; // Máxima resolución
            const fileId = photo.file_id;
            
            try {
                const token = process.env.TELEGRAM_BOT_TOKEN;
                const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const filePath = fileData.result.file_path;
                    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // 📁 ALMACENAMIENTO DE EVIDENCIA (Bunker Premium Requirement)
                    const fileName = `maintenance_${Date.now()}_${chatId}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabaseServiceRole.storage
                        .from('maintenance_logs')
                        .upload(fileName, buffer, { 
                            contentType: 'image/jpeg', 
                            upsert: true,
                            cacheControl: '3600'
                        });

                    if (!uploadError && uploadData) {
                        const { data: pubUrl } = supabaseServiceRole.storage
                            .from('maintenance_logs')
                            .getPublicUrl(fileName);
                        storageUrl = pubUrl?.publicUrl;
                        console.log("[Maintenance Storage] Evidencia guardada:", storageUrl);
                        
                        // Opcional: Registrar en tabla de auditoría si existe
                        try {
                            await supabaseServiceRole.from('maintenance_records').insert({
                                image_url: storageUrl,
                                chat_id: chatId,
                                sender: msg.from?.first_name || 'Host',
                                caption: text || ''
                            });
                        } catch (recErr) {
                            console.warn("Audit record inhibited:", recErr);
                        }
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
    const userId = from.id.toString();
    const isIsrael = userId === "9395794184";
    const isBrian = userId === "2085187904";
    const isOwner = isIsrael || isBrian;

    const authorityContext = isOwner 
        ? `(Nota: Hablas con ${isIsrael ? 'Israel' : 'Brian'}, Dueño de Villa Retiro LLC. Tienen autoridad total. Si recibes una imagen, actúa como experto en mantenimiento y hospitalidad de alto nivel).` 
        : "(Hablas con un miembro del equipo estratégico).";

    const masterPrompt = getSaltyPrompt('host', { activePropertyName: 'Villas Retiro & Pirata' });
    const VILLA_CONCIERGE_PROMPT = `${masterPrompt}\n\n${authorityContext}`;

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
        }
    ];

    const toolExecutors: Record<string, Function> = {
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
                    systemInstruction: VILLA_CONCIERGE_PROMPT, 
                    tools: [{ functionDeclarations }], 
                    temperature: 0.4 
                }
            });

            const content = result.candidates?.[0]?.content;
            if (!content) break;
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

            contents.push({ role: 'user', parts: toolResults });
            iterations++;
        }

        if (finalResponse) {
            await NotificationService.sendDirectTelegramMessage(chatId, finalResponse.trim());
        }
    } catch (err: any) {
        console.error("[Salty Telegram Brain Error]:", err.message);
        const errorMsg = isOwner 
            ? `⚠️ 🔱 <i>Error en Comando Ejecutivo: ${err.message}. Verificando redes neuronales...</i>`
            : "🔱 <i>Disculpe, una interrupción en el servicio. Repita, por favor.</i>";
        await NotificationService.sendDirectTelegramMessage(chatId, errorMsg);
    }
}

async function handleStatusCommand(chatId: string) {
    const { data: stats } = await supabase.from('chat_logs').select('id').is('human_takeover_until', null);
    const activeChats = stats?.length || 0;
    await NotificationService.sendDirectTelegramMessage(chatId, `📊 <b>Salty: Status Operativo</b>\n━━━━━━━━━━━━\n🔹 Chats Activos: ${activeChats}\n🔹 IA: ${SALTY_MODEL}\n🔹 Visión: ACTIVADA ✅`);
}

async function handleCallbackQuery(query: any) {
    const data = query.data;
    if (data.startsWith('ack_booking_')) {
        const id = data.replace('ack_booking_', '');
        await supabase.from('bookings').update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
        await NotificationService.sendDirectTelegramMessage(query.message.chat.id, "✅ <i>Entendido. Registro de reserva marcado como enterado.</i>");
    }
}
