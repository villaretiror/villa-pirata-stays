import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { ReservationConfirmedTemplate } from '../src/components/emails/ReservationConfirmedTemplate';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function sendTest() {
  console.log("🔱 SALTY: Iniciando Despliegue de Email Cinematográfico...");
  
  const accentColor = "#FF7F3F";
  const logoUrl = "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png";
  const propertyImage = "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/1081171030449673920/1711818165243_villa_retiro_hero.jpg";

  // Simulate 18 hours before check-in
  const now = new Date();
  const checkInDate = new Date(now.getTime() + 18 * 3600 * 1000);
  const checkIn = checkInDate.toISOString().split('T')[0];

  const html = await render(React.createElement(ReservationConfirmedTemplate, {
    firstName: "Brian",
    propertyName: "Villa Retiro R.",
    logoUrl: logoUrl,
    accentColor: accentColor,
    isReturning: true,
    checkIn: checkIn,
    checkOut: "2026-04-10",
    accessCode: "9988#",
    wifiName: "VILLA_GUEST_5G",
    wifiPass: "CaboRojo2026",
    mapsUrl: "https://maps.apple.com",
    wazeUrl: "https://waze.com",
    stayPortalUrl: "https://www.villaretiror.com/stay/test",
    isWithin24h: true, // Trigger Bunker Mode / Golden Ticket
    guidebookUrl: "https://www.villaretiror.com/guides/gold-pack.pdf",
    propertyImage: propertyImage,
    weatherNote: "Brian, he verificado el pulso de Caguas y Cabo Rojo para tu llegada. Nos espera un sol radiante de 28°C con una brisa ligera del sur. La piscina está en su punto exacto. Prepárate para el primer brindis."
  }));

  // Save to HTML preview
  const fs = await import('fs');
  const previewPath = path.join(process.cwd(), 'scripts/confirmation-test-preview.html');
  fs.writeFileSync(previewPath, html);
  console.log(`👁️ PREVIEW: Generada en ${previewPath}`);

  if (!process.env.RESEND_API_KEY && !process.env.VITE_RESEND_API_KEY) {
    console.log("⚠️ NOTA: Saltando envío real (Falta RESEND_API_KEY). Revisa el archivo HTML arriba.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);
  console.log("🚀 ENVIANDO: Email real a Brian (villaretiror@gmail.com)...");
  
  const { data, error } = await resend.emails.send({
    from: 'Villa Retiro <reservas@villaretiror.com>',
    to: 'villaretiror@gmail.com',
    subject: '🎟️ TU TICKET DORADO: Salty te espera en Villa Retiro R.',
    html: html
  });

  if (error) {
    console.error("❌ ERROR AL ENVIAR:", error);
  } else {
    console.log("✅ ÉXITO: Email enviado!", data?.id);
  }
}

sendTest();
