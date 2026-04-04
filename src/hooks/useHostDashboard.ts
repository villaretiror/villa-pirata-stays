import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useProperty } from '../contexts/PropertyContext.js';
import { mapSupabaseProperty } from '../utils/mappers.js';
import { showToast } from '../utils/toast.js';
import { 
  BookingWithDetails, ExpenseRow, LeadRow, 
  AlertRow, HostTab 
} from '../types/host.js';
import { Property, Review } from '../types/index.js';

/**
 * 🔱 USE HOST DASHBOARD (Master Intelligence Hook)
 * Centralizes SWR logic, financial memoization, and Salty AI action protocols.
 */
export const useHostDashboard = () => {
  const { user } = useAuth();
  const authUser = user as any;
  const { 
    properties, 
    localGuideData: guideData, 
    updateProperties: onUpdateProperties 
  } = useProperty();

  // Unified State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<AlertRow[]>([]);
  const [realBookings, setRealBookings] = useState<BookingWithDetails[]>([]);
  const [pendingPayments, setPendingPayments] = useState<BookingWithDetails[]>([]);
  const [globalExpenses, setGlobalExpenses] = useState<ExpenseRow[]>([]);

  const DASH_CACHE_KEY = `host_dash_cache_${authUser?.id}`;

  // --- SWR ENGINE: Cache Restoration ---
  const restoreCache = useCallback(() => {
    if (!authUser?.id) return;
    const cached = localStorage.getItem(DASH_CACHE_KEY);
    if (cached) {
      try {
        const { realBookings, globalExpenses, leads, alerts, pendingPayments } = JSON.parse(cached);
        if (realBookings) setRealBookings(realBookings);
        if (globalExpenses) setGlobalExpenses(globalExpenses);
        if (leads) setLeads(leads);
        if (alerts) setUrgentAlerts(alerts);
        if (pendingPayments) setPendingPayments(pendingPayments);
      } catch (e) { console.warn("SWR Cache Restore Failed:", e); }
    }
  }, [DASH_CACHE_KEY, authUser?.id]);

  /**
   * 🛰️ DATA ACQUISITION PROTOCOL
   * Fetches the unified dashboard bundle using a high-performance RPC call.
   */
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    const authUser = user as any;
    if (!authUser?.id || !authUser?.email) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { data: bundle, error: bundleError } = await supabase.rpc('get_host_dashboard_bundle', {
        target_email: authUser.email.toLowerCase()
      });

      if (bundleError) throw bundleError;
      if (!bundle) return;

      // 1. Update Global Property Context
      const mappedProps = (bundle.properties || []).map((p: any) =>
        mapSupabaseProperty(p, { 
          full_name: authUser.full_name || '', 
          avatar_url: authUser.avatar_url || '', 
          role: authUser.role || '' 
        }, { isAdmin: true })
      );
      onUpdateProperties(mappedProps);

      // 2. Set Local State
      const filteredBookings = (bundle.bookings || []).filter((b: any) => 
        (b.check_out >= new Date().toISOString().split('T')[0] && b.status !== 'rejected')
      );

      setRealBookings(filteredBookings);
      setGlobalExpenses(bundle.expenses || []);
      setLeads(bundle.leads || []);
      setUrgentAlerts(bundle.alerts || []);
      setPendingPayments(bundle.pending_payments || []);

      // 3. Update SWR Cache
      localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({
        realBookings: filteredBookings,
        globalExpenses: bundle.expenses || [],
        leads: bundle.leads || [],
        alerts: bundle.alerts || [],
        pendingPayments: bundle.pending_payments || []
      }));

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || "Fallo en la sincronización con la flota.");
        console.error("fetchData Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, onUpdateProperties, DASH_CACHE_KEY]);

  // --- MEMOIZED ANALYTICS ENGINE ---

  /**
   * Calculate financial KPIs (Revenue, Profit, Performance)
   * This is a "heavy" computation memoized to prevent UI jank.
   */
  const analytics = useMemo(() => {
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const performance: Record<string, number> = {};
    const monthsHistory: Record<string, number> = {};
    const chartData: { label: string, val: number }[] = [];

    realBookings.forEach((b: any) => {
      const amount = Number(b.total_price) || 0;
      totalRevenue += amount;
      
      const propTitle = b.properties?.title || 'Villa';
      performance[propTitle] = (performance[propTitle] || 0) + amount;

      if (b.check_in) {
        const stayDate = new Date(b.check_in);
        const monthKey = `${stayDate.getFullYear()}-${String(stayDate.getMonth() + 1).padStart(2, '0')}`;
        monthsHistory[monthKey] = (monthsHistory[monthKey] || 0) + amount;
        
        if (stayDate.getMonth() === currentMonth && stayDate.getFullYear() === currentYear && b.status !== 'cancelled') {
          monthlyRevenue += amount;
        }
      }
    });

    // Generate 6-month historical chart data
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      chartData.push({ 
        label: d.toLocaleString('es-PR', { month: 'short' }).toUpperCase(), 
        val: monthsHistory[monthKey] || 0 
      });
    }

    return { totalRevenue, monthlyRevenue, propertyPerformance: performance, chartData };
  }, [realBookings]);

  /**
   * Filter check-ins for the next 72 hours (Today/Hotlist)
   */
  const hotCheckins = useMemo(() => {
    const today = new Date();
    const range = [0, 1, 2].map(days => {
      const d = new Date();
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    });
    
    return realBookings
      .filter(b => range.includes(b.check_in) && b.status === 'confirmed')
      .sort((a, b) => a.check_in.localeCompare(b.check_in));
  }, [realBookings]);

  // --- ACTIONS PROTOCOL ---

  const approvePayment = async (bookingId: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
    if (!error) { 
      showToast("¡Reserva confirmada! ✨"); 
      await fetchData(); 
    } else {
      setError(error.message);
    }
  };

  const rejectPayment = async (bookingId: string, reason: string) => {
    const { error } = await supabase.from('bookings').update({ 
      status: 'rejected', 
      metadata: { rejection_reason: reason } 
    }).eq('id', bookingId);
    
    if (!error) { 
      showToast("Pago Rechazado ❌"); 
      await fetchData(); 
    } else {
      setError(error.message);
    }
  };

  const resolveNotification = async (type: 'lead' | 'alert', id: string) => {
    const table = type === 'lead' ? 'leads' : 'urgent_alerts';
    const { error } = await supabase.from(table).update({ status: 'resolved' }).eq('id', id);
    if (!error) { 
      showToast("Protocolo resuelto ✅"); 
      await fetchData(); 
    } else {
      setError(error.message);
    }
  };

  const saveProperty = async (updated: Property) => {
    setIsSaving(true);
    try {
      // 🔱 ELITE DATA SANITIZATION: Separate frontend virtuals from database persistence
      const { 
        host, 
        isOffline, 
        blockedDates,
        outputs,
        ...dbPayload 
      } = updated as any;

      // 🔱 MAP BACK TO SCHEMA: Ensure database naming conventions are respected
      const payload = {
        ...dbPayload,
        is_cleaning_in_progress: updated.is_cleaning_in_progress || false,
        exact_lat_long: updated.exact_lat_long || null,
        general_area_map_url: updated.general_area_map_url || '',
        blockeddates: blockedDates || [], // Map back to 'blockeddates' (lowercase)
        is_offline: isOffline || false,   // Map back to 'is_offline' (underscored)
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase.from('properties')
        .update(payload)
        .eq('id', updated.id);

      if (updateError) {
        console.error("[saveProperty] Critical Persistence Error:", updateError);
        throw updateError;
      }
      
      showToast("Sincronización Completa ✅");
      onUpdateProperties(properties.map(p => p.id === updated.id ? updated : p));
      await fetchData(); // Force re-sync of all stats
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`);
      console.error("[saveProperty] Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = async (type: 'lead' | 'profile', id: string, tags: string[]) => {
    const table = type === 'lead' ? 'leads' : 'profiles';
    const { error } = await supabase.from(table).update({ tags }).eq('id', id);
    if (!error) {
      showToast("Etiqueta actualizada ✨");
      await fetchData();
    }
  };

  // 🔱 SALTY AI: Logic for dynamic suggestions could live here or be returned
  const getSaltySuggestions = useCallback(() => {
    if (leads.length > 5) return "Master, veo una congestión de leads. Sugiero Blast WA pronto.";
    if (analytics.monthlyRevenue > 5000) return "Excelente Yield este mes. ¿Subimos el piso un 5%?";
    return "Día tranquilo. Buen momento para auditar inventario.";
  }, [leads.length, analytics.monthlyRevenue]);

  // Initial Sync
  useEffect(() => {
    restoreCache();
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, restoreCache]);

  return {
    // Data
    leads,
    urgentAlerts,
    realBookings,
    pendingPayments,
    globalExpenses,
    properties,
    guideData,
    
    // Analytics (Memoized)
    ...analytics,
    hotCheckins,
    saltyBriefing: getSaltySuggestions(),

    // Loading/Error
    isLoading,
    isSaving,
    error,

    // Actions
    fetchData,
    approvePayment,
    rejectPayment,
    resolveNotification,
    saveProperty,
    addTag,
    setError
  };
};
