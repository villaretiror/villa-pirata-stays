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

    if (messageType === 'tool-calls') {
      const toolCallList = message?.toolCallList || message?.toolCalls || [];
      
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

            const mainProp = properties.find(p => p.id === propertyId);
            const altProp = properties.find(p => p.id !== propertyId);

            // Step 1: Check Main Property
            const mainBlocked = Array.isArray(mainProp?.blockeddates) && mainProp.blockeddates.some(d => d >= startDate && d <= endDate);
            
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

            // Step 2: Fallback to Alternative Property
            if (altProp) {
              const altBlocked = Array.isArray(altProp.blockeddates) && altProp.blockeddates.some(d => d >= startDate && d <= endDate);
              if (!altBlocked) {
                const altNights = differenceInDays(parseISO(endDate), parseISO(startDate));
                return {
                  toolCallId: toolCall.id,
                  result: `Lamento decirle que ${mainProp?.title} ya está reservada para esas fechas, PERO como concierge de élite le tengo una solución: Nuestra propiedad hermana ${altProp.title} está libre y es espectacular. ¿Le gustaría que le verifique el precio de esa opción ahora mismo?`
                };
              }
            }

            return { toolCallId: toolCall.id, result: "Lo lamento mucho Capitán, para esas fechas ambas villas están en su máxima capacidad. ¿Tiene alguna flexibilidad para otros días?" };
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

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("[🔱 Elite Error]", err.message);
    return res.status(200).json({ results: [{ toolCallId: 'error', result: "Capitán, estamos recalibrando los sensores de Salty. Un momento." }]});
  }
}
