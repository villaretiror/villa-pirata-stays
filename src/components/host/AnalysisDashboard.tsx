import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { Printer, Sparkles, Target, Star, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '../../lib/SupabaseService';
import { useProperty } from '../../contexts/PropertyContext';
import { Property, BookingRow, ExpenseRow } from '../../types';

interface AnalysisDashboardProps {
  bookings: BookingRow[];
  expenses: ExpenseRow[];
  properties: Property[];
  selectedPropertyId: string;
  onFilterChange: (id: string) => void;
}

/**
 * 🔱 ANALYSIS DASHBOARD (Salty Intelligence Hub)
 * Handles financial analytics, ROI tracking, and predictive demand modeling.
 */
export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ 
  bookings, 
  expenses, 
  properties, 
  selectedPropertyId, 
  onFilterChange 
}) => {
  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross');
  const [demandData, setDemandData] = useState<any[]>([]);
  const [rescueCandidates, setRescueCandidates] = useState<any[]>([]);
  const { getCalendarGaps } = useProperty();

  // 🔱 SALTY BRAIN: Fetch Demand Heatmap & Rescue Candidates & ROI
  useEffect(() => {
    const fetchDemand = async () => {
      const [
        { data: demand }, 
        { data: sent }, 
        { data: attributionBookings }
      ] = await Promise.all([
        supabase.from('demand_logs').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('rescue_emails_sent').select('*'),
        supabase.from('bookings').select('total_price, attribution_source').eq('attribution_source', 'salty_rescue').eq('status', 'confirmed')
      ]);
      
      if (demand) {
        // ROI Calculation (Storing globally for UI overlays)
        const rescuedMoney = (attributionBookings as any[])?.reduce((acc: number, b: any) => acc + (b.total_price || 0), 0) || 0;
        (window as any).saltyROI = rescuedMoney;

        // Heatmap logic: Distribution of interest across months
        const heatmap = (demand as any[]).reduce((acc: any, log: any) => {
          if (!log.check_in) return acc;
          const month = new Date(log.check_in).toLocaleString('es-ES', { month: 'short' }).toUpperCase();
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});
        setDemandData(Object.entries(heatmap).map(([name, value]) => ({ name, value })));

        // 🕵️ SALTY TARGETING: Cross-reference demand with calendar gaps
        const allGaps: any[] = [];
        properties.forEach((p: any) => {
           const pgaps = getCalendarGaps(p.id);
           pgaps.forEach((g: any) => allGaps.push({ ...g, property_id: p.id, property_title: p.title }));
        });

        const candidates = (demand as any[]).filter((d: any) => 
           d.lead_email && 
           d.lead_temperature !== 'cold' && 
           allGaps.some((g: any) => g.property_id === d.property_id || !d.property_id)
        ).map((d: any) => {
           const matchGap = allGaps.find((g: any) => 
              (g.property_id === d.property_id || !d.property_id) && 
              new Date(g.check_in) >= new Date(d.check_in!) && 
              new Date(g.check_out) <= new Date(d.check_out!)
           );
           
           const rescueAttempts = (sent as any[])?.filter((s: any) => s.lead_email === d.lead_email).length || 0;
           const lastSent = (sent as any[])?.filter((s: any) => s.lead_email === d.lead_email).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
           const isFatigued = lastSent && (Date.now() - new Date(lastSent.created_at).getTime()) < 15 * 24 * 60 * 60 * 1000;

           return { ...d, matchGap, isFatigued, rescueAttempts };
        }).filter((c: any) => c.matchGap && !c.isFatigued);
        
        setRescueCandidates(candidates);
      }
    };
    fetchDemand();
  }, [properties, getCalendarGaps]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const creationDate = selectedProperty?.created_at ? new Date(selectedProperty.created_at) : null;

  const filteredBookings = useMemo(() =>
    selectedPropertyId === 'all' ? bookings : bookings.filter(b => b.property_id === selectedPropertyId),
    [bookings, selectedPropertyId]
  );

  const filteredExpenses = useMemo(() =>
    selectedPropertyId === 'all' ? expenses : expenses.filter(e => e.property_id === selectedPropertyId),
    [expenses, selectedPropertyId]
  );

  /**
   * Financial Statistics Engine: Aggregates income and outcome month over month.
   */
  const stats = useMemo(() => {
    const data: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthStr = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

      const monBookings = filteredBookings.filter((b: any) => {
        const bDate = new Date(b.check_in);
        return bDate.getMonth() === month && bDate.getFullYear() === year;
      });

      const income = monBookings.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
      const expense = filteredExpenses
        .filter((e: any) => {
          const eDate = new Date(e.created_at);
          return eDate.getMonth() === month && eDate.getFullYear() === year;
        })
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const webIncome = monBookings
        .filter((b: any) => !b.source?.toLowerCase().includes('airbnb') && !b.source?.toLowerCase().includes('ota'))
        .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);

      const otaIncome = income - webIncome;

      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      let availableDays = totalDaysInMonth;
      if (creationDate) {
        const cMonth = creationDate.getMonth();
        const cYear = creationDate.getFullYear();
        if (cYear > year || (cYear === year && cMonth > month)) {
          availableDays = 0;
        } else if (cYear === year && cMonth === month) {
          availableDays = totalDaysInMonth - creationDate.getDate() + 1;
        }
      }

      const bookedDays = monBookings.reduce((sum: number, b: any) => {
        if (!b.check_in || !b.check_out) return sum;
        const start = new Date(b.check_in);
        const end = new Date(b.check_out);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diff;
      }, 0);
      const occupancy = availableDays > 0 ? Math.min(Math.round((bookedDays / availableDays) * 100), 100) : 0;

      data.push({
        name: monthStr,
        Total: income,
        Web: webIncome,
        OTA: otaIncome,
        Gastos: expense,
        Profit: income - expense,
        Ocupación: occupancy
      });
    }
    return data;
  }, [filteredBookings, filteredExpenses, creationDate]);

  const currentMonthData = stats[stats.length - 1] || { Total: 0, Profit: 0, Ocupación: 0, Gastos: 0 };
  const margin = currentMonthData.Total > 0 ? Math.round((currentMonthData.Profit / currentMonthData.Total) * 100) : 0;

  const handleExport = () => window.print();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm print:hidden">
        <select
          value={selectedPropertyId}
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-transparent border-none text-[10px] font-black uppercase tracking-[0.25em] opacity-80 outline-none cursor-pointer"
        >
          <option value="all">Todas las villas</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
          <button
            onClick={() => setViewMode('gross')}
            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'gross' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Bruto
          </button>
          <button
            onClick={() => setViewMode('net')}
            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'net' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Neto
          </button>
        </div>

        <button
          onClick={handleExport}
          className="px-5 py-2.5 bg-black text-white rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-gray-800 active:scale-95 shadow-xl"
        >
          <Printer className="w-4 h-4 text-primary" />
          Imprimir Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-soft relative overflow-hidden group">
          <div className="flex justify-between items-center mb-12 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <h3 className="text-2xl font-serif font-black italic text-text-main tracking-tighter">Análisis de Desempeño 🔱</h3>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] ml-3.5">Métricas Consolidadas (6M)</p>
            </div>
            <div className="flex flex-col items-end gap-1 bg-sand/30 p-4 rounded-2xl border border-primary/10">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest opacity-60">Margen Operativo</span>
              <span className="text-3xl font-serif font-black italic leading-none">{margin}%</span>
            </div>
          </div>

          <div className="h-72 w-full min-h-[300px]">
            <Suspense fallback={<div className="h-full w-full bg-gray-50/50 animate-pulse rounded-3xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-gray-300">Inyectando Data Geográfica...</div>}>
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <AreaChart data={stats}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CBB28A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#CBB28A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#666' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '15px' }}
                  />
                  <Area type="monotone" dataKey="Total" stroke="#CBB28A" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={4} />
                  <Area type="monotone" dataKey="Profit" stroke="#2D5A27" fillOpacity={0} strokeWidth={5} />
                  <Area type="monotone" dataKey="Gastos" stroke="#EE4E4E" fillOpacity={0} strokeWidth={2} strokeDasharray="6 4" />
                </AreaChart>
              </ResponsiveContainer>
            </Suspense>
          </div>
        </div>

        {/* 🔱 SALTY REVENUE RADAR: Predictive Heatmap & ROI */}
        <div className="bg-gradient-to-br from-[#0A0D14] to-[#1A1F2B] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                     <h3 className="text-xl font-serif font-black italic text-white tracking-tighter">Radar de Demanda (Salty AI)</h3>
                  </div>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.25em] ml-3.5">Mapa Histórico de Interés</p>
               </div>
               <div className="text-right p-4 bg-white/5 rounded-[2rem] border border-white/5">
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Impacto Salty (Rescatado)</p>
                  <p className="text-3xl font-serif font-black italic text-primary-light">
                    ${((window as any).saltyROI || 0).toLocaleString()}
                  </p>
               </div>
            </div>
            
            <div className="h-64 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <AreaChart data={demandData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#999' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', background: '#222', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.15} strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* 🤖 SALTY PREDICTION BRIDGE */}
            <div className="mt-8 p-6 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 group-hover:border-primary/30 transition-all duration-500">
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-primary-light tracking-[0.3em] mb-1.5">Sugerencia Estratégica AI</p>
                    <p className="text-xs font-medium text-white/70 leading-relaxed italic">
                      "Master, observo un pico de intención para el próximo trimestre. Te recomiendo ajustar el Multi-Night Discount al 15% para sellar las semanas huérfanas identificadas en Isabela."
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
