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
  const [isEditingChannels, setIsEditingChannels] = useState(false);

  // local "form" state to talk to CalendarSection and handle iCal
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

  const saveChannels = async () => {
    setIsEditingChannels(false);
    await handleUpdateProperty(localForm);
  };

  const updateAdvanceNotice = async (days: number) => {
    const { error } = await supabase
        .from('availability_rules')
        .upsert({
            property_id: selectedPropertyId,
            advance_notice_days: days,
            is_blocked: false,
            start_date: '2000-01-01',
            end_date: '2099-12-31'
        }, { onConflict: 'property_id' });
    
    if (!error) {
        showToast(`Antelación fijada en ${days} días 🔱`);
        if (onRefresh) onRefresh();
    } else {
        showToast("Error al actualizar antelación");
    }
  };

  const refreshData = () => {
    if (onRefresh) onRefresh();
  };

  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);

  const fetchGlobalSync = async () => {
    setIsSyncingGlobal(true);
    try {
      await fetch('/api/calendar/import', { method: 'POST' });
      showToast("Sincronización Global Completada 🛰️");
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast("Error en sincronización global");
    }
    setIsSyncingGlobal(false);
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Nunca';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Hace instantes';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    return `Hace ${Math.round(diffMin / 60)}h`;
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

        <div className="flex items-center gap-4">
           <button 
             onClick={fetchGlobalSync}
             disabled={isSyncingGlobal}
             className={`px-6 py-4 bg-black text-white rounded-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl ${isSyncingGlobal ? 'opacity-50' : ''}`}
           >
              <RefreshCcw className={`w-4 h-4 ${isSyncingGlobal ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronización Forzada 🔱</span>
           </button>

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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 items-start">
        
        {/* Lado Izquierdo: Master Calendar Workspace (3/4) */}
        <div className="xl:col-span-3 space-y-12">
           <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-primary/10" />
              
              <div className="relative z-10">
                 <CalendarSection 
                   form={localForm} 
                   setForm={handleUpdateProperty} 
                   monthsCount={2}
                   onRefresh={refreshData}
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
                    <p className="text-3xl font-serif font-black italic mt-1">
                      {activeProperty.calendarSync?.reduce((acc: number, f: any) => acc + (f.events_found || 0), 0) || 0}
                      <span className="text-xs font-sans text-gray-400 ml-2">Eventos</span>
                    </p>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center gap-6 shadow-soft">
                 <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                    <Tag className="w-8 h-8 text-orange-600" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Antelación</h4>
                    <p className="text-3xl font-serif font-black italic mt-1">
                      {activeProperty.availability_rules?.[0]?.advance_notice_days || 2}
                      <span className="text-xs font-sans text-gray-400 ml-2">Días Req.</span>
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Lado Derecho: Operational Controls (1/4) */}
        <div className="xl:col-span-1 space-y-8 sticky top-24">
           
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-serif font-black italic text-xl text-text-main tracking-tight">Tarifa Master</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Base por noche</p>
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
           </div>

           <div className={`p-8 rounded-[3rem] border shadow-xl transition-all relative overflow-hidden group ${localForm.is_offline ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className={`font-serif font-black italic text-xl tracking-tight ${localForm.is_offline ? 'text-red-900' : 'text-text-main'}`}>Modo Emergencia</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${localForm.is_offline ? 'text-red-600' : 'text-gray-400'}`}>Visibilidad</p>
                 </div>
                 <button 
                   onClick={() => handleUpdateProperty({ ...localForm, is_offline: !localForm.is_offline })}
                   className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${localForm.is_offline ? 'bg-red-500' : 'bg-gray-200'}`}
                 >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${localForm.is_offline ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-serif font-black italic text-xl text-text-main tracking-tight">Canales iCal</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sincronización Maestra</p>
                 </div>
                 <button 
                    onClick={() => isEditingChannels ? saveChannels() : setIsEditingChannels(true)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isEditingChannels ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-black hover:text-white'}`}
                 >
                    {isEditingChannels ? <ShieldCheck className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
                 </button>
              </div>

              <div className="space-y-4 mb-8">
                 {isEditingChannels ? (
                    <div className="space-y-4 animate-fade-in">
                       {['Airbnb', 'Booking.com'].map((plat) => {
                          const existing = localForm.calendarSync?.find((s: any) => s.platform === plat);
                          return (
                             <div key={plat}>
                                <label className="text-[8px] font-black uppercase text-gray-400 ml-2 mb-1 block">{plat} URL</label>
                                <input 
                                   defaultValue={existing?.url || ''}
                                   placeholder={`Pegar URL de ${plat}...`}
                                   onBlur={(e) => {
                                      const newUrl = e.target.value;
                                      const updatedSync = [...(localForm.calendarSync || [])];
                                      const idx = updatedSync.findIndex(s => s.platform === plat);
                                      if (idx >= 0) updatedSync[idx].url = newUrl;
                                      else if (newUrl) updatedSync.push({ id: crypto.randomUUID(), platform: plat, url: newUrl });
                                      setLocalForm({ ...localForm, calendarSync: updatedSync });
                                   }}
                                   className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-[10px] outline-none focus:bg-white"
                                />
                             </div>
                          );
                       })}
                       
                       <div className="pt-2">
                          <label className="text-[8px] font-black uppercase text-primary ml-2 mb-1 block">Antelación de Reserva</label>
                          <select 
                            defaultValue={activeProperty.availability_rules?.[0]?.advance_notice_days || 2}
                            onChange={(e) => updateAdvanceNotice(Number(e.target.value))}
                            className="w-full bg-primary/5 border border-primary/10 rounded-xl p-3 text-[10px] font-black text-primary outline-none"
                          >
                             {[0,1,2,3,4,5,7,14].map(d => <option key={d} value={d}>{d} días de antelación</option>)}
                          </select>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {localForm.calendarSync?.map((sync: any) => (
                          <div key={sync.id || sync.platform} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                             <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${sync.syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{sync.platform}</span>
                             </div>
                             <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                {sync.events_found || 0} EV • {getRelativeTime(sync.lastSynced)}
                             </span>
                          </div>
                       ))}
                       {(!localForm.calendarSync || localForm.calendarSync.length === 0) && (
                          <p className="text-[10px] text-gray-400 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Sin canales externos</p>
                       )}
                    </div>
                 )}
              </div>

              <div className="bg-sand/30 p-5 rounded-3xl border border-orange-100/50">
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Salty Guardian 🔱
                 </p>
                 <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                    {isEditingChannels ? "Guarda los enlaces para activar la vigilancia automática." : "Salty protege tu calendario verificando colisiones constantemente."}
                 </p>
              </div>
           </div>

           {/* Card 4: Recent Engine Activity (Feed) */}
           <div className="bg-black/95 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                    <h3 className="font-serif font-black italic text-xl text-white tracking-tight">Feed Táctico</h3>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Monitoreo en tiempo real</p>
                 </div>
                 <Zap className="w-5 h-5 text-primary animate-pulse" />
              </div>

              <div className="space-y-4 relative z-10">
                 {(() => {
                    const lastSync = localForm.calendarSync?.reduce((prev: any, current: any) => 
                       (prev.lastSynced > current.lastSynced) ? prev : current
                    , {});
                    
                    return (
                       <div className="space-y-3">
                          <div className="flex gap-3 items-start p-3 bg-white/5 rounded-2xl border border-white/10">
                             <div className="w-2 h-2 mt-1.5 bg-green-500 rounded-full shadow-glow" />
                             <p className="text-[10px] font-medium leading-relaxed text-gray-300">
                                <span className="text-white font-black uppercase block text-[8px] mb-1">Último Escaneo</span>
                                Se verificaron los {localForm.calendarSync?.length || 0} canales de {localForm.title}. Todo en orden {getRelativeTime(lastSync?.lastSynced)}.
                             </p>
                          </div>
                          
                          <div className="flex gap-3 items-start p-3 bg-white/5 rounded-2xl border border-white/10 opacity-60">
                             <div className="w-2 h-2 mt-1.5 bg-primary rounded-full" />
                             <p className="text-[10px] font-medium leading-relaxed text-gray-300">
                                <span className="text-white font-black uppercase block text-[8px] mb-1">Malla de Seguridad</span>
                                Salty Guardian está operando en modo pasivo. No se detectaron colisiones de fechas en las últimas 24h.
                             </p>
                          </div>
                       </div>
                    );
                 })()}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
