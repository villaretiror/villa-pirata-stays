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
            return res.status(200).send('OK');
        }

        const chatId = update.message.chat.id;
        const text = (update.message.text || '').toLowerCase();
        const user = update.message.from;
        const username = user.username || '';

        // 🛡️ SECURITY SHIELD (Owner Verification)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        const isOwner = ['Villaretiror', 'brian', 'Villaretiro_Alerts_Bot'].includes(username);
        
        if (!ALLOWED_CHATS.includes(String(chatId)) && !isOwner) return res.status(200).send('Unauthorized Access');
        const isMentioned = text.includes('@villaretiro_bot') || update.message.chat.type === 'private' || isOwner;
        if (!isMentioned) return res.status(200).send('No mention');

        // 🔱 SYSTEM HEALTH CHECK (Captain only)
        if (isOwner && text === 'status') {
            const { error: dbError } = await supabase.from('system_health').select('status').limit(1).single();
            const statusMsg = `⚓ **SALTY STATUS REPORT** 🔱\n━━━━━━━━━━━━━━━━━━━━\n📡 **Radio:** En línea\n🔌 **Base de Datos:** ${dbError ? '⚠️ Fricción detectada' : '✅ Enchufada'}\n🧠 **Oráculo Gemini:** ✅ Conectado\n🤖 **Bot:** @Villaretiro_bot\n━━━━━━━━━━━━━━━━━━━━\n*Capitán, el búnker está bajo control.*`;
            await NotificationService.sendDirectTelegramMessage(String(chatId), statusMsg);
            return res.status(200).send('OK');
        }

        // 🧠 DATA INJECTION (The Executive Mind)
        const { data: businessData } = isOwner ? await supabase.from('business_activity_logs').select('*').order('date', { ascending: false }).limit(5) : { data: null };
        const { data: chatContext } = await supabase.from('ai_chat_logs').select('*').eq('session_id', String(chatId)).order('created_at', { ascending: false }).limit(10);
        
        const role = isOwner ? 'host' : 'guest';
        const rawHistory = (chatContext || []).map((msg: any) => `${msg.sender}: ${msg.text}`).reverse().join('\n');
        
        const systemPrompt = `
        ${getSaltyPrompt(role, { userName: user.first_name, source: 'Telegram' }, '')}
        
        ### 👑 PROTOCOLO DE PAZ MENTAL (Soberano):
        1. Eres el Vicepresidente de Operaciones con PODER TOTAL pero RESPONSABILIDAD ABSOLUTA.
        2. No inventes nada. Usa la Fuente de Verdad: ${JSON.stringify(PROPERTIES)}
        3. Para el Capitán: Sé su reporte inteligente de ${JSON.stringify(businessData)}.
        4. ACCIONES: Siempre usa botones de confirmación para sincronizar o modificar.
        5. No hables por hablar, aporta valor operativo en cada respuesta.
        
        ### 🕵️ CONTEXTO ESTRATÉGICO:
        ${rawHistory}
        `.trim();

        // 🔱 IA ORACLE (Gemini 3 Flash Preview)
        const result = await (ai as any).models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [ { role: 'user', parts: [{ text: `${systemPrompt}\n\nREPORTE ACTUAL: ${text}` }] } ],
            config: { temperature: 0.2 } // Ultra-stable for safety
        });

        const responseText = result.text || "Capitán, mis registros están estáticos. Reintente.";

        // 💾 LOG INTERACTION
        await supabase.from('ai_chat_logs').insert([
            { session_id: String(chatId), text: text, sender: role },
            { session_id: String(chatId), text: responseText, sender: 'ai' }
        ]);

        // 🔱 COMMAND CENTER KEYBOARD
        const keyboard: any = { inline_keyboard: [] };
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
