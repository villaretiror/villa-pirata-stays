import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property, LocalGuideCategory, LocalGuideItem, Offer, CalendarSync, Review, User, SeasonalPrice, PromoCode } from '../types';
import GuideCard from '../components/GuideCard';
import { fetchICalData, parseICalData, importPropertyFromUrl, generateWhatsAppLink, getHostInstructionMessage, formatDateLong } from '../utils';
import HostMenu from '../components/host/HostMenu';
import HostChat from '../components/host/HostChat';
import HostMessageCenter from '../components/host/HostMessageCenter';
import HostNavbar from '../components/host/HostNavbar';
import SavingsInsights from '../components/host/SavingsInsights';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { mapSupabaseProperty } from '../utils/mappers';
import { Database, Tables } from '../supabase_types';
import { HOST_PHONE } from '../constants';
import ExperienceManager from '../components/host/ExperienceManager';
import SiteSettingsManager from '../components/host/SiteSettingsManager';
import InsightViewer from '../components/host/InsightViewer';
import HostAvailabilityManager from '../components/host/HostAvailabilityManager';
import { useAvailability } from '../hooks/useAvailability';
import PropertyEditorModal from '../components/host/PropertyEditorModal';
import SectionErrorBoundary from '../components/SectionErrorBoundary';
import { setToastCallback, showToast } from '../utils/toast';
import { motion, AnimatePresence, Variants } from 'framer-motion';

type BookingRow = Tables<'bookings'>;
type ExpenseRow = Tables<'property_expenses'>;
type LeadRow = Tables<'leads'>;
type AlertRow = Tables<'urgent_alerts'>;
type CohostRow = Tables<'property_cohosts'>;
type TaskRow = Tables<'operation_tasks'>;

// Joined types for nested queries
type BookingWithDetails = BookingRow & {
  profiles: { full_name: string | null; avatar: string | null; phone: string | null; email?: string | null; tags: string[] | null } | null;
  properties: { title: string; images: string[] | null; policies?: any } | null;
};

// 🚀 INDUSTRIAL OPTIMIZATION: Code Splitting for Analytics (Recharts)
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const Area = lazy(() => import('recharts').then(m => ({ default: m.Area })));

import {
  Zap, BarChart3, CreditCard, Home, Users, Star, Map, MessageCircle, Menu, CheckCircle2,
  Calendar, Key, Wallet, TrendingUp, Sparkles, ChevronRight, Info, Clock, Send,
  LayoutDashboard, User as UserIcon, AlertTriangle, Bell, Check, Trash2, Download,
  Plus, Tag, CheckCheck, DollarSign, GripHorizontal, RefreshCcw, UserX, ClipboardCheck,
  ListPlus, PlusCircle, HelpCircle, Printer, Anchor, ShieldCheck, Waves, Heart,
  Save, Quote, ChevronDown
} from 'lucide-react';

const CustomToast = () => {
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });
  useEffect(() => {
    setToastCallback((msg: string) => {
      setToast({ msg, visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    });
  }, []);

  if (!toast.visible) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className="bg-black/90 backdrop-blur-md border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3">
        <span className="material-icons text-green-400 text-sm">check_circle</span>
        {toast.msg}
      </div>
    </div>
  );
};

const getSourceBadge = (source: string | null) => {
  if (!source) return null;
  const s = source.toLowerCase();
  if (s.includes('airbnb')) return <span className="bg-[#FF5A5F]/10 text-[#FF5A5F] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">🔴 Airbnb</span>;
  if (s.includes('booking')) return <span className="bg-[#003580]/10 text-[#003580] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">🔵 Booking.com</span>;
  if (s.includes('salty')) return <span className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">🧠 Salty AI</span>;
  return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">🟢 Directo</span>;
};

