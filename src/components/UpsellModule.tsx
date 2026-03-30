import React from 'react';

export interface Addon {
  id: string;
  title: string;
  price: number;
  description: string;
  icon: string;
}

export const AVAILABLE_ADDONS: Addon[] = [
  { id: 'early_checkin', title: 'Early Check-in (1:00 PM)', price: 50, description: 'Llega antes y empieza tu descanso antes de tiempo.', icon: 'schedule' },
  { id: 'late_checkout', title: 'Late Check-out (2:00 PM)', price: 50, description: 'Disfruta más tiempo de la piscina antes de partir.', icon: 'nightlight_round' },
  { id: 'romance', title: 'Romance Package', price: 85, description: 'Pétalos, botella de Champagne fría a la llegada.', icon: 'favorite' }
];

interface UpsellModuleProps {
  selectedAddons: string[];
  onChange: (addons: string[]) => void;
}

const UpsellModule: React.FC<UpsellModuleProps> = ({ selectedAddons, onChange }) => {
  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      onChange(selectedAddons.filter(a => a !== id));
    } else {
      onChange([...selectedAddons, id]);
    }
  };

  return (
    <section className="space-y-4 pt-6 border-t border-black/5 animate-fade-in">
      <h3 className="text-[10px] uppercase font-semibold tracking-[0.25em] opacity-80 text-gray-400">Personaliza tu Estadía</h3>
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
        {AVAILABLE_ADDONS.map(addon => {
          const isSelected = selectedAddons.includes(addon.id);
          return (
            <div 
              key={addon.id}
              onClick={() => toggleAddon(addon.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-transparent shadow-soft hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isSelected ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'
              }`}>
                <span className="material-icons text-xl">{addon.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-text-main text-sm">{addon.title}</p>
                  <p className="font-serif font-black text-primary">+${addon.price}</p>
                </div>
                <p className="text-xs text-text-light opacity-80 mt-1">{addon.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UpsellModule;
