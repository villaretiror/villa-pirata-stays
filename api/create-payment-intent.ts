import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../src/services/CalendarSyncService';

const getEnvVar = (key: string): string => process.env[key] || process.env[`VITE_${key}`] || "";

const stripe = new Stripe(getEnvVar('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  getEnvVar('SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
);

// 🛡️ ZERO-TRUST: GHOST WINDOW OVERLAP PROTECTOR
function hasGhostOverlap(icsText: string, propertyId: string, checkIn: string, checkOut: string): boolean {
    try {
        const blocks = CalendarSyncService.parseIcsToBlocks(icsText, propertyId);
        
        // Match the YYYY-MM-DD format for direct string comparison
        const reqStart = checkIn;
        const reqEnd = checkOut;

        return blocks.some(block => {
            // Standard overlap logic: (StartA < EndB) AND (EndA > StartB)
            return reqStart < block.end && block.start < reqEnd;
        });
    } catch (err) {
        console.error('[Ghost-Check] Parser Failure:', err);
        return false; // Fail-safe: if parser breaks, we don't block payment (but log it)
    }
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
            const validFeeds = prop.calendarSync.filter((feed: any) => !!feed.url);
            
            // 🔥 PARALLEL EXECUTION (ANTI-TIMEOUT)
            const validations = await Promise.allSettled(
              validFeeds.map(async (feed: any) => {
                 const tsUrl = feed.url + (feed.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
                 const feedRes = await fetch(tsUrl, { signal: AbortSignal.timeout(6000) });
                 if (!feedRes.ok) return false;
                 
                 const icsText = await feedRes.text();
                 return hasGhostOverlap(icsText, String(booking.property_id), booking.check_in!, booking.check_out!);
              })
            );
            
            for (const result of validations) {
                if (result.status === 'fulfilled' && result.value === true) {
                     console.warn(`[GHOST WINDOW] Overlap blocked for booking ${booking.id}!`);
                     return res.status(409).json({ error: 'GHOST_WINDOW_OVERLAP' });
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
