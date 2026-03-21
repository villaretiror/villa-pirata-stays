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
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ 
  previewText, 
  logoUrl, 
  accentColor, 
  children 
}) => {
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
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSection(accentColor)}>
            <Img
              src={logoUrl}
              width="140"
              alt="Villa Retiro Logo"
              style={logoStyle}
            />
          </Section>

          {/* Body Content */}
          <Section style={contentSection}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={hrStyle} />
            <Section style={ctaSection}>
              <Link 
                href="https://wa.me/17873560895" 
                style={whatsappButtonStyle}
              >
                📲 Hablar con el Host
              </Link>
            </Section>
            <Text style={footerText}>
              Operado por Villa Retiro LLC • Cabo Rojo, PR<br />
              Este es un email automático de Salty Concierge
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const mainStyle: React.CSSProperties = {
  backgroundColor: '#FDFCFB',
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '20px 0',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '40px',
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
  border: '1px solid #f0f0f0',
};

const headerSection = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#FDFCFB',
  padding: '50px 40px',
  textAlign: 'center' as const,
  borderBottom: `2px dashed ${accentColor}20`,
});

const logoStyle: React.CSSProperties = {
  margin: '0 auto 0px',
};

const contentSection: React.CSSProperties = {
  padding: '40px',
};

const footerSection: React.CSSProperties = {
  padding: '0 40px 40px',
  textAlign: 'center' as const,
};

const hrStyle: React.CSSProperties = {
  borderTop: '1px solid #f0f0f0',
  margin: '20px 0',
};

const ctaSection: React.CSSProperties = {
  margin: '20px 0',
};

const whatsappButtonStyle: React.CSSProperties = {
  backgroundColor: '#25D366',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'inline-block',
};

const footerText: React.CSSProperties = {
  fontSize: '11px',
  color: '#999',
  marginTop: '20px',
  lineHeight: '1.5',
};
