import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer, booking } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'Reservas Villa Retiro <reservas@villaretiror.com>',
      to: ['villaretiror@gmail.com'],
      subject: `Nueva Solicitud de Reserva - ${customer.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #FF5A5F; border-bottom: 2px solid #FF5A5F; padding-bottom: 10px;">Nueva Solicitud de Reserva</h2>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Detalles del Cliente</h3>
            <p><strong>Nombre:</strong> ${customer.name}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Teléfono:</strong> ${customer.phone || 'No provisto'}</p>
          </div>

          <div style="margin-bottom: 20px; background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Detalles de la Estancia</h3>
            <p><strong>Villa:</strong> ${booking.propertyName}</p>
            <p><strong>Check-in:</strong> ${booking.checkIn}</p>
            <p><strong>Check-out:</strong> ${booking.checkOut}</p>
            <p><strong>Huéspedes:</strong> ${booking.guests}</p>
            <p><strong>Inversión Total:</strong> $${booking.total}</p>
            <p><strong>Método de Pago:</strong> ${booking.method}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Mensaje / Notas</h3>
            <p style="font-style: italic; color: #666;">${booking.message || 'Sin mensaje adicional.'}</p>
          </div>

          <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; pt-10px;">
            Este enlace fue generado automáticamente desde villaretiror.com
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Email failed to send:', error);
    return res.status(400).json(error);
  }
}
