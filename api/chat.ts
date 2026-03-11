import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIGURACIÓN DE LLAVES ───────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!GEMINI_API_KEY) {
    console.error('ERROR: NO API KEY FOUND');
}

// ─── CONOCIMIENTO DE LAS VILLAS (HARDCODED) ────────────────────────────────
const VILLA_KNOWLEDGE = `
VILLA PIRATA FAMILY HOUSE (ID: 42839458)
- Capacidad: 6 huéspedes
- Precio: $225 USD por noche (Base)
- Descripción: Espaciosa, ideal para familias, cerca de la playa.

VILLA RETIRO R (ID: 1081171030449673920)
- Capacidad: 8 huéspedes
- Precio: $275 USD por noche (Base)
- Descripción: Moderna, lujosa, con amenidades premium.

REGLAS GENERALES:
- Check-in: 4:00 PM | Check-out: 11:00 AM
- No fiestas ni ruidos excesivos después de las 10:00 PM.
- Código Lockbox: Pirata (2197), Retiro R (0895).
- Wi-Fi: Wifivacacional (Pass: Wifivacacional).
- Depósito de seguridad: $200 USD.
- Política de Cancelación: Igual a Airbnb (Transparencia Total).
`;

const SYSTEM_INSTRUCTION = `
Eres el Concierge Premium de Villa Retiro. Tu tono es profesional, cálido y caribeño.
Usa los siguientes datos para responder a los huéspedes. No inventes información.

${VILLA_KNOWLEDGE}

CIERRE DE VENTAS:
Si el cliente quiere reservar, calcula el total (Noches x Precio) e incluye esta etiqueta:
[PAYMENT_REQUEST: {property_id}, {total_price}, {check_in}, {check_out}, {guests}]
`;

export default async function handler(req: any, res: any) {
    // Garantizar respuesta JSON
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages = [], sessionId = 'anonymous' } = req.body;

        if (messages.length === 0) {
            return res.status(200).json({ response: "¡Hola! Soy el Concierge de Villa Retiro. ¿En qué puedo ayudarle hoy?" });
        }

        // 1. SANEAMIENTO FORZADO DE HISTORIAL
        let cleanHistory = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '').trim() }]
        })).filter((m: any) => m.parts[0].text && m.role);

        // Gemini EXIGE que el primer mensaje sea 'user'. Si es 'model', elimínalo.
        while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
            cleanHistory.shift();
        }

        const userMessage = String(messages[messages.length - 1]?.content || '').trim();

        // 2. LLAMADA A GEMINI (A PRUEBA DE BALAS)
        if (!GEMINI_API_KEY) {
            throw new Error('Missing API Key');
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const chat = model.startChat({
            history: cleanHistory
        });

        const result = await chat.sendMessage(userMessage);
        const aiResponse = result.response.text();

        // 3. REGISTRO EN SUPABASE (OPCIONAL/SILENCIOSO)
        if (SUPABASE_URL && SUPABASE_KEY) {
            try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
                await supabase.from('ai_chat_logs').insert([
                    { session_id: sessionId, sender: 'guest', text: userMessage },
                    { session_id: sessionId, sender: 'ai', text: aiResponse }
                ]);
            } catch (err) {
                console.warn('Silent log error:', err);
            }
        }

        return res.status(200).json({ response: aiResponse });

    } catch (error: any) {
        console.error('API CHAT ERROR:', error.message);
        // RESPUESTA DE CORTESÍA PREDEFINIDA EN CASO DE FALLO
        return res.status(200).json({
            response: "¡Hola! Soy el Concierge de Villa Retiro. Estoy actualizando mis sistemas de reserva en vivo, pero puedo ayudarte. ¿Qué fechas tienes en mente?"
        });
    }
}
