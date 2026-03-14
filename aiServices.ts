import { supabase } from './lib/supabase.js';
import { parseICalData, getNightlyPrice, isSeasonalDate, validatePromoCode } from './utils.js';
import { PromoCode, SeasonalPrice, Booking } from './types.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
/**
 * 👑 AI SERVICES LAYER - THE EXECUTIVE BRAIN
 * Architecture: Bridge between LLM and Backend Logic
 */

// 1. Availability Connector (DB + iCal Real-time)
export const checkAvailabilityWithICal = async (villaId: string, checkIn: string, checkOut: string): Promise<{ available: boolean; reason?: string }> => {
    // Query DB
    const { data: dbBookings } = await supabase
        .from('bookings')
        .select('check_in, check_out, status, hold_expires_at')
        .eq('property_id', villaId)
        .neq('status', 'cancelled');

    const qIn = new Date(checkIn);
    const qOut = new Date(checkOut);

    const dbOverlap = (dbBookings || []).some((b: any) => {
        // Skip if it's an expired AI hold
        if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < new Date()) {
            return false;
        }

        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return qIn < bOut && qOut > bIn;
    });

    if (dbOverlap) return { available: false, reason: 'Ocupado por reserva interna.' };

    // Query iCal (needs to fetch property for URLs)
    const { data: property } = await supabase.from('properties').select('calendarSync').eq('id', villaId).single();
    if (property?.calendarSync && property.calendarSync.length > 0) {
        const syncPromises = property.calendarSync.map(async (sync: any) => {
            try {
                const response = await fetch(sync.url);
                const icalText = await response.text();
                const bookedDates = parseICalData(icalText);

                // Check dates in this feed
                let current = new Date(qIn);
                while (current < qOut) {
                    const dateStr = current.toISOString().split('T')[0];
                    if (bookedDates.includes(dateStr)) {
                        return { available: false, reason: `Ocupado en ${sync.platform}.` };
                    }
                    current.setDate(current.getDate() + 1);
                }
                return { available: true };
            } catch (e) {
                console.error(`iCal Check Error for ${sync.platform}:`, e);
                return { available: true }; // Continue if one feed fails
            }
        });

        const results = await Promise.all(syncPromises);
        const conflict = results.find(r => !r.available);
        if (conflict) return conflict;
    }

    return { available: true };
};

// 2. Lead & Abandonment Manager
export const logAbandonmentLead = async (data: { name: string; email?: string; phone?: string; interest: string }) => {
    const { error } = await supabase.from('leads').insert({
        ...data,
        status: 'new',
        created_at: new Date().toISOString()
    });
    return !error;
};

// 2.1 Temporary AI-Hold (Overbooking Prevention)
export const createTemporaryHold = async (propertyId: string, checkIn: string, checkOut: string, userId?: string) => {
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const { error } = await supabase.from('bookings').insert({
        property_id: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        user_id: userId || null,
        status: 'pending_ai_validation',
        hold_expires_at: holdExpiresAt,
        total_price: 0 // Placeholder
    });
    return !error;
};

// 3. Payment Verification Status
export const getPaymentVerificationStatus = async (bookingId: string): Promise<string> => {
    const { data: booking } = await supabase.from('bookings').select('payment_proof_url, status').eq('id', bookingId).single();
    if (!booking) return 'Reserva no encontrada.';
    if (booking.status === 'confirmed') return 'El pago ya ha sido verificado y confirmado.';
    if (booking.payment_proof_url) return 'He recibido tu imagen de comprobante. El Host la validará en breve para confirmar tu estancia.';
    return 'Aún no hemos recibido el comprobante de pago.';
};

// 4. Gap Automation (Revenue Optimization)
export const findCalendarGaps = async (propertyId: string): Promise<{ start: string; end: string; nights: number }[]> => {
    const { data: bookings } = await supabase
        .from('bookings')
        .select('check_in, check_out')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled')
        .order('check_in', { ascending: true });

    const gaps: { start: string; end: string; nights: number }[] = [];
    if (!bookings || bookings.length < 2) return gaps;

    for (let i = 0; i < bookings.length - 1; i++) {
        const endOfFirst = new Date(bookings[i].check_out);
        const startOfSecond = new Date(bookings[i + 1].check_in);
        const diffTime = Math.abs(startOfSecond.getTime() - endOfFirst.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0 && diffDays < 3) {
            gaps.push({
                start: bookings[i].check_out,
                end: bookings[i + 1].check_in,
                nights: diffDays
            });
        }
    }
    return gaps;
};

