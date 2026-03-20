import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addDays, isPast, isBefore, startOfToday, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAvailability } from '../../../hooks/useAvailability';
import { Property, CalendarSync } from '../../../types';
import { ChevronLeft, ChevronRight, Calendar, RefreshCcw, X, ShieldCheck, Lock, Unlock, DollarSign, CalendarSearch } from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface CalendarSectionProps {
  form: any;
  setForm: (form: any) => void;
  monthsCount?: number;
  onRefresh?: (signal?: any) => any;
}

export default function CalendarSection({ form, setForm, monthsCount = 1, onRefresh }: CalendarSectionProps) {
  const [calMonth, setCalMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selection, setSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  
  // Pricing States
  const [isPricingMode, setIsPricingMode] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  const { 
    blockedDates: guestBlockedDates, 
    allBookings, 
    pendingLeads, 
    refresh: refreshAvailability 
  } = useAvailability(form.id);

  // --- Logic to detect occupancy status ---
  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 1. Manual Block (Host Block)
    const isManual = form.blockedDates?.includes(dateStr);
    if (isManual) return { blocked: true, type: 'manual', label: 'B', color: 'bg-black text-white' };

    // 2. Booking (Confirmed / Completed)
    const booking = allBookings.find(b => 
        (b.status === 'confirmed' || b.status === 'completed' || b.status === 'external_block') && 
        dateStr >= b.check_in && dateStr < b.check_out
    );
    if (booking) {
        const isExternal = booking.status === 'external_block';
        return { 
            blocked: true, 
            type: isExternal ? 'external' : 'booking', 
            label: isExternal ? 'EXT' : 'RES',
            color: isExternal ? 'bg-blue-600 text-white' : 'bg-primary text-white' 
        };
    }

    // 3. Lead (Pending)
    const lead = pendingLeads.find(l => dateStr >= l.check_in && dateStr < l.check_out);
    if (lead) return { blocked: true, type: 'lead', label: 'HLD', color: 'bg-amber-100 text-amber-700' };

    // 4. Strategic Rule (Strategy)
    const isStrategy = guestBlockedDates.some(gbd => isSameDay(gbd, date));
    if (isStrategy) return { blocked: true, type: 'strategy', label: 'REG', color: 'bg-green-50 text-green-700 border border-green-100' };

    // 5. Seasonal Pricing (Special Rates)
    const hasSpecialPrice = form.seasonal_prices?.some((sp: any) => 
        dateStr >= sp.startDate && dateStr < sp.endDate
    );
    if (hasSpecialPrice) return { blocked: false, type: 'special_price', label: '$$', color: 'bg-white border-primary/40 border-2 text-primary' };

    return { blocked: false };
  };

  const syncExternalCalendars = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/calendar/import', { method: 'POST' });
      await refreshAvailability();
      if (onRefresh) onRefresh();
      showToast("Calendarios Sincronizados ✨");
    } catch (e) {
      showToast("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Range Selection Logic ---
  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfToday())) return;
    
    if (!selection.start || (selection.start && selection.end)) {
      setSelection({ start: date, end: null });
    } else {
      const start = selection.start;
      const end = date;
      if (isBefore(end, start)) {
        setSelection({ start: end, end: start });
      } else {
        setSelection({ start, end });
      }
    }
  };

  const applyManualBlock = () => {
    if (!selection.start) return;
    const end = selection.end || selection.start;
    const range = eachDayOfInterval({ start: selection.start, end });
    const rangeStrs = range.map(d => format(d, 'yyyy-MM-dd'));
    
    let updated = [...(form.blockedDates || [])];
    const allBlocked = rangeStrs.every(d => updated.includes(d));
    
    if (allBlocked) {
      updated = updated.filter(d => !rangeStrs.includes(d));
      showToast("Días Liberados 🔱");
    } else {
      updated = Array.from(new Set([...updated, ...rangeStrs]));
      showToast("Días Bloqueados 🔱");
    }
    
    setForm({ ...form, blockedDates: updated });
    setSelection({ start: null, end: null });
  };

  const applySeasonalPrice = () => {
    if (!selection.start || !newPrice) return;
    const end = selection.end || selection.start;
    
    const newRate = {
        id: crypto.randomUUID(),
        startDate: format(selection.start, 'yyyy-MM-dd'),
        endDate: format(addDays(end, 1), 'yyyy-MM-dd'), // Excluyente para el motor
        price: Number(newPrice),
        label: `Ajuste Táctico ${format(selection.start, 'MMM')}`
    };

    const updatedPrices = [...(form.seasonal_prices || []), newRate];
    setForm({ ...form, seasonal_prices: updatedPrices });
    
    showToast(`Tarifa de $${newPrice} aplicada al rango 🔱`);
    setSelection({ start: null, end: null });
    setIsPricingMode(false);
    setNewPrice('');
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ 
      start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
      end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }) 
    });

    return (
      <div key={monthDate.toString()} className="flex-1">
        <h4 className="text-center font-serif font-black italic text-sm mb-6 uppercase tracking-widest text-text-main">
          {format(monthDate, 'MMMM yyyy', { locale: es })}
        </h4>
        
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
          {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
            <div key={d} className="text-center text-[8px] font-black text-gray-400 py-2">{d}</div>
          ))}
          
          {daysInMonth.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthDate);
            const status = getDateStatus(day);
            const isSelected = selection.start && selection.end 
              ? isWithinInterval(day, { start: selection.start, end: selection.end })
              : selection.start && isSameDay(day, selection.start);
            
            return (
              <motion.button
                key={i}
                whileHover={isCurrentMonth ? { scale: 1.1 } : {}}
                whileTap={isCurrentMonth ? { scale: 0.95 } : {}}
                onClick={() => isCurrentMonth && handleDateClick(day)}
                className={`
                  relative aspect-square md:aspect-[1.2/1] rounded-xl md:rounded-[1.25rem] text-[10px] md:text-xs font-black transition-all flex items-center justify-center
                  ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                  ${isSelected ? 'ring-2 ring-black z-20 scale-105' : ''}
                  ${status.color || 'bg-gray-50/50 text-text-light hover:bg-gray-100'}
                `}
              >
                <span className={`relative z-10 ${isSelected && !status.blocked ? 'text-text-main' : ''}`}>{day.getDate()}</span>
                
                {(status.blocked || status.label === '$$') && (
                  <span className="absolute bottom-1.5 right-1.5 text-[8px] font-black opacity-50 uppercase z-10 tracking-tighter">
                    {status.label}
                  </span>
                )}
                
                {/* Visual Connector for range */}
                {selection.start && selection.end && isWithinInterval(day, { start: selection.start, end: selection.end }) && (
                    <div className="absolute inset-0 bg-black/10 rounded-xl md:rounded-[1.25rem] animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-32">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button 
                onClick={() => setCalMonth(addMonths(calMonth, -1))}
                className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setCalMonth(addMonths(calMonth, 1))}
                className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={syncExternalCalendars}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Actualizar Canales'}
          </button>
        </div>

        <div className={`flex flex-col ${monthsCount > 1 ? 'lg:flex-row' : ''} gap-12`}>
            {Array.from({ length: monthsCount }).map((_, idx) => renderMonth(addMonths(calMonth, idx)))}
        </div>
        
        {/* Dynamic Legend */}
        <div className="mt-12 pt-8 border-t border-gray-50 grid grid-cols-2 md:grid-cols-6 gap-6">
          {[
            { color: 'bg-blue-600', label: 'Externo', desc: 'Airbnb / Sync' },
            { color: 'bg-primary', label: 'Directo', desc: 'Reserva Local' },
            { color: 'bg-amber-100', label: 'Hold', desc: 'Lead Activo' },
            { color: 'border-primary/40 border-2', label: 'Tarifa $$', desc: 'Precio Especial' },
            { color: 'bg-green-50', label: 'Regla', desc: 'Restricción' },
            { color: 'bg-black', label: 'Manual', desc: 'Bloqueo Host' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 group cursor-help">
              <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm shrink-0 group-hover:scale-125 transition-transform`} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-main leading-none">{item.label}</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      {/* Floating Action HUD ( Trident HUD ) */}
      <AnimatePresence>
        {(selection.start || selection.end) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[110] bg-white/90 backdrop-blur-xl border border-gray-100 p-2 md:p-3 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col md:flex-row items-center gap-4"
          >
            <div className="px-5 py-3 border-r border-gray-100 hidden md:block">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rango Seleccionado</p>
                <p className="text-[11px] font-black text-text-main flex items-center gap-2">
                    <CalendarSearch className="w-3.5 h-3.5 text-primary" />
                    {selection.start && format(selection.start, 'dd MMM')} 
                    {selection.end && ` — ${format(selection.end, 'dd MMM')}`}
                </p>
            </div>
            
            <div className="flex gap-2 p-1">
                {isPricingMode ? (
                    <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-2xl">
                        <div className="relative pl-4 pr-2 py-3 flex items-center gap-2">
                            <span className="text-gray-400 font-black text-xs">$</span>
                            <input 
                                type="number" 
                                autoFocus
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                placeholder="Precio x Noche"
                                className="bg-transparent border-none outline-none text-xs font-black w-24 text-text-main"
                            />
                        </div>
                        <button 
                            onClick={applySeasonalPrice}
                            className="bg-primary text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                        >
                            Fijar Tarifa
                        </button>
                        <button onClick={() => setIsPricingMode(false)} className="p-3 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={applyManualBlock}
                            className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-[1.25rem] hover:bg-black transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/20"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            Bloquear / Liberar
                        </button>
                        <button 
                            onClick={() => setIsPricingMode(true)}
                            className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-[1.25rem] hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            <DollarSign className="w-3.5 h-3.5" />
                            Ajustar Tarifa
                        </button>
                    </>
                )}
                
                {!isPricingMode && (
                    <button 
                      onClick={() => setSelection({ start: null, end: null })}
                      className="p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[1.25rem] transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Control Section */}
      <div className="bg-sand/30 p-10 rounded-[3.5rem] border border-orange-100/50 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCcw className={`w-5 h-5 text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
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
}
