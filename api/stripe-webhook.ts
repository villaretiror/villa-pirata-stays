import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => process.env[key] || process.env[`VITE_${key}`] || "";

const stripe = new Stripe(getEnvVar('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = getEnvVar('STRIPE_WEBHOOK_SECRET');

const supabase = createClient(
  getEnvVar('SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
);

export const config = {
  api: {
    bodyParser: false, // Important to allow raw parsing for Stripe signature verification
  },
};

// Helper middleware for Raw Body parsing in Vercel functions
const buffer = (req: any) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET env var");
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Centinela: Atomic Execution upon validated payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const stripePaymentId = paymentIntent.id;

      let bookingId = paymentIntent.metadata?.bookingId;

      if (!bookingId) {
        // Fallback: If metadata failed, search Supabase by the Payment Intent ID
        const { data: b } = await supabase.from('bookings').select('id').eq('stripe_payment_intent_id', stripePaymentId).single();
        if (b) bookingId = b.id;
      }

      if (bookingId) {
         // Secure Atomic Update - Backend execution bypasses RLS
         await supabase.from('bookings').update({
            status: 'confirmed',
            payment_method: 'stripe',
            contract_signed: true
         }).eq('id', bookingId);
         
         // Trigger an Email Confirmation Notification Pipeline? 
         // Optional here, or using Database Webhooks / Cron hooks
         console.log(`[Stripe Webhook] 🔱 Reservation ${bookingId} CONFIRMED.`);
      } else {
        console.warn(`[Stripe Webhook] Received succeeded but no matching booking for intent: ${stripePaymentId}`);
      }
    } 
    else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(`[Stripe Webhook] 🛑 Payment failed: ${intent.last_payment_error?.message}`);
      // Not deleting booking as they can retry
    }

    res.status(200).json({ received: true });

  } catch (err: any) {
    console.error(`[Stripe Webhook] 💥 CatchAll Error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
