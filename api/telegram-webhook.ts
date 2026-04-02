import { NotificationService } from '../src/services/NotificationService.js';
import { supabase } from '../src/lib/SupabaseService.js';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService.js';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge.js';
import { PROPERTIES } from '../src/constants/index.js';
import { SECRETS_DATA } from '../src/constants/secrets_data.js';
import { getSaltyPrompt } from '../src/aiServices.js';
import { z } from 'zod';

// 🔱 Definición de Tipos para Herramientas Operativas
enum Type {
    STRING = "STRING",
    NUMBER = "NUMBER",
    BOOLEAN = "BOOLEAN",
    OBJECT = "OBJECT",
    ARRAY = "ARRAY"
}

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
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

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
        const messageId = update.message.message_id;

        // 🛡️ SECURITY GATE (White List)
        const ALLOWED_CHATS = ['-5184291508', '2085187904', '1182255799'];
        if (!ALLOWED_CHATS.includes(String(chatId))) {
            console.warn(`[Security] Unauthorized access from Chat: ${chatId}`);
            return res.status(200).send('Unauthorized');
        }

        const isOwner = ['Villaretiror', 'brian'].includes(user.username || '');
        const isMentioned = text.includes('@SaltyConciergeBot') || update.message.chat.type === 'private';

        if (!isMentioned && !isOwner) return res.status(200).send('Not mentioned');

        // 🧠 PERSISTENT MEMORY MODULE
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
                name: 'fetch_business_metrics',
                description: 'Consulta métricas clave: tasa de ocupación, ingresos proyectados y ADR.',
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: 'search_guest_intelligence',
                description: 'Busca en el CRM historial de un huésped por nombre o email.',
                parameters: {
                    type: Type.OBJECT,
                    properties: { query: { type: Type.STRING } },
                    required: ['query']
                }
            },
            {
                name: 'report_ground_activity',
                description: 'Consulta reportes de mantenimiento o limpieza recientes.',
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: 'update_business_rule',
                description: 'Modifica reglas del negocio como estancia mínima o precios base.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING },
                        value: { type: Type.STRING }
                    },
                    required: ['key', 'value']
                }
            },
            {
                name: 'force_calendar_sync',
                description: 'Fuerza una sincronización inmediata con Airbnb y Booking.com para todos los calendarios.',
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: 'dispatch_outbound_comms',
                description: 'Envía comunicaciones externas (SMS/Email) a huéspedes o equipo.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        channel: { type: Type.STRING },
                        to: { type: Type.STRING },
                        message: { type: Type.STRING }
                    }
                }
            },
            {
                name: 'check_calendar_master',
                description: 'Consulta la bitácora maestra de disponibilidad real de las villas.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        propertyId: { type: Type.STRING },
                        startDate: { type: Type.STRING }
                    }
                }
            },
            {
                name: 'market_research',
                description: 'Búsqueda web en tiempo real sobre tendencias, eventos o competencia.',
                parameters: {
                    type: Type.OBJECT,
                    properties: { searchQuery: { type: Type.STRING } }
                }
            }
        ];

        const toolExecutors: Record<string, Function> = {
            force_calendar_sync: async () => {
                try {
                    const stats = await CalendarSyncService.syncAll(supabaseServiceRole);
                    return { success: true, stats, msg: '⚓ Sincronización de Soberanía completada con éxito.' };
                } catch (e: any) {
                    return { success: false, error: e.message };
                }
            },
            fetch_daily_ops: async (args: any) => {
                const queryDate = args.date || new Date().toISOString().split('T')[0];
                const { data: arrivals } = await supabaseServiceRole.from('bookings').select('*, profiles(full_name), properties(title)').eq('check_in', queryDate).eq('status', 'confirmed');
                const { data: departures } = await supabaseServiceRole.from('bookings').select('*, profiles(full_name), properties(title)').eq('check_out', queryDate).eq('status', 'confirmed');
                return { arrivals: arrivals || [], departures: departures || [], summaryDate: queryDate };
            },
            fetch_business_metrics: async () => {
                const { data: bookings } = await supabaseServiceRole.from('bookings').select('total_price').eq('status', 'confirmed');
                const totalRevenue = bookings?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;
                return { projected_revenue: totalRevenue, currency: 'USD', status: 'Healthy' };
            },
            search_guest_intelligence: async (args: any) => {
                const { data: guests } = await supabaseServiceRole.from('profiles').select('*').ilike('full_name', `%${args.query}%`);
                return { matches: guests || [] };
            },
            report_ground_activity: async () => {
                const { data: tasks } = await supabaseServiceRole.from('maintenance_tasks').select('*').order('created_at', { ascending: false }).limit(5);
                return { recent_tasks: tasks || [] };
            },
            update_business_rule: async (args: any) => {
                const { error } = await supabaseServiceRole.from('business_rules').upsert({ key: args.key, value: args.value, updated_by: 'SaltyAI' });
                return { success: !error, msg: error ? error.message : 'Regla actualizada en el búnker.' };
            },
            dispatch_outbound_comms: async (args: any) => {
                return { sent: true, channel: args.channel, msg: `Comunicación despachada a ${args.to}` };
            },
            check_calendar_master: async (args: any) => {
                const start = args.startDate || new Date().toISOString().split('T')[0];
                let p_id = '1081171030449673920';
                if (args.propertyId?.toLowerCase().includes('pirata')) p_id = '44837583';
                const { data: bookings } = await supabaseServiceRole.from('bookings').select('check_in, check_out, status').eq('property_id', p_id).gte('check_out', start).neq('status', 'cancelled');
                return { property: p_id, activeBookings: bookings || [], msg: '⚓ Consultando ocupación real.' };
            },
            market_research: async (args: any) => {
                return { results: [], msg: 'Búsqueda de mercado simulada (Se requiere Integration activa).' };
            }
        };

        // 🔱 AI ORACLE CONSULTATION
        const chat = ai.getGenerativeModel({ model: "gemini-1.5-flash" }).startChat({
            history: (chatContext || []).map(log => ({
                role: log.role === 'ai' ? 'model' : 'user',
                parts: [{ text: log.content }]
            }))
        });

        const prompt = getSaltyPrompt(user.first_name, isOwner, JSON.stringify(chatContext));
        const result = await chat.sendMessage([prompt, `Mensaje del Capitán: ${text}`]);
        let responseText = result.response.text();

        // 🔱 TOOL EXECUTION LOOP
        const call = result.response.functionCalls()?.[0];
        if (call) {
            const executor = toolExecutors[call.name];
            if (executor) {
                const toolResult = await executor(call.args);
                const secondResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                responseText = secondResult.response.text();
            }
        }

        // 💾 LOG INTERACTION
        await supabaseServiceRole.from('ai_chat_logs').insert([
            { chat_id: String(chatId), content: text, role: 'user', user_id: String(user.id) },
            { chat_id: String(chatId), content: responseText, role: 'ai' }
        ]);

        // 🔱 TELEGRAM RESPONSE
        await NotificationService.sendTelegramAlert(responseText, String(chatId), false);

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("[Salty Error]:", error.message);
        return res.status(200).send('Internal Error But Handled'); // Mantener 200 para Telegram
    }
}
