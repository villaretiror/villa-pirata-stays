import React, { useState } from 'react';
import { Property } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Sparkles, CheckCircle2, Search } from 'lucide-react';

interface AmenitiesSectionProps {
  form: Property;
  setForm: (form: Property) => void;
}

const COMMON_AMENITIES = [
  'WiFi Alta Velocidad', 'Piscina Privada', 'Aire Acondicionado', 'Estacionamiento Gratuito',
  'Cocina Completa', 'Lavadora', 'Secadora', 'TV 4K', 'Netflix', 'BBQ Grill',
  'Cámaras de Seguridad', 'Botiquín de Primeros Auxilios', 'Extintor', 'Plancha',
  'Secador de Pelo', 'Cafetera Keurig', 'Microondas', 'Tostadora', 'Nevera',
  'Pet Friendly', 'Self Check-in', 'Workspace Dedicado', 'Cuna', 'Silla Alta'
];

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ form, setForm }) => {
  const [newAmenity, setNewAmenity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const amenities = form.amenities || [];

  const handleAdd = (text: string) => {
    if (!text.trim() || amenities.includes(text.trim())) return;
    setForm({
      ...form,
      amenities: [...amenities, text.trim()]
    });
    setNewAmenity('');
  };

  const handleRemove = (text: string) => {
    setForm({
      ...form,
      amenities: amenities.filter(a => a !== text)
    });
  };

  const suggestedAmenities = COMMON_AMENITIES.filter(
    item => !amenities.includes(item) && item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-fade-in relative">
      {/* 🚀 AI Suggestion Header */}
      <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 flex flex-col md:flex-row items-center gap-6 group">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary shrink-0 group-hover:rotate-12 transition-transform duration-500">
          <Sparkles className="w-8 h-8 fill-primary/20" />
        </div>
        <div className="text-center md:text-left">
          <h3 className="font-serif font-black italic text-xl tracking-tighter text-text-main">Inventando con Salty AI 🔱</h3>
          <p className="text-[11px] font-medium text-text-light mt-1 opacity-70">
            Un catálogo de amenidades detallado aumenta la conversión en un <span className="text-primary font-black">24%</span>. Asegúrate de incluir todo lo que tus fotos muestran.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Current Amenities List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-light flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" /> Inventario Activo
            </h4>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/10">
              {amenities.length} Amenidades
            </span>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[100px] p-2">
            <AnimatePresence mode="popLayout">
              {amenities.map((am) => (
                <motion.div
                  key={am}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-soft border border-gray-100 group hover:border-red-100 transition-all hover:bg-gray-50/50"
                >
                  <span className="text-[11px] font-bold text-text-main group-hover:text-red-500 transition-colors">{am}</span>
                  <button
                    onClick={() => handleRemove(am)}
                    className="p-1 hover:bg-red-100 rounded-lg text-gray-300 hover:text-red-500 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {amenities.length === 0 && (
              <div className="w-full py-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                <span className="material-icons text-4xl mb-2">inventory_2</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Lista Vacía</p>
              </div>
            )}
          </div>
        </div>

        {/* Search and Add Area */}
        <div className="lg:col-span-5 space-y-8">
          {/* Quick Add Form */}
          <div className="bg-gray-50/80 p-8 rounded-[2.5rem] border border-gray-100 shadow-inner">
            <div className="space-y-2 mb-6 ml-1">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-light">Añadir Nueva</label>
              <p className="text-[9px] font-medium text-gray-400 italic">Presiona Enter o el botón "+" para guardar.</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd(newAmenity)}
                placeholder="Ej: Tostadora de lujo..."
                className="w-full p-4.5 rounded-2xl bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-4 ring-primary/10 focus:border-primary transition-all pr-14 shadow-sm"
              />
              <button
                onClick={() => handleAdd(newAmenity)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4 px-2">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Search className="w-3 h-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar sugerencias..." 
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-text-light outline-none flex-1 placeholder:text-gray-300"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto no-scrollbar py-2">
              {suggestedAmenities.map((item) => (
                <button
                  key={item}
                  onClick={() => handleAdd(item)}
                  className="bg-gray-50/50 hover:bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-text-light border border-gray-100 hover:border-primary hover:text-primary transition-all hover:shadow-soft"
                >
                  + {item}
                </button>
              ))}
              {suggestedAmenities.length === 0 && (
                <p className="text-[9px] font-bold text-gray-300 italic py-4">No se encontraron más sugerencias</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmenitiesSection;
