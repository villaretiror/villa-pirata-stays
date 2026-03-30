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
    const [minNights, setMinNights] = useState(2); // 🔱 DYNAMIC ANCHOR
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

            // 🔱 BUNDLE FETCHING: Database-Level Consolidation
            const [bundleRes, syncedRes] = await Promise.all([
                supabase.rpc('get_property_availability_bundle', { 
                    target_property_id: propertyId 
                }),
                supabase.from('synced_blocks').select('*').eq('property_id', propertyId)
            ]);

            const bundle = bundleRes.data;
            const synced = syncedRes.data || [];

            if (!bundle) return;

            const rules = bundle.rules || [];
            const dbBookings = bundle.bookings || [];
            const pending = bundle.leads || [];
            const propData = bundle.property || {};
            
            // 🔱 UNIFIED VISION: Merge direct bookings with external iCal blocks
            const activeBookings = [...dbBookings, ...synced];

            if (activeBookings) setAllBookings(activeBookings);
            if (pending) setPendingLeads(pending);
            if (rules) setAvailabilityRules(rules);

            // 📏 DYNAMIC MIN NIGHTS RESOLUTION
            const defaultMin = propData.sync_settings?.min_nights || 2;
            setMinNights(defaultMin);

            const allBlocked: Date[] = [];

            // 📅 RECALIBRATED DATE ENGINE: Use 00:00:00 for strict calendar matching
            const addRange = (start: string, end: string) => {
                const [yearS, monthS, dayS] = start.split('-').map(Number);
                const [yearE, monthE, dayE] = end.split('-').map(Number);
                
                let curr = new Date(yearS, monthS - 1, dayS, 0, 0, 0);
                const last = new Date(yearE, monthE - 1, dayE, 0, 0, 0);
                
                while (curr < last) {
                    allBlocked.push(new Date(curr));
                    curr.setDate(curr.getDate() + 1);
                }
            };

            // 1. Process Manual Blocks from Property Table (Legacy/Direct Blocks)
            const legacyBlocked = propData.blockeddates || propData.blockedDates || [];
            if (Array.isArray(legacyBlocked)) {
                legacyBlocked.forEach((dStr: string) => {
                    const [y, m, d] = dStr.split('-').map(Number);
                    allBlocked.push(new Date(y, m - 1, d, 0, 0, 0));
                });
            }

            // 2. Process Manual Blocks from Rules (Host Dashboard Primary Source)
            if (rules && rules.length > 0) {
                rules.forEach((r: any) => {
                    if (r.is_blocked) {
                        addRange(r.start_date, r.end_date);
                    }
                });
            }
            
            // Advance Notice Engine
            let globalAdvanceNotice = 1; // standard
            if (rules && rules.length > 0) {
                const todayStr = now.toISOString().split('T')[0];
                const activeRule = rules.find((r: any) => todayStr >= r.start_date && todayStr <= r.end_date);
                if (activeRule && activeRule.advance_notice_days !== undefined) {
                    globalAdvanceNotice = activeRule.advance_notice_days;
                }
            }
            if (globalAdvanceNotice > 0) {
                for (let i = 0; i < globalAdvanceNotice; i++) {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 0, 0, 0);
                    allBlocked.push(d);
                }
            }

            // Process Bookings
            const BLOCKING_STATUSES = ['pending', 'confirmed', 'Paid', 'pending_verification', 'pending_ai_validation', 'external_block'];
            
            (activeBookings || []).forEach((b: { check_in: string; check_out: string; status: string | null; hold_expires_at: string | null }) => {
                // 🛡️ INVENTORY PROTECTION: Only block for real intention
                if (!BLOCKING_STATUSES.includes(b.status || '')) return;
                
                // Ignore expired AI holds
                if (b.status === 'pending_ai_validation' && b.hold_expires_at && new Date(b.hold_expires_at) < now) return;
                
                addRange(b.check_in, b.check_out);
            });

            // Process Pending Leads (TTL Protection)
            (pending || []).forEach((p: { check_in: string; check_out: string; expires_at: string | null }) => {
                if (p.expires_at && new Date(p.expires_at) < now) return;
                addRange(p.check_in, p.check_out);
            });

            // Deduplicate accurately
            const uniqueTimestamps = Array.from(new Set(allBlocked.map(d => d.getTime())));
            const finalDates = uniqueTimestamps.map(ts => new Date(ts));

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
        minNights, // 🔱 RETURNED DYNAMIC ANCHOR
        allBookings,
        pendingLeads,
        isLoading,
        error,
        refresh: fetchAvailability,
        isRangeAvailable: (start: Date, end: Date) => {
            if (!start || !end) return true;

            // 🛡️ TIME-TRAVEL SHIELD: Local Date Formatting (No UTC Shifts)
            const formatLocal = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const sStr = formatLocal(start);
            const eStr = formatLocal(end);
            
            // Generate requested range strings
            const requestedRange: string[] = [];
            let curr = new Date(sStr + 'T12:00:00');
            const last = new Date(eStr + 'T12:00:00');
            
            while (curr < last) {
                requestedRange.push(formatLocal(curr));
                curr.setDate(curr.getDate() + 1);
            }

            const blockedStrings = new Set(blockedDates.map(d => formatLocal(d)));
            return !requestedRange.some(d => blockedStrings.has(d));
        }
    };
};
