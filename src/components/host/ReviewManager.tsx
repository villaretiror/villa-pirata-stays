import React, { useState } from 'react';
import { Property, Review } from '../../types';
import { Save, Star, BarChart3, Quote, ChevronDown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../utils/toast';

interface ReviewManagerProps {
  property: Property;
  onUpdateStats: (propertyId: string, rating: number, count: number) => void;
  onAddReview: (propertyId: string, review: Review) => void;
}

/**
 * 🔱 REVIEW MANAGER (Social Proof Engine)
 * Handles manual review entry and reputation KPI management.
 */
export const ReviewManager: React.FC<ReviewManagerProps> = ({ property, onUpdateStats, onAddReview }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newReview, setNewReview] = useState<Partial<Review>>({ rating: 5, source: 'Airbnb', created_at: 'Mayo 2024' });
  const [stats, setStats] = useState({ rating: property.rating || 5, count: property.reviews_count || 0 });

  const saveReview = () => {
    if (!newReview.author || !newReview.text) return;
    const review: Review = {
      id: Math.random().toString(36).substr(2, 9),
      author: newReview.author,
      text: newReview.text,
      rating: newReview.rating || 5,
      created_at: newReview.created_at || 'Reciente',
      source: (newReview.source as 'Airbnb' | 'Booking.com' | 'Google') || 'Airbnb',
      avatar_url: `https://ui-avatars.com/api/?name=${newReview.author}&background=random`
    };
    onAddReview(property.id, review);
    setIsAdding(false);
    setNewReview({ rating: 5, source: 'Airbnb', created_at: 'Mayo 2024' });
  };

  const saveStats = () => {
    onUpdateStats(property.id, stats.rating || 5, stats.count || 0);
    showToast("Prestigio de Propiedad Actualizado ✨");
  };

  return (
    <div className="bg-white rounded-[3rem] p-10 shadow-soft border border-gray-100 group transition-all relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="font-serif font-black italic text-2xl tracking-tighter text-text-main group-hover:text-primary transition-colors leading-none">
              {property.title}
            </h3>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light opacity-50 ml-5">Social Proof Management</p>
        </div>

        <div className="flex items-center gap-8 bg-gray-50/80 p-6 rounded-3xl border border-gray-100 shadow-inner">
          <div className="text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light mb-1">Score Global</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-serif font-black italic text-text-main leading-none">{stats.rating}</span>
              <Star className="w-3.5 h-3.5 text-primary fill-primary mb-1" />
            </div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light mb-1">Total Reseñas</p>
            <p className="text-3xl font-serif font-black italic text-text-main leading-none">{stats.count}</p>
          </div>
        </div>
      </div>

      {/* KPIs & Fast Sync Selection */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-12">
        <div className="md:col-span-5 relative group/input">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-light mb-3 block ml-1">Actualizar Puntuación</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={stats.rating}
              onChange={e => setStats({ ...stats, rating: parseFloat(e.target.value) })}
              className="w-full p-5 rounded-2xl bg-gray-50 border border-gray-100 font-serif font-black italic text-2xl outline-none focus:bg-white focus:border-primary/30 transition-all shadow-inner"
            />
            <Star className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary group-focus-within/input:rotate-12 transition-transform" />
          </div>
        </div>
        <div className="md:col-span-5 relative group/input">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-light mb-3 block ml-1">Volumen de Feedback</label>
          <div className="relative">
            <input
              type="number"
              value={stats.count}
              onChange={e => setStats({ ...stats, count: parseInt(e.target.value) })}
              className="w-full p-5 rounded-2xl bg-gray-50 border border-gray-100 font-serif font-black italic text-2xl outline-none focus:bg-white focus:border-primary/30 transition-all shadow-inner"
            />
            <BarChart3 className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 opacity-30" />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            onClick={saveStats}
            className="w-full h-[68px] bg-black text-white rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl flex items-center justify-center group/btn"
            title="Guardar Cambios de Prestigio"
          >
            <Save className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Reviews List Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <Quote className="w-5 h-5 text-primary opacity-40 rotate-180" />
            <h4 className="font-serif font-black italic text-sm text-text-main tracking-tight">Selección de Reseñas Destacadas ({property.reviews_list?.length || 0})</h4>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 px-4 py-2 rounded-full border transition-all ${isAdding ? 'bg-red-50 text-red-500 border-red-100' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'}`}
          >
            {isAdding ? 'Cerrar Panel' : '+ Añadir Manualmente'}
          </button>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-sand p-8 rounded-[2.5rem] border border-primary/20 shadow-inner relative overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 relative z-10">
              <input placeholder="Nombre del Huésped" className="p-4 rounded-xl border border-primary/20 focus:ring-2 ring-primary/20 outline-none text-sm font-bold" onChange={e => setNewReview({ ...newReview, author: e.target.value })} />
              <input placeholder="Fecha de Estadía (Ej: Junio 2024)" className="p-4 rounded-xl border border-primary/20 focus:ring-2 ring-primary/20 outline-none text-sm font-bold" onChange={e => setNewReview({ ...newReview, created_at: e.target.value })} />

              <div className="relative">
                <select className="w-full p-4 rounded-xl border border-primary/20 bg-white outline-none focus:ring-2 ring-primary/20 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 appearance-none" onChange={e => setNewReview({ ...newReview, source: e.target.value as any })}>
                  <option value="Airbnb">Origen: Airbnb</option>
                  <option value="Booking.com">Origen: Booking.com</option>
                  <option value="Google">Origen: Google Maps</option>
                  <option value="Direct">Origen: Directo</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
              </div>

              <div className="relative text-center">
                <select className="w-full p-4 rounded-xl border border-primary/20 bg-white outline-none focus:ring-2 ring-primary/20 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 appearance-none text-center" onChange={e => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}>
                  <option value={5}>Rating: ★ ★ ★ ★ ★</option>
                  <option value={4}>Rating: ★ ★ ★ ★ ☆</option>
                  <option value={3}>Rating: ★ ★ ★ ☆ ☆</option>
                </select>
              </div>
            </div>
            <textarea
              placeholder="Copia el texto del testimonio aquí..."
              className="w-full p-6 rounded-2xl border border-primary/20 focus:ring-2 ring-primary/20 outline-none text-sm mb-5 h-32 leading-relaxed resize-none font-serif italic"
              onChange={e => setNewReview({ ...newReview, text: e.target.value })}
            />
            <button onClick={saveReview} className="w-full bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl hover:bg-gray-900 transition-all active:scale-95">Publicar Testimonio en Mi Web</button>
          </motion.div>
        )}

        {/* Improved Review Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {property.reviews_list?.map(review => (
            <div key={review.id} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 group/item hover:bg-white hover:shadow-soft transition-all relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img src={review.avatar_url || "https://i.pravatar.cc/100"} alt="User" />
                  </div>
                  <div>
                    <h4 className="font-serif font-black italic text-lg text-text-main group-hover/item:text-primary transition-colors leading-none truncate max-w-[150px]">{review.author}</h4>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light mt-1 opacity-50">{review.created_at}</p>
                  </div>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-1.5 shadow-sm group-hover/item:scale-105 transition-transform">
                  <div className={`w-1.5 h-1.5 rounded-full ${review.source === 'Airbnb' ? 'bg-[#FF385C]' : review.source === 'Booking.com' ? 'bg-[#003580]' : 'bg-green-500'}`} />
                  <span className="text-[7px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-main">{review.source}</span>
                </div>
              </div>

              <div className="flex gap-0.5 mb-4">
                {[...Array(review.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 text-primary fill-primary" />
                ))}
              </div>

              <div className="relative">
                <Quote className="absolute -left-2 -top-2 w-6 h-6 text-primary opacity-5 rotate-180" />
                <p className="text-text-main text-[13px] leading-relaxed italic opacity-80 pl-6 border-l-2 border-primary/10">
                  "{review.text}"
                </p>
              </div>
            </div>
          ))}
        </div>

        {(property.reviews_list || []).length === 0 && !isAdding && (
          <div className="text-center py-12 bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-100">
            <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-300">Tu legado está listo para ser documentado</p>
          </div>
        )}
      </div>
    </div>
  );
};
