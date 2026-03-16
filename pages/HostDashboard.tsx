import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Database, Tables } from '../supabase_types';
import { HOST_PHONE } from '../constants';
import ExperienceManager from '../components/host/ExperienceManager';
import SiteSettingsManager from '../components/host/SiteSettingsManager';
import InsightViewer from '../components/host/InsightViewer';

type BookingRow = Tables<'bookings'>;
type ExpenseRow = Tables<'property_expenses'>;
type LeadRow = Tables<'leads'>;
type AlertRow = Tables<'urgent_alerts'>;
type CohostRow = Tables<'property_cohosts'>;
type TaskRow = Tables<'operation_tasks'>;

// Joined types for nested queries
type BookingWithDetails = BookingRow & {
  profiles: { full_name: string | null; avatar_url: string | null; phone: string | null; email?: string | null; tags: string[] | null } | null;
  properties: { title: string; images: string[] | null; policies?: any } | null;
};
import SectionErrorBoundary from '../components/SectionErrorBoundary';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Zap,
  BarChart3,
  CreditCard,
  Home,
  Users,
  Star,
  Map,
  MessageCircle,
  Menu,
  CheckCircle2,
  Calendar,
  Key,
  Wallet,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Info,
  Clock,
  Send,
  LayoutDashboard,
  User as UserIcon,
  AlertTriangle,
  Bell,
  Check,
  Trash2,
  Download,
  Plus,
  Tag,
  CheckCheck,
  DollarSign,
  GripHorizontal,
  RefreshCcw,
  UserX,
  ClipboardCheck,
  ListPlus
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- CUSTOM TOAST ---
let globalToastCallback: (msg: string) => void = () => { };
export const showToast = (msg: string) => globalToastCallback(msg);

