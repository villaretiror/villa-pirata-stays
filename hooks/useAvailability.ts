import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 🛰️ USE AVAILABILITY HOOK (DB-FIRST RELIABILITY)
 * 
 * This hook aligns web search logic with Salty's internal brain.
 * It pulls from:
 * 1. Confirmed Bookings (Supabase + iCal Synced)
 * 2. Manual Blocks (properties.blockeddates)
 * 3. Active Leads (pending_bookings with 15-min TTL)
 */
export const useAvailability = (propertyId: string | undefined) => {
    const [blockedDates, setBlockedDates] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAvailability = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        setError(null);

        try {
            const now = new Date();

            // 1. Fetch Manual Blocks & Properties Info
            const { data: prop, error: pError } = await supabase
                .from('properties')
                .select('blockeddates')
                .eq('id', propertyId)
                .single();

            if (pError) throw pError;

            // 2. Fetch Active Bookings (Unified: Direct + iCal Synced)
            const { data: bks } = await supabase
                .from('bookings')
                .select('check_in, check_out, status, hold_expires_at')
                .eq('property_id', propertyId)
                .neq('status', 'cancelled');

            // 3. Fetch Active Leads (Awaiting Payment - 15min TTL)
            const { data: pending } = await supabase
                .from('pending_bookings')
                .select('check_in, check_out, expires_at')
                .eq('property_id', propertyId)
                .eq('status', 'pending_payment');

            const allBlocked: Date[] = [];

            // Helper to fill date ranges
            const addRange = (start: string, end: string) => {
                let curr = new Date(start + 'T12:00:00');
                const last = new Date(end + 'T12:00:00');
                while (curr < last) {
                    allBlocked.push(new Date(curr));
                    curr.setDate(curr.getDate() + 1);
                }
            };

            // Process Manual Blocks
            if (prop.blockeddates && Array.isArray(prop.blockeddates)) {
                prop.blockeddates.forEach((d: string) => allBlocked.push(new Date(d + 'T12:00:00')));
            }

            // Process Bookings
            (bks || []).forEach((b: { check_in: string; check_out: string; status: string | null; hold_expires_at: string | null }) => {
                // Ignore expired AI holds
                if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return;
                addRange(b.check_in, b.check_out);
            });

            // Process Pending Leads (TTL Protection)
            (pending || []).forEach((p: { check_in: string; check_out: string; expires_at: string | null }) => {
                if (p.expires_at && new Date(p.expires_at) < now) return;
                addRange(p.check_in, p.check_out);
            });

            // Deduplicate
            const uniqueStrings = Array.from(new Set(allBlocked.map(d => d.toISOString().split('T')[0])));
            const finalDates = uniqueStrings.map(s => new Date(s + 'T12:00:00'));

            setBlockedDates(finalDates);

        } catch (err: any) {
            console.error("useAvailability Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    return {
        blockedDates,
        isLoading,
        error,
        refresh: fetchAvailability,
        isRangeAvailable: (start: Date, end: Date) => {
            if (!start || !end) return true;
            const sStr = start.toISOString().split('T')[0];
            const eStr = end.toISOString().split('T')[0];
            
            // Generate requested range strings
            const requestedRange: string[] = [];
            let curr = new Date(sStr + 'T12:00:00');
            const last = new Date(eStr + 'T12:00:00');
            while (curr < last) {
                requestedRange.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            const blockedStrings = new Set(blockedDates.map(d => d.toISOString().split('T')[0]));
            return !requestedRange.some(d => blockedStrings.has(d));
        }
    };
};