// 5. Sentinel Middleware (Sentiment & Guardrail)
export const handleCrisisAlert = async (name: string, message: string, contact: string, severity: number = 1) => {
    const sentimentScore = severity / 5; // Simplified mapping
    const { error } = await supabase.from('urgent_alerts').insert({
        name, message, contact, status: 'new', severity, sentiment_score: sentimentScore
    });
    return !error;
};

export const checkUserConcessions = async (userId: string): Promise<{ allowed: boolean; lastGrant?: string }> => {
    const { data: profile } = await supabase.from('profiles').select('given_concessions').eq('id', userId).single();
    if (!profile || !profile.given_concessions || profile.given_concessions.length === 0) return { allowed: true };

    // Check last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const recentConcession = profile.given_concessions.find((c: any) => new Date(c.date) > twelveMonthsAgo);
    if (recentConcession) return { allowed: false, lastGrant: recentConcession.date };

    return { allowed: true };
};

export const applyAIQuote = async (propertyId: string, checkIn: string, checkOut: string, promoCode?: string) => {
    const { data: property } = await supabase.from('properties').select('*').eq('id', propertyId).single();
    if (!property) throw new Error('Propiedad no encontrada.');

    let basePrice = 0;
    let hasSeasonal = false;
    let curr = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));

    while (curr < end) {
        const dStr = curr.toISOString().split('T')[0];
        if (isSeasonalDate(dStr, property.seasonal_prices || [])) hasSeasonal = true;
        basePrice += getNightlyPrice(property.price, dStr, property.seasonal_prices || []);
        curr.setDate(curr.getDate() + 1);
    }

    const fees = Object.entries(property.fees || {}).reduce((s, [_, v]) => s + (Number(v) || 0), 0);
    let total = basePrice + fees;
    let discount = 0;

    if (promoCode) {
        const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).single();
        if (promo) {
            const v = validatePromoCode(promo, nights, hasSeasonal);
            if (v.valid) {
                // Sentinel Guardrail: Max 15% discount limit for AI
                const safePercent = Math.min(promo.discount_percent, 15);
                discount = (basePrice * safePercent) / 100;
                total -= discount;
            }
        }
    }

    return { basePrice, fees, discount, total, nights, hasSeasonal };
};

// 6. Proactive Autonomous Onboarding (Salty Vía B Logistics)
export const generateOnboardingDraft = async (
    stage: 'mid_stay' | 'check_out',
    guestName: string,
    propertyTitle: string,
    checkOutDate: string
): Promise<string> => {
    let context = "";
    if (stage === 'mid_stay') {
        context = `Escribe un email súper corto de 'Día Medio' para el huésped. 
        Objetivo: Saludar, verificar que todo esté bien en la propiedad y recordarles que estás a una orden de WhatsApp de distancia. No ofrezcas servicios extras ni limpiezas adicionales.`;
    } else {
        context = `Escribe un email de 'Día antes del Check-Out' para el huésped.
        Objetivo: Agradecer su estancia, recordar amablemente que el checkout es a las 11:00 AM, pedirles que dejen la basura en los zafacones exteriores y que cierren bien las puertas. No ofrezcas late check-out ni servicios extras.`;
    }

    const prompt = `
        Eres "Salty", el concierge de lujo de Villa & Pirata Stays en Cabo Rojo.
        Tono: Caribeño-sofisticado, extremadamente cordial, educado y acogedor. Haces que el huésped se sienta en una propiedad de lujo. Mantén una distancia profesional pero con calidez impecable.
        
        Datos de la reserva:
        - Huésped: ${guestName}
        - Propiedad: ${propertyTitle}
        - Fecha de Salida (Check-Out): ${checkOutDate}
        
        Misión:
        ${context}
        
        Reglas estrictas:
        - NO uses placeholders como [tu nombre]. Firma como "Salty, Concierge".
        - REDACTA SOLO EL CUERPO DEL EMAIL. (No incluyas "Asunto:" ni etiquetas HTML).
        - Directo, pulido y profesional.
    `;

    try {
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt,
            temperature: 0.4
        });
        return text.trim();
    } catch (e) {
        console.error("Error generating draft:", e);
        return stage === 'mid_stay'
            ? `¡Hola ${guestName}! Soy Salty. Pasaba a saludarte y verificar que estés disfrutando de ${propertyTitle}. Si necesitas asistencia, responde este correo o escríbenos por WhatsApp. ¡Sigue disfrutando!`
            : `Estimado/a ${guestName}, esperamos que haya disfrutado su estancia en ${propertyTitle}. Le recordamos que el check-out es a las 11:00 AM el ${checkOutDate}. Por favor, deposite la basura en los zafacones exteriores y asegure bien las puertas al salir. ¡Buen viaje de regreso!`;
    }
};
