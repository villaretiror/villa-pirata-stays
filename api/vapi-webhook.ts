import { supabase } from '../src/lib/supabase.js';

/**
 * 🛰️ VAPI BRAIN WEBHOOK
 * Este endpoint permite al asistente de voz de Vapi interactuar con Supabase.
 * Soporta llamadas a herramientas (Tools) definidas en el Dashboard de Vapi.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;

  // Vapi envía un mensaje de tipo 'tool-calls' cuando el asistente necesita datos
  if (message?.type === 'tool-calls') {
    const toolCalls = message.toolCalls;
    const results = [];

    for (const call of toolCalls) {
      const { name, arguments: args } = call.function;

      try {
        if (name === 'get_property_info') {
          const { propertyId } = args;
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

          if (error) throw error;
          results.push({
            toolCallId: call.id,
            result: JSON.stringify(data)
          });
        }

        if (name === 'check_availability') {
          const { propertyId, checkIn, checkOut } = args;
          
          // Consultar bloqueos de calendario
          const { data: blocked, error } = await supabase
            .from('properties')
            .select('blockeddates')
            .eq('id', propertyId)
            .single();

          if (error) throw error;

          // Lógica simple de verificación de solapamiento
          const blockedDates = blocked?.blockeddates || [];
          const isAvailable = !blockedDates.some((date: string) => {
             return date >= checkIn && date <= checkOut;
          });

          results.push({
            toolCallId: call.id,
            result: JSON.stringify({ 
              available: isAvailable, 
              message: isAvailable ? "Las fechas están libres." : "Lo lamento, esas fechas ya están reservadas." 
            })
          });
        }

        if (name === 'create_booking_lead') {
          const { propertyId, guestName, email, phone, checkIn, checkOut } = args;
          
          const { data, error } = await supabase
            .from('bookings')
            .insert({
              property_id: propertyId,
              customer_name: guestName,
              customer_email: email,
              customer_phone: phone,
              check_in: checkIn,
              check_out: checkOut,
              status: 'pending_payment',
              source: 'Vapi Voice'
            });

          if (error) throw error;
          results.push({
            toolCallId: call.id,
            result: JSON.stringify({ success: true, message: "Lead de reserva creado con éxito." })
          });
        }

      } catch (err: any) {
        console.error(`[Vapi Webhook] Error in ${name}:`, err.message);
        results.push({
          toolCallId: call.id,
          error: err.message
        });
      }
    }

    return res.status(200).json({ results });
  }

  // Otros tipos de mensajes de Vapi (logs, call-end, etc)
  return res.status(200).json({ status: 'ok' });
}
