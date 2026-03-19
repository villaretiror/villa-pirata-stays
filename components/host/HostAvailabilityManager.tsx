import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { Calendar, Save, Trash2, ShieldCheck, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HostAvailabilityManager({ properties }: { properties: any[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State
  const [minNights, setMinNights] = useState(2);
  const [advanceNotice, setAdvanceNotice] = useState(2);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [reason, setReason] = useState('');
  const [restrictedCheckin, setRestrictedCheckin] = useState<number[]>([]);

  useEffect(() => {
    if (selectedPropertyId) fetchRules();
  }, [selectedPropertyId]);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('availability_rules').select('*').eq('property_id', selectedPropertyId).order('start_date', { ascending: true });
    if (data) setRules(data);
    setIsLoading(false);
  };

  const handleDateChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    if (update[0] && update[1]) {
      // Open panel for new rule
      resetForm();
      setPanelOpen(true);
    }
  };

  const resetForm = () => {
      setEditingRuleId(null);
      setMinNights(2);
      setAdvanceNotice(2);
      setRequiresApproval(false);
      setBufferBefore(0);
      setBufferAfter(0);
      setReason('');
      setRestrictedCheckin([]);
  };

  const editRule = (r: any) => {
      setDateRange([new Date(r.start_date + 'T12:00:00'), new Date(r.end_date + 'T12:00:00')]);
      setEditingRuleId(r.id);
      setMinNights(r.min_nights || 2);
      setAdvanceNotice(r.advance_notice_days || 2);
      setRequiresApproval(r.requires_manual_approval || false);
      setBufferBefore(r.buffer_nights_before || 0);
      setBufferAfter(r.buffer_nights_after || 0);
      setReason(r.reason || '');
      setRestrictedCheckin(r.restricted_checkin_days || []);
      setPanelOpen(true);
  };

  const deleteRule = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await supabase.from('availability_rules').delete().eq('id', id);
      fetchRules();
      if (editingRuleId === id) setPanelOpen(false);
  };

  const toggleDay = (dayIndex: number) => {
      setRestrictedCheckin(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const saveRule = async () => {
      if (!startDate || !endDate) return;
      const sDay = startDate.toISOString().split('T')[0];
      const eDay = endDate.toISOString().split('T')[0];

      const payload = {
          property_id: selectedPropertyId,
          start_date: sDay,
          end_date: eDay,
          min_nights: minNights,
          advance_notice_days: advanceNotice,
          requires_manual_approval: advanceNotice === 0 ? requiresApproval : false,
          buffer_nights_before: bufferBefore,
          buffer_nights_after: bufferAfter,
          restricted_checkin_days: restrictedCheckin,
          reason: reason
      };

      if (editingRuleId) {
          await supabase.from('availability_rules').update(payload).eq('id', editingRuleId);
      } else {
          await supabase.from('availability_rules').insert(payload);
      }
      
      setPanelOpen(false);
      fetchRules();
  };

  const daysLabel = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 relative h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
             Motor de Disponibilidad
          </h1>
          <p className="text-gray-500 font-medium mt-1">Control táctico de la operación, bloqueos y over-rides premium.</p>
        </div>
        <select 
          className="bg-white border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-800 shadow-sm outline-none w-full md:w-auto"
          value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)}
        >
          {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Glass Calendar & List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2rem] shadow-xl overflow-hidden relative">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-4 text-gray-400">Selector de Rango</h3>
                    <div className="w-full interactive-availability-calendar">
                    <DatePicker
                        selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange}
                        monthsShown={typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1}
                        inline locale={es} disabledKeyboardNavigation
                    />
                    </div>
                </div>
            </div>
            
            <style>{`
                .interactive-availability-calendar .react-datepicker { border: none !important; width: 100%; background: transparent; }
                .interactive-availability-calendar .react-datepicker__header { background: transparent !important; border: none; }
                .interactive-availability-calendar .react-datepicker__day--selected,
                .interactive-availability-calendar .react-datepicker__day--in-selecting-range,
                .interactive-availability-calendar .react-datepicker__day--in-range,
                .interactive-availability-calendar .react-datepicker__day--keyboard-selected {
                  background-color: #1a1a1a !important; color: white !important; border-radius: 10px;
                }
            `}</style>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
             <h3 className="font-bold flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-primary" /> Reglas Activas (Overrides)</h3>
             {rules.length === 0 ? (
                 <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                     <p className="text-gray-500 font-medium">Ninguna regla customizada. Se usa configuración global.</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {rules.map(r => (
                         <div key={r.id} onClick={() => editRule(r)} className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-100 p-4 rounded-2xl transition-all relative group">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <p className="font-black text-sm">{new Date(r.start_date).toLocaleDateString()} al {new Date(r.end_date).toLocaleDateString()}</p>
                                     <p className="text-xs font-bold text-gray-500 mt-1">{r.reason || 'Sin título'}</p>
                                 </div>
                                 <button onClick={(e) => deleteRule(r.id, e)} className="text-gray-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                             <div className="mt-3 flex gap-2 flex-wrap">
                                 {r.min_nights && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-lg">Min: {r.min_nights}N</span>}
                                 {r.advance_notice_days === 0 && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-lg">Mismo Día</span>}
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
        </div>
        
        {/* Right: Drawer/Panel */}
        <div className="lg:col-span-1">
            <AnimatePresence>
                {panelOpen && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden sticky top-6 z-20 flex flex-col h-[calc(100vh-100px)]">
                        <div className="bg-gray-900 text-white p-6 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg">{editingRuleId ? 'Editar Regla' : 'Nueva Veda Estratégica'}</h3>
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setPanelOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full"><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Motivo / Nombre</label>
                                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Semana Santa, Limpieza Profunda" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Min Noches</label>
                                    <select value={minNights} onChange={e => setMinNights(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold outline-primary">
                                        {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} Noches</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Antelación</label>
                                    <select value={advanceNotice} onChange={e => setAdvanceNotice(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold outline-primary">
                                        <option value={0}>Mismo Día</option>
                                        <option value={1}>1 Día</option>
                                        <option value={2}>2 Días (Estandar)</option>
                                        <option value={3}>3 Días</option>
                                        <option value={7}>7 Días</option>
                                    </select>
                                </div>
                            </div>

                            {advanceNotice === 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-3 items-start">
                                    <input type="checkbox" id="approval" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="mt-1 w-5 h-5 accent-yellow-600 cursor-pointer" />
                                    <div>
                                        <label htmlFor="approval" className="font-bold text-sm text-yellow-900 cursor-pointer">Salty Approval (Aprobación Manual)</label>
                                        <p className="text-xs text-yellow-700 mt-1 font-medium">Salty interceptará reservas 'Last Minute' y te enviará un Telegram para que tú autorices la entrada.</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Días Prohibidos de Llegada</label>
                                <div className="flex justify-between">
                                    {daysLabel.map((d, i) => (
                                        <button key={i} onClick={() => toggleDay(i)} className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center transition-all ${restrictedCheckin.includes(i) ? 'bg-red-100 text-red-500 border border-red-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium mt-2">Días marcados en rojo NUNCA aceptarán Check-in.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center justify-between">Buffer Antes <span className="material-icons text-[14px]">shield</span></label>
                                    <select value={bufferBefore} onChange={e => setBufferBefore(Number(e.target.value))} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-bold text-blue-900 outline-none">
                                        <option value={0}>0 Noches</option><option value={1}>1 Noche</option><option value={2}>2 Noches</option>
                                    </select>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center justify-between">Buffer Después <span className="material-icons text-[14px]">shield</span></label>
                                    <select value={bufferAfter} onChange={e => setBufferAfter(Number(e.target.value))} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-bold text-blue-900 outline-none">
                                        <option value={0}>0 Noches</option><option value={1}>1 Noche</option><option value={2}>2 Noches</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                            <button onClick={saveRule} className="w-full py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all">
                                <ShieldCheck className="w-5 h-5" />
                                {editingRuleId ? 'Actualizar Directriz' : 'Activar Bloqueo'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
