import React from 'react';
import {
  Section,
  Text,
  Link,
  Column,
  Row,
  Container,
} from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface ReservationConfirmedProps {
  firstName: string;
  propertyName: string;
  logoUrl: string;
  accentColor: string;
  isReturning: boolean;
  checkIn: string;
  checkOut: string;
  accessCode: string;
  wifiName: string;
  wifiPass: string;
  mapsUrl: string;
  wazeUrl: string;
  stayPortalUrl: string;
  isWithin24h: boolean;
  guidebookUrl?: string | null;
}

export const ReservationConfirmedTemplate: React.FC<ReservationConfirmedProps> = ({
  firstName,
  propertyName,
  logoUrl,
  accentColor,
  isReturning,
  checkIn,
  checkOut,
  accessCode,
  wifiName,
  wifiPass,
  mapsUrl,
  wazeUrl,
  stayPortalUrl,
  isWithin24h,
  guidebookUrl,
}) => {
  const welcomeHeader = isReturning
    ? `¡Bienvenido de vuelta, es un honor tenerte en casa otra vez!`
    : `Tu experiencia Caribe Chic en ${propertyName} comienza ahora.`;

  return (
    <BaseLayout
      previewText={isReturning ? `🌊 ¡Bienvenido de vuelta a ${propertyName}!` : `🏝️ ¡Confirmado! Tu refugio en ${propertyName} está listo`}
      logoUrl={logoUrl}
      accentColor={accentColor}
    >
      <Section style={mainSectionStyle}>
        <Text style={h1Style}>¡Hola, {firstName}!</Text>
        <Text style={badgeStyle(accentColor)}>{welcomeHeader}</Text>
        
        <Text style={pStyle}>
          {isReturning ? 'Nos alegra verte de nuevo. ' : ''}
          Soy <strong>Salty</strong>, tu concierge digital. La brisa de Cabo Rojo ya te espera y yo he preparado cada detalle para que tu estancia sea legendaria.
        </Text>

        <Container style={infoBoxStyle}>
          <Text style={infoBoxLabel(accentColor)}>Protocolo de Acceso</Text>
          
          {isWithin24h ? (
            <Section>
              <Text style={accessLabel}>Código Seguro:</Text>
              <Text style={accessCodeStyle}>{accessCode}</Text>
              <Section style={dividerMiniStyle} />
              <Row>
                <Column>
                  <Text style={wifiInfo}>📡 <b>WF:</b> {wifiName}</Text>
                </Column>
                <Column>
                  <Text style={wifiInfo}>🔑 <b>Pass:</b> {wifiPass}</Text>
                </Column>
              </Row>
            </Section>
          ) : (
            <Section>
              <Text style={secureLabel}>🔑 Tu acceso es digital y seguro.</Text>
              <Text style={pendingAccessStyle(accentColor)}>
                Los códigos de acceso y WiFi se revelarán automáticamente en tu Portal de Estadía 24 horas antes de tu check-in.
              </Text>
              <Section style={dividerMiniStyle} />
              <Text style={locationInfo}>📍 Ubicación: {propertyName}</Text>
              <Text style={dateInfo}>Check-in: {checkIn}</Text>
            </Section>
          )}
        </Container>

        <Section style={navigationSection}>
          <Text style={navLabel}>¿Cómo llegar al paraíso?</Text>
          <Row>
            <Column style={navCol}>
              <Link href={mapsUrl} style={navButtonLight}>📍 Google Maps</Link>
            </Column>
            <Column style={navSeparator} />
            <Column style={navCol}>
              <Link href={wazeUrl} style={navButtonBlue}>🚙 Waze</Link>
            </Column>
          </Row>
        </Section>

        <Section style={mainCtaSection}>
          <Link href={stayPortalUrl} style={mainCtaButton}>
            🔑 Gestionar Mi Estancia
          </Link>
          {guidebookUrl && (
            <Section style={guideSection}>
              <Text style={guideText}>🎁 <b>Bonus:</b> He adjuntado tu "Golden Welcome Pack" con los mejores secretos locales.</Text>
              <Link href={guidebookUrl} style={guideButton}>✨ Descargar Guía VIP (PDF)</Link>
            </Section>
          )}
        </Section>

        <Text style={saltySignature}>
          "En la Villa, el tiempo se mide en olas y sonrisas. Nos vemos pronto." — Salty
        </Text>
      </Section>
    </BaseLayout>
  );
};

// Styles
const mainSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
};

const h1Style: React.CSSProperties = {
  fontSize: '32px',
  color: '#2C2B29',
  margin: '0',
  fontFamily: 'serif',
};

const badgeStyle = (accentColor: string): React.CSSProperties => ({
  color: accentColor,
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '3px',
  fontSize: '10px',
  marginTop: '15px',
  marginBottom: '30px',
});

const pStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#4A4A4A',
  lineHeight: '1.8',
  marginBottom: '25px',
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#2C2B29',
  padding: '35px',
  borderRadius: '25px',
  margin: '30px 0',
  textAlign: 'left' as const,
};

const infoBoxLabel = (accentColor: string): React.CSSProperties => ({
  color: accentColor,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  marginBottom: '20px',
  margin: '0',
});

const accessLabel: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  opacity: 0.8,
  margin: '10px 0 5px',
};

const accessCodeStyle: React.CSSProperties = {
  fontSize: '32px',
  color: '#ffffff',
  fontWeight: 'bold',
  letterSpacing: '4px',
  margin: '0',
};

const dividerMiniStyle: React.CSSProperties = {
  marginTop: '20px',
  paddingTop: '20px',
  borderTop: '1px solid rgba(255,255,255,0.1)',
};

const wifiInfo: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '5px 0',
};

const secureLabel: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '10px 0',
};

const pendingAccessStyle = (accentColor: string): React.CSSProperties => ({
  fontSize: '11px',
  color: accentColor,
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '15px 0',
});

const locationInfo: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '5px 0',
};

const dateInfo: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '11px',
  opacity: 0.6,
  margin: '5px 0',
};

const navigationSection: React.CSSProperties = {
  margin: '35px 0',
};

const navLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  marginBottom: '15px',
};

const navCol: React.CSSProperties = {
  width: '48%',
};

const navSeparator: React.CSSProperties = {
  width: '4%',
};

const navButtonLight: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#2C2B29',
  border: '1px solid #ddd',
  padding: '15px 10px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '11px',
  display: 'block',
  textAlign: 'center' as const,
};

const navButtonBlue: React.CSSProperties = {
  backgroundColor: '#33CCFF',
  color: '#ffffff',
  padding: '15px 10px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '11px',
  display: 'block',
  textAlign: 'center' as const,
};

const mainCtaSection: React.CSSProperties = {
  margin: '40px 0',
};

const mainCtaButton: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FF7F3F 0%, #E05A2B 100%)',
  color: '#ffffff',
  padding: '18px 35px',
  borderRadius: '18px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
  display: 'inline-block',
  boxShadow: '0 10px 20px rgba(255,127,63,0.2)',
};

const saltySignature: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  marginTop: '40px',
};

const guideSection: React.CSSProperties = {
  marginTop: '25px',
  padding: '20px',
  backgroundColor: '#f9f9f9',
  borderRadius: '15px',
  border: '1px dashed #ddd',
};

const guideText: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  marginBottom: '10px',
};

const guideButton: React.CSSProperties = {
  fontSize: '11px',
  color: '#FF7F3F',
  fontWeight: 'bold',
  textDecoration: 'underline',
};
