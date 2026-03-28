import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { differenceInDays, parseISO } from 'date-fns';
import { MessagingService } from '../src/services/MessagingService.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { checkAvailabilityWithICal, findCalendarGaps, applyAIQuote, resolvePropertyId, findAlternatePropertyAvailable } from '../src/aiServices.js';

const getEnvVar = (key: string): string => {
  return process.env[key] || process.env[`VITE_${key}`] || "";
};

const supabase = createClient(
  getEnvVar('SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
);

const openai = new OpenAI({
  apiKey: getEnvVar('OPENAI_API_KEY'),
});

/**
 * 🔱 UNIVERSAL WEBHOOK & VOICE DISPATCHER
 * Este endpoint centraliza Vapi, TTS, Resend y Reviews para optimizar el plan Hobby de Vercel.
 */
export default async function handler(req: any, res: any) {
  const { source } = req.query;

  // CORS Master Bypass
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 🎙️ SOURCE: VOICE (Vapi Webhook)
    if (source === 'vapi') {
      // 🔑 SECURITY VALIDATION: Standard Vapi headers + Authorization Bearer
      const vapiSecret = req.headers['x-vapi-secret'] || 
                         req.headers['vapi-webhook-secret'] || 
                         req.headers['vapi_webhook_secret'] || 
                         req.headers['vapi_webhook_secret'.toUpperCase()] || 
                         req.headers['VAPI_WEBHOOK_SECRET'] ||
                         (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);
                        
      const expectedSecret = getEnvVar('VAPI_WEBHOOK_SECRET');
      
      if (!expectedSecret || !vapiSecret || vapiSecret !== expectedSecret) {
         console.warn(`[Vapi Webhook] Unauthorized access attempt: ${vapiSecret ? 'Invalid Secret' : 'Missing Secret Header'}.`);
         return res.status(401).json({ error: 'Unauthorized. Invalid Vapi Secret.' });
      }

      // 🕒 TIME & SPACE CONTEXT: Located in Puerto Rico - AST (UTC-4)
      const now = new Date();
      const prTime = new Intl.DateTimeFormat('es-PR', {
         timeZone: 'America/Puerto_Rico',
         dateStyle: 'medium',
         timeStyle: 'medium'
      }).format(now);
      
      console.info(`[🔱 Salty Caribe HQ] Processing request from Vapi. PR Time: ${prTime} | Space: Villa & Pirata Stays.`);

      const { message } = req.body;
      const type = message?.type;

      if (type === 'tool-calls' || type === 'function-call') {
        return await handleVapiTools(req, res, message);
      }

      // 📞 CAPTURA DE LLAMADAS Y TRANSFERENCIA FÍSICA A SUPABASE STORAGE
      if (type === 'end-of-call-report') {
        const report = message.endOfCallReport || {};
        const call = message.call || {};
        
        let localRecordingUrl = report.recordingUrl || null;

        if (report.recordingUrl) {
           try {
              // Descargar audio crudo de los servidores de Vapi
              const audioRes = await fetch(report.recordingUrl);
              const arrayBuffer = await audioRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const fileName = `${call.id || Date.now()}.wav`;
              
              const { error: uploadErr } = await supabase
                 .storage
                 .from('vapi_recordings')
                 .upload(fileName, buffer, {
                    contentType: 'audio/wav',
                    upsert: true
                 });

              if (!uploadErr) {
                 const { data: pubData } = supabase.storage.from('vapi_recordings').getPublicUrl(fileName);
                 if (pubData) localRecordingUrl = pubData.publicUrl;
                 console.log(`[Storage] Audio anclado exitosamente en servidor privado: ${fileName}`);
              } else {
                 console.error('[Storage Error] No se pudo transferir audio:', uploadErr.message);
              }
           } catch (e: any) {
              console.error('[Storage Stream Error] Fallo al importar archivo de Vapi:', e.message);
           }
        }
        
        await supabase.from('vapi_calls').insert({
           call_id: call.id || 'unknown',
           started_at: call.startedAt || new Date().toISOString(),
           ended_at: call.endedAt || new Date().toISOString(),
           duration_seconds: report.duration || 0,
           transcript: report.transcript || 'No transcript',
           summary: report.summary || 'No summary',
           success_evaluation: report.successEvaluation || 'N/A',
           recording_url: localRecordingUrl
        });
        console.log(`[Vapi Webhook] Reporte de fin de llamada guardado (${call.id}).`);
        return res.status(200).json({ success: true });
      }

      // Para mensajes genéricos de estatus (conversation-update), solo reconocer
      return res.status(200).json({ success: true });
    }

    // 🔊 SOURCE: TTS (OpenAI Onyx)
    if (source === 'tts') {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text required' });
      
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/_/g, '').replace(/#/g, '').replace(/`/g, '');
      const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "onyx", input: cleanText });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(buffer);
    }

    // 📧 SOURCE: RESEND (Email Opened/Bounced)
    if (source === 'resend') {
      const { type, data } = req.body;
      if (type === 'email.opened' || type === 'email.bounced') {
        const { data: logEntry } = await supabase.from('email_logs').select('guest_email, subject').eq('resend_id', data.email_id).single();
        if (logEntry) {
          await supabase.from('email_logs').update({ status: type === 'email.opened' ? 'opened' : 'bounced', opened_at: type === 'email.opened' ? new Date().toISOString() : null }).eq('resend_id', data.email_id);
          if (type === 'email.bounced') await NotificationService.notifyEmailBounce(logEntry.guest_email || "N/A", logEntry.subject || "N/A", data.bounce_message || "Bounce");
        }
      }
      return res.status(200).json({ success: true });
    }

    // ⭐ SOURCE: REVIEW (External Review Notification)
    if (source === 'review') {
      if (req.headers['x-api-key'] !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });
      const body = req.body;
      await NotificationService.notifyNewReview(body.guestName || 'Anónimo', body.propertyTitle || 'Villa Retiro', Number(body.rating) || 5, body.platform || 'Airbnb');
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid source signature. ⚓' });

  } catch (err: any) {
    console.error(`[🔱 Universal Webhook Error - ${source}]:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * ⚓ VAPI TOOL HANDLER (High Intensity Logic)
 */
async function handleVapiTools(req: any, res: any, message: any) {
  const toolCallList = message?.toolCallList || message?.toolCalls || (message.functionCall ? [message.functionCall] : []);
  
  // 🕒 LATENCY GUARD: Vapi needs a response in < 3s to maintain human rhythm.
  const TIMEOUT_MS = 2800;
  
  const results = await Promise.all(toolCallList.map(async (toolCall: any) => {
    const name = toolCall?.function?.name || toolCall?.name;
    const args = typeof toolCall?.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall?.function?.arguments || toolCall?.arguments || {};

    const toolExecution = (async () => {
      try {
      if (name === 'get_property_info') {
        const propId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
        const { data, error } = await supabase.from('properties').select('*').eq('id', propId).single();
        if (error) throw new Error(`Permission Denied or Property Not Found: ${error.message}`);
        return { toolCallId: toolCall.id, result: JSON.stringify(data) };
      }

      if (name === 'check_availability') {
        // 🛡️ PARAMETER NORMALIZATION: Accept multiple naming conventions from AI
        const propId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
        let sDate = args.startDate || args.start_date || args.check_in || args.checkIn;
        let eDate = args.endDate || args.end_date || args.check_out || args.checkOut;
        
        // 🕒 SINCRONIZACIÓN DE FORMATOS (ISO 8601) - Robust check for Puerto Rico Today
        const prNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Puerto_Rico"}));
        const nowStr = prNow.toISOString().split('T')[0];
        try {
            if (sDate) sDate = new Date(sDate).toISOString().split('T')[0];
            if (eDate) eDate = new Date(eDate).toISOString().split('T')[0];
            
            // Si la IA no envía fecha, o envía algo inválido, Salty asume hoy/mañana como cortesía proactiva
            if (!sDate) sDate = nowStr;
            if (!eDate) {
               const nextDay = new Date(prNow);
               nextDay.setDate(nextDay.getDate() + 2); // Mínimo 2 noches usualmente
               eDate = nextDay.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn("[Vapi] Invalid dates provided by AI", { sDate, eDate });
            sDate = nowStr;
        }
        
        // 🔱 MASTER VALIDATION (iCal + Seasonal logic - Using Master Key)
        console.log(`[Vapi] Checking availability for ${propId} (input: ${args.propertyId}) from ${sDate} to ${eDate}. Today is ${nowStr}`);
        const availability = await checkAvailabilityWithICal(propId, sDate, eDate, supabase);
        
        if (availability.available) {
          try {
            const quote = await applyAIQuote(propId, sDate, eDate, undefined, supabase);
            return { 
              toolCallId: toolCall.id, 
              result: `¡Excelente noticia! Estas fechas están disponibles para crear memorias inolvidables. El total por ${quote.nights} noches, incluyendo impuestos del paraíso, es de ${quote.total} dólares. ¿Le gustaría proceder con la reserva ahora mismo? ⚓` 
            };
          } catch(err: any) {
             return {
                toolCallId: toolCall.id,
                result: `Las fechas están disponibles, pero hubo un ligero problema al calcular el total exacto. ¿Gusta que le envíe el enlace para verificarlo directamente?`
             };
          }
        }

        if (availability.reason?.includes("mis brújulas no reconocen")) {
            return { toolCallId: toolCall.id, result: availability.reason };
        }

        // 🔍 PROACTIVE GAP SEARCH: If blocked, find alternate options
        try {
            const gapResult: any = await findCalendarGaps(propId, supabase);
            const nextGap = gapResult?.slots?.[0];
            
            // 🔱 UPSELLING: Check other properties too
            const alternate = await findAlternatePropertyAvailable(propId, sDate, eDate, supabase);
            const altMsg = alternate 
              ? `. Sin embargo, Capitán, veo que *${alternate.title}* está totalmente disponible para esas fechas. ¿Le gustaría que le hable un poco más de esta opción?`
              : nextGap 
                ? `. Pero tengo el horizonte despejado del ${nextGap.start} al ${nextGap.end}. ¿Le funcionaría esa travesía?`
                : ". Por el momento esas fechas están reservadas en toda la flota.";

            return { 
              toolCallId: toolCall.id, 
              result: `Está ocupado. Lo lamento, Capitán, esas fechas ya están ocupadas en el refugio${altMsg}` 
            };
        } catch(err) {
            return { 
              toolCallId: toolCall.id, 
              result: `Está ocupado. Lo lamento, Capitán, esas fechas ya están ocupadas en el refugio.` 
            };
        }
      }

      if (name === 'send_payment_sms') {
        const phone = args.phone || args.telefono;
        const guestName = args.guestName || args.nombre || 'Viajero';
        const rawPropId = args.propertyId || args.property_id || '1081171030449673920';
        const finalId = await resolvePropertyId(rawPropId, supabase);
        const propertyTitle = (await supabase.from('properties').select('title').eq('id', finalId).single()).data?.title || 'Villa Retiro';
        
        const bookingLink = `https://www.villaretiror.com/booking/${finalId}`;
        const content = `¡Hola ${guestName}! Soy Salty. Aquí tienes el link oficial para asegurar tu estancia en ${propertyTitle}: ${bookingLink}. ¡Te esperamos en el paraíso! 🏝️`;
        
        const sent = await MessagingService.sendSms({ to: phone, content, propertyId: finalId });
        return { 
          toolCallId: toolCall.id, 
          result: sent 
            ? `¡Listo! He disparado un mensaje de texto con el link de reserva directa a su móvil. ¿Desea que lo esperemos para confirmar su recepción o tiene alguna otra duda técnica? ⚓`
            : `Hubo una turbulencia al enviar el mensaje, pero no se preocupe, puedo intentar de nuevo o dictar el link si prefiere.`
        };
      }

        return { toolCallId: toolCall.id, result: "Protocolo activo pero no reconozco la herramienta especificada." };

      } catch (err: any) {
        const errMsg = err.message || "Unknown Failure";
        console.error(`[Vapi Tool Critical Error - ${name}]:`, errMsg);
        return { toolCallId: toolCall.id, result: `Mis sinceras disculpas, Capitán. Un ligero inconveniente técnico me impide procesar la solicitud en este instante. Por favor, comuníquese directamente con el Capitán principal para asistirle personalmente.` };
      }
    })();

    // 🏎️ RACE AGAINST THE VAPI CLOCK
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ 
        toolCallId: toolCall.id, 
        result: "Capitán, el sistema está procesando datos complejos. Por favor, pídale al cliente un segundo mientras mis brújulas terminan de girar o intente nuevamente la consulta." 
      }), TIMEOUT_MS)
    );

    return Promise.race([toolExecution, timeoutPromise]);
  }));

  return res.status(200).json({ results });
}
