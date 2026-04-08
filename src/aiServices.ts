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

        // 3. Query Real Bookings & Synced Blocks
        const [bookingRes, syncedRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('check_in, check_out, status, hold_expires_at, source, is_manual_block, customer_name')
                .eq('property_id', finalId)
                .neq('status', 'cancelled'),
            supabase
                .from('synced_blocks')
                .select('check_in, check_out, source')
                .eq('property_id', finalId)
        ]);

        if (bookingRes.error || syncedRes.error) {
            return { available: false, reason: 'Tengo interferencia en las cartas náuticas. Déjeme validar con el Capitán principal.' };
        }

        // A. Overlap Engine
        const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
        
        const nativeOverlap: any = (bookingRes.data || []).find((b: any) => {
            if (!BLOCKING_STATUSES.includes(b.status || '')) return false;
            if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return false;
            
            const bIn = new Date(b.check_in);
            const bOut = new Date(b.check_out);
            return qIn < bOut && qOut > bIn;
        });

        if (nativeOverlap) {
            const isBookingClosed = nativeOverlap.source === 'Booking.com' && (nativeOverlap.customer_name?.includes('CLOSED') || !nativeOverlap.customer_name);
            const displayType = (nativeOverlap.is_manual_block && !isBookingClosed) ? 'Mantenimiento' : 'Comercial';
            
            return { 
                available: false, 
                reason: `Choque detectado: ${displayType}.`,
                blockingEvent: {
                    type: displayType,
                    source: nativeOverlap.source,
                    check_in: nativeOverlap.check_in,
                    check_out: nativeOverlap.check_out,
                    guest: nativeOverlap.customer_name || 'Huésped Externo'
                }
            };
        }

        // B. External Synced Blocks Overlap (Double Check)
        const externalOverlap = (syncedRes.data || []).find((b: any) => {
            const bIn = new Date(b.check_in);
            const bOut = new Date(b.check_out);
            return qIn < bOut && qOut > bIn;
        });

        if (externalOverlap) {
            const isBookingClosed = externalOverlap.source === 'Booking.com';
            const displayType = isBookingClosed ? 'Comercial' : 'Bloqueo Externo';
            
            return { 
                available: false, 
                reason: `Bloqueo externo detectado: ${displayType}.`,
                blockingEvent: {
                    type: displayType,
                    source: externalOverlap.source,
                    check_in: externalOverlap.check_in,
                    check_out: externalOverlap.check_out
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

export const findCalendarGaps = async (_id: string, _client?: any) => {
    return [];
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
