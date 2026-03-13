import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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
        if (triggerSync) {
            try {
                await fetch('/api/health-check');
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
        fetchHealth(true);
        const interval = setInterval(() => fetchHealth(false), 60000); // Polling cada 1 min
        return () => clearInterval(interval);
    }, []);

    const getGroupStatus = (group: 'Brain' | 'Airbnb' | 'Booking') => {
        const services = health.filter(h => {
            if (group === 'Brain') return h.service_name.includes('DB') || h.service_name.includes('Brain');
            return h.service_name.includes(group);
        });

        if (services.length === 0) return 'unknown';
        if (services.some(s => s.status === 'error')) return 'error';
        if (services.some(s => s.status === 'warning')) return 'warning';
        return 'healthy';
    };

    const StatusLED = ({ label, group }: { label: string, group: 'Brain' | 'Airbnb' | 'Booking' }) => {
        const status = getGroupStatus(group);
        const services = health.filter(h => {
            if (group === 'Brain') return h.service_name.includes('DB') || h.service_name.includes('Brain');
            return h.service_name.includes(group);
        });
        const lastSync = services.length > 0 ? new Date(services[0].last_check).toLocaleTimeString() : 'N/A';

        const colorClass = status === 'healthy' ? 'bg-[#2D5A27]' : status === 'error' ? 'bg-[#FF7F3F] animate-pulse' : 'bg-gray-300';
        const shadowClass = status === 'healthy' ? 'shadow-[0_0_8px_#2D5A27]' : status === 'error' ? 'shadow-[0_0_8px_#FF7F3F]' : '';

        return (
            <div className="relative group/led flex items-center gap-1.5 cursor-help">
                <div className={`w-2 h-2 rounded-full ${colorClass} ${shadowClass} transition-all duration-500`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-light group-hover/led:text-text-main transition-colors">
                    {label}
                </span>

                {/* Tooltip */}
                <div className="absolute top-full mt-2 right-0 hidden group-hover/led:block z-[100] animate-slide-up">
                    <div className="bg-secondary text-white p-2 rounded-xl shadow-xl w-40 border border-white/10 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase mb-1 border-b border-white/10 pb-1">{label} Link</p>
                        <p className="text-[8px] font-bold">Estado: <span className={status === 'healthy' ? 'text-green-400' : 'text-[#FF7F3F]'}>{status.toUpperCase()}</span></p>
                        <p className="text-[8px] opacity-60">Sinc: {lastSync}</p>
                        {status === 'error' && services[0]?.error_details && (
                            <p className="text-[7px] text-red-200 mt-1 italic line-clamp-2">{services[0].error_details}</p>
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
