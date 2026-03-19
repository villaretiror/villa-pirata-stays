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
    const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [pendingLeads, setPendingLeads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAvailability = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        setError(null);

        try {
            const now = new Date();

            // 1. Fetch Manual Blocks from Property record (Primary source for Editor)
            const { data: propData } = await supabase
                .from('properties')
                .select('blockeddates')
                .eq('id', propertyId)
                .single();

            // 2. Fetch Active Bookings (Unified: Direct + iCal Synced)
            const { data: bks } = await supabase
                .from('bookings')
                .select('check_in, check_out, status, hold_expires_at, source')
                .eq('property_id', propertyId)
                .neq('status', 'cancelled');

            // 3. Fetch Active Leads (Awaiting Payment - 15min TTL)
            const { data: pending } = await supabase
                .from('pending_bookings')
                .select('check_in, check_out, expires_at')
                .eq('property_id', propertyId)
                .eq('status', 'pending_payment');

            const { data: rules } = await supabase
                .from('availability_rules')
                .select('*')
                .eq('property_id', propertyId);
            
            if (rules) setAvailabilityRules(rules);
            if (bks) setAllBookings(bks);
            if (pending) setPendingLeads(pending);

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

            // Process Manual Blocks from Properties (Host Dashboard Primary Source)
            if (propData?.blockeddates && Array.isArray(propData.blockeddates)) {
                propData.blockeddates.forEach((dateStr: string) => {
                    allBlocked.push(new Date(dateStr + 'T12:00:00'));
                });
            }
            
            // Advance Notice Engine
            let globalAdvanceNotice = 2; // default
            if (rules && rules.length > 0) {
                const todayStr = now.toISOString().split('T')[0];
                const activeRule = rules.find((r: any) => todayStr >= r.start_date && todayStr <= r.end_date);
                if (activeRule && activeRule.advance_notice_days !== undefined) {
                    globalAdvanceNotice = activeRule.advance_notice_days;
                }
            }
            if (globalAdvanceNotice > 0) {
                for (let i = 0; i < globalAdvanceNotice; i++) {
                    const d = new Date(now);
                    d.setDate(d.getDate() + i);
                    allBlocked.push(new Date(d.toISOString().split('T')[0] + 'T12:00:00'));
                }
            }

            // Process Manual Blocks (Hard Blocks from Rules)
            if (rules && rules.length > 0) {
                rules.forEach((r: any) => {
                    if (r.is_blocked) {
                        addRange(r.start_date, r.end_date);
                    }
                });
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
        availabilityRules,
        allBookings,
        pendingLeads,
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
