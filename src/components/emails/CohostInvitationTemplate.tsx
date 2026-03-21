import React from 'react';
import { Section, Text, Link, Container } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface CohostInvitationProps {
  propertyName: string;
  logoUrl: string;
  accentColor: string;
  inviteUrl: string;
}

export const CohostInvitationTemplate: React.FC<CohostInvitationProps> = ({
  propertyName,
  logoUrl,
  accentColor,
  inviteUrl,
}) => {
  return (
    <BaseLayout
      previewText={`🤝 Invitación de Co-anfitrión para ${propertyName}`}
      logoUrl={logoUrl}
      accentColor={accentColor}
    >
      <Section style={mainSectionStyle}>
        <Text style={h2Style}>Invitación Especial 🔱</Text>
        <Text style={pStyle}>
          Has sido invitado como <strong>Co-anfitrión</strong> de Salty AI para gestionar <strong>{propertyName}</strong>.
        </Text>
        <Text style={pStyle}>
          Como parte del equipo elite, tendrás acceso total al Dashboard para gestionar reservas, equipos de limpieza y finanzas.
        </Text>
        <Section style={ctaSectionStyle}>
          <Link href={inviteUrl} style={ctaButtonStyle(accentColor)}>
            Aceptar Invitación
          </Link>
        </Section>
        <Text style={saltySignatureStyle}>
          "Bienvenido al equipo que cuida el paraíso." — Salty
        </Text>
      </Section>
    </BaseLayout>
  );
};

const mainSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
};

const h2Style: React.CSSProperties = {
  color: '#2C2B29',
  fontFamily: 'serif',
  fontSize: '28px',
  margin: '0',
};

const pStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#4A4A4A',
  lineHeight: '1.8',
  textAlign: 'left' as const,
  marginBottom: '20px',
};

const ctaSectionStyle: React.CSSProperties = {
  margin: '40px 0',
};

const ctaButtonStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#2C2B29',
  color: '#ffffff',
  padding: '18px 35px',
  borderRadius: '15px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'inline-block',
  boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
});

const saltySignatureStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  marginTop: '40px',
};
