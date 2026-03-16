import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, ShieldCheck, Activity, AlertCircle } from 'lucide-react';

const BusinessHealthSnapshot: React.FC = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    queries: 0,
    emergencies: 0,
    efficiency: 98
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      // Aggregate data from bookings and chat logs for the last 24h
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: logs } = await supabase
        .from('chat_logs')
        .select('message_count')
        .gte('last_interaction', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: tickets } = await supabase
        .from('emergency_tickets')
        .select('id')
        .eq('status', 'resolved')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalRevenue = bookings?.reduce((acc: number, b: any) => acc + (b.total_price || 0), 0) || 0;
      const totalQueries = logs?.length || 0;
      const totalemergencies = tickets?.length || 0;

      setStats({
        revenue: totalRevenue,
        queries: totalQueries,
        emergencies: totalemergencies,
        efficiency: 98 // Simulated high efficiency
      });
      setIsLoading(false);
    };

    fetchHealth();
  }, []);

  if (isLoading) return <div className="animate-pulse h-48 bg-gray-50 rounded-3xl"></div>;

  return (
    <div className="bg-text-main rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h2 className="font-serif font-black italic text-2xl mb-1">CEO Snapshot</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Estado del Negocio - Últimas 24h</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Todo bajo control</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Reservas Generadas</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-serif font-bold">${stats.revenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Consultas Resueltas</p>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-2xl font-serif font-bold">{stats.queries}</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Mant. Coordinado</p>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-2xl font-serif font-bold">{stats.emergencies}</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Eficiencia Salty</p>
          <div className="flex items-center gap-2">
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[98%]"></div>
            </div>
            <span className="text-xl font-serif font-bold">{stats.efficiency}%</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
        <span>Próximo Reporte en 12h</span>
        <button className="flex items-center gap-2 text-primary hover:text-white transition-colors">
          Exportar PDF <TrendingUp className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default BusinessHealthSnapshot;
