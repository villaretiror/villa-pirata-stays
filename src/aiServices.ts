import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './lib/supabase.js';
import { parseICalData, getNightlyPrice, isSeasonalDate, validatePromoCode } from './utils.js';
import { FinanceService } from './services/FinanceService.js';
import { PromoCode, SeasonalPrice, Booking } from './types.js';
import { VILLA_KNOWLEDGE } from './constants/villa_knowledge.js';
import * as GoogleGenAIModule from '@google/genai';

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

import type { Tables } from './supabase_types.js';

type ProfileRow = Tables<'profiles'>;
type GivenConcession = { date: string; type: string; discount: number };

/**
 * 🔱 KNOWLEDGE SEARCH ENGINE (ANTI-HALLUCINATION)
 * Centralized logic to query static and dynamic knowledge for Salty Vapi and Chat.
 */
/**
 * 🔱 KNOWLEDGE SEARCH ENGINE (ANTI-HALLUCINATION) - LEVEL 10
 * Centralized logic to query property data with DB-First priority.
 * Implements strict intent routing for Specs, Amenities, Rules, and Policies.
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

    // A) Specs: Rooms, Beds, Capacity
    if (q.includes('habitaci') || q.includes('dormitorio') || q.includes('cama') || q.includes('baño') || q.includes('capacidad') || q.includes('persona') || q.includes('cuarto')) {
        answer = `La propiedad ${prop.title} cuenta con ${prop.bedrooms} habitaciones, ${prop.beds} camas y ${prop.baths} baños. Tiene una capacidad total para hospedar a ${prop.guests} personas con total comodidad.`;
    }

    // B) Amenities: What includes? Pool? WiFi?
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

    // C) Logistics: Check-in / Check-out
    else if (q.includes('check-in') || q.includes('entrada') || q.includes('llegada') || q.includes('salida') || q.includes('check-out') || q.includes('horario')) {
        answer = `El horario de entrada es a las ${prop.policies?.checkInTime || '3:00 PM'} y el horario de salida es a las ${prop.policies?.checkOutTime || '11:00 AM'}.`;
    }

    // D) Rules: Smoking, Pets, Events
    else if (q.includes('regla') || q.includes('norma') || q.includes('fumar') || q.includes('mascota') || q.includes('perro') || q.includes('fiesta') || q.includes('evento')) {
        const rules = (prop.house_rules || []).slice(0, 5);
        if (rules.length > 0) {
            answer = `Nuestras reglas principales son: ${rules.join('. ')}.`;
        } else {
            answer = "Buscamos mantener un ambiente de respeto y tranquilidad. No se permite fumar en interiores ni realizar fiestas masivas. ¿Tiene alguna duda sobre una regla específica?";
        }
    }

    // E) Connectivity & Access: WiFi, Codes
    else if (q.includes('wifi') || q.includes('internet') || q.includes('clave') || q.includes('acceso') || q.includes('entrar') || q.includes('código')) {
        const { wifiName, wifiPass, accessCode } = prop.policies || {};
        if (wifiName && wifiPass) {
            answer = `La red WiFi es ${wifiName} y la clave es ${wifiPass}. El código de acceso para su entrada es ${accessCode || 'enviado al confirmar su reserva'}.`;
        } else {
            answer = "La información de red y códigos de acceso se comparten de forma privada una vez confirmada la reserva por motivos de seguridad.";
        }
    }

    // F) Cancellation Policies
    else if (q.includes('cancelaci') || q.includes('reembolso') || q.includes('devoluci') || q.includes('cancelar')) {
        const policy = prop.policies?.cancellationPolicy || "Nuestra política varía según la temporada de reserva. Generalmente es estricta pero justa para proteger su estancia.";
        answer = policy.length > 180 ? policy.substring(0, 180) + "..." : policy;
    }

    // ── FALLBACK STAGE (Gemini Reasoning) ──────────────────
    if (!answer) {
        // For Vapi, we prefer a safe fallback over hallucinations
        if (options.channel === 'vapi') {
            return {
                ok: false,
                answer: "En este momento no tengo ese dato exacto. ¿Desea que le contacte al equipo por mensaje?",
                needsHumanFollowup: true
            };
        }

        // For Web Chat, use Gemini for more flexible answers (keeping the prompt strict)
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

// 🔱 MASTER PROPERTY RESOLVER: Converts human names/IDs to confirmed DB IDs
export const resolvePropertyId = async (input: string, client: SupabaseClient): Promise<string> => {
    let cleanInput = String(input).trim();

    // 1. Direct check (If it's a valid ID)
    if (!isNaN(Number(cleanInput)) && cleanInput.length >= 8) return cleanInput;
    if (cleanInput.length > 20) return cleanInput; // UUID-like

    // 🔱 PRIORITY SHORT-MAP: Instant recognition for keywords (Ultra-Tolerant)
    const lower = cleanInput.toLowerCase();
    if (lower.includes('retiro') || lower.includes('villa') || lower.includes('retiro r')) return '1081171030449673920';
    if (lower.includes('pirata') || lower.includes('family') || lower.includes('house')) return '42839458';

    // 2. Fuzzy Clean (Remove fillers and PR regionalisms)
    const fillers = ['para', 'en', 'la', 'mi', 'una', 'esta', 'cerca', 'de', 'el', 'reservar'];
    let fuzzy = cleanInput.toLowerCase();
    fillers.forEach(f => fuzzy = fuzzy.replace(f, ''));
    fuzzy = fuzzy.trim();

    // 3. Search by title
    const { data: byTitle } = await client.from('properties')
        .select('id')
        .ilike('title', `%${fuzzy || cleanInput}%`)
        .limit(1)
        .maybeSingle();

    if (byTitle) return String(byTitle.id);

    // 4. Fallback search (Original input)
    const { data: secondTry } = await client.from('properties')
        .select('id')
        .ilike('title', `%${cleanInput}%`)
        .limit(1)
        .maybeSingle();

    return secondTry ? String(secondTry.id) : cleanInput;
};

// 🔱 AI SERVICES LAYER - THE EXECUTIVE BRAIN
/**
 * ARCHITECTURE NOTE:
 * Bridge between LLM and Backend Logic
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
    checkOut: string,
    customSupabase?: SupabaseClient
): Promise<{ available: boolean; reason?: string; is_request_only?: boolean; unavailableLine?: string }> => {
    const client = customSupabase || supabase;
    const qIn = new Date(checkIn);
    const qOut = new Date(checkOut);
    const now = new Date();

    // 🛡️ DATE INTEGRITY GUARD: Fail gracefully if dates are invalid
    if (isNaN(qIn.getTime()) || isNaN(qOut.getTime())) {
        console.warn('[checkAvailability] Invalid Dates detected:', { checkIn, checkOut });
        return { available: false, reason: 'Lo lamento, Capitán, pero mis brújulas no reconocen esas fechas. ¿Podría ser más específico con el día y el mes?' };
    }

    // 🛡️ REINFORCED RESOLUTION: Centralized Power
    const finalId = await resolvePropertyId(villaId, client);

    // ── Step 0: Gold Rules Validation (Dashboard Rules)
    const { data: propSettings } = await client.from('properties').select('sync_settings').eq('id', finalId).single();
    const minNights = propSettings?.sync_settings?.min_nights || 2;
    const allowRequestsBeyond = propSettings?.sync_settings?.allow_requests_beyond || false;
    const diffTime = qOut.getTime() - qIn.getTime();
    const nights = Math.ceil(diffTime / (1000 * 3600 * 24));

    // ── Step -1: Past Date Validation (Space-Time Integrity) ─
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

    // 🔱 MODO CAPTACIÓN: Check availability window if switch is active
    const availabilityWindowMonths = propSettings?.sync_settings?.availability_window || 6;
    const windowDate = new Date();
    windowDate.setMonth(windowDate.getMonth() + availabilityWindowMonths);

    const isBeyondWindow = qIn > windowDate;

    // ── Step 1: Query unified bookings table (Direct, Manual, Pending)
    type BookingAvailRow = { check_in: string; check_out: string; status: string | null; hold_expires_at: string | null; source: string | null };
    
    // 🔱 DUAL-QUERY ENGINE (FAST LOOKUP)
    const [bookingRes, syncedRes] = await Promise.all([
        client
            .from('bookings')
            .select('check_in, check_out, status, hold_expires_at, source')
            .eq('property_id', finalId)
            .neq('status', 'cancelled'),
        client
            .from('synced_blocks')
            .select('check_in, check_out, source')
            .eq('property_id', finalId)
    ]);

    if (bookingRes.error || syncedRes.error) {
        console.error('[checkAvailability] DB error:', bookingRes.error?.message || syncedRes.error?.message);
        return { 
            available: false, 
            reason: 'Capitán, mis cartas náuticas están algo nubladas en este momento. Déjeme validar esto personalmente con el Capitán principal.' 
        };
    }

    // A. Native Overlap Check (Direct Bookings)
    const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
    
    const nativeOverlap = (bookingRes.data as BookingAvailRow[] || []).find((b: BookingAvailRow) => {
        // 🛡️ INVENTORY PROTECTION: Only block for real intention
        if (!BLOCKING_STATUSES.includes(b.status || '')) return false;
        
        // AI Hold TTL check
        if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return false;
        
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return qIn < bOut && qOut > bIn;
    });

    if (nativeOverlap) {
        const statusLabel = nativeOverlap.status === 'confirmed' || nativeOverlap.status === 'Paid' ? 'Confirmada' : 'En proceso';
        return { 
            available: false, 
            reason: `Fechas ya ocupadas por una reserva directa (${statusLabel}).`,
            unavailableLine: `Lo siento, esas fechas ya están reservadas directamente en nuestro sistema.`
        };
    }

    // B. Synced Overlap Check (External iCal Blocks)
    const externalOverlap = (syncedRes.data || []).find((b: any) => {
        const bIn = new Date(b.check_in);
        const bOut = new Date(b.check_out);
        return qIn < bOut && qOut > bIn;
    });

    if (externalOverlap) {
        return { 
            available: false, 
            reason: `Fechas no disponibles — reservado vía ${externalOverlap.source}.`,
            unavailableLine: `Esas fechas ya están tomadas en mi bitácora de ${externalOverlap.source}.`
        };
    }

    // ── Step 1.5: Query pending leads (short-term locks) ──────────
    const { data: dbPending } = await client
        .from('pending_bookings')
        .select('check_in, check_out, expires_at')
        .eq('property_id', finalId)
        .eq('status', 'pending_payment');

    const hasPendingOverlap = (dbPending || []).some((p: { check_in: string; check_out: string; expires_at: string | null }) => {
        if (p.expires_at && new Date(p.expires_at) < now) return false;
        return qIn < new Date(p.check_out) && qOut > new Date(p.check_in);
    });

    if (hasPendingOverlap) {
        return { available: false, reason: 'Fechas bloqueadas temporalmente en proceso de pago.' };
    }

    // ── Step 2: Check availability_rules for Hard Blocks ─
    const { data: rules } = await client
        .from('availability_rules')
        .select('*')
        .eq('property_id', finalId)
        .eq('is_blocked', true);

    if (rules && rules.length > 0) {
        let curr = new Date(qIn);
        while (curr < qOut) {
            const ds = curr.toISOString().split('T')[0];
            const isBlocked = rules.some((r: any) => ds >= r.start_date && ds <= r.end_date);
            if (isBlocked) {
                if (allowRequestsBeyond) {
                    return { 
                        available: false, 
                        is_request_only: true, 
                        reason: 'Esa fecha está bloqueada en mi brújula actual, pero puedo enviarle su petición al Capitán Brian para que evalúe una excepción para usted.'
                    };
                }
                return { available: false, reason: 'Fechas bloqueadas manualmente por el anfitrión (Hard Block).' };
            }
            curr.setDate(curr.getDate() + 1);
        }
    }

    // 🔱 WINDOW CHECK (Final Step)
    if (isBeyondWindow) {
        if (allowRequestsBeyond) {
            return { 
                available: false, 
                is_request_only: true, 
                reason: `Esa travesía está en un horizonte lejano (más de ${availabilityWindowMonths} meses), pero si gusta puedo tomar sus datos para asegurar su lugar en la bitácora del Capitán.`,
                unavailableLine: `Esa fecha está en un horizonte muy lejano. Solo aceptamos reservas con seis meses de anticipación, pero puedo anotar sus datos para ponernos en contacto luego.`
            };
        }
        return { 
            available: false, 
            reason: `Solo aceptamos reservas con hasta ${availabilityWindowMonths} meses de anticipación por el momento.`,
            unavailableLine: `Lo siento. Solo aceptamos reservas con hasta seis meses de anticipación por ahora.`
        };
    }

    return { available: true };
};

/**
 * 🛰️ PROACTIVE AVAILABILITY SENSOR (Vapi Optimized)
 * Scans the next 180 days for the first available gap of N nights.
 */
