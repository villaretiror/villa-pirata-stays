import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { HOST_PHONE } from '../constants.js';
import { ExternalSyncService } from '../lib/ExternalSyncService.js';
import {
    checkAvailabilityWithICal,
    logAbandonmentLead,
    applyAIQuote
} from '../aiServices.js';

import { SECRETS_DATA } from '../constants/secrets_data.js';

/**
 * 👑 VILLA RETIRO & PIRATA STAYS - CONCIERGE CHAT ENGINE (DYNAMIC v5.0)
 * Logic: Fully Autonomous Agentic Concierge with External Sync
 */

export const maxDuration = 30;

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default async function handler(req: any, res: any) {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages: rawMessages, sessionId, userId, propertyId, currentUrl } = req.body;

        // --- 1. DYNAMIC DATA FETCHING ---
        const { data: dbProperties } = await supabase.from('properties').select('*');
        const { data: knowledgeSetting } = await supabase.from('system_settings').select('value').eq('key', 'villa_knowledge').single();
        const villaKnowledge = knowledgeSetting?.value || {};

        const propertyTitles: Record<string, string> = {};
        dbProperties?.forEach((p: any) => {
            propertyTitles[p.id] = p.title;
        });

        const activePropertyName = propertyId ? (propertyTitles[propertyId] || 'Villa Desconocida') : 'Navegación General';

        // --- 2. MASTER PROMPT ---
        const VILLA_CONCIERGE_PROMPT = `
Eres "Salty", el concierge ejecutivo de Villa & Pirata Stays.

### MISIÓN DE SINCRONIZACIÓN (MODO AGENTE)
- Puedes sincronizar información de Airbnb usando 'sync_external_platform'.
- Si el Host te pide "revisar cambios en Airbnb", primero haz un 'preview'. 
- Informa al Host: "Encontré estos cambios: [...] ¿Deseas aplicarlos a la web?". 
- Solo aplica si el Host confirma.

### GESTIÓN DE INFO
- Usa 'modify_villa_data' para cambios puntuales.

### PRIORIDAD DE CONOCIMIENTO
1. REGLAS & OPERACIÓN: ${JSON.stringify(villaKnowledge, null, 2)}
2. INVENTARIO REAL-TIME: ${JSON.stringify(dbProperties, null, 2)}
`.trim();

        // 3. Memoria
        let extendedMemory = "";
        const { data: memories } = await supabase.from('salty_memories').select('learned_text').order('created_at', { ascending: false }).limit(5);
        if (memories) extendedMemory = `\n[MEMORIA]: ` + memories.map(m => `- ${m.learned_text}`).join('\n');

        // 4. Messages History
        const recentMessages = (rawMessages || []).slice(-15);
        const finalMessages: CoreMessage[] = [
            { role: 'user', content: `INSTRUCCIONES: ${VILLA_CONCIERGE_PROMPT}. \n${extendedMemory}` },
            { role: 'assistant', content: "¡Hola! Soy Salty. ¿Qué villa vamos a gestionar hoy?" },
            ...recentMessages.map((m: any): CoreMessage => ({
                role: (m.role === 'assistant' || m.role === 'model' || m.sender === 'ai') ? 'assistant' : 'user',
                content: String(m.content || m.text || ''),
            }))
        ];

        // 5. Execution
        const result = await streamText({
            model: google('gemini-2.0-flash'),
            messages: finalMessages,
            maxSteps: 5,
            tools: {
                sync_external_platform: tool({
                    description: 'Busca cambios en Airbnb y los compara con la base de datos local.',
                    parameters: z.object({
                        villa_id: z.string(),
                        action: z.enum(['preview', 'apply']),
                        apply_data: z.any().optional()
                    }),
                    execute: async ({ villa_id, action, apply_data }) => {
                        if (action === 'preview') {
                            const diff = await ExternalSyncService.previewSync(villa_id);
                            return { status: 'success', diff };
                        } else {
                            await ExternalSyncService.commitSync(villa_id, apply_data);
                            return { status: 'success', message: 'Base de datos sincronizada con Airbnb.' };
                        }
                    }
                }),
                modify_villa_data: tool({
                    description: 'Actualiza campos específicos de una villa.',
                    parameters: z.object({
                        villa_id: z.string(),
                        field: z.string(),
                        value: z.any(),
                        reason: z.string()
                    }),
                    execute: async ({ villa_id, field, value, reason }) => {
                        const { error } = await supabase.from('properties').update({ [field]: value }).eq('id', villa_id);
                        if (error) return { status: 'error', message: error.message };
                        await supabase.from('salty_memories').insert({ learned_text: `Cambio manual: ${field} -> ${value}. Razón: ${reason}`, property_id: villa_id });
                        return { status: 'success' };
                    }
                }),
                check_availability: tool({
                    description: 'Busca disponibilidad en el calendario.',
                    parameters: z.object({
                        villa_ids: z.array(z.string()),
                        check_in: z.string(),
                        check_out: z.string(),
                    }),
                    execute: async ({ villa_ids, check_in, check_out }) => {
                        const results = await Promise.all(villa_ids.map(id => checkAvailabilityWithICal(id, check_in, check_out)));
                        return { status: 'success', available_ids: villa_ids.filter((_, i) => results[i].available) };
                    },
                }),
                generate_whatsapp_link: tool({
                    description: 'Enlace a soporte humano.',
                    parameters: z.object({ reason: z.string().optional() }),
                    execute: async ({ reason }) => ({ status: 'success', url: `https://wa.me/${HOST_PHONE}?text=${encodeURIComponent(`Ayuda: ${reason}`)}` })
                })
            },
        });

        return result.pipeTextStreamToResponse(res);

    } catch (error: any) {
        return res.status(500).json({ error: 'Sync re-evaluating', details: error.message });
    }
}
