import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// URLs reales de Airbnb iCal — también configuradas en Vercel como ENV VARS
const ICAL_URLS: Record<string, string> = {
    '42839458': process.env.AIRBNB_ICAL_VILLA_1 || 'https://www.airbnb.com/calendar/ical/42839458.ics?t=8f3d1e089d17402f9d06589bfe85b331',  // Pirata Family House
    '1081171030449673920': process.env.AIRBNB_ICAL_VILLA_2 || 'https://www.airbnb.com/calendar/ical/1081171030449673920.ics?t=01fca69a4848449d8bb61cde5519f4ae' // Villa Retiro R
};

// Conocimiento operativo embebido directamente (elimina dependencia de import en runtime)
const VILLA_KNOWLEDGE_INLINE = {
    checkIn: 'Check-in: 4:00 PM',
    checkOut: 'Check-out: 11:00 AM',
    rules: '1. No se permiten fiestas ni eventos masivos. 2. Horario de silencio de 10:00 PM a 8:00 AM. 3. Se admiten mascotas pequeñas con tarifa adicional aprobada. 4. Prohibido fumar dentro de las instalaciones. 5. Capacidad máxima estricta según reservación.',
    cancellation: 'Cancelación Gratuita hasta 5 días antes de llegada. Después se retiene el 50% del total.',
    deposit: 'Depósito de seguridad de $200 USD devuelto 48 hrs post-checkout sin daños.',
    location: 'Cabo Rojo, Puerto Rico. A 5 minutos de Playa Buyé, 10 minutos del Poblado de Boquerón.',
    wifi: 'Red Wi-Fi: Wifivacacional (misma clave para ambas propiedades).',
    selfCheckin: 'Self Check-in mediante Lockbox. Villa Pirata: código 2197. Villa Retiro R: código 0895.',
    emergencies: 'Host Meliza disponible por WhatsApp. Hospital Bella Vista a 20 mins. Emergencias: 911.'
};

// Sincronización silenciosa de iCal en segundo plano (máx 5 segundos, no bloquea la respuesta)
async function syncExternalCalendars(supabase: any): Promise<string[]> {
    const blockedDates: string[] = [];

    const syncPromises = Object.entries(ICAL_URLS).map(async ([propertyId, url]) => {
        if (!url || url.includes('placeholder')) return;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                console.warn(`iCal fetch no OK para propiedad ${propertyId}: ${response.status}`);
                return;
            }

            const icsText = await response.text();

            // Parsear iCal manualmente para evitar dependencias de módulos pesados en runtime
            const lines = icsText.split('\n');
            let inEvent = false;
            let dtStart = '';
            let dtEnd = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; }
                if (trimmed === 'END:VEVENT' && inEvent) {
                    inEvent = false;
                    if (dtStart && dtEnd) {
                        const checkIn = dtStart.substring(0, 4) + '-' + dtStart.substring(4, 6) + '-' + dtStart.substring(6, 8);
                        const checkOut = dtEnd.substring(0, 4) + '-' + dtEnd.substring(4, 6) + '-' + dtEnd.substring(6, 8);
                        blockedDates.push(`${propertyId}: ${checkIn} → ${checkOut}`);

                        // Insertar bloqueo silenciosamente (ignora duplicados si hay error)
                        try {
                            const { data: existing } = await supabase
                                .from('bookings')
                                .select('id')
                                .eq('property_id', propertyId)
                                .eq('check_in', checkIn)
                                .eq('status', 'external_block')
                                .limit(1);

                            if (!existing || existing.length === 0) {
                                await supabase.from('bookings').insert({
                                    property_id: propertyId,
                                    status: 'external_block',
                                    check_in: checkIn,
                                    check_out: checkOut,
                                    guests: 1,
                                    total_price: 0
                                });
                            }
                        } catch (_) { /* silencioso */ }
                    }
                }
                if (inEvent && trimmed.startsWith('DTSTART')) {
                    const val = trimmed.split(':').pop() || '';
                    dtStart = val.replace(/T.*/, ''); // Solo fecha YYYYMMDD
                }
                if (inEvent && trimmed.startsWith('DTEND')) {
                    const val = trimmed.split(':').pop() || '';
                    dtEnd = val.replace(/T.*/, '');
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.warn(`iCal timeout (>5s) para propiedad ${propertyId}. Usando cache Supabase.`);
            } else {
                console.warn(`iCal sync error para propiedad ${propertyId}:`, err.message);
            }
        }
    });

    // Esperar máx 5.5s en total sin bloquear
    await Promise.allSettled(syncPromises);
    return blockedDates;
}

