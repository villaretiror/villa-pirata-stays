import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/SupabaseService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import * as GoogleGenAIModule from '@google/genai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
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

        // 🛡️ SECURITY GATE (Villa Retiro Whitelist)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        if (!ALLOWED_CHATS.includes(String(chatId))) return res.status(200).send('Unauthorized');

        const isOwner = ['Villaretiror', 'brian'].includes(user.username || '');
        const isMentioned = text.includes('@SaltyConciergeBot') || update.message.chat.type === 'private';

        if (!isMentioned && !isOwner) return res.status(200).send('Not mentioned');

        // 🧠 CONTEXT MEMORY
        const { data: chatContext } = await (supabaseServiceRole as any)
            .from('ai_chat_logs')
            .select('*')
            .eq('chat_id', String(chatId))
            .order('created_at', { ascending: false })
            .limit(10);

        // 🛠️ EXECUTIVE TOOL EXECUTORS
        const toolExecutors: Record<string, Function> = {
            force_calendar_sync: async () => {
                const stats = await CalendarSyncService.syncAll(supabaseServiceRole);
                return { success: true, stats, msg: '⚓ Sincronización de Soberanía completada.' };
            },
            fetch_daily_ops: async (args: any) => {
                const queryDate = args.date || new Date().toISOString().split('T')[0];
                const { data: arrivals } = await (supabaseServiceRole as any).from('bookings').select('*, profiles(full_name), properties(title)').eq('check_in', queryDate).eq('status', 'confirmed');
                const { data: departures } = await (supabaseServiceRole as any).from('bookings').select('*, profiles(full_name), properties(title)').eq('check_out', queryDate).eq('status', 'confirmed');
                return { arrivals: arrivals || [], departures: departures || [], summaryDate: queryDate };
            },
            fetch_business_metrics: async () => {
                const { data: bookings } = await (supabaseServiceRole as any).from('bookings').select('total_price').eq('status', 'confirmed');
                const totalRevenue = bookings?.reduce((acc: number, curr: any) => acc + (curr.total_price || 0), 0) || 0;
                return { projected_revenue: totalRevenue, currency: 'USD', status: 'Healthy' };
            },
            report_ground_activity: async () => {
                const { data: tasks } = await (supabaseServiceRole as any).from('maintenance_tasks').select('*').order('created_at', { ascending: false }).limit(5);
                return { recent_tasks: tasks || [] };
            }
        };

        // 🔱 IA ORACLE CONSULTATION
        const role = isOwner ? 'host' : 'guest';
        const historyJSON = JSON.stringify(chatContext || []);
        
        // Include tool descriptions in prompt for manual function calling
        const agentSystemPrompt = getSaltyPrompt(role, { userName: user.first_name, source: 'Telegram' }, historyJSON);
        const toolsDefinition = `
        HERRAMIENTAS OPERATIVAS DISPONIBLES (PARA HOST):
        - force_calendar_sync: Sincroniza Airbnb/Booking ahora.
        - fetch_daily_ops(date?): Reporte de llegadas y salidas.
        - fetch_business_metrics: Ocupación e ingresos proyectados.
        - report_ground_activity: Tareas de limpieza y mantenimiento.
        
        Si el usuario (Host) pide una acción que coincida con estas herramientas, responde ÚNICAMENTE con el formato JSON: {"tool": "nombre_herramienta", "args": {}}. No agregues texto antes ni después.
        `.trim();

        const fullPrompt = `${agentSystemPrompt}\n\n${toolsDefinition}\n\nMensaje del Capitán: ${text}`;

        const result = await (ai as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: { temperature: 0.1, maxOutputTokens: 1000 }
        });

        let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "...";

        // 🔱 MANUAL TOOL EXECUTION LOOP
        if (responseText.includes('{"tool":')) {
            try {
                const toolCall = JSON.parse(responseText.match(/\{"tool":.*\}/)?.[0] || '{}');
                const executor = toolExecutors[toolCall.tool];
                if (executor) {
                    const toolResult = await executor(toolCall.args);
                    const finalResult = await (ai as any).models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: [
                            { role: 'user', parts: [{ text: fullPrompt }] },
                            { role: 'model', parts: [{ text: responseText }] },
                            { role: 'user', parts: [{ text: `RESULTADO DE HERRAMIENTA: ${JSON.stringify(toolResult)}` }] }
                        ],
                        config: { temperature: 0.1 }
                    });
                    responseText = finalResult.candidates?.[0]?.content?.parts?.[0]?.text || "Herramienta ejecutada con éxito.";
                }
            } catch (e) {
                console.error("[Tool Execution Error]:", e);
            }
        }

        // 💾 LOG AND RESPOND
        await (supabaseServiceRole as any).from('ai_chat_logs').insert([
            { chat_id: String(chatId), content: text, role: 'user', user_id: String(user.id) },
            { chat_id: String(chatId), content: responseText, role: 'ai' }
        ]);

        await (NotificationService as any).sendDirectTelegramMessage(String(chatId), responseText);

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Webhook Error]:", error.message);
        return res.status(200).send('OK');
    }
}
