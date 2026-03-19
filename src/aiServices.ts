import { supabase } from './lib/supabase.js';
import { parseICalData, getNightlyPrice, isSeasonalDate, validatePromoCode } from './utils.js';
import { PromoCode, SeasonalPrice, Booking } from './types.js';
import type { Tables } from './supabase_types.js';

type ProfileRow = Tables<'profiles'>;
type GivenConcession = { date: string; type: string; discount: number };
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || '',
});
const SALTY_MODEL = 'gemini-3-flash-preview'; // ⚡ Gemini 3 Flash (Mar 2026 - Oficial)

/**
 * 👑 AI SERVICES LAYER - THE EXECUTIVE BRAIN
 * Architecture: Bridge between LLM and Backend Logic
 */

// 1. Availability Connector — DB-First Architecture
//
// ARCHITECTURE NOTE:
// sync-ical.ts runs on every master-cron execution (every ~15 min via Vercel cron).
// It reads iCal feeds from Airbnb/Booking.com and UPSERTS them into the 'bookings'
// table with source='Airbnb' / 'Booking.com'. This means:
//
//   SOURCE OF TRUTH = bookings table (local + iCal-synced reservations, unified)
//
// We NO LONGER need a live iCal fetch here. That path was slow (~2-5s per feed),
// fragile (external URL timeouts), blocked by CORS, and returned stale data anyway.
// Instead we query Supabase, which already has the latest synced data.
//
// FALLBACK: If the cron hasn't run yet (first boot), we also check the property's
// 'blockedDates' array as a fast secondary guard.
export const checkAvailabilityWithICal = async (
    villaId: string,
    checkIn: string,
    checkOut: string
): Promise<{ available: boolean; reason?: string }> => {

    const qIn = new Date(checkIn);
    const qOut = new Date(checkOut);
    const now = new Date();

    // ── Step 1: Query unified bookings table (local + iCal-synced) ──────────
    type BookingAvailRow = { check_in: string; check_out: string; status: string | null; hold_expires_at: string | null; source: string | null };
    const { data: dbBookings, error: dbError } = await supabase
        .from('bookings')
        .select('check_in, check_out, status, hold_expires_at, source')
        .eq('property_id', villaId)
        .neq('status', 'cancelled');

    if (dbError) {
        console.error('[checkAvailability] DB error:', dbError.message);
        // Fail-open: don't block a booking due to a DB read error
        return { available: true };
    }

    const hasOverlap = (dbBookings as BookingAvailRow[] || []).some((b: BookingAvailRow) => {
        // Skip expired AI holds
        if (
            b.status === 'pending_ai_validation' &&
            b.hold_expires_at &&
            new Date(b.hold_expires_at) < now
        ) {
            return false;
        }

        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        // Standard overlap: query starts before booking ends AND query ends after booking starts
        return qIn < bOut && qOut > bIn;
    });

    if (hasOverlap) {
        const conflictingBooking = (dbBookings as BookingAvailRow[] | null || []).find((b: BookingAvailRow) => {
            if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return false;
            return new Date(b.check_in) < qOut && new Date(b.check_out) > qIn;
        });

        const source = conflictingBooking?.source;
        const reason = source && source !== 'Direct Web'
            ? `Fechas no disponibles — reservado vía ${source}.`
            : 'Fechas no disponibles — reserva directa existente.';

        return { available: false, reason };
    }

    // ── Step 1.5: Query pending leads (short-term locks) ──────────
    const { data: dbPending } = await supabase
        .from('pending_bookings')
        .select('check_in, check_out, expires_at')
        .eq('property_id', villaId)
        .eq('status', 'pending_payment');

    const hasPendingOverlap = (dbPending || []).some((p: { check_in: string; check_out: string; expires_at: string | null }) => {
        if (p.expires_at && new Date(p.expires_at) < now) return false;
        return qIn < new Date(p.check_out) && qOut > new Date(p.check_in);
    });

    if (hasPendingOverlap) {
        return { available: false, reason: 'Fechas bloqueadas temporalmente en proceso de pago.' };
    }

    // ── Step 2: Check availability_rules for Hard Blocks ─
    const { data: rules } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('property_id', String(villaId))
        .eq('is_blocked', true);

    if (rules && rules.length > 0) {
        let curr = new Date(qIn);
        while (curr < qOut) {
            const ds = curr.toISOString().split('T')[0];
            const isBlocked = rules.some((r: any) => ds >= r.start_date && ds <= r.end_date);
            if (isBlocked) {
                return { available: false, reason: 'Fechas bloqueadas manualmente por el anfitrión (Hard Block).' };
            }
            curr.setDate(curr.getDate() + 1);
        }
    }

    return { available: true };
};

