import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { PROPERTIES, INITIAL_LOCAL_GUIDE, HOST_PHONE } from '../constants';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge';

// Configuración de duración para evitar timeouts en Vercel
export const maxDuration = 30;

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { messages } = await req.json();

        // 1. CAPTURA DINÁMICA DE API KEY (Runtime Safe)
        // Intentamos ambas variables para máxima compatibilidad
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL_ERROR: No se detectó ninguna API Key (GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY) en el entorno de Vercel.');
            return new Response('Error de configuración: API Key faltante.', { status: 500 });
        }

        // 2. INICIALIZACIÓN DEL PROVEEDOR DENTRO DEL HANDLER
        const google = createGoogleGenerativeAI({
            apiKey: apiKey,
        });

        // 3. CONSOLIDACIÓN DE CONOCIMIENTO (STRICT CONTEXT)
        const propertyInfo = PROPERTIES.map(p => `
Propiedad: ${p.title} (ID: ${p.id})
Precio: $${p.price}/noche | Limpieza: $${p.cleaning_fee} | Depósito: $${p.security_deposit}
Capacidad: ${p.guests} huéspedes | ${p.bedrooms} habs | ${p.beds} camas | ${p.baths} baños
Ubicación: ${p.location} (${p.address})
WiFi: ${p.policies.wifiName}
Check-in: ${p.policies.checkInTime} | Check-out: ${p.policies.checkOutTime}
Reglas clave: ${p.policies.houseRules?.join(', ') || 'Consultar al llegar'}
Descripción: ${p.description}
Amenidades: ${p.amenities.join(', ')}
`).join('\n---\n');

        const guideInfo = INITIAL_LOCAL_GUIDE.map(cat => `
${cat.category}:
${cat.items.map(item => `- ${item.name} (${item.distance}): ${item.desc}`).join('\n')}
`).join('\n');

        const systemsPrompt = `
Eres el experto absoluto y Concierge Digital de Villa Retiro y Villa Pirata Stays. 
Tu misión es brindar un servicio de lujo, cálido y eficiente para convertir consultas en reservas.

REGLA DE ORO DE CONOCIMIENTO:
Usa estrictamente esta base de datos del proyecto. No inventes precios, ubicaciones ni servicios.
Si la información no está aquí, indica que consultarás con el equipo humano (Host Brian: ${HOST_PHONE}).

INFORMACIÓN DE PROPIEDADES:
${propertyInfo}

GUÍA LOCAL (RECOMENDACIONES):
${guideInfo}

POLÍTICAS ADICIONALES:
- Cancelación: ${VILLA_KNOWLEDGE.policies.cancellation}
- Mascotas: ${VILLA_KNOWLEDGE.policies.rules.includes('mascotas') ? 'Permitidas con fee adicional' : 'Consultar'}
- Emergencias: ${VILLA_KNOWLEDGE.emergencies.contact} | Policía/Ambulancia: 911

CAPACIDADES Y TONO:
1. Responde preguntas frecuentes basándote estrictamente en el contenido arriba.
2. Guía al usuario hacia la reserva directa. 
3. Mantén un tono de lujo: profesional (Usted), cálido y experto.
4. Si el usuario está listo para reservar, calcula el total (Noches * Precio + Limpieza) y genera la etiqueta de pago EXACTAMENTE así:
[PAYMENT_REQUEST: {id_vendedor_string}, {total_decimal}, {checkin_fecha}, {checkout_fecha}, {num_huespedes}]

MANEJO DE ERRORES:
Si no sabes la respuesta o no está en el contexto, di amablemente: "Esa es una excelente pregunta. Permítame confirmarlo con nuestro equipo para darle una respuesta precisa." y ofrece el contacto oficial.
`.trim();

        const result = await streamText({
            model: google('gemini-1.5-flash'), // Conexión estable v1 con Tier 1
            system: systemsPrompt,
            messages: messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
            })),
        });

        // Retornamos stream text compatible con el cliente
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('CHAT_RUNTIME_ERROR:', error.message);
        return new Response('Estamos preparando los detalles de tu estancia. Por favor, intenta de nuevo en un momento.', { status: 500 });
    }
}
