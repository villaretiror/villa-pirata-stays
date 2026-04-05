import React from 'react';
import { Section, Text, Link, Container } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface LeadRecoveryProps {
  firstName: string;
  propertyName: string;
  logoUrl: string;
  accentColor: string;
  recoveryUrl: string;
}

export const LeadRecoveryTemplate: React.FC<LeadRecoveryProps> = ({
  firstName,
  propertyName,
  logoUrl,
  accentColor,
  recoveryUrl,
}) => {
  return (
    <BaseLayout
      previewText={`🏝️ ¿Aún pensando en el paraíso, ${firstName}?`}
      logoUrl={logoUrl}
      accentColor={accentColor}
      propertyName={propertyName}
    >
      <Section style={mainSectionStyle}>
        <Text style={h2Style}>¿Olvidaste algo en la orilla?</Text>
        <Section style={dividerMiniStyle(accentColor)} />
        <Text style={pStyle}>
          Hola, {firstName}. Soy <strong>Salty</strong>, el concierge digital de {propertyName}.
        </Text>
        <Text style={pStyle}>
          Noté que la brisa de Cabo Rojo te llamó, pero la reserva no se completó. Tus fechas siguen disponibles, pero <b>otras 2 personas</b> acaban de consultar por {propertyName} en las últimas horas.
        </Text>

        <Section style={bunkerBox}>
            <Text style={bunkerTitle(accentColor)}>🛡️ Reserva con Paz Total</Text>
            <Text style={bunkerText}>Recuerda que somos un <b>Bunker Premium</b>: Energía Solar 24/7 y Cisterna Industrial. Pase lo que pase afuera, en tu villa la vida sigue sin interrupciones.</Text>
        </Section>

        <Section style={ctaSectionStyle}>
          <Link href={recoveryUrl} style={ctaButtonStyle(accentColor)}>
            ✨ Asegurar Mi Refugio Ahora
          </Link>
          <Text style={ctaSubText}>Trato Directo: Sin comisiones ocultas.</Text>
        </Section>

        <Text style={saltySignatureStyle}>
          "En la Villa, el tiempo se mide en olas y sonrisas. No dejes que las tuyas se escapen." — Salty
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

const dividerMiniStyle = (accentColor: string): React.CSSProperties => ({
  width: '40px',
  height: '2px',
  backgroundColor: accentColor,
  margin: '20px auto',
});

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

const bunkerBox: React.CSSProperties = {
    backgroundColor: '#F9FBF2',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid #D4AF3740',
    margin: '20px 0',
    textAlign: 'left' as const,
};

const bunkerTitle = (accentColor: string): React.CSSProperties => ({
    fontSize: '12px',
    fontWeight: 'bold',
    color: accentColor,
    margin: '0 0 5px 0',
    textTransform: 'uppercase' as const,
});

const bunkerText: React.CSSProperties = {
    fontSize: '13px',
    color: '#4A4A4A',
    lineHeight: '1.5',
    margin: '0',
};

const ctaSubText: React.CSSProperties = {
    fontSize: '11px',
    color: '#888',
    marginTop: '15px',
};
