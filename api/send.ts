import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { z } from 'zod';
import { render } from '@react-email/render';
import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
  Hr,
  Font,
  Preview,
  Row,
  Column 
} from '@react-email/components';

// 🛡️ INITIALIZE SECURE SERVER-SIDE SUPABASE
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 🛰️ INLINED NOTIFICATION ENGINE (Bypasses local file resolution issues)
const notifyInviteInlined = async (email: string, property: string) => {
    const token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const message = `🟡 <b>Nueva Alerta de Email</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Destinatario:</b> ${email}\n<b>Asunto:</b> ${property}\n📬 <i>Estatus: Transmitido vía Resend.</i>`;
    
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (e) {}
};

// --- INLINED EMAIL COMPONENTS (The "Ultra-Dome" Strategy) ---

// 1. BASE LAYOUT
const BaseLayout: React.FC<{
  previewText: string;
  logoUrl: string;
  accentColor: string;
  propertyName: string;
  theme?: 'light' | 'dark';
  children: React.ReactNode;
}> = ({ previewText, logoUrl, accentColor, propertyName, theme = 'light', children }) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#050A18' : '#FDFCFB';
  return (
    <Html lang="es">
      <Head>
        <Font fontFamily="Outfit" fallbackFontFamily="sans-serif" fontWeight={400} fontStyle="normal" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: bgColor, fontFamily: 'Outfit, sans-serif', margin: '0', padding: '40px 0' }}>
        <Container style={{ backgroundColor: isDark ? '#0A1229' : '#ffffff', maxWidth: '600px', margin: '0 auto', borderRadius: '48px', overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(212,175,55,0.2)' : '#f0f0f0'}` }}>
          <Section style={{ padding: '60px 40px', textAlign: 'center' as const, borderBottom: `2px dashed ${accentColor}20` }}>
            <Img src={logoUrl} width="130" alt="Logo" style={{ margin: '0 auto' }} />
          </Section>
          <Section style={{ padding: '50px 50px 30px', color: isDark ? '#ffffff' : '#2C2B29' }}>
            {children}
          </Section>
          <Section style={{ padding: '0 50px 50px', textAlign: 'center' as const }}>
            <Hr style={{ borderTop: '1px solid #f0f0f0', margin: '30px 0' }} />
            <Text style={{ fontSize: '11px', color: '#999' }}>
              <strong>{propertyName.toUpperCase()}</strong> • Cabo Rojo, Puerto Rico<br />
              Este es un canal de comunicación seguro operado por Salty AI.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// 2. COHOST INVITATION
const CohostInvitationTemplate: React.FC<{
  propertyName: string;
  logoUrl: string;
  accentColor: string;
  inviteUrl: string;
}> = ({ propertyName, logoUrl, accentColor, inviteUrl }) => (
  <BaseLayout previewText={`🤝 Invitación de Co-anfitrión`} logoUrl={logoUrl} accentColor={accentColor} propertyName={propertyName}>
    <Section style={{ textAlign: 'center' }}>
      <Text style={{ fontSize: '28px', color: '#2C2B29', margin: '0' }}>Invitación Especial 🔱</Text>
      <Text style={{ fontSize: '15px', color: '#4A4A4A', lineHeight: '1.8', textAlign: 'left', margin: '20px 0' }}>
        Has sido invitado como <strong>Co-anfitrión</strong> de Salty AI para gestionar <strong>{propertyName}</strong>.
      </Text>
      <Link href={inviteUrl} style={{ backgroundColor: '#2C2B29', color: '#ffffff', padding: '18px 35px', borderRadius: '15px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
        Aceptar Invitación
      </Link>
    </Section>
  </BaseLayout>
);

// 3. CONTACT CONFIRMATION
const ContactConfirmationTemplate: React.FC<{
  firstName: string;
  propertyName: string;
  logoUrl: string;
  accentColor: string;
}> = ({ firstName, propertyName, logoUrl, accentColor }) => (
  <BaseLayout previewText={`Recibimos tu consulta`} logoUrl={logoUrl} accentColor={accentColor} propertyName={propertyName}>
    <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>¡Hola {firstName}!</Text>
    <Text style={{ fontSize: '16px', lineHeight: '1.6' }}>Gracias por contactarnos. Hemos recibido tu consulta sobre {propertyName} y un concierge humano o Salty AI te responderá en breve.</Text>
  </BaseLayout>
);

// --- MAIN HANDLER ---

const contactLeadSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string()
});

export default async function handler(req: any, res: any) {
  const authHeader = req.headers.authorization;
  const isAuthorized = authHeader === `Bearer ${process.env.RESEND_API_KEY}` || authHeader === `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`;

  if (!isAuthorized) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { type, userData, propertyId, customerEmail, ...rest } = req.body || {};
    const v_propertyId = propertyId || '1081171030449673920';

    const { data: dbProperty } = await supabase.from('properties').select('*').eq('id', v_propertyId).single();
    
    // Branding Logic
    const isPirata = v_propertyId === '42839458' || dbProperty?.title?.includes('Pirata');
    const accentColor = isPirata ? '#004E64' : '#FF7F3F';
    const logoUrl = isPirata 
      ? 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png'
      : 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png';
    const propertyName = dbProperty?.title || (isPirata ? 'Pirata Family House' : 'Villa Retiro');

    const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);
    const fromAddress = isPirata ? 'Pirata Stays <reservas@villaretiror.com>' : 'Villa Retiro <reservas@villaretiror.com>';

    let html;
    let subject;

    switch (type) {
      case 'contact':
        const { name } = contactLeadSchema.parse(userData);
        subject = `Recibimos tu consulta - ${propertyName} 🌴`;
        html = await render(React.createElement(ContactConfirmationTemplate, { firstName: name.split(' ')[0], propertyName, logoUrl, accentColor }));
        break;

      case 'cohost_invitation':
        const inviteUrl = `${process.env.VITE_SITE_URL}/login?invite=true&token=${rest.token}&property=${v_propertyId}`;
        subject = `🤝 Invitación de Co-anfitrión para ${propertyName}`;
        html = await render(React.createElement(CohostInvitationTemplate, { propertyName, logoUrl, accentColor, inviteUrl }));
        break;

      default:
        // Fallback for simple emails (Placeholder for legacy templates if needed)
        subject = `Notificación de Salty AI - ${propertyName}`;
        html = `<p>Hola, tienes una nueva notificación de ${propertyName}.</p>`;
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: customerEmail || userData?.email,
      subject,
      html
    });

    if (error) throw error;

    await notifyInviteInlined(customerEmail || userData?.email, subject);

    return res.status(200).json({ success: true, data });

  } catch (err: any) {
    console.error("[Email System] CRITICAL ERROR:", err);
    return res.status(500).json({ error: err.message, phase: 'ultra_dome_execution' });
  }
}
