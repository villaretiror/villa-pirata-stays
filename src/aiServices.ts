import { createClient } from '@supabase/supabase-js';
import { DateValidator } from './utils/DateValidator';
import { PropertyResolver } from './services/PropertyResolver';
import { KnowledgeEngine } from './services/KnowledgeEngine';
import { PromptFactory } from './services/PromptFactory';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const propertyId = await PropertyResolver.resolveId(propertyInput, supabase);
        
        if (!propertyId) return null;

        const info = await KnowledgeEngine.discover(propertyId, query, supabase);
        return info.length > 0 ? info.join('\n') : null;
    }
};

/**
 * 🔱 SYSTEM PROMPT HUB (Prompt Factory Bridge)
 */
export const getSaltyPrompt = (role: 'guest' | 'host', context?: any): string => {
    return PromptFactory.buildSystemPrompt(role, context);
};
