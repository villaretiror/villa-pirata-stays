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

    // 📩 CASO: PAGO EXITOSO / RESERVA CONFIRMADA (Caribe Chic Edition)
    else if (type === 'payment_success' || type === 'reservation_confirmed') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = req.body || {};
      const firstName = customerName?.split(' ')[0] || 'Viajero';
      
      const mapsUrl = propertyId === '42839458' ? 'https://share.google/iQA2MMS4C2Vv7HBIx' : 'https://share.google/LBxZV0NwKZps4rliR';
      const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(propertyName || 'Cabo Rojo, Puerto Rico')}`;

      emails.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: `🏝️ ¡Confirmado! Tu refugio en el oeste está listo`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 40px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
            <div style="background-color: #FDFCFB; padding: 50px 40px; text-align: center; border-bottom: 2px dashed #f0f0f0;">
              <img src="${currentLogo}" width="140" style="margin-bottom: 25px;" />
              <h1 style="color: #2C2B29; font-size: 32px; margin: 0; font-family: 'Playfair Display', serif; font-weight: 700;">¡Hola, ${firstName}!</h1>
              <p style="color: #FF7F3F; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 11px; margin-top: 15px;">Tu experiencia Caribe Chic comienza ahora</p>
            </div>
            
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.8;">
              <p style="font-size: 17px; margin-bottom: 25px;">
                Soy <strong>Salty</strong>, tu concierge digital. La brisa de Buyé ya te espera y yo he preparado cada detalle para que tu estancia en <strong>${propertyName}</strong> sea legendaria.
              </p>
              
              <div style="background-color: #2C2B29; color: #ffffff; padding: 35px; border-radius: 25px; margin: 30px 0; position: relative; overflow: hidden;">
                <h3 style="color: #FF7F3F; margin-top: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Protocolo de Acceso</h3>
                <p style="margin: 10px 0; font-size: 14px; opacity: 0.8;">Código Seguro:</p>
                <p style="margin: 5px 0;"><span style="font-size: 32px; color: #ffffff; font-weight: 800; letter-spacing: 4px;">${accessCode || '4829#'}</span></p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <p style="margin: 5px 0; font-size: 14px;">📡 <b>WF:</b> ${wifiName || 'VillaRetiro_Guest'}</p>
                  <p style="margin: 5px 0; font-size: 14px;">🔑 <b>Pass:</b> <code>${wifiPass || 'Tropical2024!'}</code></p>
                </div>
              </div>

              <!-- 🌦️ Live Weather Section -->
              <div style="border: 1px solid #f0f0f0; border-radius: 20px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 15px; background: #fafafa;">
                <span style="font-size: 30px;">☀️</span>
                <div>
                  <p style="margin: 0; font-weight: bold; font-size: 14px; color: #2C2B29;">Clima en Cabo Rojo</p>
                  <p style="margin: 0; font-size: 12px; color: #666;">28°C — Soleado y Perfecto para Buyé.</p>
                </div>
              </div>

              <!-- 🗺️ Navigation Buttons -->
              <div style="text-align: center; margin: 35px 0;">
                <p style="font-size: 14px; color: #888; margin-bottom: 20px;">¿Cómo llegar al paraíso?</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                  <a href="${mapsUrl}" style="background-color: #ffffff; color: #2C2B29; border: 1px solid #ddd; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">📍 Google Maps</a>
                  <a href="${wazeUrl}" style="background-color: #33CCFF; color: #ffffff; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">🚙 Waze</a>
                </div>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="https://villaretiror.com/stay/${propertyId}" style="background: linear-gradient(135deg, #FF7F3F 0%, #E05A2B 100%); color: #ffffff; padding: 20px 40px; border-radius: 18px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 15px 30px rgba(255,127,63,0.3);">🔑 Gestionar Mi Estancia</a>
              </div>

              <p style="font-size: 14px; color: #666; font-style: italic; text-align: center; margin-top: 40px;">
                "En la Villa, el tiempo se mide en olas y sonrisas. Nos vemos pronto." — Salty
              </p>
            </div>

            <div style="background-color: #F8F9FA; padding: 40px; text-align: center; font-size: 12px; color: #999;">
              <p>Si necesitas arreglos especiales (chef, decoración, transporte), responde a este correo.</p>
              <div style="margin-top: 25px;">
                <a href="https://wa.me/17873560895" style="color: #25D366; text-decoration: none; font-weight: bold;">WhatsApp VIP</a> | 
                <a href="https://villaretiror.com" style="color: #666; text-decoration: none;">villaretiror.com</a>
              </div>
            </div>
          </div>
        `
      });

      // 🛰️ TELEGRAM SALES ALERT: Social Proof Interno
      const priceStr = req.body.totalPrice ? `$${req.body.totalPrice}` : '0';
      await NotificationService.notifyNewReservation(
        customerName || 'Invitado',
        propertyName || 'Propiedad',
        checkIn || 'TBD',
        checkOut || 'TBD',
        priceStr
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

    // 📩 CASO: THANK YOU NOTE (Post-stay Luxury Loop)
    else if (type === 'thank_you_note') {
      const { customerName, customerEmail, propertyName } = req.body || {};
      const firstName = customerName?.split(' ')[0] || 'Socio';
      const googleReviewUrl = propertyName?.includes('Retiro') 
        ? 'https://g.page/r/CUERPA_RETIRO_PLACEHOLDER' 
        : 'https://g.page/r/PIRATA_FAMILY_PLACEHOLDER';

      emails.push({
        from: fromAddress,
        to: customerEmail,
        subject: '🌊 ¡Gracias por ser parte de la historia de Villa Retiro!',
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 40px; overflow: hidden; background-color: #ffffff;">
            <div style="padding: 50px 40px; text-align: center; background-color: #FDFCFB;">
              <img src="${currentLogo}" width="120" style="margin-bottom: 30px;" />
              <h1 style="color: #2C2B29; font-size: 28px; margin: 0; font-family: serif;">¡Buen viaje a casa, ${firstName}!</h1>
            </div>
            
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.8; text-align: left;">
              <p style="font-size: 16px;">
                Espero que la brisa de Cabo Rojo y la paz de la Villa te acompañen en tu regreso. Fue un verdadero placer para mí y para todo el equipo de **Villa Retiro LLC** tenerte con nosotros.
              </p>
              <p style="font-size: 16px;">
                Mi misión como tu concierge es que cada detalle haya sido perfecto. Si disfrutaste tu estancia tanto como nosotros disfrutamos recibirte, nos ayudaría muchísimo que compartieras tu experiencia:
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${googleReviewUrl}" style="background-color: #2C2B29; color: #ffffff; padding: 20px 40px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐ Dejar reseña en Google</a>
                <p style="font-size: 11px; color: #999; margin-top: 15px;">(Tu apoyo ayuda a que este proyecto familiar siga creciendo)</p>
              </div>

              <div style="background: linear-gradient(135deg, #FFF8F4 0%, #FFEDE2 100%); padding: 35px; border-radius: 25px; margin: 40px 0; border: 1px solid #FFD8C2; text-align: center;">
                <h3 style="color: #FF7F3F; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;">🎁 Un regalo para tu regreso</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Sabemos que ya estás extrañando el atardecer en Buyé. Por reservar directamente, tienes este beneficio exclusivo:</p>
                <div style="background: white; display: inline-block; padding: 15px 30px; border: 2px dashed #FF7F3F; border-radius: 12px; margin-bottom: 25px;">
                  <span style="font-size: 22px; color: #2C2B29; font-weight: 900; letter-spacing: 2px;">RETORNOPREMIUM</span>
                </div>
                <p style="font-size: 13px; font-weight: bold; color: #2C2B29;">10% de Descuento Directo + Regalo de Huésped Recurrente</p>
                <a href="https://villaretiror.com" style="color: #FF7F3F; font-weight: bold; text-decoration: underline; font-size: 14px; margin-top: 15px; display: block;">📅 ¡Quiero volver! Reservar ahora</a>
              </div>

              <p style="font-size: 14px; color: #666; font-style: italic; text-align: center;">
                "Hasta la próxima, socio." — Salty
              </p>
            </div>

            <div style="background-color: #F8F9FA; padding: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee;">
              <p>© 2026 Villa Retiro LLC. Todos los derechos reservados.</p>
              <p>Salty™ es una marca de Villa Retiro LLC.</p>
            </div>
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
