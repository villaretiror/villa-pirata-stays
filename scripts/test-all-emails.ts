
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { ReservationConfirmedTemplate } from '../src/components/emails/ReservationConfirmedTemplate';
import { ContactConfirmationTemplate } from '../src/components/emails/ContactConfirmationTemplate';
import { LeadRecoveryTemplate } from '../src/components/emails/LeadRecoveryTemplate';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function sendAllTests() {
  console.log("⚜️ SALTY INTELLIGENCE: Iniciando Despliegue Maestro de Emails...");
  
  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("❌ ERROR: No se encontró VITE_RESEND_API_KEY en .env.local");
    return;
  }

  const resend = new Resend(resendApiKey);
  const targetEmail = "villaretiror@gmail.com";
  const commonProps = {
    firstName: "Brian",
    propertyName: "Villa Retiro R.",
    logoUrl: "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/villa_retiro_logo.png",
    accentColor: "#FF7F3F"
  };

  const templates = [
    {
      name: "Confirmación de Reserva (Elite)",
      subject: "🏝️ RESERVA CONFIRMADA: Brian, tu refugio en Villa Retiro R. está listo",
      component: ReservationConfirmedTemplate,
      props: {
        ...commonProps,
        isReturning: true,
        checkIn: "2026-06-15",
        checkOut: "2026-06-20",
        accessCode: "5544#",
        wifiName: "VILLA_RETIRO_GUEST",
        wifiPass: "CaboRojo2026",
        mapsUrl: "https://maps.google.com/?q=Villa+Retiro+R",
        wazeUrl: "https://waze.com/ul?q=Villa+Retiro+R",
        stayPortalUrl: "https://www.villaretiror.com/stay/test",
        isWithin24h: true,
        guidebookUrl: "https://www.villaretiror.com/guides/vip-access.pdf",
        propertyImage: "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/1081171030449673920/1711818165243_villa_retiro_hero.jpg",
        weatherNote: "Brian, he verificado el pulso de Cabo Rojo para tu llegada. Nos espera un sol radiante de 28°C. Todo está a tu medida."
      }
    },
    {
      name: "Confirmación de Contacto",
      subject: "📩 Recibimos tu consulta - Villa Retiro R. 🌴",
      component: ContactConfirmationTemplate,
      props: {
        ...commonProps
      }
    },
    {
      name: "Recuperación de Lead (Retargeting)",
      subject: "🌊 Brian, ¿aún piensas en Cabo Rojo? Tenemos un lugar para ti",
      component: LeadRecoveryTemplate,
      props: {
        ...commonProps,
        recoveryUrl: "https://www.villaretiror.com/property/1081171030449673920"
      }
    }
  ];

  for (const t of templates) {
    try {
      console.log(`🚀 Preparando: ${t.name}...`);
      const html = await render(React.createElement(t.component as any, t.props));
      
      const { data, error } = await resend.emails.send({
        from: 'Villa Retiro <reservas@villaretiror.com>',
        to: targetEmail,
        subject: t.subject,
        html: html
      });

      if (error) {
        console.error(`❌ ERROR en ${t.name}:`, error);
      } else {
        console.log(`✅ ÉXITO en ${t.name}! ID:`, data?.id);
      }
    } catch (e: any) {
      console.error(`💥 CRASH en ${t.name}:`, e.message);
    }
  }

  console.log("\n✨ Despliegue completo. Revisa villaretiror@gmail.com para auditar la estética.");
}

sendAllTests();
