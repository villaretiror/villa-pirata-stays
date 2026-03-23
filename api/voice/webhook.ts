import { supabase } from '../../src/lib/supabase.js';
import { MessagingService } from '../../src/services/MessagingService.js';
import { differenceInDays, format, parseISO } from 'date-fns';

/**
 * 🎙️ SALTY VOICE WEBHOOK (VAPI BRIDGE)
 * 
 * Este endpoint maneja la lógica de negocio para las llamadas de voz.
 * Permite a Salty consultar disponibilidad y enviar links de pago por SMS.
 */

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message } = req.body || {};
    
    // VAPI Tool Call Handling
    if (message?.type === 'tool-calls') {
      const toolCall = message.toolCalls[0];
      const { name, args } = toolCall.function;

      console.log(`[Salty Voice] Executing Tool: ${name}`, args);

      switch (name) {
        case 'check_availability': {
          const { propertyId, startDate, endDate } = args;
          
          // 1. Fetch Property
          const { data: p } = await supabase.from('properties').select('title, price, blockeddates').eq('id', propertyId).single();
          if (!p) return res.status(200).json({ results: [{ toolCallId: toolCall.id, result: "Propiedad no encontrada." }] });

          // 2. Simple logic check
          const isBlocked = p.blockeddates?.some((d: string) => d >= startDate && d <= endDate);
          
          if (isBlocked) {
            return res.status(200).json({ 
              results: [{ 
                toolCallId: toolCall.id, 
                result: `Lo lamento, pero ${p.title} ya está reservada en esas fechas. ¿Deseas que busquemos otra opción?` 
              }] 
            });
          }

          const nights = differenceInDays(parseISO(endDate), parseISO(startDate));
          const total = nights * p.price;

          return res.status(200).json({ 
            results: [{ 
              toolCallId: toolCall.id, 
              result: `${p.title} está disponible para esas ${nights} noches. El total estimado es de ${total} dólares. ¿Quieres que te envíe el link de pago por SMS?` 
            }] 
          });
        }

        case 'send_payment_sms': {
          const { phone, propertyId, guestName } = args;
          
          const smsResult = await MessagingService.sendSms({
            to: phone,
            content: `¡Hola ${guestName || 'Viajero'}! Soy Salty. Aquí tienes tu enlace seguro para confirmar tu estancia en Villa Retiro R.`,
            propertyId: propertyId
          });

          return res.status(200).json({ 
            results: [{ 
              toolCallId: toolCall.id, 
              result: smsResult.success 
                ? "Perfecto, acabo de enviar el mensaje a tu móvil con el enlace seguro. ¿Puedo ayudarte con algo más?" 
                : "Hubo un pequeño error al enviar el mensaje, pero lo intentaré de nuevo en un momento." 
            }] 
          });
        }

        default:
          return res.status(200).json({ results: [{ toolCallId: toolCall.id, result: "Función no implementada." }] });
      }
    }

    // Standard Response for other VAPI messages
    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("[Voice Webhook] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
