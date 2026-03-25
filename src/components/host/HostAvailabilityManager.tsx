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
        blockedDates: activeProperty.blockeddates || activeProperty.blockedDates || [],
        seasonal_prices: activeProperty.seasonal_prices || [],
        calendarSync: activeProperty.calendarSync || [],
        sync_settings: activeProperty.sync_settings || {
            min_nights: 2,
            max_nights: 60,
            advance_notice: 2,
            prep_days: 0,
            availability_window: 6,
            allow_requests_beyond: true
        }
      });
    }
  }, [activeProperty]);

  const handleUpdateProperty = async (updatedForm: any) => {
    setLocalForm(updatedForm);
    setIsSaving(true);
    
    const { error } = await supabase
      .from('properties')
      .update({
        blockeddates: updatedForm.blockedDates,
        seasonal_prices: updatedForm.seasonal_prices,
        price: updatedForm.price,
        is_offline: updatedForm.is_offline,
        calendarSync: updatedForm.calendarSync,
        sync_settings: updatedForm.sync_settings // New: Dynamic Rule Persistence
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
    showToast("Salty está conectando con los satélites de Airbnb... 🛰️");
    
    try {
      const response = await fetch('/api/calendar/import', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        showToast("Sincronización Global Completada. Travesías Aseguradas 🔱");
        if (onRefresh) onRefresh();
      } else {
        showToast("Airbnb está tardando en responder. Salty seguirá intentando en segundo plano. 🛡️");
      }
    } catch (e) {
      showToast("Error en conexión satelital. Reintentando... 🛰️");
    } finally {
      setIsSyncingGlobal(false);
    }
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
               <span className="text-[10px] font-black uppercase tracking-widest">
                {isSyncingGlobal ? 'Conectando Satélites... 🛰️' : 'Sincronización Forzada 🔱'}
               </span>
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
         
        <div className="xl:col-span-1 space-y-6 sticky top-24">
           
           {/* 💰 FINANCIAL HUB */}
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative group">
              <div className="flex justify-between items-center mb-4">
                 <div>
                    <h3 className="font-serif font-black italic text-lg text-text-main tracking-tight">Tarifa Base</h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Master Price</p>
                 </div>
                 <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                 </div>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-300">$</span>
                <input 
                  type="number" 
                  value={localForm.price} 
                  onChange={(e) => setLocalForm({ ...localForm, price: Number(e.target.value) })}
                  onBlur={() => handleUpdateProperty(localForm)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-4 font-black text-3xl text-text-main outline-none focus:bg-white transition-all shadow-inner" 
                />
              </div>
           </div>

           {/* 🛡️ REGLAS DE ORO (Golden Rules) - INSPIRADO EN FOTO #1 */}
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shadow-lg">
                    <Zap className="w-4 h-4" />
                 </div>
                 <div>
                    <h3 className="font-serif font-black italic text-lg text-text-main tracking-tight">Reglas de Oro</h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Cerebro Operativo</p>
                 </div>
              </div>

              {/* Min Nights Card (INTERACTIVE) */}
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md cursor-pointer">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Noches Mínimas</p>
                    <div className="relative">
                        <select 
                            value={localForm.sync_settings?.min_nights || 2}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, min_nights: val } };
                                handleUpdateProperty(updated);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            {[1,2,3,4,5,7,14,30].map(n => <option key={n} value={n}>{n} noches</option>)}
                        </select>
                        <span className="material-icons text-sm text-gray-300 group-hover:text-primary transition-colors">edit</span>
                    </div>
                 </div>
                 <div className="flex items-end gap-3">
                    <p className="text-3xl font-serif font-black text-text-main">{localForm.sync_settings?.min_nights || 2}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mb-2">Regla activa</p>
                 </div>
              </div>

              {/* Max Nights Card (NEW) */}
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md cursor-pointer">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Noches Máximas</p>
                    <div className="relative">
                        <select 
                            value={localForm.sync_settings?.max_nights || 60}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, max_nights: val } };
                                handleUpdateProperty(updated);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            {[7,14,30,60,90,180].map(n => <option key={n} value={n}>{n} noches</option>)}
                        </select>
                        <span className="material-icons text-sm text-gray-300 group-hover:text-primary transition-colors">edit</span>
                    </div>
                 </div>
                 <div className="flex items-end gap-3">
                    <p className="text-3xl font-serif font-black text-text-main">{localForm.sync_settings?.max_nights || 60}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mb-2">Límite</p>
                 </div>
              </div>

              {/* Advance Notice / Preaviso Card */}
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Preaviso (Seguridad)</p>
                    <select 
                        value={localForm.sync_settings?.advance_notice || 2}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, advance_notice: val } };
                            handleUpdateProperty(updated);
                            updateAdvanceNotice(val);
                        }}
                        className="bg-transparent border-none text-[9px] font-black text-primary uppercase focus:ring-0 outline-none cursor-pointer"
                    >
                        {[0,1,2,3,7].map(d => <option key={d} value={d}>Al menos {d} días</option>)}
                    </select>
                 </div>
                 <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] font-bold text-text-main uppercase tracking-tighter">Sin reservas de última hora</p>
                 </div>
              </div>

              {/* Preparation Days (New Card) */}
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Días de Preparación</p>
                    <select 
                        value={localForm.sync_settings?.prep_days || 0}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, prep_days: val } };
                            handleUpdateProperty(updated);
                        }}
                        className="bg-transparent border-none text-[9px] font-black text-primary uppercase focus:ring-0 outline-none cursor-pointer"
                    >
                        {[0,1,2].map(d => <option key={d} value={d}>{d === 0 ? 'Ninguno' : `${d} día`}</option>)}
                    </select>
                 </div>
                 <p className="text-[10px] text-gray-400 italic">Tiempo de limpieza entre reservas.</p>
              </div>

              {/* Availability Window (INTERACTIVE) */}
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4">
                 <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Ventana de Disponibilidad</h4>
                        <div className="flex items-baseline gap-2 group relative">
                            <select 
                                value={localForm.sync_settings?.availability_window || 6}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, availability_window: val } };
                                    handleUpdateProperty(updated);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            >
                                {[3,6,9,12,24].map(m => <option key={m} value={m}>{m} meses</option>)}
                            </select>
                            <p className="text-2xl font-serif font-black text-text-main group-hover:text-primary transition-colors">{localForm.sync_settings?.availability_window || 6}</p>
                            <p className="text-[9px] font-bold text-text-light uppercase">meses de anticipación</p>
                        </div>
                    </div>
                    <Radio className="w-5 h-5 text-primary opacity-40" />
                 </div>

                 <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                    <div className="flex-1">
                        <p className="text-[9px] font-black text-text-main uppercase leading-tight">¿Recibir solicitudes fuera del plazo?</p>
                        <p className="text-[8px] text-gray-400 mt-1">Activa el "Modo Captación" de Salty.</p>
                    </div>
                    <button 
                        onClick={() => {
                            const val = !localForm.sync_settings?.allow_requests_beyond;
                            const updated = { ...localForm, sync_settings: { ...localForm.sync_settings, allow_requests_beyond: val } };
                            handleUpdateProperty(updated);
                        }}
                        className={`w-10 h-6 rounded-full transition-all relative ${localForm.sync_settings?.allow_requests_beyond ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${localForm.sync_settings?.allow_requests_beyond ? 'right-1' : 'left-1'}`} />
                    </button>
                 </div>
              </div>
           </div>

           {/* 🛰️ SYNC & CHANNELS */}
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="font-serif font-black italic text-lg text-text-main tracking-tight">Sincronización</h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Canales iCal</p>
                 </div>
                 <button 
                    onClick={() => isEditingChannels ? saveChannels() : setIsEditingChannels(true)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isEditingChannels ? 'bg-black text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-black hover:text-white'}`}
                 >
                    {isEditingChannels ? <ShieldCheck className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5 flex-shrink-0" />}
                 </button>
              </div>

              <div className="space-y-3">
                 {isEditingChannels ? (
                     <div className="space-y-4 animate-scale-in">
                        {['Airbnb', 'Booking.com'].map((plat) => {
                           const existing = localForm.calendarSync?.find((s: any) => s.platform === plat);
                           return (
                              <div key={plat}>
                                 <label className="text-[7px] font-black uppercase text-gray-400 mb-1 ml-2 block">{plat} URL</label>
                                 <input 
                                    defaultValue={existing?.url || ''}
                                    placeholder={`URL de ${plat}...`}
                                    onBlur={(e) => {
                                       const newUrl = e.target.value;
                                       const updatedSync = [...(localForm.calendarSync || [])];
                                       const idx = updatedSync.findIndex(s => s.platform === plat);
                                       if (idx >= 0) updatedSync[idx].url = newUrl;
                                       else if (newUrl) updatedSync.push({ id: crypto.randomUUID(), platform: plat, url: newUrl });
                                       setLocalForm({ ...localForm, calendarSync: updatedSync });
                                    }}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all"
                                 />
                              </div>
                           );
                        })}
                     </div>
                 ) : (
                    <div className="space-y-2">
                       {localForm.calendarSync?.map((sync: any) => (
                           <div key={sync.id || sync.platform} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all cursor-default group">
                              <div className="flex items-center gap-2">
                                 <div className={`w-1.5 h-1.5 rounded-full ${sync.syncStatus === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                                 <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{sync.platform}</span>
                              </div>
                              <span className="text-[7px] font-bold text-gray-400 uppercase bg-white px-2 py-1 rounded-lg">
                                 {getRelativeTime(sync.lastSynced)}
                              </span>
                           </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>

           {/* ⚡ TACTICAL FEED (COMPACT) */}
           <div className="bg-black p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                    <h3 className="font-serif font-black italic text-lg text-white tracking-tight leading-none">Bitácora</h3>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Salty Guardian 🔱</p>
                 </div>
                 <Radio className="w-4 h-4 text-primary animate-pulse" />
              </div>

              <div className="space-y-3 relative z-10">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-[9px] text-gray-300 leading-relaxed italic">
                        "Vigilando {localForm.title}. Todo el perímetro digital está asegurado."
                     </p>
                  </div>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
