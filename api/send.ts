import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validaciones Iniciales
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email API] MISSING API KEY");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { type, to, customer, contactData, booking, propertyId, propertyTitle } = req.body;
  const userData = customer || contactData || {};

  console.log(`[Email API] Event: ${type} | To: ${to || 'Host'} | Origin: ${req.headers['user-agent']}`);
  console.log(`[Email API] Payload Snapshot:`, JSON.stringify(req.body, null, 2));

  // 2. Configuración de Marca (Logos/Villas)
  const LOGOS: Record<string, string> = {
    '1081171030449673920': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/villa_retiro_logo.png',
    '42839458': 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/logos/pirata_family_logo.png'
  };

  const REVIEW_LINKS: Record<string, string> = {
    '1081171030449673920': 'https://g.page/r/villa-retiro-review',
    '42839458': 'https://g.page/r/pirata-family-review'
  };

  const currentLogo = LOGOS[propertyId] || LOGOS['1081171030449673920'];
  const fromAddress = 'Villa Retiro <reservas@villaretiror.com>';
  const hostEmail = 'villaretiror@gmail.com';

  const emailFooter = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
      <a href="https://wa.me/17873560895" style="background-color: #25D366; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">📲 WhatsApp Host</a>
      <p style="font-size: 11px; color: #ccc; margin-top: 20px;">Mensaje automático de villaretiror.com</p>
    </div>
  `;

  try {
    let emailsToSend = [];

    // 📩 CASO: CONSULTA DE CONTACTO (Leads)
    if (type === 'contact') {
      const { name, email, phone, message } = userData;

      // Email para el Host
      emailsToSend.push({
        from: fromAddress,
        to: hostEmail,
        subject: `📩 Nueva Consulta: ${name}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2>Nueva Consulta de Cliente</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${phone || 'N/A'}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          ${emailFooter}
        </div>`
      });

      // Email para el Cliente (Confirmación)
      if (email) {
        emailsToSend.push({
          from: fromAddress,
          to: email,
          subject: 'Recibimos tu consulta - Villa Retiro 🌴',
          html: `<div style="font-family: sans-serif; padding: 20px; text-align: center;">
            <img src="${currentLogo}" width="100" />
            <h1>Hola ${name.split(' ')[0]},</h1>
            <p>Gracias por contactarnos. Te responderemos en menos de 24 horas.</p>
            ${emailFooter}
          </div>`
        });
      }
    }

    // 📩 CASO: ALERTA URGENTE (Chat)
    else if (type === 'urgent_alert') {
      const name = userData.name || 'Cliente';
      const message = userData.message || 'Sin mensaje';
      const contact = userData.contact || userData.phone || userData.email || 'No provisto';

      emailsToSend.push({
        from: fromAddress,
        to: hostEmail,
        subject: `🚨 URGENTE: Soporte Chat - ${name}`,
        html: `<div style="font-family: sans-serif; border: 3px solid red; padding: 30px; border-radius: 20px;">
          <h1 style="color: red;">⚠️ Alerta de Soporte Urgente</h1>
          <p><strong>Cliente:</strong> ${name}</p>
          <p><strong>Problema:</strong> ${message}</p>
          <p><strong>Contacto:</strong> ${contact}</p>
          <div style="margin-top: 20px;">
            <a href="https://wa.me/${contact.replace(/\D/g, '')}" style="background: #25D366; color: white; padding: 15px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">WhatsApp Directo</a>
          </div>
          ${emailFooter}
        </div>`
      });
    }

    // 📩 CASO: PAGO EXITOSO
    else if (type === 'payment_success') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = req.body;
      emailsToSend.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: `🏝️ Guía de Acceso: ${propertyName}`,
        html: `<div style="font-family: sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 20px;">
          <img src="${currentLogo}" width="120" />
          <h1>¡Bienvenido, ${customerName}!</h1>
          <p>Confirmamos tu reserva en <strong>${propertyName}</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Código Lockbox:</strong> <span style="font-size: 20px; color: #F63;">${accessCode || 'XXXX'}</span></p>
            <p><strong>WiFi:</strong> ${wifiName} / ${wifiPass}</p>
          </div>
          <p><strong>Check-in:</strong> ${checkIn} | <strong>Check-out:</strong> ${checkOut}</p>
          ${emailFooter}
        </div>`
      });
    }

    // 📩 OTROS CASOS (Reserva, etc)
    else {
      const name = userData.name || booking?.propertyName || 'Cliente';
      emailsToSend.push({
        from: fromAddress,
        to: hostEmail,
        subject: `Nueva Solicitud: ${name}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #FF5A5F;">Nueva Solicitud de Reserva</h2>
          <p><strong>Cliente:</strong> ${userData.name || booking?.customerName}</p>
          <p><strong>Villa:</strong> ${booking?.propertyName || propertyTitle}</p>
          <p><strong>Fechas:</strong> ${booking?.checkIn} - ${booking?.checkOut}</p>
          ${emailFooter}
        </div>`
      });
    }

    // 🚀 ENVÍO MASIVO / SECUENCIAL
    const results = [];
    for (const emailData of emailsToSend) {
      const { data, error } = await resend.emails.send(emailData);
      if (error) {
        console.error("[Resend Error]", error);
        results.push({ success: false, error });
      } else {
        results.push({ success: true, data });
      }
    }

    const allSuccessful = results.every(r => r.success);
    return res.status(allSuccessful ? 200 : 400).json({ results });

  } catch (error: any) {
    console.error('[Fatal API Error]', error);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
}
