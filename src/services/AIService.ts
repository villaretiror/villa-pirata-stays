import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/SupabaseService';
import { parseICalData, getNightlyPrice, isSeasonalDate, validatePromoCode } from '../utils';
import { FinanceService } from './FinanceService';
import { PromoCode, SeasonalPrice, Booking } from '../types';
import { VILLA_KNOWLEDGE } from '../constants/villa_knowledge';
import * as GoogleGenAIModule from '@google/genai';
import type { Tables } from '../types/supabase';

// 🔱 ROBUST ESM INTEROP: Detect if it's a named export, default export, or a namespace.
const GoogleGenAIClass: any = (GoogleGenAIModule as any).GoogleGenAI || (GoogleGenAIModule as any).default || GoogleGenAIModule;

// 🛡️ Safe Environment Access for Browser Runtime
const getSaltyEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`] || '';
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
  }
  return '';
};

// 🔱 INITIALIZE AI (GEMINI)
const ai = new GoogleGenAIClass({
    apiKey: getSaltyEnv('GOOGLE_GENERATIVE_AI_API_KEY') || getSaltyEnv('GEMINI_API_KEY') || '',
});
const SALTY_MODEL = 'gemini-2.0-flash'; // ⚡ Gemini 2.0 Flash

type ProfileRow = Tables<'profiles'>;
type GivenConcession = { date: string; type: string; discount: number };

/**
 * 🔱 KNOWLEDGE SEARCH ENGINE (ANTI-HALLUCINATION)
 * Centralized logic to query static and dynamic knowledge for Salty Vapi and Chat.
 */
export const queryPropertyKnowledge = async (
    query: string, 
    rawPropertyId?: string, 
    client?: SupabaseClient,
    options: { channel?: 'vapi' | 'web' } = {}
): Promise<{ ok: boolean, answer: string, propertyFacts?: any, needsHumanFollowup?: boolean, sources?: string[] }> => {
    const sb = client || supabase;
    const propertyId = rawPropertyId ? await resolvePropertyId(rawPropertyId, sb) : '1081171030449673920';

    // 1. Fetch Essential Structural Data (DB-First)
    const { data: prop, error: dbError } = await sb.from('properties')
        .select(`
            title, subtitle, description, 
            bedrooms, beds, baths, guests, 
            amenities, house_rules, policies
        `)
        .eq('id', propertyId)
        .maybeSingle();

    if (dbError || !prop) {
        return { 
            ok: false, 
            answer: "En este momento no tengo ese dato exacto. ¿Desea que le contacte al equipo por mensaje?",
            needsHumanFollowup: true
        };
    }

    const q = query.toLowerCase();
    let answer = "";
    
    // Extract Property Facts for potential reuse
    const propertyFacts = {
        title: prop.title,
        bedrooms: prop.bedrooms,
        beds: prop.beds,
        baths: prop.baths,
        guests: prop.guests,
        checkIn: prop.policies?.checkInTime,
        checkOut: prop.policies?.checkOutTime,
        wifiName: prop.policies?.wifiName,
        wifiPass: prop.policies?.wifiPass,
        accessCode: prop.policies?.accessCode
    };

    // ── INTENT ROUTER (High Certainty) ─────────────────────
    if (q.includes('habitaci') || q.includes('dormitorio') || q.includes('cama') || q.includes('baño') || q.includes('capacidad') || q.includes('persona') || q.includes('cuarto')) {
        answer = `La propiedad ${prop.title} cuenta con ${prop.bedrooms} habitaciones, ${prop.beds} camas y ${prop.baths} baños. Tiene una capacidad total para hospedar a ${prop.guests} personas con total comodidad.`;
    }
    else if (q.includes('amenidad') || q.includes('incluye') || q.includes('tiene') || q.includes('hay') || q.includes('cuenta con')) {
        const amenitiesList = (prop.amenities || []).slice(0, 8);
        const specificSearch = (prop.amenities || []).find((a: string) => q.includes(a.toLowerCase()));

        if (specificSearch) {
            answer = `Sí, la propiedad cuenta con ${specificSearch}. Además de otras amenidades principales como ${amenitiesList.filter((a: string) => a !== specificSearch).slice(0, 5).join(', ')}.`;
        } else if (amenitiesList.length > 0) {
            answer = `La villa incluye ${amenitiesList.join(', ')} y más. ¿Busca alguna amenidad en particular?`;
        } else {
            answer = "La propiedad cuenta con todas las amenidades esenciales para una estancia de lujo. ¿Desea saber sobre algo específico como piscina o aire acondicionado?";
        }
    }
    else if (q.includes('check-in') || q.includes('entrada') || q.includes('llegada') || q.includes('salida') || q.includes('check-out') || q.includes('horario')) {
        answer = `El horario de entrada es a las ${prop.policies?.checkInTime || '3:00 PM'} y el horario de salida es a las ${prop.policies?.checkOutTime || '11:00 AM'}.`;
    }
    else if (q.includes('regla') || q.includes('norma') || q.includes('fumar') || q.includes('mascota') || q.includes('perro') || q.includes('fiesta') || q.includes('evento')) {
        const rules = (prop.house_rules || []).slice(0, 5);
        if (rules.length > 0) {
            answer = `Nuestras reglas principales son: ${rules.join('. ')}.`;
        } else {
            answer = "Buscamos mantener un ambiente de respeto y tranquilidad. No se permite fumar en interiores ni realizar fiestas masivas. ¿Tiene alguna duda sobre una regla específica?";
        }
    }
    else if (q.includes('wifi') || q.includes('internet') || q.includes('clave') || q.includes('acceso') || q.includes('entrar') || q.includes('código')) {
        const { wifiName, wifiPass, accessCode } = prop.policies || {};
        if (wifiName && wifiPass) {
            answer = `La red WiFi es ${wifiName} y la clave es ${wifiPass}. El código de acceso para su entrada es ${accessCode || 'enviado al confirmar su reserva'}.`;
        } else {
            answer = "La información de red y códigos de acceso se comparten de forma privada una vez confirmada la reserva por motivos de seguridad.";
        }
    }
    else if (q.includes('cancelaci') || q.includes('reembolso') || q.includes('devoluci') || q.includes('cancelar')) {
        const policy = prop.policies?.cancellationPolicy || "Nuestra política varía según la temporada de reserva. Generalmente es estricta pero justa para proteger su estancia.";
        answer = policy.length > 180 ? policy.substring(0, 180) + "..." : policy;
    }

    // ── FALLBACK STAGE (Gemini Reasoning) ──────────────────
    if (!answer) {
        if (options.channel === 'vapi') {
            return {
                ok: false,
                answer: "En este momento no tengo ese dato exacto. ¿Desea que le contacte al equipo por mensaje?",
                needsHumanFollowup: true
            };
        }

        try {
            const prompt = `Responde como Salty, el Concierge de Élite. Sé profesional, neutro y sofisticado. No uses vocativos (como Capitán).
            
            PROTOCOLO "NEVER SAY NO" (VENTA CRUZADA):
            - Si una villa está ocupada para las fechas consultadas, DEBES buscar disponibilidad en la otra villa (Villa Retiro R vs Pirata Family House) y sugerirla proactivamente.
            - Si ambas están ocupadas, sugiere el hueco de disponibilidad más cercano.
            
            Basa tu respuesta únicamente en estos datos de la propiedad:
            Título: ${prop.title}
            Descripción: ${prop.description}
            Amenidades: ${(prop.amenities || []).join(', ')}
            Reglas: ${(prop.house_rules || []).join(', ')}
            
            Pregunta: "${query}"`;

            const result = await ai.models.generateContent({
                model: SALTY_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { temperature: 0.1, maxOutputTokens: 250 }
            });

            answer = result.candidates?.[0]?.content?.parts?.[0]?.text || "Ese detalle no figura en mis registros actuales. ¿Gusta que consulte al equipo?";
        } catch (e) {
            answer = "En este momento no tengo ese dato exacto. ¿Desea que le contacte al equipo por mensaje?";
        }
    }

    return {
        ok: true,
        answer: answer.trim(),
        propertyFacts,
        sources: ['Supabase DB - Structural']
    };
};

export const resolvePropertyId = async (input: string, client: SupabaseClient): Promise<string> => {
    let cleanInput = String(input).trim();
    if (!isNaN(Number(cleanInput)) && cleanInput.length >= 8) return cleanInput;
    if (cleanInput.length > 20) return cleanInput; 

    const lower = cleanInput.toLowerCase();
    if (lower.includes('retiro') || lower.includes('villa') || lower.includes('retiro r')) return '1081171030449673920';
    if (lower.includes('pirata') || lower.includes('family') || lower.includes('house')) return '42839458';

    const fillers = ['para', 'en', 'la', 'mi', 'una', 'esta', 'cerca', 'de', 'el', 'reservar'];
    let fuzzy = cleanInput.toLowerCase();
    fillers.forEach(f => fuzzy = fuzzy.replace(f, ''));
    fuzzy = fuzzy.trim();

    const { data: byTitle } = await client.from('properties')
        .select('id')
        .ilike('title', `%${fuzzy || cleanInput}%`)
        .limit(1)
        .maybeSingle();

    if (byTitle) return String(byTitle.id);

    const { data: secondTry } = await client.from('properties')
        .select('id')
        .ilike('title', `%${cleanInput}%`)
        .limit(1)
        .maybeSingle();

    return secondTry ? String(secondTry.id) : cleanInput;
};

export const checkAvailabilityWithICal = async (
    villaId: string,
    checkIn: string,
    checkOut: string,
    customSupabase?: SupabaseClient
): Promise<{ available: boolean; reason?: string; is_request_only?: boolean; unavailableLine?: string }> => {
    const client = customSupabase || supabase;
    const qIn = new Date(checkIn);
    const qOut = new Date(checkOut);
    const now = new Date();

    if (isNaN(qIn.getTime()) || isNaN(qOut.getTime())) {
        return { available: false, reason: 'Lo lamento, Capitán, pero mis brújulas no reconocen esas fechas. ¿Podría ser más específico con el día y el mes?' };
    }

    const finalId = await resolvePropertyId(villaId, client);
    const { data: propSettings } = await client.from('properties').select('sync_settings').eq('id', finalId).single();
    const minNights = propSettings?.sync_settings?.min_nights || 2;
    const allowRequestsBeyond = propSettings?.sync_settings?.allow_requests_beyond || false;
    const diffTime = qOut.getTime() - qIn.getTime();
    const nights = Math.ceil(diffTime / (1000 * 3600 * 24));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(qIn);
    checkInDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        return {
            available: false,
            reason: `El tiempo fluye hacia adelante en el Caribe. Esa fecha ya ha pasado por nuestro horizonte. ¿Podríamos buscar una estancia en el futuro?`,
            unavailableLine: `Lo siento, esa fecha ya ha pasado. Por favor, sugiera un rango en el futuro.`
        };
    }

    if (nights < minNights) {
        return {
            available: false,
            reason: `Esta estancia no cumple con el mínimo de ${minNights} noches requerido para esta propiedad.`,
            unavailableLine: `Esa estancia no cumple con el mínimo de ${minNights} noches requerido para esta propiedad.`
        };
    }

    const availabilityWindowMonths = propSettings?.sync_settings?.availability_window || 6;
    const windowDate = new Date();
    windowDate.setMonth(windowDate.getMonth() + availabilityWindowMonths);
    const isBeyondWindow = qIn > windowDate;

    type BookingAvailRow = { check_in: string; check_out: string; status: string | null; hold_expires_at: string | null; source: string | null };
    
    const [bookingRes, syncedRes] = await Promise.all([
        client.from('bookings').select('check_in, check_out, status, hold_expires_at, source').eq('property_id', finalId).neq('status', 'cancelled'),
        client.from('synced_blocks').select('check_in, check_out, source').eq('property_id', finalId)
    ]);

    if (bookingRes.error || syncedRes.error) {
        return { available: false, reason: 'Capitán, mis cartas náuticas están algo nubladas en este momento.' };
    }

    const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
    const nativeOverlap = (bookingRes.data as BookingAvailRow[] || []).find((b: BookingAvailRow) => {
        if (!BLOCKING_STATUSES.includes(b.status || '')) return false;
        if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return false;
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return qIn < bOut && qOut > bIn;
    });

    if (nativeOverlap) {
        return { available: false, reason: `Fechas ya ocupadas por una reserva directa.` };
    }

    const externalOverlap = (syncedRes.data || []).find((b: any) => {
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return qIn < bOut && qOut > bIn;
    });

    if (externalOverlap) {
        return { available: false, reason: `Fechas no disponibles — reservado vía ${externalOverlap.source}.` };
    }

    const { data: dbPending } = await client.from('pending_bookings').select('check_in, check_out, expires_at').eq('property_id', finalId).eq('status', 'pending_payment');
    const hasPendingOverlap = (dbPending || []).some((p: any) => {
        if (p.expires_at && new Date(p.expires_at) < now) return false;
        return qIn < new Date(p.check_out) && qOut > new Date(p.check_in);
    });

    if (hasPendingOverlap) {
        return { available: false, reason: 'Fechas bloqueadas temporalmente en proceso de pago.' };
    }

    const { data: rules } = await client.from('availability_rules').select('*').eq('property_id', finalId).eq('is_blocked', true);
    if (rules && rules.length > 0) {
        let curr = new Date(qIn);
        while (curr < qOut) {
            const ds = curr.toISOString().split('T')[0];
            const isBlocked = rules.some((r: any) => ds >= r.start_date && ds <= r.end_date);
            if (isBlocked) {
                if (allowRequestsBeyond) return { available: false, is_request_only: true, reason: 'Esa fecha está bloqueada, pero puedo enviar su petición al anfitrión.' };
                return { available: false, reason: 'Fechas bloqueadas manualmente.' };
            }
            curr.setDate(curr.getDate() + 1);
        }
    }

    if (isBeyondWindow) {
        if (allowRequestsBeyond) return { available: false, is_request_only: true, reason: `horizonte lejano (> ${availabilityWindowMonths} meses).` };
        return { available: false, reason: `Solo aceptamos reservas hasta ${availabilityWindowMonths} meses.` };
    }

    return { available: true };
};

export const findNextAvailability = async (
    propertyId: string, 
    afterDate?: string, 
    nights?: number,
    customSupabase?: SupabaseClient
): Promise<{ ok: boolean; found: boolean; nextAvailabilityLine?: string; data?: any }> => {
    const client = customSupabase || supabase;
    const finalId = await resolvePropertyId(propertyId, client);
    const { data: prop } = await client.from('properties').select('sync_settings, title').eq('id', finalId).single();
    const minNights = nights || prop?.sync_settings?.min_nights || 2;
    const propTitle = prop?.title || "nuestra villa";

    const gapsRes: any = await findCalendarGaps(finalId, client);
    const slots = gapsRes.slots || [];
    const validGap = slots.find((g: any) => g.nights >= minNights);

    if (!validGap) return { ok: true, found: false, nextAvailabilityLine: "No encontré huecos disponibles." };

    try {
        const quote = await applyAIQuote(finalId, validGap.start, validGap.end, undefined, client);
        const dateStr = new Date(validGap.start + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const endStr = new Date(validGap.end + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        
        return {
            ok: true,
            found: true,
            nextAvailabilityLine: `Hé encontrado un horizonte despejado en ${propTitle} del ${dateStr} al ${endStr}, por $${quote.total}.`,
            data: { startDate: validGap.start, endDate: validGap.end, nights: quote.nights, priceTotal: quote.total, propertyTitle: propTitle }
        };
    } catch (e) {
        return { ok: true, found: true, nextAvailabilityLine: `Disponible el ${validGap.start}.` };
    }
};

export const findAlternatePropertyAvailable = async (
    excludedVillaId: string,
    checkIn: string,
    checkOut: string,
    customSupabase?: SupabaseClient
): Promise<{ id: string, title: string, alternateSuggestionLine?: string } | null> => {
    const client = customSupabase || supabase;
    const { data: others } = await client.from('properties').select('id, title').neq('id', excludedVillaId);
    if (!others || others.length === 0) return null;

    const availabilityChecks = await Promise.all(others.map(async (p: any) => {
        const avail = await checkAvailabilityWithICal(String(p.id), checkIn, checkOut, client);
        return { ...p, available: avail.available };
    }));

    const firstAvailable = availabilityChecks.find(p => p.available);
    if (firstAvailable) {
        return { 
            id: String(firstAvailable.id), 
            title: firstAvailable.title,
            alternateSuggestionLine: `Tengo disponible "${firstAvailable.title}".`
        };
    }
    return null;
};

export const logAbandonmentLead = async (data: { full_name: string; email?: string; phone?: string; interest: string }) => {
    const { error } = await supabase.from('leads').insert({
        full_name: data.full_name,
        email: data.email || 'sin-email@anonymous.com',
        phone: data.phone || null,
        message: data.interest,
        status: 'new',
        tags: ['abandonment']
    });
    return !error;
};

export const createTemporaryHold = async (
    propertyId: string,
    checkIn: string,
    checkOut: string,
    userId?: string,
    customer_name?: string | null,
    phone_number?: string | null,
    special_requests?: string | null
) => {
    const finalId = await resolvePropertyId(propertyId, supabase);
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const status = 'pending_ai_validation';

    if (customer_name || phone_number || special_requests) {
        await supabase.from('leads').insert({
            full_name: customer_name || 'Huésped Anónimo (AI)',
            phone: phone_number || null,
            email: 'via-salty-ai@stays.com',
            message: `[AI HOLD] ${special_requests || 'Sin peticiones'}. Fechas: ${checkIn}-${checkOut}`,
            status: 'new',
            tags: ['ai-hold', finalId]
        }).catch(() => { });
    }

    const { data: newHold, error } = await supabase.from('bookings').insert({
        property_id: String(finalId),
        check_in: checkIn,
        check_out: checkOut,
        user_id: userId || null,
        customer_name: customer_name || null,
        status: status,
        hold_expires_at: holdExpiresAt,
        total_price: 0,
        source: 'Salty AI'
    }).select().single();

    return newHold?.id || null;
};

export const getPaymentVerificationStatus = async (bookingId: string): Promise<string> => {
    const { data: booking } = await supabase.from('bookings').select('payment_proof_url, status').eq('id', bookingId).maybeSingle();
    if (!booking) return 'No encontrada.';
    if (booking.status === 'confirmed') return 'Verificado.';
    if (booking.payment_proof_url) return 'Recibido.';
    return 'Pendiente.';
};

export const findCalendarGaps = async (propertyId: string, customSupabase?: SupabaseClient) => {
    const client = customSupabase || supabase;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const finalId = await resolvePropertyId(propertyId, client);
    const { data: prop } = await client.from('properties').select('sync_settings').eq('id', finalId).single();
    const minNights = prop?.sync_settings?.min_nights || 2;

    const { data: bookings } = await client
        .from('bookings')
        .select('check_in, check_out, source')
        .eq('property_id', finalId)
        .neq('status', 'cancelled')
        .gte('check_out', todayStr)
        .order('check_in', { ascending: true });

    const realBookings = bookings || [];
    const gaps: any[] = [];
    let lastCheckout = new Date(todayStr + 'T12:00:00');

    for (const b of realBookings) {
        const bIn = new Date(b.check_in + 'T12:00:00');
        const bOut = new Date(b.check_out + 'T12:00:00');
        if (bIn > lastCheckout) {
            const diffDays = Math.ceil((bIn.getTime() - lastCheckout.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= minNights) {
                gaps.push({ start: lastCheckout.toISOString().split('T')[0], end: b.check_in, nights: diffDays });
            }
        }
        if (bOut > lastCheckout) lastCheckout = bOut;
        if (gaps.length >= 5) break;
    }

    if (gaps.length < 5) {
        const finalLimit = new Date();
        finalLimit.setMonth(finalLimit.getMonth() + 6);
        if (lastCheckout < finalLimit) {
            const diffDays = Math.ceil((finalLimit.getTime() - lastCheckout.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= minNights) {
                gaps.push({ start: lastCheckout.toISOString().split('T')[0], end: finalLimit.toISOString().split('T')[0], nights: diffDays });
            }
        }
    }
    return { slots: gaps, min_nights: minNights, property_id: finalId };
};

export const handleCrisisAlert = async (full_name: string, message: string, contact: string, propertyId?: string, severity: number = 1) => {
    const { error } = await supabase.from('urgent_alerts').insert({
        full_name, message, contact, property_id: propertyId, status: 'new', severity, sentiment_score: severity / 5
    });
    return !error;
};

export const checkUserConcessions = async (userId: string): Promise<{ allowed: boolean; lastGrant?: string }> => {
    const { data: profile } = await supabase.from('profiles').select('given_concessions').eq('id', userId).single();
    if (!profile?.given_concessions) return { allowed: true };
    const concessions = profile.given_concessions as GivenConcession[];
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const recent = concessions.find((c) => new Date(c.date) > twelveMonthsAgo);
    return recent ? { allowed: false, lastGrant: recent.date } : { allowed: true };
};

export const applyAIQuote = async (propertyId: string, checkIn: string, checkOut: string, promoCode?: string, customSupabase?: SupabaseClient) => {
    const client = customSupabase || supabase;
    const finalId = await resolvePropertyId(propertyId, client);
    const { data: property } = await client.from('properties').select('*').eq('id', finalId).maybeSingle();
    if (!property) throw new Error(`Propiedad no encontrada [${propertyId}].`);

    try {
        let promo = null;
        if (promoCode) {
            const { data } = await client.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).maybeSingle();
            promo = data;
        }
        const quote = FinanceService.calculateReservation({
            property: property as any,
            startDate: new Date(`${checkIn}T12:00:00`),
            endDate: new Date(`${checkOut}T12:00:00`),
            promo: promo
        });
        return {
            basePrice: quote.nightsTotal,
            tax: quote.ivuAmount,
            discount: quote.discountAmount,
            total: quote.total,
            nights: quote.nights,
            hasSeasonal: quote.hasSeasonalNight,
            security_deposit: property.security_deposit || 0,
            cleaningFee: quote.cleaningFee,
            serviceFee: quote.serviceFee
        };
    } catch (err: any) { throw err; }
};

export const generateOnboardingDraft = async (
    stage: 'check_in' | 'check_in_followup' | 'mid_stay' | 'check_out',
    guestName: string,
    propertyTitle: string,
    checkOutDate: string
): Promise<string> => {
    let mission = "";
    if (stage === 'check_in') mission = "Bienvenida e Instrucciones";
    else if (stage === 'check_in_followup') mission = "Confirmación de Bienestar";
    else if (stage === 'mid_stay') mission = "Hospitality Check";
    else mission = "Logística de Salida";

    try {
        const prompt = `Responde como Salty Concierge. Misión: ${mission}. Huésped: ${guestName}. Propiedad: ${propertyTitle}. Fecha: ${checkOutDate}`;
        const result = await ai.models.generateContent({
            model: SALTY_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.7 }
        });
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "¡Buen viaje!";
    } catch (e) { return "¡Buen viaje!"; }
};
