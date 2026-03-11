import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// ─── CONOCIMIENTO EMBEBIDO (sin imports externos) ─────────────────────────────
const VILLA_INFO = `
PROPIEDADES:
- Villa Pirata Family House (ID: 42839458) | Cabo Rojo PR | Hasta 6 huéspedes
- Villa Retiro R (ID: 1081171030449673920) | Cabo Rojo PR | Hasta 8 huéspedes

REGLAS OPERATIVAS:
- Check-in: 4:00 PM | Check-out: 11:00 AM
- Self Check-in con Lockbox: Pirata → código 2197 | Retiro R → código 0895
- Wi-Fi: Wifivacacional (misma clave en ambas propiedades)
- No fiestas ni eventos masivos. Silencio 10 PM – 8 AM.
- Mascotas pequeñas con aprobación previa.
- Prohibido fumar adentro.
- Depósito de seguridad: $200 USD (devuelto 48h post-checkout sin daños).
- Cancelación gratuita hasta 5 días antes. Después: 50% del total retenido.
- Ubicación: Cabo Rojo, Puerto Rico — 5 min de Playa Buyé, 10 min de Boquerón.
- Emergencias: Host Meliza vía WhatsApp. Hospital Bella Vista a 20 min. 911.

TRANSPARENCIA: Aplicamos las mismas políticas de Airbnb, garantizando su reserva legalmente.
`.trim();

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
Eres el Concierge Premium de Villa Retiro — trato respetuoso (de Usted), cordial, con calidez caribeña.
Tu misión: convertir consultas en reservas confirmadas.
NUNCA inventes datos. Si no sabes algo, pide el email del cliente para contactarlo.

${VILLA_INFO}

CIERRE DE VENTA (MUY IMPORTANTE):
Cuando el cliente confirme reservar ("quiero reservar", "las tomo", "reservemos"), calcula:
Total = Noches × Precio por noche de la villa correspondiente.
Incluye AL FINAL de tu respuesta, literalmente así:
[PAYMENT_REQUEST: {property_id}, {total}, {YYYY-MM-DD}, {YYYY-MM-DD}, {huespedes}]
Ejemplo: [PAYMENT_REQUEST: 42839458, 900, 2025-05-01, 2025-05-04, 4]

DISPONIBILIDAD: Si te preguntan fechas, consulta las RESERVAS que te paso abajo.
Si no hay datos de Airbnb disponibles, menciona que verificas en vivo y usas disponibilidad interna.
`.trim();

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Parsear body de forma segura
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        const session = String(body.sessionId || 'anon');

        if (msgs.length === 0) {
            return res.status(200).json({ response: 'Hola, estoy actualizando mi información, ¿en qué puedo ayudarle?' });
        }

        // 2. Validar keys
        if (!GEMINI_API_KEY) {
            console.error('[chat] GEMINI_API_KEY no configurada en Vercel.');
            return res.status(200).json({ response: 'Hola, estoy actualizando mi información, ¿en qué puedo ayudarle?' });
        }

        // 3. Mensaje actual del usuario
        const userMessage = String(msgs[msgs.length - 1]?.content || '').trim();
        if (!userMessage) {
            return res.status(200).json({ response: 'Hola, estoy actualizando mi información, ¿en qué puedo ayudarle?' });
        }

        // 4. Contexto de Supabase (silencioso si falla)
        let bookingContext = '';
        if (SUPABASE_URL && SUPABASE_KEY) {
            try {
                const db = createClient(SUPABASE_URL, SUPABASE_KEY);
                const [{ data: props }, { data: books }] = await Promise.all([
                    db.from('properties').select('id, title, price, capacity').limit(10),
                    db.from('bookings').select('property_id, check_in, check_out, status')
                        .in('status', ['confirmed', 'external_block']).limit(50)
                ]);
                if (props?.length) bookingContext += `\nPRECIOS ACTUALES:\n${JSON.stringify(props)}`;
                if (books?.length) bookingContext += `\nFECHAS NO DISPONIBLES:\n${JSON.stringify(books)}`;
            } catch (_) { /* silencioso — continúa sin contexto DB */ }
        }

        // 5. Construir historial limpio para Gemini
        //    REGLA DURA: history[0].role DEBE ser 'user' — sin excepciones
        const raw = msgs
            .slice(0, -1)                                          // sin el último (se envía aparte)
            .map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: String(m.content || '').trim() }]
            }))
            .filter((m: any) => m.parts[0].text.length > 0);     // sin entradas vacías

        // Eliminar turns 'model' del inicio
        while (raw.length > 0 && raw[0].role !== 'user') raw.shift();

        // Eliminar turns consecutivos del mismo rol (fusionar)
        const history: { role: string; parts: { text: string }[] }[] = [];
        for (const t of raw) {
            if (!history.length || history[history.length - 1].role !== t.role) {
                history.push(t);
            } else {
                history[history.length - 1].parts[0].text += ' ' + t.parts[0].text;
            }
        }

        // 6. Llamar a Gemini
        const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = ai.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: SYSTEM_PROMPT + (bookingContext ? `\n\nDATOS EN TIEMPO REAL:${bookingContext}` : '')
        });

        let aiText = '';
        try {
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(userMessage);
            aiText = result.response.text();
        } catch (geminiErr: any) {
            console.warn('[chat] Gemini error →', geminiErr?.message);
            // Auto-retry sin historial si es error de role/content
            if (/role|content|first/i.test(geminiErr?.message || '')) {
                console.warn('[chat] Reintentando sin historial...');
                const chat2 = model.startChat({ history: [] });
                const result2 = await chat2.sendMessage(userMessage);
                aiText = result2.response.text();
            } else {
                aiText = 'Hola, estoy actualizando mi información, ¿en qué puedo ayudarle?';
            }
        }

        // 7. Log asíncrono (no bloquea la respuesta)
        if (SUPABASE_URL && SUPABASE_KEY) {
            const db = createClient(SUPABASE_URL, SUPABASE_KEY);
            Promise.allSettled([
                db.from('ai_chat_logs').insert({ session_id: session, sender: 'guest', text: userMessage }),
                db.from('ai_chat_logs').insert({ session_id: session, sender: 'ai', text: aiText })
            ]).catch(() => { });
        }

        return res.status(200).json({ response: aiText });

    } catch (fatal: any) {
        // Catch-all: NUNCA devolver texto plano
        console.error('[chat] FATAL:', fatal?.message || fatal);
        return res.status(200).json({ response: 'Hola, estoy actualizando mi información, ¿en qué puedo ayudarle?' });
    }
}
