import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { differenceInDays, parseISO, addDays, isValid } from 'date-fns';
import { MessagingService } from '../src/services/MessagingService.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { checkAvailabilityWithICal, applyAIQuote, resolvePropertyId, findAlternatePropertyAvailable, queryPropertyKnowledge, findNextAvailability } from '../src/aiServices.js';

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

  const { start: finalStartDate, end: finalEndDate, isNormalized } = (() => {
    if (!startDate || !endDate) return { start: startDate, end: endDate, isNormalized: false };
    try {
      // 1. Precise parsing with Date-fns
      let s = parseISO(startDate);
      let e = parseISO(endDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (!isValid(s) || !isValid(e)) return { start: startDate, end: endDate, isNormalized: false };

      const nights = Math.max(1, differenceInDays(e, s));
      let changed = false;

      // 2. Year Resolver (Start Date First)
      if (s < now) {
        console.log(`[🔱 Chronos] Correcting past year ${s.getFullYear()} to future...`);
        changed = true;
        // Jump to current year
        if (s.getFullYear() < now.getFullYear()) s.setFullYear(now.getFullYear());
        // If still past (Feb in March 2026), go next year
        if (s < now) s.setFullYear(s.getFullYear() + 1);
      }

      // 3. Project End Date (Sync Duration)
      e = addDays(s, nights);

      const finalStart = s.toISOString().split('T')[0];
      const finalEnd = e.toISOString().split('T')[0];

      if (changed) console.log(`[🔱 Chronos] Normalized: ${finalStart} -> ${finalEnd} (${nights} nights)`);
      return { start: finalStart, end: finalEnd, isNormalized: changed };
    } catch (err) {
      console.warn("[🔱 Chronos] Error:", err);
      return { start: startDate, end: endDate, isNormalized: false };
    }
  })();

  // 🔱 DETERMINISTIC PROPERTY RESOLUTION (Anti-Hallucination 6.0)
  const resolvePropIdAntiHallucination = async (rawId: string, rawName: string, sb: any) => {
    const cleanId = String(rawId || '').trim();
    const cleanName = String(rawName || '').trim().toLowerCase();

    // 1. Priority A: Explicit Canonical Name Mapping (Unbeatable)
    if (cleanName.includes('retiro') || cleanName.includes('retiro r') || cleanName === 'villa retiro r') {
      if (cleanId !== '1081171030449673920') console.log(`[🔱 Resolution] Resolved propertyId from propertyName fallback: Villa Retiro R`);
      return '1081171030449673920';
    }
    if (cleanName.includes('pirata') || cleanName.includes('family') || cleanName.includes('house')) {
      if (cleanId !== '42839458') console.log(`[🔱 Resolution] Resolved propertyId from propertyName fallback: Pirata Family House`);
      return '42839458';
    }

    // 2. Priority B: Validate rawId against DB
    if (cleanId) {
      const { data: exists } = await sb.from('properties').select('id').eq('id', cleanId).maybeSingle();
      if (exists) return String(exists.id);
    }

    // 3. Priority C: Fuzzy resolvePropertyId (AI Services)
    const fuzzyId = await resolvePropertyId(cleanId || cleanName || '1081171030449673920', sb);

    // Final Validation: If fuzzyId doesn't exist in DB, it's a hallucination
    const { data: finalCheck } = await sb.from('properties').select('id').eq('id', fuzzyId).maybeSingle();
    if (finalCheck) return String(finalCheck.id);

    return null; // Unresolvable
  };

  try {
    let toolName = name;
    if (!toolName) {
      if (startDate || args.check_in) toolName = 'check_availability';
      else if (phone || args.telefono) toolName = 'send_payment_sms';
    }

    const currentPropName = args.propertyName || args.property_name || args.propiedad || "";
    const finalId = await resolvePropIdAntiHallucination(propertyId, currentPropName, supabase);

    if (!finalId) {
      return { ok: false, error: "property_not_found", data: "Lo lamento, Capitán, pero mis brújulas no encuentran esa propiedad. ¿Podría confirmar el nombre de la villa?" };
    }

    if (toolName === 'check_availability') {
      if (!finalStartDate || !finalEndDate) {
        return { ok: false, data: "Faltan fechas exactas. Confirme día, mes y año antes de consultar disponibilidad." };
      }

      // 1. Unified Availability Check (Local Bookings + Synced Blocks)
      const availability = await checkAvailabilityWithICal(finalId, finalStartDate, finalEndDate, supabase);
      
      if (!availability.available) {
        const alternate = await findAlternatePropertyAvailable(finalId, finalStartDate, finalEndDate, supabase);
        return {
          ok: true,
          available: false,
          reason: availability.reason || 'Ocupado',
          unavailableLine: availability.unavailableLine,
          alternateSuggestionLine: alternate?.alternateSuggestionLine,
          alternate: alternate ? alternate.title : null,
          normalizedStartDate: finalStartDate,
          normalizedEndDate: finalEndDate,
          isNormalized
        };
      }

      const quote = await applyAIQuote(finalId, finalStartDate, finalEndDate, undefined, supabase);
      return {
        ok: true,
        available: true,
        priceTotal: quote.total,
        nights: quote.nights,
        currency: "USD",
        normalizedStartDate: finalStartDate,
        normalizedEndDate: finalEndDate,
        isNormalized,
        message: `DISPONIBLE. Total por ${quote.nights} noches: ${quote.total} USD.`
      };

    } else if (toolName === 'find_next_availability') {
      const result = await findNextAvailability(finalId, finalStartDate || undefined, undefined, supabase);
      return {
        ok: result.ok,
        found: result.found,
        nextAvailabilityLine: result.nextAvailabilityLine,
        data: result.data
      };

    } else if (toolName === 'send_payment_sms') {
      if (!phone) throw new Error("Missing phone for SMS.");

      // 🛡️ RECALCULATE PRICE AS SOURCE OF TRUTH
      let verifiedPrice = priceTotal;
      if (finalStartDate && finalEndDate) {
        try {
          const quote = await applyAIQuote(finalId, finalStartDate, finalEndDate, undefined, supabase);
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
        startDate: finalStartDate,
        endDate: finalEndDate
      });

      return {
        ok: true,
        data: sent.success
          ? `SMS enviado con éxito. Total verificado: $${verifiedPrice} USD. SID: ${sent.sid || 'N/A'}`
          : `Fallo Crítico al enviar SMS: ${sent.error || 'Unknown Error'}. Verifique logs.`
      };

    } else if (toolName === 'send_payment_email') {
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
      if (finalStartDate && finalEndDate) {
        try {
          const quote = await applyAIQuote(finalId, finalStartDate, finalEndDate, undefined, supabase);
          verifiedPrice = quote.total;
        } catch (e) { console.warn("[Webhook] Price recalculation failed for email, using AI fallback."); }
      }

      const sent = await MessagingService.sendPaymentLinkEmail({
        to: emailNorm,
        guestName: guestName,
        propertyId: finalId,
        startDate: finalStartDate,
        endDate: finalEndDate,
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
      const result = await queryPropertyKnowledge(query, finalId, supabase);
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
        checkIn: finalStartDate,
        checkOut: finalEndDate,
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
