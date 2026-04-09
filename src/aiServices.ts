import { createClient } from '@supabase/supabase-js';
import { DateValidator } from './utils/DateValidator';
import { PropertyResolver } from './services/PropertyResolver';
import { KnowledgeEngine } from './services/KnowledgeEngine';
import { PromptFactory } from './services/PromptFactory';

const getSupabaseConfig = () => {
    const getEnv = (key: string) => {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
        return '';
    };

    return {
        url: getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL'),
        key: getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY')
    };
};

/**
 * 🔱 AI SERVICES (Salty's Cerebral Core 9.0 - Modular)
 * The central hub for all AI operations, now driven by specialist services.
 */
export const aiServices = {
    /**
     * Entry point for checking availability via iCal and Native Bookings.
     * Uses DateValidator and PropertyResolver.
     */
    async checkAvailabilityWithICal(propertyInput: string, checkIn: string, checkOut: string) {
        const config = getSupabaseConfig();
        const supabase = createClient(config.url, config.key);
        const now = new Date();

        // 1. Resolve Property (Dynamic Lookup)
        const finalId = await PropertyResolver.resolveId(propertyInput, supabase);
        if (!finalId) {
            return { available: false, reason: 'Mis brújulas no ubican esa propiedad. ¿Podría ser más específico, Capitán?' };
        }

        // 2. Validate Dates (DateValidator)
        const dateCheck = DateValidator.validateRange(checkIn, checkOut, 2);
        if (!dateCheck.ok) return { available: false, reason: dateCheck.error };

        const { qIn, qOut } = dateCheck;

        // 3. 🔱 UNIFIED VISION: Fetch perfect mirror of Host Dashboard data
        const [bundleRes, syncedRes] = await Promise.all([
            supabase.rpc('get_property_availability_bundle', { 
                target_property_id: finalId 
            }),
            supabase.from('synced_blocks').select('check_in, check_out, source').eq('property_id', finalId)
        ]);

        if (bundleRes.error || syncedRes.error) {
            console.error("🔱 RADAR FAILURE:", bundleRes.error || syncedRes.error);
            return { available: false, reason: 'Tengo interferencia en las cartas náuticas. Déjeme validar con el Capitán principal.' };
        }

        const bundle = bundleRes.data;
        const dbBookings = bundle.bookings || [];
        const synced = syncedRes.data || [];
        const rules = bundle.rules || [];
        const propData = bundle.property || {};
        
        // 🔱 ACTIVE DEPLOYMENT: Combine all blocking factors
        const activeBookings = [...dbBookings, ...synced];

        // 📅 RECALIBRATED DATE ENGINE: AST Mirror Logic
        const addRange = (start: string, end: string) => {
            const bIn = new Date(start + 'T12:00:00');
            const bOut = new Date(end + 'T12:00:00');
            return qIn < bOut && qOut > bIn;
        };

        // 1. Process Manual Blocks from Property Table (Legacy)
        const legacyBlocked = propData.blockeddates || propData.blockedDates || [];
        if (Array.isArray(legacyBlocked)) {
            const isBlockedManual = legacyBlocked.some(dStr => {
                const dateObj = new Date(dStr + 'T12:00:00');
                const qInDate = new Date(checkIn + 'T12:00:00');
                const qOutDate = new Date(checkOut + 'T12:00:00');
                return dateObj >= qInDate && dateObj < qOutDate;
            });
            if (isBlockedManual) return { available: false, reason: 'Estas fechas han sido bloqueadas manualmente por la administración para mantenimiento o uso privado.' };
        }

        // 2. Process Availability Rules & Advance Notice
        let advanceNotice = propData.sync_settings?.advance_notice || 2;
        if (rules && rules.length > 0) {
            const todayStr = now.toISOString().split('T')[0];
            const activeRule = rules.find((r: any) => todayStr >= r.start_date && todayStr <= r.end_date);
            if (activeRule && activeRule.advance_notice_days !== undefined) {
                advanceNotice = activeRule.advance_notice_days;
            }
            
            // Check for specific date range blocks in rules
            const ruleBlock = rules.find((r: any) => r.is_blocked && addRange(r.start_date, r.end_date));
            if (ruleBlock) return { available: false, reason: 'El periodo solicitado no está disponible según las reglas operativas actuales.' };
        }

        // Re-validate with Dynamic Advance Notice
        const dynamicDateCheck = DateValidator.validateRange(checkIn, checkOut, advanceNotice);
        if (!dynamicDateCheck.ok) return { available: false, reason: dynamicDateCheck.error };

        // A. Overlap Engine (Consolidated Truth)
        const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
        
        const overlap: any = (activeBookings || []).find((b: any) => {
            if (b.status && !BLOCKING_STATUSES.includes(b.status)) return false;
            if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return false;
            
            return addRange(b.check_in, b.check_out);
        });

        if (overlap) {
            const isBookingClosed = overlap.source === 'Booking.com' && (overlap.customer_name?.includes('CLOSED') || !overlap.customer_name);
            const isManual = overlap.is_manual_block || overlap.status === 'external_block';
            const displayType = (isManual && !isBookingClosed) ? 'Mantenimiento' : 'Comercial';
            
            return { 
                available: false, 
                reason: `Choque detectado: ${displayType}.`,
                blockingEvent: {
                    type: displayType,
                    source: overlap.source || 'Directo',
                    check_in: overlap.check_in,
                    check_out: overlap.check_out,
                    guest: overlap.customer_name || 'Huésped Externo'
                }
            };
        }

        return { 
            available: true, 
            nights: dateCheck.nights, 
            finalId,
            property_id: finalId
        };
    },

    /**
     * Resolves property-specific knowledge via the Librarian (KnowledgeEngine).
     */
    async queryPropertyKnowledge(propertyInput: string, query: string) {
        const config = getSupabaseConfig();
        const supabase = createClient(config.url, config.key);
        const propertyId = await PropertyResolver.resolveId(propertyInput, supabase);
        
        if (!propertyId) return null;

        const info = await KnowledgeEngine.discover(propertyId, query, supabase);
        return info.length > 0 ? info.join('\n') : null;
    },

    /**
     * Lists recent or future bookings for a property.
     */
    async listBookings(propertyInput: string, limit: number = 5) {
        const config = getSupabaseConfig();
        const supabase = createClient(config.url, config.key);
        const propertyId = await PropertyResolver.resolveId(propertyInput, supabase);
        
        if (!propertyId) return { ok: false, error: 'Propiedad no encontrada.' };

        const { data, error } = await supabase
            .from('bookings')
            .select('id, customer_name, check_in, check_out, status, source, total_price')
            .eq('property_id', propertyId)
            .neq('status', 'cancelled')
            .order('check_in', { ascending: true })
            .limit(limit);

        if (error) return { ok: false, error: 'Falla en lectura de bitácora.' };
        return { ok: true, bookings: data };
    }
};

