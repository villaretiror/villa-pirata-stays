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
} from '@react-email/components';

interface BaseLayoutProps {
  previewText: string;
  logoUrl: string;
  accentColor: string;
  propertyName: string;
  theme?: 'light' | 'dark';
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ 
  previewText, 
  logoUrl, 
  accentColor, 
  propertyName,
  theme = 'light',
  children 
}) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#050A18' : '#FDFCFB';
  const containerBg = isDark ? '#0A1229' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#2C2B29';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#f0f0f0';

  return (
    <Html lang="es">
      <Head>
        <Font
          fontFamily="Playfair Display"
          fallbackFontFamily="serif"
          fontWeight={700}
          fontStyle="italic"
        />
        <Font
          fontFamily="Outfit"
          fallbackFontFamily="sans-serif"
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={mainStyle(bgColor)}>
        <Container style={containerStyle(containerBg, borderColor)}>
          {/* Header */}
          <Section style={headerSection(isDark, bgColor, accentColor)}>
            <Img
              src={logoUrl}
              width="130"
              alt="Logo"
              style={logoStyle}
            />
            {isDark && (
              <Text style={darkBadgeStyle(accentColor)}>Bunker Experience | Salty Concierge</Text>
            )}
          </Section>

          {/* Body Content */}
          <Section style={contentSection(isDark)}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={hrStyle(borderColor)} />
            <Section style={ctaSection}>
              <Link 
                href="https://wa.me/17873560895" 
                style={whatsappButtonStyle}
              >
                📲 Concierge Directo
              </Link>
            </Section>
            <Text style={footerText(isDark)}>
              <strong style={{ color: accentColor }}>{propertyName.toUpperCase()}</strong> • Cabo Rojo, Puerto Rico<br />
              Este es un canal de comunicación seguro operado por Salty AI.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const mainStyle = (bgColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  fontFamily: 'Outfit, "Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '40px 0',
});

const containerStyle = (bgColor: string, borderColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '48px',
  overflow: 'hidden',
  boxShadow: '0 40px 100px rgba(0,0,0,0.2)',
  border: `1px solid ${borderColor}`,
});

const headerSection = (isDark: boolean, bgColor: string, accentColor: string): React.CSSProperties => ({
  backgroundColor: isDark ? '#050A18' : bgColor,
  padding: '60px 40px',
  textAlign: 'center' as const,
  borderBottom: isDark ? `1px solid ${accentColor}20` : `2px dashed ${accentColor}20`,
});

const darkBadgeStyle = (accentColor: string): React.CSSProperties => ({
  color: accentColor,
  fontSize: '9px',
  textTransform: 'uppercase' as const,
  letterSpacing: '5px',
  marginTop: '20px',
  fontWeight: 'bold',
  opacity: 0.8,
});

const logoStyle: React.CSSProperties = {
  margin: '0 auto',
};

const contentSection = (isDark: boolean): React.CSSProperties => ({
  padding: '50px 50px 30px',
  color: isDark ? '#ffffff' : '#2C2B29',
});

const footerSection: React.CSSProperties = {
  padding: '0 50px 50px',
  textAlign: 'center' as const,
};

const hrStyle = (borderColor: string): React.CSSProperties => ({
  borderTop: `1px solid ${borderColor}`,
  margin: '30px 0',
});

const ctaSection: React.CSSProperties = {
  margin: '25px 0',
};

const whatsappButtonStyle: React.CSSProperties = {
  backgroundColor: '#25D366',
  color: '#ffffff',
  padding: '16px 32px',
  borderRadius: '16px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'inline-block',
  boxShadow: '0 10px 25px rgba(37, 211, 102, 0.2)',
};

const footerText = (isDark: boolean): React.CSSProperties => ({
  fontSize: '11px',
  color: isDark ? 'rgba(255,255,255,0.4)' : '#999',
  marginTop: '25px',
  lineHeight: '1.6',
  letterSpacing: '0.5px',
});
