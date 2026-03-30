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
    bodyParser: false,
  },
};

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

    // 🔱 MISSION COMMAND: Atomic Execution upon validated payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const stripePaymentId = paymentIntent.id;

      let bookingId = paymentIntent.metadata?.bookingId;

      if (!bookingId) {
        const { data: b } = await supabase.from('bookings').select('id, status').eq('stripe_payment_intent_id', stripePaymentId).single();
        if (b) bookingId = b.id;
      }

      if (bookingId) {
        // 🛡️ IDEMPOTENCY CATCH
        const { data: currentBooking } = await supabase
          .from('bookings')
          .select('*, properties(title, access_code, wifi_name, wifi_pass)')
          .eq('id', bookingId)
          .single();

        if (currentBooking?.status === 'confirmed') {
          console.log(`[Stripe Webhook] 🔱 Reservation ${bookingId} already CONFIRMED. Ignoring redundant event.`);
          return res.status(200).json({ received: true, redundant: true });
        }

        // 1. Secure Atomic Update
        await supabase.from('bookings').update({
          status: 'confirmed',
          payment_method: 'stripe',
          contract_signed: true
        }).eq('id', bookingId);

        console.log(`[Stripe Webhook] 🔱 Reservation ${bookingId} CONFIRMED.`);

        // 2-4. Fire all notifications in parallel (non-blocking for Stripe)
        Promise.allSettled([
          fireOperationsManifesto(bookingId, currentBooking),
          fireCaptainTelegramAlert(bookingId, currentBooking),
          fireGuestConfirmationEmail(bookingId, currentBooking),
        ]).then(results => {
          results.forEach((r, i) => {
            const labels = ['OperationsEmail', 'CaptainTelegram', 'GuestEmail'];
            if (r.status === 'rejected') console.error(`[Stripe Webhook] ${labels[i]} failed:`, r.reason);
            else console.log(`[Stripe Webhook] ${labels[i]}: ${r.value ? '✅' : '❌'}`);
          });
        });

      } else {
        console.warn(`[Stripe Webhook] Received succeeded but no matching booking for intent: ${stripePaymentId}`);
      }
    }
    else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(`[Stripe Webhook] 🛑 Payment failed: ${intent.last_payment_error?.message}`);
    }

    // Always respond quickly to Stripe
    res.status(200).json({ received: true });

  } catch (err: any) {
    console.error(`[Stripe Webhook] 💥 CatchAll Error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 📋 OPERATIONS MANIFESTO: Internal email to staff + host
// ============================================================
async function fireOperationsManifesto(bookingId: string, booking: any): Promise<boolean> {
  try {
    const RESEND_API_KEY = getEnvVar('RESEND_API_KEY');
    const CLEANING_TEAM_EMAIL = getEnvVar('CLEANING_TEAM_EMAIL') || 'villaretiror@gmail.com';
    const HOST_EMAIL = 'villaretiror@gmail.com';

    if (!RESEND_API_KEY) {
      console.error('[OperationsManifesto] Missing RESEND_API_KEY');
      return false;
    }

    const guestName = booking?.customer_name || 'Huésped';
    const checkIn = booking?.check_in || 'No especificado';
    const checkOut = booking?.check_out || 'No especificado';
    const propertyTitle = booking?.properties?.title || `Propiedad #${booking?.property_id}`;
    const totalPaid = booking?.total_price || 0;
    const guestEmail = booking?.customer_email || 'No provisto';
    const guestCount = booking?.guests_count || 1;

    // ✨ PARSE ADD-ONS BREAKDOWN
    const addonsMeta: Record<string, { label: string; emoji: string; action: string }> = {
      early_checkin: {
        label: 'Early Check-in (1:00 PM)',
        emoji: '🌅',
        action: '⚡ ACCIÓN: Asegúrate que la villa esté lista antes de la 1:00 PM.'
      },
      late_checkout: {
        label: 'Late Check-out (2:00 PM)',
        emoji: '🌙',
        action: '⚡ ACCIÓN: No programar limpieza hasta DESPUÉS de las 2:00 PM.'
      },
      romance_pkg: {
        label: 'Romance Package (Champaña + Pétalos de Rosa)',
        emoji: '💕',
        action: '⚡ ACCIÓN: Preparar pétalos de rosa en la cama y champaña enfriándose antes de la llegada.'
      },
      breakfast_bundle: {
        label: 'Desayuno Premium',
        emoji: '🍳',
        action: '⚡ ACCIÓN: Coordinar provisiones o reserva en restaurante local.'
      }
    };

    let addonsHtml = '';
    let hasAddons = false;

    if (booking?.addons_breakdown) {
      const addonsList: string[] = Array.isArray(booking.addons_breakdown)
        ? booking.addons_breakdown
        : Object.keys(booking.addons_breakdown).filter(k => booking.addons_breakdown[k]);

      if (addonsList.length > 0) {
        hasAddons = true;
        const addonItems = addonsList.map((addon: string) => {
          const meta = addonsMeta[addon] || { label: addon, emoji: '✨', action: '⚡ ACCIÓN: Coordinar con el Capitán.' };
          return `
            <div style="background: white; border-left: 4px solid #D4AF37; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
              <div style="font-size: 15px; font-weight: 800; color: #1a1a1a; margin-bottom: 4px;">${meta.emoji} ${meta.label}</div>
              <div style="font-size: 13px; color: #c0392b; font-weight: 600;">${meta.action}</div>
            </div>
          `;
        }).join('');

        addonsHtml = `
          <div style="background: #FFF3CD; border: 2px solid #D4AF37; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #B8860B; margin: 0 0 16px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              ⚠️ ¡ATENCIÓN EQUIPO! Esta reserva incluye ADD-ONS especiales:
            </h3>
            ${addonItems}
          </div>
        `;
      }
    }

    if (!hasAddons) {
      addonsHtml = `
        <div style="background: #f0f0f0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
          <p style="color: #666; margin: 0; font-style: italic;">📋 Estadía estándar — sin add-ons especiales.</p>
        </div>
      `;
    }

    const dashboardUrl = `${getEnvVar('VITE_SITE_URL') || 'https://www.villaretiror.com'}/staff-dashboard`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #D4AF37; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;">🔱 SALTY CONCIERGE — OPERACIONES</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900;">📋 MANIFIESTO DE MISIÓN</h1>
            <div style="font-size: 13px; color: #BBA27E; margin-top: 8px;">Nueva reserva confirmada — Acción requerida del equipo</div>
          </div>
          <div style="background: white; padding: 28px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background: #22c55e; color: white; padding: 8px 20px; border-radius: 100px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">✅ PAGO CONFIRMADO — STRIPE</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 40%;">👤 Huésped</td><td style="padding: 12px 8px; font-size: 15px; font-weight: 800; color: #1a1a1a;">${guestName}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📧 Email</td><td style="padding: 12px 8px; font-size: 13px; color: #444;">${guestEmail}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🏠 Propiedad</td><td style="padding: 12px 8px; font-size: 15px; font-weight: 800; color: #1a1a1a;">${propertyTitle}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0; background: #FFF8E1;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📅 CHECK-IN</td><td style="padding: 12px 8px; font-size: 18px; font-weight: 900; color: #D4AF37;">${checkIn}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0; background: #FFF8E1;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🚪 CHECK-OUT</td><td style="padding: 12px 8px; font-size: 18px; font-weight: 900; color: #D4AF37;">${checkOut}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">👥 Huéspedes</td><td style="padding: 12px 8px; font-size: 15px; font-weight: 700; color: #1a1a1a;">${guestCount} personas</td></tr>
              <tr><td style="padding: 12px 8px; font-size: 12px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">💵 Total Pagado</td><td style="padding: 12px 8px; font-size: 20px; font-weight: 900; color: #1a1a1a;">$${totalPaid} USD</td></tr>
            </table>
            ${addonsHtml}
            <div style="background: #f8f8f8; border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
              <span style="font-size: 11px; color: #888; font-family: monospace;">Booking ID: ${bookingId}</span>
            </div>
          </div>
          <div style="background: #1a1a1a; padding: 24px; border-radius: 0 0 16px 16px; text-align: center;">
            <a href="${dashboardUrl}" style="background: #D4AF37; color: #1a1a1a; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 14px; display: inline-block; margin-bottom: 16px;">📊 Ver Staff Dashboard →</a>
            <p style="color: #888; font-size: 11px; margin: 0;">Mensaje automático del sistema Salty Concierge.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const recipients = [...new Set([CLEANING_TEAM_EMAIL, HOST_EMAIL].filter(Boolean))];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Salty Operaciones <reservas@villaretiror.com>',
        to: recipients,
        subject: `📋 MANIFIESTO: ${guestName} → Check-in ${checkIn}${hasAddons ? ' ⚠️ ADD-ONS ACTIVOS' : ''}`,
        html: emailHtml,
        reply_to: 'reservas@villaretiror.com'
      })
    });

    const data = await response.json() as any;

    if (data.id) {
      supabase.from('email_logs').insert({
        resend_id: data.id,
        booking_id: bookingId,
        guest_name: guestName,
        guest_email: recipients.join(', '),
        subject: `📋 Manifiesto de Misión: ${guestName}`,
        status: 'sent'
      }).then(null, (e: any) => console.error('[OperationsManifesto] DB Log Error:', e.message));
      return true;
    }

    console.error('[OperationsManifesto] Resend Error:', data);
    return false;

  } catch (err: any) {
    console.error('[OperationsManifesto] Error:', err.message);
    return false;
  }
}

