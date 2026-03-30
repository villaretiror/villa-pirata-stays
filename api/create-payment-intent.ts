import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => process.env[key] || process.env[`VITE_${key}`] || "";

const stripe = new Stripe(getEnvVar('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  getEnvVar('SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
);

// 🛡️ ZERO-TRUST: GHOST WINDOW ICAL PARSER
function checkIcsOverlap(icsText: string, checkIn: string, checkOut: string): boolean {
    const lines = icsText.split(/\r?\n/);
    let inEvent = false, dtStart = '', dtEnd = '';
    
    const reqStart = Number(checkIn.replace(/-/g, ''));
    const reqEnd = Number(checkOut.replace(/-/g, ''));

    for (const rawLine of lines) {
       const line = rawLine.trim();
       if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; continue; }
       if (line === 'END:VEVENT' && inEvent) {
           inEvent = false;
           if (!dtStart || !dtEnd) continue;
           
           const parseToYMD = (raw: string) => {
               if (raw.includes('T') && raw.length >= 15) {
                   const iso = `${raw.substring(0,4)}-${raw.substring(4,6)}-${raw.substring(6,8)}T${raw.substring(9,11)}:${raw.substring(11,13)}:${raw.substring(13,15)}Z`;
                   const d = new Date(iso);
                   if (!isNaN(d.getTime())) {
                       const prT = new Date(d.getTime() + (3600000 * -4));
                       return Number(`${prT.getUTCFullYear()}${String(prT.getUTCMonth()+1).padStart(2,'0')}${String(prT.getUTCDate()).padStart(2,'0')}`);
                   }
               }
               const rawD = raw.replace(/T.*/, '');
               if(rawD.length >= 8) return Number(`${rawD.substring(0,4)}${rawD.substring(4,6)}${rawD.substring(6,8)}`);
               return 0;
           };
           
           const blockS = parseToYMD(dtStart);
           const blockE = parseToYMD(dtEnd);
           
           if (blockS && blockE) {
               if (reqStart < blockE && blockS < reqEnd) return true; // CRITICAL: Ghost Overlap Detected
           }
       }
       if (inEvent) {
          if (line.startsWith('DTSTART')) dtStart = (line.split(':').pop() || '').trim();
          if (line.startsWith('DTEND')) dtEnd = (line.split(':').pop() || '').trim();
       }
    }
    return false;
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bookingId } = req.body;

    if (!bookingId || bookingId === 'new') {
      return res.status(400).json({ error: 'ID de Reserva Requerido' });
    }

    // 1. Fetch Secure Booking directly from Database (Zero-Trust)
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, property_id, check_in, check_out, total_price, customer_name, customer_email, stripe_payment_intent_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Reserva no encontrada o inaccesible' });
    }

    // Calculamos el precio en centavos para Stripe
    const amountInCents = Math.max(50, Math.round(Number(booking.total_price) * 100));

    // 🛡️ ZERO-TRUST GHOST WINDOW CHECK (Ping iCal right before payment!)
    if (booking.property_id && booking.check_in && booking.check_out) {
        const { data: prop } = await supabase.from('properties').select('"calendarSync"').eq('id', booking.property_id).single();
        if (prop && prop.calendarSync && Array.isArray(prop.calendarSync)) {
            for (const feed of prop.calendarSync) {
                if (!feed.url) continue;
                try {
                    const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                    const feedRes = await fetch(tsUrl, { signal: AbortSignal.timeout(6000) });
                    if (!feedRes.ok) continue;
                    const icsText = await feedRes.text();
                    
                    const isOverlap = checkIcsOverlap(icsText, booking.check_in, booking.check_out);
                    if (isOverlap) {
                         console.warn(`[GHOST WINDOW] Overlap blocked for booking ${booking.id}!`);
                         return res.status(409).json({ error: 'GHOST_WINDOW_OVERLAP' });
                    }
                } catch (e) {
                    console.warn('[Ghost Window] ICAL Ping warning: ', e);
                }
            }
        }
    }

    // 2. Si la reserva ya tiene un intent (intento de re-pago)
    if (booking.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
        
        // Si el monto o detalles son iguales, reaprovechamos la sesión
        if (existingIntent.amount === amountInCents) {
           return res.status(200).json({ 
             clientSecret: existingIntent.client_secret, 
             paymentIntentId: existingIntent.id 
           });
        }
        
        // Si cambió el precio (ej. añadió días), actualizamos el PaymentIntent
        const updatedIntent = await stripe.paymentIntents.update(booking.stripe_payment_intent_id, {
          amount: amountInCents
        });
        
        return res.status(200).json({ 
          clientSecret: updatedIntent.client_secret, 
          paymentIntentId: updatedIntent.id 
        });
      } catch (err) {
        console.warn("[Stripe] Warning retrieving intent. Creating new one...", err);
      }
    }

    // 3. Crear nuevo PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: booking.id,
        integration_version: 'VRR_ZERO_TRUST_1.0'
      }
    });

    // 4. Salvar en la base de datos atómicamente
    await supabase.from('bookings').update({
       stripe_payment_intent_id: paymentIntent.id,
       stripe_client_secret: paymentIntent.client_secret
    }).eq('id', booking.id);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err: any) {
    console.error(`[🔱 Stripe Error]:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
