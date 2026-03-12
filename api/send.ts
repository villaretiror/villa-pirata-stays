import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer, booking, type, to, propertyTitle } = req.body;

  try {
    let emailOptions: any = {
      from: 'Villa Retiro <reservas@villaretiror.com>',
      to: to || ['villaretiror@gmail.com'],
    };

    if (type === 'invite') {
      emailOptions.subject = 'Has sido invitado como co-anfitrión en Villa Retiro';
      emailOptions.html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 16px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
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
               style="background-color: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              ACEPTAR INVITACIÓN
            </a>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #999; text-align: center;">
            Una vez aceptes, tendrás acceso completo para gestionar reservas, mantenimiento y calendarios de esta propiedad.
          </p>

          <div style="margin-top: 40px; pt-20px; border-top: 1px solid #f0f0f0; text-align: center;">
            <p style="font-size: 11px; color: #ccc; margin-top: 20px;">
              Este es un mensaje automático de villaretiror.com
            </p>
          </div>
        </div>
      `;
    } else if (type === 'contact') {
      const { name, email, phone, message } = req.body.contactData;

      // Email 1: For the Host (Notification)
      const hostEmailOptions = {
        from: 'Villa Retiro <reservas@villaretiror.com>',
        to: 'villaretiror@gmail.com',
        subject: `📩 Nueva Consulta de Cliente - Villa Retiro`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 24px; color: #1a1a1a;">
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="font-size: 40px;">📩</span>
              <h1 style="font-size: 20px; font-weight: 800; margin: 16px 0 8px;">Nueva Consulta Recibida</h1>
              <p style="color: #666; font-size: 14px;">Un cliente tiene una consulta sobre tu propiedad.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background-color: #fcfcfc; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
              <tr>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; width: 120px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Nombre</td>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Email</td>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; color: #004E64; font-weight: 600;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Teléfono</td>
                <td style="padding: 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px;">${phone || 'No provisto'}</td>
              </tr>
              <tr>
                <td style="padding: 20px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Mensaje</td>
                <td style="padding: 20px; font-size: 15px; line-height: 1.6;">${message}</td>
              </tr>
            </table>

            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f0f0f0;">
               <p style="font-size: 11px; color: #ccc;">Enviado desde el portal oficial villaretiror.com</p>
            </div>
          </div>
        `
      };

      // Email 2: For the Client (Confirmation)
      const clientEmailOptions = {
        from: 'Villa Retiro <reservas@villaretiror.com>',
        to: email,
        subject: `Recibimos tu consulta - Villa Retiro 🌴`,
        html: `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: auto; padding: 60px 40px; text-align: center; color: #1a1a1a;">
            <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; font-weight: bold; color: #FF6633; margin-bottom: 24px;">Confirmación de Contacto</p>
            <h1 style="font-size: 32px; margin-bottom: 24px; font-weight: 500;">Hola, ${name.split(' ')[0]}</h1>
            <p style="font-size: 16px; line-height: 1.8; color: #666; margin-bottom: 40px;">
              Gracias por interesarte en Villa Retiro & Pirata Stays. Hemos recibido tu mensaje y nuestro equipo lo revisará cuidadosamente para brindarte la mejor atención. <br><br>
              Te contactaremos en las próximas 24 horas.
            </p>
            <div style="width: 40px; h-1px; bg-color: #f0f0f0; margin: 0 auto 40px;"></div>
            <p style="font-size: 12px; font-style: italic; color: #999;">El paraíso te espera.</p>
          </div>
        `
      };

      await resend.emails.send(hostEmailOptions);
      await resend.emails.send(clientEmailOptions);
      return res.status(200).json({ success: true, message: 'Contact emails sent' });

    } else if (type === 'payment_success') {
      const { customerName, customerEmail, propertyName, checkIn, checkOut, accessCode, wifiName, wifiPass } = req.body;

      emailOptions.to = customerEmail;
      emailOptions.subject = `🏝️ ¡Todo listo! Tu Guía de Acceso para ${propertyName}`;
      emailOptions.html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 24px; color: #1a1a1a; background-color: #fff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 16px;">¡Bienvenido al Paraíso, ${customerName}!</h1>
            <p style="color: #666; font-size: 16px;">Tu reserva en <strong>${propertyName}</strong> está confirmada y pagada.</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
            <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 16px;">🔑 Instrucciones de Acceso</h2>
            <div style="background-color: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Código Lockbox:</strong> <span style="font-size: 18px; color: #FF6633; font-weight: 800;">${accessCode || 'XXXX'}</span></p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">(Use este código para retirar la llave física en la entrada)</p>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
            <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 16px;">📶 Conectividad Premium</h2>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Red:</strong> ${wifiName || 'VillaRetiro_Starlink'}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Clave:</strong> ${wifiPass || 'Tropical2024!'}</p>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              <strong>Check-in:</strong> ${checkIn} (15:00)<br>
              <strong>Check-out:</strong> ${checkOut} (11:00)
            </p>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f0f0f0;">
               <p style="font-size: 12px; color: #999;">Si necesita asistencia inmediata, escríbanos por WhatsApp al +1 787-356-0895.</p>
          </div>
        </div>
      `;
    } else {
      // Default: Booking Notification
      emailOptions.subject = `Nueva Solicitud de Reserva - ${customer?.name || 'Cliente'}`;
      emailOptions.html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #FF5A5F; border-bottom: 2px solid #FF5A5F; padding-bottom: 10px;">Nueva Solicitud de Reserva</h2>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Detalles del Cliente</h3>
            <p><strong>Nombre:</strong> ${customer?.name}</p>
            <p><strong>Email:</strong> ${customer?.email}</p>
            <p><strong>Teléfono:</strong> ${customer?.phone || 'No provisto'}</p>
          </div>

          <div style="margin-bottom: 20px; background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Detalles de la Estancia</h3>
            <p><strong>Villa:</strong> ${booking?.propertyName}</p>
            <p><strong>Check-in:</strong> ${booking?.checkIn}</p>
            <p><strong>Check-out:</strong> ${booking?.checkOut}</p>
            <p><strong>Huéspedes:</strong> ${booking?.guests}</p>
            <p><strong>Inversión Total:</strong> $${booking?.total}</p>
            <p><strong>Método de Pago:</strong> ${booking?.method}</p>
          </div>

          <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; pt-10px;">
            Este enlace fue generado automáticamente desde villaretiror.com
          </p>
        </div>
      `;
    }

    const data = await resend.emails.send(emailOptions);
    console.log('Email sent successfully:', data);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('RESEND ERROR:', error);
    return res.status(400).json({ error: 'Failed to send email', detail: error.message });
  }
}
