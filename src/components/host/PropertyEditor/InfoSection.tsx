import React from 'react';
import { Property } from '../../../types';

interface InfoSectionProps {
  form: Property;
  setForm: (p: Property) => void;
}

const InfoSection: React.FC<InfoSectionProps> = ({ form, setForm }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header>
        <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Detalles de la Propiedad 🔱</h3>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.25em] opacity-80 mt-1">Información General, Ubicación y Capacidad</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Título y Subtítulo */}
        <div className="space-y-4 col-span-1 md:col-span-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-[#2D5A27] block mb-2 ml-1">Título de la Villa</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full p-4 rounded-2xl border-none bg-gray-50 text-sm font-black shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="Ej: Villa Retiro Elite"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light block mb-2 ml-1">Subtítulo Descriptivo</label>
            <input
              value={form.subtitle || ''}
              onChange={e => setForm({ ...form, subtitle: e.target.value })}
              className="w-full p-4 rounded-2xl border-none bg-gray-50 text-sm font-bold shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all opacity-80"
              placeholder="Ej: Elegancia frente al mar en Cabo Rojo"
            />
          </div>
        </div>

        {/* Ubicación y Dirección */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light block mb-2 ml-1">Ubicación (Label)</label>
            <input
              value={form.location || ''}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full p-4 rounded-2xl border-none bg-gray-50 text-sm font-bold shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light block mb-2 ml-1">Dirección Exacta</label>
            <textarea
              value={form.address || ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full p-4 rounded-2xl border-none bg-gray-50 text-sm font-bold shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all h-24"
            />
          </div>
        </div>

        {/* Pricing & Basics */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary block mb-2 ml-1">Precio x Noche</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full pl-8 p-4 rounded-2xl border-none bg-primary/5 text-sm font-black shadow-inner text-primary outline-none focus:ring-2 ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-400 block mb-2 ml-1">Precio Original (Tachado)</label>
              <input
                type="number"
                value={form.original_price || ''}
                onChange={e => setForm({ ...form, original_price: Number(e.target.value) })}
                className="w-full p-4 rounded-2xl border-none bg-gray-50 text-sm font-bold shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Huéspedes', key: 'guests', icon: 'groups' },
              { label: 'Habitaciones', key: 'bedrooms', icon: 'bed' },
              { label: 'Baños', key: 'baths', icon: 'bathtub' },
            ].map((stat) => (
              <div key={stat.key} className="bg-sand/20 p-3 rounded-2xl border border-primary/20 flex flex-col items-center">
                <span className="material-icons text-primary/60 text-xs mb-1">{stat.icon}</span>
                <p className="text-[7px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light mb-1">{stat.label}</p>
                <input
                  type="number"
                  value={(form as any)[stat.key]}
                  onChange={e => setForm({ ...form, [stat.key]: Number(e.target.value) })}
                  className="w-full bg-transparent border-none text-center font-black text-sm outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light block mb-2 ml-1">Descripción Narrativa ✨</label>
        <textarea
          value={form.description || ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full p-6 rounded-[2.5rem] border-none bg-gray-50 text-sm font-medium leading-relaxed shadow-inner shadow-black/5 outline-none focus:ring-2 ring-primary/20 transition-all h-64"
          placeholder="Cuenta la historia de tu villa..."
        />
      </div>
    </div>
  );
};

export default InfoSection;
