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
