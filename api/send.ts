import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { z } from 'zod';
import { render } from '@react-email/render';
import React from 'react';
// 🛰️ INLINED NOTIFICATION ENGINE (Bypasses local file resolution issues)
const notifyInviteInlined = async (email: string, property: string) => {
    const token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const message = `🟡 <b>Nueva Invitación de Co-host</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Email:</b> ${email}\n<b>Propiedad:</b> ${property}\n📬 <i>Estatus: Pendiente de aceptación.</i>`;
    
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (e) {}
};

// Import Templates (Co-located for Vercel Serverless reliability)
import { ReservationConfirmedTemplate } from './templates/ReservationConfirmedTemplate';
import { ContactConfirmationTemplate } from './templates/ContactConfirmationTemplate';
import { LeadRecoveryTemplate } from './templates/LeadRecoveryTemplate';
import { CohostInvitationTemplate } from './templates/CohostInvitationTemplate';

// 🛡️ INITIALIZE SECURE SERVER-SIDE SUPABASE
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);

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

  // 🛡️ SECURITY: Verify request source
  const authHeader = req.headers['authorization'];
  const isLocal = req.headers['host']?.includes('localhost');
  const sharedSecret = process.env.API_SECRET_KEY || process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

  let isAuthorized = isLocal;
  let triggerSource = 'api_direct';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === sharedSecret) {
      isAuthorized = true;
      triggerSource = 'db_webhook';
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role === 'host' || user.email === 'villaretiror@gmail.com') {
            isAuthorized = true;
            triggerSource = `manual_host_${user.id}`;
          }
        }
      } catch (e) {}
    }
  }

  if (!isAuthorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      type, email, customer, contactData, propertyId, customerName, 
      customerEmail: reqCustomerEmail, userId, ...rest 
    } = req.body || {};
    
    const userData = customer || contactData || {};
    const v_propertyId = propertyId || '1081171030449673920';

    // 🔗 DYNAMIC DATA & BRANDING ENGINE
    const { data: dbProperty } = await supabase
      .from('properties')
      .select('*')
      .eq('id', v_propertyId)
      .single();

    // Mapping of Hardcoded Brand Assets (since they aren't in DB columns yet)
    const BRAND_MAP: Record<string, any> = {
      '1081171030449673920': {
        logo: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png',
        accent: '#FF7F3F',
        name: 'Villa Retiro R.'
      },
      '42839458': {
        logo: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png',
        accent: '#004E64',
        name: 'Pirata Family House'
      }
    };

    const isPirata = v_propertyId === '42839458' || dbProperty?.title?.includes('Pirata');
    const brand = BRAND_MAP[v_propertyId] || (isPirata ? BRAND_MAP['42839458'] : BRAND_MAP['1081171030449673920']);

    // Build the finalized Property Object
    const p = {
      name: dbProperty?.title || brand.name,
      logo: brand.logo,
      accentColor: brand.accent,
      wifiName: 'Wifivacacional',
      wifiPass: 'Wifivacacional',
      accessCode: dbProperty?.access_code || 'CONSULTAR_HOST',
      coords: dbProperty?.location_coords || '18.07065,-67.16544',
      guidebookUrl: dbProperty?.guidebook_url || null,
      heroImage: dbProperty?.images && dbProperty.images.length > 0 ? dbProperty.images[0] : null
    };

    // DEBUG: Ensure we are seeing the real values
    console.log(`[Email Engine] Triggering ${type} for Property: ${p.name} | Code: ${p.accessCode} | ID: ${v_propertyId}`);

    const mapsUrl = dbProperty?.google_maps_url || `https://www.google.com/maps?q=${p.coords}`;
    const wazeUrl = dbProperty?.waze_url || `https://waze.com/ul?ll=${p.coords}&navigate=yes`;
    const stayPortalUrl = `${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/stay/${v_propertyId}`;

    const firstName = formatFirstName(userData.name || customerName || '');
    const clientFullName = userData.name || customerName || 'Cliente Indefinido';
    const customerEmail = reqCustomerEmail || email || userData.email || 'villaretiror@gmail.com';
    
    const fromAddress = isPirata ? 'Pirata Stays <reservas@villaretiror.com>' : 'Villa Retiro <reservas@villaretiror.com>';
    const hostEmail = 'villaretiror@gmail.com';

    let emailOptions: any[] = [];

    // --- ROUTER LOGIC ---

    switch (type) {
      case 'contact': {
        const parsedData = contactLeadSchema.parse(userData);
        const { name, email, phone, message } = parsedData;
        
        // Skip insertion to avoid infinite loop with DB Trigger

        // Host Notification
        emailOptions.push({
          from: fromAddress,
          to: hostEmail,
          subject: `📩 Nueva Consulta: ${name}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h3>Detalles de la Consulta</h3>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone}</p>
            <p><strong>Mensaje:</strong> ${message}</p>
            <p><strong>Propiedad:</strong> ${p.name}</p>
          </div>`
        });

        // Guest Confirmation (React Template)
        if (email) {
          const html = await render(React.createElement(ContactConfirmationTemplate, {
            firstName,
            propertyName: p.name,
            logoUrl: p.logo,
            accentColor: p.accentColor
          }));
          
          emailOptions.push({ from: fromAddress, to: email, subject: `Recibimos tu consulta - ${p.name} 🌴`, html });
        }
        break;
      }

      case 'payment_success':
      case 'reservation_confirmed': {
        const checkInDate = rest.checkIn ? new Date(rest.checkIn) : null;
        const now = new Date();
        const isWithin24h = checkInDate && (checkInDate.getTime() - now.getTime()) <= (24 * 3600 * 1000);
        
        let isReturning = false;
        if (userId) {
            const { data: profile } = await supabase.from('profiles').select('is_returning_guest').eq('id', userId).single();
            isReturning = !!profile?.is_returning_guest;
        }

        const html = await render(React.createElement(ReservationConfirmedTemplate, {
          firstName,
          propertyName: p.name,
          logoUrl: p.logo,
          accentColor: p.accentColor,
          isReturning,
          checkIn: rest.checkIn || 'Confirmado',
          checkOut: rest.checkOut || 'Confirmado',
          accessCode: p.accessCode,
          wifiName: p.wifiName,
          wifiPass: p.wifiPass,
          mapsUrl,
          wazeUrl,
          stayPortalUrl,
          isWithin24h: !!isWithin24h,
          guidebookUrl: p.guidebookUrl,
          propertyImage: p.heroImage
        }));

        emailOptions.push({
          from: fromAddress,
          to: customerEmail,
          bcc: hostEmail,
          subject: isReturning ? `🌊 ¡Bienvenido de vuelta a ${p.name}! (Reserva Confirmada)` : `🏝️ ¡Confirmado! Tu refugio en ${p.name} está listo`,
          html
        });

        try {
          await notifyInviteInlined(firstName, `Reserva en ${p.name}`);
        } catch (e) {}
        break;
      }

      case 'lead_recovery': {
        const html = await render(React.createElement(LeadRecoveryTemplate, {
          firstName,
          propertyName: p.name,
          logoUrl: p.logo,
          accentColor: p.accentColor,
          recoveryUrl: `${process.env.VITE_SITE_URL}/property/${v_propertyId}`
        }));

        emailOptions.push({ 
          from: fromAddress, 
          to: customerEmail, 
          subject: `🏝️ Solo falta un paso para tu refugio en ${p.name}`, 
          html 
        });
        break;
      }

      case 'cohost_invitation': {
        const siteUrl = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';
        const inviteToken = rest.token || userData.token || '';
        const invitePropId = v_propertyId || '';
        // Build a direct invite URL: /login?invite=true&token=TOKEN&property=PROPERTY_ID
        const inviteUrl = `${siteUrl}/login?invite=true${inviteToken ? `&token=${inviteToken}` : ''}${invitePropId ? `&property=${invitePropId}` : ''}`;
        console.log(`[Cohost Invitation] Sending to: ${customerEmail} | Prop: ${invitePropId} | URL: ${inviteUrl}`);
        let html;
        try {
          html = await render(React.createElement(CohostInvitationTemplate, {
            propertyName: p.name,
            logoUrl: p.logo,
            accentColor: p.accentColor,
            inviteUrl
          }));
        } catch (renderErr: any) {
           console.error("[Email System] Render failed for CohostInvitationTemplate:", renderErr.message);
           return res.status(500).json({ error: `Fallo al renderizar plantilla: ${renderErr.message}`, phase: 'template_render_crash' });
        }

        emailOptions.push({ 
          from: fromAddress, 
          to: customerEmail, 
          subject: `🤝 Invitación de Co-anfitrión para ${p.name}`, 
          html 
        });

        try {
          await notifyInviteInlined(customerEmail, p.name);
        } catch (e) {}
        break;
      }

      case 'urgent_alert': {
        const message = userData.message || 'Soporte Urgente Requerido';
        const contact = userData.contact || userData.phone || userData.email || 'No Provisto';
        
        emailOptions.push({
          from: fromAddress,
          to: hostEmail,
          subject: `🚨 URGENTE: Solicitud de Soporte - ${firstName}`,
          html: `<div style="font-family: sans-serif; border: 4px solid #F63; padding: 20px;">
            <h1 style="color: #F63;">⚠️ Alerta Crítica</h1>
            <p><strong>Cliente:</strong> ${clientFullName}</p>
            <p><strong>Mensaje:</strong> ${message}</p>
            <p><strong>Contacto:</strong> ${contact}</p>
          </div>`
        });

        try {
          await notifyInviteInlined(clientFullName, `URGENTE: ${message}`);
        } catch (e) {}
        break;
      }
    }

    // --- BATCH SEND & LOG ---
    const results = [];
    for (const options of emailOptions) {
      const { data, error } = await resend.emails.send({
        ...options,
        reply_to: 'reservas@villaretiror.com'
      });
      
      if (error) throw error;
      
      if (data?.id) {
        await supabase.from('email_logs').insert({
          resend_id: data.id,
          booking_id: (rest as any).bookingId || null,
          guest_name: clientFullName,
          guest_email: options.to,
          subject: options.subject,
          status: 'sent',
          metadata: {
            source: triggerSource,
            property_id: (rest as any).propertyId || null
          }
        });
      }
      results.push(data);
    }

    return res.status(200).json({ 
      success: true, 
      results,
      debug: {
          to: customerEmail,
          from: fromAddress,
          source: triggerSource,
          property: p.name
      }
    });

  } catch (err: any) {
    console.error("[Email System] CRITICAL ERROR:", err);
    
    // Attempt to extract as much info as possible
    const errorDetail = {
        message: err.message || 'Error desconocido',
        stack: err.stack,
        type: err.name || 'Error',
        resendError: err.response?.data || err.errors || null
    };

    return res.status(500).json({ 
        error: errorDetail.message,
        details: errorDetail,
        phase: 'execution_catastrophe'
    });
  }
}
