import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { differenceInDays, parseISO } from 'date-fns';
import { MessagingService } from '../src/services/MessagingService.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { checkAvailabilityWithICal, applyAIQuote, resolvePropertyId, findAlternatePropertyAvailable, queryPropertyKnowledge } from '../src/aiServices.js';

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
  
  // 🛡️ ELITE TOLERANCE: Alias old field names to new ones to prevent Vapi breakage
  const guestName = args.guestName || args.fullName || args.full_name || args.name || args.nombre || "Huésped";
  const propertyId = args.propertyId || args.property_id || args.id || '1081171030449673920';
  const startDate = args.startDate || args.start_date || args.check_in || args.checkIn;
  const endDate = args.endDate || args.end_date || args.check_out || args.checkOut;
  const phone = args.phone || args.phoneNumber || args.telefono || "";
  const email = args.email || args.correo || "";
  const priceTotal = args.priceTotal || args.total || args.price || 0;

  try {
    let toolName = name;
    if (!toolName) {
      if (startDate || args.check_in) toolName = 'check_availability';
      else if (phone || args.telefono) toolName = 'send_payment_sms';
    }

    if (toolName === 'check_availability') {
      const propId = await resolvePropertyId(propertyId, supabase);
      
      if (!startDate || !endDate) {
        return { ok: false, data: "Faltan fechas exactas. Confirme día, mes y año antes de consultar disponibilidad." };
      }

      // 1. Unified Availability Check (Local Bookings + Synced Blocks)
      const availability = await checkAvailabilityWithICal(propId, startDate, endDate, supabase);
      if (!availability.available) {
        const alternate = await findAlternatePropertyAvailable(propId, startDate, endDate, supabase);
        return { ok: true, available: false, reason: availability.reason || 'Ocupado', alternate: alternate ? alternate.title : null };
      }

      const quote = await applyAIQuote(propId, startDate, endDate, undefined, supabase);
      return {
        ok: true,
        available: true,
        priceTotal: quote.total,
        nights: quote.nights,
        currency: "USD",
        message: `DISPONIBLE. Total por ${quote.nights} noches: ${quote.total} USD.`
      };

    } else if (toolName === 'send_payment_sms') {
      const finalId = await resolvePropertyId(propertyId, supabase);
      if (!phone) throw new Error("Missing phone for SMS.");

      // 🛡️ RECALCULATE PRICE AS SOURCE OF TRUTH
      let verifiedPrice = priceTotal;
      if (startDate && endDate) {
        try {
          const quote = await applyAIQuote(finalId, startDate, endDate, undefined, supabase);
          verifiedPrice = quote.total;
        } catch (e) { console.warn("[Webhook] Price recalculation failed, using AI fallback."); }
      }
      
      const link = `https://villaretiror.com/booking/${finalId}`;
      const greeting = guestName ? `¡Hola ${guestName}! ` : "¡Hola! ";
      const content = `${greeting}Aquí tienes tu link de reserva para Villa & Pirata Stays. Total: $${verifiedPrice} USD. Accede aquí: ${link}`;
      
      const sent = await MessagingService.sendSms({ 
        to: phone, 
        content, 
        propertyId: finalId,
        guestName,
        startDate,
        endDate
      });

      return {
        ok: true,
        data: sent.success
          ? `SMS enviado con éxito. Total verificado: $${verifiedPrice} USD. SID: ${sent.sid || 'N/A'}`
          : `Fallo Crítico al enviar SMS: ${sent.error || 'Unknown Error'}. Verifique logs.`
      };

    } else if (toolName === 'send_payment_email') {
      const finalId = await resolvePropertyId(propertyId, supabase);
      
      // 🛡️ MILITARY-GRADE EMAIL VALIDATION
      const emailRaw = String(email || '');
      const emailNorm = emailRaw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[;,]+$/g, '');

      const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

      if (!emailNorm) {
        return { ok: false, data: "Falto el email. Por favor solicítalo al huésped." };
      }

      if (!isValidEmail(emailNorm)) {
        return { 
          ok: false, 
          error: 'invalid_email',
          data: `Email inválido: "${emailRaw}". Por favor confirma el email correcto con el huésped y reintenta formalmente.` 
        };
      }

      // 🛡️ RECALCULATE PRICE AS SOURCE OF TRUTH
      let verifiedPrice = priceTotal;
      if (startDate && endDate) {
        try {
          const quote = await applyAIQuote(finalId, startDate, endDate, undefined, supabase);
          verifiedPrice = quote.total;
        } catch (e) { console.warn("[Webhook] Price recalculation failed for email, using AI fallback."); }
      }

      const sent = await MessagingService.sendPaymentLinkEmail({
        to: emailNorm,
        guestName: guestName,
        propertyId: finalId,
        startDate: startDate,
        endDate: endDate,
        priceTotal: verifiedPrice,
        currency: args.currency || 'USD'
      });

      return {
        ok: true,
        data: sent.success
          ? `Email enviado con éxito al puerto de destino. ID: ${sent.id || 'N/A'}`
          : `Fallo Crítico al enviar Email: ${sent.error || 'Unknown Error'}.`
      };

    } else if (toolName === 'query_knowledge') {
      const query = args.query || args.pregunta || "";
      const propId = propertyId;

      const result = await queryPropertyKnowledge(query, propId, supabase);
      return {
        ok: result.ok,
        answer: result.answer,
        sources: result.sources || []
      };

    } else if (toolName === 'notify_captain_telegram') {
      const sent = await NotificationService.notifyCaptainFromVoiceCall({
        guestName: guestName,
        property: args.propertyName || args.propiedad || 'Sin mapear',
        phone: phone,
        email: email,
        checkIn: startDate,
        checkOut: endDate,
        total: priceTotal,
        callId: args.callId || args.call_id || 'VAPI-BRAIN'
      });

      return {
        ok: sent,
        data: sent
          ? "Capitán notificado vía Telegram de forma exitosa. 📡"
          : "Fallo en la señal de Telegram. Verifique Token/ChatID."
      };

    } else {
      return { ok: false, data: "Herramienta desconocida." };
    }
  } catch (err: any) {
    console.error(`[🔱 Brain Error]:`, err.message);
    return { ok: false, data: `Error operacional: ${err.message}` };
  }
}
