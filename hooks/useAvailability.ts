import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Temporal } from '@js-temporal/polyfill';

/**
 * 🛰️ USE AVAILABILITY HOOK (AST SHIELD)
 * 
 * This hook centralizes all availability logic, ensuring that 
 * direct bookings (Supabase) and external blocks (Airbnb/Booking via iCal) 
 * are merged in real-time.
 * 
 * It strictly uses Puerto Rico Time (AST) to avoid timezone discrepancies.
 */
export const useAvailability = (propertyId: string | undefined) => {
    const [blockedDates, setBlockedDates] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper: Get Current Date in AST (Puerto Rico)
    const getASTNow = () => {
        return Temporal.Now.zonedDateTimeISO('America/Puerto_Rico');
    };

    const fetchAvailability = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch Property and its Sync Feeds
            const { data: prop, error: pError } = await supabase
                .from('properties')
                .select('blockeddates, "calendarSync"')
                .eq('id', propertyId)
                .single();

            if (pError) throw pError;

            const dbBlockedDates = (prop.blockeddates || []).map((d: string) => new Date(d));
            const syncFeeds = prop.calendarSync as any[] || [];

            // 2. Fetch Fresh External Data via Proxy (Parallel)
            const externalDates: Date[] = [];
            
            if (syncFeeds.length > 0) {
                const proxyPromises = syncFeeds.map(async (feed) => {
                    if (!feed.url) return;
                    try {
                        const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(feed.url)}`);
                        if (!res.ok) return;
                        
                        const data = await res.json();
                        if (data.contents) {
                            // Basic parsing for dates in the raw iCal string
                            // Using regex to find DTSTART and DTEND for speed in the hook
                            const startMatches = data.contents.match(/DTSTART;VALUE=DATE:(\d{8})/g) || [];
                            const endMatches = data.contents.match(/DTEND;VALUE=DATE:(\d{8})/g) || [];
                            
                            for (let i = 0; i < startMatches.length; i++) {
                                const startStr = startMatches[i].split(':')[1];
                                const endStr = endMatches[i].split(':')[1];
                                
                                if (startStr && endStr) {
                                    const startYear = parseInt(startStr.substring(0, 4));
                                    const startMonth = parseInt(startStr.substring(4, 6));
                                    const startDay = parseInt(startStr.substring(6, 8));
                                    
                                    const endYear = parseInt(endStr.substring(0, 4));
                                    const endMonth = parseInt(endStr.substring(4, 6));
                                    const endDay = parseInt(endStr.substring(6, 8));

                                    let current = Temporal.PlainDate.from({ year: startYear, month: startMonth, day: startDay });
                                    const end = Temporal.PlainDate.from({ year: endYear, month: endMonth, day: endDay });
                                    
                                    // Fill the range (excluding checkout day usually, but we keep it for now as a Date object)
                                    while (Temporal.PlainDate.compare(current, end) < 0) {
                                        const d = new Date(current.year, current.month - 1, current.day);
                                        externalDates.push(d);
                                        current = current.add({ days: 1 });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error syncing feed ${feed.platform}:`, e);
                    }
                });

                await Promise.all(proxyPromises);
            }

            // 3. Merge and Deduplicate
            const allBlocked = [...dbBlockedDates, ...externalDates];
            const uniqueDates = Array.from(new Set(allBlocked.map(d => d.toDateString())))
                                    .map(s => new Date(s));
            
            setBlockedDates(uniqueDates);

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
        // Helper to check if a specific range is available
        isRangeAvailable: (start: Date, end: Date) => {
            const range: string[] = [];
            let curr = Temporal.PlainDate.from({ 
                year: start.getFullYear(), 
                month: start.getMonth() + 1, 
                day: start.getDate() 
            });
            const last = Temporal.PlainDate.from({ 
                year: end.getFullYear(), 
                month: end.getMonth() + 1, 
                day: end.getDate() 
            });

            while (Temporal.PlainDate.compare(curr, last) <= 0) {
                range.push(new Date(curr.year, curr.month - 1, curr.day).toDateString());
                curr = curr.add({ days: 1 });
            }

            const blockedStrings = new Set(blockedDates.map(d => d.toDateString()));
            return !range.some(dStr => blockedStrings.has(dStr));
        }
    };
};