export default async function handler(req: any, res: any) {
    // Garantizar siempre Content-Type JSON
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', status: 405 });
    }

    let messages: any[] = [];
    let sessionId = 'anonymous';

    try {
        const body = req.body;
        messages = body?.messages || [];
        sessionId = body?.sessionId || 'anonymous';
    } catch (_) {
        return res.status(400).json({ error: 'Invalid request body', status: 400 });
    }

    if (!messages || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required', status: 400 });
    }

    const userMessage = messages[messages.length - 1]?.content || '';

    try {
        let aiResponse = '';

        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.warn('DEMO MODE: Faltan API keys.');
            aiResponse = '¡Un placer saludarle! Estoy inicializando mi conexión con la base de datos. Por favor intente en un momento o escríbame al WhatsApp del Host.';
            return res.status(200).json({ response: aiResponse });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // 1. Sincronización silenciosa de Airbnb (no bloquea la respuesta del chat)
        const externalBlockedDates = await syncExternalCalendars(supabase);

        // 2. Obtener todos los bloqueos (Airbnb + directos) de Supabase
        const [propertiesResult, bookingsResult, externalBlocksResult] = await Promise.allSettled([
            supabase.from('properties').select('id, title, capacity, price, description, amenities, location'),
            supabase.from('bookings').select('property_id, check_in, check_out, status').eq('status', 'confirmed'),
            supabase.from('bookings').select('property_id, check_in, check_out').eq('status', 'external_block')
        ]);

        const properties = propertiesResult.status === 'fulfilled' ? propertiesResult.value.data : [];
        const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data : [];
        const externalBlocks = externalBlocksResult.status === 'fulfilled' ? externalBlocksResult.value.data : [];

        // 3. Construir System Prompt robusto
        const systemPrompt = `
Eres el "Concierge Premium de Villa Retiro" — identidad firme, trato respetuoso (de Usted), sin saludos mecanizados.
Meta: Convertir dudas en reservas con tono profesional, cordial, hospitalidad caribeña. Lenguaje que evoque paz, relajación y exclusividad.
PROHIBIDO INVENTAR datos. Si algo no está aquí: "Con gusto consulto con el equipo. ¿Me brinda su correo para notificarle?"
Al mencionar reglas o depósito: "Para su seguridad y la nuestra, aplicamos las mismas políticas de transparencia que en Airbnb, garantizando su reserva legalmente."
Si una fecha está BLOQUEADA, sugiere alternativas: "Esa fecha ya está reservada, pero con gusto le busco el siguiente fin de semana disponible..."

MANUAL OPERATIVO DE LA CASA:
- Ubicación: ${VILLA_KNOWLEDGE_INLINE.location}
- ${VILLA_KNOWLEDGE_INLINE.checkIn} / ${VILLA_KNOWLEDGE_INLINE.checkOut}
- Acceso: ${VILLA_KNOWLEDGE_INLINE.selfCheckin}
- WiFi: ${VILLA_KNOWLEDGE_INLINE.wifi}
- Reglas: ${VILLA_KNOWLEDGE_INLINE.rules}
- Cancelación: ${VILLA_KNOWLEDGE_INLINE.cancellation}
- Depósito: ${VILLA_KNOWLEDGE_INLINE.deposit}
- Emergencias: ${VILLA_KNOWLEDGE_INLINE.emergencies}

PROPIEDADES EN SISTEMA:
${JSON.stringify(properties || [], null, 2)}

RESERVAS CONFIRMADAS (fechas NO disponibles):
${JSON.stringify(bookings || [], null, 2)}

BLOQUEOS EXTERNOS DE AIRBNB (fechas también NO disponibles):
${JSON.stringify(externalBlocks || [], null, 2)}

DIRECTRIZ DE CIERRE DE VENTA (CRÍTICO):
Si el cliente confirma que desea reservar (dice "Quiero reservar", "las tomo", "reservemos"), calcula el total (Noches × Precio por Noche) y al FINAL de tu mensaje incluye EXACTAMENTE:
[PAYMENT_REQUEST: {property_id}, {total_calculado}, {YYYY-MM-DD_checkin}, {YYYY-MM-DD_checkout}, {numero_huespedes}]
Ejemplo: [PAYMENT_REQUEST: 42839458, 750, 2025-04-01, 2025-04-04, 4]
    `;

        // 4. Construir historial para Gemini (sin el último mensaje)
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content || '') }]
        }));

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(userMessage);
        aiResponse = result.response.text();

        // 5. Log asíncrono (no bloquea respuesta)
        Promise.allSettled([
            supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'guest', text: userMessage }),
            supabase.from('ai_chat_logs').insert({ session_id: sessionId, sender: 'ai', text: aiResponse })
        ]).catch(() => { }); // silencioso

        return res.status(200).json({ response: aiResponse });

    } catch (error: any) {
        console.error('API CHAT FATAL ERROR:', error?.message || error);
        // SIEMPRE devolver JSON válido — nunca texto plano
        return res.status(200).json({
            response: 'Mil disculpas, estoy experimentando dificultades técnicas momentáneas. Por favor contáctenos por WhatsApp o brinde su email y le responderemos de inmediato.',
            _debug: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
}
