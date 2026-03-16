import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'guest' | 'host' | 'admin';
}

/**
 * 🔐 PROTECTED ROUTE — MULTINIVEL v2
 *
 * Access to /host is granted if:
 *   1. User is the owner (villaretiror@gmail.com) ← always bypasses
 *   2. User has role='host' or role='admin' in profiles table
 *   3. User's email appears in property_cohosts with status='active' ← NEW
 *
 * The cohost check is done with a Supabase query on every /host navigation.
 * It uses a secondary loading state so the spinner doesn't block other routes.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = React.useState(false);

  // ── Cohost check state ─────────────────────────────────────────────────────
  const [cohostChecked, setCohostChecked] = useState(false);
  const [isCohostActive, setIsCohostActive] = useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => { setTimedOut(true); }, 5000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Only run the cohost check when:
  //   - Auth is done loading
  //   - A role is required ('host')
  //   - User exists but is NOT already an owner/host by role
  const isAdminEmail = user?.email?.toLowerCase() === 'villaretiror@gmail.com';
  const isOwnerOrHost = user?.role === 'host' || user?.role === 'admin' || isAdminEmail;

  useEffect(() => {
    if (loading) return;
    if (!user || !role) { setCohostChecked(true); return; }
    if (isOwnerOrHost) { setCohostChecked(true); return; }

    // Check property_cohosts table for this user's email
    const checkCohostAccess = async () => {
      try {
        const { data, error } = await supabase
          .from('property_cohosts')
          .select('id, status')
          .eq('email', user.email?.toLowerCase() ?? '')
          .eq('status', 'active')
          .limit(1);

        if (error) {
          console.error('[ProtectedRoute] Cohost check error:', error.message);
          setIsCohostActive(false);
        } else {
          setIsCohostActive((data?.length ?? 0) > 0);
        }
      } catch (e) {
        console.error('[ProtectedRoute] Cohost check exception:', e);
        setIsCohostActive(false);
      } finally {
        setCohostChecked(true);
      }
    };

    checkCohostAccess();
  }, [loading, user, role, isOwnerOrHost]);

  // ── Loading spinner (auth + cohost check) ─────────────────────────────────
  if (loading || (role === 'host' && !cohostChecked)) {
    return (
      <div className="fixed inset-0 bg-[#FDFCFB] z-50 flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FF7F3F]/10 border-t-[#FF7F3F] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons text-[#FF7F3F] animate-pulse">lock</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="font-serif font-black text-xl tracking-tighter text-text-main animate-pulse">
            {timedOut ? 'Autenticación Lenta' : 'Autenticando Acceso'}
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7F3F]">
            {timedOut ? 'Posible error de red' : 'Boutique Stays Security'}
          </p>
        </div>
        {timedOut && (
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Reintentar Carga
            </button>
            <button
              onClick={() => logout()}
              className="px-6 py-2 border border-black/10 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Role check: Owner / Host / Admin / Active Co-host ─────────────────────
  if (role) {
    const hasAccess = isOwnerOrHost || isCohostActive;
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return children as React.ReactElement;
};

export default ProtectedRoute;
