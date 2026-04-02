import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/SupabaseService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import * as GoogleGenAIModule from '@google/genai';
import { PROPERTIES } from '../src/constants/index.js';
import { getSaltyPrompt } from '../src/aiServices.js';

/**
 * 🔱 ROBUST ENV LOADER
 */
const getEnv = (key: string, fallback: string = ''): string => {
    if (typeof process !== 'undefined' && process.env[key]) return process.env[key] as string;
    if (typeof process !== 'undefined' && process.env[`VITE_${key}`]) return process.env[`VITE_${key}`] as string;
    return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = getEnv('GOOGLE_GENERATIVE_AI_API_KEY') || getEnv('GEMINI_API_KEY');

// 🛡️ IA ENGINE (Compatible with local project structure)
const GoogleGenAIClass: any = (GoogleGenAIModule as any).GoogleGenAI || (GoogleGenAIModule as any).default || GoogleGenAIModule;
const ai = new GoogleGenAIClass({ apiKey: GEMINI_API_KEY });

const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const update = req.body;
        if (!update || !update.message) return res.status(200).send('No message');
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const user = update.message.from;
        const username = user.username || '';

        // 🛡️ SECURITY GATE (Villa Retiro Whitelist)
        // Agregamos IDs conocidos y garantizamos que tú pasas siempre.
        // 🛡️ SECURITY GATE (Sovereign Priority)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        const isOwner = ['Villaretiror', 'brian', 'Villaretiro_Alerts_Bot'].includes(username);
        
        // 🔱 RADICAL FIX: Si eres el dueño, el ID se autoriza automáticamente
        if (isOwner && !ALLOWED_CHATS.includes(String(chatId))) {
            ALLOWED_CHATS.push(String(chatId));
        }

        const isWhitelisted = ALLOWED_CHATS.includes(String(chatId));
        const isMentioned = text.includes('@Villaretiro_bot') || update.message.chat.type === 'private' || isOwner;

        if (!isWhitelisted && !isOwner) {
            console.warn(`[Security] Ignorando ID no autorizado: ${chatId}`);
            return res.status(200).send('Unauthorized ID');
        }

        if (!isMentioned) return res.status(200).send('No mentioned');

        // 🧠 CONTEXT MEMORY
        const { data: chatContext } = await (supabaseServiceRole as any)
            .from('ai_chat_logs')
            .select('*')
            .eq('chat_id', String(chatId))
            .order('created_at', { ascending: false })
            .limit(10);

        // 🛠️ EXECUTIVE TOOLS
        const toolExecutors: Record<string, Function> = {
            force_calendar_sync: async () => {
                const stats = await CalendarSyncService.syncAll(supabaseServiceRole);
                return { success: true, stats, msg: '⚓ Sincronización de Soberanía completada.' };
            }
        };

        // 🔱 IA ORACLE CONSULTATION
        const role = isOwner ? 'host' : 'guest';
        const historyJSON = JSON.stringify(chatContext || []);
        const agentSystemPrompt = getSaltyPrompt(role, { userName: user.first_name, source: 'Telegram' }, historyJSON);

        const result = await (ai as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                { role: 'user', parts: [{ text: `${agentSystemPrompt}\n\nMensaje: ${text}` }] }
            ],
            config: { temperature: 0.1, maxOutputTokens: 1000 }
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Lo lamento, Capitán, pero mi conexión con el oráculo ha fallado momentáneamente.";

        // 💾 LOG INTERACTION
        await (supabaseServiceRole as any).from('ai_chat_logs').insert([
            { chat_id: String(chatId), content: text, role: 'user', user_id: String(user.id) },
            { chat_id: String(chatId), content: responseText, role: 'ai' }
        ]);

        // 🔱 DIRECT RESPONSE
        await (NotificationService as any).sendDirectTelegramMessage(String(chatId), responseText);

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Webhook Error]:", error.message);
        // Reportar error a Supabase para diagnóstico remoto
        await (supabaseServiceRole as any).from('system_logs').insert({
            level: 'error',
            service: 'TelegramWebhook',
            message: `Fallo Crítico: ${error.message}`
        }).catch(() => {});
        
        return res.status(200).send('Handled Error');
    }
}
