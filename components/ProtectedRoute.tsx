import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'guest' | 'host';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

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
          <p className="font-serif font-black text-xl tracking-tighter text-text-main animate-pulse">Autenticando Acceso</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7F3F]">Boutique Stays Security</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children as React.ReactElement;
};

export default ProtectedRoute;
