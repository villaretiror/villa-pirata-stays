import React from 'react';
import { LocalGuideItem } from '../types';

interface GuideCardProps {
  item: LocalGuideItem;
  onEdit?: () => void;
  isEditable?: boolean;
}

const GuideCard: React.FC<GuideCardProps> = ({ item, onEdit, isEditable = false }) => {
  return (
    <article className="min-w-[240px] bg-white rounded-2xl p-3 shadow-card border border-gray-100 flex flex-col h-full relative group">
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          aria-label="Editar lugar"
          className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-all"
        >
          <span className="material-icons text-xs">edit</span>
        </button>
      )}

      <div className="h-32 rounded-xl bg-gray-200 mb-3 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2 z-10">
          <p className="text-white font-bold text-sm shadow-black drop-shadow-md">{item.name}</p>
        </div>
        <img src={item.image || "https://placehold.co/400x300"} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" alt={item.name} />
      </div>
      <div className="flex justify-between items-start mb-1">
        <div className="bg-sand px-2 py-0.5 rounded text-[10px] font-bold text-secondary border border-orange-100 flex items-center gap-1">
          <span className="material-icons text-[10px]">directions_car</span> {item.distance}
        </div>
      </div>
      <p className="text-xs text-text-light line-clamp-3 leading-relaxed">{item.desc}</p>
    </article>
  );
};

export default GuideCard;