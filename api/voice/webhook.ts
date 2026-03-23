import { supabase } from '../../src/lib/supabase.js';
import { differenceInDays, parseISO } from 'date-fns';
import { MessagingService } from '../../src/services/MessagingService.js';

/**
 * 🔱 SALTY VOICE WEBHOOK v5 (LEVEL 5 ELITE)
 * 
 * High-Intensity Intelligence Context:
 * - Guest Recognition via Supabase Profiles.
 * - Cross-Property Yield Strategy.
 * - Dynamic Pricing & Urgency Detection.
 * - Resend Email Integration for Dossiers.
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const message = body.message || {};
    const messageType = message.type;
    const call = message.call || {};

    console.log(`[🔱 Salty/Webhook] Message Type: ${messageType}`);

    // 👁️ GUEST RECOGNITION (Reconocer al Capitán por su número)
    const customerPhone = call.customer?.number?.replace(/\D/g, '') || '';
    let guestIdentification = { name: '', isReturning: false, email: '' };

    if (customerPhone) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .filter('phone', 'ilike', `%${customerPhone.slice(-10)}%`)
        .single();
      
      if (profile) {
        guestIdentification = { 
          name: profile.full_name, 
          isReturning: true,
          email: profile.email || '' 
        };
        console.log(`[🔱 Salty/Ident] Reconocido: ${profile.full_name}`);
      }
    }

    if (messageType === 'tool-calls' || messageType === 'function-call') {
      const toolCallList = message?.toolCallList || message?.toolCalls || (message.functionCall ? [message.functionCall] : []);
      
      const results = await Promise.all(toolCallList.map(async (toolCall: any) => {
        const name = toolCall?.function?.name;
        const args = typeof toolCall?.function?.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall?.function?.arguments || {};

        switch (name) {
          case 'check_availability': {
            const { propertyId = '1081171030449673920', startDate, endDate } = args;
            const PIRATA_ID = '42839458';
            const RETIRO_ID = '1081171030449673920';

            // 🔱 CROSS-PROPERTY INTELLIGENCE (Lógica de Élite)
            const targetIds = [propertyId];
            if (propertyId === RETIRO_ID) targetIds.push(PIRATA_ID); // Si falla Retiro, sugiere Pirata

            const { data: properties, error } = await supabase
              .from('properties')
              .select('id, title, price, original_price, blockeddates')
              .in('id', targetIds);

            if (error || !properties?.length) return { toolCallId: toolCall.id, result: "Capitán, denme un segundo que la señal del muelle está inestable. ¿Podría repetirme las fechas?" };

            const mainProp = properties.find((p: any) => p.id === propertyId);
            const altProp = properties.find((p: any) => p.id !== propertyId);

            // 🔱 ELITE AVAILABILITY ENGINE: Query Real-Time Bookings for Reason Detection
            const { data: mainConflicts } = await supabase
              .from('bookings')
              .select('id, check_in, check_out, status, is_manual_block, customer_name')
              .eq('property_id', propertyId)
              .or(`and(check_in.lte.${startDate},check_out.gt.${startDate}),and(check_in.lt.${endDate},check_out.gte.${endDate}),and(check_in.gte.${startDate},check_out.lte.${endDate})`);
            
            const mainBlocked = mainConflicts && mainConflicts.length > 0;
            
            if (!mainBlocked && mainProp) {
              const nights = differenceInDays(parseISO(endDate), parseISO(startDate));
              const total = nights * (mainProp.price || 0);
              const savings = (mainProp.original_price || 0) > (mainProp.price || 0) 
                ? `¡Y tenemos una oportunidad de oro! Está ahorrando ${mainProp.original_price - mainProp.price} dólares por noche respecto a la tarifa estándar.` 
                : "";

              return {
                toolCallId: toolCall.id,
                result: `¡Excelentes noticias para usted ${guestIdentification.name || 'Invitado'}! ${mainProp.title} está totalmente disponible. El total por las ${nights} noches es de ${total} dólares. ${savings} ¿Desea que le envíe el link seguro o prefiere que le mande un Dossier completo a su email?`
              };
            }

            // If blocked, find the reason
            if (mainBlocked && mainProp) {
              const isHost = guestIdentification.email === 'villaretiror@gmail.com';
              
              // 🔱 DUAL IDENTITY LOGIC: Full transparency for Host, Discrepancy for Guests
              const reasonForGuest = "ya tenemos una reserva confirmada para esas fechas";
              const reasonForHost = mainConflicts?.[0]?.is_manual_block 
                ? `usted tiene bloqueadas estas fechas por: ${mainConflicts[0].customer_name || 'Mantenimiento Administrativo'}`
                : `hay una reserva confirmada desde otra plataforma para esas fechas`;
              
              const finalReason = isHost ? reasonForHost : reasonForGuest;

              // Step 2: Fallback to Alternative Property
              if (altProp) {
                const { data: altConflicts } = await supabase
                  .from('bookings')
                  .select('id')
                  .eq('property_id', altProp.id)
                  .or(`and(check_in.lte.${startDate},check_out.gt.${startDate}),and(check_in.lt.${endDate},check_out.gte.${endDate}),and(check_in.gte.${startDate},check_out.lte.${endDate})`);
                
                const altBlocked = altConflicts && altConflicts.length > 0;
                
                if (!altBlocked) {
                  return {
                    toolCallId: toolCall.id,
                    result: `Lamento decirle que ${mainProp?.title} no está disponible porque ${finalReason}. PERO como concierge de élite le tengo una solución: Nuestra propiedad hermana ${altProp.title} está libre y es espectacular. ¿Le gustaría que le verifique el precio de esa opción ahora mismo?`
                  };
                }
              }

              return { 
                toolCallId: toolCall.id, 
                result: `Lo lamento mucho ${isHost ? 'Capitán' : 'Invitado'}, para esas fechas ${mainProp.title} está ocupada (${finalReason}) y nuestras otras opciones también están llenas. ¿Tiene alguna flexibilidad para otros días?` 
              };
            }

            return { toolCallId: toolCall.id, result: "No pude verificar la disponibilidad exacta, denme un segundo para recalibrar." };
          }

          case 'send_payment_sms': {
            const { phone = customerPhone, guestName = guestIdentification.name, propertyId = '1081171030449673920' } = args;
            
            // 🔱 DUAL DISPATCH (SMS + Resend Alert)
            await MessagingService.sendSms({
              to: phone,
              content: `Hola ${guestName || 'Capitán'}, aquí tienes tu acceso al paraíso.`,
              propertyId: propertyId
            });

            // Si tenemos email del perfil, enviamos Dossier
            if (guestIdentification.email) {
              await MessagingService.sendEmail({
                to: guestIdentification.email,
                subject: `🔱 Dossier de Estancia - Villa Retiro R`,
                html: `<h1>¡Hola ${guestName}!</h1><p>Acabamos de hablar por voz. Aquí tienes tu enlace de reserva prioritaria...</p>`,
                guestName: guestName
              });
            }

            return {
              toolCallId: toolCall.id,
              result: `Perfecto ${guestName || ''}. Acabo de enviarle el link a su móvil. Si el sistema reconoce su email ${guestIdentification.email ? 'también le llegará un mensaje de confirmación allí' : 'puedo enviarle un dossier si gusta'}. ¿En qué más puedo servirle?`
            };
          }

          default:
            return { toolCallId: toolCall.id, result: "Protocolo no reconocido." };
        }
      }));

      return res.status(200).json({ results });
    }

    // Default response for other Vapi triggers
    return res.status(200).json({ success: true, message: "Salty listening..." });

  } catch (err: any) {
    console.error("[🔱 Elite Error]", err.message);
    return res.status(200).json({ results: [{ toolCallId: 'error', result: "Capitán, estamos recalibrando los sensores de Salty. Un momento." }]});
  }
}
