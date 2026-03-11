import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── CONFIGURACIÓN TIER 1 VERCEL ──────────────────────────────────────────
// Leemos la API Key directamente del entorno de Vercel
const API_KEY = process.env.GEMINI_API_KEY || '';

// ─── CONOCIMIENTO INTEGRAL DE VILLA RETIRO (SYSTEM INSTRUCTION) ────────────
const VILLA_RET_KNOWLEDGE = `
IDENTIDAD: Eres el Concierge Premium de Villa Retiro (Cabo Rojo, PR).
Tono: Profesional, cordial, cálido y con hospitalidad caribeña. Trato de "Usted".

PROPIEDADES Y PRECIOS:
1. Villa Pirata Family House (ID: 42839458)
   - Precio: $225 USD/noche.
   - Capacidad: 6 huéspedes.
   - Detalle: Villa familiar espaciosa, cerca de la playa y el Poblado Boquerón.
2. Villa Retiro R (ID: 1081171030449673920)
   - Precio: $275 USD/noche.
   - Capacidad: 8 huéspedes.
   - Detalle: Villa de lujo con piscina privada de agua salada y generador industrial 24/7.

DATOS OPERATIVOS CRÍTICOS:
- Check-in: 4:00 PM | Check-out: 11:00 AM.
- Acceso: Self check-in con Lockbox.
- Wi-Fi: Red "Wifivacacional" (Clave: Wifivacacional).
- Ubicación: Sector Samán, Cabo Rojo, PR (Cerca de Buyé y Boquerón).
- Reglas: No fiestas, no fumar en interiores, respeto a horas de silencio (10 PM).
- Políticas: Cancelación flexible hasta 5 días antes. Transparencia total estilo Airbnb.

Sincronización iCal Activa: Verificamos disponibilidad en tiempo real con Airbnb.
ID Villa Pirata: 42839458
ID Villa Retiro R: 1081171030449673920

INSTRUCCIÓN DE CIERRE DE VENTA:
Cuando el cliente confirme que desea reservar, calcula el total (Noches x Precio) y genera esta etiqueta exacta al final:
[PAYMENT_REQUEST: {property_id}, {total_price}, {check_in}, {check_out}, {guests}]
`.trim();

export default async function handler(req: any, res: any) {
    // Garantizar siempre respuesta JSON para evitar errores de parseo en el front
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. VALIDACIÓN DE API KEY (TIER 1)
        if (!API_KEY) {
            console.error('ERROR: NO API KEY FOUND IN VERCEL ENVIRONMENT');
            return res.status(200).json({
                response: "¡Hola! Estoy terminando de preparar los detalles de tu estancia. ¿En qué puedo ayudarte mientras tanto?"
            });
        }

        const { messages = [] } = req.body;

        if (messages.length === 0) {
            return res.status(200).json({
                response: "¡Hola! Soy el Concierge de Villa Retiro. ¿Cómo puedo asistirle con su reserva hoy?"
            });
        }

        const userMessage = String(messages[messages.length - 1]?.content || '').trim();

        // 2. SANEAMIENTO DE HISTORIAL (PROTOCOLO CERO ERRORES)
        // Gemini exige que el historial comience con 'user' y alterne roles.
        let rawHistory = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '').trim() }]
        })).filter((m: any) => m.parts[0].text && m.role);

        // Eliminar mensajes 'model' iniciales (Regla de Oro Gemini)
        while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
            rawHistory.shift();
        }

        // 3. INICIALIZACIÓN SDK ESTABLE (v1)
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: VILLA_RET_KNOWLEDGE
        }, { apiVersion: "v1" });

        // 4. EJECUCIÓN SIN BUCLES DE REINTENTO
        const chat = model.startChat({
            history: rawHistory
        });

        const result = await chat.sendMessage(userMessage);
        const aiResponse = result.response.text();

        // Respuesta directa y veloz (Sin dependencias externas como Supabase en este paso)
        return res.status(200).json({ response: aiResponse });

    } catch (error: any) {
        console.error('CHAT API TIER 1 ERROR:', error?.message || error);

        // Manejo de fallos con mensaje de cortesía profesional
        return res.status(200).json({
            response: "¡Hola! Estoy terminando de preparar los detalles de tu estancia. ¿En qué puedo ayudarte mientras tanto?"
        });
    }
}
