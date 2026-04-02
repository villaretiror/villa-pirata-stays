import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/SupabaseService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import { GoogleGenAI, Type } from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants/index.js';
import { SECRETS_DATA } from '../src/constants/secrets_data.js';
import { getSaltyPrompt } from '../src/aiServices.js';
import { z } from 'zod';

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

// 🛡️ IA ENGINE INITIALIZATION
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const memorySchema = z.object({
    learned_text: z.string().min(3),
    category: z.enum(['logistics', 'policy', 'guest_preference', 'business_event']),
    importance: z.number().min(1).max(5)
});

const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const update = req.body;
        if (!update || !update.message) return res.status(200).send('No message');
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const user = update.message.from;

        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        if (!ALLOWED_CHATS.includes(String(chatId))) return res.status(200).send('Unauthorized');

        const isOwner = ['Villaretiror', 'brian'].includes(user.username || '');
        const isMentioned = text.includes('@SaltyConciergeBot') || update.message.chat.type === 'private';

        if (!isMentioned && !isOwner) return res.status(200).send('Not mentioned');

        const { data: chatContext } = await supabaseServiceRole
            .from('ai_chat_logs')
            .select('*')
            .eq('chat_id', String(chatId))
            .order('created_at', { ascending: false })
            .limit(10);

        const tools = [
            {
                name: 'fetch_daily_ops',
                description: 'Obtiene el manifiesto de operaciones del día (llegadas y salidas).',
                parameters: {
                    type: Type.OBJECT,
                    properties: { date: { type: Type.STRING } }
                }
            },
            {
                name: 'force_calendar_sync',
                description: 'Fuerza una sincronización inmediata con Airbnb y Booking.com para todos los calendarios.',
                parameters: { type: Type.OBJECT, properties: {} }
            }
        ];

        const toolExecutors: Record<string, Function> = {
            force_calendar_sync: async () => {
                const stats = await CalendarSyncService.syncAll(supabaseServiceRole);
                return { success: true, stats, msg: '⚓ Sincronización completada.' };
            },
            fetch_daily_ops: async (args: any) => {
                const queryDate = args.date || new Date().toISOString().split('T')[0];
                const { data: arrivals } = await supabaseServiceRole.from('bookings').select('*, profiles(full_name), properties(title)').eq('check_in', queryDate).eq('status', 'confirmed');
                const { data: departures } = await supabaseServiceRole.from('bookings').select('*, profiles(full_name), properties(title)').eq('check_out', queryDate).eq('status', 'confirmed');
                return { arrivals: arrivals || [], departures: departures || [], summaryDate: queryDate };
            }
        };

        const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: (chatContext || []).map((log: any) => ({
                role: log.role === 'ai' ? 'model' : 'user',
                parts: [{ text: log.content }]
            }))
        });

        const prompt = getSaltyPrompt(user.first_name, isOwner, JSON.stringify(chatContext));
        const result = await chat.sendMessage([prompt, `Mensaje del Capitán: ${text}`]);
        let responseText = result.response.text();

        const call = result.response.functionCalls()?.[0];
        if (call) {
            const executor = toolExecutors[call.name];
            if (executor) {
                const toolResult = await executor(call.args);
                const secondResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                responseText = secondResult.response.text();
            }
        }

        await supabaseServiceRole.from('ai_chat_logs').insert([
            { chat_id: String(chatId), content: text, role: 'user', user_id: String(user.id) },
            { chat_id: String(chatId), content: responseText, role: 'ai' }
        ]);

        // 🔱 AQUÍ ESTABA EL ERROR (LÍNEA 207 APROX):
        await NotificationService.sendTelegramAlert(responseText, String(chatId));

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Error]:", error.message);
        return res.status(200).send('Error but OK for Telegram');
    }
}
