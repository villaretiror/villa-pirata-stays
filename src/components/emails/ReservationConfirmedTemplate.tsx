import React from 'react';
import {
  Section,
  Text,
  Link,
  Column,
  Row,
  Container,
  Img,
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
  checkInTime?: string;
  checkOutTime?: string;
  accessCode: string;
  wifiName: string;
  wifiPass: string;
  mapsUrl: string;
  wazeUrl: string;
  stayPortalUrl: string;
  isWithin24h: boolean;
  guidebookUrl?: string | null;
  propertyImage?: string;
  weatherNote?: string;
  houseRules?: string[];
}

export const ReservationConfirmedTemplate: React.FC<ReservationConfirmedProps> = ({
  firstName,
  propertyName,
  logoUrl,
  accentColor,
  isReturning,
  checkIn,
  checkOut,
  checkInTime = "3:00 PM",
  checkOutTime = "11:00 AM",
  accessCode,
  wifiName,
  wifiPass,
  mapsUrl,
  wazeUrl,
  stayPortalUrl,
  isWithin24h,
  guidebookUrl,
  propertyImage,
  weatherNote,
  houseRules = [
    "No se permiten fiestas ni eventos",
    "Ambiente 100% libre de humo",
    "Apagar A/C al salir de la villa"
  ],
}) => {
  const theme = isWithin24h ? 'dark' : 'light';
  const isDark = theme === 'dark';
  
  const welcomeHeader = isReturning
    ? `¡Bienvenido de vuelta, es un honor tenerte en casa otra vez!`
    : `Tu experiencia Caribe Chic en ${propertyName} comienza ahora.`;

  return (
    <BaseLayout
      previewText={isReturning ? `🌊 ¡Bienvenido de vuelta a ${propertyName}!` : `🏝️ ¡Confirmado! Tu refugio en ${propertyName} está listo`}
      logoUrl={logoUrl}
      accentColor={accentColor}
      propertyName={propertyName}
      theme={theme}
    >
      {propertyImage && (
        <Section style={heroImageSection}>
          <Img src={propertyImage} width="100%" style={heroImageStyle} alt={propertyName} />
        </Section>
      )}

      <Section style={mainSectionStyle}>
        <Text style={isDark ? h1StyleDark : h1Style}>¡Hola, {firstName}!</Text>
        <Text style={badgeStyle(accentColor)}>{welcomeHeader}</Text>
        
        <Text style={pStyle(isDark)}>
          {isReturning ? 'Nos alegra verte de nuevo. ' : ''}
          Soy <strong>Salty</strong>, tu concierge digital. La brisa de Cabo Rojo ya te espera y yo he preparado cada detalle para que tu estancia sea legendaria.
        </Text>

        <Container style={infoBoxStyle(isDark, accentColor)}>
          <Text style={infoBoxLabel(accentColor)}>
            {isWithin24h ? '🛡️ Protocolo de Acceso Activo' : '🔑 Tu Acceso Seguro'}
          </Text>
          
          {isWithin24h ? (
            <Section>
              <Text style={accessLabel}>Código Maestro:</Text>
              <Text style={accessCodeStyle(accentColor)}>{accessCode}</Text>
              <Section style={dividerMiniStyle(isDark)} />
              <Row>
                <Column>
                  <Text style={wifiInfo}>📡 <b>WiFi:</b> {wifiName}</Text>
                </Column>
                <Column>
                  <Text style={wifiInfo}>🔐 <b>Pass:</b> {wifiPass}</Text>
                </Column>
              </Row>
            </Section>
          ) : (
            <Section>
              <Row style={{ marginBottom: '15px' }}>
                <Column>
                    <Text style={locationInfo(isDark)}>📍 Propiedad: <b>{propertyName}</b></Text>
                    <Text style={dateInfo(isDark)}>Check-in: <b>{checkIn}</b> ({checkInTime})</Text>
                    <Text style={dateInfo(isDark)}>Check-out: <b>{checkOut}</b> ({checkOutTime})</Text>
                </Column>
              </Row>
              <Section style={dividerMiniStyle(isDark)} />
              <Section style={{ marginTop: '15px' }}>
                <Text style={infoBoxLabel(accentColor)}>📋 Reglas de la Casa:</Text>
                {houseRules.map((rule, idx) => (
                    <Text key={idx} style={ruleItemStyle(isDark)}>• {rule}</Text>
                ))}
              </Section>
            </Section>
          )}
        </Container>

        <Section style={supportSection(isDark)}>
            <Row>
                <Column style={{ width: '40px' }}><Text style={{ fontSize: '24px' }}>🛡️</Text></Column>
                <Column>
                    <Text style={supportTitle(accentColor)}>Salty Guard: Logística & Paz</Text>
                    <Text style={supportText(isDark)}><b>Estacionamiento:</b> Privado y exclusivo dentro de la propiedad.<br/><b>Energía:</b> Bunker System (Solar + Cisterna) activo para tu confort.</Text>
                </Column>
            </Row>
        </Section>

        <Section style={navigationSection}>
          <Text style={navLabel}>Rutas al Paraíso</Text>
          <Row>
            <Column style={navCol}>
              <Link href={mapsUrl} style={isDark ? navButtonDark : navButtonLight}>📍 Google Maps</Link>
            </Column>
            <Column style={navSeparator} />
            <Column style={navCol}>
              <Link href={wazeUrl} style={navButtonBlue}>🚙 Waze</Link>
            </Column>
          </Row>
        </Section>

        <Section style={mainCtaSection}>
          <Link href={stayPortalUrl} style={mainCtaButton(accentColor)}>
            🔱 Gestionar Mi Estancia
          </Link>
          {guidebookUrl && (
            <Section style={guideSection(isDark)}>
              <Text style={guideText(isDark)}><b>Golden Welcome Pack:</b> He adjuntado para ti los secretos mejor guardados de la zona.</Text>
              <Link href={guidebookUrl} style={guideButton(accentColor)}>✨ Descargar Guía VIP (PDF)</Link>
            </Section>
          )}
        </Section>

        {weatherNote && (
          <Section style={weatherNoteSection(isDark)}>
            <Text style={weatherTitle(accentColor)}>🎙️ Nota del Concierge</Text>
            <Text style={weatherText(isDark)}>{weatherNote}</Text>
          </Section>
        )}

        <Text style={saltySignature(isDark)}>
          "En la Villa, el tiempo se mide en olas y sonrisas. Nos vemos pronto." <br />
          — <b>Salty</b>
        </Text>
      </Section>
    </BaseLayout>
  );
};

