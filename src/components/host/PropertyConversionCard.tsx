import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { showToast } from '../../utils/toast';

interface PropertyConversionCardProps {
  p: any;
  onSave: (updated: any) => void;
}

/**
 * 🔱 PROPERTY CONVERSION CARD
 * Handles individual property settings, urgency messages, and map links.
 * Features Salty Suggestion for AI-driven urgency marketing.
 */
export const PropertyConversionCard: React.FC<PropertyConversionCardProps> = ({ p, onSave }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    availability_urgency_msg: p.availability_urgency_msg || '',
    general_area_map_url: p.general_area_map_url || '',
    exact_lat_long: p.exact_lat_long || '',
    google_maps_url: p.google_maps_url || '',
    waze_url: p.waze_url || '',
    review_url: p.review_url || ''
  });

  const calendarSync = p.calendarSync || [];
  const lastSyncDate = calendarSync.length > 0 
    ? new Date(Math.max(...calendarSync.map((s: any) => new Date(s.lastSynced || 0).getTime())))
    : null;

  const isSyncHealthy = calendarSync.every((s: any) => s.syncStatus === 'success');

  const handleBlur = () => {
    onSave({ ...p, ...formData });
  };

  const saltySuggest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGenerating(true);
    // 🧠 SALTY BRAIN SIMULATION: Optimizing conversion copy
    setTimeout(() => {
      const suggestions = [
        "¡Última villa disponible para Semana Santa! 🌴",
        "Solo queda 1 fin de semana libre en los próximos 30 días.",
        "Reserva hoy y asegura tu refugio de lujo antes del Sold Out.",
        "Detección de alta demanda: 12 personas viendo esta propiedad ahora."
      ];
      const random = suggestions[Math.floor(Math.random() * suggestions.length)];
      setFormData(prev => ({ ...prev, availability_urgency_msg: random }));
      onSave({ ...p, availability_urgency_msg: random });
      setIsGenerating(false);
      showToast("Salty ha optimizado tu mensaje 🔱");
    }, 800);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
          <div>
            <h3 className="font-serif font-black italic text-2xl text-text-main tracking-tight line-clamp-1">{p.title}</h3>
            <div className="flex items-center gap-2 mt-1.5 ml-0.5">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
               <p className="text-[9px] font-black uppercase tracking-[0.1em] text-text-light opacity-60">
                 {lastSyncDate ? `Sincronizado: ${lastSyncDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Sincronía Pendiente'}
               </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100 h-fit">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Activa</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Conversión y Urgencia */}
          <div className="bg-sand/30 p-8 rounded-[2rem] border border-primary/20 relative overflow-hidden group/salty">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Cierre de Venta (Urgencia)</p>
                <button 
                  onClick={saltySuggest}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-primary ${isGenerating ? 'animate-pulse opacity-50' : ''}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary-light" />
                  Salty Suggest
                </button>
             </div>
             <textarea
                value={formData.availability_urgency_msg}
                onChange={e => setFormData({ ...formData, availability_urgency_msg: e.target.value })}
                onBlur={handleBlur}
                placeholder="Ej: Solo queda 1 fin de semana libre en Marzo 🌴"
                className="w-full bg-white/60 p-5 rounded-2xl border border-primary/10 text-sm font-medium leading-relaxed italic text-text-main h-32 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner"
             />
             <p className="text-[8px] text-primary/50 mt-3 font-bold uppercase tracking-widest leading-none">Aparece en el checkout para forzar la reserva</p>
          </div>

          {/* Enlaces Maestros */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] ml-2">Geolocalización y Reseñas</p>
             <div className="grid grid-cols-1 gap-3">
                <div className="flex bg-gray-50 rounded-2xl p-4 border border-gray-100 focus-within:bg-white focus-within:border-primary/30 transition-all group/link shadow-inner">
                   <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mr-4 group-hover/link:bg-primary/10 transition-colors">
                      <span className="material-icons text-primary opacity-50">map</span>
                   </div>
                   <input 
                      value={formData.google_maps_url} 
                      onChange={e => setFormData({ ...formData, google_maps_url: e.target.value })} 
                      onBlur={handleBlur}
                      placeholder="URL de Google Maps..." 
                      className="bg-transparent flex-1 text-xs font-bold outline-none" 
                   />
                </div>
                <div className="flex bg-gray-50 rounded-2xl p-4 border border-gray-100 focus-within:bg-white focus-within:border-primary/30 transition-all group/link shadow-inner">
                   <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mr-4 group-hover/link:bg-primary/10 transition-colors">
                      <span className="material-icons text-blue-500 opacity-50">directions</span>
                   </div>
                   <input 
                      value={formData.waze_url} 
                      onChange={e => setFormData({ ...formData, waze_url: e.target.value })} 
                      onBlur={handleBlur}
                      placeholder="URL de Waze..." 
                      className="bg-transparent flex-1 text-xs font-bold outline-none" 
                   />
                </div>
                <div className="flex bg-gray-50 rounded-2xl p-4 border border-gray-100 focus-within:bg-white focus-within:border-primary/30 transition-all group/link shadow-inner">
                   <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mr-4 group-hover/link:bg-primary/10 transition-colors">
                      <span className="material-icons text-yellow-500 opacity-50">star_rate</span>
                   </div>
                   <input 
                      value={formData.review_url} 
                      onChange={e => setFormData({ ...formData, review_url: e.target.value })} 
                      onBlur={handleBlur}
                      placeholder="URL para dejar reseña..." 
                      className="bg-transparent flex-1 text-xs font-bold outline-none" 
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
