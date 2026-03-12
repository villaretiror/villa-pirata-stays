import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Versión Modernizada para Vercel Functions (Web Standard)
export default async function handler(req: Request) {
  // Manejo de CORS Preflight (Opcional pero recomendado para evitar 405)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // 1. Validaciones Críticas
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email API] CRITICAL: RESEND_API_KEY missing");
    return new Response(JSON.stringify({ error: 'Server configuration incomplete' }), { status: 500 });
  }

  try {
    // Parseo manual del cuerpo (Web standard)
    const body = await req.json();
    const { type, to, customer, contactData, booking, propertyId } = body;
    const userData = customer || contactData || {};

    // Log de Auditoría Master (Usa headers.get)
    console.log(`[Email API] Event: ${type} | UserAgent: ${req.headers.get('user-agent')}`);
    console.log(`[Email API] Full Payload:`, JSON.stringify(body, null, 2));

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

    // 📩 CASO: ALERTA URGENTE CHAT
    else if (type === 'urgent_alert') {
      const name = userData.name || 'Cliente';
      const message = userData.message || 'SoporteUrgent';
      const contact = userData.contact || userData.phone || userData.email || 'No Provisto';
      emails.push({
        from: fromAddress,
        to: hostEmail,
        subject: `🚨 URGENTE: Soporte Chat - ${name}`,
        html: `<div style="font-family: sans-serif; border: 4px solid red; padding: 30px; border-radius: 20px;">
          <h1 style="color: red;">⚠️ Alerta Prioritaria</h1>
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

    // 📩 CASO: PAGO EXITOSO
    else if (type === 'payment_success') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = body;
      emails.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: `🏝️ Guía de Acceso: ${propertyName}`,
        html: `<div style="font-family: sans-serif; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
          <img src="${currentLogo}" width="120" />
          <h1>¡Bienvenido, ${customerName}!</h1>
          <p>Reserva confirmada en <strong>${propertyName}</strong>.</p>
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <p><strong>Lockbox:</strong> <span style="font-size: 20px; color: #F63; font-weight: bold;">${accessCode || 'XXXX'}</span></p>
            <p><strong>WiFi:</strong> ${wifiName} / ${wifiPass}</p>
          </div>
          <p><strong>Check-in:</strong> ${checkIn} | <strong>Check-out:</strong> ${checkOut}</p>
          ${emailFooter}
        </div>`
      });
    }

    // 🚀 EJECUCIÓN CON RACE (Timeout de 8s para evitar fallos de Vercel)
    const sendPromises = emails.map(e => resendClient.emails.send(e));

    try {
      await Promise.race([
        Promise.all(sendPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email Timeout')), 8000))
      ]);
    } catch (sendError: any) {
      console.error("[Email API] Partial Failure or Timeout:", sendError.message);
      // Continuamos para devolver 200 y evitar que Supabase reintente infinitamente
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error("[Email API] FATAL ERROR:", err.message);
    // IMPORTANTE: Devolvemos 200 para que Supabase no reintente y sature la cola
    return new Response(JSON.stringify({ error: err.message, status: 'acknowledged' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
