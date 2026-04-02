import { Property } from '../types/index.js';

/**
 * 🔱 INTEGRITY AUDITOR: Elite Standard Verification
 * 
 * Este módulo verifica que una propiedad cumpla con los estándares de 
 * "Villa & Pirata Boutique" antes de ser considerada 100% operativa.
 */

export interface AuditResult {
  score: number;
  passed: boolean;
  warnings: string[];
  recommendations: string[];
}

export const auditPropertyIntegrity = (property: Property): AuditResult => {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. Visual Integrity (Images)
  if (!property.images || property.images.length < 5) {
    score -= 20;
    warnings.push("Galería insuficiente: Se requieren al menos 5 fotos de alta fidelidad.");
    recommendations.push("Añadir fotos del baño y áreas comunes para aumentar la confianza.");
  }

  // 2. Data Integrity (Description & Title)
  if ((property.description || '').length < 100) {
    score -= 10;
    warnings.push("Descripción narrativa pobre.");
    recommendations.push("El Copy VIP sugiere expandir la historia de la villa.");
  }

  // 3. Amenity Integrity
  if (!property.amenities || property.amenities.length < 5) {
    score -= 15;
    warnings.push("Faltan amenidades críticas en el listado.");
  }

  // 4. Financial Integrity
  if (!property.price || property.price <= 0) {
    score -= 30;
    warnings.push("Precio base no configurado.");
  }

  if (!property.min_price_floor || property.min_price_floor <= 0) {
    score -= 10;
    recommendations.push("Configurar 'Min Price Floor' para blindaje de rentabilidad.");
  }

  // 5. Dynamic Check (Tax Rate)
  if (!property.tax_rate) {
    recommendations.push("Verificar tasa de IVU específica para la zona.");
  }

  return {
    score,
    passed: score >= 80,
    warnings,
    recommendations
  };
};
