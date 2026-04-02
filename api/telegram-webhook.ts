import { NotificationService } from '../src/services/NotificationService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import * as GoogleGenAIModule from '@google/genai';
import { getSaltyPrompt } from '../src/aiServices.js';

/**
 * 🔱 ROBUST ENV LOADER (Production Edition)
 */
const getEnv = (key: string, fallback: string = ''): string => {
    if (typeof process !== 'undefined' && process.env[key]) return process.env[key] as string;
    if (typeof process !== 'undefined' && process.env[`VITE_${key}`]) return process.env[`VITE_${key}`] as string;
    return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = getEnv('GEMINI_API_KEY') || getEnv('GOOGLE_GENERATIVE_AI_API_KEY');

// 🛡️ IA ENGINE INITIALIZATION
const GoogleGenAIClass: any = (GoogleGenAIModule as any).GoogleGenAI || (GoogleGenAIModule as any).default || GoogleGenAIModule;
const ai = new GoogleGenAIClass({ apiKey: GEMINI_API_KEY });

const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(200).send('OK'); // Always return OK to Telegram

    try {
        const update = req.body;
        if (!update || !update.message) return res.status(200).send('No message');
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const user = update.message.from;
        const username = user.username || '';

        // 🛡️ SECURITY GATE (Sovereign Priority)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        const isOwner = ['Villaretiror', 'brian', 'Villaretiro_Alerts_Bot'].includes(username);
        
        // Auto-whitelist for the Captain
        if (isOwner && !ALLOWED_CHATS.includes(String(chatId))) {
            ALLOWED_CHATS.push(String(chatId));
        }

        const isWhitelisted = ALLOWED_CHATS.includes(String(chatId));
        const isMentioned = text.includes('@Villaretiro_bot') || update.message.chat.type === 'private' || isOwner;

        if (!isWhitelisted && !isOwner) return res.status(200).send('Unauthorized ID');
        if (!isMentioned) return res.status(200).send('Ignoring unmentioned message');

        // 🧠 CONTEXT MEMORY (Aligned with REAL Schema: session_id, text, sender)
        const { data: chatContext } = await (supabaseServiceRole as any)
            .from('ai_chat_logs')
            .select('*')
            .eq('session_id', String(chatId))
            .order('created_at', { ascending: false })
            .limit(10);

        // 🛠️ EXECUTIVE TOOLS (Ready but silent for now)
        const toolExecutors: Record<string, Function> = {
            force_calendar_sync: async () => {
                const stats = await CalendarSyncService.syncAll(supabaseServiceRole);
                return { success: true, stats };
            }
        };

        // 🔱 IA ORACLE CONSULTATION
        const role = isOwner ? 'host' : 'guest';
        const historyJSON = JSON.stringify(chatContext || []);
        const agentSystemPrompt = (getSaltyPrompt as any)(role, { userName: user.first_name, source: 'Telegram' }, historyJSON);

        const result = await (ai as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                { role: 'user', parts: [{ text: `${agentSystemPrompt}\n\nMensaje: ${text}` }] }
            ],
            config: { temperature: 0.1, maxOutputTokens: 1000 }
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Misión cumplida, Capitán. Todo está en orden.";

        // 💾 LOG INTERACTION (session_id, text, sender)
        await (supabaseServiceRole as any).from('ai_chat_logs').insert([
            { session_id: String(chatId), text: text, sender: role },
            { session_id: String(chatId), text: responseText, sender: 'ai' }
        ]);

        // 🔱 DIRECT RESPONSE
        await (NotificationService as any).sendDirectTelegramMessage(String(chatId), responseText);

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Webhook Error]:", error.message);
        return res.status(200).send('Handled Error');
    }
}
