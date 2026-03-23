import { supabase } from '../../src/lib/supabase.js';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * 🔱 SALTY VOICE WEBHOOK v3 (ELITE EDITION)
 * 
 * Powered by @vapi-ai/server-sdk logic.
 * This is the central hub for Salty's voice intelligence.
 */

export default async function handler(req: any, res: any) {
  // CORS Standards (Required for VAPI global distribution)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message } = req.body || {};
    const messageType = message?.type;

    console.log(`[🔱 Salty Voice] Incoming Event: ${messageType}`);

    // logic for handling tool calls
    if (messageType === 'tool-calls') {
      const toolCallList = message?.toolCallList || message?.toolCalls || [];
      
      const results = await Promise.all(
        toolCallList.map(async (toolCall: any) => {
          const name = toolCall?.function?.name;
          // Robust parsing of arguments from VAPI
          const args = typeof toolCall?.function?.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments) 
            : toolCall?.function?.arguments || {};

          console.log(`[🔱 Salty/Tool] Executing: ${name}`, args);

          switch (name) {
            case 'check_availability': {
              const { propertyId = '1081171030449673920', startDate, endDate } = args;

              if (!startDate || !endDate) {
                return { toolCallId: toolCall.id, result: "Capitán, necesito que me diga las fechas de entrada y salida para verificar el calendario." };
              }

              const { data: p, error } = await supabase
                .from('properties')
                .select('title, price, blockeddates')
                .eq('id', propertyId)
                .single();

              if (error || !p) {
                return { toolCallId: toolCall.id, result: "Hubo un pequeño retraso en la conexión con la bitácora. Permítame verificarlo manualmente o intente con otras fechas." };
              }

              // Availability Logic
              const isBlocked = Array.isArray(p.blockeddates) && p.blockeddates.some(
                (d: string) => d >= startDate && d <= endDate
              );

              if (isBlocked) {
                return {
                  toolCallId: toolCall.id,
                  result: `Lamento informarle que ${p.title} ya está ocupada para esas fechas. ¿Le gustaría que verifiquemos otro rango o la otra propiedad en Cabo Rojo?`
                };
              }

              const nights = differenceInDays(parseISO(endDate), parseISO(startDate));
              const total = nights * (p.price || 0);

              return {
                toolCallId: toolCall.id,
                result: `¡Excelentes noticias! ${p.title} está disponible para esas ${nights} noches. El total de su estancia sería de ${total} dólares. ¿Desea que le envíe el enlace oficial a su móvil para asegurar su reserva ahora mismo?`
              };
            }

            case 'send_payment_sms': {
              const { phone, guestName, propertyId = '1081171030449673920' } = args;

              if (!phone) {
                return { toolCallId: toolCall.id, result: "Disculpe, ¿podría repetirme su número de teléfono para enviarle el mensaje?" };
              }

              // Audit logging to Supabase
              await supabase.from('sms_logs').insert({
                phone,
                content: `Reserva Villa Retiro R - Link de Pago Enviado p/ ${guestName || 'Invitado'}`,
                property_id: propertyId,
                status: 'vapi_voice_dispatched'
              });

              return {
                toolCallId: toolCall.id,
                result: `Perfecto. Acabo de disparar el mensaje con el enlace seguro a su celular. Avísame cuando lo recibas. ¿Hay algo más que el santuario le pueda ofrecer hoy?`
              };
            }

            default:
              return { toolCallId: toolCall.id, result: "Esa función no está disponible en mis protocolos actuales, ¿puedo ayudarle con la reserva o precios?" };
          }
        })
      );

      return res.status(200).json({ results });
    }

    // Default VAPI success response
    return res.status(200).json({ success: true, processed: true });

  } catch (err: any) {
    console.error("[🔱 Salty Error]", err.message);
    return res.status(200).json({ 
      results: [{
        toolCallId: 'error_recovery',
        result: "Capitán, mi conexión con la central está inestable. ¿Podría repetirme su solicitud o llamarnos en un momento?"
      }]
    });
  }
}