// Styles
const heroImageSection: React.CSSProperties = {
  margin: '-50px -50px 40px -50px',
  borderRadius: '0 0 40px 40px',
  overflow: 'hidden',
};

const heroImageStyle: React.CSSProperties = {
  maxHeight: '300px',
  objectFit: 'cover',
};

const mainSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
};

const h1Style: React.CSSProperties = {
  fontSize: '36px',
  color: '#2C2B29',
  margin: '0',
  fontFamily: 'Playfair Display, serif',
  fontStyle: 'italic',
};

const h1StyleDark: React.CSSProperties = {
  ...h1Style,
  color: '#ffffff',
};

const badgeStyle = (accentColor: string): React.CSSProperties => ({
  color: accentColor,
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '4px',
  fontSize: '10px',
  marginTop: '15px',
  marginBottom: '35px',
});

const pStyle = (isDark: boolean): React.CSSProperties => ({
  fontSize: '17px',
  color: isDark ? 'rgba(255,255,255,0.8)' : '#4A4A4A',
  lineHeight: '1.8',
  marginBottom: '30px',
});

const infoBoxStyle = (isDark: boolean, accentColor: string): React.CSSProperties => ({
  backgroundColor: isDark ? '#111A35' : '#F9F6F2',
  padding: '40px',
  borderRadius: '32px',
  margin: '35px 0',
  textAlign: 'left' as const,
  border: `1px solid ${accentColor}20`,
});

const infoBoxLabel = (accentColor: string): React.CSSProperties => ({
  color: accentColor,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  marginBottom: '20px',
  fontWeight: 'bold',
  margin: '0',
});

const accessLabel: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  opacity: 0.7,
  margin: '15px 0 5px',
};

const accessCodeStyle = (accentColor: string): React.CSSProperties => ({
  fontSize: '42px',
  color: accentColor,
  fontWeight: 'bold',
  letterSpacing: '6px',
  margin: '5px 0 20px',
});

const dividerMiniStyle = (isDark: boolean): React.CSSProperties => ({
  marginTop: '20px',
  paddingTop: '20px',
  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
});

const wifiInfo: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '5px 0',
};

const secureLabel = (isDark: boolean): React.CSSProperties => ({
  color: isDark ? '#ffffff' : '#2C2B29',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '10px 0',
});

