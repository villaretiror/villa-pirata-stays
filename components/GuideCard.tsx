import React from 'react';
import SmartImage from './SmartImage';
import { LocalGuideItem } from '../types';

interface GuideCardProps {
  item: LocalGuideItem;
  onEdit?: () => void;
  onAskSalty?: (name: string) => void;
  isEditable?: boolean;
}

const GuideCard: React.FC<GuideCardProps> = ({ item, onEdit, onAskSalty, isEditable = false }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isEditable) return;

    // Si el click fue en un botón de mapa, no hacemos nada (el botón tiene su propio handler o enlace)
    if ((e.target as HTMLElement).closest('.map-trigger')) return;

    if (onAskSalty) {
      onAskSalty(item.name);
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.mapUrl && !isEditable) {
      window.open(item.mapUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      onClick={handleClick}
      className={`min-w-[260px] bg-white rounded-2xl p-3 shadow-card border border-gray-100 flex flex-col h-full relative group ${item.mapUrl && !isEditable ? 'cursor-pointer hover:shadow-float hover:-translate-y-1 transition-all duration-300' : ''}`}
    >
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          aria-label="Editar lugar"
          className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-all"
        >
          <span className="material-icons text-xs">edit</span>
        </button>
      )}

      <div className="h-36 rounded-xl bg-gray-200 mb-3 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3 z-10">
          <p className="text-white font-bold text-sm shadow-black drop-shadow-md">{item.name}</p>
        </div>
        <SmartImage src={item.image} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" alt={item.name} />
      </div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="bg-sand px-2 py-0.5 rounded text-[10px] font-bold text-secondary border border-orange-100 flex items-center gap-1">
          <span className="material-icons text-[10px]">directions_car</span> Aprox. {item.distance}
        </div>
        {item.mapUrl && (
          <button
            onClick={handleMapClick}
            className="map-trigger bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold text-blue-600 border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition-colors"
          >
            <span className="material-icons text-[10px]">near_me</span> Ver Ruta
          </button>
        )}
      </div>
      <p className="text-xs text-text-light line-clamp-2 leading-relaxed mb-3">{item.desc}</p>

      <div className="mt-auto pt-2 border-t border-dashed border-gray-100 flex items-center justify-between group/salty">
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 group-hover/salty:text-primary transition-colors">¿Quieres saber más?</span>
        <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
          <span>Pregunta a Salty</span>
          <span className="material-icons text-sm animate-bounce-x">arrow_forward</span>
        </div>
      </div>
    </article>
  );
};

export default GuideCard;