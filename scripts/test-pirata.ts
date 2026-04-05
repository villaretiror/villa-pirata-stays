import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { ReservationConfirmedTemplate } from '../src/components/emails/ReservationConfirmedTemplate';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function sendPirataTest() {
  console.log("🏴‍☠️ SALTY INTELLIGENCE: Iniciando Test de Identidad PIRATA...");
  
  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("❌ ERROR: No se encontró VITE_RESEND_API_KEY");
    return;
  }

  const resend = new Resend(resendApiKey);
  const targetEmail = "villaretiror@gmail.com";
  
  // Test Data for Pirata
  const propId = "42839458";
  const propertyName = "Pirata Family House";
  const logoUrl = "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png";
  const accentColor = "#004E64";
  const propertyImage = "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata/pirata_5.jpg";

  console.log(`🚀 Preparando Email para: ${propertyName}...`);
  
  const html = await render(React.createElement(ReservationConfirmedTemplate as any, {
    firstName: "Brian",
    propertyName: propertyName,
    logoUrl: logoUrl,
    accentColor: accentColor,
    isReturning: false,
    checkIn: "2026-07-01",
    checkOut: "2026-07-05",
    accessCode: "2197",
    wifiName: "Wifivacacional",
    wifiPass: "Wifivacacional",
    mapsUrl: "https://maps.google.com",
    wazeUrl: "https://waze.com",
    stayPortalUrl: "https://www.villaretiror.com/stay/42839458",
    isWithin24h: true,
    propertyNameFooter: propertyName, // Added via refactor
    propertyImage: propertyImage,
    weatherNote: "¡Ahoy Brian! La brisa de Cabo Rojo está en su punto para los piratas. Te esperamos con el tesoro listo."
  }));

  const { data, error } = await resend.emails.send({
    from: 'Pirata Stays <reservas@villaretiror.com>',
    to: targetEmail,
    subject: '🏴‍☠️ ¡TU TICKET PIRATA! Tu refugio en Pirata Family House está listo',
    html: html
  });

  if (error) {
    console.error("❌ ERROR:", error);
  } else {
    console.log("✅ ÉXITO ID:", data?.id);
  }
}

sendPirataTest();