const pendingAccessStyle = (accentColor: string): React.CSSProperties => ({
  fontSize: '11px',
  color: accentColor,
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '15px 0',
  lineHeight: '1.5',
});

const locationInfo = (isDark: boolean): React.CSSProperties => ({
  color: isDark ? 'rgba(255,255,255,0.9)' : '#2C2B29',
  fontSize: '15px',
  margin: '10px 0 5px',
});

const dateInfo = (isDark: boolean): React.CSSProperties => ({
  color: isDark ? 'rgba(255,255,255,0.5)' : '#888',
  fontSize: '12px',
  margin: '5px 0',
});

const navigationSection: React.CSSProperties = {
  margin: '40px 0',
};

const navLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  marginBottom: '18px',
  textTransform: 'uppercase',
  letterSpacing: '2px',
  fontWeight: 'bold',
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
  border: '1px solid #e0e0e0',
  padding: '18px 10px',
  borderRadius: '16px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '11px',
  display: 'block',
  textAlign: 'center' as const,
};

const navButtonDark: React.CSSProperties = {
  backgroundColor: '#111A35',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '18px 10px',
  borderRadius: '16px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '11px',
  display: 'block',
  textAlign: 'center' as const,
};

const navButtonBlue: React.CSSProperties = {
  backgroundColor: '#33CCFF',
  color: '#ffffff',
  padding: '18px 10px',
  borderRadius: '16px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '11px',
  display: 'block',
  textAlign: 'center' as const,
  boxShadow: '0 10px 20px rgba(51, 204, 255, 0.2)',
};

const mainCtaSection: React.CSSProperties = {
  margin: '50px 0',
};

const mainCtaButton = (accentColor: string): React.CSSProperties => ({
  backgroundColor: accentColor,
  color: '#ffffff',
  padding: '22px 50px',
  borderRadius: '24px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '17px',
  display: 'inline-block',
  boxShadow: `0 20px 40px ${accentColor}30`,
});

const saltySignature = (isDark: boolean): React.CSSProperties => ({
  fontSize: '15px',
  color: isDark ? 'rgba(255,255,255,0.5)' : '#888',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  marginTop: '50px',
  lineHeight: '1.6',
});

const guideSection = (isDark: boolean): React.CSSProperties => ({
  marginTop: '35px',
  padding: '30px',
  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9',
  borderRadius: '24px',
  border: '1px dashed rgba(128,128,128,0.2)',
});

const guideText = (isDark: boolean): React.CSSProperties => ({
  fontSize: '13px',
  color: isDark ? 'rgba(255,255,255,0.7)' : '#666',
  marginBottom: '15px',
  lineHeight: '1.6',
});

const guideButton = (accentColor: string): React.CSSProperties => ({
  fontSize: '12px',
  color: accentColor,
  fontWeight: 'bold',
  textDecoration: 'none',
  borderBottom: `1px solid ${accentColor}`,
});

const weatherNoteSection = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: isDark ? 'rgba(212,175,55,0.05)' : '#FFFAF0',
  padding: '25px',
  borderRadius: '24px',
  borderLeft: `4px solid #D4AF37`,
  textAlign: 'left' as const,
  margin: '40px 0',
});

const weatherTitle = (accentColor: string): React.CSSProperties => ({
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  fontWeight: 'bold',
  color: accentColor,
  margin: '0 0 10px 0',
});

const weatherText = (isDark: boolean): React.CSSProperties => ({
  fontSize: '14px',
  color: isDark ? '#ffffff' : '#2C2B29',
  fontStyle: 'italic',
  lineHeight: '1.6',
  margin: '0',
});

const ruleItemStyle = (isDark: boolean): React.CSSProperties => ({
  fontSize: '13px',
  color: isDark ? 'rgba(255,255,255,0.6)' : '#666',
  margin: '8px 0',
  lineHeight: '1.4',
});

const supportSection = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: isDark ? '#111A35' : '#F0F7FF',
  padding: '25px',
  borderRadius: '24px',
  border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #D0E7FF',
  margin: '20px 0 40px',
  textAlign: 'left' as const,
});

const supportTitle = (accentColor: string): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: 'bold',
  color: accentColor,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 5px 0',
});

const supportText = (isDark: boolean): React.CSSProperties => ({
  fontSize: '13px',
  color: isDark ? 'rgba(255,255,255,0.7)' : '#444',
  margin: '0',
  lineHeight: '1.6',
});
