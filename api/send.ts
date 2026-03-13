import { Resend } from 'resend';
import { NotificationService } from '../services/NotificationService.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Versión Node.js para Vercel Functions (v9.0 - Final Resilience Sync)
export default async function handler(req: any, res: any) {
  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  console.log(`[Email API] Incoming Method: ${req.method} | Path: ${req.url}`);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validaciones Críticas
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email API] CRITICAL: RESEND_API_KEY missing");
    return res.status(500).json({ error: 'Server configuration incomplete' });
  }

  try {
    // En Node.js, Vercel ya parsea el body si viene como JSON
    const { type, to, customer, contactData, booking, propertyId } = req.body || {};
    const userData = customer || contactData || {};

    // Log de Auditoría Master Consolidado
    const clientName = userData.name || (req.body || {}).customerName || 'Cliente Indefinido';
    console.log(`[Email System] Enviando tipo: ${type} para el cliente: ${clientName}`);
    console.log(`[Email API] UserAgent: ${req.headers['user-agent']}`);

    const resendClient = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = 'Villa Retiro <reservas@villaretiror.com>';
    const hostEmail = 'villaretiror@gmail.com';

    const LOGOS: Record<string, string> = {
      '1081171030449673920': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/villa_retiro_logo.png',
      '42839458': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/pirata_family_logo.png'
    };

    const currentLogo = LOGOS[propertyId] || LOGOS['1081171030449673920'];

    const emailFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
        <a href="https://wa.me/17873560895" style="background-color: #25D366; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">📲 Hablar con el Host</a>
        <p style="font-size: 11px; color: #999; margin-top: 20px;">Mensaje de villaretiror.com</p>
      </div>
    `;

    let emails: any[] = [];

    // 📩 CASO: CONTACTO / LEADS
    if (type === 'contact') {
      const { name, email, phone, message } = userData;
      emails.push({
        from: fromAddress,
        to: hostEmail,
        subject: `📩 Nueva Consulta: ${name}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 15px;">
          <h3>Detalles de la Consulta</h3>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${phone}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          ${emailFooter}
        </div>`
      });
      if (email) {
        emails.push({
          from: fromAddress,
          to: email,
          subject: 'Recibimos tu consulta - Villa Retiro 🌴',
          html: `<div style="font-family: sans-serif; text-align: center; padding: 30px;">
            <img src="${currentLogo}" width="100" />
            <h2>¡Hola ${name?.split(' ')[0]}!</h2>
            <p>Gracias por tu interés. Te contactaremos pronto.</p>
            ${emailFooter}
          </div>`
        });
      }
    }

    // 📩 CASO: ALERTA URGENTE CHAT / CHAT NOTIFICATION
    else if (type === 'urgent_alert' || type === 'chat_notification') {
      const name = userData.name || 'Cliente';
      const message = userData.message || 'Soporte Urgente';
      const contact = userData.contact || userData.phone || userData.email || 'No Provisto';
      emails.push({
        from: fromAddress,
        to: hostEmail,
        subject: `🚨 ${type === 'urgent_alert' ? 'URGENTE' : 'Notificación'}: Soporte Chat - ${name}`,
        html: `<div style="font-family: sans-serif; border: 4px solid #F63; padding: 30px; border-radius: 20px;">
          <h1 style="color: #F63;">⚠️ Solicitud de Soporte</h1>
          <p><strong>Cliente:</strong> ${name}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          <p><strong>Contacto:</strong> ${contact}</p>
          <div style="margin-top: 20px;">
            <a href="https://wa.me/${contact?.replace(/\D/g, '')}" style="background: #25D366; color: white; padding: 15px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">WhatsApp Directo</a>
          </div>
          ${emailFooter}
        </div>`
      });
    }

    // 📩 CASO: PAGO EXITOSO / RESERVA CONFIRMADA
    else if (type === 'payment_success' || type === 'reservation_confirmed') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = req.body || {};
      const firstName = customerName?.split(' ')[0] || 'Viajero';

      emails.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: `🏝️ ¡Todo listo! Salty te da la bienvenida a ${propertyName}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 30px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #FDFCFB; padding: 40px; text-align: center; border-bottom: 2px dashed #f0f0f0;">
              <img src="${currentLogo}" width="140" style="margin-bottom: 20px;" />
              <h1 style="color: #2C2B29; font-size: 28px; margin: 0; font-family: serif;">¡Confirmado, ${firstName}!</h1>
              <p style="color: #FF7F3F; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-top: 10px;">Prepárate para la experiencia Caribe Chic</p>
            </div>
            
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.6;">
              <p style="font-size: 16px;">
                ¡Hola! Soy <strong>Salty</strong>, tu concierge personal. Estoy saltando de alegría porque has elegido <strong>${propertyName}</strong> para tu descanso. Te aseguro que los atardeceres aquí tienen un sabor especial.
              </p>
              
              <div style="background-color: #FFF8F4; padding: 30px; border-radius: 20px; margin: 30px 0; border: 1px solid #FFEDE2;">
                <h3 style="color: #FF7F3F; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Tu Guía de Acceso</h3>
                <p style="margin: 10px 0;"><strong>Código de Entrada:</strong> <span style="font-size: 24px; color: #2C2B29; font-weight: black; letter-spacing: 2px;">${accessCode || '1234#'}</span></p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>WiFi:</strong> ${wifiName || 'Villa_Guest'} / <code>${wifiPass || 'pirata2024'}</code></p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Estancia:</strong> ${checkIn} — ${checkOut}</p>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 14px; color: #888; margin-bottom: 20px;">He preparado algo especial para ti que no está en las guías convencionales...</p>
                <a href="https://villaretiror.com/secret-spots" style="background-color: #2C2B29; color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">🎁 Descargar los 5 Spots Secretos de Salty</a>
              </div>

              <p style="font-size: 14px; color: #666; font-style: italic;">
                "En la isla, el tiempo se mide en olas y sonrisas. Nos vemos pronto." — Salty
              </p>
            </div>

            <div style="background-color: #F8F9FA; padding: 30px; text-align: center; font-size: 12px; color: #999;">
              <p>Si necesitas ayuda con el transporte o alguna petición especial, responde a este correo o contacta al Equipo de Villa & Pirata.</p>
              <div style="margin-top: 20px;">
                <a href="https://wa.me/17873560895" style="color: #25D366; text-decoration: none; font-weight: bold;">WhatsApp de Soporte</a> | 
                <a href="https://villaretiror.com" style="color: #primary; text-decoration: none; font-weight: bold;">Mi Reserva</a>
              </div>
            </div>
          </div>
        `
      });

      // 🛰️ TELEGRAM SALES ALERT: Social Proof Interno
      const commissionSaved = ((Number(req.body.totalPrice) || 0) * 0.15).toFixed(2);
      await NotificationService.sendTelegramAlert(
        `💰 <b>¡Salty acaba de cerrar una venta!</b>\n\n` +
        `Propiedad: <b>${propertyName}</b>\n` +
        `👤 <b>Huésped:</b> ${customerName}\n` +
        `📅 <b>Estancia:</b> ${checkIn} al ${checkOut}\n` +
        `💵 <b>Monto:</b> $${req.body.totalPrice || '0'}\n\n` +
        `🚀 <b>Ahorro:</b> $${commissionSaved}`
      );
    }

    // 📩 CASO: INVITACIÓN CO-ANFITRIÓN
    else if (type === 'cohost_invitation') {
      const { email, propertyName, token } = req.body || {};
      const inviteUrl = `${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/login?invite=true${token ? `&token=${token}` : ''}`;

      emails.push({
        from: fromAddress,
        to: email,
        subject: `🤝 Invitación para ser Co-anfitrión en ${propertyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 30px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #2C2B29; padding: 40px; text-align: center;">
              <img src="${currentLogo}" width="120" style="margin-bottom: 20px;" />
              <h2 style="color: #ffffff; margin: 0; font-family: serif;">Invitación Especial</h2>
              <p style="color: #FF7F3F; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 11px; margin-top: 10px;">Equipo de Villa & Pirata</p>
            </div>
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.6;">
              <p style="font-size: 16px;">Has sido invitado como <strong>Co-anfitrión</strong> para gestionar la propiedad <strong>${propertyName}</strong>.</p>
              <p style="font-size: 14px; color: #666;">Como miembro del equipo, tendrás acceso al Panel de Control para supervisar reservas, el calendario operativo y la comunicación con los huéspedes.</p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background-color: #FF7F3F; color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px rgba(255,127,63,0.2);">Aceptar Invitación y Acceder</a>
              </div>
              
              <p style="font-size: 12px; color: #999; text-align: center; font-style: italic;">
                "Bienvenidos al equipo. Hagamos de cada estancia algo inolvidable." — Salty
              </p>
            </div>
            ${emailFooter}
          </div>
        `
      });
    }

    // 🚀 ENVÍO GARANTIZADO (Guaranteed Delivery)
    const results = [];
    for (const emailData of emails) {
      const { data, error } = await resendClient.emails.send(emailData);
      if (error) {
        throw new Error(`Resend Error: ${JSON.stringify(error)}`);
      }
      results.push(data);
    }

    console.log(`[Email System] Despacho exitoso para tipo: ${type}`);
    return res.status(200).json({ success: true, results });

  } catch (err: any) {
    console.error("[Email System] FATAL ERROR:", err.message);
    return res.status(500).json({ error: err.message, status: 'failed' });
  }
}
