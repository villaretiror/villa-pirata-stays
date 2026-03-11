// ─── DESPLIEGUE DEFINITIVO V1 (SIN BETA) ───────────────────────────────────
// Forzado manual de la ruta estable para evitar Error 404 en Vercel.

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY || '';

    try {
        if (!API_KEY) {
            throw new Error('MISSING_API_KEY');
        }

        const { messages = [] } = req.body;
        if (messages.length === 0) {
            return res.status(200).json({ response: "¡Hola! ¿En qué puedo ayudarle?" });
        }

        // 1. CONOCIMIENTO DEL SISTEMA (SYSTEM PROMPT)
        const systemInstruction = `
Eres el Concierge Premium de Villa Retiro (Cabo Rojo, PR). 
Tu misión es convertir consultas en reservas confirmadas.
Trato: Respetuoso (Usted), cordial y cálido.

VILLAS:
- Villa Pirata Family (ID: 42839458) | $225/noche | 6 huéspedes.
- Villa Retiro R (ID: 1081171030449673920) | $275/noche | 8 huéspedes.

LOGÍSTICA:
- Check-in: 4:00 PM | Check-out: 11:00 AM.
- Wi-Fi: Wifivacacional.
- Ubicación: Sector Samán, Cabo Rojo.
- No fiestas. Respeto absoluto.

CIERRE DE RESERVA:
Calcula el total e incluye SIEMPRE:
[PAYMENT_REQUEST: {property_id}, {total}, {checkin}, {checkout}, {guests}]
        `.trim();

        // 2. SANEAMIENTO DE HISTORIAL (Garantizar primer mensaje sea USER)
        const userMessage = String(messages[messages.length - 1]?.content || '').trim();
        let contents = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '').trim() }]
        })).filter((m: any) => m.parts[0].text);

        // Poda estratégica: Primer mensaje DEBE ser user
        while (contents.length > 0 && contents[0].role !== 'user') {
            contents.shift();
        }

        // Agregar mensaje actual
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        // 3. LLAMADA MANUAL V1 (BYPASS SDK)
        // Usamos fetch directo a la versión /v1/ para eliminar el 404 de v1beta
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    maxOutputTokens: 1000,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "¡Hola! Estoy terminando de preparar los detalles de tu estancia. ¿En qué puedo ayudarte mientras tanto?";

        return res.status(200).json({ response: aiText });

    } catch (error: any) {
        console.error('CHAT RUNTIME ERROR:', error.message);
        return res.status(200).json({
            response: "¡Hola! Estoy terminando de preparar los detalles de tu estancia. ¿En qué puedo ayudarte mientras tanto?"
        });
    }
}