export const findNextAvailability = async (
    propertyId: string, 
    afterDate?: string, 
    nights?: number,
    customSupabase?: SupabaseClient
): Promise<{ ok: boolean; found: boolean; nextAvailabilityLine?: string; data?: any }> => {
    const client = customSupabase || supabase;
    const finalId = await resolvePropertyId(propertyId, client);
    const startDate = afterDate ? new Date(afterDate) : new Date();
    
    // Resolve min nights
    const { data: prop } = await client.from('properties').select('sync_settings, title').eq('id', finalId).single();
    const minNights = nights || prop?.sync_settings?.min_nights || 2;
    const propTitle = prop?.title || "nuestra villa";

    const gaps = await findCalendarGaps(finalId, client);
    const slots = Array.isArray(gaps) ? gaps : (gaps as any).slots || [];
    const validGap = (slots as any[]).find((g: any) => g.nights >= minNights);

    if (!validGap) {
        return { 
            ok: true, 
            found: false, 
            nextAvailabilityLine: "Lo siento, mis radares no encuentran huecos disponibles en los próximos seis meses para esta villa." 
        };
    }

    // Calculate Price for the found gap
    try {
        const quote = await applyAIQuote(finalId, validGap.start, validGap.end, undefined, client);
        const dateStr = new Date(validGap.start + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const endStr = new Date(validGap.end + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        
        return {
            ok: true,
            found: true,
            nextAvailabilityLine: `He encontrado un horizonte despejado. La villa ${propTitle} está libre del ${dateStr} al ${endStr}, por un total de ${quote.total} dólares por las ${quote.nights} noches.`,
            data: {
                startDate: validGap.start,
                endDate: validGap.end,
                nights: quote.nights,
                priceTotal: quote.total,
                propertyTitle: propTitle
            }
        };
    } catch (e) {
        return {
            ok: true,
            found: true,
            nextAvailabilityLine: `Tengo disponibilidad a partir del ${validGap.start}, pero el cálculo de precio está en mantenimiento. ¿Gusta que verifique las fechas?`,
            data: { startDate: validGap.start, endDate: validGap.end, nights: validGap.nights }
        };
    }
};

/**
 * 🔍 PROACTIVE UPSELLING: Find another property that is OR ISN'T occupied for these dates.
 * Salty never says "No". He offers the next best thing.
 */
export const findAlternatePropertyAvailable = async (
    excludedVillaId: string,
    checkIn: string,
    checkOut: string,
    customSupabase?: SupabaseClient
): Promise<{ id: string, title: string, alternateSuggestionLine?: string } | null> => {
    const client = customSupabase || supabase;

    // 1. Fetch all other properties
    const { data: others } = await client.from('properties')
        .select('id, title')
        .neq('id', excludedVillaId);

    if (!others || others.length === 0) return null;

    // 2. Check each one for availability (Parallel for speed)
    const availabilityChecks = await Promise.all(others.map(async (p: { id: any, title: string }) => {
        const avail = await checkAvailabilityWithICal(String(p.id), checkIn, checkOut, client);
        return { ...p, available: avail.available };
    }));

    const firstAvailable = availabilityChecks.find(p => p.available);
    if (firstAvailable) {
        return { 
            id: String(firstAvailable.id), 
            title: firstAvailable.title,
            alternateSuggestionLine: `Sin embargo, tengo disponible la propiedad "${firstAvailable.title}" para esas mismas fechas. ¿Gusta que verifique la cotización para usted?`
        };
    }
    return null;
};

// ... [rest of the file remains unchanged]


// 2. Lead & Abandonment Manager
export const logAbandonmentLead = async (data: { full_name: string; email?: string; phone?: string; interest: string }) => {
    const { error } = await supabase.from('leads').insert({
        full_name: data.full_name,
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
    // 🛡️ REINFORCED RESOLUTION: Centralized Power
    const finalId = await resolvePropertyId(propertyId, supabase);

    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    const status = 'pending_ai_validation';
    const source = 'Salty AI';

    // 1. Create the detailed lead first for Host visibility
    if (customer_name || phone_number || special_requests) {
        await supabase.from('leads').insert({
            full_name: customer_name || 'Huésped Anónimo (AI)',
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

// 4. Gap Automation (Revenue Optimization & Sentinel Vision)
export const findCalendarGaps = async (propertyId: string, customSupabase?: SupabaseClient) => {
    const client = customSupabase || supabase;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 🛡️ REINFORCED RESOLUTION: Centralized Power
    const finalId = await resolvePropertyId(propertyId, client);

    // 📏 DYNAMIC MIN NIGHTS RESOLUTION (Master Dashboard)
    const { data: prop } = await client.from('properties').select('sync_settings').eq('id', finalId).single();
    const minNights = prop?.sync_settings?.min_nights || 2;

    const { data: bookings, error } = await client
        .from('bookings')
        .select('check_in, check_out, source')
        .eq('property_id', finalId)
        .neq('status', 'cancelled')
        .gte('check_out', todayStr)
        .order('check_in', { ascending: true });

    if (error) {
        console.error("[findCalendarGaps] DB Error:", error);
        return [];
    }

    // 🌟 INTEGRITY GUARD: All bookings (including long-term iCal blocks) MUST be respected
    const realBookings = bookings || [];

    const gaps: { start: string; end: string; nights: number }[] = [];
    let lastCheckout = new Date(todayStr + 'T12:00:00');

    // 🔬 Sentinel Scan Logic: Traverse REAL bookings to find "Dead Air"
    for (const b of realBookings) {
        const bIn = new Date(b.check_in + 'T12:00:00');
        const bOut = new Date(b.check_out + 'T12:00:00');

        if (bIn > lastCheckout) {
            const diffTime = bIn.getTime() - lastCheckout.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= minNights) {
                gaps.push({
                    start: lastCheckout.toISOString().split('T')[0],
                    end: b.check_in,
                    nights: diffDays
                });
            }
        }

        if (bOut > lastCheckout) {
            lastCheckout = bOut;
        }

        if (gaps.length >= 5) break; // Optimization: First 5 slots are enough for Salty
    }

    // Logic for infinite availability after last booking (up to 180 days limit)
    if (gaps.length < 5) {
        const finalLimit = new Date();
        finalLimit.setMonth(finalLimit.getMonth() + 6);

        if (lastCheckout < finalLimit) {
            const diffTime = finalLimit.getTime() - lastCheckout.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= minNights) {
                gaps.push({
                    start: lastCheckout.toISOString().split('T')[0],
                    end: finalLimit.toISOString().split('T')[0],
                    nights: diffDays
                });
            }
        }
    }

    return {
        slots: gaps,
        min_nights: minNights,
        property_id: finalId
    };
};

// 5. Sentinel Middleware (Sentiment & Guardrail)
export const handleCrisisAlert = async (full_name: string, message: string, contact: string, propertyId?: string, severity: number = 1) => {
    const sentimentScore = severity / 5; // Simplified mapping
    const { error } = await supabase.from('urgent_alerts').insert({
        full_name, 
        message, 
        contact, 
        property_id: propertyId,
        status: 'new', 
        severity, 
        sentiment_score: sentimentScore
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

export const applyAIQuote = async (propertyId: string, checkIn: string, checkOut: string, promoCode?: string, customSupabase?: SupabaseClient) => {
    const client = customSupabase || supabase;

    // 🛡️ REINFORCED RESOLUTION: Centralized Power
    const finalId = await resolvePropertyId(propertyId, client);

    const { data: property, error: fetchError } = await client.from('properties')
        .select('*')
        .eq('id', finalId)
        .maybeSingle();

    if (!property) {
        console.error(`[applyAIQuote] Critical Failure: Property not found. Input: "${propertyId}" (resolved to: ${finalId})`, fetchError);
        throw new Error(`Propiedad no encontrada [${propertyId}].`);
    }

    // 🔱 SOVERANÍA FINANCIERA: Una sola verdad desde FinanceService
    try {
        const sDate = new Date(`${checkIn}T12:00:00`);
        const eDate = new Date(`${checkOut}T12:00:00`);

        // Fetch promo if any
        let promo = null;
        if (promoCode) {
            const { data } = await client.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).maybeSingle();
            promo = data;
        }

        // 🧮 EXECUTE MASTER CALCULATION
        const quote = FinanceService.calculateReservation({
            property: property as any, // Cast to any to handle Omit types vs database types
            startDate: sDate,
            endDate: eDate,
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
    } catch (err: any) {
        console.error("[applyAIQuote] Finance Calculation Error:", err.message);
        throw err;
    }
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
        mission = `Escribe un mensaje de 'Bienvenida e Instrucciones de Acceso' para una Estancia Signature.
        - Saluda con entusiasmo por su llegada mañana a la villa.
        - Indica que el check-in es a las 3:00 PM.
        - Dile que para Salty es un placer asistirles con cualquier duda sobre el funcionamiento de la casa (WiFi, Agua caliente, Equipos).
        - Deséales un viaje seguro.`;
    } else if (stage === 'check_in_followup') {
        mission = `Escribe un mensaje de 'Confirmación de Bienestar' (24h después de la llegada) para su Estancia Signature.
        - Pregunta si la primera noche fue perfecta y si todo está según lo prometido.
        - Recuérdales que el Manual de la Casa completo está disponible en la web para cualquier duda técnica.
        - Reitera que eres su Concierge Informativo para temas de la propiedad.`;
    } else if (stage === 'mid_stay') {
        mission = `Escribe un mensaje de 'Hospitality Check' Informativo durante su Estancia Signature.
        - Saluda y pregunta si el WiFi y los servicios de la villa están funcionando a su gusto.
        - Invítales a revisar el Manual si tienen dudas sobre el uso de la piscina o equipos.
        - Sé cordial y servicial sin ofrecer servicios externos.`;
    } else {
        mission = `Escribe un mensaje de 'Logística de Salida' para su Estancia Signature.
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
