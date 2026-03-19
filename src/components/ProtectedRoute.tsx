import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'guest' | 'host' | 'admin';
}

/**
 * 🔐 PROTECTED ROUTE — ESTRUCTURA ROBUSTA v3
 * 
 * Se ha optimizado para evitar bucles de renderizado infinitos y 
 * manejar de forma elegante los tiempos de espera de Supabase.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  const [cohostChecked, setCohostChecked] = useState(false);
  const [isCohostActive, setIsCohostActive] = useState(false);

  // 1. Manejo de Timeouts en Auth
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setTimedOut(true), 5000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // 2. Verificación de Roles Dinámica (Co-hosts)
  useEffect(() => {
    if (loading || !user) return;

    const isAdminEmail = user?.email?.toLowerCase() === 'villaretiror@gmail.com';
    const isOwnerOrHost = user?.role === 'host' || user?.role === 'admin' || isAdminEmail;

    if (!role || isOwnerOrHost) {
      setCohostChecked(true);
      return;
    }

    const checkCohostAccess = async () => {
      try {
        const { data } = await supabase
          .from('property_cohosts')
          .select('id')
          .eq('email', user.email?.toLowerCase() ?? '')
          .eq('status', 'active')
          .limit(1);

        setIsCohostActive((data?.length ?? 0) > 0);
      } catch (e) {
        setIsCohostActive(false);
      } finally {
        setCohostChecked(true);
      }
    };

    checkCohostAccess();
  }, [loading, user, role]);

  // 3. Navegación Segura (Fuera del render body)
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Si no hay usuario y ya terminó de cargar, vamos al login
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    if (role && cohostChecked) {
      const isAdminEmail = user?.email?.toLowerCase() === 'villaretiror@gmail.com';
      const isOwnerOrHost = user?.role === 'host' || user?.role === 'admin' || isAdminEmail;
      const hasAccess = isOwnerOrHost || isCohostActive;

      if (!hasAccess) {
        navigate('/', { replace: true });
      }
    }
  }, [loading, user, role, cohostChecked, isCohostActive, navigate, location]);

  // ── Renderizado de Estados de Carga ──────────────────────────────────
  if (loading || (role === 'host' && !cohostChecked)) {
    return (
      <div className="fixed inset-0 bg-[#FDFCFB] z-[9999] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FF7F3F]/10 border-t-[#FF7F3F] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons text-[#FF7F3F] animate-pulse">lock</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="font-serif font-black text-xl text-text-main animate-pulse">
            {timedOut ? 'Autenticación Lenta' : 'Autenticando Acceso'}
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7F3F]">
            {timedOut ? 'Posible error de red' : 'Boutique Stays Security'}
          </p>
        </div>
        {timedOut && (
          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Reintentar
            </button>
            <button onClick={() => logout()} className="px-8 py-2 text-[10px] font-black uppercase tracking-widest border border-black/10 rounded-full active:scale-95 transition-all">
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    );
  }

  // Si hay usuario y (o no se requiere rol o el rol ya se verificó), pintamos el contenido
  if (user && (!role || cohostChecked)) {
    return <>{children}</>;
  }

  // Fallback visual mientras ocurre la redirección del useEffect
  return null;
};

export default ProtectedRoute;
