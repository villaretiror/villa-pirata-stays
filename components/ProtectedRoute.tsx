import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'guest' | 'host' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setTimedOut(true);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
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

  // Bypass for Admin email regardless of metadata
  const isAdminEmail = user.email?.toLowerCase() === 'villaretiror@gmail.com';

  if (role && user.role !== role && user.role !== 'admin' && !isAdminEmail) {
    return <Navigate to="/" replace />;
  }

  return children as React.ReactElement;
};

export default ProtectedRoute;
