import React, { useState } from 'react';
import { SiteContent, VillaKnowledge } from '../../types';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import SecuritySettings from './SecuritySettings';

const SiteSettingsManager: React.FC = () => {
  const { properties, siteContent, villaKnowledge, saveSiteContent, saveVillaKnowledge } = useProperty();
  
  const [activeTab, setActiveTab] = useState<'branding' | 'knowledge' | 'governance' | 'security'>('branding');
  const [isSaving, setIsSaving] = useState(false);

  // Local state for Governance
  const [govProps, setGovProps] = useState(properties);

  const handleSaveGovernance = async () => {
    setIsSaving(true);
    try {
      for (const prop of govProps) {
        const { error } = await supabase
          .from('properties')
          .update({ 
            min_price_floor: prop.min_price_floor,
            max_discount_allowed: prop.max_discount_allowed 
          })
          .eq('id', prop.id);
        if (error) throw error;
      }
      alert("Límites de gobernanza actualizados con éxito.");
    } catch (error) {
      alert("Error al guardar gobernanza: " + (error as any).message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Local state for Branding
  const [siteForm, setSiteForm] = useState<SiteContent>(siteContent || {
    hero: { title: '', slogan: '', welcome_badge: '', notif_status: '', notif_promo: '' },
    sections: { beaches: '', gastronomy: '', nearby: '' },
    cta: { title: '', subtitle: '', description: '' },
    contact: { title: '', subtitle: '', phone: '', email: '', whatsapp: '' },
    seo: { default_title: '', description: '' }
  });

  // Local state for Knowledge
  const [knowledgeForm, setKnowledgeForm] = useState<VillaKnowledge>(villaKnowledge || {
    location: { description: '', distances: '' },
    policies: { checkIn: '', checkOut: '', rules: '', cancellation: '', deposit: '' },
    amenities: { general: '' },
    emergencies: { contact: '', procedures: '' },
    survival_tips: { parking: '', cash: '', hours: '', cooking: '' }
  });

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await saveSiteContent(siteForm);
      alert("Configuración de marca guardada con éxito.");
    } catch (error) {
      alert("Error al guardar: " + (error as any).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKnowledge = async () => {
    setIsSaving(true);
    try {
      await saveVillaKnowledge(knowledgeForm);
      alert("Base de conocimientos de Salty actualizada.");
    } catch (error) {
      alert("Error al actualizar Salty: " + (error as any).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        <button 
          onClick={() => setActiveTab('branding')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'branding' ? 'bg-white text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
        >
          Marca y Web
        </button>
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'knowledge' ? 'bg-white text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
        >
          Cerebro de Salty
        </button>
        <button 
          onClick={() => setActiveTab('governance')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'governance' ? 'bg-white text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
        >
          Gobernanza
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-white text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
        >
          Seguridad
        </button>
      </div>

      {activeTab === 'branding' && (
        <div className="space-y-8 animate-fade-in">
          <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="font-serif font-bold text-xl mb-6 flex items-center gap-2">
              <span className="material-icons text-primary">auto_awesome</span>
              Sección Hero & Bienvenida
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Título Hero</label>
                <input value={siteForm.hero.title} onChange={e => setSiteForm({...siteForm, hero: {...siteForm.hero, title: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Eslogan (Cursiva)</label>
                <input value={siteForm.hero.slogan} onChange={e => setSiteForm({...siteForm, hero: {...siteForm.hero, slogan: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Badge de Salida</label>
                <input value={siteForm.hero.welcome_badge} onChange={e => setSiteForm({...siteForm, hero: {...siteForm.hero, welcome_badge: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Promo Notificación</label>
                <input value={siteForm.hero.notif_promo} onChange={e => setSiteForm({...siteForm, hero: {...siteForm.hero, notif_promo: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-primary" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="font-serif font-bold text-xl mb-6 flex items-center gap-2">
              <span className="material-icons text-secondary">contact_support</span>
              Contacto & Salty Chat
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Título de Contacto (usa . para separar italic)</label>
                  <input value={siteForm.contact.title} onChange={e => setSiteForm({...siteForm, contact: {...siteForm.contact, title: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" placeholder="Reserva con.Salty" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Teléfono Público</label>
                  <input value={siteForm.contact.phone} onChange={e => setSiteForm({...siteForm, contact: {...siteForm.contact, phone: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Subtítulo Descriptivo</label>
                <textarea value={siteForm.contact.subtitle} onChange={e => setSiteForm({...siteForm, contact: {...siteForm.contact, subtitle: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 resize-none" />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveBranding}
              disabled={isSaving}
              className="px-12 py-4 bg-text-main text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              Guardar Configuración Web
            </button>
          </div>
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-8 animate-fade-in">
           <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <span className="material-icons text-primary text-2xl">psychology</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-primary text-xl mb-1">Cerebro de Salty</h3>
              <p className="text-sm text-text-light">Lo que configures aquí es lo que Salty le dirá a los huéspedes. Sé preciso.</p>
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-light">Ubicación & Logística</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Descripción de Cabo Rojo</label>
                  <textarea value={knowledgeForm.location.description} onChange={e => setKnowledgeForm({...knowledgeForm, location: {...knowledgeForm.location, description: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Distancias Clave</label>
                  <input value={knowledgeForm.location.distances} onChange={e => setKnowledgeForm({...knowledgeForm, location: {...knowledgeForm.location, distances: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-light">Políticas Globales</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Check-in</label>
                    <input value={knowledgeForm.policies.checkIn} onChange={e => setKnowledgeForm({...knowledgeForm, policies: {...knowledgeForm.policies, checkIn: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Check-out</label>
                    <input value={knowledgeForm.policies.checkOut} onChange={e => setKnowledgeForm({...knowledgeForm, policies: {...knowledgeForm.policies, checkOut: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Reglas de Oro</label>
                  <textarea value={knowledgeForm.policies.rules} onChange={e => setKnowledgeForm({...knowledgeForm, policies: {...knowledgeForm.policies, rules: e.target.value}})} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 resize-none" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-light">Tips de Supervivencia (Salty Style)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Estacionamiento / Playas</label>
                <textarea value={knowledgeForm.survival_tips.parking} onChange={e => setKnowledgeForm({...knowledgeForm, survival_tips: {...knowledgeForm.survival_tips, parking: e.target.value}})} className="w-full p-3.5 bg-primary/5 border border-primary/10 text-primary rounded-2xl text-sm font-medium h-24 resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Efectivo / Cajeros</label>
                <textarea value={knowledgeForm.survival_tips.cash} onChange={e => setKnowledgeForm({...knowledgeForm, survival_tips: {...knowledgeForm.survival_tips, cash: e.target.value}})} className="w-full p-3.5 bg-primary/5 border border-primary/10 text-primary rounded-2xl text-sm font-medium h-24 resize-none" />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveKnowledge}
              disabled={isSaving}
              className="px-12 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              Sincronizar Cerebro Salty
            </button>
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-8 animate-fade-in">
           <div className="bg-black p-6 rounded-[2rem] border border-white/10 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <span className="material-icons text-white text-2xl">gavel</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-xl mb-1">Protocolo de Gobernanza CEO</h3>
              <p className="text-sm text-gray-400 font-medium">Límites financieros obligatorios para las ofertas autónomas de Salty.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {govProps.map((prop: any, idx: number) => (
              <section key={prop.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-light">{prop.title}</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Precio Mínimo ($)</label>
                    <input 
                      type="number"
                      value={prop.min_price_floor} 
                      onChange={e => {
                        const newProps = [...govProps];
                        newProps[idx] = { ...prop, min_price_floor: Number(e.target.value) };
                        setGovProps(newProps);
                      }} 
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Descuento Máx (%)</label>
                    <input 
                      type="number"
                      value={prop.max_discount_allowed} 
                      onChange={e => {
                        const newProps = [...govProps];
                        newProps[idx] = { ...prop, max_discount_allowed: Number(e.target.value) };
                        setGovProps(newProps);
                      }} 
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-primary" 
                    />
                  </div>
                </div>
                <p className="text-[9px] text-text-light font-medium italic">
                  * Salty nunca ofrecerá un precio menor a ${prop.min_price_floor} ni un descuento superior al {prop.max_discount_allowed}%.
                </p>
              </section>
            ))}
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveGovernance}
              disabled={isSaving}
              className="px-12 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              Aplicar Blindaje Financiero
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && <SecuritySettings />}
    </div>
  );
};

export default SiteSettingsManager;