// Componente para evitar el bug de hooks en el loop de propiedades
function PropertyConversionCard({ p, onSave }: { p: any, onSave: (updated: any) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    availability_urgency_msg: p.availability_urgency_msg || '',
    general_area_map_url: p.general_area_map_url || '',
    exact_lat_long: p.exact_lat_long || '',
    google_maps_url: p.google_maps_url || '',
    waze_url: p.waze_url || '',
    review_url: p.review_url || ''
  });

  const handleBlur = () => {
    onSave({ ...p, ...formData });
  };

  const saltySuggest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGenerating(true);
    // Simulación de análisis de Salty
    setTimeout(() => {
      const suggestions = [
        "¡Última villa disponible para Semana Santa! 🌴",
        "Solo queda 1 fin de semana libre en los próximos 30 días.",
        "Reserva hoy y asegura tu refugio de lujo antes del Sold Out.",
        "Detección de alta demanda: 12 personas viendo esta propiedad ahora."
      ];
      const random = suggestions[Math.floor(Math.random() * suggestions.length)];
      setFormData(prev => ({ ...prev, availability_urgency_msg: random }));
      onSave({ ...p, ...p, availability_urgency_msg: random });
      setIsGenerating(false);
      showToast("Salty ha optimizado tu mensaje 🔱");
    }, 800);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden group">
      {/* Decoración Visual */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
          <h3 className="font-serif font-black italic text-2xl text-text-main tracking-tight">{p.title}</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-text-light">Auto-Optimizer Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Columna 1: Urgencia y FOMO */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Psicología de Venta (FOMO)</h4>
            </div>
            
            <div className="relative">
              <label className="text-[9px] font-bold uppercase tracking-widest text-text-light mb-2 block ml-1">Mensaje de Urgencia</label>
              <div className="relative">
                <input 
                  value={formData.availability_urgency_msg}
                  onChange={e => setFormData({...formData, availability_urgency_msg: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all pr-12"
                  placeholder="Ej: Solo quedan 2 fines de semana..."
                />
                <button 
                  onClick={saltySuggest}
                  disabled={isGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                >
                  {isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin text-primary" /> : <Sparkles className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[8px] text-gray-400 mt-2 italic">* Este mensaje aparecerá en la cabecera de la propiedad en la web.</p>
            </div>
          </div>

          {/* Columna 2: Logística y GPS */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Map className="w-4 h-4" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Logística de Confianza</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-text-light mb-1 block ml-1">Mapa Estético (Supabase URL)</label>
                <input 
                  value={formData.general_area_map_url}
                  onChange={e => setFormData({...formData, general_area_map_url: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-2 rounded-xl bg-gray-50 border border-gray-100 text-[9px] font-medium"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-text-light mb-1 block ml-1">Coordenadas GPS</label>
                <input 
                  value={formData.exact_lat_long}
                  onChange={e => setFormData({...formData, exact_lat_long: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-2 rounded-xl bg-gray-50 border border-gray-100 text-[9px] font-medium"
                  placeholder="18.0636, -67.1569"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[8px] font-bold uppercase tracking-widest text-text-light mb-1 block ml-1 text-center">Google Maps</label>
                <input 
                  value={formData.google_maps_url}
                  onChange={e => setFormData({...formData, google_maps_url: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-[8px] text-center"
                />
              </div>
              <div className="flex-1">
                <label className="text-[8px] font-bold uppercase tracking-widest text-text-light mb-1 block ml-1 text-center">Waze</label>
                <input 
                  value={formData.waze_url}
                  onChange={e => setFormData({...formData, waze_url: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-[8px] text-center"
                />
              </div>
              <div className="flex-1">
                <label className="text-[8px] font-bold uppercase tracking-widest text-text-light mb-1 block ml-1 text-center">Reviews</label>
                <input 
                  value={formData.review_url}
                  onChange={e => setFormData({...formData, review_url: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-[8px] text-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-main animate-pulse">Sincronizando con Supabase...</p>
  </div>
);

// --- EXTRACTED COMPONENTS ---

interface ReviewManagerProps {
  property: Property;
  onUpdateStats: (propertyId: string, rating: number, count: number) => void;
  onAddReview: (propertyId: string, review: Review) => void;
}

const ReviewManager: React.FC<ReviewManagerProps> = ({ property, onUpdateStats, onAddReview }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newReview, setNewReview] = useState<Partial<Review>>({ rating: 5, source: 'Airbnb', date: 'Mayo 2024' });
  const [stats, setStats] = useState({ rating: property.rating, count: property.reviews_count });

  const saveReview = () => {
    if (!newReview.author || !newReview.text) return;
    const review: Review = {
      id: Math.random().toString(36).substr(2, 9),
      author: newReview.author,
      text: newReview.text,
      rating: newReview.rating || 5,
      date: newReview.date || 'Reciente',
      source: (newReview.source as 'Airbnb' | 'Booking.com' | 'Google') || 'Airbnb',
      avatar: `https://ui-avatars.com/api/?name=${newReview.author}&background=random`
    };
    onAddReview(property.id, review);
    setIsAdding(false);
    setNewReview({ rating: 5, source: 'Airbnb', date: 'Mayo 2024' });
  };

  const saveStats = () => {
    onUpdateStats(property.id, stats.rating, stats.count);
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
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light opacity-50 ml-5">Social Proof Management</p>
        </div>

        <div className="flex items-center gap-8 bg-gray-50/80 p-6 rounded-3xl border border-gray-100 shadow-inner">
           <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-light mb-1">Score Global</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-3xl font-serif font-black italic text-text-main leading-none">{stats.rating}</span>
                 <Star className="w-3.5 h-3.5 text-primary fill-primary mb-1" />
              </div>
           </div>
           <div className="w-px h-10 bg-gray-200" />
           <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-light mb-1">Total Reseñas</p>
              <p className="text-3xl font-serif font-black italic text-text-main leading-none">{stats.count}</p>
           </div>
        </div>
      </div>

      {/* Sincronización Manual Styling */}
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
            className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${isAdding ? 'bg-red-50 text-red-500 border-red-100' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'}`}
          >
            {isAdding ? 'Cerrar Panel' : '+ Añadir Manualmente'}
          </button>
        </div>

        {isAdding && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-sand p-8 rounded-[2.5rem] border border-orange-100 shadow-inner relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 relative z-10">
              <input placeholder="Nombre del Huésped" className="p-4 rounded-xl border border-orange-100 focus:ring-2 ring-primary/20 outline-none text-sm font-bold" onChange={e => setNewReview({ ...newReview, author: e.target.value })} />
              <input placeholder="Fecha de Estadía (Ej: Junio 2024)" className="p-4 rounded-xl border border-orange-100 focus:ring-2 ring-primary/20 outline-none text-sm font-bold" onChange={e => setNewReview({ ...newReview, date: e.target.value })} />
              
              <div className="relative">
                 <select className="w-full p-4 rounded-xl border border-orange-100 bg-white outline-none focus:ring-2 ring-primary/20 text-[10px] font-black uppercase tracking-widest appearance-none" onChange={e => setNewReview({ ...newReview, source: e.target.value as any })}>
                    <option value="Airbnb">Origen: Airbnb</option>
                    <option value="Booking.com">Origen: Booking.com</option>
                    <option value="Google">Origen: Google Maps</option>
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
              </div>

               <div className="relative text-center">
                 <select className="w-full p-4 rounded-xl border border-orange-100 bg-white outline-none focus:ring-2 ring-primary/20 text-[10px] font-black uppercase tracking-widest appearance-none text-center" onChange={e => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}>
                    <option value={5}>Rating: ★ ★ ★ ★ ★</option>
                    <option value={4}>Rating: ★ ★ ★ ★ ☆</option>
                 </select>
              </div>
            </div>
            <textarea
              placeholder="Copia el texto del testimonio aquí..."
              className="w-full p-6 rounded-2xl border border-orange-100 focus:ring-2 ring-primary/20 outline-none text-sm mb-5 h-32 leading-relaxed resize-none font-serif italic"
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
                      <img src={review.avatar || "https://i.pravatar.cc/100"} alt="User" />
                   </div>
                   <div>
                      <h4 className="font-serif font-black italic text-lg text-text-main group-hover/item:text-primary transition-colors leading-none truncate max-w-[150px]">{review.author}</h4>
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-light mt-1 opacity-50">{review.date}</p>
                   </div>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-1.5 shadow-sm group-hover/item:scale-105 transition-transform">
                   <div className={`w-1.5 h-1.5 rounded-full ${review.source === 'Airbnb' ? 'bg-[#FF385C]' : review.source === 'Booking.com' ? 'bg-[#003580]' : 'bg-green-500'}`} />
                   <span className="text-[7px] font-black uppercase tracking-widest text-text-main">{review.source}</span>
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
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Tu legado está listo para ser documentado</p>
          </div>
        )}
      </div>
    </div>
  );
};


const ImportModal = ({ onClose, onImport }: { onClose: () => void, onImport: (url: string) => void }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImportClick = async () => {
    if (!url) return;
    setIsLoading(true);
    await onImport(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif font-black italic text-xl tracking-tighter">Importar Anuncio</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <span className="material-icons text-gray-400">close</span>
          </button>
        </div>

        <p className="text-sm text-text-light mb-4">Pega el enlace de Airbnb o Booking.com para rellenar los datos automáticamente.</p>

        <div className="space-y-4">
          <div className="relative">
            <span className="material-icons absolute left-3 top-3 text-gray-400">link</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://airbnb.com/h/..."
              className="w-full pl-10 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            onClick={handleImportClick}
            disabled={!url || isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF385C] to-[#E61E4D] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Extrayendo datos básicos...
              </>
            ) : (
              <>
                <span className="material-icons text-sm">auto_fix_high</span>
                Importar Mágicamente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisDashboard = ({ bookings, expenses, properties, selectedPropertyId, onFilterChange }: { bookings: BookingRow[], expenses: ExpenseRow[], properties: Property[], selectedPropertyId: string, onFilterChange: (id: string) => void }) => {
  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross');
  const [showOrigin, setShowOrigin] = useState(false);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const creationDate = selectedProperty?.created_at ? new Date(selectedProperty.created_at) : null;

  const filteredBookings = useMemo(() =>
    selectedPropertyId === 'all' ? bookings : bookings.filter(b => b.property_id === selectedPropertyId),
    [bookings, selectedPropertyId]
  );

  const filteredExpenses = useMemo(() =>
    selectedPropertyId === 'all' ? expenses : expenses.filter(e => e.property_id === selectedPropertyId),
    [expenses, selectedPropertyId]
  );

  const stats = useMemo(() => {
    const data: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthStr = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

      const monBookings = filteredBookings.filter((b: any) => {
        const bDate = new Date(b.check_in);
        return bDate.getMonth() === month && bDate.getFullYear() === year;
      });

      const income = monBookings.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
      const expense = filteredExpenses
        .filter((e: any) => {
          const eDate = new Date(e.created_at);
          return eDate.getMonth() === month && eDate.getFullYear() === year;
        })
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const webIncome = monBookings
        .filter((b: any) => !b.source?.toLowerCase().includes('airbnb') && !b.source?.toLowerCase().includes('ota'))
        .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);

      const otaIncome = income - webIncome;

      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      let availableDays = totalDaysInMonth;
      if (creationDate) {
        const cMonth = creationDate.getMonth();
        const cYear = creationDate.getFullYear();
        if (cYear > year || (cYear === year && cMonth > month)) {
          availableDays = 0;
        } else if (cYear === year && cMonth === month) {
          availableDays = totalDaysInMonth - creationDate.getDate() + 1;
        }
      }

      const bookedDays = monBookings.reduce((sum: number, b: any) => {
        if (!b.check_in || !b.check_out) return sum;
        const start = new Date(b.check_in);
        const end = new Date(b.check_out);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diff;
      }, 0);
      const occupancy = availableDays > 0 ? Math.min(Math.round((bookedDays / availableDays) * 100), 100) : 0;

      data.push({
        name: monthStr,
        Total: income,
        Web: webIncome,
        OTA: otaIncome,
        Gastos: expense,
        Profit: income - expense,
        Ocupación: occupancy
      });
    }
    return data;
  }, [filteredBookings, filteredExpenses, creationDate, selectedPropertyId]);

  const currentMonthData = stats[stats.length - 1] || { Total: 0, Profit: 0, Ocupación: 0, Gastos: 0 };
  const margin = currentMonthData.Total > 0 ? Math.round((currentMonthData.Profit / currentMonthData.Total) * 100) : 0;

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm print:hidden">
        <select
          value={selectedPropertyId}
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-transparent border-none text-xs font-black uppercase tracking-widest outline-none"
        >
          <option value="all">Todas las villas</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
          <button
            onClick={() => setViewMode('gross')}
            className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'gross' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}
          >
            Bruto
          </button>
          <button
            onClick={() => setViewMode('net')}
            className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'net' ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}
          >
            Neto
          </button>
        </div>

        <button
          onClick={handleExport}
          className="p-2 bg-black text-white rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group"
        >
          <Printer className="w-4 h-4" />
          Imprimir Reporte
        </button>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-soft">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-serif font-black italic text-text-main tracking-tighter">Análisis de Desempeño 🔱</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Métricas Consolidadas de los últimos 6 meses</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Margen Operativo</span>
            <span className="text-2xl font-serif font-black italic">{margin}%</span>
          </div>
        </div>

        <div className="h-64 w-full" style={{ minHeight: '300px' }}>
          <Suspense fallback={<div className="h-full w-full bg-gray-50/50 animate-pulse rounded-3xl border border-dashed border-gray-100 flex items-center justify-center text-[10px] font-black uppercase text-gray-300">Cargando Gráficas...</div>}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CBB28A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#CBB28A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="Total" stroke="#CBB28A" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                <Area type="monotone" dataKey="Profit" stroke="#2D5A27" fillOpacity={0} strokeWidth={4} />
                <Area type="monotone" dataKey="Gastos" stroke="#EE4E4E" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
             <TrendingUp className="w-16 h-16" />
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Ingresos {currentMonthData.name}</p>
           <p className="text-3xl font-serif font-black italic tracking-tighter text-primary-light">${currentMonthData.Total.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft">
           <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Gastos Operativos</p>
           <p className="text-3xl font-serif font-black italic tracking-tighter text-red-600">-${currentMonthData.Gastos.toLocaleString()}</p>
        </div>

        <div className="bg-primary/10 p-8 rounded-[2.5rem] border border-primary/20 shadow-sm">
           <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Profit Real Neto</p>
           <p className="text-3xl font-serif font-black italic tracking-tighter text-primary">${currentMonthData.Profit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

const CohostManager = ({ propertyId, propertyName, onShowToast }: { propertyId: string, propertyName: string, onShowToast: (msg: string) => void }) => {
  const [newCohostEmail, setNewCohostEmail] = useState('');
  const [cohosts, setCohosts] = useState<CohostRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEliteView, setShowEliteView] = useState(false);

  // --- Task Management (Unified) ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const fetchCohosts = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('property_cohosts').select('*').eq('property_id', propertyId);
    if (data) setCohosts(data as CohostRow[]);
    setIsLoading(false);
  };

  const fetchTasks = async () => {
    setIsTaskLoading(true);
    // 🔄 UNIFIED: Using 'tasks' table instead of 'operation_tasks'
    const { data } = await supabase.from('tasks').select('*').eq('property_id', propertyId).order('created_at', { ascending: true });
    if (data) setTasks(data);
    setIsTaskLoading(false);
  };

  useEffect(() => {
    fetchCohosts();
    fetchTasks();
  }, [propertyId]);

  const handleInvite = async () => {
    const trimmedEmail = newCohostEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      onShowToast("Escribe un email válido 📧");
      return;
    }

    setIsLoading(true);
    const token = crypto.randomUUID();

    try {
      const { error } = await supabase.from('property_cohosts').insert({
        property_id: propertyId,
        email: trimmedEmail,
        status: 'pending',
        invitation_token: token
      });

      if (!error) {
        // 🛰️ UNIFIED NOTIFICATION: Email + Telegram
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cohost_invitation', 
            customerEmail: trimmedEmail, // Sync with backend key
            email: trimmedEmail, // Backward compatibility
            propertyName: propertyName,
            propertyId: propertyId,
            token: token
          })
        });

        setNewCohostEmail('');
        fetchCohosts();
        onShowToast("Invitación enviada y notificada ✨");
      } else {
        onShowToast(`Error: ${error.message}`);
      }
    } catch (e: any) {
      console.error("Invite Error:", e);
      onShowToast("Fallo al enviar invitación.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCohost = async (id: string) => {
    if (!confirm('¿Remover acceso?')) return;
    const { error } = await supabase.from('property_cohosts').delete().eq('id', id);
    if (!error) {
      onShowToast("Co-anfitrión eliminado 🗑️");
      fetchCohosts();
    } else {
      console.error("Delete Cohost Error:", error);
      onShowToast(`No se pudo eliminar: ${error.message}`);
    }
  };

  const handleResendInvitation = async (ch: CohostRow) => {
    try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cohost_invitation',
            customerEmail: ch.email,
            email: ch.email,
            propertyName: propertyName,
            propertyId: propertyId,
            token: ch.invitation_token
          })
        });
        onShowToast(`Invitación reenviada a ${ch.email} ✨`);
    } catch (e) {
      console.error("Resend error:", e);
      onShowToast("Error al reenviar invitación.");
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean | null) => {
    const isCompleted = !!currentStatus;
    const { error } = await supabase.from('tasks').update({
      done: !isCompleted
    }).eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, done: !isCompleted } : t));
      if (!isCompleted) onShowToast("¡Tarea completada! ✅");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDesc.trim()) return;
    const { error, data } = await supabase.from('tasks').insert({
      property_id: propertyId,
      text: newTaskDesc.trim(),
      property: propertyName,
      done: false
    }).select().single();

    if (!error && data) {
      setNewTaskDesc('');
      setTasks([...tasks, data]);
      onShowToast("Tarea añadida 📋");
    }
  };

  const handleResetTasks = async () => {
    if (!confirm("¿Deseas reiniciar todas las tareas?")) return;
    const { error } = await supabase.from('tasks').update({ done: false }).eq('property_id', propertyId);
    if (!error) {
      setTasks(tasks.map(t => ({ ...t, done: false })));
      onShowToast("Protocolo reiniciado 🧹");
    }
  };

  const completedCount = tasks.filter(t => t.done).length;
  const allDone = tasks.length > 0 && completedCount === tasks.length;

  if (showEliteView) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black p-10 rounded-[3rem] border border-white/10 shadow-3xl text-center"
        >
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
              animate={{ 
                x: [0, 100, 0], 
                y: [0, -50, 0],
                rotate: [0, 360],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 blur-[120px] rounded-full"
            />
          </div>

          <div className="relative z-10">
            <motion.div 
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-tr from-primary to-amber-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ring-4 ring-primary/20"
            >
              <CheckCircle2 strokeWidth={2} className="w-12 h-12 text-black" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-4xl font-serif font-black text-white italic tracking-tighter mb-4">¡Protocolo Impecable! ✨</h3>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-[0.3em] mb-10">Villa lista para recepción Élite</p>
            </motion.div>

            {/* Elite Badge Display */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-12"
            >
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">HOST QUALITY ASSURED</span>
            </motion.div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowEliteView(false)} 
              className="w-full py-5 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] transition-all hover:bg-gray-100 shadow-xl"
            >
              Cerrar Dashboard
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-6 mt-8 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-serif font-black italic text-lg mb-1 flex items-center gap-2 tracking-tighter">
          <Users strokeWidth={1.5} className="w-5 h-5 text-primary" /> Gestión de Co-anfitriones
        </h3>
        <div className="space-y-3 mb-6 mt-4">
          {cohosts.map((ch, idx) => (
            <div key={ch.id || idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
              <div>
                <p className="text-xs font-bold text-text-main">{ch.email}</p>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {ch.status === 'active' ? 'Activo' : 'Pendiente'}
                </span>
                {ch.status === 'pending' && <button onClick={() => handleResendInvitation(ch)} className="ml-2 text-[8px] text-gray-400 hover:text-black font-black uppercase">Reenviar</button>}
              </div>
              <button onClick={() => handleRemoveCohost(ch.id)} className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {cohosts.length === 0 && <p className="text-center py-4 text-[10px] text-gray-400 uppercase font-black opacity-30">Sin equipo</p>}
        </div>
        <div className="flex gap-2">
          <input value={newCohostEmail} onChange={e => setNewCohostEmail(e.target.value)} placeholder="email@equipo.com" className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-xs outline-none" />
          <button onClick={handleInvite} disabled={!newCohostEmail} className="bg-black text-white px-4 rounded-xl text-[10px] font-black uppercase">Invitar</button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
        {allDone && <div className="absolute top-0 right-0 p-3 bg-green-500 text-white rounded-bl-xl cursor-pointer" onClick={() => setShowEliteView(true)}><Sparkles className="w-4 h-4" /></div>}
        <h3 className="font-serif font-black italic text-lg mb-4 flex items-center gap-2 tracking-tighter"><ClipboardCheck className="w-5 h-5 text-secondary" /> Protocolo Operativo</h3>
        <div className="space-y-2 mb-4">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <button onClick={() => handleToggleTask(t.id, t.done)} className={`w-4 h-4 border rounded flex items-center justify-center ${t.done ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                {t.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`text-[11px] ${t.done ? 'line-through text-gray-300' : 'text-text-main font-medium'}`}>{t.text}</span>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-20">Protocolo impecable</p>}
        </div>
        <div className="flex gap-2">
          <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Nueva tarea..." className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] outline-none" />
          <button onClick={handleAddTask} className="bg-secondary text-white p-3 rounded-xl"><PlusCircle className="w-4 h-4" /></button>
        </div>
        <button onClick={handleResetTasks} className="w-full mt-4 text-[8px] font-black uppercase text-gray-300 hover:text-red-400">Reiniciar Todo</button>
      </div>
    </div>
  );
};

const WelcomeModal = ({ isOpen, onClose, message }: { isOpen: boolean, onClose: () => void, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-scale-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif font-bold text-text-main leading-tight">Mensaje de Bienvenida</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="bg-sand/30 p-6 rounded-2xl border border-orange-100/50 mb-6 font-medium text-sm text-text-main leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto">
          {message}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(message);
              showToast("¡Mensaje copiado! 📋");
            }}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10"
          >
            <span className="material-icons text-sm">content_copy</span> Copiar al Portapapeles
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationInbox = ({ leads, alerts, pendingPayments, onResolve }: { leads: any[], alerts: any[], pendingPayments: any[], onResolve: (type: 'lead' | 'alert' | 'payment', id: string) => void }) => {
  const allNotifications = [
    ...leads.map(l => ({ ...l, type: 'lead', icon: UserIcon, color: 'text-blue-500', created_at: l.created_at || new Date().toISOString() })),
    ...alerts.map(a => ({ ...a, type: 'alert', icon: AlertTriangle, color: 'text-red-500', created_at: a.created_at || new Date().toISOString() })),
    ...pendingPayments.map(p => ({ ...p, type: 'payment', icon: CreditCard, color: 'text-orange-500', name: p.profiles?.full_name || 'Huésped', created_at: p.created_at || new Date().toISOString() }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (allNotifications.length === 0) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-soft overflow-hidden mb-8 animate-fade-in print:hidden">
      <div className="px-8 py-5 bg-gray-50/30 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-main flex items-center gap-3">
          <Bell className="w-4 h-4 text-primary animate-pulse" />
          Centro de Alertas
        </h3>
        <span className="bg-primary text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">{allNotifications.length}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto no-scrollbar">
        {allNotifications.map((n: any) => (
          <div key={`${n.type}-${n.id}`} className="p-5 hover:bg-gray-50/50 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-sand/30 flex items-center justify-center ${n.color} border border-white shadow-sm`}>
                <n.icon strokeWidth={1.5} className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text-main line-clamp-1">{n.name || n.profiles?.full_name || 'Novedad'}</p>
                  {n.type === 'payment' && getSourceBadge(n.source)}
                </div>
                <p className="text-[9px] font-medium uppercase tracking-widest text-text-light mt-0.5">
                  {n.type === 'lead' && 'Nuevo Lead Interesado'}
                  {n.type === 'alert' && (
                    <span className="flex items-center gap-2">
                      <span className="font-bold">[{n.severity || 1}/5]</span> {n.message}
                      {n.severity >= 4 && <span className="bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded uppercase animate-pulse">Crítico</span>}
                    </span>
                  )}
                  {n.type === 'payment' && 'Validación de Pago Pendiente'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onResolve(n.type, n.id)}
              className="p-3 opacity-0 group-hover:opacity-100 bg-white border border-gray-100 rounded-full hover:bg-black hover:text-white transition-all shadow-soft active:scale-90"
              title="Marcar como resuelto"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SmartValidationModal = ({ data, onConfirm, onClose }: { data: any, onConfirm: (d: any) => void, onClose: () => void }) => {
  if (!data) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-scale-up border border-gray-100/50">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif font-bold text-text-main leading-tight">Membresía Elite 🔱</h3>
          <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="bg-sand/10 p-6 rounded-2xl border border-orange-100/30 mb-6 font-medium text-xs text-text-main leading-relaxed max-h-[40vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono uppercase tracking-tighter">{JSON.stringify(data, null, 2)}</pre>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onClose()}
            className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
          >
            Descartar
          </button>
          <button
            onClick={() => onConfirm(data)}
            className="flex-[2] py-4 text-xs font-black uppercase tracking-widest text-white bg-primary rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-98"
          >
            Confirmar e Importar 🔱
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

type Tab = 'today' | 'calendar' | 'listings' | 'guidebook' | 'messages' | 'reviews' | 'menu' | 'leads' | 'payments' | 'analytics' | 'seasonal' | 'conversion' | 'settings' | 'insights' | 'team' | 'help' | 'availability';

const HostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { properties, localGuideData: guideData, updateProperties: onUpdateProperties } = useProperty();

  const onNavigate = (path: string) => {
    if (path === 'home') navigate('/');
    else navigate(path);
  };

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [leads, setLeads] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [showSmartValidation, setShowSmartValidation] = useState<any | null>(null);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);

  // Real-time Database State
  const [realBookings, setRealBookings] = useState<BookingWithDetails[]>([]);
  const [cleaningStatus, setCleaningStatus] = useState<'ready' | 'progress' | 'dirty'>('ready');
  const [pendingPayments, setPendingPayments] = useState<BookingWithDetails[]>([]);

  // Role helpers — computed ONCE from the authenticated user
  const isHostOrAdmin = user?.role === 'host' || user?.role === 'admin' || user?.email === 'villaretiror@gmail.com';
  const isCoHost = !isHostOrAdmin; // If not owner = co-host (limited access)

  // 🔌 ROUTING SYNC: Handle manual navigation to /dashboard/properties
  useEffect(() => {
    if (window.location.hash.includes('properties') || window.location.search.includes('tab=listings')) {
      setActiveTab('listings');
    }
  }, []);

  // Analytics State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [propertyPerformance, setPropertyPerformance] = useState<{ performance: Record<string, number>, chartData: { label: string, val: number }[] }>({ performance: {}, chartData: [] });
  const [globalExpenses, setGlobalExpenses] = useState<ExpenseRow[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<string>('all');

  // --- SWR ENGINE (Stale-While-Revalidate) ---
  const DASH_CACHE_KEY = `host_dash_cache_${user?.id}`;

  const restoreCache = useCallback(() => {
    const cached = localStorage.getItem(DASH_CACHE_KEY);
    if (cached) {
      try {
        const { totalRevenue, monthlyRevenue, realBookings, globalExpenses } = JSON.parse(cached);
        setTotalRevenue(totalRevenue);
        setMonthlyRevenue(monthlyRevenue);
        setRealBookings(realBookings);
        setGlobalExpenses(globalExpenses);
      } catch (e) {
        console.warn("Error restoring dashboard cache:", e);
      }
    }
  }, [DASH_CACHE_KEY]);

    const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!user?.id || !user?.email) return;

    // SWR: Restaurar cache antes de empezar la carga real para UI instantánea
    restoreCache();
    setIsLoading(true);

    try {
      // 🔱 BUNDLE FETCHING: Single Atomic Snapshot for Zero Latency
      const { data: bundle, error: bundleError } = await supabase.rpc('get_host_dashboard_bundle', { 
        target_email: user.email.toLowerCase() 
      });

      if (bundleError) throw bundleError;
      if (!bundle) return;

      // 1. Unificación de Propiedades (Properties)
      const mappedProps = (bundle.properties || []).map((p: any) => 
        mapSupabaseProperty(p, { name: user.name || '', avatar: user.avatar || '', role: user.role || '' }, { isAdmin: true })
      );
      onUpdateProperties(mappedProps);

      // 2. Inteligencia de Negocio & Finanzas (Revenue Analysis)
      const typedBookings = bundle.bookings || [];
      // 2. Lógica de Ingresos (Stay-Based vs Booking-Based)
      let total = 0; let monthly = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const performance: Record<string, number> = {};
      const chartData: any[] = [];
      const monthsHistory: Record<string, number> = {};
      
      typedBookings.forEach((b: any) => {
        const amount = Number(b.total_price) || 0;
        total += amount;

        // Clasificar por Propiedad
        const propTitle = b.properties?.title || 'Villa';
        performance[propTitle] = (performance[propTitle] || 0) + amount;
        
        // Historial Mensual basado en FECHA DE ESTADÍA (Check-in) para ver ocupación real
        if (b.check_in) {
          const stayDate = new Date(b.check_in);
          const monthKey = `${stayDate.getFullYear()}-${String(stayDate.getMonth() + 1).padStart(2, '0')}`;
          monthsHistory[monthKey] = (monthsHistory[monthKey] || 0) + amount;
          
          if (stayDate.getMonth() === currentMonth && stayDate.getFullYear() === currentYear && b.status !== 'cancelled') {
            monthly += amount;
          }
        }
      });

      // Generar datos para Recharts (Últimos 6 meses)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        chartData.push({ label: d.toLocaleString('es-PR', { month: 'short' }).toUpperCase(), val: monthsHistory[monthKey] || 0 });
      }

      setTotalRevenue(total);
      setMonthlyRevenue(monthly);
      setPropertyPerformance({ performance, chartData });
      
      const today = new Date().toISOString().split('T')[0];
      const filteredBookings = typedBookings.filter((b: any) => (b.check_out >= today && b.status !== 'rejected'));
      setRealBookings(filteredBookings);

      // 3. Gestión de Gastos (Expenses)
      setGlobalExpenses(bundle.expenses || []);

      // 4. Salty Intelligence (Leads, Alerts & Payments)
      setLeads(bundle.leads || []);
      setUrgentAlerts(bundle.alerts || []);
      setPendingPayments(bundle.pending_payments || []);

      // 5. Persistencia de Cache SWR
      localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({
        totalRevenue: total,
        monthlyRevenue: monthly,
        realBookings: filteredBookings,
        globalExpenses: bundle.expenses || []
      }));

    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("fetchDashboardBundle FATAL Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, user?.name, user?.avatar, user?.role, onUpdateProperties, DASH_CACHE_KEY, restoreCache]);

  const nextCheckins = useMemo(() => {
    const dates = [0, 1, 2].map(days => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    });

    return realBookings.filter(b =>
      dates.includes(b.check_in) && b.status === 'confirmed'
    ).sort((a, b) => a.check_in.localeCompare(b.check_in));
  }, [realBookings]);

  // --- EFFECTS ---

  // 1. Authorization Check
  useEffect(() => {
    if (!user) return;
    const checkAccess = async () => {
      if (user.email === 'villaretiror@gmail.com' || user.role === 'host') {
        setIsAuthorized(true);
        return;
      }
      const { data: cohostEntry } = await supabase
        .from('property_cohosts')
        .select('id')
        .eq('email', user.email?.toLowerCase())
        .limit(1);

      if (cohostEntry && cohostEntry.length > 0) {
        setIsAuthorized(true);
      } else {
        navigate('/profile');
      }
    };
    checkAccess();
  }, [user, navigate]);

  // 2. Data Load Cycle
  useEffect(() => {
    if (!user?.id || !isAuthorized) return;
    const controller = new AbortController();
    let isSubscribed = true;

    const initialize = async () => {
      await fetchData(controller.signal);
      if (!isSubscribed) return;

      const email = user.email?.toLowerCase();
      if (email) {
        const { data: pending } = await supabase.from('property_cohosts').select('id').eq('email', email).eq('status', 'pending');
        if (pending && pending.length > 0 && isSubscribed) {
          await supabase.from('property_cohosts').update({ status: 'active' }).in('id', pending.map((p: any) => p.id));
          showToast("Accesos de Co-anfitrión activados ✨");
          await fetchData(controller.signal);
        }
      }
    };
    initialize();
    return () => { isSubscribed = false; controller.abort(); };
  }, [user?.id, user?.email, isAuthorized, activeTab, fetchData]);

  // 3. Payment Specific Sync
  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'payments') fetchData(controller.signal);
    return () => controller.abort();
  }, [activeTab, fetchData]);

  // 4. 🔥 SUPREME ARCHITECT REALTIME ENGINE (Salty Memory Link)
  useEffect(() => {
    if (!isAuthorized) return;

    const channel = supabase
      .channel('host_dashboard_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        showToast("🧠 Salty acaba de aprender algo nuevo (Lead detectado)");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urgent_alerts' }, () => {
        showToast("🚨 Alerta Crítica en Tiempo Real");
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => {
        showToast("✨ Nueva Reserva Entrante");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_expenses' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthorized, fetchData]);

  // --- CONDITIONAL RETURN (SAFE AFTER ALL HOOKS) ---
  if (!user || isAuthorized === null) {
    return <div className="min-h-screen bg-sand flex items-center justify-center font-serif italic animate-pulse">Autenticando...</div>;
  }

  // --- HANDLERS ---
  const handleApprovePayment = async (bookingId: string) => {
    const booking = realBookings.find(b => b.id === bookingId) || pendingPayments.find(p => p.id === bookingId);
    if (!booking) return;

    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
    if (!error) {
      showToast("¡Reserva confirmada! ✨");
      setShowSmartValidation(null);

      // TRIGGER EMAIL AUTOMATION
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reservation_confirmed',
            customerName: booking.profiles?.full_name || 'Huésped',
            customerEmail: booking.profiles?.email || 'anfitrion@villaretiror.com',
            propertyName: booking.properties?.title || 'Villa Retiro',
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            accessCode: booking.properties?.policies?.accessCode || "C-" + (bookingId?.slice(-4) || 'XXXX'),
            wifiName: booking.properties?.policies?.wifiName || 'Villa Retiro Guest',
            wifiPass: booking.properties?.policies?.wifiPass || 'vacaciones2024',
            propertyId: booking.property_id,
            totalPrice: booking.total_price
          })
        });
      } catch (err) {
        console.error("Error triggering email:", err);
      }

      fetchData();
    }
  };

  const handleSendAccessEmail = async (booking: any) => {
    try {
      showToast("Enviando instrucciones... 📨");
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reservation_confirmed',
          customerName: booking.profiles?.full_name || 'Huésped',
          customerEmail: booking.profiles?.email || booking.email,
          propertyName: booking.properties?.title || 'Villa Retiro',
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          accessCode: booking.properties?.policies?.accessCode || "C-" + (booking.id || '').slice(-4),
          wifiName: booking.properties?.policies?.wifiName || 'Villa Retiro Guest',
          wifiPass: booking.properties?.policies?.wifiPass || 'vacaciones2024',
          propertyId: booking.property_id,
          totalPrice: booking.total_price
        })
      });
      const { error } = await supabase.from('bookings').update({
        instructions_sent_at: new Date().toISOString()
      }).eq('id', booking.id);

      if (!error) {
        showToast("🚀 Instrucciones enviadas por email");
        fetchData();
      }
    } catch (err) {
      showToast("❌ Error al enviar email");
    }
  };

  const handleRejectPayment = async (bookingId: string) => {
    const reason = window.prompt("Motivo del rechazo (se enviará al cliente):", "El comprobante no corresponde a la reserva.");
    if (reason === null) return;

    const { error } = await supabase.from('bookings').update({
      status: 'rejected',
      metadata: { rejection_reason: reason }
    }).eq('id', bookingId);

    if (!error) {
      showToast("Pago Rechazado ❌");
      setShowSmartValidation(null);
      fetchData();
    }
  };

  const handleResolveNotification = async (type: 'lead' | 'alert' | 'payment', id: string) => {
    if (type === 'payment') {
      const booking = pendingPayments.find(p => p.id === id);
      if (booking) setShowSmartValidation(booking);
      return;
    }

    const table = type === 'lead' ? 'leads' : 'urgent_alerts';
    const { error } = await supabase.from(table).update({ status: 'resolved' }).eq('id', id);
    if (!error) {
      showToast("Marcar como resuelto ✅");
      fetchData();
    }
  };

  const handleAddTag = async (type: 'lead' | 'profile', id: string, currentTags: string[]) => {
    const newTag = window.prompt("Añadir etiqueta (ej: VIP, Remote Worker, Pet Friendly):");
    if (!newTag) return;

    const table = type === 'lead' ? 'leads' : 'profiles';
    const updatedTags = [...(currentTags || []), newTag];

    const { error } = await supabase.from(table).update({ tags: updatedTags }).eq('id', id);
    if (!error) {
      showToast(`Etiqueta "${newTag}" añadida ✨`);
      fetchData();
    }
  };

  const handleSaveProperty = async (updated: Property) => {
    if (isSaving || (user?.email !== 'villaretiror@gmail.com' && user?.role !== 'host')) return;
    setIsSaving(true);
    const hostId = user?.id;
    if (!hostId) return;

    try {
      // MASTER PAYLOAD: Sincronización de campos UI con columnas snake_case de DB
      const payload: any = { 
        ...updated, 
        host_id: hostId,
        // Unificación de nombres Estándar Real-Data
        reviews: updated.reviews_count,        
        is_offline: updated.isOffline,         
        cancellation_policy_type: updated.cancellation_policy_type,
        updated_at: new Date().toISOString()
      };

      // 🛰️ NOTIFICATION: Trigger Telegram alert if a Co-host makes the change
      if (user?.email !== 'villaretiror@gmail.com') {
          // If we are here, role is checked or allowed. Let's inform the Master Host.
          try {
            fetch('/api/master-cron?action=notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'cohost_action',
                cohost: user?.email,
                property: updated.title,
                action: 'Edición de detalles de Villa (Backend Unified Sync)'
              })
            });
          } catch (e) { console.warn("Action Notify Error:", e); }
      }
      
      // Eliminar variantes basura para mantener limpieza de tráfico y evitar errores de Schema Cache
      const junkFields = ['isOffline', 'isoffline', 'reviews_count', 'blockedDates'];
      junkFields.forEach(f => delete payload[f]);

      // Unificar nombres JSONB: Mantenemos calendarSync (PascalCase citado en DB) y blockeddates (lowercase en DB)
      payload.calendarSync = updated.calendarSync || [];
      payload.blockeddates = updated.blockedDates || [];

      // Aseguramos que los objetos JSONB se mantengan intactos
      const jsonFields = ['fees', 'policies', 'seasonal_prices', 'offers', 'reviews_list', 'calendarSync', 'blockeddates'];
      jsonFields.forEach(field => {
        if (!payload[field]) payload[field] = (updated as any)[field] || (['fees', 'policies'].includes(field) ? {} : []);
      });

      const { error: updateError } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', updated.id);

      if (updateError) {
        let msg = `Error técnico: ${updateError.message}`;
        
        // Manejo amigable de errores de esquema (Master Prompt Requirement)
        if (updateError.code === 'PGRST204') {
          msg = "⚠️ Desconexión de Esquema: La columna 'reviews_count' no existe aún. Por favor, ejecuta el script ADD_MISSING_COLUMNS.sql en Supabase.";
        } else if (updateError.message.includes('column') && updateError.message.includes('not found')) {
          msg = `Falta una columna en la base de datos: ${updateError.message.split('"')[1]}. Ejecuta la migración de SQL.`;
        }

        console.error("Supabase Save Details:", updateError);
        showToast(msg);
        setIsSaving(false);
        return;
      }

      showToast("¡Sincronización Completa con Supabase! ✅");
      const updatedProperties = properties.map((p: Property) => p.id === updated.id ? updated : p);
      onUpdateProperties(updatedProperties);
      setIsEditing(null);
    } catch (err: any) {
      console.error("Fatal Editor Error:", err);
      showToast("Error crítico al procesar los datos de la propiedad.");
    } finally {
      setIsSaving(false);
    }
  };


  const handleImport = async (url: string) => {
    setShowImportModal(false);
    const hostId = user?.id;
    if (!hostId) return;

    try {
      const importedData = await importPropertyFromUrl(url);
      const { data: dbItem, error } = await supabase.from('properties').insert({
        host_id: hostId,
        title: importedData.title || 'Nueva Propiedad',
        subtitle: importedData.subtitle || 'Boutique Stay',
        address: importedData.address || '',
        description: importedData.description || '',
        price: importedData.price || 150,
        email: user.email?.toLowerCase(),
        location: 'Isabela, PR',
        images: importedData.images || [],
        amenities: importedData.amenities || [],
        guests: 4,
        isOffline: false,
        blockedDates: [],
        calendarSync: [],
        policies: {
          checkInTime: '4:00 PM',
          checkOutTime: '11:00 AM',
          guests: 4,
          wifiPass: '',
          accessCode: ''
        },
        offers: [],
        reviews_list: []
      }).select().single();

      if (error || !dbItem) throw error || new Error("Fallo al crear en DB");

      const newProperty: Property = {
        ...dbItem,
        id: String(dbItem.id),
        subtitle: 'Importada de plataforma',
        rating: importedData.rating || 4.5,
        reviews_count: (importedData as any).reviews_count || 10,
        bedrooms: 2,
        beds: 2,
        baths: 1,
        fees: { cleaningShort: 50, cleaningMedium: 75, cleaningLong: 100, petFee: 30, securityDeposit: 100 },
        host: { name: user?.name || 'Host', image: user?.avatar || '', yearsHosting: 1, badges: [] }
      };

      onUpdateProperties([...properties, newProperty]);
      setIsEditing(newProperty.id);
      showToast('Importada con éxito ✨');
    } catch (e) {
      console.error("Import error:", e);
      showToast("Error al importar. Intenta manualmente.");
    }
  };

  // Check if an offer is expired
  const isOfferActive = (offer: Offer) => {
    return new Date(offer.expiresAt) > new Date();
  };

  const handleSmartImport = async (data: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('properties').insert(data);
      if (error) throw error;
      showToast("¡Propiedad importada con éxito! 🔱");
      fetchData();
      setShowSmartValidation(null);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- REVIEW MANAGEMENT ---
  const handleUpdateReviewStats = async (propertyId: string, newRating: number, newCount: number) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const updatedProp = { 
      ...property, 
      rating: newRating, 
      reviews_count: newCount 
    };
    
    // Autoguardar en Supabase
    handleSaveProperty(updatedProp);
  };

  const handleAddManualReview = async (propertyId: string, review: Review) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const updatedProp: Property = { 
      ...property, 
      reviews_list: [review, ...(property.reviews_list || [])] 
    };
    
    // Autoguardar en Supabase
    handleSaveProperty(updatedProp);
  };

  // --- RENDERERS ---

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const renderToday = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-32"
    >
      {/* Salty Morning Briefing Slot */}
      <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Sparkles strokeWidth={1} className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10">Salty Morning Briefing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <button
              onClick={async () => {
                const res = await fetch('/api/master-cron?action=notify&ask=cleanup');
                const data = await res.json();
                alert(`Master Sync: ${JSON.stringify(data)}`);
              }}
              className="ml-auto bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
              title="Sincronización Maestra (Audit)"
            >
              <span className="material-icons text-[14px]">sync_lock</span>
            </button>
          </div>
          <h2 className="text-2xl md:text-4xl font-serif font-black italic tracking-tighter mb-4 leading-[1.1] max-w-2xl">
            "{nextCheckins.length > 0 
              ? `Salty informa: ${nextCheckins.length} check-ins estratégicos hoy. Todo listo para la excelencia.` 
              : "La brisa del noroeste augura un día de 5 estrellas. Paz y rentabilidad en balance."}"
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-4 group/item">
              <div className="bg-white/10 p-2.5 rounded-2xl group-hover/item:bg-primary/20 transition-colors"><Calendar className="w-4 h-4 text-primary-light" /></div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Check-ins</p>
                <p className="text-sm font-bold">{nextCheckins.filter(b => b.check_in === new Date().toISOString().split('T')[0]).length} Llegadas hoy</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group/item">
              <div className="bg-white/10 p-2.5 rounded-2xl group-hover/item:bg-yellow-400/20 transition-colors"><Zap className="w-4 h-4 text-yellow-400" /></div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Cabo Rojo Live</p>
                <p className="text-sm font-bold">29°C Despejado</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group/item">
              <div className="bg-white/10 p-2.5 rounded-2xl group-hover/item:bg-red-400/20 transition-colors"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Sistema Salty</p>
                <p className="text-sm font-bold">{urgentAlerts.filter(a => a.status === 'new').length > 0 ? `${urgentAlerts.filter(a => a.status === 'new').length} Pendientes` : 'Operativo ✓'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-between items-center mb-2 px-2">
        <h2 className="text-3xl font-serif font-black italic tracking-tighter text-text-main">Bitácora del Día</h2>
        <div className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-green-100 shadow-sm">
          <CheckCircle2 strokeWidth={2.5} className="w-3.5 h-3.5" />
          Villas Listas
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <NotificationInbox
          leads={leads.filter((l: any) => l.status === 'new')}
          alerts={urgentAlerts.filter((a: any) => a.status === 'new')}
          pendingPayments={pendingPayments}
          onResolve={handleResolveNotification}
        />
      </motion.div>

      {/* Panel de Check-ins (Filtro Temporal) */}
      <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12">
          <Key strokeWidth={1} className="w-24 h-24 text-primary" />
        </div>
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h3 className="font-serif font-black italic text-xl tracking-tighter text-text-main flex items-center gap-2.5">
            <Calendar strokeWidth={1.5} className="w-5 h-5 text-primary" />
            Check-ins Estratégicos
          </h3>
          <div className="flex items-center gap-3">
            {pendingPayments.filter(p => {
              if (!p.created_at) return false;
              const age = Date.now() - new Date(p.created_at).getTime();
              return age > 3 * 60 * 60 * 1000;
            }).length > 0 && (
                <span className="bg-red-50 text-red-600 text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-tight border border-red-100 animate-pulse">
                  {pendingPayments.filter(p => {
                    if (!p.created_at) return false;
                    const age = Date.now() - new Date(p.created_at).getTime();
                    return age > 3 * 60 * 60 * 1000;
                  }).length} Expirando
                </span>
              )}
            <span className="bg-sand/50 text-[10px] font-medium text-text-light px-4 py-1.5 rounded-full uppercase tracking-widest border border-gray-100 shadow-sm">Próximos 3 Días</span>
          </div>
        </div>

        <div className="space-y-4">
          {nextCheckins.length > 0 ? (
            nextCheckins.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-soft-sm transition-all cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center text-text-light text-xs font-black border border-white shadow-sm overflow-hidden">
                    {booking.profiles?.avatar ? (
                      <img src={booking.profiles.avatar} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      booking.profiles?.full_name?.charAt(0) || 'H'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-text-main group-hover:text-primary transition-colors">{booking.profiles?.full_name || 'Huésped'}</h4>
                      <div className="flex gap-1">
                        {(booking.profiles?.tags || []).slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full bg-sand border border-black/5 text-text-light tracking-tighter">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[9px] font-medium uppercase text-text-light tracking-[0.2em] mt-0.5">{booking.check_in ? formatDateLong(booking.check_in) : '---'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-sm font-serif font-black italic text-green-600 mb-0.5 tracking-tight">${booking.total_price}</p>
                    <div className="flex flex-wrap justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {getSourceBadge(booking.source)}
                      <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${booking.status === 'Paid' || booking.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {booking.status === 'Paid' || booking.status === 'confirmed' ? 'PAGADO' : 'PENDIENTE'}
                      </span>
                      <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${booking.contract_signed ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {booking.contract_signed ? 'FIRMANTE ✓' : 'SIN FIRMA'}
                      </span>
                    </div>
                  </div>
                  {/* Send instructions button if within 24h or manual */}
                  <button
                    onClick={() => !booking.instructions_sent_at && handleSendAccessEmail(booking)}
                    disabled={!!booking.instructions_sent_at}
                    className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-95 ${booking.instructions_sent_at ? 'bg-gray-50 text-gray-300' : 'bg-primary text-white hover:bg-primary-dark'}`}
                    title={booking.instructions_sent_at ? "Instrucciones ya enviadas" : "Enviar Instrucciones de Acceso via Email"}
                  >
                    {booking.instructions_sent_at ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-300">
              <span className="material-icons text-3xl opacity-20 block mb-2">event_available</span>
              <p className="text-[9px] uppercase font-black tracking-widest leading-none">Todo bajo control</p>
            </div>
          )}
        </div>
      </motion.div>
      <motion.div variants={itemVariants}>
        <SavingsInsights bookings={realBookings as any} />
      </motion.div>

      {/* Quick Summary Dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
        <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-soft relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <Wallet strokeWidth={1} className="w-20 h-20" />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 mb-2 relative z-10">Ingresos del Mes</p>
          <div className="flex items-baseline gap-1 relative z-10">
            <span className="text-sm font-medium opacity-50">$</span>
            <p className="text-3xl font-serif font-black italic tracking-tighter">{monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <span className="text-sm font-medium opacity-50">.{(monthlyRevenue % 1).toFixed(2).substring(2)}</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft group">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-light mb-2">Ingresos Totales</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-text-light">$</span>
            <p className="text-3xl font-serif font-black italic tracking-tighter text-text-main group-hover:text-primary transition-colors">{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <span className="text-sm font-medium text-text-light">.{(totalRevenue % 1).toFixed(2).substring(2)}</span>
          </div>
        </div>
      </motion.div>

      {
        pendingPayments.filter((p: any) => p.payment_method === 'ath_movil').length > 0 && (
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex items-center justify-between cursor-pointer shadow-sm shadow-orange-100/50"
            onClick={() => setShowSmartValidation(pendingPayments.filter((p: any) => p.payment_method === 'ath_movil')[0])}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-900 leading-tight">Tienes {pendingPayments.filter((p: any) => p.payment_method === 'ath_movil').length} pago(s) ATH Móvil por confirmar</p>
                <p className="text-[11px] font-medium text-orange-600/80 mt-0.5">Valida el recibo para liberar el calendario automático.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-400" />
          </motion.div>
        )
      }

      {/* Ingresos Históricos (Bar Chart) */}
      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft">
        <h3 className="text-sm font-bold text-text-main mb-4">Ingresos Históricos</h3>
        <div className="flex items-end gap-2 h-32">
          {propertyPerformance.chartData?.map((data: any, i: number) => {
            const maxVal = Math.max(...propertyPerformance.chartData.map((d: any) => d.val), 1);
            const height = (data.val / maxVal) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative flex items-end justify-center h-full bg-gray-50 rounded-t-md overflow-hidden">
                  <div
                    className="w-full bg-primary transition-all duration-500 rounded-t-sm group-hover:bg-black"
                    style={{ height: `${height}%` }}
                  ></div>
                  {/* Tooltip on hover */}
                  <div className="absolute top-0 opacity-0 group-hover:opacity-100 text-[8px] font-black text-xs text-text-main -translate-y-4 transition-opacity bg-white px-1 rounded shadow-sm">
                    ${data.val}
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-light">{data.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rendimiento por Propiedad */}
      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft">
        <h3 className="text-sm font-bold text-text-main mb-4">Rendimiento por Propiedad</h3>
        <div className="space-y-3">
          {Object.entries(propertyPerformance.performance || {}).map(([title, amount], idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-text-main flex items-center gap-2">
                <span className="material-icons text-primary text-sm">home</span>
                {title}
              </span>
              <span className="text-sm font-black text-green-600">${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          {Object.keys(propertyPerformance.performance || {}).length === 0 && (
            <p className="text-xs text-gray-400 text-center uppercase tracking-widest font-bold py-2">No hay datos suficientes</p>
          )}
        </div>
      </div>

      {/* Cleaning Status Selector */}
      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-text-main">Estatus de Limpieza</h3>
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${cleaningStatus === 'ready' ? 'bg-green-100 text-green-700' : cleaningStatus === 'progress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {cleaningStatus === 'ready' ? 'Lista' : cleaningStatus === 'progress' ? 'En curso' : 'Pendiente'}
          </span>
        </div>
        <div className="flex gap-2">
          {['dirty', 'progress', 'ready'].map((s: any) => (
            <button
              key={s}
              onClick={() => setCleaningStatus(s as any)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${cleaningStatus === s ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
            >
              {s === 'dirty' ? 'Sucia' : s === 'progress' ? 'Limp' : 'Ok'}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation Cards: Real Real-Time Data */}
      {
        realBookings.length > 0 ? (
          realBookings.map((booking: any) => (
            <article key={booking.id} className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-gray-100 relative overflow-hidden mb-6 group">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/5 text-primary px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border border-primary/10">
                    Reserva {booking.status}
                  </div>
                  {/* CANCELLATION SNAP BADGE */}
                  {booking.applied_policy && (
                    <div className="group/snap relative">
                      <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1 cursor-help">
                        <span className="material-icons text-[10px]">gavel</span>
                        {booking.applied_policy.type}
                      </div>
                      {/* Tooltip on Hover */}
                      <div className="absolute top-full left-0 mt-2 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 opacity-0 group-hover/snap:opacity-100 pointer-events-none transition-opacity">
                        <p className="text-[10px] font-black uppercase text-blue-500 mb-1 tracking-widest pb-1 border-b border-blue-50">Snap de Política Legal</p>
                        <p className="text-[11px] font-medium text-text-main leading-relaxed">
                          {booking.applied_policy.snapshot}
                        </p>
                        <p className="text-[9px] text-text-light mt-2 italic">Aceptado el: {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-text-light">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-widest">In: {booking.check_in}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden border-[6px] border-white shadow-float relative flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                  <img src={booking.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="Guest" className="w-full h-full object-cover" />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white shadow-sm"></div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl md:text-3xl font-serif font-black italic tracking-tighter text-text-main leading-tight truncate">
                    {booking.profiles?.full_name || 'Huésped'}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xl font-serif font-black italic text-primary tracking-tight">${booking.total_price}</span>
                    <span className="bg-sand/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-text-light">{booking.status}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between border border-gray-100 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-sm overflow-hidden">
                    <img src={booking.properties?.images?.[0] || 'https://placehold.co/150'} className="w-full h-full object-cover rounded-lg" alt="Prop" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-main">{booking.properties?.title || 'Villa'}</h4>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-text-light mt-1">ID: {booking.id.slice(0, 8)}</p>
                  </div>
                </div>
                <Home strokeWidth={1.5} className="w-5 h-5 text-primary/30" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => {
                    const propertyName = booking.properties?.title || 'nuestra propiedad';
                    const guestName = (booking.profiles?.full_name || 'Huésped').split(' ')[0];
                    const msg = `¡Hola ${guestName}! 👋\n\nBienvenido a ${propertyName}. Estamos muy felices de recibirte en nuestro refugio tropical.\n\nPronto te enviaremos las instrucciones detalladas de llegada (código de acceso y ubicación exacta). Si necesitas ayuda con algo antes de tu llegada, no dudes en escribirnos.\n\n¡Disfruta tu estancia!\n\nVilla Retiro & Pirata Team.`;
                    setWelcomeMessage(msg);
                    setShowWelcomeModal(true);
                  }}
                  className="bg-black hover:bg-gray-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95"
                >
                  <Sparkles className="w-4 h-4" /> Bienvenida
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="bg-white border border-gray-100 text-text-main font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all hover:bg-gray-50 active:scale-95 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" /> Chat
                </button>
              </div>

              {booking.status === 'cancelled' && (
                <div className="mt-4 mb-6 p-5 bg-red-50 rounded-[2rem] border border-red-100/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-icons text-red-500 text-sm">payments</span>
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Liquidación por Cancelación</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 p-3 rounded-xl border border-red-50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Reembolsado (Huésped)</p>
                      <p className="text-sm font-black text-red-600">${booking.refund_amount_calculated || 0}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-xl border border-red-50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Retenido (Total)</p>
                      <p className="text-sm font-black text-slate-800">${booking.retained_amount_calculated || 0}</p>
                    </div>
                  </div>
                  
                  {/* Desglose Interno para el Host */}
                  <div className="mt-3 pt-3 border-t border-red-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter">Limpieza Protegida</p>
                      <p className="text-[11px] font-bold text-red-700">${booking.cleaning_fee_at_booking || 0}</p>
                    </div>
                    <div className="flex flex-col text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Margen / Penalidad</p>
                      <p className="text-[11px] font-bold text-slate-700">${Math.max(0, (booking.retained_amount_calculated || 0) - (booking.cleaning_fee_at_booking || 0))}</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-red-400 italic mt-3 text-center">
                    * Procentaje aplicado sobre el total bruto (All-Inclusive).
                  </p>
                </div>
              )}

              <div className="mt-4 mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                <span className="material-icons text-blue-500 text-base">savings</span>
                <div>
                  <p className="text-[10px] text-blue-800 font-black uppercase tracking-wider">Ahorro Directo</p>
                  <p className="text-[10px] text-blue-700 font-medium leading-tight mt-0.5">
                    Al ser reserva directa, has ahorrado aprox. <span className="font-bold">${(booking.total_price * 0.15).toFixed(2)}</span> en comisiones de plataformas externas (15%).
                  </p>
                </div>
              </div>

              {booking.status === 'emergency_support' && (
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
                    if (!error) {
                      showToast("Emeriencia Resuelta ✨");
                      fetchData();
                    }
                  }}
                  className="w-full mb-3 bg-red-600 text-white font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all"
                >
                  <span className="material-icons text-sm">check_circle</span> Resolver Emergencia
                </button>
              )}

              <button
                onClick={() => {
                  const msg = getHostInstructionMessage({
                    guestName: booking.profiles?.full_name || 'Huésped',
                    propertyName: booking.properties?.title || 'Villa',
                    accessCode: "C-" + booking.id.slice(-4),
                    googleMapsLink: "https://maps.google.com/?q=Villa+Retiro+R"
                  });
                  const link = generateWhatsAppLink(booking.profiles?.phone || HOST_PHONE, msg);
                  window.open(link, '_blank');
                }}
                className="w-full bg-[#25D366] text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4 brightness-0 invert" alt="WA" />
                Enviar Instrucciones
              </button>
            </article>
          ))
        ) : (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-gray-200">
            <span className="material-icons text-4xl text-gray-200 mb-2">hotel</span>
            <p className="text-xs font-bold text-gray-400">Sin check-ins para hoy</p>
          </div>
        )
      }
    </motion.div >
  );

  const renderLeads = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-black/95 p-6 rounded-[2rem] text-white shadow-soft relative overflow-hidden">
        <span className="material-icons absolute -bottom-4 -right-4 text-7xl opacity-5">database</span>
        <h3 className="text-xl font-serif font-bold mb-2">Base CRM con IA</h3>
        <p className="text-[11px] font-medium opacity-60 leading-relaxed mb-6">
          Salty está analizando el comportamiento de los clientes y asignando etiquetas inteligentes para tu marketing proactivo.
        </p>
        <div className="flex gap-2">
          <button onClick={() => showToast("Exportando CSV...")} className="flex-1 bg-white text-black font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
            <span className="material-icons text-sm">file_download</span> Exportar
          </button>
          <button onClick={() => showToast("Abriendo WhatsApp Web CRM...")} className="flex-1 bg-[#25D366] text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
            <span className="material-icons text-sm">chat</span> Blast WA
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-text-main text-sm">Inteligencia de Huéspedes</h3>
          <span className="bg-gray-100 text-[10px] font-black text-text-light px-2 py-0.5 rounded-full">{leads.length} Perfiles</span>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center text-text-light">
            <span className="material-icons text-4xl opacity-10 mb-2">group_off</span>
            <p className="text-xs font-bold">Sin registros aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leads.map((lead: any, i: number) => {
              return (
                <div key={i} className="p-5 hover:bg-gray-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sand text-secondary flex items-center justify-center font-bold text-sm shadow-sm border border-white">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-text-main leading-tight">{lead.name}</p>
                        <div className="flex gap-1">
                          {(lead.tags || []).map((tag: string) => (
                            <span 
                              key={tag}
                              className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                                tag === 'VIP' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                tag === 'Web Directa' ? 'bg-green-100 text-green-700 border-green-200' :
                                tag === 'Pet Friendly' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                tag === 'Remote Worker' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                'bg-blue-100 text-blue-700 border-blue-200'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                          {(!lead.tags || lead.tags.length === 0) && (
                            <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">Nuevo Lead</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-primary mt-0.5 opacity-70">{lead.email}</p>
                      {lead.message && (
                        <p className="text-[10px] text-text-light mt-1 italic line-clamp-1 opacity-60">Salty Note: "{lead.message}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAddTag('lead', lead.id, lead.tags || [])} 
                      className="text-gray-300 hover:text-primary p-2 hover:bg-primary/5 rounded-full transition-all"
                      title="Añadir Etiqueta"
                    >
                      <span className="material-icons text-lg">local_offer</span>
                    </button>
                    <button onClick={() => showToast(`Iniciando contacto con ${lead.name}`)} className="text-gray-300 group-hover:text-primary p-2 hover:bg-primary/5 rounded-full transition-all">
                      <span className="material-icons text-lg">contact_email</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-12 animate-fade-in pb-32">
      {/* Banner de Prestigio Premium */}
      <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-125 duration-700">
           <ShieldCheck strokeWidth={1} className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
               <Star className="w-5 h-5 text-primary fill-primary" />
            </div>
            <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/5">Prestige & Authority Hub</span>
          </div>
          <h2 className="text-4xl font-serif font-black italic tracking-tighter mb-4 leading-none">Tu Legado de Excelencia</h2>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed italic">
            "La reputación es la moneda del anfitrión." — Centraliza tus testimonios de Airbnb y Booking para elevar la confianza del próximo huésped.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {properties.map((p: Property) => (
          <ReviewManager
            key={p.id}
            property={p}
            onAddReview={handleAddManualReview}
            onUpdateStats={handleUpdateReviewStats}
          />
        ))}
      </div>
    </div>
  );

  const renderGuidebook = () => (
    <ExperienceManager guideData={guideData} />
  );

  const renderSettings = () => (
    <SiteSettingsManager />
  );

  const renderListings = () => (
    <div className="space-y-8 animate-slide-up pb-12">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-3xl font-serif font-black italic tracking-tighter text-text-main">Villas de Autor</h2>
        <div className="flex gap-4">
            <button
            onClick={() => setActiveTab('availability')}
            className="bg-white text-black border border-gray-100 rounded-full px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-soft hover:bg-black hover:text-white transition-all flex items-center gap-2.5 active:scale-95 group"
          >
            <RefreshCcw strokeWidth={2} className="w-3.5 h-3.5 text-[#FF7F3F] group-hover:scale-110 transition-transform" /> Gestionar Calendarios
          </button>
          <button className="bg-black text-white rounded-full p-3 w-12 h-12 flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-primary">
            <Plus strokeWidth={2} className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map((p: Property) => {
          const activeOffersCount = p.offers?.filter(isOfferActive).length || 0;

          return (
            <div key={p.id} className="bg-white rounded-[2.5rem] p-6 shadow-soft flex gap-6 border border-gray-100 group hover:border-black/5 hover:translate-y-[-4px] transition-all duration-500">
              <div className="w-32 h-32 rounded-[1.8rem] overflow-hidden flex-shrink-0 relative shadow-soft-sm group-hover:shadow-soft transition-all">
                <img src={p.images?.[0] || 'https://placehold.co/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Listing" />
                <div className="absolute top-2 right-2 bg-white/90 text-black text-[8px] font-black px-2 py-1 rounded-lg backdrop-blur-md uppercase shadow-sm">
                  ★ {p.rating || '5.0'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="font-serif font-black italic text-xl text-text-main leading-none tracking-tighter group-hover:text-primary transition-colors">{p.title}</h3>
                  <div className="flex items-center gap-2 mt-3">
                    {activeOffersCount > 0 && (
                      <span className="bg-primary text-white text-[8px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                        <Tag strokeWidth={2} className="w-3 h-3" /> {activeOffersCount} Promo
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-light opacity-60">{p.location}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl font-serif font-black italic text-text-main tracking-tighter">${p.price}</span>
                    <span className="text-text-light text-[8px] font-black uppercase tracking-widest ml-1 opacity-40">/noche</span>
                  </div>
                  {/* 🛡️ ROLE-BASED ACCESS: Only host/admin can edit listings */}
                  {(user?.role === 'host' || user?.role === 'admin' || user?.email === 'villaretiror@gmail.com') ? (
                    <button
                      onClick={() => setIsEditing(p.id)}
                      className="bg-gray-50 text-text-main font-bold text-[9px] uppercase tracking-[0.2em] px-6 py-3 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      Gestionar
                    </button>
                  ) : (
                    <span className="bg-gray-50 text-text-light/60 font-bold text-[9px] uppercase tracking-[0.2em] px-6 py-3 rounded-2xl border border-gray-100 cursor-not-allowed select-none">
                      Solo Vista
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
  const renderPayments = () => {
    const totalPendingVal = pendingPayments.reduce((acc, p: any) => acc + (Number(p.total_price) || 0), 0);
    
    return (
      <div className="space-y-10 animate-fade-in pb-32">
        {/* Header Específico de Pagos (Payment Hub) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-orange-50/80 p-6 rounded-[2.5rem] border border-orange-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CreditCard className="w-16 h-16 text-orange-600" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-700/60 mb-2">Conciliación Manual</p>
            <h3 className="text-xl font-serif font-black italic text-orange-900 tracking-tighter mb-1">ATH Móvil</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <p className="text-[10px] font-bold text-orange-900/60 uppercase">{pendingPayments.filter(p => p.payment_method === 'ath_movil').length} Pendientes</p>
            </div>
          </div>

          <div className="bg-blue-50/80 p-6 rounded-[2.5rem] border border-blue-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-icons text-6xl text-blue-600">payments</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-700/60 mb-2">Pasarela Activa</p>
            <h3 className="text-xl font-serif font-black italic text-blue-900 tracking-tighter mb-1">PayPal Hub</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <p className="text-[10px] font-bold text-blue-900/60 uppercase">En Verificación</p>
            </div>
          </div>

          <div className="bg-black p-6 rounded-[2.5rem] text-white relative overflow-hidden group border border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-16 h-16 text-primary" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Automatización (Stripe)</p>
            <h3 className="text-xl font-serif font-black italic text-white tracking-tighter mb-1 flex items-center gap-2">
               Stripe Pay <span className="text-[8px] bg-primary px-2 py-0.5 rounded-full not-italic tracking-widest uppercase">Próximamente</span>
            </h3>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mt-1 italic">Cero Intervención Manual</p>
          </div>
        </div>

        {/* Resumen de Liquidez en Vuelo */}
        {totalPendingVal > 0 && (
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-gray-100 flex justify-between items-center px-8 shadow-soft-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Dinero en Proceso de Validación</p>
            </div>
            <p className="text-xl font-serif font-black italic text-text-main tracking-tighter">${totalPendingVal.toLocaleString()}</p>
          </div>
        )}

        {pendingPayments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pendingPayments.map((payment: any) => (
              <div key={payment.id} className="bg-white rounded-[3rem] p-8 shadow-soft border border-gray-100 group hover:border-orange-100 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-float overflow-hidden flex-shrink-0">
                    <img src={payment.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-black italic text-xl text-text-main leading-tight tracking-tight truncate">{payment.profiles?.full_name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-lg font-serif font-bold text-green-600 tracking-tight">${payment.total_price}</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-text-light opacity-40">• {payment.properties?.title}</span>
                    </div>
                  </div>
                  <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100 shadow-sm">Audit</div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <p className="text-[10px] font-black uppercase text-text-light tracking-[0.3em]">Comprobante Digital</p>
                    <span className="text-[9px] font-medium text-text-light opacity-50 uppercase tracking-widest">{payment.payment_method?.replace('_', ' ')}</span>
                  </div>
                  <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-gray-100 bg-gray-50 group/img shadow-inner ring-1 ring-black/5">
                    <img src={payment.payment_proof_url} alt="Proof" className="w-full h-full object-contain p-2 group-hover/img:scale-105 transition-transform duration-700" />
                    <a
                      href={payment.payment_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 backdrop-blur-md"
                    >
                      <span className="material-icons text-white text-3xl mb-2">zoom_out_map</span>
                      <span className="text-white text-[9px] font-black uppercase tracking-[0.3em] border-t border-white/20 pt-2">Ver Pantalla Completa</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <button
                    onClick={() => handleRejectPayment(payment.id)}
                    className="py-5 rounded-2xl border border-gray-100 text-red-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Rechazar
                  </button>
                  <button
                    onClick={() => handleApprovePayment(payment.id)}
                    className="py-5 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-gray-800 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Confirmar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/50 rounded-[4rem] p-24 text-center border-2 border-dashed border-gray-200 backdrop-blur-sm group">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
               <span className="material-icons text-4xl text-gray-400 group-hover:text-primary transition-colors">verified_user</span>
            </div>
            <h4 className="text-xl font-serif font-black italic text-text-main mb-2">Liquidez Conciliada</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-light opacity-50">No hay pagos pendientes de validación</p>
          </div>
        )}
      </div>
    );
  };

  const renderConversion = () => (
    <div className="space-y-12 animate-fade-in pb-32">
      <div className="bg-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-3xl font-serif font-black italic tracking-tighter text-white leading-none">Conversion Optimizer</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Psicología de venta y señales de confianza 🔱</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
             <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
             </div>
             <div>
                <p className="text-[8px] font-black uppercase text-gray-500">Confianza del Huésped</p>
                <p className="text-xs font-bold text-white tracking-tight">Nivel: Muy Alto</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {properties.map((p: any) => (
          <PropertyConversionCard key={p.id} p={p} onSave={handleSaveProperty} />
        ))}
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-8 animate-slide-up pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-serif font-black italic tracking-tighter text-text-main leading-tight mb-2">Equipe de Élite</h2>
          <p className="text-[10px] font-bold text-text-light uppercase tracking-[0.3em]">Gestión de protocolos y colaboradores</p>
        </div>
        <button 
          onClick={() => setActiveTab('help')}
          className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all font-black text-[10px] uppercase tracking-widest group shadow-xl"
        >
          <HelpCircle className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
          Ver Manual de Protocolo
        </button>
      </div>

      <div className="space-y-12">
        {properties.map(prop => (
          <div key={prop.id} className="space-y-4">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <h3 className="font-serif font-bold text-xl tracking-tight">{prop.title}</h3>
            </div>
            <CohostManager 
              propertyId={prop.id} 
              propertyName={prop.title} 
              onShowToast={showToast} 
            />
          </div>
        ))}

        {properties.length === 0 && (
          <div className="py-20 text-center text-gray-400 font-serif italic flex flex-col items-center">
            <span className="material-icons text-5xl opacity-30 mb-4">home_work</span>
            No hay villas registradas para gestionar el equipo.
          </div>
        )}
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="space-y-12 animate-slide-up pb-24 max-w-4xl mx-auto pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm print:hidden">
        <div>
          <h2 className="text-4xl font-serif font-black italic tracking-tighter text-text-main leading-tight">Manual de Protocolo</h2>
          <p className="text-[11px] font-bold text-text-light uppercase tracking-[0.4em] mt-2">Refugios de Paz • Estándares de Excelencia Salty</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
             onClick={() => setActiveTab('team')}
             className="px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest"
          >
             Regresar al Equipo
          </button>
          <button 
            onClick={() => window.print()}
            className="p-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all group shadow-xl"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="space-y-12 print:block">
        {/* Intro */}
        <section className="bg-gradient-to-br from-[#111] to-black text-white p-14 rounded-[4rem] relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Anchor className="w-64 h-64" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="w-12 h-1 bg-primary mb-8" />
            <h3 className="text-5xl font-serif font-black italic mb-8 leading-[1.1]">Nuestra Filosofía</h3>
            <p className="text-xl font-medium leading-relaxed text-gray-400">
              "En Villa Retiro, no solo gestionamos propiedades; somos los guardianes de la calma y el descanso. Cada gesto, cada detalle, es un compromiso con la <span className="text-white italic">excelencia absoluta</span>."
            </p>
          </div>
        </section>

        {/* Protocol Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { 
              icon: <ShieldCheck className="text-primary w-10 h-10" />, 
              title: "01. Seguridad Primero", 
              desc: "Verificación obligatoria de cerraduras inteligentes, cámaras perimetrales y alarmas. Asegurar que el código del huésped es funcional 2 horas antes de su llegada."
            },
            { 
              icon: <Sparkles className="text-blue-400 w-10 h-10" />, 
              title: "02. Limpieza de Élite", 
              desc: "Estandarización tipo Yacht: sábanas tensadas, toallas blancas impecables y aroma cítrico suave en cada rincón. Cero rastro de estancias anteriores."
            },
            { 
              icon: <Waves className="text-cyan-400 w-10 h-10" />, 
              title: "03. Mantenimiento Preventivo", 
              desc: "Prueba de grifos, aire acondicionado a 23°C y verificación de gas/electricidad. Reportar cualquier mínima falla antes de que el huésped la note."
            },
            { 
              icon: <Heart className="text-red-400 w-10 h-10" />, 
              title: "04. El 'Salty Effect'", 
              desc: "Hielo en la nevera, kit de café local visible y control de clima personalizado. La villa debe sentirse viva, fresca y acogedora desde el primer segundo."
            }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-soft relative group transition-all"
            >
              <div className="mb-8 p-4 bg-gray-50 rounded-3xl w-fit group-hover:bg-primary/5 transition-colors">{item.icon}</div>
              <h4 className="text-2xl font-serif font-black mb-4 tracking-tighter">{item.title}</h4>
              <p className="text-[13px] text-text-light font-medium leading-relaxed opacity-80">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Final Instruction */}
        <section className="bg-sand p-14 rounded-[4rem] border border-primary/20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <h4 className="text-3xl font-serif font-black italic mb-6">La Regla De Oro</h4>
            <div className="h-0.5 w-20 bg-primary/30 mx-auto mb-8" />
            <p className="text-xs font-black text-primary uppercase tracking-[0.5em] mb-6">"Si no es perfecto, no está listo."</p>
            <div className="flex items-center justify-center gap-3 text-[11px] font-black uppercase text-text-light bg-white/50 w-fit mx-auto px-6 py-3 rounded-full border border-white/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Todas las tareas deben marcarse en el Dashboard para activar el 'Estado Élite'.
            </div>
          </div>
        </section>
      </div>
    </div>
  );


  const editingProperty = properties.find(p => p.id === isEditing);

  return (
    <div className="bg-sand min-h-screen pb-24 font-display text-text-main">
      {isLoading && <LoadingSpinner />}
      <CustomToast />
      <HostNavbar
        activeTab={activeTab}
        onNavigateHome={() => onNavigate && onNavigate('home')}
      />

      <main className="px-6 mt-4">
        {activeTab === 'today' && renderToday()}
        {activeTab === 'listings' && renderListings()}
        {activeTab === 'guidebook' && renderGuidebook()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'reviews' && renderReviews()}
        {activeTab === 'leads' && renderLeads()}
        {activeTab === 'menu' && <HostMenu properties={properties} onNavigate={onNavigate} onGoToProtocol={() => setActiveTab('help')} onGoToTeam={() => setActiveTab('team')} />}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'analytics' && (
          <AnalysisDashboard
            bookings={realBookings as any}
            expenses={globalExpenses}
            properties={properties}
            selectedPropertyId={analyticsFilter}
            onFilterChange={setAnalyticsFilter}
          />
        )}
        {activeTab === 'conversion' && renderConversion()}
        {activeTab === 'messages' && <HostMessageCenter />}
        {activeTab === 'insights' && <InsightViewer />}
        {activeTab === 'availability' && <HostAvailabilityManager properties={properties} />}
        {activeTab === 'help' && renderHelp()}
      </main>

      {/* Overlays */}
      <HostChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} message={welcomeMessage} />
      {showSmartValidation && (
        <SmartValidationModal 
          data={showSmartValidation} 
          onConfirm={handleSmartImport} 
          onClose={() => setShowSmartValidation(null)}
        />
      )}
      {editingProperty && <PropertyEditorModal property={editingProperty as any} realBookings={realBookings as any} onSave={handleSaveProperty as any} onCancel={() => setIsEditing(null)} isSaving={isSaving} onRefresh={fetchData} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}

      {/* Host Navigation */}
      <nav className="fixed bottom-0 w-full bg-black border-t border-white/10 pb-safe pt-3 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-40 overflow-x-auto no-scrollbar print:hidden">
        <div className="flex justify-around items-center px-4 pb-2 min-w-max gap-8 sm:gap-0 sm:min-w-0 sm:w-full">
          <button
            onClick={() => setActiveTab('today')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'today' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'today' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Zap strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'today' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Hoy</span>
          </button>
          
          <button
            onClick={() => setActiveTab('listings')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'listings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'listings' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Home strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'listings' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Villas</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'analytics' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'analytics' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <BarChart3 strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'analytics' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Inteligencia</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'insights' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'insights' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Sparkles strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'insights' ? 'scale-110' : ''} text-primary`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Insights</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('availability')} 
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'availability' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'availability' && (
              <motion.div layoutId="hostNavPill" className="absolute inset-0 bg-white/10 rounded-xl" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
            )}
            <Calendar strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'availability' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Calendario</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'payments' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'payments' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10">
              <CreditCard strokeWidth={1.5} className={`w-5 h-5 ${activeTab === 'payments' ? 'scale-110' : ''}`} />
              {pendingPayments.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black animate-pulse">
                  {pendingPayments.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Pagos</span>
          </button>


          <button
            onClick={() => setActiveTab('settings')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'settings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Sparkles strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'settings' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Config</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'leads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'leads' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Users strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'leads' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">CRM</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'reviews' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'reviews' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Star strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'reviews' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Reseñas</span>
          </button>

          <button
            onClick={() => setActiveTab('guidebook')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'guidebook' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'guidebook' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Map strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'guidebook' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Guía</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'messages' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'messages' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10">
              <MessageCircle strokeWidth={1.5} className={`w-5 h-5 ${activeTab === 'messages' ? 'scale-110' : ''}`} />
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black">6</span>
            </div>
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Chats</span>
          </button>

          <button
            onClick={() => setActiveTab('conversion')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'conversion' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'conversion' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Sparkles strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'conversion' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Optimizar</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'team' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'team' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Users strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'team' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Equipo</span>
          </button>


          <button
            onClick={() => setActiveTab('menu')}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-1 transition-all ${activeTab === 'menu' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {activeTab === 'menu' && (
              <motion.div
                layoutId="hostNavPill"
                className="absolute inset-0 bg-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Menu strokeWidth={1.5} className={`w-5 h-5 relative z-10 ${activeTab === 'menu' ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Más</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default HostDashboard;