// 2. Lead & Abandonment Manager
export const logAbandonmentLead = async (data: { name: string; email?: string; phone?: string; interest: string }) => {
    const { error } = await supabase.from('leads').insert({
        name: data.name,
        email: data.email || 'sin-email@anonymous.com',
        phone: data.phone || null,
        message: data.interest,   // Schema: 'interest' → maps to 'message' column
        status: 'new',
        tags: ['abandonment']     // Schema: tags[] column — mark origin for analytics
    });
    return !error;
};

// 2.1 Temporary AI-Hold (Overbooking Prevention)
export const createTemporaryHold = async (
    propertyId: string,
    checkIn: string,
    checkOut: string,
    userId?: string,
    customer_name?: string | null,
    phone_number?: string | null,
    special_requests?: string | null
) => {
    // 🛡️ REINFORCED RESOLUTION
    let finalId = String(propertyId).trim();
    const { data: byTitle } = await supabase.from('properties').select('id').ilike('title', `%${finalId}%`).limit(1).maybeSingle();
    if (byTitle) {
        finalId = String(byTitle.id);
    }

    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const status = 'pending_ai_validation';
    const source = 'Salty AI';

    // 1. Create the detailed lead first for Host visibility
    if (customer_name || phone_number || special_requests) {
        await supabase.from('leads').insert({
            name: customer_name || 'Huésped Anónimo (AI)',
            phone: phone_number || null,
            email: 'via-salty-ai@stays.com',
            message: `[AI HOLD] ${special_requests || 'Sin peticiones especiales'}. Fechas: ${checkIn} al ${checkOut}`,
            status: 'new',
            tags: ['ai-hold', finalId]
        }).catch(() => { });
    }

    // 2. Insert the Booking record (The actual calendar block)
    const content = `${finalId}|${checkIn}|${checkOut}|${status}`;
    const syncHash = Buffer.from(content).toString('base64');

    const { data: newHold, error } = await supabase.from('bookings').insert({
        property_id: String(finalId),
        check_in: checkIn,
        check_out: checkOut,
        user_id: userId || null,
        customer_name: customer_name || null,
        status: status,
        hold_expires_at: holdExpiresAt,
        total_price: 0,
        source: source,
        sync_last_hash: syncHash
    }).select().single();

    if (!error && newHold) return newHold.id;
    return null;
};

export const getPaymentVerificationStatus = async (bookingId: string): Promise<string> => {
    const { data: booking } = await supabase.from('bookings').select('payment_proof_url, status').eq('id', bookingId).maybeSingle();
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
    if (!profile || !profile.given_concessions) return { allowed: true };

    const concessions = profile.given_concessions as GivenConcession[];
    if (!Array.isArray(concessions) || concessions.length === 0) return { allowed: true };

    // Check last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const recentConcession = concessions.find((c) => new Date(c.date) > twelveMonthsAgo);
    if (recentConcession) return { allowed: false, lastGrant: recentConcession.date };

    return { allowed: true };
};

export const applyAIQuote = async (propertyId: string, checkIn: string, checkOut: string, promoCode?: string) => {
    // 🛡️ REINFORCED RESOLUTION: Try direct ID lookup first
    let { data: property, error: fetchError } = await supabase.from('properties')
        .select('*')
        .eq('id', String(propertyId).trim())
        .maybeSingle();

    // If ID fails, or it looks like a title/name, try title search
    if (!property || isNaN(Number(propertyId)) || propertyId.length < 5) {
        const { data: byTitle } = await supabase.from('properties')
            .select('*')
            .ilike('title', `%${propertyId.trim()}%`)
            .limit(1)
            .maybeSingle();
        if (byTitle) property = byTitle;
    }

    if (!property) {
        console.error(`[applyAIQuote] Critical Failure: Property not found. Input: "${propertyId}"`, fetchError);
        throw new Error(`Propiedad no encontrada [${propertyId}].`);
    }

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

    const tax = Number((basePrice * 0.07).toFixed(2));
    let total = basePrice + tax;
    let discount = 0;

    if (promoCode) {
        const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).maybeSingle();
        if (promo) {
            const v = validatePromoCode(promo, nights, hasSeasonal);
            if (v.valid) {
                const safePercent = Math.min(promo.discount_percent, 15);
                discount = (basePrice * safePercent) / 100;
                total -= discount;
            }
        }
    }

    return { basePrice, tax, discount, total: Number(total.toFixed(2)), nights, hasSeasonal };
};

