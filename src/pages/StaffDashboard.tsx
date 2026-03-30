import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Tables } from '../supabase_types';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  Sparkles, Coffee, Utensils, Heart, Info,
  ChevronRight, RefreshCcw, LogOut, Home, 
  MapPin, Phone, User as UserIcon, Bell
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type BookingRow = Tables<'bookings'>;

const StaffDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOperationalBookings = async () => {
    setIsRefreshing(true);
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch bookings that are checking in or out soon
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`check_in.gte.${today},check_out.gte.${today}`)
      .eq('status', 'confirmed')
      .order('check_in', { ascending: true });

    if (data) setBookings(data);
    if (error) console.error('Error fetching staff data:', error);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchOperationalBookings();
  }, []);

  const categorizedBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      arrivals: bookings.filter(b => b.check_in === today || isTomorrow(parseISO(b.check_in))),
      departures: bookings.filter(b => b.check_out === today),
      upcoming: bookings.filter(b => b.check_in > today && !isTomorrow(parseISO(b.check_in)))
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
    <div className="min-h-screen bg-[#fdfcfb] p-4 md:p-8 pb-20">
      {/* Header Elite */}
      <header className="max-w-4xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Operations Control</span>
          </div>
          <h1 className="font-serif font-black italic text-4xl text-[#1a1a1a] tracking-tighter">Manifiesto de Staff</h1>
        </div>
        <button 
          onClick={fetchOperationalBookings}
          disabled={isRefreshing}
          className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 hover:scale-105 active:scale-95 transition-all group"
        >
          <RefreshCcw className={`w-5 h-5 text-gray-400 group-hover:text-[#D4AF37] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {/* Arrivals Today/Tomorrow - PRIORITY 1 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black italic text-xl tracking-tight">Próximas Entradas</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Prioridad ALTA: Preparar Propiedades</p>
            </div>
          </div>

          <div className="space-y-4">
            {categorizedBookings.arrivals.length === 0 ? (
              <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">No hay entradas para hoy ni mañana</p>
              </div>
            ) : (
              categorizedBookings.arrivals.map(booking => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={booking.id} 
                  className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden group"
                >
                  {isToday(parseISO(booking.check_in)) && (
                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-white px-6 py-1.5 rounded-bl-3xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg animate-pulse">
                      Entrada HOY
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Home className="w-4 h-4 text-[#D4AF37]" />
                        <span className="font-serif font-black italic text-2xl tracking-tighter">Propiedad #{booking.property_id}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <UserIcon className="w-4 h-4 text-gray-300" />
                          <span className="text-sm font-bold text-gray-700">{booking.customer_name || 'Huésped Elite'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-300" />
                          <span className="text-sm font-bold text-gray-700">
                            {format(parseISO(booking.check_in), 'EEEE d MMMM', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BBA27E] mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Add-ons & Concierge
                      </h4>
                      
                      <div className="flex flex-wrap gap-2">
                        {(!booking.addons_breakdown || (Array.isArray(booking.addons_breakdown) && booking.addons_breakdown.length === 0)) ? (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 italic">Estadía estándar (sin extras)</p>
                        ) : (
                          Array.isArray(booking.addons_breakdown) ? (
                            booking.addons_breakdown.map((addon: string) => renderAddonBadge(addon))
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Departures - PRIORITY 2 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black italic text-xl tracking-tight">Salidas Hoy</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Turno de Limpieza & Lavandería</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorizedBookings.departures.length === 0 ? (
              <div className="col-span-full bg-gray-50/50 p-8 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">No hay salidas programadas para hoy</p>
              </div>
            ) : (
              categorizedBookings.departures.map(booking => (
                <div key={booking.id} className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 flex justify-between items-center group hover:border-[#BBA27E] transition-all">
                  <div>
                    <h3 className="font-serif font-black italic text-lg tracking-tight">Propiedad #{booking.property_id}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{booking.customer_name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase text-indigo-600 mb-1">Check-out</span>
                    <span className="text-xs font-bold text-gray-600">11:00 AM</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Bottom Navigation */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl flex justify-around items-center">
          <button className="flex flex-col items-center gap-1 text-[#D4AF37] px-4 py-2">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Tareas</span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={() => window.location.href = 'tel:' + (process.env.VITE_HOST_PHONE || '7870000000')} className="flex flex-col items-center gap-1 text-gray-400 px-4 py-2">
            <Phone className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Llamar</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

// Lucide replacement for missing icon in my write_to_file context
const LayoutDashboard = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);

export default StaffDashboard;
