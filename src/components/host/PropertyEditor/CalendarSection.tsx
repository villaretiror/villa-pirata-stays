import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAvailability } from '../../../hooks/useAvailability';
import { Property, CalendarSync } from '../../../types';
import { showToast } from '../../../utils/toast';
import { Calendar, RefreshCw, X, ShieldCheck, Lock, Unlock, DollarSign, CalendarSearch } from 'lucide-react';

interface CalendarSectionProps {
  form: Property;
  setForm: (p: Property) => void;
  onRefresh: () => void;
}

const CalendarSection: React.FC<CalendarSectionProps> = ({ form, setForm, onRefresh }) => {
  const [calMonth, setCalMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selection, setSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  const { 
    blockedDates: guestBlockedDates, 
    allBookings, 
    pendingLeads, 
    refresh: refreshAvailability 
  } = useAvailability(form.id);

  // --- Logic to detect occupancy status ---
  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 1. Manual Host Blocks (The black dots/pills)
    if (form.blockedDates.includes(dateStr)) return { blocked: true, type: 'manual', label: 'B', color: 'bg-black text-white' };
    
    // 2. Real Bookings (External or Direct)
    const booking = allBookings.find(b => {
      if (b.status === 'rejected' || b.status === 'expired') return false;
      return dateStr >= b.check_in && dateStr < b.check_out;
    });
    if (booking) {
      if (booking.status === 'external_block') return { blocked: true, type: 'external', label: 'EXT', color: 'bg-blue-600 text-white' };
      return { blocked: true, type: 'guest', label: 'RES', color: 'bg-primary text-white' };
    }

    // 3. Pending Leads
    const lead = pendingLeads.find(p => dateStr >= p.check_in && dateStr < p.check_out);
    if (lead) return { blocked: true, type: 'lead', label: 'HLD', color: 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' };

    // 4. Strategic Rules (Minimum stay, Advance notice)
    const isStrategy = guestBlockedDates.some(gbd => isSameDay(gbd, date));
    if (isStrategy) return { blocked: true, type: 'strategy', label: 'REG', color: 'bg-green-50 text-green-700 border border-green-100' };

    return { blocked: false };
  };

  const syncExternalCalendars = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/import', { method: 'POST' });
      const data = await res.json();
      await onRefresh();
      await refreshAvailability();
      showToast(data.success ? `¡Sincronizado! Se añadieron ${data.totalNewBlocksAdded} bloqueos.` : "Error en sincronización");
    } catch (e: any) {
      showToast("Falla técnica en sincronización iCal");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Range Selection Logic ---
  const handleDateClick = (date: Date) => {
    if (isPast(date) && !isSameDay(date, new Date())) {
        showToast("No puedes editar el pasado 🔱");
        return;
    }

    if (!selection.start || (selection.start && selection.end)) {
        setSelection({ start: date, end: null });
    } else {
        if (date < selection.start) {
            setSelection({ start: date, end: selection.start });
        } else if (isSameDay(date, selection.start)) {
            setSelection({ start: null, end: null });
        } else {
            setSelection({ ...selection, end: date });
        }
    }
  };

  const applyManualBlock = () => {
    if (!selection.start) return;
    const end = selection.end || selection.start;
    const interval = eachDayOfInterval({ start: selection.start, end });
    const newDates = interval.map(d => format(d, 'yyyy-MM-dd'));
    
    // Check if we should block or unblock
    const allAlreadyBlocked = newDates.every(d => form.blockedDates.includes(d));
    let updated: string[];
    
    if (allAlreadyBlocked) {
        updated = form.blockedDates.filter(d => !newDates.includes(d));
        showToast("Fechas liberadas satisfactoriamente 🔱");
    } else {
        updated = [...new Set([...form.blockedDates, ...newDates])];
        showToast("Bloqueo manual activado localmente 🔱");
    }

    setForm({ ...form, blockedDates: updated });
    setSelection({ start: null, end: null });
  };

  // --- Rendering Calendar Grid ---
  const monthStart = startOfMonth(calMonth);
  const daysInMonth = eachDayOfInterval({ 
    start: addDays(monthStart, -monthStart.getDay()), 
    end: addDays(endOfMonth(calMonth), 6 - endOfMonth(calMonth).getDay()) 
  });

  return (
    <div className="space-y-10 animate-fade-in pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="text-3xl font-serif font-black italic text-text-main tracking-tighter flex items-center gap-3">
             Motor de Disponibilidad 🔱
          </h3>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Gestión Unificada Sincronizada con iCal</p>
        </div>
        
        <div className="flex gap-4">
            <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all"><span className="material-icons text-base">chevron_left</span></button>
            <div className="px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm font-black text-xs text-text-main flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {format(calMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
            </div>
            <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all"><span className="material-icons text-base">chevron_right</span></button>
        </div>
      </header>

      {/* High-End Visual Calendar */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative">
        <div className="grid grid-cols-7 gap-4 mb-6 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-4 relative">
          {daysInMonth.map((day, i) => {
            const isSameMonth = day.getMonth() === calMonth.getMonth();
            const status = getDateStatus(day);
            const isSelected = selection.start && selection.end 
                ? isWithinInterval(day, { start: selection.start, end: selection.end })
                : selection.start && isSameDay(day, selection.start);

            return (
              <motion.button
                key={i}
                whileHover={isSameMonth ? { scale: 1.08, zIndex: 10 } : {}}
                whileTap={isSameMonth ? { scale: 0.94 } : {}}
                onClick={() => isSameMonth && handleDateClick(day)}
                className={`aspect-square w-full rounded-[1.25rem] text-sm font-black transition-all relative flex items-center justify-center
                  ${!isSameMonth ? 'opacity-20 cursor-default' : ''}
                  ${isSelected ? 'ring-4 ring-text-main shadow-2xl z-20 scale-105' : ''}
                  ${status.blocked ? status.color : 'bg-gray-50/50 hover:bg-white border border-gray-100/50 text-text-main shadow-sm'}`}
              >
                <span className={`relative z-10 ${isSelected && !status.blocked ? 'text-text-main' : ''}`}>{day.getDate()}</span>
                
                {status.blocked && (
                  <span className="absolute bottom-1.5 right-1.5 text-[8px] font-black opacity-50 uppercase z-10 tracking-tighter">
                    {status.label}
                  </span>
                )}
                
                {/* Visual Connector for range */}
                {selection.start && selection.end && isWithinInterval(day, { start: selection.start, end: selection.end }) && (
                    <div className="absolute inset-0 bg-black/10 rounded-[1.25rem] animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>
        
        {/* Dynamic Legend */}
        <div className="mt-12 pt-8 border-t border-gray-50 grid grid-cols-2 md:grid-cols-5 gap-8">
          {[
            { color: 'bg-blue-600', label: 'Externo', desc: 'Airbnb / Sync' },
            { color: 'bg-primary', label: 'Directo', desc: 'Reserva Local' },
            { color: 'bg-amber-100', label: 'Hold', desc: 'Lead Activo' },
            { color: 'bg-green-50', label: 'Regla', desc: 'Restricción' },
            { color: 'bg-black', label: 'Manual', desc: 'Bloqueo Host' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm shrink-0`} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-main leading-none">{item.label}</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action HUD ( Trident HUD ) */}
      <AnimatePresence>
        {(selection.start || selection.end) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[110] bg-white/90 backdrop-blur-xl border border-gray-100 p-2 md:p-3 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4"
          >
            <div className="px-5 py-3 border-r border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rango Seleccionado</p>
                <p className="text-[11px] font-black text-text-main flex items-center gap-2">
                    <CalendarSearch className="w-3.5 h-3.5 text-primary" />
                    {selection.start && format(selection.start, 'dd MMM')} 
                    {selection.end && ` — ${format(selection.end, 'dd MMM')}`}
                </p>
            </div>
            
            <div className="flex gap-2 pr-2">
                <button 
                  onClick={applyManualBlock}
                  className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-[1.25rem] hover:bg-black transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/20"
                >
                    <Lock className="w-3.5 h-3.5" />
                    Bloquear / Liberar
                </button>
                <button 
                  onClick={() => { showToast("Módulo de Tarifa Especial Próximamente 🔱"); }}
                  className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-[1.25rem] hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                    <DollarSign className="w-3.5 h-3.5" />
                    Ajustar Tarifa
                </button>
                <button 
                  onClick={() => setSelection({ start: null, end: null })}
                  className="p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[1.25rem] transition-all"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Control Section */}
      <div className="bg-sand/30 p-10 rounded-[3.5rem] border border-orange-100/50 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className={`w-5 h-5 text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
            <h4 className="font-serif font-black italic text-xl text-text-main tracking-tight">Sincronización Inteligente</h4>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] leading-relaxed max-w-lg">
            Salty gestiona la conexión bidireccional con tus canales externos cada 15 minutos de forma autónoma.
          </p>
        </div>
        <button 
          onClick={syncExternalCalendars} 
          disabled={isSyncing} 
          className="w-full md:w-auto px-10 py-5 bg-white border border-orange-100 rounded-3xl shadow-soft font-black text-[10px] uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50"
        >
          {isSyncing ? "Sincronizando..." : "Sincronizar Ahora 🔱"}
        </button>
      </div>
    </div>
  );
};

export default CalendarSection;
