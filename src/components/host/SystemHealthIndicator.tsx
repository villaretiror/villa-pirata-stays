import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 🛰️ SYSTEM HEALTH INDICATOR (FRONTEND)
 * Muestra el estado en tiempo real de los cables de Airbnb, Booking y Supabase.
 * Ubicación: Sidebar / Navbar del Dashboard.
 */

interface HealthStatus {
    service_name: string;
    status: 'healthy' | 'warning' | 'error' | 'maintenance';
    last_check: string;
    latency_ms: number;
    error_details?: string;
    metadata: any;
}

const SystemHealthIndicator: React.FC = () => {
    const [health, setHealth] = useState<HealthStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    const fetchHealth = async (triggerSync = false) => {
        if (triggerSync) {
            try {
                // 🛰️ MASTER SENTINEL HEALTH CHECK
                await fetch('/api/master?task=health');
                setLastSync(new Date());
            } catch (e) {
                console.error("Health sync failed:", e);
            }
        }

        const { data, error } = await supabase
            .from('system_health')
            .select('*')
            .order('last_check', { ascending: false });

        if (!error && data) {
            setHealth(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Ejecución inicial con sincronización backend
        fetchHealth(true);

        // Polling ligero cada 2 minutos (solo lectura de DB)
        const interval = setInterval(() => fetchHealth(false), 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-gray-400">Escaneando Red...</span>
        </div>
    );

    const isAllHealthy = health.length > 0 && health.every(h => h.status === 'healthy');
    const hasError = health.some(h => h.status === 'error');

    return (
        <div className="flex flex-col gap-2 mb-6 animate-fade-in group">
            <div className="flex items-center justify-between">
                <div
                    onClick={() => fetchHealth(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer active:scale-95 ${isAllHealthy ? 'bg-green-50/50 border-green-100 text-green-600' :
                        hasError ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-sand/50 border-primary/20 text-primary'
                        }`}>
                    <div className={`w-2 h-2 rounded-full ${isAllHealthy ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                        hasError ? 'bg-red-500 animate-pulse' : 'bg-primary'
                        }`}></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                        {isAllHealthy ? 'Cables Operativos' : hasError ? 'Error de Enlace' : 'Sincronizando'}
                    </span>
                    <span className="material-icons text-[10px] opacity-0 group-hover:opacity-40 transition-opacity">refresh</span>
                </div>

                <div className="flex gap-2.5 px-2">
                    {health.map(h => (
                        <div key={h.service_name} className="relative group/icon">
                            <span className={`material-icons text-sm transition-all ${h.status === 'healthy' ? 'text-gray-300 hover:text-primary' :
                                h.status === 'error' ? 'text-red-400' : 'text-primary'
                                }`}>
                                {h.service_name.includes('Airbnb') ? 'flight_takeoff' :
                                    h.service_name.includes('Booking') ? 'bed' :
                                        h.service_name.includes('DB') ? 'storage' : 'settings_input_component'}
                            </span>

                            {/* Premium Tooltip */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover/icon:block z-[100] animate-slide-up">
                                <div className="bg-secondary text-white p-3 rounded-2xl shadow-xl w-48 border border-white/10 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                                        <span className="text-[8px] font-black uppercase text-accent">{h.metadata?.platform || 'System'}</span>
                                        <span className="text-[8px] font-bold opacity-60">{h.latency_ms}ms</span>
                                    </div>
                                    <p className="text-[10px] font-bold mb-1">{h.service_name.split('_').join(' ')}</p>
                                    <p className={`text-[9px] font-black uppercase ${h.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                                        Status: {h.status}
                                    </p>
                                    {h.error_details && (
                                        <p className="text-[8px] text-red-200 mt-1 italic leading-tight">{h.error_details}</p>
                                    )}
                                </div>
                                <div className="w-2 h-2 bg-secondary rotate-45 mx-auto -mt-1 border-r border-b border-white/10"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter text-center opacity-0 group-hover:opacity-100 transition-opacity">
                Último Pulso: {lastSync.toLocaleTimeString()}
            </p>
        </div>
    );
};

export default SystemHealthIndicator;
