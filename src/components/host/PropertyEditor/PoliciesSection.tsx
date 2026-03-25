import React, { useState } from 'react';
import { Property } from '../../../types';

interface PoliciesSectionProps {
  form: Property;
  setForm: (p: Property) => void;
}

const PoliciesSection: React.FC<PoliciesSectionProps> = ({ form, setForm }) => {
  const [newRule, setNewRule] = useState('');

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    const currentRules = form.policies.houseRules || [];
    setForm({
      ...form,
      policies: {
        ...form.policies,
        houseRules: [...currentRules, newRule]
      }
    });
    setNewRule('');
  };

  const handleRemoveRule = (index: number) => {
    const currentRules = form.policies.houseRules || [];
    setForm({
      ...form,
      policies: {
        ...form.policies,
        houseRules: currentRules.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header>
        <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Políticas y Seguridad 🔱</h3>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Reglas de la Casa, Cancelaciones y Credenciales</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Horarios y Cancelación */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#2D5A27] block mb-2 ml-1">Check-in After</label>
              <input value={form.policies.checkInTime || '3:00 PM'} onChange={e => setForm({...form, policies: {...form.policies, checkInTime: e.target.value}})} className="w-full p-4 rounded-xl border-none bg-gray-50 text-xs font-black shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#2D5A27] block mb-2 ml-1">Check-out Before</label>
              <input value={form.policies.checkOutTime || '11:00 AM'} onChange={e => setForm({...form, policies: {...form.policies, checkOutTime: e.target.value}})} className="w-full p-4 rounded-xl border-none bg-gray-50 text-xs font-black shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-light block mb-2 ml-1">Política de Cancelación</label>
            <select value={form.policies.cancellationPolicy || 'moderate'} onChange={e => setForm({...form, policies: {...form.policies, cancellationPolicy: e.target.value as any}})} className="w-full p-4 rounded-xl border-none bg-gray-50 text-xs font-black shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all appearance-none">
              <option value="flexible">Flexible (Reembolso TOTAL si cancelas)</option>
              <option value="moderate">Moderada (Reembolso PARCIAL)</option>
              <option value="strict">Estricta (Sin reembolso)</option>
            </select>
          </div>
        </div>

        {/* WiFi & Access (Admin level) */}
        <div className="space-y-6 bg-sand/30 p-6 rounded-[2.5rem] border border-primary/20/30">
          <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-4 flex items-center gap-2 animate-pulse-subtle">
            <span className="material-icons text-xs">lock</span> Credenciales del Portada (CIFRADAS)
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1 ml-1">Nombre Red Wi-Fi</label>
              <input value={form.policies.wifiName || ''} onChange={e => setForm({...form, policies: {...form.policies, wifiName: e.target.value}})} className="w-full p-3 rounded-xl border-none bg-white text-xs font-bold outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1 ml-1">Clave Wi-Fi Huésped</label>
              <input value={form.policies.wifiPass || ''} onChange={e => setForm({...form, policies: {...form.policies, wifiPass: e.target.value}})} className="w-full p-3 rounded-xl border-none bg-white text-xs font-bold outline-none shadow-sm" />
            </div>
            <div className="pt-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1 ml-1 text-red-600">Código de Acceso (Maestro)</label>
              <input value={form.policies.accessCode || ''} onChange={e => setForm({...form, policies: {...form.policies, accessCode: e.target.value}})} className="w-full p-3 rounded-xl border-none bg-white font-mono text-lg font-black tracking-[0.2em] outline-none shadow-sm text-center" placeholder="XXXX" />
            </div>
          </div>
        </div>
      </div>

      {/* House Rules Manager */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-soft">
        <h4 className="font-bold text-sm mb-6 flex items-center gap-2"><span className="material-icons text-primary/40 text-sm">assignment_late</span> Reglas de la Casa (Manual)</h4>
        
        <div className="flex gap-2 mb-6">
          <input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Ej: No se permiten fiestas después de las 10 PM" className="flex-1 p-4 rounded-xl border-none bg-gray-50 text-xs font-bold outline-none" />
          <button onClick={handleAddRule} className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">Añadir 🔱</button>
        </div>

        <div className="space-y-3">
          {(form.policies.houseRules || []).map((rule: string, i: number) => (
            <div key={i} className="flex justify-between items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 transition-all group">
              <div className="flex items-center gap-4">
                <span className="w-6 h-6 bg-white rounded-full text-[10px] font-black text-gray-300 flex items-center justify-center shrink-0 border border-gray-100">#{i + 1}</span>
                <p className="text-xs font-bold text-text-main line-clamp-1">{rule}</p>
              </div>
              <button onClick={() => handleRemoveRule(i)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><span className="material-icons text-sm">delete</span></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PoliciesSection;
