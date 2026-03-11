import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIGURACIÓN ESTRÍCTA VERCEL ─────────────────────────────────────────
const API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

// ─── CONOCIMIENTO DE LAS VILLAS (HARDCODED) ────────────────────────────────
const VILLA_KNOWLEDGE = `
VILLA PIRATA FAMILY HOUSE (ID: 42839458)
- Capacidad: 6 huéspedes
- Precio: $225 USD por noche (Base)

VILLA RETIRO R (ID: 1081171030449673920)
- Capacidad: 8 huéspedes
- Precio: $275 USD por noche (Base)

DATOS OPERATIVOS:
- Check-in: 4:00 PM | Check-out: 11:00 AM
- Wi-Fi: Wifivacacional
- Reglas: No fiestas, no fumar.
`;

const SYSTEM_INSTRUCTION = `
Eres el Concierge Premium de Villa Retiro. Trato cordial y profesional.
${VILLA_KNOWLEDGE}
Conversion de consultas a reservas.
`;

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!API_KEY) {
            return res.status(200).json({ response: "Servicio en mantenimiento técnico. Por favor, contacte al anfitrión directamente." });
        }

        const { messages = [], sessionId = 'anonymous' } = req.body;

        if (messages.length === 0) {
            return res.status(200).json({ response: "¡Hola! Soy el Concierge de Villa Retiro. ¿Cómo puedo ayudarle?" });
        }

        const userMessage = String(messages[messages.length - 1]?.content || '').trim();

        // ─── SANEAMIENTO TOTAL DE HISTORIAL (STRICT USER-FIRST) ──────────────
        let rawHistory = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '').trim() }]
        })).filter((m: any) => m.parts[0].text && m.role);

        // ELIMINAR CUALQUIER COSA QUE NO SEA USER AL INICIO
        while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
            rawHistory.shift();
        }

        // ─── INICIALIZACIÓN SIN REINTENTOS (v1 ESTABLE) ─────────────────────
        const genAI = new GoogleGenerativeAI(API_KEY);
        // El SDK usa v1 por defecto si no se especifica v1beta
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const chat = model.startChat({
            history: rawHistory
        });

        const result = await chat.sendMessage(userMessage);
        const aiResponse = result.response.text();

        return res.status(200).json({ response: aiResponse });

    } catch (error: any) {
        console.error('CHAT API ERROR:', error?.message || error);

        // MENSAJE DE MANTENIMIENTO PARA EVITAR REINTENTOS Y CONSUMO DE CUOTA
        return res.status(200).json({
            response: "Mi sistema de inteligencia se encuentra en mantenimiento breve para mejorar su experiencia. Por favor, escriba su duda nuevamente en unos minutos o contacte al anfitrión."
        });
    }
}
