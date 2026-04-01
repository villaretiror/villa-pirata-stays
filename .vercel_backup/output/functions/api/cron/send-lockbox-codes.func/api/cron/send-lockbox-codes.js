import { createClient } from '@supabase/supabase-js';
/**
 * 🔑 SALTY POST-STAY TRIGGER: Smart Lock Code Dispatcher
 *
 * This cron job runs every hour and checks for bookings
 * where check-in is exactly 24 hours away.
 * If the booking is confirmed (paid), it sends the lockbox
 * code to the guest via email and Telegram captain alert.
 *
 * Route: /api/cron/send-lockbox-codes
 * Trigger: Vercel Cron (hourly) or manual
 */
const getEnvVar = (key) => process.env[key] || process.env[`VITE_${key}`] || "";
const supabase = createClient(getEnvVar('SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    // 🛡️ Security: Verify cron secret
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = getEnvVar('CRON_SECRET') || getEnvVar('API_SECRET_KEY');
    if (expectedSecret && cronSecret !== expectedSecret) {
        console.warn('[LockboxCron] Unauthorized request');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const startTime = Date.now();
    const results = [];
    try {
        console.log('[LockboxCron] 🔑 Starting Smart Lock Code Dispatch...');
        // Find bookings where check-in is between 23h and 25h from now
        const now = new Date();
        const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
        const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now
        const windowStartDate = windowStart.toISOString().split('T')[0];
        const windowEndDate = windowEnd.toISOString().split('T')[0];
        // Fetch eligible bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
        id,
        customer_name,
        customer_email,
        check_in,
        check_out,
        property_id,
        status,
        instructions_sent_at,
        properties (
          title,
          access_code,
          lockbox_image_url,
          wifi_name,
          wifi_pass,
          google_maps_url,
          guidebook_url
        )
      `)
            .eq('status', 'confirmed')
            .gte('check_in', windowStartDate)
            .lte('check_in', windowEndDate)
            .is('instructions_sent_at', null); // Only ones that haven't been sent yet
        if (error) {
            console.error('[LockboxCron] DB Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
        console.log(`[LockboxCron] Found ${bookings?.length || 0} eligible bookings for lockbox dispatch.`);
        if (!bookings || bookings.length === 0) {
            return res.status(200).json({
                success: true,
                processed: 0,
                message: 'No eligible bookings in the 24h window.',
                duration_ms: Date.now() - startTime
            });
        }
        for (const booking of bookings) {
            try {
                const property = booking.properties;
                const guestName = booking.customer_name || 'Huésped';
                const guestEmail = booking.customer_email;
                const accessCode = property?.access_code || 'COORDINAR CON ANFITRIÓN';
                const propertyTitle = property?.title || `Propiedad #${booking.property_id}`;
                const checkIn = booking.check_in;
                const checkOut = booking.check_out;
                console.log(`[LockboxCron] Processing booking ${booking.id} for ${guestName} (check-in: ${checkIn})`);
                let emailSent = false;
                let telegramSent = false;
                // 📧 SEND LOCKBOX EMAIL TO GUEST
                if (guestEmail) {
                    emailSent = await sendLockboxEmail({
                        guestEmail,
                        guestName,
                        propertyTitle,
                        accessCode,
                        checkIn,
                        checkOut,
                        wifiName: property?.wifi_name,
                        wifiPass: property?.wifi_pass,
                        mapsUrl: property?.google_maps_url,
                        guidebookUrl: property?.guidebook_url,
                        lockboxImageUrl: property?.lockbox_image_url,
                        bookingId: booking.id
                    });
                }
                else {
                    console.warn(`[LockboxCron] No email for booking ${booking.id} — skipping guest email`);
                }
                // 🔔 NOTIFY CAPTAIN VIA TELEGRAM
                telegramSent = await notifyLockboxDispatched({
                    guestName,
                    propertyTitle,
                    checkIn,
                    accessCode,
                    bookingId: booking.id
                });
                // 📝 MARK AS SENT in DB
                await supabase
                    .from('bookings')
                    .update({ instructions_sent_at: new Date().toISOString() })
                    .eq('id', booking.id);
                results.push({
                    bookingId: booking.id,
                    guestName,
                    checkIn,
                    emailSent,
                    telegramSent,
                    status: 'processed'
                });
                // Rate limit: wait 1.5s between bookings
                await new Promise(r => setTimeout(r, 1500));
            }
            catch (bookingErr) {
                console.error(`[LockboxCron] Error processing booking ${booking.id}:`, bookingErr.message);
                results.push({
                    bookingId: booking.id,
                    status: 'error',
                    error: bookingErr.message
                });
            }
        }
        // Log heartbeat
        supabase.from('cron_heartbeats').insert({
            task_name: 'send-lockbox-codes',
            status: 'success',
            duration_ms: Date.now() - startTime,
            details: { processed: results.length, results }
        }).then(null, () => { });
        return res.status(200).json({
            success: true,
            processed: results.length,
            results,
            duration_ms: Date.now() - startTime
        });
    }
    catch (err) {
        console.error('[LockboxCron] Fatal Error:', err.message);
        supabase.from('cron_heartbeats').insert({
            task_name: 'send-lockbox-codes',
            status: 'error',
            duration_ms: Date.now() - startTime,
            error_message: err.message
        }).then(null, () => { });
        return res.status(500).json({ error: err.message });
    }
}
// ============================================================
// 📧 SEND LOCKBOX EMAIL TO GUEST (24h before check-in)
// ============================================================
async function sendLockboxEmail(params) {
    try {
        const RESEND_API_KEY = getEnvVar('RESEND_API_KEY');
        if (!RESEND_API_KEY)
            return false;
        const firstName = params.guestName.split(' ')[0];
        const siteUrl = getEnvVar('VITE_SITE_URL') || 'https://www.villaretiror.com';
        const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- HEADER -->
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 36px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">🔑</div>
            <div style="font-size: 11px; font-weight: 800; color: #D4AF37; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;">MAÑANA ES EL GRAN DÍA</div>
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900;">Tu código de acceso está listo</h1>
            <p style="color: #BBA27E; margin: 8px 0 0; font-size: 14px;">${params.propertyTitle}</p>
          </div>

          <!-- BODY -->
          <div style="background: white; padding: 32px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">

            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              ¡Hola ${firstName}! 🌊 Mañana comienzas tu estadía en ${params.propertyTitle}.
              Aquí están todos los detalles para acceder a tu refugio sin ningún problema.
            </p>

            <!-- ACCESS CODE - HERO ELEMENT -->
            <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
              <div style="font-size: 12px; color: #D4AF37; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">🔐 Código de Caja de Llaves</div>
              <div style="font-size: 48px; font-weight: 900; color: white; letter-spacing: 8px; font-family: monospace;">${params.accessCode}</div>
              <div style="font-size: 12px; color: #888; margin-top: 8px;">Ingresa este código en el teclado de la caja de llaves junto a la puerta principal</div>
            </div>

            ${params.lockboxImageUrl ? `
            <div style="text-align: center; margin: 16px 0;">
              <img src="${params.lockboxImageUrl}" alt="Caja de Llaves" style="max-width: 100%; border-radius: 12px; border: 2px solid #e0e0e0;" />
              <p style="font-size: 11px; color: #888; margin: 8px 0 0;">Así luce tu caja de llaves</p>
            </div>
            ` : ''}

            <!-- DATES -->
            <div style="display: flex; gap: 12px; margin: 24px 0;">
              <div style="flex: 1; background: #FFF8E1; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Check-in</div>
                <div style="font-size: 18px; font-weight: 900; color: #B8860B; margin-top: 4px;">${params.checkIn}</div>
                <div style="font-size: 12px; color: #666;">A partir de las 3:00 PM</div>
              </div>
              <div style="flex: 1; background: #f8f8f8; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Check-out</div>
                <div style="font-size: 18px; font-weight: 900; color: #444; margin-top: 4px;">${params.checkOut}</div>
                <div style="font-size: 12px; color: #666;">Antes de las 11:00 AM</div>
              </div>
            </div>

            ${(params.wifiName || params.wifiPass) ? `
            <!-- WIFI -->
            <div style="background: #f0f8ff; border: 1px solid #cce5ff; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <div style="font-size: 14px; font-weight: 800; color: #1a1a1a; margin-bottom: 12px;">📶 WiFi</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div><span style="font-size: 12px; color: #666;">Red:</span> <strong style="font-size: 14px; font-family: monospace;">${params.wifiName || 'Consultar'}</strong></div>
                <div><span style="font-size: 12px; color: #666;">Contraseña:</span> <strong style="font-size: 14px; font-family: monospace;">${params.wifiPass || 'Consultar'}</strong></div>
              </div>
            </div>
            ` : ''}

            <!-- CTA BUTTONS -->
            <div style="text-align: center; margin-top: 28px;">
              ${params.mapsUrl ? `<a href="${params.mapsUrl}" style="background: #1a1a1a; color: white; padding: 14px 24px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 13px; display: inline-block; margin: 4px;">🗺️ Cómo Llegar</a>` : ''}
              ${params.guidebookUrl ? `<a href="${params.guidebookUrl}" style="background: #D4AF37; color: #1a1a1a; padding: 14px 24px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 13px; display: inline-block; margin: 4px;">📖 Guía de la Villa</a>` : ''}
            </div>

            <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px; line-height: 1.6;">
              ¿Algún problema? Responde este email o contáctanos por WhatsApp.<br>
              <strong>Salty siempre está aquí para ayudarte. ⚓</strong>
            </p>
          </div>

          <!-- FOOTER -->
          <div style="background: #1a1a1a; padding: 20px; border-radius: 0 0 16px 16px; text-align: center;">
            <p style="color: #888; font-size: 11px; margin: 0;">
              ${params.propertyTitle} • Cabo Rojo, Puerto Rico<br>
              <a href="${siteUrl}" style="color: #D4AF37; text-decoration: none;">villaretiror.com</a>
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Villa Retiro R <reservas@villaretiror.com>',
                to: params.guestEmail,
                subject: `🔑 Tu código de acceso para mañana — ${params.propertyTitle}`,
                html: emailHtml,
                reply_to: 'reservas@villaretiror.com'
            })
        });
        const data = await response.json();
        if (data.id) {
            // Log email
            supabase.from('email_logs').insert({
                resend_id: data.id,
                booking_id: params.bookingId,
                guest_name: params.guestName,
                guest_email: params.guestEmail,
                subject: `🔑 Código de acceso — ${params.propertyTitle}`,
                status: 'sent'
            }).then(null, () => { });
            return true;
        }
        console.error('[LockboxCron] Resend error:', data);
        return false;
    }
    catch (err) {
        console.error('[LockboxCron] sendLockboxEmail error:', err.message);
        return false;
    }
}
// ============================================================
// 🔔 TELEGRAM: Notify Captain that lockbox code was dispatched
// ============================================================
async function notifyLockboxDispatched(params) {
    try {
        const TELEGRAM_TOKEN = getEnvVar('TELEGRAM_BOT_TOKEN');
        const CHAT_ID = getEnvVar('TELEGRAM_CHAT_ID');
        if (!TELEGRAM_TOKEN || !CHAT_ID)
            return false;
        const message = `
🔑 <b>Salty: Código de Caja de Llaves Enviado</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Huésped:</b> ${params.guestName}
🏠 <b>Propiedad:</b> ${params.propertyTitle}
📅 <b>Check-in:</b> <b>Mañana — ${params.checkIn}</b>
🔐 <b>Código:</b> <code>${params.accessCode}</code>
━━━━━━━━━━━━━━━━━━━━
<i>✅ Email enviado automáticamente al huésped. Verificar que la caja de llaves esté accesible.</i>`;
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                            { text: "✅ Caja Verificada", callback_data: `ack_lockbox_${params.bookingId}` }
                        ]]
                }
            })
        });
        const data = await response.json();
        return data.ok === true;
    }
    catch (err) {
        console.error('[LockboxCron] Telegram error:', err.message);
        return false;
    }
}
//# sourceMappingURL=send-lockbox-codes.js.map