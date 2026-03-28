import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { differenceInDays, parseISO } from 'date-fns';
import { MessagingService } from '../src/services/MessagingService.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { checkAvailabilityWithICal, applyAIQuote, resolvePropertyId, findAlternatePropertyAvailable } from '../src/aiServices.js';

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
 * 🔱 UNIVERSAL WEBHOOK & VOICE DISPATCHER (Salty 6.0 Bunker)
 */
export default async function handler(req: any, res: any) {
  const { source } = req.query;

  // CORS Master Bypass
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-vapi-secret');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 🎙️ SOURCE: VOICE (Vapi Webhook / apiRequest)
    if (source === 'vapi') {
      const vapiSecret = req.headers['x-vapi-secret'] || 
                         req.headers['vapi-webhook-secret'] || 
                         req.headers['VAPI_WEBHOOK_SECRET'] ||
                         (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);
                        
      const expectedSecret = getEnvVar('VAPI_WEBHOOK_SECRET');
      
      if (!expectedSecret || !vapiSecret || vapiSecret !== expectedSecret) {
         return res.status(401).json({ error: 'Unauthorized. Invalid Vapi Secret.' });
      }

      const { message } = req.body;
      const rawBody = req.body;
      const type = message?.type || rawBody?.type;
      
      // 🔱 DUAL-MODE DETECTION
      const isVapiEvent = type === 'tool-calls' || type === 'function-call' || !!rawBody?.toolCallList || !!rawBody?.toolCalls;
      const isDirectToolRequest = !isVapiEvent && !!(rawBody.startDate || rawBody.start_date || rawBody.propertyId || rawBody.property_id || rawBody.phone);

      if (isVapiEvent) {
          return await handleVapiTools(req, res, message || rawBody);
      }

      if (isDirectToolRequest) {
          const result = await executeDirectTool(rawBody, supabase);
          return res.status(200).json(result);
      }

      // 📞 CALL REPORTS
      if (type === 'end-of-call-report') {
        const report = message?.endOfCallReport || rawBody?.endOfCallReport || {};
        const call = message?.call || rawBody?.call || {};
        
        let localRecordingUrl = report.recordingUrl || null;

        if (report.recordingUrl) {
           try {
              const audioRes = await fetch(report.recordingUrl);
              const buffer = Buffer.from(await audioRes.arrayBuffer());
              const fileName = `${call.id || Date.now()}.wav`;
              await supabase.storage.from('vapi_recordings').upload(fileName, buffer, { contentType: 'audio/wav', upsert: true });
              const { data: pubData } = supabase.storage.from('vapi_recordings').getPublicUrl(fileName);
              if (pubData) localRecordingUrl = pubData.publicUrl;
           } catch (e: any) { console.error('[Storage Error]:', e.message); }
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
        return res.status(200).json({ success: true });
      }

      return res.status(200).json({ success: true, message: "Status acknowledged. ⚓" });
    }

    // 🔊 SOURCE: TTS
    if (source === 'tts') {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text required' });
      const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "onyx", input: text });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(buffer);
    }

    // 📧 SOURCE: RESEND / ⭐ SOURCE: REVIEW
    if (source === 'resend') return res.status(200).json({ success: true });
    if (source === 'review') {
        const body = req.body;
        await NotificationService.notifyNewReview(body.guestName || 'Anónimo', body.propertyTitle || 'Villa Retiro', Number(body.rating) || 5, body.platform || 'Airbnb');
        return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid source signature. ⚓' });

  } catch (err: any) {
    console.error(`[🔱 Webhook Error]:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * ⚓ VAPI TOOL EVENT HANDLER
 */
async function handleVapiTools(req: any, res: any, message: any) {
  const toolCallList = message?.toolCallList || message?.toolCalls || (message.functionCall ? [message.functionCall] : []);
  const results = await Promise.all(toolCallList.map(async (toolCall: any) => {
    const args = typeof toolCall?.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall?.function?.arguments || toolCall?.arguments || {};
    const name = toolCall?.function?.name || toolCall?.name;
    const result = await executeDirectTool({ ...args, name }, supabase);
    return { toolCallId: toolCall.id, result };
  }));
  return res.status(200).json({ results });
}

/**
 * 🔱 SHARED BRAIN: The single source of truth for tools.
 */
async function executeDirectTool(args: any, supabase: any) {
  const name = args.name;
  try {
    let toolName = name;
    if (!toolName) {
        if (args.startDate || args.check_in) toolName = 'check_availability';
        else if (args.phone || args.telefono) toolName = 'send_payment_sms';
    }

    if (toolName === 'check_availability') {
      const propId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
      const sDateInput = args.startDate || args.start_date || args.check_in || args.checkIn;
      const eDateInput = args.endDate || args.end_date || args.check_out || args.checkOut;
      
      if (!sDateInput || !eDateInput) {
          return { ok: false, data: "Faltan fechas exactas. Confirme día, mes y año antes de consultar disponibilidad." };
      }

      const qIn = new Date(sDateInput);
      const qOut = new Date(eDateInput);

      // 1. LIVE ICAL SYNC
      const { data: prop } = await supabase.from('properties').select('calendarSync').eq('id', propId).single();
      const feeds: any[] = prop?.calendarSync || [];
      const externalBlocks: { start: string, end: string, source: string }[] = [];
      
      await Promise.all(feeds.map(async (feed) => {
          if (!feed.url) return;
          try {
              const res = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
              if (!res.ok) return;
              const text = await res.text();
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
          } catch (e) {}
      }));

      const conflict = externalBlocks.find(b => qIn < new Date(b.end) && qOut > new Date(b.start));

      if (conflict) {
        const alternate = await findAlternatePropertyAvailable(propId, sDateInput, eDateInput, supabase);
        return { ok: true, available: false, reason: `Ocupado vía ${conflict.source} (Sincronía en tiempo real)`, alternate: alternate ? alternate.title : null };
      }

      // 2. Local Checkout & Quote
      const availability = await checkAvailabilityWithICal(propId, sDateInput, eDateInput, supabase);
      if (!availability.available) {
        const alternate = await findAlternatePropertyAvailable(propId, sDateInput, eDateInput, supabase);
        return { ok: true, available: false, reason: availability.reason || 'Ocupado', alternate: alternate ? alternate.title : null };
      }

      const quote = await applyAIQuote(propId, sDateInput, eDateInput, undefined, supabase);
      return {
          ok: true,
          available: true,
          priceTotal: quote.total,
          nights: quote.nights,
          currency: "USD",
          message: `DISPONIBLE. Total por ${quote.nights} noches: ${quote.total} USD.`
      };

    } else if (toolName === 'send_payment_sms') {
      const phone = args.phone || args.telefono || "";
      const finalId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
      if (!phone) throw new Error("Missing phone for SMS.");
      const link = `https://villaretiror.com/booking/${finalId}`;
      const sent = await MessagingService.sendSms({ to: phone, content: `¡Hola! Aquí tienes tu link de reserva: ${link}`, propertyId: finalId });
      
      return { 
          ok: true, 
          data: sent.success 
            ? `SMS enviado con éxito. SID: ${sent.sid || 'N/A'}` 
            : `Fallo Crítico al enviar SMS: ${sent.error || 'Unknown Error'}. Verifique logs.`
      };
      
    } else if (toolName === 'send_payment_email') {
      const email = args.email || args.correo || "";
      const finalId = await resolvePropertyId(args.propertyId || args.property_id || '1081171030449673920', supabase);
      if (!email) throw new Error("Missing email for payment link.");

      const sent = await MessagingService.sendPaymentLinkEmail({ 
          to: email, 
          guestName: args.guestName || args.nombre,
          propertyId: finalId,
          startDate: args.startDate || args.check_in,
          endDate: args.endDate || args.check_out,
          priceTotal: args.priceTotal || args.total,
          currency: args.currency || 'USD'
      });
      
      return { 
          ok: true, 
          data: sent.success 
            ? `Email enviado con éxito al puerto de destino. ID: ${sent.id || 'N/A'}` 
            : `Fallo Crítico al enviar Email: ${sent.error || 'Unknown Error'}.`
      };

    } else {
      return { ok: false, data: "Herramienta desconocida." };
    }
  } catch (err: any) {
    console.error(`[🔱 Brain Error]:`, err.message);
    return { ok: false, data: `Error operacional: ${err.message}` };
  }
}
