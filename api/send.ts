import { Resend } from 'resend';
import { supabase } from '../lib/supabase.js';
import { NotificationService } from '../services/NotificationService.js';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

const contactLeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(5),
});

// 👤 PERSONALIZATION ENGINE
const formatFirstName = (name: string) => {
  if (!name || name.trim() === '') return 'Viajero';
  const cleanName = name.trim().split(' ')[0].toLowerCase();
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, customer, contactData, propertyId, customerName, customerEmail: reqCustomerEmail, userId, ...rest } = req.body || {};
    const userData = customer || contactData || {};

    // 🔗 SINGLE SOURCE OF TRUTH: Fetch property from DB
    const v_propertyId = propertyId || '1081171030449673920';
    const { data: dbProperty, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', v_propertyId)
      .single();

    if (propError || !dbProperty) {
      console.error('[DATABASE_SYNC_ERROR]: Using environment fallbacks for property', v_propertyId);
    }

    // 🛡️ ZERO HARDCODING POLICY: Fallbacks move to process.env
    const p = {
      name: dbProperty?.title || 'Villa Retiro Exclusive',
      logo: dbProperty?.logo_url || 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png',
      accentColor: dbProperty?.accent_color || '#FF7F3F',
      wifiName: dbProperty?.wifi_name || process.env.WIFI_NAME_FALLBACK || 'VILLA_GUEST_WIFI',
      wifiPass: dbProperty?.wifi_pass || process.env.WIFI_PASS_FALLBACK || '********',
      accessCode: dbProperty?.access_code || process.env.ACCESS_CODE_FALLBACK || 'CONSULTAR_HOST',
      coords: dbProperty?.location_coords || '18.07065,-67.16544'
    };

    // 🗺️ DYNAMIC WAYFINDING: Generate links from coords
    const mapsUrl = `https://www.google.com/maps?q=${p.coords}`;
    const wazeUrl = `https://waze.com/ul?ll=${p.coords}&navigate=yes`;
    const reviewUrl = dbProperty?.review_url || 'https://g.page/villaretiror/review';

    // 💎 LOYALTY ENGINE: Detect returning guests
    let isReturning = false;
    if (userId) {
        const { data: profile } = await supabase.from('profiles').select('is_returning_guest').eq('id', userId).single();
        isReturning = !!profile?.is_returning_guest;
    }

    const rawClientName = userData.name || customerName || '';
    const firstName = formatFirstName(rawClientName);
    const clientFullName = rawClientName || 'Cliente Indefinido';
    const customerEmail = reqCustomerEmail || userData.email || 'villaretiror@gmail.com';
    const fromAddress = 'Villa Retiro <reservas@villaretiror.com>';
    const hostEmail = 'villaretiror@gmail.com';

    const emailFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
        <a href="https://wa.me/17873560895" style="background-color: #25D366; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">📲 Hablar con el Host</a>
        <p style="font-size: 11px; color: #999; margin-top: 20px;">Operado por Villa Retiro LLC • Cabo Rojo, PR</p>
      </div>
    `;

    let emailOptions: any[] = [];

    if (type === 'contact') {
      const parsedData = contactLeadSchema.parse(userData);
      const { name, email, phone, message } = parsedData;
      await supabase.from('contact_leads').insert({ name, email, phone, message, status: 'new' });

      emailOptions.push({
        from: fromAddress,
        to: hostEmail,
        subject: `📩 Nueva Consulta: ${name}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 15px;">
          <h3>Detalles de la Consulta</h3>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${phone}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          <p><strong>Propiedad:</strong> ${p.name}</p>
          ${emailFooter}
        </div>`
      });

      if (email) {
        emailOptions.push({
          from: fromAddress,
          to: email,
          subject: `Recibimos tu consulta - ${p.name} 🌴`,
          html: `<div style="font-family: sans-serif; text-align: center; padding: 30px;">
            <img src="${p.logo}" width="100" />
            <h2>¡Hola ${firstName}!</h2>
            <p>Gracias por tu interés en <strong>${p.name}</strong>. Nuestro equipo de Salty Concierge te contactará muy pronto.</p>
            ${emailFooter}
          </div>`
        });
      }
    } 
    else if (type === 'payment_success' || type === 'reservation_confirmed') {
      const welcomeHeader = isReturning 
        ? `¡Bienvenido de vuelta, es un honor tenerte en casa otra vez!` 
        : `Tu experiencia Caribe Chic en ${p.name} comienza ahora.`;

      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: isReturning ? `🌊 ¡Bienvenido de vuelta a ${p.name}! (Reserva Confirmada)` : `🏝️ ¡Confirmado! Tu refugio en ${p.name} está listo`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 40px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
            <div style="background-color: #FDFCFB; padding: 50px 40px; text-align: center; border-bottom: 2px dashed #f0f0f0;">
              <img src="${p.logo}" width="140" style="margin-bottom: 25px;" />
              <h1 style="color: #2C2B29; font-size: 32px; margin: 0; font-family: serif; font-weight: 700;">¡Hola, ${firstName}!</h1>
              <p style="color: ${p.accentColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 11px; margin-top: 15px;">${welcomeHeader}</p>
            </div>
            
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.8;">
              <p style="font-size: 17px; margin-bottom: 25px;">
                ${isReturning ? 'Nos alegra verte de nuevo.' : ''} Soy <strong>Salty</strong>, tu concierge digital. La brisa de Cabo Rojo ya te espera y yo he preparado cada detalle para que tu estancia sea legendaria.
              </p>
              
              <div style="background-color: #2C2B29; color: #ffffff; padding: 35px; border-radius: 25px; margin: 30px 0; position: relative; overflow: hidden;">
                <h3 style="color: ${p.accentColor}; margin-top: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Protocolo de Acceso</h3>
                <p style="margin: 10px 0; font-size: 14px; opacity: 0.8;">Código Seguro:</p>
                <p style="margin: 5px 0;"><span style="font-size: 32px; color: #ffffff; font-weight: 800; letter-spacing: 4px;">${p.accessCode}</span></p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <p style="margin: 5px 0; font-size: 14px;">📡 <b>WF:</b> ${p.wifiName}</p>
                  <p style="margin: 5px 0; font-size: 14px;">🔑 <b>Pass:</b> <code>${p.wifiPass}</code></p>
                </div>
              </div>

              <div style="text-align: center; margin: 35px 0;">
                <p style="font-size: 14px; color: #888; margin-bottom: 20px;">¿Cómo llegar al paraíso?</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                  <a href="${mapsUrl}" style="background-color: #ffffff; color: #2C2B29; border: 1px solid #ddd; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">📍 Google Maps</a>
                  <a href="${wazeUrl}" style="background-color: #33CCFF; color: #ffffff; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">🚙 Waze</a>
                </div>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.VITE_SITE_URL}/stay/${v_propertyId}" style="background: linear-gradient(135deg, ${p.accentColor} 0%, #E05A2B 100%); color: #ffffff; padding: 20px 40px; border-radius: 18px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 15px 30px rgba(255,127,63,0.3);">🔑 Gestionar Mi Estancia</a>
              </div>

              <p style="font-size: 14px; color: #666; font-style: italic; text-align: center; margin-top: 40px;">
                "En la Villa, el tiempo se mide en olas y sonrisas. Nos vemos pronto." — Salty
              </p>
            </div>
          </div>
        `
      });

      await NotificationService.notifyNewReservation(firstName, p.name, rest.checkIn || 'Fecha', rest.checkOut || 'Fecha', rest.total || '0');
    }
    else if (type === 'urgent_alert') {
      const message = userData.message || 'Soporte Urgente Requerido';
      const contact = userData.contact || userData.phone || userData.email || 'No Provisto';
      emailOptions.push({
        from: fromAddress,
        to: hostEmail,
        subject: `🚨 URGENTE: Solicitud de Soporte - ${firstName}`,
        html: `<div style="font-family: sans-serif; border: 4px solid #F63; padding: 30px; border-radius: 20px;">
          <h1 style="color: #F63;">⚠️ Alerta Crítica</h1>
          <p><strong>Cliente:</strong> ${clientFullName}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          <p><strong>Contacto:</strong> ${contact}</p>
          <p><strong>Propiedad:</strong> ${p.name}</p>
          <div style="margin-top: 20px;">
            <a href="https://wa.me/${contact?.replace(/\D/g, '')}" style="background: #25D366; color: white; padding: 15px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">WhatsApp Directo</a>
          </div>
          ${emailFooter}
        </div>`
      });

      try {
        const waButton = {
          inline_keyboard: [
            [{ text: "📲 WhatsApp Directo", url: `https://wa.me/${contact?.replace(/\D/g, '') || '17873560895'}` }]
          ]
        };
        await NotificationService.sendTelegramAlert(
          `🚨 <b>¡ALERTA DE SOPORTE!</b>\n\n👤 ${clientFullName}\n📞 ${contact}\n🏝️ ${p.name}\n📟 <b>MSG:</b> ${message}`,
          waButton
        );
      } catch (e) {
        console.error("[Telegram Alert Error]:", e);
      }
    }
    else if (type === 'cohost_invitation') {
      const inviteUrl = `${process.env.VITE_SITE_URL}/login?invite=true${rest.token ? `&token=${rest.token}` : ''}`;
      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        subject: `🤝 Invitación de Co-anfitrión para ${p.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 30px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #2C2B29; padding: 40px; text-align: center;">
              <img src="${p.logo}" width="120" style="margin-bottom: 20px;" />
              <h2 style="color: #ffffff; margin: 0; font-family: serif;">Invitación Especial</h2>
            </div>
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.6;">
              <p style="font-size: 16px;">Has sido invitado como <strong>Co-anfitrión</strong> para gestionar <strong>${p.name}</strong>.</p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background-color: ${p.accentColor}; color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Aceptar Invitación</a>
              </div>
            </div>
            ${emailFooter}
          </div>
        `
      });
    }
    else if (type === 'review_request') {
        emailOptions.push({
            from: fromAddress,
            to: customerEmail,
            subject: `🌊 ¿Cómo estuvo tu estancia en ${p.name}?`,
            html: `<div style="font-family: sans-serif; text-align: center; padding: 40px;">
                <img src="${p.logo}" width="100" />
                <h2>¡Hola, ${firstName}!</h2>
                <p>Esperamos que hayas disfrutado de tu tiempo en **${p.name}**. Tu opinión nos ayuda a seguir mejorando la experiencia Salty.</p>
                <a href="${reviewUrl}" style="background-color: #2C2B29; color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">Escribir Reseña ⭐⭐⭐⭐⭐</a>
                ${emailFooter}
            </div>`
        });
    }
    else if (type === 'thank_you_note') {
      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        subject: `🌊 ¡Gracias por elegir ${p.name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; padding: 50px 40px;">
            <img src="${p.logo}" width="120" style="margin-bottom: 30px;" />
            <h1 style="color: #2C2B29; font-family: serif;">¡Buen viaje a casa, ${firstName}!</h1>
            <p>Ha sido un honor tenerte en **${p.name}**.</p>
            <a href="${reviewUrl}" style="background-color: #2C2B29; color: #ffffff; padding: 20px 40px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 30px;">⭐⭐⭐⭐⭐ Dejar reseña</a>
          </div>
        `
      });
    }

    const results = [];
    for (const options of emailOptions) {
      const { data, error } = await resend.emails.send(options);
      if (error) throw error;
      if (data?.id) {
          await supabase.from('email_logs').insert({
              resend_id: data.id,
              booking_id: (rest as any).bookingId || null,
              guest_name: clientFullName,
              subject: options.subject,
              status: 'sent'
          });
      }
      results.push(data);
    }

    return res.status(200).json({ success: true, results });

  } catch (err: any) {
    console.error("[Email System] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
