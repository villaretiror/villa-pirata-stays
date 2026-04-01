import { Resend } from 'resend';
import { supabase } from '../src/lib/supabase.js';
import { NotificationService } from '../src/services/NotificationService.js';
import { z } from 'zod';
import { render } from '@react-email/render';
import React from 'react';

// Import Templates
import { ReservationConfirmedTemplate } from '../src/components/emails/ReservationConfirmedTemplate.js';
import { ContactConfirmationTemplate } from '../src/components/emails/ContactConfirmationTemplate.js';
import { LeadRecoveryTemplate } from '../src/components/emails/LeadRecoveryTemplate.js';
import { CohostInvitationTemplate } from '../src/components/emails/CohostInvitationTemplate.js';

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

  // 🛡️ SECURITY: Verify request source (Supabase Internal or Admin Local)
  const authHeader = req.headers['authorization'];
  const isLocal = req.headers['host']?.includes('localhost');
  const sharedSecret = process.env.API_SECRET_KEY || process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

  let isAuthorized = isLocal;
  let triggerSource = 'api_direct';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Check if it's the Shared Secret (for DB Webhooks)
    if (token === sharedSecret) {
      isAuthorized = true;
      triggerSource = 'db_webhook';
    } else {
      // Check if it's a valid Supabase JWT (for Manual Host sending)
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        // Verify user is an admin or host
        if (user && user.email === 'villaretiror@gmail.com') { // Hardcoded per rule 6
          isAuthorized = true;
          triggerSource = `manual_host_${user.id}`;
        }
      } catch (e) {
        console.error('[AUTH] Failed to verify JWT:', e);
      }
    }
  }

  if (!isAuthorized) {
    console.warn('[SECURITY] Unauthorized email trigger attempt | host:', req.headers['host'], '| hasAuth:', !!authHeader);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      type, 
      email, 
      customer, 
      contactData, 
      propertyId, 
      customerName, 
      customerEmail: reqCustomerEmail, 
      userId, 
      ...rest 
    } = req.body || {};
    
    const userData = customer || contactData || {};

    // 🔗 SINGLE SOURCE OF TRUTH: Fetch property from DB
    const v_propertyId = propertyId || '1081171030449673920';
    const { data: dbProperty, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', v_propertyId)
      .single();

    if (propError || !dbProperty) {
      console.error('[DATABASE_SYNC_ERROR]: Using fallbacks for property', v_propertyId);
    }

    const p = {
      name: dbProperty?.title || 'Villa Retiro Exclusive',
      logo: dbProperty?.logo_url || 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png',
      accentColor: dbProperty?.accent_color || '#FF7F3F',
      wifiName: dbProperty?.wifi_name || 'VILLA_GUEST_WIFI',
      wifiPass: dbProperty?.wifi_pass || '********',
      accessCode: dbProperty?.access_code || 'CONSULTAR_HOST',
      coords: dbProperty?.location_coords || '18.07065,-67.16544',
      guidebookUrl: dbProperty?.guidebook_url || null
    };

    const mapsUrl = `https://www.google.com/maps?q=${p.coords}`;
    const wazeUrl = `https://waze.com/ul?ll=${p.coords}&navigate=yes`;
    const reviewUrl = dbProperty?.review_url || 'https://g.page/villaretiror/review';
    const stayPortalUrl = `${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/stay/${v_propertyId}`;

    const rawClientName = userData.name || customerName || '';
    const firstName = formatFirstName(rawClientName);
    const clientFullName = rawClientName || 'Cliente Indefinido';
    const customerEmail = reqCustomerEmail || email || userData.email || 'villaretiror@gmail.com';
    
    const fromAddress = 'Villa Retiro <reservas@villaretiror.com>';
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
          guidebookUrl: p.guidebookUrl
        }));

        emailOptions.push({
          from: fromAddress,
          to: customerEmail,
          bcc: hostEmail,
          subject: isReturning ? `🌊 ¡Bienvenido de vuelta a ${p.name}! (Reserva Confirmada)` : `🏝️ ¡Confirmado! Tu refugio en ${p.name} está listo`,
          html
        });

        await NotificationService.notifyNewReservation(
          (rest as any).bookingId || 'ID_N/A',
          firstName, p.name, rest.checkIn || 'Fecha', rest.checkOut || 'Fecha', rest.total || '0', 'Web Directa'
        );
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
        const inviteToken = rest.token || '';
        const invitePropId = propertyId || '';
        // Build a direct invite URL: /login?invite=true&token=TOKEN&property=PROPERTY_ID
        const inviteUrl = `${siteUrl}/login?invite=true${inviteToken ? `&token=${inviteToken}` : ''}${invitePropId ? `&property=${invitePropId}` : ''}`;
        console.log(`[Cohost Invitation] Sending to: ${customerEmail} | URL: ${inviteUrl}`);
        const html = await render(React.createElement(CohostInvitationTemplate, {
          propertyName: p.name,
          logoUrl: p.logo,
          accentColor: p.accentColor,
          inviteUrl
        }));

        emailOptions.push({ 
          from: fromAddress, 
          to: customerEmail, 
          subject: `🤝 Invitación de Co-anfitrión para ${p.name}`, 
          html 
        });

        await NotificationService.notifyCohostInvitation(customerEmail, p.name);
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

        await NotificationService.sendTelegramAlert(`🚨 <b>¡ALERTA DE SOPORTE!</b>\n\n👤 ${clientFullName}\n📞 ${contact}\n📟 <b>MSG:</b> ${message}`);
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

    return res.status(200).json({ success: true, results });

  } catch (err: any) {
    console.error("[Email System] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