// ============================================================
// 🚀 CAPTAIN TELEGRAM ALERT
// ============================================================
async function fireCaptainTelegramAlert(bookingId: string, booking: any): Promise<boolean> {
  try {
    const TELEGRAM_TOKEN = getEnvVar('TELEGRAM_BOT_TOKEN');
    const CHAT_ID = getEnvVar('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_TOKEN || !CHAT_ID) {
      console.error('[CaptainAlert] Missing Telegram config');
      return false;
    }

    const guestName = booking?.customer_name || 'Huésped';
    const checkIn = booking?.check_in || 'N/A';
    const checkOut = booking?.check_out || 'N/A';
    const totalPaid = booking?.total_price || 0;
    const propertyTitle = booking?.properties?.title || `Propiedad #${booking?.property_id}`;

    const addonLabels: Record<string, string> = {
      early_checkin: '🌅 Early Check-in (1PM)',
      late_checkout: '🌙 Late Check-out (2PM)',
      romance_pkg: '💕 Romance Package (¡Pétalos + Champaña!)',
      breakfast_bundle: '🍳 Desayuno Premium'
    };

    let addonsLine = '✅ <i>Estadía estándar (sin extras)</i>';

    if (booking?.addons_breakdown) {
      const addonsList: string[] = Array.isArray(booking.addons_breakdown)
        ? booking.addons_breakdown
        : Object.keys(booking.addons_breakdown).filter((k: string) => booking.addons_breakdown[k]);

      if (addonsList.length > 0) {
        addonsLine = addonsList.map((a: string) => `<b>${addonLabels[a] || `✨ ${a}`}</b>`).join('\n');
      }
    }

    const siteUrl = getEnvVar('VITE_SITE_URL') || 'https://www.villaretiror.com';

    const message = `
🔱 <b>¡Capitán, entrada confirmada!</b> 💰
━━━━━━━━━━━━━━━━━━━━
🏠 <b>Propiedad:</b> ${propertyTitle}
👤 <b>Huésped:</b> ${guestName}
📅 <b>Check-in:</b> <b>${checkIn}</b>
🚪 <b>Check-out:</b> ${checkOut}
💵 <b>Total:</b> $${totalPaid} USD
━━━━━━━━━━━━━━━━━━━━
🎁 <b>Servicios Especiales:</b>
${addonsLine}
━━━━━━━━━━━━━━━━━━━━
<i>🚀 Salty: Pago verificado. Orden de trabajo enviada al equipo terrestre.</i>`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: "📊 Ver Host Dashboard", url: `${siteUrl}/host` },
            { text: "✅ Enterado Capitán", callback_data: `ack_stripe_${bookingId}` }
          ]]
        }
      })
    });

    const data = await response.json() as any;
    return data.ok === true;

  } catch (err: any) {
    console.error('[CaptainAlert] Error:', err.message);
    return false;
  }
}

// ============================================================
// 📧 GUEST CONFIRMATION: Chain to send.ts pipeline
// ============================================================
async function fireGuestConfirmationEmail(bookingId: string, booking: any): Promise<boolean> {
  try {
    const siteUrl = getEnvVar('VITE_SITE_URL') || 'https://www.villaretiror.com';
    const apiSecret = getEnvVar('API_SECRET_KEY') || getEnvVar('RESEND_API_KEY');

    const guestEmail = booking?.customer_email;
    if (!guestEmail) {
      console.warn('[GuestEmail] No customer_email on booking, skipping guest confirmation');
      return false;
    }

    const response = await fetch(`${siteUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSecret}`
      },
      body: JSON.stringify({
        type: 'reservation_confirmed',
        email: guestEmail,
        customer: { name: booking?.customer_name || 'Huésped' },
        propertyId: booking?.property_id,
        userId: booking?.user_id,
        bookingId,
        checkIn: booking?.check_in,
        checkOut: booking?.check_out,
        total: booking?.total_price
      })
    });

    return response.ok;
  } catch (err: any) {
    console.error('[GuestEmail] Error:', err.message);
    return false;
  }
}
