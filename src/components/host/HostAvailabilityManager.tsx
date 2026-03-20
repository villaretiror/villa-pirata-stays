import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, RefreshCcw, DollarSign, Search, Tag, Zap, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarSection from './PropertyEditor/CalendarSection';
import { showToast } from '../../utils/toast';

export default function HostAvailabilityManager({ properties, onRefresh }: { properties: any[], onRefresh?: () => void }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const activeProperty = properties.find(p => p.id === selectedPropertyId);
  const [isSaving, setIsSaving] = useState(false);

  // local "form" state to talk to CalendarSection
  const [localForm, setLocalForm] = useState<any>(null);

  useEffect(() => {
    if (activeProperty) {
      setLocalForm({
        ...activeProperty,
        blockedDates: activeProperty.blockedDates || [],
        seasonal_prices: activeProperty.seasonal_prices || [],
        calendarSync: activeProperty.calendarSync || []
      });
    }
  }, [activeProperty]);

  const handleUpdateProperty = async (updatedForm: any) => {
    setLocalForm(updatedForm);
    setIsSaving(true);
    
    const { error } = await supabase
      .from('properties')
      .update({
        blockedDates: updatedForm.blockedDates,
        seasonal_prices: updatedForm.seasonal_prices,
        price: updatedForm.price,
        is_offline: updatedForm.is_offline,
        calendarSync: updatedForm.calendarSync
      })
      .eq('id', selectedPropertyId);

    if (error) {
       showToast("Error al guardar cambios 🔱");
    } else {
       if (onRefresh) onRefresh();
    }
    setIsSaving(false);
  };

  if (!localForm) return null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 animate-fade-in">
      {/* Header Táctico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-serif font-black italic text-text-main tracking-tighter flex items-center gap-4">
             Motor de Disponibilidad
             <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none">Live Sync</span>
             </div>
          </h1>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Control táctico de la operación y over-rides premium</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-gray-100 shadow-soft">
           <div className="pl-4 pr-2 text-gray-300">
              <Search className="w-5 h-5" />
           </div>
           <select 
             className="bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-xs text-text-main outline-none min-w-[240px] appearance-none"
             value={selectedPropertyId} 
             onChange={(e) => setSelectedPropertyId(e.target.value)}
           >
             {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 items-start">
        
        {/* Lado Izquierdo: Master Calendar Workspace (3/4) */}
        <div className="xl:col-span-3 space-y-12">
           <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-primary/10" />
              
              <div className="relative z-10">
                 <CalendarSection 
                   form={localForm} 
                   setForm={handleUpdateProperty} 
                   monthsCount={2}
                 />
              </div>
           </div>

           {/* Stats / Quick Insights */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/95 p-8 rounded-[3rem] text-white flex items-center gap-6 shadow-2xl relative overflow-hidden">
                 <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                    <Zap className="w-8 h-8 text-primary" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Eficiencia Local</h4>
                    <p className="text-3xl font-serif font-black italic mt-1">94% <span className="text-xs font-sans text-green-400">↑2%</span></p>
                 </div>
                 <Radio className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
              </div>
              
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center gap-6 shadow-soft">
                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <RefreshCcw className="w-8 h-8 text-blue-600" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bloqueos Externos</h4>
                    <p className="text-3xl font-serif font-black italic mt-1">{activeProperty.blockedDates?.length || 0} <span className="text-xs font-sans text-gray-400">Total</span></p>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center gap-6 shadow-soft">
                 <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                    <Tag className="w-8 h-8 text-orange-600" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reglas Activas</h4>
                    <p className="text-3xl font-serif font-black italic mt-1">{localForm.seasonal_prices?.length || 0} <span className="text-xs font-sans text-gray-400">Precio</span></p>
                 </div>
              </div>
           </div>
        </div>

        {/* Lado Derecho: Operational Controls (1/4) */}
        <div className="xl:col-span-1 space-y-8 sticky top-24">
           
           {/* Card 1: Master Price Control */}
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-serif font-black italic text-xl text-text-main tracking-tight">Tarifa Master</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Precio base por noche</p>
                 </div>
                 <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                 </div>
              </div>

              <div className="relative mb-6">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                <input 
                  type="number" 
                  value={localForm.price} 
                  onChange={(e) => setLocalForm({ ...localForm, price: Number(e.target.value) })}
                  onBlur={() => handleUpdateProperty(localForm)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] pl-12 pr-6 py-6 font-black text-4xl text-text-main outline-none focus:bg-white transition-all shadow-inner" 
                />
              </div>
              
              <div className="bg-sand/30 p-4 rounded-2xl text-[10px] font-medium text-gray-500 italic leading-relaxed">
                 Este precio aplica automáticamente a todos los días que no tengan una regla de Tarifa Especial configurada.
              </div>
           </div>

           {/* Card 2: Strategic Block (Panic Mode) */}
           <div className={`p-8 rounded-[3rem] border shadow-xl transition-all relative overflow-hidden group ${localForm.is_offline ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className={`font-serif font-black italic text-xl tracking-tight ${localForm.is_offline ? 'text-red-900' : 'text-text-main'}`}>Modo Emergencia</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${localForm.is_offline ? 'text-red-600' : 'text-gray-400'}`}>Visibilidad de la Villa</p>
                 </div>
                 <button 
                   onClick={() => handleUpdateProperty({ ...localForm, is_offline: !localForm.is_offline })}
                   className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${localForm.is_offline ? 'bg-red-500' : 'bg-gray-200'}`}
                 >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${localForm.is_offline ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>
              
              <div className={`p-5 rounded-3xl border transition-all ${localForm.is_offline ? 'bg-white/80 border-red-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                 <p className={`text-[11px] font-bold leading-relaxed ${localForm.is_offline ? 'text-red-800' : 'text-gray-500'}`}>
                    {localForm.is_offline 
                      ? "🚨 Villa Invisible: El calendario visitor y los resultados de búsqueda han sido deshabilitados." 
                      : "✨ Villa en Línea: Los huéspedes pueden reservar directamente según tus reglas activas."}
                 </p>
              </div>
           </div>

           {/* Card 3: External Channels (iCal Sync View) */}
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-serif font-black italic text-xl text-text-main tracking-tight">Canales iCal</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Conexiones externas activas</p>
                 </div>
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <RefreshCcw className="w-6 h-6" />
                 </div>
              </div>

              <div className="space-y-3 mb-8">
                 {localForm.calendarSync?.map((sync: any) => (
                    <div key={sync.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${sync.syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{sync.platform}</span>
                       </div>
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                          Ok
                       </span>
                    </div>
                 ))}
                 {(!localForm.calendarSync || localForm.calendarSync.length === 0) && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Sin canales externos conectados</p>
                 )}
              </div>

              <div className="bg-sand/30 p-5 rounded-3xl border border-orange-100/50">
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Salty Guardian
                 </p>
                 <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                    Salty protege tu calendario verificando colisiones cada pocos minutos. Si detecta un conflicto, te avisará vía Telegram inmediatamente.
                 </p>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
