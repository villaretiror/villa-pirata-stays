import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { differenceInDays, parseISO } from 'date-fns';
import { MessagingService } from '../src/services/MessagingService.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { checkAvailabilityWithICal, findCalendarGaps, applyAIQuote } from '../src/aiServices.js';

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
      const { message } = req.body;
      const type = message?.type;

      if (type === 'tool-calls' || type === 'function-call') {
        return await handleVapiTools(req, res, message);
      }

      // For other Vapi messages (conversation-update, etc.), just acknowledge
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
  
  const results = await Promise.all(toolCallList.map(async (toolCall: any) => {
    const name = toolCall?.function?.name || toolCall?.name;
    const args = typeof toolCall?.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall?.function?.arguments || toolCall?.arguments || {};

    try {
      if (name === 'get_property_info') {
        const { data, error } = await supabase.from('properties').select('*').eq('id', args.propertyId).single();
        if (error) throw new Error(`Permission Denied or Property Not Found: ${error.message}`);
        return { toolCallId: toolCall.id, result: JSON.stringify(data) };
      }

      if (name === 'check_availability') {
        const { propertyId = '1081171030449673920', startDate, endDate } = args;
        
        // 🔱 MASTER VALIDATION (iCal + Seasonal logic - Using Master Key)
        console.log(`[Vapi] Checking availability for ${propertyId} from ${startDate} to ${endDate}`);
        const availability = await checkAvailabilityWithICal(propertyId, startDate, endDate, supabase);
        
        if (availability.available) {
          const quote = await applyAIQuote(propertyId, startDate, endDate, undefined, supabase);
          return { 
            toolCallId: toolCall.id, 
            result: `¡Excelente noticia! Estas fechas están disponibles para crear memorias inolvidables. El total por ${quote.nights} noches, incluyendo impuestos del paraíso, es de ${quote.total} dólares. ¿Le gustaría proceder con la reserva ahora mismo? ⚓` 
          };
        }

        // 🔍 PROACTIVE GAP SEARCH: If blocked, find alternate options
        const gaps = await findCalendarGaps(propertyId, supabase);
        const nextGap = gaps[0];
        const gapMsg = nextGap 
          ? `. Sin embargo, veo que tengo el horizonte despejado del ${nextGap.start} al ${nextGap.end} (${nextGap.nights} noches). ¿Le funcionaría esa travesía?`
          : ". Por el momento esas fechas están reservadas y no veo huecos cercanos.";

        return { 
          toolCallId: toolCall.id, 
          result: `Lo lamento, Capitán, esas fechas ya están ocupadas en el refugio${gapMsg} ⚓` 
        };
      }

      return { toolCallId: toolCall.id, result: "Protocolo activo pero no reconozco la herramienta especificada." };

    } catch (err: any) {
      const errMsg = err.message || "Unknown Failure";
      console.error(`[Vapi Tool Critical Error - ${name}]:`, errMsg);
      return { toolCallId: toolCall.id, result: `Contratiempo Técnico: ${errMsg}. Por favor, disculpe al Concierge.` };
    }
  }));

  return res.status(200).json(results);
}