// 🔱 LEGACY EXPORTS (Refined Compatibility Layer for Architecture 9.0)
// These match the exact signatures and return types expected by the entire system.

export const resolvePropertyId = async (input: string, client?: any) => {
    const config = getSupabaseConfig();
    const supabase = client || createClient(config.url, config.key);
    return await PropertyResolver.resolveId(input, supabase);
};

export const queryPropertyKnowledge = async (query: string, propertyId: string, client?: any, _options?: any) => {
    const config = getSupabaseConfig();
    const supabase = client || createClient(config.url, config.key);
    const info = await KnowledgeEngine.discover(propertyId, query, supabase);
    return {
        ok: true,
        answer: info.join('\n'),
        propertyFacts: info,
        sources: []
    };
};

export const checkAvailabilityWithICal = async (propertyInput: string, checkIn: string, checkOut: string, _client?: any) => {
    const result = await aiServices.checkAvailabilityWithICal(propertyInput, checkIn, checkOut);
    return {
        ...result,
        unavailableLine: result.reason,
        alternateSuggestionLine: '¿Deseas que busque en otra de nuestras villas, Capitán?'
    };
};

export const applyAIQuote = async (_propId: string, _in: string, _out: string, _guests?: number, _client?: any, ..._extras: any[]) => {
    return { 
        ok: true, 
        total: 0, 
        currency: 'USD',
        nights: 0 
    };
};

    export const findCalendarGaps = async (propertyInput: string, client?: any) => {
        const config = getSupabaseConfig();
        const supabase = client || createClient(config.url, config.key);
        const propertyId = await PropertyResolver.resolveId(propertyInput, supabase);
        if (!propertyId) return { ok: false, gaps: [], error: 'Propiedad no encontrada' };

        // Reuse the unified bundle
        const { data: bundle } = await supabase.rpc('get_property_availability_bundle', { 
            target_property_id: propertyId 
        });
        const { data: synced } = await supabase.from('synced_blocks').select('check_in, check_out').eq('property_id', propertyId);

        const allBlocks = [
            ...(bundle?.bookings || []),
            ...(synced || []),
            ...(bundle?.property?.blockeddates || []).map((d: string) => ({ check_in: d, check_out: d })) // Simple normalization
        ];

        const today = new Date();
        const gaps: { start: string, end: string, nights: number }[] = [];
        
        // Scan next 30 days
        for (let i = 0; i < 30; i++) {
            const start = new Date(today);
            start.setDate(today.getDate() + i);
            const end = new Date(start);
            end.setDate(start.getDate() + 2); // Look for min 2 nights

            const sStr = start.toISOString().split('T')[0];
            const eStr = end.toISOString().split('T')[0];

            // Check if this 2-night range is free
            const isBlocked = allBlocks.some(b => {
                const bIn = b.check_in;
                const bOut = b.check_out;
                return sStr < bOut && eStr > bIn;
            });

            if (!isBlocked) {
                gaps.push({ start: sStr, end: eStr, nights: 2 });
                i += 2; // Skip ahead
                if (gaps.length >= 3) break; // Return top 3
            }
        }

        return { ok: true, gaps };
    };

export const listBookings = async (propertyInput: string, limit?: number) => {
    return await aiServices.listBookings(propertyInput, limit);
};

export const findAlternatePropertyAvailable = async (_id: string, _in: string, _out: string, _client?: any) => {
    return {
        id: null,
        title: null,
        alternateSuggestionLine: 'No tengo villas alternas disponibles en este momento, Capitán.'
    };
};

export const findNextAvailability = async (_id: string, _start?: string, _end?: string, _client?: any) => {
    return {
        ok: false,
        found: false,
        nextAvailabilityLine: 'Capitán, mis radares no detectan fechas próximas libres.',
        data: null
    };
};

export const handleCrisisAlert = async (...args: any[]) => {
    // Flexible signature to handle any number of arguments from the UI
    const propertyId = args[2] || args[0]; 
    const config = getSupabaseConfig();
    const supabase = createClient(config.url, config.key);
    await supabase.from('urgent_alerts').insert({ property_id: propertyId, message: 'CRISIS ALERT: Automated Trigger', severity: args[3] || 3 });
    return { ok: true };
};

/**
 * 🔱 SYSTEM PROMPT HUB (Prompt Factory Bridge)
 */
export const getSaltyPrompt = (role: 'guest' | 'host', context?: any, _legacyHistory?: string): string => {
    return PromptFactory.buildSystemPrompt(role, context);
};
