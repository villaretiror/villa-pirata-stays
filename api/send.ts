import { Resend } from 'resend';
import { supabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// 👤 PERSONALIZATION ENGINE
const formatFirstName = (name: string) => {
  if (!name || name.trim() === '') return 'Viajero';
  const cleanName = name.trim().split(' ')[0].toLowerCase();
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, customer, contactData, propertyId, customerName, customerEmail: reqCustomerEmail, ...rest } = req.body || {};
    const userData = customer || contactData || {};

    // 🔗 SINGLE SOURCE OF TRUTH: Fetch property from DB
    const v_propertyId = propertyId || '1081171030449673920';
    const { data: dbProperty, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', v_propertyId)
      .single();

    if (propError || !dbProperty) {
      console.error('[DATABASE_SYNC_ERROR]: Using fallbacks for property', v_propertyId, propError?.message);
    }

    // 🏢 Data Merge (DB + Defaults)
    const p = {
      name: dbProperty?.title || (v_propertyId === '42839458' ? 'Pirata Family House' : 'Villa Retiro R'),
      logo: dbProperty?.logo_url || 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png',
      accentColor: dbProperty?.accent_color || '#FF7F3F',
      wifiName: dbProperty?.wifi_name || 'VillaRetiro_Starlink_Premium',
      wifiPass: dbProperty?.wifi_pass || 'Tropical2024!',
      accessCode: dbProperty?.access_code || '4829 #',
      mapsUrl: dbProperty?.google_maps_url || 'https://share.google/LBxZV0NwKZps4rliR',
      wazeUrl: dbProperty?.waze_url || 'https://waze.com/ul?q=Carr%20307%20Km%206.2%2C%20Interior%2C%20Cabo%20Rojo%2C%2000623',
      reviewUrl: dbProperty?.review_url || 'https://g.page/r/CUERPA_RETIRO_PLACEHOLDER'
    };

    const currentLogo = p.logo;
    const rawClientName = userData.name || customerName || '';
    const firstName = formatFirstName(rawClientName);
    const clientFullName = rawClientName || 'Cliente Indefinido';
    const customerEmail = reqCustomerEmail || userData.email || 'villaretiror@gmail.com';

    console.log(`[Email System] Type: ${type} | Client: ${firstName} | Property: ${p.name}`);

    const fromAddress = 'Villa Retiro <reservas@villaretiror.com>';
    const hostEmail = 'villaretiror@gmail.com';

    const emailFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
        <a href="https://wa.me/17873560895" style="background-color: #25D366; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">📲 Hablar con el Host</a>
        <p style="font-size: 11px; color: #999; margin-top: 20px;">Mensaje de villaretiror.com</p>
      </div>
    `;

    let emailOptions: any[] = [];

    if (type === 'contact') {
      const { name, email, phone, message } = userData;
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
          <p><strong>Propiedad de Interés:</strong> ${p.name}</p>
          ${emailFooter}
        </div>`
      });
      if (email) {
        emailOptions.push({
          from: fromAddress,
          to: email,
          subject: `Recibimos tu consulta - ${p.name} 🌴`,
          html: `<div style="font-family: sans-serif; text-align: center; padding: 30px;">
            <img src="${currentLogo}" width="100" />
            <h2>¡Hola ${firstName}!</h2>
            <p>Gracias por tu interés en ${p.name}. Te contactaremos pronto.</p>
            ${emailFooter}
          </div>`
        });
      }
    } else if (type === 'urgent_alert' || type === 'chat_notification') {
      const message = userData.message || 'Soporte Urgente';
      const contact = userData.contact || userData.phone || userData.email || 'No Provisto';
      emailOptions.push({
        from: fromAddress,
        to: hostEmail,
        subject: `🚨 ${type === 'urgent_alert' ? 'URGENTE' : 'Notificación'}: Soporte Chat - ${firstName}`,
        html: `<div style="font-family: sans-serif; border: 4px solid #F63; padding: 30px; border-radius: 20px;">
          <h1 style="color: #F63;">⚠️ Solicitud de Soporte</h1>
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
    } else if (type === 'payment_success' || type === 'reservation_confirmed') {
      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        bcc: hostEmail,
        subject: `🏝️ ¡Confirmado! Tu refugio en ${p.name} está listo`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 40px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
            <div style="background-color: #FDFCFB; padding: 50px 40px; text-align: center; border-bottom: 2px dashed #f0f0f0;">
              <img src="${currentLogo}" width="140" style="margin-bottom: 25px;" />
              <h1 style="color: #2C2B29; font-size: 32px; margin: 0; font-family: serif; font-weight: 700;">¡Hola, ${firstName}!</h1>
              <p style="color: ${p.accentColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 11px; margin-top: 15px;">Tu experiencia Caribe Chic en ${p.name} comienza ahora</p>
            </div>
            
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.8;">
              <p style="font-size: 17px; margin-bottom: 25px;">
                Soy <strong>Salty</strong>, tu concierge digital. La brisa de Cabo Rojo ya te espera y yo he preparado cada detalle para que tu estancia en <strong>${p.name}</strong> sea legendaria.
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
                  <a href="${p.mapsUrl}" style="background-color: #ffffff; color: #2C2B29; border: 1px solid #ddd; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">📍 Google Maps</a>
                  <a href="${p.wazeUrl}" style="background-color: #33CCFF; color: #ffffff; padding: 15px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px; flex: 1;">🚙 Waze</a>
                </div>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="https://villaretiror.com/stay/${v_propertyId}" style="background: linear-gradient(135deg, ${p.accentColor} 0%, #E05A2B 100%); color: #ffffff; padding: 20px 40px; border-radius: 18px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 15px 30px rgba(255,127,63,0.3);">🔑 Gestionar Mi Estancia</a>
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
    } else if (type === 'cohost_invitation') {
      const inviteUrl = `${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/login?invite=true${rest.token ? `&token=${rest.token}` : ''}`;
      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        subject: `🤝 Invitación para ser Co-anfitrión en ${p.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 30px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #2C2B29; padding: 40px; text-align: center;">
              <img src="${currentLogo}" width="120" style="margin-bottom: 20px;" />
              <h2 style="color: #ffffff; margin: 0; font-family: serif;">Invitación Especial</h2>
            </div>
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.6;">
              <p style="font-size: 16px;">Has sido invitado como <strong>Co-anfitrión</strong> para gestionar la propiedad <strong>${p.name}</strong>.</p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background-color: ${p.accentColor}; color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Aceptar Invitación y Acceder</a>
              </div>
            </div>
            ${emailFooter}
          </div>
        `
      });
    } else if (type === 'thank_you_note') {
      emailOptions.push({
        from: fromAddress,
        to: customerEmail,
        subject: `🌊 ¡Gracias por ser parte de la historia de ${p.name}!`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 40px; overflow: hidden; background-color: #ffffff;">
            <div style="padding: 50px 40px; text-align: center; background-color: #FDFCFB;">
              <img src="${currentLogo}" width="120" style="margin-bottom: 30px;" />
              <h1 style="color: #2C2B29; font-size: 28px; margin: 0; font-family: serif;">¡Buen viaje a casa, ${firstName}!</h1>
            </div>
            <div style="padding: 40px; color: #4A4A4A; line-height: 1.8; text-align: left;">
              <p style="font-size: 16px;">Ha sido un honor tenerte en **${p.name}**.</p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${p.reviewUrl}" style="background-color: #2C2B29; color: #ffffff; padding: 20px 40px; border-radius: 15px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">⭐⭐⭐⭐⭐ Dejar reseña en Google</a>
              </div>
            </div>
          </div>
        `
      });
    }

    const results = [];
    for (const options of emailOptions) {
      const { data, error } = await resend.emails.send(options);
      if (error) throw error;
      results.push(data);
    }

    return res.status(200).json({ success: true, results });

  } catch (err: any) {
    console.error("[Email System] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
