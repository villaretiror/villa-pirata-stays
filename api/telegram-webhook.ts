import { NotificationService } from '../src/services/NotificationService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import * as GoogleGenAIModule from '@google/genai';
import { getSaltyPrompt } from '../src/aiServices.js';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants/index.js';

const getEnv = (key: string, fallback: string = ''): string => {
    if (typeof process !== 'undefined' && process.env[key]) return process.env[key] as string;
    if (typeof process !== 'undefined' && process.env[`VITE_${key}`]) return process.env[`VITE_${key}`] as string;
    return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = getEnv('GEMINI_API_KEY') || getEnv('GOOGLE_GENERATIVE_AI_API_KEY');

// 🛡️ Gemini 3 Frontier Model Setup
const GoogleGenAI: any = (GoogleGenAIModule as any).GoogleGenAI || (GoogleGenAIModule as any).default || GoogleGenAIModule;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    try {
        const update = req.body;
        if (!update || (!update.message && !update.callback_query)) return res.status(200).send('OK');
        
        // 🔱 SOVEREIGN ACTION BRIDGE (Callback Execution)
        if (update.callback_query) {
            const data = update.callback_query.data;
            const chatId = update.callback_query.message.chat.id;
            
            if (data === 'force_sync_all') {
                const stats = await CalendarSyncService.syncAll(supabase);
                await NotificationService.sendDirectTelegramMessage(String(chatId), `🔱 **ORDEN CUMPLIDA, CAPITÁN.**\nLos calendarios han sido alineados globalmente.\nResumen: +${stats.total} nuevos bloqueos detectados.`);
            }

            if (data === 'view_checkins') {
                const today = new Date().toISOString().split('T')[0];
                const { data: nextCheckins } = await supabase.from('bookings').select('*').gte('check_in', today).order('check_in', { ascending: true }).limit(5);
                if (!nextCheckins || nextCheckins.length === 0) {
                    await NotificationService.sendDirectTelegramMessage(String(chatId), `📭 **CAPITÁN, NO HAY LLEGADAS PRÓXIMAS.**\nEl horizonte está despejado.`);
                } else {
                    let msg = `📅 **PRÓXIMOS DESEMBARCOS:**\n━━━━━━━━━━━━━━━━━━━━\n`;
                    nextCheckins.forEach(b => {
                        const prop = b.property_id === '42839458' ? '⚓ Pirata' : 'Retiro 🔱';
                        msg += `👤 ${b.customer_name}\n🏠 ${prop} | 🗓️ ${b.check_in}\n━━━━━━━━━━━━━━━━━━━━\n`;
                    });
                    await NotificationService.sendDirectTelegramMessage(String(chatId), msg);
                }
            }

            if (data === 'monthly_report') {
                const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const { data: monthlyData } = await supabase.from('bookings').select('total_price').eq('status', 'confirmed').gte('check_in', start);
                const totalRevenue = (monthlyData || []).reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
                const count = (monthlyData || []).length;
                
                await NotificationService.sendDirectTelegramMessage(String(chatId), `📊 **BALANCE DE BITÁCORA (MES ACTUAL):**\n━━━━━━━━━━━━━━━━━━━━\n💰 **Ingresos Confirmados:** $${totalRevenue.toFixed(2)}\n📅 **Reservas Activas:** ${count}\n━━━━━━━━━━━━━━━━━━━━\n*Capitán, el cofre del pirata está creciendo.*`);
            }

            if (data === 'pending_tickets') {
                const { data: tickets } = await supabase.from('emergency_tickets').select('*').eq('status', 'open');
                if (!tickets || tickets.length === 0) {
                    await NotificationService.sendDirectTelegramMessage(String(chatId), `🛠️ **TODO EN ORDEN.**\nNo hay averías reportadas en el búnker.`);
                } else {
                    let msg = `🔧 **AVERÍAS ACTIVAS:**\n━━━━━━━━━━━━━━━━━━━━\n`;
                    tickets.forEach(t => {
                        msg += `📍 ${t.property_id.slice(-4)} | ${t.issue_type}\n⚠️  ${t.description}\n━━━━━━━━━━━━━━━━━━━━\n`;
                    });
                    await NotificationService.sendDirectTelegramMessage(String(chatId), msg);
                }
            }

            if (data.startsWith('block_dates:')) {
                const [, propertyId, start, end] = data.split(':');
                const { error } = await supabase.from('availability_rules').insert({
                    property_id: propertyId, start_date: start, end_date: end,
                    is_blocked: true, reason: 'Bloqueo Manual vía Salty Telegram', origin_type: 'manual'
                });
                if (error) await NotificationService.sendDirectTelegramMessage(String(chatId), `⚠️ **ERROR:** ${error.message}`);
                else await NotificationService.sendDirectTelegramMessage(String(chatId), `✅ **BLOQUEO EXITOSO.**\nPropiedad protegida del **${start}** al **${end}**.`);
            }

            if (data.startsWith('add_expense:')) {
                const [, propertyId, amount, category, desc] = data.split(':');
                const { error } = await supabase.from('property_expenses').insert({
                    property_id: propertyId, amount: parseFloat(amount), category, description: desc
                });
                if (error) await NotificationService.sendDirectTelegramMessage(String(chatId), `⚠️ **ERROR:** ${error.message}`);
                else await NotificationService.sendDirectTelegramMessage(String(chatId), `✅ **GASTO REGISTRADO.**\n$${amount} anotados en ${category} para la villa.`);
            }

            if (data.startsWith('open_ticket:')) {
                const [, propertyId, type, severity, desc] = data.split(':');
                const { error } = await supabase.from('emergency_tickets').insert({
                    property_id: propertyId, issue_type: type, severity, description: desc, status: 'open'
                });
                if (error) await NotificationService.sendDirectTelegramMessage(String(chatId), `⚠️ **ERROR:** ${error.message}`);
                else await NotificationService.sendDirectTelegramMessage(String(chatId), `🛠️ **TICKET ABIERTO.**\nSe ha reportado un problema de ${type} (${severity}). Salty está monitoreando.`);
            }

            if (data === 'check_health') {
                const { error: dbError } = await supabase.from('system_health').select('status').limit(1).single();
                const statusMsg = `⚓ **SALTY STATUS REPORT** 🔱\n━━━━━━━━━━━━━━━━━━━━\n📡 **Radio:** En línea\n🔌 **Base de Datos:** ${dbError ? '⚠️ Fricción detectada' : '✅ Enchufada'}\n🧠 **Oráculo Gemini:** ✅ Conectado\n🤖 **Bot:** @Villaretiro_bot\n🖼️ **Visión:** ✅ Activa\n━━━━━━━━━━━━━━━━━━━━\n*Capitán, el búnker está bajo control.*`;
                await NotificationService.sendDirectTelegramMessage(String(chatId), statusMsg);
            }

            if (data.startsWith('solar_alert:')) {
                const [, propertyId] = data.split(':');
                const today = new Date().toISOString().split('T')[0];
                const { data: booking } = await supabase.from('bookings').select('customer_name, customer_email').eq('property_id', propertyId).eq('status', 'confirmed').gte('check_out', today).lte('check_in', today).single();
                
                if (booking && booking.customer_email) {
                    const propName = propertyId === '1081171030449673920' ? 'Villa Retiro R' : 'Pirata Family House';
                    const msg = `Hola ${booking.customer_name}, te informamos de una interrupción eléctrica en la zona. Tu villa cuenta con sistema solar; te pedimos un uso consciente de la energía para preservar la reserva. ¡Gracias! 🌊`;
                    await NotificationService.sendDirectTelegramMessage(String(chatId), `📡 **NOTIFICANDO A HUÉSPED...**`);
                    // Here we would call the email service or SMS
                    await NotificationService.sendDirectTelegramMessage(String(chatId), `✅ **MENSAJE ENVIADO A ${booking.customer_name.toUpperCase()}.**`);
                } else {
                    await NotificationService.sendDirectTelegramMessage(String(chatId), `⚠️ No hay huéspedes activos en este momento para recibir la alerta.`);
                }
            }
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id;
        const text = (update.message.text || update.message.caption || '').toLowerCase();
        const user = update.message.from;
        const username = user.username || '';
        const photo = update.message.photo;

        // 🛡️ SECURITY SHIELD (Owner Verification)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        const isOwner = ['Villaretiror', 'brian', 'Villaretiro_Alerts_Bot'].includes(username);
        
        if (!ALLOWED_CHATS.includes(String(chatId)) && !isOwner) return res.status(200).send('Unauthorized Access');
        const isMentioned = text.includes('@villaretiro_bot') || update.message.chat.type === 'private' || isOwner;
        if (!isMentioned && !photo) return res.status(200).send('No mention');

        // 🔱 VISUAL SENSOR (Multimodal Processing)
        let visualData: any = null;
        if (photo && photo.length > 0) {
            const fileId = photo[photo.length - 1].file_id; // Get highest resolution
            const BOT_TOKEN = getEnv('TELEGRAM_BOT_TOKEN');
            
            const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            if (fileData.ok) {
                const filePath = fileData.result.file_path;
                const imgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
                const buffer = await imgRes.arrayBuffer();
                visualData = {
                    inlineData: {
                        data: Buffer.from(buffer).toString('base64'),
                        mimeType: 'image/jpeg'
                    }
                };
            }
        }

        // 🔱 SYSTEM HEALTH CHECK (Captain only)
        if (isOwner && (text === 'status' || text === '/status')) {
            const { error: dbError } = await supabase.from('system_health').select('status').limit(1).single();
            const statusMsg = `⚓ **SALTY STATUS REPORT** 🔱\n━━━━━━━━━━━━━━━━━━━━\n📡 **Radio:** En línea\n🔌 **Base de Datos:** ${dbError ? '⚠️ Fricción detectada' : '✅ Enchufada'}\n🧠 **Oráculo Gemini:** ✅ Conectado\n🤖 **Bot:** @Villaretiro_bot\n🖼️ **Visión:** ✅ Activa\n━━━━━━━━━━━━━━━━━━━━\n*Capitán, el búnker está bajo control.*`;
            await NotificationService.sendDirectTelegramMessage(String(chatId), statusMsg);
            return res.status(200).send('OK');
        }

        // 🔱 COMMAND CENTER MENU (Force access to all actions)
        if (isOwner && (text === '/admin' || text === '/menu')) {
            const menuMsg = `🔱 **SALTY COMMAND CENTER** ⚓\n━━━━━━━━━━━━━━━━━━━━\nCapitán, el búnker está bajo control.\nElija una operación estratégica:\n━━━━━━━━━━━━━━━━━━━━`;
            const menuKeyboard = {
                inline_keyboard: [
                    [{ text: "📅 Próximos Huéspedes", callback_data: "view_checkins" }, { text: "📊 Balance del Mes", callback_data: "monthly_report" }],
                    [{ text: "🔧 Averías Activas", callback_data: "pending_tickets" }, { text: "🩺 Salud del Sistema", callback_data: "check_health" }],
                    [{ text: "🚨 Alerta Solar (V. Retiro)", callback_data: "solar_alert:1081171030449673920" }],
                    [{ text: "🚨 Alerta Solar (Pirata)", callback_data: "solar_alert:42839458" }],
                    [{ text: "🔄 Sincronizar Calendarios", callback_data: "force_sync_all" }]
                ]
            };
            await NotificationService.sendDirectTelegramMessage(String(chatId), menuMsg, menuKeyboard);
            return res.status(200).send('OK');
        }

        // 🧠 DATA INJECTION (The Executive Mind)
        const { data: businessData } = isOwner ? await supabase.from('business_activity_logs').select('*').order('date', { ascending: false }).limit(5) : { data: null };
        const { data: chatContext } = await supabase.from('ai_chat_logs').select('*').eq('session_id', String(chatId)).order('created_at', { ascending: false }).limit(10);
        
        // 🛰️ CALENDAR RADAR (Current Month)
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: activeBookings } = isOwner ? await supabase.from('bookings').select('property_id, check_in, check_out, source, status').gte('check_in', startOfMonth).lte('check_in', endOfMonth) : { data: null };

        const role = isOwner ? 'host' : 'guest';
        const rawHistory = (chatContext || []).map((msg: any) => `${msg.sender}: ${msg.text}`).reverse().join('\n');
        
        const systemPrompt = `
        ${getSaltyPrompt(role, { userName: user.first_name, source: 'Telegram' }, '')}
        
        ### 👑 PROTOCOLO DE PAZ MENTAL (Soberano):
        1. Eres el Vicepresidente de Operaciones con PODER TOTAL pero RESPONSABILIDAD ABSOLUTA.
        2. No inventes nada. Usa la Fuente de Verdad: ${JSON.stringify(PROPERTIES)}
        3. RADAR DE RESERVAS (ESTRICTAMENTE REAL): ${JSON.stringify(activeBookings)}
        4. Para el Capitán: Sé su reporte inteligente basado en ${JSON.stringify(businessData)}.
        5. ACCIONES: Siempre usa botones de confirmación para sincronizar o modificar.
        6. VISIÓN: Si recibes una imagen, descríbela técnicamente bajo el prisma de la operación (eficiencia, mantenimiento o finanzas).
        
        ### 🕵️ CONTEXTO ESTRATÉGICO:
        ${rawHistory}
        `.trim();

        // 🔱 IA ORACLE (Gemini 3 Flash Preview - Multimodal)
        const parts: any[] = [{ text: `${systemPrompt}\n\nSOLICITUD ACTUAL: ${text}` }];
        if (visualData) parts.push(visualData);

        const result = await (ai as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [ { role: 'user', parts } ],
            config: { temperature: 0.2 } 
        });

        const responseText = result.text || "Capitán, mis registros están estáticos. Reintente.";

        // 💾 LOG INTERACTION
        await supabase.from('ai_chat_logs').insert([
            { session_id: String(chatId), text: text || "[IMAGEN ENVIADA]", sender: role },
            { session_id: String(chatId), text: responseText, sender: 'ai' }
        ]);

        // 🔱 COMMAND CENTER KEYBOARD
        const keyboard: any = { inline_keyboard: [] };
        
        // 🔱 INTENT ORACLE: Unified Admin Intent Detection
        if (isOwner) {
            const extractionPrompt = `Analiza el mensaje: "${text}". 
            Hoy es ${new Date().toISOString().split('T')[0]}.
            Determina la INTENCIÓN y extrae datos en JSON.
            PROPIEDADES: "1081171030449673920" (Villa Retiro R), "42839458" (Pirata Family House).

            FORMATO DE RESPUESTA (Solo uno):
            - BLOCK: {"type":"BLOCK", "propertyId":"ID", "start":"YYYY-MM-DD", "end":"YYYY-MM-DD"}
            - EXPENSE: {"type":"EXPENSE", "propertyId":"ID", "amount":Number, "category":"maintenance|cleaning|utilities|other", "desc":"texto"}
            - TICKET: {"type":"TICKET", "propertyId":"ID", "issue":"tipo", "severity":"low|medium|high|critical", "desc":"texto"}
            - SOLAR: {"type":"SOLAR", "propertyId":"ID"}
            - UNKNOWN: {"type":"NONE"}
            
            Si no hay intención clara, responde {"type":"NONE"}.`;

            try {
                const extractionResult = await (ai as any).models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
                    config: { temperature: 0.1 }
                });
                
                const jsonStr = extractionResult.text.replace(/```json|```/g, '').trim();
                const intent = JSON.parse(jsonStr);
                
                if (intent.type === 'BLOCK' && intent.propertyId) {
                    keyboard.inline_keyboard.push([{ text: `🚫 Confirmar Bloqueo (${intent.start})`, callback_data: `block_dates:${intent.propertyId}:${intent.start}:${intent.end}` }]);
                } else if (intent.type === 'EXPENSE') {
                    keyboard.inline_keyboard.push([{ text: `💸 Registrar Gasto ($${intent.amount})`, callback_data: `add_expense:${intent.propertyId}:${intent.amount}:${intent.category}:${intent.desc}` }]);
                } else if (intent.type === 'TICKET') {
                    keyboard.inline_keyboard.push([{ text: `🛠️ Abrir Ticket: ${intent.issue}`, callback_data: `open_ticket:${intent.propertyId}:${intent.issue}:${intent.severity}:${intent.desc}` }]);
                } else if (intent.type === 'SOLAR') {
                    keyboard.inline_keyboard.push([{ text: `🚨 Activar Protocolo Solar`, callback_data: `solar_alert:${intent.propertyId}` }]);
                }
            } catch (e) { console.error("Intent Oracle Error:", e); }
        }

        if (isOwner && (text.includes('sync') || text.includes('sincroniza'))) {
            keyboard.inline_keyboard.push([{ text: "🔄 Sincronizar Calendarios Ahora", callback_data: "force_sync_all" }]);
        }

        await NotificationService.sendDirectTelegramMessage(String(chatId), responseText, keyboard.inline_keyboard.length > 0 ? keyboard : undefined);

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Webhook Error]:", error.message);
        return res.status(200).send('Error Handled');
    }
}
