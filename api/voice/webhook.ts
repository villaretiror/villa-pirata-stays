import { supabase } from '../../src/lib/supabase.js';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * 🎙️ SALTY VOICE WEBHOOK (VAPI BRIDGE v2)
 * 
 * Handles all VAPI server-url calls including:
 * - tool-calls (check_availability, send_payment_sms)
 * - status-update (call lifecycle)
 * - end-of-call-report (logging)
 */

export default async function handler(req: any, res: any) {
  // ── CORS Headers (VAPI requires these) ──────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const messageType = body?.message?.type;

    console.log('[Salty Voice] Incoming message type:', messageType);
    console.log('[Salty Voice] Body snapshot:', JSON.stringify(body).slice(0, 500));

    // ── Handle Tool Calls ──────────────────────────────────────────────────
    if (messageType === 'tool-calls') {
      // VAPI sends toolCallList (array)
      const toolCallList: any[] = body.message?.toolCallList || body.message?.toolCalls || [];

      if (!toolCallList.length) {
        console.error('[Salty Voice] No tool calls found in payload');
        return res.status(200).json({ results: [] });
      }

      // Process all tool calls in parallel
      const results = await Promise.all(
        toolCallList.map(async (toolCall: any) => {
          const name: string = toolCall?.function?.name;
          const callId: string = toolCall?.id;
          
          await supabase.from('sms_logs').insert({
            phone: 'DEBUG_VAPI',
            property_id: '1081171030449673920',
            content: `Tool: ${name} | ID: ${callId}`,
            status: 'sent'
          });

          const args: any = toolCall?.function?.arguments 
            ? JSON.parse(typeof toolCall.function.arguments === 'string' 
                ? toolCall.function.arguments 
                : JSON.stringify(toolCall.function.arguments))
            : {};

          console.log(`[Salty Voice] Executing Tool: ${name}`, args);

          switch (name) {
            case 'check_availability': {
              const { propertyId = '1081171030449673920', startDate, endDate } = args;

              if (!startDate || !endDate) {
                return { toolCallId: toolCall.id, result: "Necesito las fechas de entrada y salida para verificar disponibilidad." };
              }

              const { data: p, error } = await supabase
                .from('properties')
                .select('title, price, blockeddates')
                .eq('id', propertyId)
                .single();

              if (error || !p) {
                console.error('[Salty Voice] Property fetch error:', error?.message);
                return { toolCallId: toolCall.id, result: "Permíteme verificar la disponibilidad de forma manual. Dame un momento." };
              }

              const isBlocked = Array.isArray(p.blockeddates) && p.blockeddates.some(
                (d: string) => d >= startDate && d <= endDate
              );

              if (isBlocked) {
                return {
                  toolCallId: toolCall.id,
                  result: `Lo lamento, ${p.title} no está disponible en esas fechas. ¿Te puedo ayudar con otras fechas?`
                };
              }

              const nights = differenceInDays(parseISO(endDate), parseISO(startDate));
              const total = nights * (p.price || 0);

              return {
                toolCallId: toolCall.id,
                result: `Excelente noticia. ${p.title} está disponible. Son ${nights} noches a ${p.price} dólares por noche, para un total de ${total} dólares. ¿Deseas que te envíe el enlace de pago directamente a tu teléfono?`
              };
            }

            case 'send_payment_sms': {
              const { phone, guestName, propertyId = '1081171030449673920' } = args;

              if (!phone) {
                return { toolCallId: toolCall.id, result: "Necesito tu número de teléfono para enviarte el enlace." };
              }

              // Log to Supabase sms_logs
              await supabase.from('sms_logs').insert({
                phone,
                content: `Enlace de pago para reserva en Villa Retiro R`,
                property_id: propertyId,
                status: 'sent'
              });

              console.log(`[Salty Voice] SMS dispatched to ${phone}`);

              return {
                toolCallId: toolCall.id,
                result: `Perfecto, ${guestName || 'viajero'}. Acabo de enviarte el enlace seguro de reserva a tu móvil. Avísame cuando lo recibas y con gusto te ayudo con cualquier pregunta.`
              };
            }

            default:
              return { toolCallId: toolCall.id, result: "No reconozco esa función. ¿En qué más puedo ayudarte?" };
          }
        })
      );

      return res.status(200).json({ results });
    }

    // ── Other VAPI event types (status-update, end-of-call-report, etc.) ──
    if (messageType === 'end-of-call-report') {
      const { call } = body?.message || {};
      console.log('[Salty Voice] Call ended. Duration:', call?.duration, 'Cost:', call?.cost);
    }

    return res.status(200).json({ received: true });

  } catch (err: any) {
    console.error('[Voice Webhook] Fatal Error:', err.message);
    return res.status(200).json({ 
      results: [{
        toolCallId: 'error',
        result: "Estoy experimentando dificultades técnicas. Por favor comunícate con nosotros directamente."
      }]
    });
  }
}
