import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Property, CalendarSync, Offer, SeasonalPrice } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAvailability } from '../../hooks/useAvailability';
import { showToast } from '../../utils/toast'; // Global toast service

/**
 * PropertyEditorModal 🔱
 * High-end specialized editor for properties. 
 * Fragmented from HostDashboard for architectural excellence.
 */

interface PropertyEditorModalProps {
  property: Property;
  realBookings: any;
  onSave: (p: Property) => any;
  onCancel: () => void;
  isSaving: boolean;
  onRefresh: (signal?: any) => any;
}

import InfoSection from './PropertyEditor/InfoSection';
import PhotoSection from './PropertyEditor/PhotoSection';
import CalendarSection from './PropertyEditor/CalendarSection';
import FinancialsSection from './PropertyEditor/FinancialsSection';
import PoliciesSection from './PropertyEditor/PoliciesSection';

const PropertyEditorModal: React.FC<PropertyEditorModalProps> = ({ 
  property, 
  realBookings, 
  onSave, 
  onCancel, 
  isSaving, 
  onRefresh 
}) => {
  const [form, setForm] = useState(property);
  const [activeSection, setActiveSection] = useState<'info' | 'photos' | 'policies' | 'emergency' | 'cohosts' | 'expenses'>('info');

  // Sync Form with property when it changes externally
  useEffect(() => {
    setForm(property);
  }, [property]);

  const sections = [
    { id: 'info', label: 'Información', icon: 'info' },
    { id: 'photos', label: 'Galería', icon: 'photo_library' },
    { id: 'policies', label: 'Políticas', icon: 'gavel' },
    { id: 'expenses', label: 'Finanzas Mensuales', icon: 'analytics' },
    { id: 'emergency', label: 'Pánico / Emergencia', icon: 'emergency' },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'info': return <InfoSection form={form} setForm={setForm} />;
      case 'photos': return <PhotoSection form={form} setForm={setForm} />;
      case 'expenses': return <FinancialsSection property={property} bookings={realBookings} />;
      case 'policies': return <PoliciesSection form={form} setForm={setForm} />;
      default: return (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="w-16 h-16 bg-sand/30 rounded-full flex items-center justify-center text-primary mb-4 animate-pulse">
            <span className="material-icons">construction</span>
          </div>
          <h3 className="font-serif font-black italic text-lg text-text-main">Módulo en Construcción 🔱</h3>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Salty está puliendo esta sección para ti</p>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-8 animate-fade-in">
      <div className="bg-white w-full max-w-6xl h-[92vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col md:flex-row relative animate-scale-up border border-white/20">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-72 bg-gray-50/80 border-r border-gray-100 p-8 flex flex-col overflow-y-auto shrink-0">
          <div className="mb-10">
            <h2 className="font-serif font-black italic text-2xl tracking-tighter text-text-main line-clamp-2 leading-none">{form.title}</h2>
            <div className="flex items-center gap-2 mt-3">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-glow shadow-green-400" />
              <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Enlace Directo Activo 🔱</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2.5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all ${
                  activeSection === section.id 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.03]' 
                  : 'text-gray-400 hover:bg-white hover:text-text-main hover:shadow-sm'
                }`}
              >
                <span className="material-icons text-base">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          <button 
            onClick={onCancel}
            className="mt-10 flex items-center justify-center gap-2 p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <span className="material-icons text-sm">logout</span>
            Salir del Modo Edición
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth bg-gradient-to-br from-white to-gray-50/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions HUD */}
          <div className="p-8 border-t border-gray-100 bg-white/80 backdrop-blur-md flex gap-4 items-center justify-between">
            <div className="hidden lg:block">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Autoguardado Local</p>
              <p className="text-[9px] font-bold text-primary italic">Salty previene la pérdida de datos 🔱</p>
            </div>
            <div className="flex gap-4 flex-1 lg:flex-none lg:w-96">
              <button 
                onClick={onCancel}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
              >
                Descartar
              </button>
              <button
                onClick={() => !isSaving && onSave(form)}
                disabled={isSaving}
                className={`flex-[2] py-4 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2 ${
                  isSaving ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-primary shadow-primary/30 hover:scale-[1.02] active:scale-98'
                }`}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-icons text-sm">cloud_done</span>
                    Publicar Cambios 🔱
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyEditorModal;
