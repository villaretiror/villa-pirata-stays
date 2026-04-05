import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/SupabaseService';

/**
 * 🛰️ HEALTH STATUS GROUP (INSTRUMENTAL 360)
 * Monitoreo avanzado de cables: Brain (DB), Airbnb y Booking.
 * Colores: Emerald Green (#2D5A27) y Fire Orange (#FF7F3F).
 */

interface HealthStatus {
    service_name: string;
    status: 'healthy' | 'warning' | 'error' | 'maintenance';
    last_check: string;
    latency_ms: number;
    error_details?: string;
    metadata: any;
}

const HealthStatusGroup: React.FC = () => {
    const [health, setHealth] = useState<HealthStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHealth = async (triggerSync = false) => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                // 🛰️ MASTER SENTINEL HEALTH
                await fetch('/api/master?task=health', {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });
            } catch (e) {
                console.error("Health sync failed:", e);
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
        fetchHealth(true);
        const interval = setInterval(() => fetchHealth(false), 60000); // Polling cada 1 min
        return () => clearInterval(interval);
    }, []);

    const getGroupStatus = (group: 'Brain' | 'Airbnb' | 'Booking') => {
        const services = health.filter(h => {
            if (group === 'Brain') return h.service_name.includes('DB') || h.service_name.includes('Brain') || h.service_name.includes('Salty');
            return h.service_name.includes(group);
        });

        if (services.length === 0) return 'unknown';
        
        // 🚀 LATENCY HEURISTICS: Supreme Architect Logic
        const avgLatency = services.reduce((acc, s) => acc + (s.latency_ms || 0), 0) / services.length;
        
        if (services.some(s => s.status === 'error') || avgLatency > 3000) return 'error';
        if (services.some(s => s.status === 'warning') || avgLatency > 1000) return 'warning';
        return 'healthy';
    };

    const StatusLED = ({ label, group }: { label: string, group: 'Brain' | 'Airbnb' | 'Booking' }) => {
        const status = getGroupStatus(group);
        const services = health.filter(h => {
            if (group === 'Brain') return h.service_name.includes('DB') || h.service_name.includes('Brain') || h.service_name.includes('Salty');
            return h.service_name.includes(group);
        });
        
        const avgLatency = Math.round(services.reduce((acc, s) => acc + (s.latency_ms || 0), 0) / (services.length || 1));
        const lastSync = services.length > 0 ? new Date(services[0].last_check).toLocaleTimeString() : 'N/A';

        const colorClass = status === 'healthy' ? 'bg-[#2D5A27]' : status === 'warning' ? 'bg-[#FF9F1C]' : status === 'error' ? 'bg-[#FF7F3F] animate-pulse' : 'bg-gray-300';
        const shadowClass = status === 'healthy' ? 'shadow-[0_0_8px_#2D5A27]' : status === 'warning' ? 'shadow-[0_0_8px_#FF9F1C]' : status === 'error' ? 'shadow-[0_0_8px_#FF7F3F]' : '';

        return (
            <div className="relative group/led flex items-center gap-1.5 cursor-help">
                <div className={`w-2 h-2 rounded-full ${colorClass} ${shadowClass} transition-all duration-500`}></div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light group-hover/led:text-text-main transition-colors">
                    {label}
                </span>

                {/* Tooltip */}
                <div className="absolute top-full mt-2 right-0 hidden group-hover/led:block z-[100] animate-slide-up">
                    <div className="bg-secondary text-white p-3 rounded-[1.5rem] shadow-2xl w-48 border border-white/10 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase mb-1 border-b border-white/10 pb-1 flex justify-between">
                            <span>{label} Link</span>
                            <span className="opacity-60">{avgLatency}ms</span>
                        </p>
                        <p className="text-[8px] font-bold">Estado: <span className={status === 'healthy' ? 'text-green-400' : 'text-[#FF7F3F]'}>{status.toUpperCase()}</span></p>
                        <p className="text-[8px] opacity-60">Sinc: {lastSync}</p>
                        {status === 'error' && services[0]?.error_details && (
                            <p className="text-[7px] text-red-200 mt-1 italic line-clamp-2">{services[0].error_details}</p>
                        )}
                        {services.length > 1 && (
                            <div className="mt-2 text-[7px] opacity-80 space-y-0.5">
                                {services.map(s => (
                                    <div key={s.service_name} className="flex justify-between">
                                        <span>{s.service_name}</span>
                                        <span>{s.latency_ms}ms</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex gap-4 opacity-50"><div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse"></div></div>;

    return (
        <div className="flex items-center gap-4 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-sm transition-all hover:bg-white/60">
            <StatusLED label="Brain" group="Brain" />
            <div className="w-px h-3 bg-gray-200"></div>
            <StatusLED label="Airbnb" group="Airbnb" />
            <StatusLED label="Booking" group="Booking" />
        </div>
    );
};

export default HealthStatusGroup;
