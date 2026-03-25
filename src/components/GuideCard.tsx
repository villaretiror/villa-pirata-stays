import React from 'react';
import SmartImage from './SmartImage';
import { LocalGuideItem } from '../types';

interface GuideCardProps {
  item: LocalGuideItem;
  onEdit?: () => void;
  onAskSalty?: (name: string) => void;
  onMapClick?: (item: LocalGuideItem) => void;
  isEditable?: boolean;
}

const GuideCard: React.FC<GuideCardProps> = ({ item, onEdit, onAskSalty, onMapClick, isEditable = false }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isEditable) return;

    // Si el click fue en un botón de mapa, no hacemos nada
    if ((e.target as HTMLElement).closest('.map-trigger')) return;

    if (onAskSalty) {
      onAskSalty(item.name);
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMapClick) {
      onMapClick(item);
    } else if (item.mapUrl && !isEditable) {
      window.open(item.mapUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      onClick={handleClick}
      className={`bg-white rounded-[2rem] p-4 shadow-card border border-gray-100 flex flex-col h-full relative group transition-all duration-500 ${item.mapUrl && !isEditable ? 'cursor-pointer hover:shadow-float hover:-translate-y-1' : ''}`}
    >
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          aria-label="Editar lugar"
          className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-xl"
        >
          <span className="material-icons text-sm">edit</span>
        </button>
      )}

      <div className="h-44 rounded-2xl bg-gray-100 mb-4 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5 z-10">
          <p className="text-white font-serif font-bold text-xl leading-[1.1] tracking-tight drop-shadow-lg">{item.name}</p>
        </div>
        <SmartImage src={item.image} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" alt={item.name} />
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="bg-sand/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-secondary border border-primary/20 flex items-center gap-1.5 shadow-sm">
          <span className="material-icons text-[12px]">directions_car</span> {item.distance}
        </div>
        {item.mapUrl && (
          <button
            onClick={handleMapClick}
            className="map-trigger bg-blue-50/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100/50 flex items-center gap-1.5 hover:bg-blue-100 transition-all shadow-sm active:scale-95"
          >
            <span className="material-icons text-[12px]">near_me</span> Mapa
          </button>
        )}
      </div>

      <p className="text-sm text-text-light line-clamp-3 leading-relaxed mb-6 font-medium opacity-80">{item.desc}</p>

      <div className="mb-4 p-3 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden group-hover:bg-primary/10 transition-colors">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="material-icons text-primary text-xl">tips_and_updates</span>
        </div>
        <p className="text-[11px] text-primary/90 leading-relaxed italic relative z-10">
          <span className="font-bold not-italic mr-1 uppercase text-[9px] tracking-wider">Salty Tip:</span> 
          "{item.saltyTip || "Pregúntame para obtener un consejo de experto sobre este lugar. ¡Cabo Rojo tiene sus secretos!"}"
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-dashed border-gray-100 flex items-center justify-between group/salty">
        <span className="text-[10px] font-black uppercase tracking-widest text-text-light group-hover/salty:text-primary transition-colors">¿Quieres saber más?</span>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-2 rounded-xl group-hover/salty:bg-primary group-hover/salty:text-white transition-all shadow-sm">
          <span>Pregunta a Salty</span>
          <span className="material-icons text-sm">chat_bubble_outline</span>
        </div>
      </div>
    </article>
  );
};

export default GuideCard;