const CustomToast = () => {
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });
  useEffect(() => {
    globalToastCallback = (msg: string) => {
      setToast({ msg, visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };
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
      id: Date.now().toString(),
      author: newReview.author,
      text: newReview.text,
      rating: newReview.rating || 5,
      date: newReview.date || 'Reciente',
      source: (newReview.source as 'Airbnb' | 'Booking.com' | 'Google') || 'Airbnb',
      avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 60)}`
    };
    onAddReview(property.id, review);
    setIsAdding(false);
    setNewReview({ rating: 5, source: 'Airbnb', date: 'Mayo 2024' });
  };

  const saveStats = () => {
    onUpdateStats(property.id, stats.rating, stats.count);
    showToast("Puntuación actualizada correctamente.");
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-text-main">{property.title}</h3>
        <div className="flex items-center gap-1 text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg text-sm">
          <span className="material-icons text-sm">star</span>
          {property.rating}
        </div>
      </div>

      {/* Quick Stats Editor */}
      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
        <p className="text-xs font-bold text-gray-500 mb-3 uppercase">Sincronización Manual</p>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">Puntuación General</label>
            <input
              type="number"
              step="0.01"
              value={stats.rating}
              onChange={e => setStats({ ...stats, rating: parseFloat(e.target.value) })}
              className="w-full p-2 rounded-lg border text-sm font-bold"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">Total Reseñas</label>
            <input
              type="number"
              value={stats.count}
              onChange={e => setStats({ ...stats, count: parseInt(e.target.value) })}
              className="w-full p-2 rounded-lg border text-sm font-bold"
            />
          </div>
          <button onClick={saveStats} className="bg-black text-white p-2 rounded-lg shadow-sm">
            <span className="material-icons text-sm">save</span>
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm">Reseñas Destacadas ({property.reviews_list?.length || 0})</h4>
          <button onClick={() => setIsAdding(!isAdding)} className="text-primary text-xs font-bold underline">
            {isAdding ? 'Cancelar' : '+ Agregar Manualmente'}
          </button>
        </div>

        {isAdding && (
          <div className="bg-sand p-4 rounded-xl border border-orange-200 animate-fade-in">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input placeholder="Nombre Autor" className="p-2 rounded-lg text-sm" onChange={e => setNewReview({ ...newReview, author: e.target.value })} />
              <input placeholder="Fecha (ej. Mayo 2024)" className="p-2 rounded-lg text-sm" onChange={e => setNewReview({ ...newReview, date: e.target.value })} />
              <select className="p-2 rounded-lg text-sm bg-white" onChange={e => setNewReview({ ...newReview, source: e.target.value as any })}>
                <option value="Airbnb">Airbnb</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Google">Google</option>
              </select>
              <select className="p-2 rounded-lg text-sm bg-white" onChange={e => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}>
                <option value={5}>5 Estrellas</option>
                <option value={4}>4 Estrellas</option>
              </select>
            </div>
            <textarea
              placeholder="Copia y pega aquí el texto de la reseña..."
              className="w-full p-3 rounded-lg text-sm mb-3 h-24"
              onChange={e => setNewReview({ ...newReview, text: e.target.value })}
            />
            <button onClick={saveReview} className="w-full bg-primary text-white font-bold py-2 rounded-lg text-sm">Guardar Reseña</button>
          </div>
        )}

        {property.reviews_list?.map(review => (
          <div key={review.id} className="text-sm border-b border-gray-100 pb-3 last:border-0">
            <div className="flex justify-between mb-1">
              <span className="font-bold">{review.author}</span>
              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{review.source}</span>
            </div>
            <p className="text-text-light text-xs line-clamp-2">"{review.text}"</p>
          </div>
        ))}
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
          <h2 className="font-bold text-xl">Importar Anuncio</h2>
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
    const data = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const monthStr = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

      const monBookings = filteredBookings.filter(b => {
        if (!b.check_in) return false;
        const checkIn = new Date(b.check_in);
        return checkIn.getMonth() === month && checkIn.getFullYear() === year && (b.status === 'confirmed' || b.status === 'completed');
      });

      const monExpenses = filteredExpenses.filter(e => {
        if (!e.created_at) return false;
        const createdAt = new Date(e.created_at);
        return createdAt.getMonth() === month && createdAt.getFullYear() === year;
      });

      const webIncome = monBookings
        .filter(b => !b.source?.toLowerCase().includes('airbnb') && !b.source?.toLowerCase().includes('ota'))
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

      const otaIncome = monBookings
        .filter(b => b.source?.toLowerCase().includes('airbnb') || b.source?.toLowerCase().includes('ota'))
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

      const adjustedWeb = viewMode === 'net' ? webIncome * 0.97 : webIncome;
      const adjustedOTA = viewMode === 'net' ? otaIncome * 0.85 : otaIncome;

      const income = adjustedWeb + adjustedOTA;
      const expense = monExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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

      const bookedDays = monBookings.reduce((sum, b) => {
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
        Web: adjustedWeb,
        OTA: adjustedOTA,
        Gastos: expense,
        Profit: income - expense,
        Ocupación: occupancy
      });
    }
    return data;
  }, [filteredBookings, filteredExpenses, creationDate, viewMode]);

  const currentMonthData = stats[stats.length - 1];
  const margin = currentMonthData.Total > 0
    ? Math.round((currentMonthData.Profit / currentMonthData.Total) * 100)
    : 0;

  const handleExport = () => {
    const propName = selectedPropertyId === 'all' ? 'Todas_Villas' : selectedProperty?.title || 'Villa';
    const month = currentMonthData.name;
    const year = new Date().getFullYear();
    const oldTitle = document.title;
    document.title = `Reporte_${propName.replace(/\s+/g, '_')}_${month}_${year}`;
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:p-0 mb-10">
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
          <span className="material-icons text-sm group-hover:rotate-12 transition-transform">picture_as_pdf</span>
          Exportar
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-serif font-black text-xl italic flex items-center gap-2">
              <span className="material-icons text-blue-500">trending_up</span> Rendimiento {viewMode === 'net' ? 'Neto' : 'Bruto'}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Visualizando ingresos {viewMode === 'net' ? 'después de comisiones (est.)' : 'totales antes de tasas'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#CBB28A]"></div><span className="text-[10px] font-black uppercase text-gray-400">Web</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div><span className="text-[10px] font-black uppercase text-gray-400">OTAs</span></div>
            </div>
            <button
              onClick={() => setShowOrigin(!showOrigin)}
              className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${showOrigin ? 'bg-black text-white' : 'bg-white text-gray-400'}`}
            >
              {showOrigin ? 'Ocultar Origen' : 'Ver Desglose'}
            </button>
          </div>
        </div>

        <div className="h-64 w-full" style={{ minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <AreaChart data={stats}>
              <defs>
                <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CBB28A" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#CBB28A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOTA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
              <Tooltip
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '1rem', fontSize: '10px' }}
                itemStyle={{ fontWeight: 900, textTransform: 'uppercase' }}
              />
              {showOrigin ? (
                <>
                  <Area type="monotone" dataKey="Web" stackId="1" stroke="#CBB28A" fillOpacity={1} fill="url(#colorWeb)" strokeWidth={3} />
                  <Area type="monotone" dataKey="OTA" stackId="1" stroke="#60A5FA" fillOpacity={1} fill="url(#colorOTA)" strokeWidth={3} />
                </>
              ) : (
                <Area type="monotone" dataKey="Total" stroke="#CBB28A" fillOpacity={1} fill="url(#colorWeb)" strokeWidth={3} />
              )}
              <Area type="monotone" dataKey="Gastos" stroke="#F87171" fillOpacity={0.1} fill="#F87171" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-secondary text-white p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-icons text-8xl">donut_large</span>
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Margen de Beneficio ({currentMonthData.name})</h4>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-10" />
                <circle
                  cx="48" cy="48" r="40" stroke="#CBB28A" strokeWidth="8" fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * margin) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-xl font-black">{margin}%</span>
            </div>
            <div>
              <p className="text-2xl font-black">${currentMonthData.Total.toLocaleString()}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Utilidad {viewMode === 'net' ? 'Neta Est.' : 'Neta'}</p>
              <div className="mt-2 p-2 bg-white/10 rounded-xl border border-white/10">
                <p className="text-[8px] font-bold uppercase tracking-tighter text-primary-light leading-tight">
                  {currentMonthData.Profit < 0
                    ? `Faltan $${Math.abs(currentMonthData.Profit).toLocaleString()} para cubrir costos operativos.`
                    : `Punto de equilibrio superado. Cada nueva reserva suma directamente a tu utilidad neta.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-text-light mb-4">Tasa de Ocupación</h4>
          <div className="h-32 w-full" style={{ minHeight: '150px' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
              <LineChart data={stats}>
                <XAxis dataKey="name" hide />
                <Tooltip />
                <Line type="monotone" dataKey="Ocupación" stroke="#10B981" strokeWidth={4} dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
            <span className="text-[10px] font-black uppercase text-gray-400">Promedio Ocupación</span>
            <span className="text-sm font-black text-green-600">
              {Math.round(stats.reduce((acc, s) => acc + s.Ocupación, 0) / stats.length)}%
            </span>
          </div>
        </div>
      </div>

      <div className="hidden print:block space-y-8 bg-white text-black p-10 font-sans">
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div>
            <h1 className="text-4xl font-serif font-bold italic">Villa Retiro & Pirata Stays</h1>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Reporte Mensual de Operaciones</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{currentMonthData.name} {new Date().getFullYear()}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Generado el {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="border border-black p-4 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase mb-1">Total Ingresos</p>
            <p className="text-2xl font-black">${currentMonthData.Total.toLocaleString()}</p>
          </div>
          <div className="border border-black p-4 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase mb-1">Total Gastos</p>
            <p className="text-2xl font-black text-red-600">-${currentMonthData.Gastos.toLocaleString()}</p>
          </div>
          <div className="border border-black p-4 rounded-xl text-center bg-gray-50">
            <p className="text-[10px] font-bold uppercase mb-1">Profit Neto</p>
            <p className="text-2xl font-black text-green-700">${currentMonthData.Profit.toLocaleString()}</p>
          </div>
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

  // --- Checklist State ---
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const fetchCohosts = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('property_cohosts').select('*').eq('property_id', propertyId);
    if (data) setCohosts(data);
    setIsLoading(false);
  };

  const fetchTasks = async () => {
    setIsTaskLoading(true);
    const { data } = await supabase.from('operation_tasks').select('*').eq('property_id', propertyId).order('created_at', { ascending: true });
    if (data) setTasks(data);
    setIsTaskLoading(false);
  };

  useEffect(() => {
    fetchCohosts();
    fetchTasks();
  }, [propertyId]);

  const handleInviteCohost = async () => {
    const trimmedEmail = newCohostEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      onShowToast("Escribe un email válido 📧");
      return;
    }

    // Check for duplicates
    if (cohosts.some(c => c.email.toLowerCase() === trimmedEmail)) {
      onShowToast("Ese email ya está invitado o activo para esta villa. 👥");
      return;
    }

    const token = crypto.randomUUID();

    const { error } = await supabase.from('property_cohosts').insert({
      property_id: propertyId,
      email: trimmedEmail,
      status: 'pending',
      invitation_token: token
    });

    if (!error) {
      // 📩 Connect with Resend for professional invitation
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cohost_invitation',
            email: trimmedEmail,
            propertyName: propertyName,
            propertyId: propertyId,
            token: token
          })
        });
      } catch (e) {
        console.error("Email sync error:", e);
      }

      onShowToast("Invitación enviada ✨");
      setNewCohostEmail('');
      fetchCohosts();
    } else {
      onShowToast("Ya existe una invitación para este email.");
    }
  };

  const handleRemoveCohost = async (id: string) => {
    const { error } = await supabase.from('property_cohosts').delete().eq('id', id);
    if (!error) {
      onShowToast("Co-anfitrión eliminado 🗑️");
      fetchCohosts();
    }
  };

  const handleResendInvitation = async (ch: CohostRow) => {
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cohost_invitation',
          email: ch.email,
          propertyName: propertyName,
          propertyId: propertyId,
          token: ch.invitation_token
        })
      });
      onShowToast("Invitación reenviada ✨");
    } catch (e) {
      console.error("Resend sync error:", e);
      onShowToast("Error al reenviar la invitación.");
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean | null) => {
    const isCompleted = !!currentStatus;
    const { error } = await supabase.from('operation_tasks').update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null
    }).eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: !isCompleted } : t));
      if (!isCompleted) onShowToast("¡Tarea completada! ✅");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDesc.trim()) return;
    const { error } = await supabase.from('operation_tasks').insert({
      property_id: propertyId,
      description: newTaskDesc.trim()
    });

    if (!error) {
      setNewTaskDesc('');
      fetchTasks();
      onShowToast("Tarea añadida 📋");
    }
  };

  const handleResetTasks = async () => {
    if (!confirm("¿Deseas reiniciar el protocolo de alistamiento? Todas las tareas volverán a estar pendientes.")) return;

    const { error } = await supabase
      .from('operation_tasks')
      .update({ is_completed: false, completed_at: null })
      .eq('property_id', propertyId);

    if (!error) {
      setTasks(tasks.map(t => ({ ...t, is_completed: false })));
      onShowToast("Protocolo reiniciado 🧹");
    }
  };

  const completedTasksCount = tasks.filter(t => t.is_completed).length;
  const isAllCompleted = tasks.length > 0 && completedTasksCount === tasks.length;

  if (showEliteView) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl text-center animate-scale-up relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100 shadow-soft-sm">
            <CheckCircle2 strokeWidth={1} className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-text-main mb-4">¡Propiedad en Estado Élite! 🌟</h3>
          <p className="text-sm font-medium text-text-light leading-relaxed mb-8">
            Has completado satisfactoriamente el checklist de operaciones para <strong>{propertyName}</strong>.
            El sistema ha certificado que la villa cumple con todos los estándares de calidad.
            <br /><br />
            El Host principal ha sido notificado y la propiedad figura ahora como <span className="text-green-600 font-bold">'Lista para Check-in'</span>.
            ¡Buen trabajo asegurando una experiencia de 5 estrellas!
          </p>
          <button
            onClick={() => setShowEliteView(false)}
            className="w-full py-4 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            Finalizar Operación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-serif font-black italic text-lg mb-1 flex items-center gap-2 tracking-tighter">
          <Users strokeWidth={1.5} className="w-5 h-5 text-primary" />
          Gestión de Co-anfitriones
        </h3>
        <p className="text-xs text-text-light mb-4">Invita a otros usuarios a gestionar esta villa contigo. Podrán ver el calendario y las reservas en tiempo real.</p>

        <div className="space-y-3 mb-6">
          {cohosts.map((ch, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-soft">
              <div>
                <p className="text-sm font-bold text-text-main">{ch.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {ch.status === 'active' ? 'Activo' : 'Pendiente'}
                  </span>
                  {ch.status === 'pending' && (
                    <button onClick={() => handleResendInvitation(ch)} className="text-[9px] font-bold text-gray-400 hover:text-black flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 transition-all active:scale-95">
                      <RefreshCcw strokeWidth={2} className="w-3 h-3" /> REENVIAR
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => handleRemoveCohost(ch.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                <Trash2 strokeWidth={1.5} className="w-4 h-4" />
              </button>
            </div>
          ))}
          {cohosts.length === 0 && !isLoading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
              <UserX strokeWidth={1} className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">Sin co-anfitriones registrados</p>
            </div>
          )}
          {isLoading && <div className="text-center py-6 animate-pulse text-[10px] font-bold text-gray-300 uppercase italic">Sincronizando...</div>}
        </div>

        <div className="bg-sand/40 p-5 rounded-3xl border border-white/50 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light mb-1 ml-1 leading-none">Añadir Email de Invitado</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={newCohostEmail}
                onChange={e => setNewCohostEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <button
                onClick={handleInviteCohost}
                disabled={!newCohostEmail}
                className="bg-black text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Invitar
              </button>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 px-1 font-medium italic">Nota: El usuario debe iniciar sesión con este email para activar su acceso.</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
        {isAllCompleted && (
          <div className="absolute top-0 right-0 p-4 bg-green-500 text-white rounded-bl-2xl shadow-lg z-10 animate-fade-in">
            <button onClick={() => setShowEliteView(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Sparkles strokeWidth={1.5} className="w-4 h-4 text-yellow-300" /> Certificar
            </button>
          </div>
        )}

        <h3 className="font-serif font-black italic text-lg mb-1 flex items-center gap-2 tracking-tighter">
          <ClipboardCheck strokeWidth={1.5} className="w-5 h-5 text-secondary" />
          Protocolo Operativo
        </h3>
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-text-light">Asegura la calidad del servicio marcando las tareas operativas completadas.</p>
          <button
            onClick={handleResetTasks}
            className="text-[9px] font-black uppercase text-red-500 border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
          >
            Reiniciar Protocolo
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Progreso Operativo</span>
            <span className="text-[10px] font-black text-primary">{tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggleTask(task.id, !!task.is_completed)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${task.is_completed ? 'bg-green-50/30 border-green-100 opacity-60' : 'bg-white border-gray-100 hover:border-primary/30'}`}
            >
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.is_completed ? 'bg-black border-black shadow-lg animate-scale-up' : 'bg-white border-gray-200'}`}>
                {task.is_completed && <Check strokeWidth={3} className="text-white w-3 h-3" />}
              </div>
              <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400' : 'text-text-main'}`}>{task.description}</span>
            </div>
          ))}
          {tasks.length === 0 && !isTaskLoading && (
            <div className="text-center py-10 opacity-20 italic bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
              <ListPlus strokeWidth={1} className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p className="text-[9px] font-bold uppercase tracking-widest">Protocolo impecable</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={newTaskDesc}
            onChange={e => setNewTaskDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            placeholder="Nueva tarea (ej: Revisar Gas)"
            className="flex-1 p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-primary/20"
          />
          <button
            onClick={handleAddTask}
            className="bg-black text-white px-4 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <Plus strokeWidth={2} className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Editor = ({ property, bookings, onSave, onCancel, isSaving }: { property: Property, bookings: any[], onSave: (p: Property) => void, onCancel: () => void, isSaving: boolean }) => {
  const [form, setForm] = useState(property);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'photos' | 'calendar' | 'seasonal' | 'fees' | 'offers' | 'policies' | 'conversion' | 'emergency' | 'cohosts' | 'expenses'>('info');
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeValue, setNewFeeValue] = useState(0);

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      console.log("Supabase Upload Debug: Intentando subir a bucket 'property-images' el archivo", fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase Upload Detailed Error:", uploadError);
        throw new Error(`Error de Supabase: ${uploadError.message}`);
      }

      console.log("Supabase Upload Success:", uploadData);

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err: any) {
      console.error("Critical Upload Error:", err);
      showToast(`Error al subir imagen: ${err.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Offers state helpers
  const [newOfferText, setNewOfferText] = useState("");
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const [newOfferDate, setNewOfferDate] = useState(defaultDate.toISOString().slice(0, 10));

  // Calendar helpers
  const [calMonth, setCalMonth] = useState(new Date());

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [newSyncUrl, setNewSyncUrl] = useState('');
  const [newSyncPlatform, setNewSyncPlatform] = useState('Airbnb');

  // Emergency / Panic State
  const [panicStart, setPanicStart] = useState("");
  const [panicEnd, setPanicEnd] = useState("");
  const [conflictSummary, setConflictSummary] = useState<any[]>([]);

  const checkPanicConflicts = () => {
    if (!panicStart || !panicEnd) return;
    const start = new Date(panicStart);
    const end = new Date(panicEnd);

    const conflicts = bookings.filter(b => {
      if (b.property_id !== form.id) return false;
      const bStart = new Date(b.check_in);
      const bEnd = new Date(b.check_out);
      return (start < bEnd && end > bStart);
    });

    setConflictSummary(conflicts);
  };

  const handleAddOffer = () => {
    if (!newOfferText.trim() || !newOfferDate) return;
    const newOffer: Offer = {
      text: newOfferText,
      expiresAt: new Date(newOfferDate).toISOString()
    };
    setForm({ ...form, offers: [...(form.offers || []), newOffer] });
    setNewOfferText("");
  };

  const handleRemoveOffer = (index: number) => {
    setForm({ ...form, offers: (form.offers || []).filter((_, i) => i !== index) });
  };

  // --- Expenses Logic ---
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isExpLoading, setIsExpLoading] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState(0);
  const [newExpCat, setNewExpCat] = useState<'maintenance' | 'cleaning' | 'tax' | 'utilities' | 'other'>('maintenance');

  const fetchExpenses = async () => {
    setIsExpLoading(true);
    const { data } = await supabase.from('property_expenses').select('*').eq('property_id', property.id).order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setIsExpLoading(false);
  };

  useEffect(() => {
    if (activeSection === 'expenses') fetchExpenses();
  }, [activeSection, property.id]);

  const handleAddExpense = async () => {
    if (!newExpDesc || newExpAmount <= 0) return;
    const { error } = await supabase.from('property_expenses').insert({
      property_id: property.id,
      description: newExpDesc,
      amount: newExpAmount,
      category: newExpCat || 'other'
    });

    if (!error) {
      showToast("Gasto registrado ✨");
      setNewExpDesc('');
      setNewExpAmount(0);
      fetchExpenses();
    }
  };

  const totalIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bookings
      .filter(b => {
        const bDate = new Date(b.check_in);
        return b.property_id === property.id &&
          b.status === 'confirmed' &&
          bDate.getMonth() === currentMonth &&
          bDate.getFullYear() === currentYear;
      })
      .reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
  }, [bookings, property.id]);

  const totalExpensesSum = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter(exp => {
        const expDate = new Date(exp.created_at);
        return expDate.getMonth() === currentMonth &&
          expDate.getFullYear() === currentYear;
      })
      .reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const netProfit = totalIncome - totalExpensesSum;
  const expenseRatio = totalIncome > 0 ? (totalExpensesSum / totalIncome) * 100 : 0;

  // Calendar Toggle Logic
  const toggleDateBlock = (dateStr: string) => {
    const isBlocked = form.blockedDates.includes(dateStr);
    let newBlocked;
    if (isBlocked) {
      newBlocked = form.blockedDates.filter((d: string) => d !== dateStr);
    } else {
      newBlocked = [...form.blockedDates, dateStr];
    }
    setForm({ ...form, blockedDates: newBlocked });
  };

  // Calendar Sync Logic
  const syncExternalCalendars = async (syncItems: CalendarSync[]) => {
    if (syncItems.length === 0) return;
    setIsSyncing(true);
    let gatheredEvents: string[] = [];

    try {
      // 1. Force Backend to Sync to DB instantly (bypasses node limits)
      try { await fetch('/api/calendar/import', { method: 'POST' }); } catch (err) { console.warn('Silently failed backend sync') }

      // 2. Refresh UI directly via client for instant feedback
      for (const sync of syncItems) {
        console.log(`Syncing ${sync.platform} from: ${sync.url}`);
        const icalData = await fetchICalData(sync.url);
        const events = parseICalData(icalData);
        gatheredEvents = [...gatheredEvents, ...events];
      }

      // Combinar fechas bloqueadas existentes con las nuevas de iCal
      const allUniqueDates = Array.from(new Set([...form.blockedDates, ...gatheredEvents]));

      const updatedForm: Property = {
        ...form,
        blockedDates: allUniqueDates,
        calendarSync: form.calendarSync.map(c => ({
          ...c,
          lastSynced: new Date().toISOString(),
          syncStatus: 'success' as const
        }))
      };

      setForm(updatedForm);
      onSave(updatedForm);
      showToast(`Éxito: ${gatheredEvents.length} fechas sincronizadas.`);
    } catch (e: any) {
      console.error("Calendar Sync Critical Error:", e);
      showToast(`Error de Sincronización: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSync = async () => {
    if (!newSyncUrl.trim()) return;
    const newSync: CalendarSync = {
      id: Date.now().toString(),
      platform: newSyncPlatform,
      url: newSyncUrl,
      lastSynced: new Date().toISOString(),
      syncStatus: 'success'
    };

    const updatedSyncList = [...(form.calendarSync || []), newSync];

    // Update local state first to show the item
    setForm({ ...form, calendarSync: updatedSyncList });
    setNewSyncUrl('');

    // Immediately trigger a fetch for the new list
    await syncExternalCalendars(updatedSyncList);
  };

  const handleRemoveSync = (id: string) => {
    setForm({ ...form, calendarSync: (form.calendarSync || []).filter((c: CalendarSync) => c.id !== id) });
  };

  const handleSyncRefresh = () => {
    syncExternalCalendars(form.calendarSync);
  };

  const renderCalendarEditor = () => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} />);

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      const isBlocked = form.blockedDates.includes(dateStr);
      // Simulación de detección de origen para el color
      const isExternal = isBlocked && i % 3 === 0;

      days.push(
        <button
          key={i}
          onClick={() => toggleDateBlock(dateStr)}
          className={`h-11 w-full rounded-xl text-xs font-bold transition-all relative ${isBlocked ? (isExternal ? 'bg-blue-600 text-white shadow-inner' : 'bg-gray-900 text-white shadow-md') : 'bg-gray-50 text-text-main hover:bg-gray-200 border border-gray-100'}`}
        >
          {i}
          {isBlocked && (
            <span className="absolute bottom-1 right-1 text-[8px] opacity-80 uppercase">B</span>
          )}
        </button>
      );
    }

    const platformIcons: any = {
      'Airbnb': 'travel_explore',
      'Booking': 'bed',
      'VRBO': 'house',
      'Other': 'link'
    };

    return (
      <div className="space-y-6">
        {/* Visual Calendar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCalMonth(new Date(year, month - 1))} className="p-1"><span className="material-icons">chevron_left</span></button>
            <span className="font-bold">{calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCalMonth(new Date(year, month + 1))} className="p-1"><span className="material-icons">chevron_right</span></button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d: string) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">{days}</div>
          <p className="text-xs text-center mt-4 text-gray-400">Toca para bloquear/desbloquear.</p>
        </div>

        {/* Calendar Sync Section */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span className="material-icons text-secondary">sync_alt</span> Sincronización
              </h3>
              <p className="text-xs text-text-light">Conectar calendarios externos (iCal).</p>
            </div>
            <button
              onClick={handleSyncRefresh}
              disabled={isSyncing}
              className="bg-gray-100 hover:bg-gray-200 text-text-main p-2 rounded-full transition-all disabled:opacity-50"
              title="Sincronizar Ahora"
            >
              <span className={`material-icons text-sm ${isSyncing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>

          {/* Import List */}
          <div className="space-y-3 mb-6">
            {form.calendarSync?.map((sync: CalendarSync) => (
              <div key={sync.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <span className="material-icons text-gray-500 text-sm">{platformIcons[sync.platform] || 'link'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{sync.platform}</p>
                    <p className="text-[10px] text-gray-400 truncate w-32 md:w-48">{sync.url}</p>
                    <p className="text-[9px] text-green-600 font-bold mt-0.5">
                      Última sinc: {new Date(sync.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleRemoveSync(sync.id)} className="text-gray-400 hover:text-red-500 p-2">
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
            ))}

            {(!form.calendarSync || form.calendarSync.length === 0) && (
              <p className="text-center text-xs text-gray-400 py-2">No hay calendarios conectados.</p>
            )}
          </div>

          {/* Add New Sync */}
          <div className="p-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-text-main mb-2">Importar nuevo calendario</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select
                  value={newSyncPlatform}
                  onChange={(e) => setNewSyncPlatform(e.target.value)}
                  className="p-2 rounded-lg border border-gray-200 text-xs bg-white focus:border-primary outline-none"
                >
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking">Booking.com</option>
                  <option value="VRBO">VRBO</option>
                  <option value="Other">Otro</option>
                </select>
                <input
                  type="text"
                  placeholder="Pega URL iCal aquí..."
                  value={newSyncUrl}
                  onChange={(e) => setNewSyncUrl(e.target.value)}
                  className="flex-1 p-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                />
              </div>
              <button
                onClick={handleAddSync}
                disabled={!newSyncUrl}
                className="w-full bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Conectar
              </button>
            </div>
          </div>

          {/* Export Link */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-text-main mb-2">Exportar tu calendario</p>
            <p className="text-[10px] text-gray-400 mb-2">Copia este enlace para Airbnb, Booking, etc.</p>
            <div className="flex gap-2 bg-gray-100 p-2 rounded-lg">
              <code className="text-[10px] text-gray-600 truncate flex-1 font-mono">
                https://www.villaretiror.com/api/calendar/export?id={form.id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://www.villaretiror.com/api/calendar/export?id=${form.id}`);
                  alert("Enlace copiado al portapapeles ✅");
                }}
                className="text-primary text-[10px] font-bold uppercase hover:underline"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmergencySection = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Offline Mode Switch */}
        <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">Modo Offline (Invisible)</h3>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">La villa no aparecerá en búsquedas</p>
            </div>
            <button
              onClick={() => setForm({ ...form, isOffline: !form.isOffline })}
              className={`w-14 h-7 rounded-full transition-all relative ${form.isOffline ? 'bg-red-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${form.isOffline ? 'right-1' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        {/* Panic Button Section */}
        <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-100 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-red-600 font-black text-lg flex items-center gap-2 mb-2 italic">
              <span className="material-icons">report_problem</span> BOTÓN DE PÁNICO
            </h3>
            <p className="text-red-700/70 text-xs font-bold mb-6">Bloqueo instantáneo por mantenimiento o emergencia climática.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-red-800 uppercase mb-1">Inicio Bloqueo</label>
                <input
                  type="date"
                  value={panicStart}
                  onChange={e => { setPanicStart(e.target.value); }}
                  className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs outline-none focus:ring-2 ring-red-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-red-800 uppercase mb-1">Fin Bloqueo</label>
                <input
                  type="date"
                  value={panicEnd}
                  onChange={e => { setPanicEnd(e.target.value); }}
                  className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs outline-none focus:ring-2 ring-red-300"
                />
              </div>
            </div>

            <button
              onClick={checkPanicConflicts}
              className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all text-xs tracking-widest uppercase"
            >
              Auditar Conflictos de Reservas
            </button>
          </div>
        </div>

        {/* Conflicts & Actions */}
        {conflictSummary.length > 0 && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <p className="text-orange-800 font-bold text-sm flex items-center gap-2">
                <span className="material-icons text-base">warning</span>
                Se detectaron {conflictSummary.length} reservas afectadas
              </p>
              <p className="text-orange-700/70 text-[10px] mt-1 italic">Debes contactar a estos huéspedes antes de confirmar el bloqueo.</p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {conflictSummary.map((b, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={b.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} className="w-8 h-8 rounded-full object-cover" alt="User" />
                    <div>
                      <p className="text-[11px] font-black text-text-main">{b.profiles?.full_name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{b.check_in} al {b.check_out}</p>
                    </div>
                  </div>
                  <a
                    href={generateWhatsAppLink(b.profiles?.phone || '17873560895', `¡Hola ${b.profiles?.full_name}! Lamentamos informarte que por una emergencia técnica/climática en Villa Retiro R debemos reprogramar tu estancia del ${b.check_in}. Por favor, contáctanos.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-500 text-white rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
                    title="Enviar WhatsApp de Alerta"
                  >
                    <span className="material-icons text-sm">whatsapp</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl border border-white/10">
              <p className="text-xs font-bold mb-4">¿Deseas proceder con el bloqueo masivo? (Esto no cancela las reservas, solo bloquea el calendario)</p>
              <button
                onClick={() => {
                  const datesToBlock = []; // Generate dates between panicStart and panicEnd
                  let curr = new Date(panicStart);
                  const end = new Date(panicEnd);
                  while (curr <= end) {
                    datesToBlock.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                  }
                  const newBlocked = Array.from(new Set([...form.blockedDates, ...datesToBlock]));
                  setForm({ ...form, blockedDates: newBlocked, isOffline: true });
                  showToast("Villa Bloqueada por Emergencia 🚨");
                  setConflictSummary([]);
                }}
                className="w-full bg-white text-black font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Confirmar Bloqueo y Poner Offline
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderSeasonalEditor = () => {
    const handleAddSeason = () => {
      const newSeason: SeasonalPrice = {
        id: Date.now().toString(),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: form.price + 50,
        label: 'Temporada Alta'
      };
      setForm({ ...form, seasonal_prices: [...(form.seasonal_prices || []), newSeason] });
    };

    const handleRemoveSeason = (id: string) => {
      setForm({ ...form, seasonal_prices: (form.seasonal_prices || []).filter(s => s.id !== id) });
    };

    const updateSeason = (id: string, updates: Partial<SeasonalPrice>) => {
      const updated = (form.seasonal_prices || []).map(s => s.id === id ? { ...s, ...updates } : s);
      setForm({ ...form, seasonal_prices: updated });
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-sand/30 p-4 rounded-2xl border border-orange-100">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="material-icons text-primary">event_note</span> Precios de Temporada
            </h3>
            <p className="text-[10px] text-text-light uppercase font-black tracking-widest mt-1">Configura tarifas especiales por fecha</p>
          </div>
          <button onClick={handleAddSeason} className="bg-black text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
            <span className="material-icons">add</span>
          </button>
        </div>

        <div className="space-y-4">
          {(form.seasonal_prices || []).map((season) => (
            <div key={season.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-soft relative group">
              <button
                onClick={() => handleRemoveSeason(season.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <span className="material-icons text-xs">close</span>
              </button>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Etiqueta</label>
                  <input
                    value={season.label}
                    onChange={e => updateSeason(season.id, { label: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold"
                    placeholder="Ej: Navidad"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Precio x Noche</label>
                  <input
                    type="number"
                    value={season.price}
                    onChange={e => updateSeason(season.id, { price: Number(e.target.value) })}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Desde</label>
                  <input
                    type="date"
                    value={season.startDate}
                    onChange={e => updateSeason(season.id, { startDate: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Hasta</label>
                  <input
                    type="date"
                    value={season.endDate}
                    onChange={e => updateSeason(season.id, { endDate: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          {(!form.seasonal_prices || form.seasonal_prices.length === 0) && (
            <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
              <span className="material-icons text-gray-200 text-5xl mb-2">sell</span>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No hay precios especiales configurados</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl p-6 shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-xl">Editar Propiedad</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-icons">close</span></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {['info', 'photos', 'calendar', 'seasonal', 'fees', 'offers', 'policies', 'conversion', 'emergency', 'cohosts', 'expenses'].map((section: any) => (
            <button
              key={section}
              onClick={() => setActiveSection(section as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${activeSection === section ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {section === 'emergency' ? '🚨 Panic Mode' : 
               section === 'seasonal' ? '🗓️ Precios' : 
               section === 'policies' ? '📋 Políticas' : 
               section === 'conversion' ? '🚀 Ventas' :
               section === 'cohosts' ? '👥 Co-hosts' : 
               section === 'expenses' ? '💸 Gastos' : section}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {activeSection === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Título de la Propiedad</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 border border-gray-100 rounded-xl font-bold text-lg bg-gray-50/50"
                  placeholder="Título"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Subtítulo / Eslogan</label>
                <input
                  value={form.subtitle || ''}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full p-3 border border-gray-100 rounded-xl text-sm bg-gray-50/50"
                  placeholder="Ej: Designer Villa · Estratégica & Íntima"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Descripción Detallada</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 border border-gray-100 rounded-xl h-32 text-sm bg-gray-50/50"
                  placeholder="Descripción"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Precio Actual ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full p-3 border border-gray-100 rounded-xl font-bold text-primary bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Precio Original (Tachado)</label>
                  <input
                    type="number"
                    value={form.original_price || ''}
                    onChange={e => setForm({ ...form, original_price: e.target.value ? Number(e.target.value) : null })}
                    className="w-full p-3 border border-gray-100 rounded-xl font-bold text-gray-400 bg-gray-50/50"
                    placeholder="Sin descuento"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Ubicación Corta (Display)</label>
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full p-3 border border-gray-100 rounded-xl text-sm bg-gray-50/50"
                  placeholder="Cabo Rojo, PR"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Dirección Completa (Privada)</label>
                <input
                  value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full p-3 border border-gray-100 rounded-xl text-sm bg-gray-50/50"
                  placeholder="Carr 307 Km..."
                />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2">
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Huéspedes</label>
                  <input type="number" value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })} className="w-full p-2 border border-gray-100 rounded-lg text-xs font-bold bg-gray-50/50" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Cuartos</label>
                  <input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: Number(e.target.value) })} className="w-full p-2 border border-gray-100 rounded-lg text-xs font-bold bg-gray-50/50" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Camas</label>
                  <input type="number" value={form.beds} onChange={e => setForm({ ...form, beds: Number(e.target.value) })} className="w-full p-2 border border-gray-100 rounded-lg text-xs font-bold bg-gray-50/50" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Baños</label>
                  <input type="number" value={form.baths} onChange={e => setForm({ ...form, baths: Number(e.target.value) })} className="w-full p-2 border border-gray-100 rounded-lg text-xs font-bold bg-gray-50/50" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'emergency' && renderEmergencySection()}

          {activeSection === 'calendar' && renderCalendarEditor()}

          {activeSection === 'seasonal' && renderSeasonalEditor()}

          {activeSection === 'cohosts' && (
            <SectionErrorBoundary sectionName="Gestión de Co-anfitriones">
              <CohostManager propertyId={form.id} propertyName={form.title} onShowToast={showToast} />
            </SectionErrorBoundary>
          )}

          {activeSection === 'photos' && (
            <div className="space-y-6 animate-slide-up">
              <div className={`bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200 text-center relative group ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                {!isUploading && (
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) return showToast("La imagen supera los 2MB permitidos.");
                        try {
                          const url = await uploadImage(file);
                          setForm({ ...form, images: [...form.images, url] });
                          showToast("Imagen subida con éxito.");
                        } catch (err) {
                          showToast("Error al subir a Supabase Storage.");
                          console.error(err);
                        }
                      }
                    }}
                  />
                )}
                <span className={`material-icons text-4xl mb-2 ${isUploading ? 'animate-spin text-primary' : 'text-gray-300 group-hover:text-primary transition-colors'}`}>
                  {isUploading ? 'sync' : 'add_a_photo'}
                </span>
                <p className="text-xs font-bold text-text-light uppercase tracking-widest">
                  {isUploading ? 'Subiendo archivo...' : 'Subir nueva fotografía (Máx 2MB)'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {form.images.map((img: string, i: number) => (
                  <div key={i} className="relative group rounded-3xl overflow-hidden shadow-soft border-2 border-transparent hover:border-primary transition-all cursor-move">
                    <img src={img} className="w-full h-32 object-cover" alt="Property" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm p-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-icons text-white text-sm">drag_indicator</span>
                      <button onClick={() => setForm({ ...form, images: form.images.filter((_: string, idx: number) => idx !== i) })}>
                        <span className="material-icons text-white text-sm hover:text-red-400">delete</span>
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase">#{i + 1}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-text-light font-bold uppercase tracking-widest bg-sand py-2 rounded-xl">Gestión de imágenes real conectada</p>
            </div>
          )}
          {activeSection === 'fees' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                  <span className="material-icons text-primary">payments</span>
                  Cargos y Comisiones (Fees)
                </h3>
                <p className="text-xs text-text-light mb-4">Gestiona los cargos fijos que se sumarán al total de la reserva.</p>

                <div className="space-y-4 mb-6 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Tarifa de Limpieza</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm text-gray-400">$</span>
                        <input
                          type="number"
                          value={form.cleaning_fee || 0}
                          onChange={e => setForm({ ...form, cleaning_fee: Number(e.target.value) })}
                          className="w-full pl-7 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Depósito de Seguridad</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm text-gray-400">$</span>
                        <input
                          type="number"
                          value={form.security_deposit || 0}
                          onChange={e => setForm({ ...form, security_deposit: Number(e.target.value) })}
                          className="w-full pl-7 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Service Fee ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        value={form.service_fee || 0}
                        onChange={e => setForm({ ...form, service_fee: Number(e.target.value) })}
                        className="w-full pl-7 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-4"></div>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-2">Otros Cargos Personalizados</p>

                  {Object.entries(form.fees || {})
                    .filter(([name]) => !['Limpieza', 'Service Fee', 'Security Deposit'].includes(name))
                    .map(([name, value], idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <span className="material-icons text-sm text-gray-400">label</span>
                          </div>
                          <span className="text-sm font-bold text-text-main">{name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-primary">${value}</span>
                          <button
                            onClick={() => {
                              const newFees = { ...form.fees };
                              delete newFees[name];
                              setForm({ ...form, fees: newFees });
                            }}
                            className="text-red-300 hover:text-red-500 transition-colors"
                          >
                            <span className="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="bg-sand/30 p-4 rounded-2xl space-y-3 border border-orange-100/50">
                  <p className="text-[10px] font-bold text-text-light uppercase tracking-widest flex items-center gap-1">
                    <span className="material-icons text-[12px]">add_circle</span> Añadir Cargo Extra
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeeName}
                      onChange={e => setNewFeeName(e.target.value)}
                      placeholder="Ej: Fee de Mascota"
                      className="flex-[2] p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 ring-primary/20"
                    />
                    <input
                      type="number"
                      value={newFeeValue || ''}
                      onChange={e => setNewFeeValue(Number(e.target.value))}
                      placeholder="$25"
                      className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 ring-primary/20"
                    />
                    <button
                      onClick={() => {
                        if (!newFeeName.trim()) return;
                        setForm({
                          ...form,
                          fees: {
                            ...form.fees,
                            [newFeeName]: newFeeValue
                          }
                        });
                        setNewFeeName('');
                        setNewFeeValue(0);
                      }}
                      className="bg-black text-white px-4 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                      <span className="material-icons text-sm">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'policies' && (
            <div className="space-y-6 animate-fade-in">
              {/* Cancellation Policy Dropdown */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                  <span className="material-icons text-blue-500">event_busy</span>
                  Política de Cancelación
                </h3>
                <p className="text-xs text-text-light mb-4">Selecciona la política que aplica a esta propiedad.</p>
                <select
                  value={form.policies.cancellationPolicy || 'moderate'}
                  onChange={e => {
                    const val = e.target.value as any;
                    setForm({ 
                      ...form, 
                      policies: { ...form.policies, cancellationPolicy: val },
                      cancellation_policy_type: val 
                    });
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="flexible">Flexible (Estándar Airbnb 24h)</option>
                  <option value="moderate">Moderada (Estándar Airbnb 5 días)</option>
                  <option value="firm">Firme (100% +30d, 50% 7-30d, 0% &lt;7d)</option>
                  <option value="strict">Estricta (50% hasta 7 días antes, luego 0%)</option>
                </select>
                {/* Policy Badge Preview */}
                <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-blue-500 text-sm">gavel</span>
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Resumen Legal del Contrato</p>
                  </div>
                  <p className="text-xs text-blue-600 leading-relaxed italic">
                    {form.policies.cancellationPolicy === 'flexible' && "Huéspedes reciben reembolso total si cancelan hasta 24h antes del check-in. Después, se retiene la 1ra noche."}
                    {form.policies.cancellationPolicy === 'moderate' && "Huéspedes reciben reembolso total si cancelan hasta 5 días antes del check-in. Después, se retiene 1ra noche + 50% del resto."}
                    {form.policies.cancellationPolicy === 'firm' && "Huéspedes reciben reembolso total si cancelan 30 días antes. Entre 7-30 días, reembolso del 50%. Menos de 7 días, sin reembolso."}
                    {form.policies.cancellationPolicy === 'strict' && "Huéspedes reciben reembolso del 50% si cancelan al menos 7 días antes. Menos de 7 días, sin reembolso (0%)."}
                  </p>
                  <p className="mt-2 text-[9px] font-bold text-blue-400 uppercase">* Los cargos de limpieza siempre se reembolsan si se cancela antes del check-in.</p>
                </div>
              </div>

              {/* House Rules Editor */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                  <span className="material-icons text-secondary">gavel</span>
                  Reglas de la Casa
                </h3>
                <p className="text-xs text-text-light mb-4">Añade o elimina reglas según necesites.</p>
                <div className="space-y-2 mb-4">
                  {(form.policies.houseRules || []).map((rule: string, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm text-text-main flex-1">{rule}</span>
                      <button
                        onClick={() => {
                          const updated = (form.policies.houseRules || []).filter((_: string, idx: number) => idx !== i);
                          setForm({ ...form, policies: { ...form.policies, houseRules: updated } });
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="new-rule-input"
                    type="text"
                    placeholder="Nueva regla..."
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setForm({ ...form, policies: { ...form.policies, houseRules: [...(form.policies.houseRules || []), input.value.trim()] } });
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-rule-input') as HTMLInputElement;
                      if (input?.value.trim()) {
                        setForm({ ...form, policies: { ...form.policies, houseRules: [...(form.policies.houseRules || []), input.value.trim()] } });
                        input.value = '';
                      }
                    }}
                    className="bg-black text-white px-4 rounded-xl text-xs font-bold"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Check-in / Check-out Time */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <span className="material-icons text-green-500">schedule</span>
                  Horarios de Acceso
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Check-in</label>
                    <select
                      value={form.policies.checkInTime}
                      onChange={e => setForm({ ...form, policies: { ...form.policies, checkInTime: e.target.value } })}
                      className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                    >
                      {['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Check-out</label>
                    <select
                      value={form.policies.checkOutTime}
                      onChange={e => setForm({ ...form, policies: { ...form.policies, checkOutTime: e.target.value } })}
                      className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                    >
                      {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Máximo de Huéspedes</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.policies.guests}
                    onChange={e => setForm({ ...form, policies: { ...form.policies, guests: parseInt(e.target.value) || 1 } })}
                    className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                  />
                </div>
              </div>

              {/* Access & Security Info */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <span className="material-icons text-orange-500">lock</span>
                  Información de Acceso y Seguridad
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nombre de Red WiFi</label>
                    <input
                      value={form.policies.wifiName}
                      onChange={e => setForm({ ...form, policies: { ...form.policies, wifiName: e.target.value } })}
                      className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                      placeholder="Ej: Starlink_Premium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Contraseña WiFi</label>
                    <input
                      value={form.policies.wifiPass}
                      onChange={e => setForm({ ...form, policies: { ...form.policies, wifiPass: e.target.value } })}
                      className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                      type="text"
                      placeholder="Contraseña de la red"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Código de Acceso (Lockbox)</label>
                    <input
                      value={form.policies.accessCode}
                      onChange={e => setForm({ ...form, policies: { ...form.policies, accessCode: e.target.value } })}
                      className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50"
                      placeholder="Ej: 1234 #"
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-orange-600 font-bold leading-relaxed italic">
                    Nota: Estos datos son privados y solo se mostrarán automáticamente al huésped una vez confirmada su reserva.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'offers' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  value={newOfferText}
                  onChange={e => setNewOfferText(e.target.value)}
                  placeholder="Nueva oferta (ej. 10% desc)"
                  className="flex-1 p-2 border rounded-lg"
                />
                <button onClick={handleAddOffer} className="bg-black text-white px-4 rounded-lg text-xs font-bold">Agregar</button>
              </div>
              <div className="space-y-2">
                {form.offers?.map((offer: Offer, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">{offer.text}</span>
                    <button onClick={() => handleRemoveOffer(i)} className="text-red-500"><span className="material-icons text-sm">delete</span></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'expenses' && (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                  <span className="material-icons text-red-500">analytics</span>
                  Gestión de Egresos
                </h3>
                <p className="text-xs text-text-light mb-6">Registra gastos de mantenimiento, limpieza o impuestos para calcular rentabilidad real.</p>

                <div className="space-y-4 mb-8 p-5 bg-sand/30 rounded-[1.5rem] border border-orange-100/50">
                  <p className="text-[10px] font-black uppercase text-text-light tracking-widest leading-none mb-1">Nuevo Gasto</p>
                  <input
                    value={newExpDesc}
                    onChange={e => setNewExpDesc(e.target.value)}
                    placeholder="Descripción (ej: Reparación AC)"
                    className="w-full p-3.5 bg-white border border-gray-100 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-primary/20"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={newExpAmount || ''}
                      onChange={e => setNewExpAmount(Number(e.target.value))}
                      placeholder="$ Monto"
                      className="p-3.5 bg-white border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-green-100"
                    />
                    <select
                      value={newExpCat}
                      onChange={e => setNewExpCat(e.target.value as any)}
                      className="p-3.5 bg-white border border-gray-100 rounded-xl text-sm font-bold outline-none"
                    >
                      <option value="maintenance">Mantenimiento</option>
                      <option value="cleaning">Limpieza</option>
                      <option value="tax">Impuestos</option>
                      <option value="utilities">Servicios</option>
                      <option value="other">Otros</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddExpense}
                    className="w-full bg-black text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
                  >
                    Registrar Egreso
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-text-light tracking-widest mb-2">Historial Reciente</p>
                  {expenses.map((exp: any) => (
                    <div key={exp.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-text-main">{exp.description}</p>
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{exp.category} • {new Date(exp.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-black text-red-500">-${exp.amount}</span>
                    </div>
                  ))}
                  {expenses.length === 0 && !isExpLoading && (
                    <div className="text-center py-10 opacity-30">
                      <span className="material-icons text-3xl mb-1">receipt_long</span>
                      <p className="text-[10px] font-black uppercase">Sin egresos registrados</p>
                    </div>
                  )}
                  {isExpLoading && (
                    <div className="text-center py-6 animate-pulse text-[10px] font-bold text-gray-300 uppercase italic">Cargando facturas...</div>
                  )}
                </div>

                {/* Task 2: Widget de Rentabilidad Neta */}
                <div className={`p-6 rounded-[2rem] border-2 mt-8 transition-all duration-500 ${netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light mb-1">Balance del Periodo</p>
                      <h4 className={`text-2xl font-black ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400">Balance de {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {netProfit >= 0 ? 'ROI Positivo' : 'Alerta de Margen'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-black/5">
                    <div>
                      <p className="text-[9px] font-black uppercase text-text-light tracking-tighter mb-0.5">Ingresos (Conf.)</p>
                      <p className="text-xs font-bold text-text-main">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-text-light tracking-tighter mb-0.5">Gastos Totales</p>
                      <p className="text-xs font-bold text-text-main">-${totalExpensesSum.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-white/50 p-4 rounded-2xl flex items-start gap-3">
                    <span className="material-icons text-sm mt-0.5 text-primary">psychology</span>
                    <p className="text-[11px] font-medium text-text-main leading-relaxed">
                      {netProfit > 1000 ? "Rendimiento Óptimo: La propiedad está superando el margen proyectado." :
                        netProfit >= 0 ? "Flujo Saludable: Se mantiene un rendimiento estable después de gastos operativos." :
                          `Atención: El costo operativo ha subido un ${expenseRatio.toFixed(0)}% este mes. Revisa los gastos de mantenimiento.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
          <button onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancelar</button>
          <button
            onClick={() => !isSaving && onSave(form)}
            disabled={isSaving}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-primary shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Sincronizando...
              </div>
            ) : "Guardar Cambios"}
          </button>
        </div>
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
                <p className="text-sm font-bold text-text-main line-clamp-1">{n.name || n.profiles?.full_name || 'Novedad'}</p>
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

const SmartValidationModal = ({ booking, onApprove, onReject, onClose }: { booking: any, onApprove: (id: string) => void, onReject: (id: string) => void, onClose: () => void }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-end md:items-center justify-center md:p-4 animate-fade-in print:hidden overflow-hidden">
      <motion.div
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (isMobile && info.offset.y > 100) onClose();
        }}
        initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white w-full max-w-4xl md:rounded-[3rem] rounded-t-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[92vh] md:h-[85vh] relative"
      >
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center z-50 bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>
        )}

        {/* Recibo */}
        <div className="md:w-1/2 w-full bg-gray-100 relative group overflow-hidden h-[35vh] md:h-full">
          <img
            src={booking.payment_proof_url || "https://placehold.co/600x800?text=Sin+Comprobante"}
            alt="Recibo"
            className="w-full h-full object-contain md:p-4 p-2 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute top-6 left-6 bg-orange-600 text-white text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2 z-10">
            <CreditCard className="w-4 h-4" />
            ATH Móvil
          </div>
        </div>

        {/* Datos */}
        <div className="md:w-1/2 w-full p-8 md:p-12 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="pt-2 md:pt-0">
            <div className="flex justify-between items-start mb-8 md:mb-10">
              <div>
                <h3 className="text-2xl md:text-3xl font-serif font-black italic text-text-main tracking-tighter">Validación Rápida</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-light mt-1 md:mt-2">Reserva #{booking.id.slice(0, 8)}</p>
              </div>
              <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-full transition-all active:scale-90 shadow-sm hidden md:block">
                <Check className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gray-50/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-soft-sm">
                  <p className="text-[8px] md:text-[9px] font-bold uppercase text-gray-400 mb-2 tracking-widest flex items-center gap-2">
                    <UserIcon className="w-3 h-3" /> Huésped
                  </p>
                  <p className="text-xs md:text-sm font-bold text-text-main truncate">{booking.profiles?.full_name}</p>
                </div>
                <div className="bg-gray-50/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-soft-sm">
                  <p className="text-[8px] md:text-[9px] font-bold uppercase text-gray-400 mb-2 tracking-widest flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Pago
                  </p>
                  <p className="text-lg md:text-xl font-serif font-black italic text-secondary tracking-tighter">${booking.total_price}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 flex items-center gap-4 md:gap-6 group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] md:rounded-[1.5rem] overflow-hidden shadow-soft group-hover:scale-105 transition-transform duration-500 shrink-0">
                  <img src={booking.properties?.images?.[0]} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[9px] font-bold uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-2">
                    <Home className="w-3 h-3" /> Propiedad
                  </p>
                  <p className="text-xs md:text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">{booking.properties?.title}</p>
                </div>
              </div>

              <div className="bg-blue-50/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-blue-100 flex items-start gap-4 md:gap-5">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500 shrink-0 border border-blue-50">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[9px] font-bold uppercase text-blue-900 tracking-widest mb-1">Tips de Seguridad</h4>
                  <p className="text-[10px] text-blue-700/80 font-medium leading-relaxed">
                    Valida que el nombre y monto coincidan. Al confirmar, se liberarán las fechas automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8 md:mt-12 pb-6 md:pb-0">
            <button
              onClick={() => onReject(booking.id)}
              className="flex-1 border border-red-200 text-red-500 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Rechazar
            </button>
            <button
              onClick={() => onApprove(booking.id)}
              className="flex-[2] bg-black text-white py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-bold text-[10px] md:text-[11px] uppercase tracking-[0.3em] hover:bg-gray-800 shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" /> APROBAR PAGO
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN COMPONENT ---

type Tab = 'today' | 'calendar' | 'listings' | 'guidebook' | 'messages' | 'reviews' | 'menu' | 'leads' | 'payments' | 'analytics' | 'seasonal' | 'conversion' | 'settings' | 'insights';

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

  // Analytics State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [propertyPerformance, setPropertyPerformance] = useState<{ performance: Record<string, number>, chartData: { label: string, val: number }[] }>({ performance: {}, chartData: [] });
  const [globalExpenses, setGlobalExpenses] = useState<ExpenseRow[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<string>('all');

  // --- STABLE CALLBACKS ---
  const fetchPayments = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*, profiles(full_name, avatar_url, phone, email), properties(title, images, policies)')
        .eq('status', 'waiting_approval')
        .abortSignal(signal || new AbortController().signal);

      if (data) {
        setPendingPayments(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : (data as BookingWithDetails[]));
      }
    } catch (e) {
      console.warn("fetchPayments error:", e);
    }
  }, []);

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
    if (!user?.id) return;

    // SWR: Restaurar cache antes de empezar la carga real
    restoreCache();

    setIsLoading(true);
    try {
      await fetchPayments(signal);

      const userEmail = user.email?.toLowerCase();
      if (!userEmail) return;

      let hostPropertyIds: string[] = [];
      if (userEmail === 'villaretiror@gmail.com') {
        const { data: allProps } = await supabase.from('properties').select('id');
        hostPropertyIds = allProps?.map((p: any) => p.id) || [];
      } else {
        const [owned, cohosted] = await Promise.all([
          supabase.from('properties').select('id').eq('email', userEmail),
          supabase.from('property_cohosts').select('property_id').eq('email', userEmail)
        ]);
        const ownedIds = owned.data?.map((p: any) => p.id) || [];
        const cohostedIds = cohosted.data?.map((p: any) => p.property_id) || [];
        hostPropertyIds = Array.from(new Set([...ownedIds, ...cohostedIds]));
      }

      if (hostPropertyIds.length === 0) {
        setIsLoading(false);
        onUpdateProperties([]);
        return;
      }

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .in('id', hostPropertyIds.map(id => String(id)))
        .abortSignal(signal || new AbortController().signal);

      if (props && props.length > 0) {
        const mappedProps: Property[] = (props as Tables<'properties'>[]).map(p => ({
          ...p,
          id: String(p.id),
          title: p.title || 'Villa',
          price: p.price || 0,
          cleaning_fee: p.cleaning_fee || 0,
          service_fee: p.service_fee || 0,
          security_deposit: p.security_deposit || 0,
          rating: p.rating || 5,
          reviews_count: p.reviews || 0,
          images: p.images || [],
          amenities: p.amenities || [],
          guests: p.guests || 2,
          bedrooms: p.bedrooms || 1,
          beds: p.beds || 1,
          baths: p.baths || 1,
          fees: (p.fees as any) || {},
          policies: (p.policies as any) || {},
          blockedDates: p.blockedDates || [],
          calendarSync: (p.calendarSync as any[]) || [],
          seasonal_prices: (p.seasonal_prices as any[]) || [],
          host: (p.host as any) || {
            name: user.name || 'Anfitrión',
            image: user.avatar || '',
            yearsHosting: 1,
            badges: user.role === 'host' ? ['Pro Host'] : []
          }
        })) as Property[];
        onUpdateProperties(mappedProps);
      }

      const { data: allBookings } = await supabase
        .from('bookings')
        .select(`*, profiles(full_name, avatar_url, phone, email), properties(title, images, policies)`)
        .in('property_id', hostPropertyIds.map(id => String(id)))
        .abortSignal(signal || new AbortController().signal);

      if (allBookings) {
        const typedBookings = allBookings as BookingWithDetails[];
        let total = 0; let monthly = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const performance: Record<string, number> = {};
        const monthsHistory: Record<string, number> = {};

        typedBookings.forEach((b) => {
          if (b.status === 'confirmed' || b.status === 'completed') {
            const amount = Number(b.total_price) || 0;
            total += amount;
            const propTitle = b.properties?.title || 'Villa Desconocida';
            performance[propTitle] = (performance[propTitle] || 0) + amount;
            if (b.created_at) {
              const dateObj = new Date(b.created_at);
              const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
              monthsHistory[monthKey] = (monthsHistory[monthKey] || 0) + amount;
              if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) monthly += amount;
            }
          }
        });

        const chartData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(); d.setMonth(d.getMonth() - i);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          chartData.push({ label: d.toLocaleString('es-PR', { month: 'short' }).toUpperCase(), val: monthsHistory[monthKey] || 0 });
        }

        setTotalRevenue(total);
        setMonthlyRevenue(monthly);
        setPropertyPerformance({ performance, chartData });
        const today = new Date().toISOString().split('T')[0];
        const filteredBookings = typedBookings.filter((b) => (b.check_out >= today && b.status !== 'rejected'));
        setRealBookings(filteredBookings);

        // SWR: Persistir cache para carga instantánea futura
        localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({
          totalRevenue: total,
          monthlyRevenue: monthly,
          realBookings: filteredBookings,
          globalExpenses: [] // Se actualizará en el siguiente bloque
        }));
      }

      const { data: allExpenses } = await supabase
        .from('property_expenses')
        .select('*')
        .in('property_id', hostPropertyIds.map(id => String(id)))
        .abortSignal(signal || new AbortController().signal);

      if (allExpenses) {
        setGlobalExpenses(allExpenses);
        // Actualizar cache con los gastos incluidos
        const cached = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || '{}');
        localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ ...cached, globalExpenses: allExpenses }));
      }

      // --- ANTI-ZOMBIE ENGINE: Auto-expire old waiting_approval bookings (> 4h) ---
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { error: expireError } = await supabase
        .from('bookings')
        .update({ status: 'expired' })
        .eq('status', 'waiting_approval')
        .lt('created_at', fourHoursAgo);

      if (expireError) console.warn("Anti-Zombie Error:", expireError);

      setIsLoading(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("fetchData FATAL Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, user?.name, user?.avatar, user?.role, onUpdateProperties, fetchPayments]);

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

      if (activeTab === 'leads' || activeTab === 'today') {
        const { data: leadsData } = await supabase.from('leads').select('*').eq('status', 'new').order('created_at', { ascending: false }).abortSignal(controller.signal);
        if (leadsData && isSubscribed) setLeads(leadsData as any);

        const { data: alertsData } = await supabase.from('urgent_alerts').select('*').eq('status', 'new').order('created_at', { ascending: false }).abortSignal(controller.signal);
        if (alertsData && isSubscribed) setUrgentAlerts(alertsData);
      }

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
    if (activeTab === 'payments') fetchPayments(controller.signal);
    return () => controller.abort();
  }, [activeTab, fetchPayments]);

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
      
      // Eliminar variantes basura para mantener limpieza de tráfico y evitar errores de Schema Cache
      const junkFields = ['isOffline', 'isoffline', 'reviews_count', 'blockedDates', 'calendarSync'];
      junkFields.forEach(f => delete payload[f]);

      // Unificar nombres JSONB a minúsculas/snake_case para la DB
      payload.calendarsync = updated.calendarSync || [];

      // Aseguramos que los objetos JSONB se mantengan intactos
      const jsonFields = ['fees', 'policies', 'seasonal_prices', 'offers', 'reviews_list', 'calendarsync'];
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
          </div>
          <h2 className="text-3xl font-serif font-black italic tracking-tighter mb-4 leading-tight">
            "La brisa de <span className="text-primary-light">Cabo Rojo</span> augura un día de 5 estrellas."
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2 rounded-xl"><Calendar className="w-4 h-4 text-primary-light" /></div>
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Check-ins</p>
                <p className="text-sm font-bold">{nextCheckins.filter(b => b.check_in === new Date().toISOString().split('T')[0]).length} Llegadas hoy</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2 rounded-xl"><Zap className="w-4 h-4 text-yellow-400" /></div>
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Clima en Vivo</p>
                <p className="text-sm font-bold">29°C Parcialmente Nublado</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2 rounded-xl"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Status Op.</p>
                <p className="text-sm font-bold">{urgentAlerts.filter(a => a.status === 'new').length > 0 ? 'Revisión Pendiente' : 'Todo en Orden'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-between items-center mb-2 px-2">
        <h2 className="text-3xl font-serif font-black italic tracking-tighter text-text-main">Gestión del Día</h2>
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
          <h3 className="text-lg font-medium text-text-main flex items-center gap-2.5">
            <Calendar strokeWidth={1.5} className="w-5 h-5 text-primary" />
            Próximos Check-ins
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
                    {booking.profiles?.avatar_url ? (
                      <img src={booking.profiles.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
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
                  <div className="text-right">
                    <p className="text-sm font-serif font-black italic text-green-600 mb-0.5 tracking-tight">${booking.total_price}</p>
                    <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">Confirmado</span>
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
        <SavingsInsights bookings={realBookings} />
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

              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden border-[6px] border-white shadow-float relative group-hover:scale-105 transition-transform duration-500">
                  <img src={booking.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="Guest" className="w-full h-full object-cover" />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-black italic tracking-tighter text-text-main leading-tight">{booking.profiles?.full_name || 'Huésped'}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-serif font-black italic text-primary">${booking.total_price}</span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-light opacity-50">• {booking.status}</span>
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
    <div className="space-y-6 animate-fade-in">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
        <div className="flex gap-3">
          <span className="material-icons text-blue-600">verified</span>
          <div>
            <h3 className="font-bold text-blue-800 text-sm">Gestor de Reputación</h3>
            <p className="text-xs text-blue-600 leading-relaxed">
              Como Airbnb no permite sincronización automática, utiliza esta herramienta para
              copiar tus mejores reseñas y mantener tu puntuación actualizada manualmente.
            </p>
          </div>
        </div>
      </div>

      {properties.map((p: Property) => (
        <ReviewManager
          key={p.id}
          property={p}
          onAddReview={handleAddManualReview}
          onUpdateStats={handleUpdateReviewStats}
        />
      ))}
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
        <h2 className="text-3xl font-serif font-black italic tracking-tighter text-text-main">Tus Propiedades</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white text-black border border-gray-100 rounded-full px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-soft hover:bg-black hover:text-white transition-all flex items-center gap-2.5 active:scale-95"
          >
            <Download strokeWidth={2} className="w-3.5 h-3.5 text-[#FF385C]" /> Importar
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
                    <span className="text-text-light text-[8px] font-bold uppercase tracking-widest ml-1 opacity-40">/noche</span>
                  </div>
                  <button
                    onClick={() => setIsEditing(p.id)}
                    className="bg-gray-50 text-text-main font-bold text-[9px] uppercase tracking-[0.2em] px-6 py-3 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
  const renderPayments = () => (
    <div className="space-y-6 animate-fade-in mb-10 pb-12">
      <div className="bg-orange-50/50 p-8 rounded-[2.5rem] border border-orange-100 flex items-center gap-6 shadow-sm">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-soft-sm border border-orange-50">
          <CreditCard strokeWidth={1.5} className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-serif font-black italic text-xl text-orange-900 tracking-tighter">Conciliación ATH Móvil</h3>
          <p className="text-[10px] text-orange-700/70 font-medium uppercase tracking-widest mt-1">Valida los comprobantes para confirmar estancias.</p>
        </div>
      </div>

      {pendingPayments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingPayments.map((payment: any) => (
            <div key={payment.id} className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-gray-100 group hover:border-orange-100 transition-all">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-full border-2 border-white shadow-soft overflow-hidden">
                  <img src={payment.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"} alt="User" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-text-main leading-tight">{payment.profiles?.full_name}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-light mt-1.5 opacity-60">
                    <span className="text-secondary font-black">${payment.total_price}</span> • {payment.properties?.title}
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border border-orange-100">Pendiente</div>
              </div>

              <div className="mb-8">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-[0.3em] mb-3 ml-1">Comprobante:</p>
                <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-gray-100 bg-gray-50 group/img shadow-inner">
                  <img src={payment.payment_proof_url} alt="Proof" className="w-full h-full object-contain p-4 group-hover/img:scale-105 transition-transform duration-700" />
                  <a
                    href={payment.payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 backdrop-blur-sm"
                  >
                    <span className="text-white text-[9px] font-bold uppercase tracking-[0.2em] border border-white/20 px-6 py-3 rounded-full hover:bg-white hover:text-black transition-all">Ver Pantalla Completa</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRejectPayment(payment.id)}
                  className="py-5 rounded-[1.8rem] border border-gray-100 text-red-500 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Rechazar
                </button>
                <button
                  onClick={() => handleApprovePayment(payment.id)}
                  className="py-5 rounded-[1.8rem] bg-black text-white font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-gray-800 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> Confirmar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-gray-200">
          <span className="material-icons text-4xl text-gray-200 mb-2">done_all</span>
          <p className="text-xs font-bold text-gray-400">Todos los pagos están al día</p>
        </div>
      )}
    </div>
  );

  const renderConversion = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-2">
        <div className="flex gap-3">
          <span className="material-icons text-orange-600">bolt</span>
          <div>
            <h3 className="font-bold text-orange-800 text-sm">Optimización de Conversión</h3>
            <p className="text-xs text-orange-600 leading-relaxed">
              Configura elementos que crean urgencia y confianza para aumentar tus reservas directas.
            </p>
          </div>
        </div>
      </div>

      {properties.map((p: Property) => {
        const [formData, setFormData] = useState({
          availability_urgency_msg: p.availability_urgency_msg || '',
          general_area_map_url: p.general_area_map_url || '',
          exact_lat_long: p.exact_lat_long || '',
          google_maps_url: p.google_maps_url || '',
          waze_url: p.waze_url || '',
          review_url: p.review_url || ''
        });

        const handleBlur = () => {
          handleSaveProperty({ ...p, ...formData });
        };

        return (
          <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-soft border border-gray-100">
            <h3 className="font-serif font-black italic text-lg mb-6 border-b border-gray-50 pb-2">{p.title}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Mensaje de Urgencia (Pulsaciones)</label>
                <input 
                  value={formData.availability_urgency_msg}
                  onChange={e => setFormData({...formData, availability_urgency_msg: e.target.value})}
                  onBlur={handleBlur}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm mt-1"
                  placeholder="Ej: Solo quedan 2 fines de semana en Abril"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">URL Mapa Estético (Pin General)</label>
                  <input 
                    value={formData.general_area_map_url}
                    onChange={e => setFormData({...formData, general_area_map_url: e.target.value})}
                    onBlur={handleBlur}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm mt-1"
                    placeholder="https://supabase.co/..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Coordenadas Exactas (GPS)</label>
                  <input 
                    value={formData.exact_lat_long}
                    onChange={e => setFormData({...formData, exact_lat_long: e.target.value})}
                    onBlur={handleBlur}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm mt-1"
                    placeholder="18.0636,-67.1569"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Google Maps URL</label>
                  <input 
                    value={formData.google_maps_url}
                    onChange={e => setFormData({...formData, google_maps_url: e.target.value})}
                    onBlur={handleBlur}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] mt-1"
                    placeholder="https://goo.gl/maps/..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Waze URL</label>
                  <input 
                    value={formData.waze_url}
                    onChange={e => setFormData({...formData, waze_url: e.target.value})}
                    onBlur={handleBlur}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] mt-1"
                    placeholder="https://waze.com/ul?..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Google Review URL</label>
                  <input 
                    value={formData.review_url}
                    onChange={e => setFormData({...formData, review_url: e.target.value})}
                    onBlur={handleBlur}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] mt-1"
                    placeholder="https://g.page/r/..."
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
        {activeTab === 'guidebook' && renderGuidebook()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'listings' && renderListings()}
        {activeTab === 'reviews' && renderReviews()}
        {activeTab === 'leads' && renderLeads()}
        {activeTab === 'menu' && <HostMenu properties={properties} onNavigate={onNavigate} />}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'analytics' && (
          <AnalysisDashboard
            bookings={realBookings}
            expenses={globalExpenses}
            properties={properties}
            selectedPropertyId={analyticsFilter}
            onFilterChange={setAnalyticsFilter}
          />
        )}
        {activeTab === 'conversion' && renderConversion()}
        {activeTab === 'messages' && <HostMessageCenter />}
        {activeTab === 'insights' && <InsightViewer />}
      </main>

      {/* Overlays */}
      <HostChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} message={welcomeMessage} />
      {showSmartValidation && (
        <SmartValidationModal
          booking={showSmartValidation}
          onApprove={handleApprovePayment}
          onReject={handleRejectPayment}
          onClose={() => setShowSmartValidation(null)}
        />
      )}
      {editingProperty && <Editor property={editingProperty} bookings={realBookings} onSave={handleSaveProperty} onCancel={() => setIsEditing(null)} isSaving={isSaving} />}
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
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] relative z-10">Estadísticas</span>
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