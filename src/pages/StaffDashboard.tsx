import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/SupabaseService';
import { Tables } from '../types/supabase';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  Sparkles, Coffee, Heart,
  ChevronRight, RefreshCcw, LogOut, Home, 
  Phone, User as UserIcon, Bell, CheckSquare, Square
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type BookingRow = Tables<'bookings'>;
type TaskRow = Tables<'tasks'>;

const StaffDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState<number | string | null>(null);

  const fetchData = async () => {
    setIsRefreshing(true);
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch bookings for today's context
    const { data: bData, error: bError } = await supabase
      .from('bookings')
      .select('*')
      .or(`check_in.gte.${today},check_out.gte.${today}`)
      .eq('status', 'confirmed')
      .order('check_in', { ascending: true });

    // 2. Fetch tasks for the crew
    const { data: tData, error: tError } = await supabase
      .from('tasks')
      .select('*')
      .order('priority', { ascending: false });

    if (bData) setBookings(bData);
    if (tData) setTasks(tData);
    
    if (bError) console.error('Error fetching bookings:', bError);
    if (tError) console.error('Error fetching tasks:', tError);
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  const handleToggleTask = async (taskId: number, currentDone: boolean) => {
    setIsUpdating(taskId);
    const newDone = !currentDone;
    const newStatus = newDone ? 'completed' : 'pending';

    const { error } = await supabase
      .from('tasks')
      .update({ done: newDone, status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
      alert('Error al actualizar tarea. Reintente.');
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone, status: newStatus } : t));
    }
    setIsUpdating(null);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categorizedBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      arrivals: bookings.filter(b => b.check_in === today || isTomorrow(parseISO(b.check_in))),
      departures: bookings.filter(b => b.check_out === today)
    };
  }, [bookings]);

  const renderAddonBadge = (addon: string) => {
    const config: Record<string, { icon: any, label: string, color: string }> = {
      'early_checkin': { icon: Clock, label: 'Early Check-in (1:00 PM)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'late_checkout': { icon: LogOut, label: 'Late Check-out (2:00 PM)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      'romance_pkg': { icon: Heart, label: 'Romance Package (Champaña + Pétalos)', color: 'bg-rose-100 text-rose-700 border-rose-200' },
      'breakfast_bundle': { icon: Coffee, label: 'Desayuno Premium', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    };

    const item = config[addon];
    if (!item) return <span key={addon} className="px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">{addon}</span>;

    const Icon = item.icon;
    return (
      <div key={addon} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${item.color} shadow-sm animate-pulse`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#BBA27E] animate-spin mb-4" />
        <p className="font-serif italic text-lg tracking-tight">Sincronizando Misión Cabo Rojo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] p-4 md:p-8 pb-32">
      {/* Header Elite */}
      <header className="max-w-4xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Operations Control</span>
          </div>
          <h1 className="font-serif font-black italic text-4xl text-[#1a1a1a] tracking-tighter">Panel de Acción Staff</h1>
        </div>
        <button 
          onClick={fetchData}
          disabled={isRefreshing}
          className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 hover:scale-105 active:scale-95 transition-all group"
        >
          <RefreshCcw className={`w-5 h-5 text-gray-400 group-hover:text-[#D4AF37] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {/* TASKS SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black italic text-xl tracking-tight">Lista de Misiones Today</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Toca para marcar como completada</p>
            </div>
          </div>

          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">No hay tareas pendientes</p>
              </div>
            ) : (
              tasks.map(task => (
                <motion.div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id as number, !!task.done)}
                  className={`bg-white rounded-3xl p-6 shadow-md border-2 transition-all cursor-pointer flex items-center justify-between ${
                    task.done ? 'border-emerald-100 opacity-60' : 'border-transparent hover:border-[#BBA27E]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`${task.done ? 'text-emerald-500' : 'text-gray-300'}`}>
                      {isUpdating === task.id ? (
                        <RefreshCcw className="w-6 h-6 animate-spin" />
                      ) : task.done ? (
                        <CheckSquare className="w-6 h-6" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className={`font-serif font-black italic text-lg ${task.done ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>
                        {task.text}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* ARRIVALS WITH ADDONS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black italic text-xl tracking-tight">Llegadas & Add-ons</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Atención a servicios especiales</p>
            </div>
          </div>

          <div className="space-y-4">
            {categorizedBookings.arrivals.length === 0 ? (
              <p className="text-[10px] font-bold text-gray-300 text-center">Sin entradas próximamente</p>
            ) : (
              categorizedBookings.arrivals.map(booking => (
                <div key={booking.id} className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
                  {isToday(parseISO(booking.check_in)) && (
                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-white px-4 py-1 rounded-bl-2xl font-black text-[8px] uppercase tracking-widest animate-pulse">
                      HOY
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-serif font-black italic text-xl tracking-tight mb-2">{booking.customer_name || 'Huésped Elite'}</h3>
                    <div className="flex items-center gap-3 text-gray-400">
                      <Home className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Propiedad #{booking.property_id}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:max-w-[50%]">
                    {(!booking.addons_breakdown || (Array.isArray(booking.addons_breakdown) && booking.addons_breakdown.length === 0)) ? (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 italic opacity-50">Estadía Estándar</p>
                    ) : (
                      Array.isArray(booking.addons_breakdown) ? (
                        (booking.addons_breakdown as string[]).map((addon: string) => renderAddonBadge(addon))
                      ) : null
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Footer Nav */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl flex justify-around items-center">
          <button className="flex flex-col items-center gap-1 text-[#D4AF37] px-4 py-2">
            <CheckSquare className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Panel</span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={() => window.location.href = 'tel:7870000000'} className="flex flex-col items-center gap-1 text-gray-400 px-4 py-2">
            <Phone className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Contactar</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default StaffDashboard;
