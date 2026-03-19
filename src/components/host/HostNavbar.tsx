import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import HealthStatusGroup from './HealthStatusGroup';
import SmartImage from '../SmartImage';

/**
 * 🛰️ HOST NAVBAR (SUPREME COMMAND CENTER)
 * Header superior del Dashboard del Host con Instrumental de Salud.
 */

interface HostNavbarProps {
    activeTab: string;
    onNavigateHome: () => void;
}

const HostNavbar: React.FC<HostNavbarProps> = ({ activeTab, onNavigateHome }) => {
    const { user } = useAuth();

    const tabTitles: Record<string, string> = {
        today: 'Hoy',
        listings: 'Listados',
        guidebook: 'Guía',
        menu: 'Menú',
        reviews: 'Reseñas',
        messages: 'Mensajes',
        leads: 'Clientes',
        payments: 'Pagos',
        analytics: 'Inteligencia Financiera',
        insights: 'Insights 🔥'
    };

    return (
        <header className="sticky top-0 z-30 bg-sand/95 backdrop-blur-md px-4 sm:px-6 pt-10 sm:pt-12 pb-4 flex justify-between items-center print:hidden border-b border-gray-100/50">
            <div className="flex flex-col max-w-[40%] sm:max-w-none">
                <h1 className="text-xl sm:text-3xl font-serif font-black italic tracking-tighter text-text-main truncate">
                    {tabTitles[activeTab] || 'Dashboard'}
                </h1>
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary mt-0.5">Control</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
                {/* 🛡️ PRIVACY WRAPPER: Solo el Admin ve los cables */}
                {(user?.role === 'host' || user?.email === 'villaretiror@gmail.com') && (
                    <div className="hidden md:block">
                        <HealthStatusGroup />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateHome}
                        className="text-[9px] font-black text-text-light uppercase tracking-widest border border-gray-200 bg-white px-4 py-2 rounded-full hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                        Salir
                    </button>

                    <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-float relative cursor-pointer hover:scale-105 transition-transform active:scale-95">
                        <SmartImage src={user?.avatar || ''} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-primary/5"></div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default HostNavbar;
