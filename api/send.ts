import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer, booking, type, to, propertyId, propertyTitle } = req.body;

  // URLs de Logos (Public Storage)
  const LOGOS: Record<string, string> = {
    '1081171030449673920': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/villa_retiro_logo.png',
    '42839458': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/pirata_family_logo.png'
  };

  const REVIEW_LINKS: Record<string, string> = {
    '1081171030449673920': 'https://g.page/r/villa-retiro-review',
    '42839458': 'https://g.page/r/pirata-family-review'
  };

  const currentLogo = LOGOS[propertyId] || LOGOS['1081171030449673920'];

  const emailFooter = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
      <a href="https://wa.me/17873560895" 
         style="background-color: #25D366; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
         📲 Contactar al Host (WhatsApp)
      </a>
      <p style="font-size: 11px; color: #ccc; margin-top: 20px;">
        Gracias por reservar con nosotros; esperamos que su estancia sea inolvidable.<br>
        Este es un mensaje automático de villaretiror.com
      </p>
    </div>
  `;

  try {
    let emailOptions: any = {
      from: 'Villa Retiro <reservas@villaretiror.com>',
      to: to || ['villaretiror@gmail.com'],
      bcc: ['villaretiror@gmail.com'], // Respaldo de seguridad para el Host
    };

    if (type === 'invite') {
      emailOptions.subject = 'Has sido invitado como co-anfitrión en Villa Retiro';
      emailOptions.html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 16px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${LOGOS['1081171030449673920']}" width="120" style="margin-bottom: 20px;" />
            <h1 style="color: #000; font-size: 24px; font-weight: 800; margin-bottom: 8px;">¡Hola!</h1>
            <p style="color: #666; font-size: 16px;">Villa Retiro R LLC te ha enviado una invitación importante.</p>
          </div>
          <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; padding: 24px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5;">
              Has sido invitado para gestionar la propiedad <strong>${propertyTitle || 'Villa Retiro'}</strong> como co-anfitrión.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://villaretiror.com/login?invite=true" 
               style="background-color: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              ACEPTAR INVITACIÓN
            </a>
          </div>
          ${emailFooter}
        </div>
      `;
    } else if (type === 'contact') {
      const { name, email, phone, message } = req.body.contactData;

      const hostEmailOptions = {
        from: 'Villa Retiro <reservas@villaretiror.com>',
        to: 'villaretiror@gmail.com',
        subject: `📩 Nueva Consulta de Cliente - Villa Retiro`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 24px; color: #1a1a1a;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="${LOGOS['1081171030449673920']}" width="80" />
              <h1 style="font-size: 20px; font-weight: 800; margin: 16px 0 8px;">Nueva Consulta Recibida</h1>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background-color: #fcfcfc; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
              <tr><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; width: 120px; color: #999; font-size: 11px;">Nombre</td><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px;">${name}</td></tr>
              <tr><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; color: #999; font-size: 11px;">Email</td><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px;">${email}</td></tr>
              <tr><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; color: #999; font-size: 11px;">Teléfono</td><td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px;">${phone || 'No provisto'}</td></tr>
              <tr><td style="padding: 20px; color: #999; font-size: 11px;">Mensaje</td><td style="padding: 20px; font-size: 15px;">${message}</td></tr>
            </table>
            ${emailFooter}
          </div>
        `
      };

      const clientEmailOptions = {
        from: 'Villa Retiro <reservas@villaretiror.com>',
        to: email,
        subject: `Recibimos tu consulta - Villa Retiro 🌴`,
        html: `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: auto; padding: 60px 40px; text-align: center; color: #1a1a1a;">
            <img src="${LOGOS['1081171030449673920']}" width="100" style="margin-bottom: 40px;" />
            <h1 style="font-size: 32px; margin-bottom: 24px;">Hola, ${name.split(' ')[0]}</h1>
            <p style="font-size: 16px; color: #666;">Gracias por interesarte en Villa Retiro & Pirata Stays. Hemos recibido tu mensaje y te contactaremos en las próximas 24 horas.</p>
            ${emailFooter}
          </div>
        `
      };

      await resend.emails.send(hostEmailOptions);
      await resend.emails.send(clientEmailOptions);
      return res.status(200).json({ success: true });

    } else if (type === 'payment_success') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = req.body;

      emailOptions.to = customerEmail;
      emailOptions.subject = `🏝️ ¡Todo listo! Tu Guía de Acceso para ${propertyName}`;
      emailOptions.html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${currentLogo}" width="120" style="margin-bottom: 24px;" />
            <h1 style="font-size: 24px; font-weight: 800;">¡Bienvenido al Paraíso, ${customerName}!</h1>
            <p style="color: #666;">Tu reserva en <strong>${propertyName}</strong> está confirmada y pagada.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 12px; text-transform: uppercase;">🔑 Acceso</h2>
            <p><strong>Código Lockbox:</strong> <span style="font-size: 18px; color: #FF6633; font-weight: 800;">${accessCode || 'XXXX'}</span></p>
          </div>
          <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 12px; text-transform: uppercase;">📶 WiFi</h2>
            <p><strong>Red:</strong> ${wifiName}<br><strong>Clave:</strong> ${wifiPass}</p>
          </div>
          <p style="text-align: center;"><strong>Check-in:</strong> ${checkIn} | <strong>Check-out:</strong> ${checkOut}</p>
          ${emailFooter}
        </div>
      `;
    } else if (type === 'urgent_alert') {
      const { name, message, contact } = req.body.contactData || req.body;
      emailOptions.subject = `🚨 URGENTE: Soporte solicitado - ${name}`;
      emailOptions.to = 'villaretiror@gmail.com';
      emailOptions.html = `
        <div style="font-family: sans-serif; border: 2px solid red; padding: 30px; border-radius: 20px; color: #1a1a1a;">
          <h1 style="color: red; margin-top: 0;">⚠️ Alerta Prioritaria del Chat</h1>
          <p style="font-size: 16px;">Un cliente ha solicitado asistencia urgente a través del Concierge.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p><strong>Cliente:</strong> ${name}</p>
          <p><strong>Problema:</strong> ${message}</p>
          <p><strong>Contacto:</strong> ${contact}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://wa.me/${contact?.replace(/\D/g, '')}" 
               style="background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
               REACCIONAR POR WHATSAPP
            </a>
          </div>
        </div>
      `;
    } else if (type === 'review_request') {
      const { customerName, customerEmail, propertyName } = req.body;
      emailOptions.to = customerEmail;
      emailOptions.subject = `¿Cómo estuvo su estancia en ${propertyName}? 🌊`;
      emailOptions.html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 60px 40px; text-align: center; color: #1a1a1a;">
          <img src="${currentLogo}" width="100" style="margin-bottom: 40px;" />
          <h1 style="font-size: 24px; margin-bottom: 24px;">Hola ${customerName}, gracias por elegirnos para sus días de descanso.</h1>
          <p style="font-size: 16px; line-height: 1.8; color: #666; margin-bottom: 40px;">
            Esperamos que haya disfrutado cada momento. Su opinión es vital para nosotros. ¿Podría regalarnos un minuto para compartir su experiencia?
          </p>
          <a href="${REVIEW_LINKS[propertyId] || '#'}" 
             style="background-color: #FF6633; color: #fff; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
             DEJAR RESEÑA EN GOOGLE
          </a>
          ${emailFooter}
        </div>
      `;
    } else {
      emailOptions.subject = `Nueva Solicitud de Reserva - ${customer?.name || 'Cliente'}`;
      emailOptions.html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${currentLogo}" width="100" style="margin-bottom: 20px;" />
            <h2 style="color: #FF5A5F; border-bottom: 2px solid #FF5A5F; padding-bottom: 10px;">Nueva Solicitud de Reserva</h2>
          </div>
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Detalles del Cliente</h3>
            <p><strong>Nombre:</strong> ${customer?.name}</p>
            <p><strong>Email:</strong> ${customer?.email}</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Detalles de la Estancia</h3>
            <p><strong>Villa:</strong> ${booking?.propertyName}</p>
            <p><strong>Check-in:</strong> ${booking?.checkIn}</p>
            <p><strong>Check-out:</strong> ${booking?.checkOut}</p>
          </div>
          ${emailFooter}
        </div>
      `;
    }

    const data = await resend.emails.send(emailOptions);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('RESEND ERROR:', error);
    return res.status(400).json({ error: 'Failed', detail: error.message });
  }
}
