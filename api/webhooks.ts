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
      const rawBody = req.body;
      const type = message?.type || rawBody?.type;

      if (type === 'tool-calls' || type === 'function-call' || !!rawBody?.toolCallList || !!rawBody?.toolCalls || !!rawBody?.functionCall) {
        return await handleVapiTools(req, res, message || rawBody);
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
  
  // 🕒 LATENCY GUARD: Vapi tools can handle up to 20s, but 10s is a safe bunker limit.
  const TIMEOUT_MS = 10000;
  
  const results = await Promise.all(toolCallList.map(async (toolCall: any) => {
    const name = toolCall?.function?.name || toolCall?.name;
    const args = typeof toolCall?.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall?.function?.arguments || toolCall?.arguments || {};

    const toolExecution = (async () => {
      const startTime = Date.now();
      try {
        // 🔱 SANITIZED LOGGING FOR AUDIT
        const sanitizedArgs = { ...args };
        if (sanitizedArgs.phone) sanitizedArgs.phone = `***-***-${sanitizedArgs.phone.slice(-4)}`;
        if (sanitizedArgs.telefono) sanitizedArgs.telefono = `***-***-${sanitizedArgs.telefono.slice(-4)}`;
        
        console.info(`[🔱 Tool Start] Call: ${message.call?.id || 'N/A'} | Tool: ${name} | Args: ${JSON.stringify(sanitizedArgs)}`);
        
        let responseData = "";

        if (name === 'get_property_info') {
          const propId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
          const { data, error } = await supabase.from('properties').select('*').eq('id', propId).single();
          if (error) throw new Error(`Property Not Found: ${error.message}`);
          responseData = JSON.stringify(data);
        }

        else if (name === 'check_availability') {
          const propId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
          const sDateInput = args.startDate || args.start_date || args.check_in || args.checkIn;
          const eDateInput = args.endDate || args.end_date || args.check_out || args.checkOut;
          
          if (!sDateInput || !eDateInput) {
              return { 
                toolCallId: toolCall.id, 
                result: { ok: false, data: "Faltan fechas exactas. Confirme día, mes y año antes de consultar disponibilidad." } 
              };
          }

          const qIn = new Date(sDateInput);
          const qOut = new Date(eDateInput);

          // 1. Fetch Property Feeds for LIVE SYNC
          const { data: prop } = await supabase.from('properties').select('title, calendarSync').eq('id', propId).single();
          const feeds: any[] = prop?.calendarSync || [];
          
          let externalBlocks: { start: string, end: string, source: string }[] = [];
          
          // 🔱 LIVE FETCH (Parallel with 5s timeout)
          await Promise.all(feeds.map(async (feed) => {
              if (!feed.url) return;
              try {
                  const res = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
                  if (!res.ok) return;
                  const text = await res.text();
                  
                  // Simple fast-parse of VEVENT
                  const lines = text.split(/\r?\n/);
                  let inEvent = false, dtStart = '', dtEnd = '';
                  for (const line of lines) {
                      if (line.includes('BEGIN:VEVENT')) inEvent = true;
                      if (line.includes('END:VEVENT')) {
                          if (dtStart && dtEnd) {
                            const bIn = `${dtStart.substring(0,4)}-${dtStart.substring(4,6)}-${dtStart.substring(6,8)}`;
                            const bOut = `${dtEnd.substring(0,4)}-${dtEnd.substring(4,6)}-${dtEnd.substring(6,8)}`;
                            externalBlocks.push({ start: bIn, end: bOut, source: feed.platform });
                          }
                          inEvent = false; dtStart = ''; dtEnd = '';
                      }
                      if (inEvent) {
                          if (line.startsWith('DTSTART')) dtStart = line.split(':').pop()?.substring(0,8) || '';
                          if (line.startsWith('DTEND')) dtEnd = line.split(':').pop()?.substring(0,8) || '';
                      }
                  }
              } catch (e) { console.error(`[Live Sync Fail] ${feed.platform}:`, e); }
          }));

          // 2. Check Overlap (requested range: [qIn, qOut))
          const conflict = externalBlocks.find(b => {
              const bIn = new Date(b.start);
              const bOut = new Date(b.end);
              return qIn < bOut && qOut > bIn;
          });

          if (conflict) {
            const alternate = await findAlternatePropertyAvailable(propId, sDateInput, eDateInput, supabase);
            return {
              toolCallId: toolCall.id,
              result: { 
                ok: true, 
                available: false, 
                reason: `Ocupado vía ${conflict.source} (Sincronía en tiempo real)`,
                alternate: alternate ? alternate.title : null
              }
            };
          }

          // 3. Fallback to Local DB for direct web bookings
          const availability = await checkAvailabilityWithICal(propId, sDateInput, eDateInput, supabase);
          
          if (!availability.available) {
            const alternate = await findAlternatePropertyAvailable(propId, sDateInput, eDateInput, supabase);
            return {
              toolCallId: toolCall.id,
              result: { 
                ok: true, 
                available: false, 
                reason: availability.reason || 'No disponible en base de datos local',
                alternate: alternate ? alternate.title : null
              }
            };
          }

          // 4. Calculate Price (Success Case)
          try {
            const quote = await applyAIQuote(propId, sDateInput, eDateInput, undefined, supabase);
            return {
                toolCallId: toolCall.id,
                result: {
                    ok: true,
                    available: true,
                    priceTotal: quote.total,
                    nights: quote.nights,
                    currency: "USD",
                    minNights: 2,
                    message: `DISPONIBLE. Total por ${quote.nights} noches: ${quote.total} USD.`
                }
            };
          } catch(e) {
            return { 
                toolCallId: toolCall.id, 
                result: { ok: false, data: "Error al calcular cotización final. Por favor intente más tarde." } 
            };
          }
        }

        else if (name === 'send_payment_sms') {
          const phone = args.phone || args.telefono || "";
          const guestName = args.guestName || args.nombre || 'Huésped';
          const rawPropId = args.propertyId || args.property_id || '1081171030449673920';
          const finalId = await resolvePropertyId(rawPropId, supabase);
          
          if (!phone) throw new Error("Missing phone number for SMS.");

          const bookingLink = `https://villaretiror.com/booking/${finalId}`;
          const content = `¡Hola ${guestName}! Soy Salty. Aquí tienes tu link de reserva para asegurar tu estancia: ${bookingLink}. ¡Te esperamos!`;
          
          const sent = await MessagingService.sendSms({ to: phone, content, propertyId: finalId });
          responseData = sent ? "SMS enviado exitosamente con el link de pago." : "Error al enviar el SMS. Intente de nuevo.";
        } else {
          responseData = "Herramienta no reconocida en este puerto.";
        }

        const duration = Date.now() - startTime;
        console.info(`[🔱 Tool Success] ${name} | Duration: ${duration}ms`);
        
        return { 
          toolCallId: toolCall.id, 
          result: { ok: true, data: responseData } 
        };

      } catch (err: any) {
        console.error(`[🔱 Tool Error] ${name}:`, err.message);
        return { 
          toolCallId: toolCall.id, 
          result: { ok: false, data: `Error operacional: ${err.message}` } 
        };
      }
    })();

    // 🏎️ RACE AGAINST THE VAPI CLOCK
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ 
        toolCallId: toolCall.id, 
        result: { ok: false, data: "Timeout operacional. El sistema está barajando datos complejos. Por favor, pida un segundo al cliente." }
      }), TIMEOUT_MS)
    );

    return Promise.race([toolExecution, timeoutPromise]);
  }));

  return res.status(200).json({ results });
}
