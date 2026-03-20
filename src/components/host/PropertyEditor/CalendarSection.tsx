import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAvailability } from '../../../hooks/useAvailability';
import { Property, CalendarSync } from '../../../types';
import { showToast } from '../../../pages/HostDashboard';

interface CalendarSectionProps {
  form: Property;
  setForm: (p: Property) => void;
  onRefresh: () => void;
}

const CalendarSection: React.FC<CalendarSectionProps> = ({ form, setForm, onRefresh }) => {
  const [calMonth, setCalMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [newSyncUrl, setNewSyncUrl] = useState('');
  const [newSyncPlatform, setNewSyncPlatform] = useState('Airbnb');

  const { 
    blockedDates: guestBlockedDates, 
    allBookings, 
    pendingLeads, 
    refresh: refreshAvailability 
  } = useAvailability(form.id);

  const isDateOccupied = (dateStr: string) => {
    if (form.blockedDates.includes(dateStr)) return { blocked: true, type: 'manual', source: 'Manual' };
    
    const booking = allBookings.find(b => {
      if (b.status === 'rejected' || b.status === 'expired') return false;
      return dateStr >= b.check_in && dateStr < b.check_out;
    });
    if (booking) {
      const type = booking.status === 'external_block' ? 'external' : 'guest';
      return { blocked: true, type, source: booking.source || 'Directo Web' };
    }

    const lead = pendingLeads.find(p => dateStr >= p.check_in && dateStr < p.check_out);
    if (lead) return { blocked: true, type: 'lead', source: 'Lead en Proceso' };

    const isGuestBlocked = guestBlockedDates.some(gbd => gbd.toISOString().split('T')[0] === dateStr);
    if (isGuestBlocked) return { blocked: true, type: 'strategy', source: 'Regla/Antelación' };

    return { blocked: false };
  };

  const toggleDateBlock = (dateStr: string) => {
    const isBlocked = form.blockedDates.includes(dateStr);
    const newBlocked = isBlocked 
      ? form.blockedDates.filter((d: string) => d !== dateStr)
      : [...form.blockedDates, dateStr];
    setForm({ ...form, blockedDates: newBlocked });
  };

  const syncExternalCalendars = async (syncItems: CalendarSync[]) => {
    if (syncItems.length === 0) return;
    setIsSyncing(true);
    try {
      await fetch('/api/calendar/import', { method: 'POST' });
      await onRefresh();
      await refreshAvailability();
      showToast("Calendarios sincronizados correctamente ✨");
    } catch (e: any) {
      showToast(`Error de Sincronización: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Rendering logic from original HostDashboard ---
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} />);

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = d.toISOString().split('T')[0];
    const occupancy = isDateOccupied(dateStr);
    const { blocked: isBlocked, type } = occupancy;

    days.push(
      <motion.button
        key={i}
        whileHover={{ scale: 1.05, zIndex: 10 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (type && type !== 'manual') {
            showToast(`Bloqueado por: ${occupancy.source?.toUpperCase()}`);
            return;
          }
          toggleDateBlock(dateStr);
        }}
        className={`h-11 w-full rounded-xl text-xs font-black transition-all relative group shadow-sm
          ${type === 'external' ? 'bg-blue-600 text-white cursor-default' : 
            type === 'guest' ? 'bg-primary text-white cursor-default' : 
            type === 'lead' ? 'bg-orange-400 text-white cursor-default animate-pulse' :
            type === 'strategy' ? 'bg-green-50 text-green-700 border-green-100' :
            isBlocked ? 'bg-gray-900 text-white shadow-md' : 
            'bg-gray-50 text-text-main border border-gray-100 hover:bg-white'}`}
      >
        <span className="relative z-10">{i}</span>
        {isBlocked && (
          <span className="absolute bottom-1 right-1 text-[7px] font-black opacity-60 uppercase z-10">
            {type === 'external' ? 'EXT' : type === 'guest' ? 'RES' : type === 'lead' ? 'HLD' : type === 'strategy' ? 'REG' : 'B'}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header>
        <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Motor de Disponibilidad 🔱</h3>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Gestión Unificada Sincronizada con iCal</p>
      </header>

      {/* Visual Calendar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-soft">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCalMonth(new Date(year, month - 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><span className="material-icons">chevron_left</span></button>
          <span className="font-bold text-gray-700">{calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCalMonth(new Date(year, month + 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><span className="material-icons">chevron_right</span></button>
        </div>
        <div className="grid grid-cols-7 gap-3 mb-3 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d: string) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-3">{days}</div>
        
        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-gray-50 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { color: 'bg-blue-600', label: 'Externo', desc: 'Airbnb / Sync' },
            { color: 'bg-primary', label: 'Directo', desc: 'Web Local' },
            { color: 'bg-orange-400', label: 'Hold', desc: 'Lead Activo' },
            { color: 'bg-green-100', label: 'Regla', desc: 'Manual/Antelación' },
            { color: 'bg-gray-900', label: 'Manual', desc: 'Bloqueo Host' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm shrink-0`} />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-tight text-gray-700 leading-none">{item.label}</p>
                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Section (simplified for clean display) */}
      <div className="bg-sand/30 p-8 rounded-[2.5rem] border border-orange-100/50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="font-bold text-sm flex items-center gap-2"><span className="material-icons text-secondary text-base">sync_alt</span> Sincronización Automática</h4>
            <p className="text-[10px] text-text-light uppercase font-black tracking-widest mt-1">Conecta con cualquier plataforma vía iCal</p>
          </div>
          <button onClick={() => syncExternalCalendars(form.calendarSync)} disabled={isSyncing} className="bg-white p-3 rounded-2xl shadow-sm text-primary hover:scale-105 active:scale-95 transition-all">
            <span className={`material-icons text-sm ${isSyncing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
        {/* ... Sync List and Form would go here ... */}
        <p className="text-[10px] text-gray-400 italic">* Los calendarios se sincronizan automáticamente cada 15 min, pero puedes forzarlo aquí.</p>
      </div>
    </div>
  );
};

export default CalendarSection;
