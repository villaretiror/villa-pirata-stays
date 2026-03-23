/**
 * 🕵️‍♂️ SHADOW MODE VALIDATOR: Contrast & Accessibility Guard
 * 
 * Este módulo asegura que el 'Salty Mode' (Night Theme) cumpla con los 
 * estándares de legibilidad para la orquestación de élite.
 */

export const checkSaltyContrast = () => {
  // Colores definidos en index.css para .salty-mode
  const nightBackground = '#050A18';
  const nightForeground = '#F3F4F6';
  const goldAccent = '#D4AF37';

  const getLuminance = (hex: string) => {
    const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0];
    const a = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (l1: number, l2: number) => {
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const lBg = getLuminance(nightBackground);
  const lFg = getLuminance(nightForeground);
  const lGold = getLuminance(goldAccent);

  const mainContrast = getContrastRatio(lBg, lFg);
  const goldContrast = getContrastRatio(lBg, lGold);

  console.log(`[Shadow Mode] Main Contrast: ${mainContrast.toFixed(2)}:1`);
  console.log(`[Shadow Mode] Gold Contrast: ${goldContrast.toFixed(2)}:1`);

  // WCAG AAA requiere 7:1 para texto normal
  const isHealthy = mainContrast >= 7;
  
  if (!isHealthy) {
    console.warn("⚠️ SHADOW MODE WARNING: El contraste nocturno es insuficiente para los estándares de élite.");
  } else {
    console.log("🔱 SHADOW MODE VALIDATED: Legibilidad nocturna óptima.");
  }

  return {
    isHealthy,
    mainContrast,
    goldContrast,
    timestamp: new Date().toISOString()
  };
};
