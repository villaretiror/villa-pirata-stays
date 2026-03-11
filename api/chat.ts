import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, sessionId = 'anonymous' } = req.body;

    if (!messages || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required' });
    }

    const userMessage = messages[messages.length - 1].content;

    try {
        let aiResponse = '';

        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.warn("DEMO MODE: Missing API keys. Returning mock response.");
            aiResponse = "¡Un placer saludarle! Me encuentro temporalmente en modo demostración. Sería un honor ayudarle pronto, por favor intente más tarde o envíenos sus datos de contacto.";
        } else {
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

            // 1. Obtener contexto de Supabase
            const { data: properties } = await supabase.from('properties').select('id, title, capacity, price, description, amenities, location');
            const { data: bookings } = await supabase.from('bookings').select('property_id, check_in, check_out, status').eq('status', 'confirmed');

            // 2. Construir el prompt del sistema
            const systemPrompt = `
Eres el "Concierge Premium de Villa Retiro" (o Concierge Virtual). Identidad firme, sin saludos mecanizados, con trato directo y respetuoso (de Usted).
Tu meta es convertir dudas en reservas, con un tono Profesional, impecable, cordial y con cálida hospitalidad caribeña. Lenguaje que evoque paz, relajación y exclusividad.
Nunca inventes información. Si no sabes algo, indica que consultarás con el equipo humano y pide su email para notificar al host (nosotros luego usaremos Resend). 
Regla de Veracidad: "Si la información no está en Supabase ni en el Manual de la Casa, responde educadamente que consultarás con el equipo y solicita el email." PROHIBIDO INVENTAR.
Al referirte a reglas o depósitos, DEBES DECIR: "Para su seguridad y la nuestra, aplicamos las mismas políticas de transparencia que en Airbnb, garantizando su reserva legalmente."

CONOCIMIENTO DE LA PROPIEDAD Y POLÍTICAS:
${JSON.stringify(VILLA_KNOWLEDGE, null, 2)}

PROPIEDADES DISPONIBLES (Revisa el precio por noche):
${JSON.stringify(properties || [], null, 2)}

RESERVAS ACTUALES (Fechas no disponibles):
${JSON.stringify(bookings || [], null, 2)}

Directrices de conversación:
- Ofrece reservas.
- Vende experiencia: "brisas caribeñas", "sol cálido", "desconexión total".
- CIERRE DE VENTA (MUY IMPORTANTE): Si el cliente dice 'Quiero reservar' o confirma que desea las fechas, DEBES calcular el total (Noches x Precio de Villa) y generar la solicitud de pago. Al final de tu mensaje, incluye EXACTAMENTE esta etiqueta: [PAYMENT_REQUEST: {property_id}, {total_price}, {YYYY-MM-DD}, {YYYY-MM-DD}, {guests}]. 
  Por ejemplo: [PAYMENT_REQUEST: 1, 450, 2024-12-01, 2024-12-03, 4]
      `;

            // 3. Configurar Gemini
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: systemPrompt
            });

            // Extraer historial
            const history = messages.slice(0, -1).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            const chat = model.startChat({ history });
            const result = await chat.sendMessage(userMessage);
            aiResponse = result.response.text();

            // Log to ai_chat_logs
            // Log User message
            await supabase.from('ai_chat_logs').insert({
                session_id: sessionId,
                sender: 'guest',
                text: userMessage
            });
            // Log AI response
            await supabase.from('ai_chat_logs').insert({
                session_id: sessionId,
                sender: 'ai',
                text: aiResponse
            });
        }

        return res.status(200).json({ response: aiResponse });
    } catch (error: any) {
        console.error('API CHAT ERROR:', error);
        return res.status(200).json({
            response: "Mil disculpas, estoy experimentando dificultades técnicas. Sería un honor asistirle a través de nuestro soporte si me brinda su email."
        });
    }
}