// 6. Proactive Autonomous Onboarding (Salty Vía B Logistics)
export const generateOnboardingDraft = async (
    stage: 'check_in' | 'check_in_followup' | 'mid_stay' | 'check_out',
    guestName: string,
    propertyTitle: string,
    checkOutDate: string
): Promise<string> => {
    let mission = "";
    if (stage === 'check_in') {
        mission = `Escribe un mensaje de 'Bienvenida e Instrucciones de Acceso'.
        - Saluda con entusiasmo por su llegada mañana a la villa.
        - Indica que el check-in es a las 3:00 PM.
        - Dile que para Salty es un placer asistirles con cualquier duda sobre el funcionamiento de la casa (WiFi, Agua caliente, Equipos).
        - Deséales un viaje seguro.`;
    } else if (stage === 'check_in_followup') {
        mission = `Escribe un mensaje de 'Confirmación de Bienestar' (24h después de la llegada).
        - Pregunta si la primera noche fue perfecta y si todo está según lo prometido.
        - Recuérdales que el Manual de la Casa completo está disponible en la web para cualquier duda técnica.
        - Reitera que eres su Concierge Informativo para temas de la propiedad.`;
    } else if (stage === 'mid_stay') {
        mission = `Escribe un mensaje de 'Hospitality Check' Informativo.
        - Saluda y pregunta si el WiFi y los servicios de la villa están funcionando a su gusto.
        - Invítales a revisar el Manual si tienen dudas sobre el uso de la piscina o equipos.
        - Sé cordial y servicial sin ofrecer servicios externos.`;
    } else {
        mission = `Escribe un mensaje de 'Logística de Salida'.
        - Agradece que hayan cuidado la villa.
        - Recordatorios: Check-out 11:00 AM, basura en zafacones exteriores, apagar A/Cs y luces, llaves en lockbox.
        - Deséales un regreso seguro.`;
    }

    const prompt = `
    Eres Salty, el Caribbean Luxury Concierge.
    
    MISIÓN: ${mission}
    HUESPED: ${guestName}
    PROPIEDAD: ${propertyTitle}
    FECHA CLAVE: ${checkOutDate}

    REGLAS DE ETIQUETA (CRÍTICO):
    1. Comienza SIEMPRE con una frase de cortesía extrema, calidez y hospitalidad (ej: "Espero que su mañana en el paraíso esté siendo maravillosa...").
    2. La logística técnica (basura, llaves, reglas) debe ir en el segundo párrafo.
    3. Tono Sophisticated Caribbean. No ofrezcas servicios externos.

    Escribe solo el cuerpo del mensaje, sin asuntos ni firmas.
    `.trim();
    try {
        const response = await ai.models.generateContent({
            model: SALTY_MODEL,
            contents: prompt,
            config: { temperature: 0.4 }
        });
        const text = response.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || '')
            .join('') || '';
        return text.trim();
    } catch (e) {
        console.error("Error generating draft:", e);
        return stage === 'mid_stay'
            ? `¡Hola ${guestName}! Soy Salty. Pasaba a saludarte y verificar que estés disfrutando de tu estancia en ${propertyTitle}. Si quieres una aventura hoy, no dejes de visitar los spots locales. ¡Cualquier cosa, aquí estoy!`
            : `Hola ${guestName}, esperamos que hayas disfrutado tu estancia en ${propertyTitle}. Solo un recordatorio de que el check-out es a las 11:00 AM. Por favor, recuerda dejar la basura fuera y cerrar bien puertas y portón. ¡Buen viaje de regreso!`;
    }
};
