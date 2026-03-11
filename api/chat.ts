import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIGURACIÓN ESTRÍCTA VERCEL ─────────────────────────────────────────
// Usamos exclusivamente process.env para runtime de Vercel
const API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

// ─── CONOCIMIENTO DE LAS VILLAS (HARDCODED) ────────────────────────────────
const VILLA_KNOWLEDGE = `
VILLA PIRATA FAMILY HOUSE (ID: 42839458)
- Capacidad: 6 huéspedes
- Precio: $225 USD por noche (Base)
- Descripción: Espaciosa villa familiar cerca de la playa en Cabo Rojo. Perfecta para grupos pequeños.

VILLA RETIRO R (ID: 1081171030449673920)
- Capacidad: 8 huéspedes
- Precio: $275 USD por noche (Base)
- Descripción: Villa de lujo moderna con piscina privada y generador de energía 24/7.

DATOS OPERATIVOS:
- Check-in: 4:00 PM | Check-out: 11:00 AM
- Lockbox Pirata: 2197
- Lockbox Retiro R: 0895
- Wi-Fi: Wifivacacional (Pass: Wifivacacional)
- Reglas: No fiestas, respeto a horas de silencio (10 PM), no fumar dentro.
- Transparencia Total: Aplicamos las mismas políticas que Airbnb para seguridad legal del huésped.
`;

const SYSTEM_INSTRUCTION = `
Eres el Concierge Premium de Villa Retiro. Tu tono es profesional, cordial y con calidez caribeña.
Instrucciones:
1. Usa el conocimiento hardcoded abajo para responder.
2. NUNCA inventes información.
3. Al final de una reserva confirmada, genera la etiqueta [PAYMENT_REQUEST].

${VILLA_KNOWLEDGE}

AL RESERVAR:
Calcula: Total = Noches x Precio.
Etiqueta: [PAYMENT_REQUEST: {property_id}, {total_price}, {check_in}, {check_out}, {guests}]
`;

export default async function handler(req: any, res: any) {
    // Siempre responder JSON para evitar "Unexpected token..."
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Validar llave al inicio
        if (!API_KEY) {
            throw new Error('CRITICAL: GEMINI_API_KEY is not defined in Vercel environment.');
        }

        const { messages = [], sessionId = 'anonymous' } = req.body;

        if (messages.length === 0) {
            return res.status(200).json({ response: "¡Hola! Soy el Concierge de Villa Retiro. ¿Cómo puedo asistirle con su estancia hoy?" });
        }

        const userMessage = String(messages[messages.length - 1]?.content || '').trim();

        // ─── SANEAMIENTO FORZADO DE HISTORIAL (ANTI-ROLE ERROR) ──────────────
        // Gemini exige que history[0].role === 'user' y que los roles se alternen.
        let rawHistory = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '').trim() }]
        })).filter((m: any) => m.parts[0].text && m.role);

        // Descartar mensajes del modelo al inicio hasta encontrar el primer 'user'
        while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
            rawHistory.shift();
        }

        // ─── INICIALIZACIÓN SDK ESTABLE ─────────────────────────────────────
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const chat = model.startChat({
            history: rawHistory
        });

        const result = await chat.sendMessage(userMessage);
        const aiResponse = result.response.text();

        // Registro silencioso en Supabase
        if (SUPABASE_URL && SUPABASE_KEY) {
            try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
                await supabase.from('ai_chat_logs').insert([
                    { session_id: sessionId, sender: 'guest', text: userMessage },
                    { session_id: sessionId, sender: 'ai', text: aiResponse }
                ]);
            } catch (swallow) { /* silencioso */ }
        }

        return res.status(200).json({ response: aiResponse });

    } catch (error: any) {
        console.error('CHAT API RUNTIME ERROR:', error?.message || error);

        // Respuesta YES OR YES (Cortesía Fallback para el Cliente)
        return res.status(200).json({
            response: "¡Hola! Soy el Concierge de Villa Retiro. Estoy actualizando mis sistemas de reserva en vivo, pero puedo ayudarte personalmente. ¿Qué fechas tienes en mente para tu visita?",
            _error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
