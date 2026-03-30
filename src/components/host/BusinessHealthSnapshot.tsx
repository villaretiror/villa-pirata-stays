import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const BusinessHealthSnapshot: React.FC = () => {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    queries: 0,
    emergencies: 0,
    efficiency: 98
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      setIsLoading(true);
      const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // 1. Reservas
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price')
        .gte('created_at', sinceDate);

      // 2. Gastos
      const { data: expensesData } = await supabase
        .from('property_expenses')
        .select('amount')
        .gte('created_at', sinceDate);

      // 3. Consultas (Interactividad)
      const { data: logs } = await supabase
        .from('chat_logs')
        .select('message_count, human_takeover_until')
        .gte('last_interaction', sinceDate);

      // 4. Emergencias
      const { data: tickets } = await supabase
        .from('emergency_tickets')
        .select('id')
        .eq('status', 'resolved')
        .gte('created_at', sinceDate);

      const totalRevenue = bookings?.reduce((acc: number, b: any) => acc + (b.total_price || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0) || 0;
      const totalQueries = logs?.length || 0;
      const totalEmergencies = tickets?.length || 0;

      // Calcular eficiencia real: % de chats que NO requirieron intervención humana (human_takeover_until es null o pasado)
      const autoChats = logs?.filter((l: any) => !l.human_takeover_until || new Date(l.human_takeover_until) < new Date()).length || 0;
      const realEfficiency = totalQueries > 0 ? Math.round((autoChats / totalQueries) * 100) : 98;

      setStats({
        revenue: totalRevenue,
        expenses: totalExpenses,
        queries: totalQueries,
        emergencies: totalEmergencies,
        efficiency: Math.min(realEfficiency, 100)
      });
      setIsLoading(false);
    };

    fetchHealth();
  }, [range]);

  if (isLoading) return (
    <div className="bg-text-main rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-pulse">
        <div className="h-48 bg-white/5 rounded-3xl"></div>
    </div>
  );

  const profit = stats.revenue - stats.expenses;

  return (
    <div className="bg-text-main rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden transition-all duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-6">
        <div>
          <h2 className="font-serif font-black italic text-4xl mb-1 flex items-center gap-3">
            CEO Snapshot
            <span className="text-primary text-xl animate-pulse">🔥</span>
          </h2>
          <p className="text-[10px] font-semibold uppercase opacity-80 tracking-[0.3em] text-white/40">Visualización de alto nivel • Salty Engine v3.0</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 transition-all ${
                range === r ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 relative z-10">
        <div className="space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-white/50">Estado Financiero</p>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black tracking-tight">${stats.revenue.toLocaleString()}</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-white/30">Gastos:</span>
              <span className={stats.expenses > 0 ? 'text-red-400' : 'text-white/50'}>${stats.expenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-white/50">Balance Neto</p>
          <div className="space-y-1">
            <span className={`text-3xl font-serif font-black tracking-tight ${profit >= 0 ? 'text-white' : 'text-primary'}`}>
              ${profit.toLocaleString()}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary">
               Yield Real-Time
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-white/50">Operación IA</p>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black tracking-tight">{stats.queries}</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Consultas Totales</div>
          </div>
        </div>

        <div className="space-y-3 flex flex-col justify-end">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-white/50">Eficiencia Salty</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black">
               <span>Score Actual</span>
               <span className="text-primary">{stats.efficiency}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.efficiency}%` }}
                className="bg-primary h-full shadow-[0_0_15px_rgba(var(--color-primary),0.5)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-white/10 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          Live Insights Syncing
        </div>
        <button className="flex items-center gap-2 text-primary hover:text-white transition-all hover:tracking-[0.6em]">
          Exportar PDF <TrendingUp className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default BusinessHealthSnapshot;
