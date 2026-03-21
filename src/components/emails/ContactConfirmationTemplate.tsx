import React from 'react';
import { Section, Text, Container } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface ContactConfirmationProps {
  firstName: string;
  propertyName: string;
  logoUrl: string;
  accentColor: string;
}

export const ContactConfirmationTemplate: React.FC<ContactConfirmationProps> = ({
  firstName,
  propertyName,
  logoUrl,
  accentColor,
}) => {
  return (
    <BaseLayout
      previewText={`Recibimos tu consulta - ${propertyName} 🌴`}
      logoUrl={logoUrl}
      accentColor={accentColor}
    >
      <Section style={mainSection}>
        <Text style={h1}>¡Hola {firstName}!</Text>
        <Text style={p}>
          Gracias por tu interés en <strong>{propertyName}</strong>. Nuestro equipo de Salty Concierge te contactará muy pronto para responder todas tus dudas.
        </Text>
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

const saltySignature: React.CSSProperties = {
  fontSize: '13px',
  color: '#999',
  fontStyle: 'italic',
  marginTop: '40px',
};
