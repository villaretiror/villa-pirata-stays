import React from 'react';
import { Section, Text, Container, Link } from '@react-email/components';
import { BaseLayout } from './BaseLayout.js';

interface ContactConfirmationProps {
  firstName: string;
  propertyName: string;
  logoUrl: string;
  accentColor: string;
  guideUrl?: string;
}

export const ContactConfirmationTemplate: React.FC<ContactConfirmationProps> = ({
  firstName,
  propertyName,
  logoUrl,
  accentColor,
  guideUrl = "https://www.villaretiror.com/guide"
}) => {
  return (
    <BaseLayout
      previewText={`Recibimos tu consulta - ${propertyName} 🌴`}
      logoUrl={logoUrl}
      accentColor={accentColor}
      propertyName={propertyName}
    >
      <Section style={mainSection}>
        <Text style={h1}>¡Hola {firstName}!</Text>
        <Text style={p}>
          Gracias por tu interés en <strong>{propertyName}</strong>. Nuestro equipo de Salty Concierge te contactará <b>en menos de 2 horas</b> para responder todas tus dudas.
        </Text>
        
        <Section style={badgeSection}>
            <Text style={badge(accentColor)}>✨ Beneficio de Trato Directo Activo</Text>
            <Text style={badgeSub}>Recuerda que al contactarnos directamente, ahorras hasta un 15% en comisiones de plataformas externas.</Text>
        </Section>

        <Section style={ctaSection}>
            <Text style={ctaText}>¿Quieres ir explorando?</Text>
            <Link href={guideUrl} style={ctaButton(accentColor)}>📖 Ver Guía Digital</Link>
        </Section>

        <Text style={saltySignature}>
          "La brisa de Cabo Rojo ya te está llamando." — Salty
        </Text>
      </Section>
    </BaseLayout>
  );
};

const mainSection: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '30px',
};

const h1: React.CSSProperties = {
  fontSize: '28px',
  color: '#2C2B29',
  fontFamily: 'serif',
  margin: '0 0 20px',
};

const p: React.CSSProperties = {
  fontSize: '16px',
  color: '#4A4A4A',
  lineHeight: '1.6',
};

const badgeSection: React.CSSProperties = {
    backgroundColor: '#F9F6F2',
    padding: '20px',
    borderRadius: '20px',
    margin: '30px 0',
    border: '1px dashed #D4AF37',
};

const badge = (accentColor: string): React.CSSProperties => ({
    fontSize: '12px',
    fontWeight: 'bold',
    color: accentColor,
    margin: '0 0 5px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
});

const badgeSub: React.CSSProperties = {
    fontSize: '11px',
    color: '#888',
    margin: '0',
};

const ctaSection: React.CSSProperties = {
    margin: '40px 0',
};

const ctaText: React.CSSProperties = {
    fontSize: '14px',
    color: '#2C2B29',
    marginBottom: '15px',
};

const ctaButton = (accentColor: string): React.CSSProperties => ({
    backgroundColor: '#2C2B29',
    color: '#ffffff',
    padding: '15px 30px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '13px',
    display: 'inline-block',
});

const saltySignature: React.CSSProperties = {
  fontSize: '13px',
  color: '#999',
  fontStyle: 'italic',
  marginTop: '40px',
};
