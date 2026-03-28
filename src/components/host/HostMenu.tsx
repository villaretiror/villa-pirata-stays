import React, { useState, useMemo, useEffect } from 'react';
import { Property, User as UserType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SystemHealthIndicator from './SystemHealthIndicator';
import {
  CheckCircle2,
  Circle,
  PlusCircle,
  Send,
  CreditCard,
  Bell,
  Power,
  Users,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  User as UserIcon,
  Coins,
  DollarSign,
  Briefcase,
  Wand2,
  Trash2,
  AlertTriangle,
  Receipt,
  Search,
  Check,
  BookOpen,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalType = 'none' | 'task' | 'payouts' | 'alerts' | 'account';

interface HostMenuProps {
  properties: Property[];
  onNavigate?: (view: any) => void;
  onGoToProtocol?: () => void;
  onGoToTeam?: () => void;
  onGoToConcierge?: () => void;
}

interface Task {
  id: number;
  text: string;
  property: string;
  done: boolean;
}

interface HealthStatus {
  service_name: string;
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  last_check: string;
  latency_ms: number;
  error_details?: string;
  metadata: any;
}

interface CoHost {
  id: string;
  email: string;
  property_id: string;
  status: string;
  created_at: string;
}

interface Earning {
  id: string;
  property_id: string;
  amount: number;
  date: string;
}

const ModalWrapper = ({ children, onClose, isOpen }: { children: React.ReactNode, onClose: () => void, isOpen: boolean }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 print:hidden overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.y > 100) onClose();
            }}
            initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`bg-white w-full max-w-sm md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto no-scrollbar`}
          >
            {isMobile && (
              <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center z-20">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const HostMenu: React.FC<HostMenuProps> = ({ properties, onNavigate, onGoToProtocol, onGoToTeam, onGoToConcierge }) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  // --- REAL SUPABASE STATES ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.full_name || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Task/CoHost Input States
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskProperty, setNewTaskProperty] = useState("Todas");

  // 3. Payouts State
  const [connectedServices, setConnectedServices] = useState({ stripe: false, paypal: false });

  // 4. Alerts State
  const [notifications, setNotifications] = useState({
    reservations: true,
    checkin: true,
    checkout: false,
    reviews: true
  });

  // 5. Earnings Filter
  const [earningsFilter, setEarningsFilter] = useState<string>('all');

  // --- EFFECTS ---

  useEffect(() => {
    fetchTasks();
    fetchConfirmedBookings();
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.warn('HostMenu: fetchTasks error:', error.message);
    } else {
      setTasks(data || []);
    }
    setLoadingTasks(false);
  };



  const fetchConfirmedBookings = async () => {
    if (!properties || properties.length === 0) return;
    setLoadingEarnings(true);

    // Filter bookings only for properties the host manages
    const propIds = properties.map(p => p.id);

    const { data, error } = await supabase
      .from('bookings')
      .select('id, property_id, total_price, created_at')
      .eq('status', 'confirmed')
      .in('property_id', propIds);

    if (error) {
      console.error('--- SUPABASE ERROR [fetchConfirmed] ---', error);
      setDbError(`Error de pagos: ${error.message}`);
    } else {
      const mappedEarnings: Earning[] = (data || []).map((b: any) => ({
        id: b.id,
        property_id: b.property_id,
        amount: b.total_price || 0,
        date: b.created_at
      }));
      setEarnings(mappedEarnings);
    }
    setLoadingEarnings(false);
  };

  // --- CALCULATIONS ---

  const analytics = useMemo(() => {
    let filtered = earnings;
    if (earningsFilter !== 'all') {
      filtered = earnings.filter(e => e.property_id === earningsFilter);
    }
    const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);

    // Dynamic scale for chart (0-100%)
    const max = Math.max(...filtered.map(e => e.amount), 1);
    const chartData = filtered.length > 0
      ? filtered.slice(-7).map(e => (e.amount / max) * 100)
      : [0, 0, 0, 0, 0, 0, 0];

    return { total, chartData };
  }, [earningsFilter, earnings]);

  // --- HANDLERS ---

  const saveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateUser({
        full_name: profileForm.name,
        phone: profileForm.phone,
        bio: profileForm.bio
      });
      setActiveModal('none');
    } catch (e: any) {
      alert("Error al actualizar perfil: " + e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };



  const removeCohost = async (id: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas revocar el acceso a ${email}?`)) return;
    const { error } = await supabase.from('property_cohosts').delete().eq('id', id);
    if (!error) {
      alert("Acceso revocado 🗑️");
      // No coHosts state here to update locally
    } else {
      alert("Error al revocar acceso: " + error.message);
    }
  };

  const toggleTask = async (id: number, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !currentStatus } : t));
    await supabase.from('tasks').update({ done: !currentStatus }).eq('id', id);
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    const { data } = await supabase.from('tasks').insert([{ text: newTaskText, property: newTaskProperty, done: false }]).select();
    if (data) setTasks([data[0], ...tasks]);
    setNewTaskText("");
    setActiveModal('none');
  };

  // --- MODALS RENDER ---

  // --- MODALS RENDER (As functions to avoid Focus issues) ---

  const renderTaskModal = () => (
    <ModalWrapper isOpen={activeModal === 'task'} onClose={() => setActiveModal('none')}>

      <h2 className="font-serif font-black italic text-2xl mb-2 tracking-tighter">Nueva Tarea</h2>
      <p className="text-[11px] font-medium text-text-light mb-8 italic">Organiza las necesidades de tus propiedades.</p>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-1">¿Qué hay que hacer?</label>
          <input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Ej: Revisar filtro de piscina..."
            className="w-full p-4 border border-gray-100 rounded-2xl bg-gray-50 text-[11px] outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-1">Propiedad</label>
          <div className="flex gap-2 flex-wrap text-left">
            {['Todas', ...properties.map(p => p.title)].map(p => (
              <button
                key={p}
                onClick={() => setNewTaskProperty(p)}
                className={`text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all active:scale-95 ${newTaskProperty === p ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white border-gray-100 text-gray-400 hover:text-text-main'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={() => setActiveModal('none')} className="flex-1 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-text-main">Cancelar</button>
          <button onClick={addTask} disabled={!newTaskText.trim()} className="flex-1 py-4 text-[10px] font-bold bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/20 disabled:opacity-30 flex items-center justify-center gap-2 tracking-widest active:scale-95 transition-all">
            <PlusCircle className="w-4 h-4" /> AGREGAR
          </button>
        </div>
      </div>
    </ModalWrapper>
  );

  const renderAlertsModal = () => (
    <ModalWrapper isOpen={activeModal === 'alerts'} onClose={() => setActiveModal('none')}>
      <h2 className="font-serif font-black italic text-2xl mb-2 text-text-main flex items-center gap-3 tracking-tighter">
        <Send strokeWidth={2} className="w-8 h-8 text-blue-500" />
        Telegram Bot
      </h2>
      <p className="text-[11px] font-medium text-text-light mb-8 leading-relaxed">Tus alertas ahora están centralizadas vía Telegram para mayor confiabilidad 🌴.</p>

      <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-5 mb-8">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500 shrink-0">
          <Info strokeWidth={1.5} className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase text-blue-900 tracking-widest mb-1.5">Monitoreo Activo</h4>
          <p className="text-[10px] text-blue-700/80 font-medium leading-relaxed">
            Recibirás alertas instantáneas en tu celular de: 🏨 Reservas, 🔑 Check-in, 🧹 Limpieza y ⭐ Reseñas.
          </p>
        </div>
      </div>

      <div className="text-center bg-gray-50 p-6 rounded-[2rem] border border-gray-100 mb-8">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-3">Comando Disponible</p>
        <code className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold font-mono shadow-sm border border-blue-50">/status</code>
        <p className="text-[9px] text-gray-400 mt-3 font-medium">Envíalo al bot para obtener un reporte en vivo.</p>
      </div>

      <button onClick={() => setActiveModal('none')} className="w-full py-5 text-[10px] font-bold uppercase tracking-[0.2em] bg-black text-white hover:bg-gray-800 rounded-[2rem] shadow-xl transition-all active:scale-95">Cerrar Panel</button>
    </ModalWrapper>
  );

  const renderAccountModal = () => (
    <ModalWrapper isOpen={activeModal === 'account'} onClose={() => setActiveModal('none')}>

      <h2 className="font-serif font-black italic text-2xl mb-2 tracking-tighter">Mi Cuenta</h2>
      <p className="text-[11px] font-medium text-text-light mb-8 italic">Gestiona tu identidad de anfitrión.</p>

      <div className="space-y-5">
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nombre Completo</label>
          <input
            value={profileForm.name}
            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[11px] outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-1">Teléfono</label>
          <input
            value={profileForm.phone}
            onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[11px] outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] font-bold uppercase text-gray-400 tracking-widest ml-1">Bio / Descripción</label>
          <textarea
            value={profileForm.bio}
            onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[11px] outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all h-28 resize-none font-medium leading-relaxed"
          />
        </div>
        <div className="flex gap-4 pt-6">
          <button onClick={() => setActiveModal('none')} className="flex-1 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-text-main transition-colors">Cancelar</button>
          <button
            onClick={saveProfile}
            disabled={isSavingProfile}
            className="flex-1 py-4 text-[10px] font-bold bg-black text-white rounded-[1.5rem] shadow-xl shadow-black/20 flex items-center justify-center gap-2 tracking-[0.2em] active:scale-95 transition-all"
          >
            {isSavingProfile ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'GUARDAR'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );



  const renderPayoutsModal = () => (
    <ModalWrapper isOpen={activeModal === 'payouts'} onClose={() => setActiveModal('none')}>
      <h2 className="font-serif font-black italic text-2xl mb-2 tracking-tighter text-left">Ingresos & Pagos</h2>
      <p className="text-[11px] font-medium text-text-light mb-8 italic text-left">Conciliación de reservas confirmadas.</p>

      <div className="space-y-4 mb-8">
        <div className="p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between bg-gray-50 shadow-soft-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 shadow-sm shrink-0">
              <CreditCard strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-text-main">Stripe</p>
          </div>
          <button
            onClick={() => setConnectedServices({ ...connectedServices, stripe: !connectedServices.stripe })}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 ${connectedServices.stripe ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-black text-white hover:bg-gray-800 shadow-lg'}`}
          >
            {connectedServices.stripe ? 'ONLINE' : 'Conectar'}
          </button>
        </div>
      </div>

      <h3 className="font-bold text-[9px] uppercase text-gray-400 mb-4 tracking-[0.3em] ml-2 text-left">Últimas Confirmaciones</h3>
      <div className="space-y-3 bg-gray-50 p-6 rounded-[2rem] max-h-60 overflow-y-auto no-scrollbar border border-gray-100">
        {earnings.length > 0 ? earnings.slice(0, 5).map(e => (
          <div key={e.id} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft-sm border border-gray-50 group hover:border-green-100 transition-colors">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold uppercase text-gray-300 mb-1">{new Date(e.date).toLocaleDateString()}</span>
              <span className="text-[10px] font-medium text-text-main font-mono">#{e.id.substring(0, 8)}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-serif text-lg font-black italic text-green-600 tracking-tighter">+${e.amount}</span>
            </div>
          </div>
        )) : (
          <div className="text-center py-10 opacity-30">
            <Receipt className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-widest">{loadingEarnings ? 'Sincronizando...' : 'Sin reservas'}</p>
          </div>
        )}
      </div>

      <button onClick={() => setActiveModal('none')} className="w-full mt-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-[0.2em] hover:text-text-main transition-colors">Regresar</button>
    </ModalWrapper>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* DB Config Warning */}
      {dbError && (
        <div className="bg-white/50 backdrop-blur-md border border-red-100/50 text-red-600/80 p-6 rounded-[2.5rem] shadow-soft-sm flex items-center gap-4 animate-fade-in group">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0 border border-red-100 group-hover:scale-110 transition-transform">
            <AlertTriangle strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-bold leading-relaxed uppercase tracking-[0.2em]">{dbError}</p>
        </div>
      )}

      {/* 🚀 Health Monitor 360° Indicator */}
      <SystemHealthIndicator />

      {/* Profile Header */}
      <div
        onClick={() => setActiveModal('account')}
        className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-soft border border-teal-50/50 cursor-pointer hover:border-primary/20 transition-all active:scale-98"
      >
        <div className="relative">
          <img
            src={user?.avatar_url || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000"}
            alt="Host"
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-float"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-serif font-black italic tracking-tighter text-text-main leading-none">{user?.full_name}</h2>
            <div className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border border-primary/10">
              {user?.role === 'host' ? 'Master Host' : 'Co-host Staff'}
            </div>
          </div>
          <p className="text-[9px] text-text-light font-medium uppercase tracking-[0.2em] mt-2 mb-3">
            {user?.role === 'host' ? 'Administrador Principal' : 'Colaborador Autorizado'}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/host-profile/${user?.id}`); }}
            className="text-[10px] font-black text-secondary-light uppercase tracking-widest border-b border-secondary-light/30 pb-0.5"
          >
            Ver perfil público
          </button>
        </div>
      </div>

      {/* Financial Analytics Card (Unified Bookings Mode) */}
      <div className="bg-secondary text-white p-8 rounded-[3rem] shadow-float relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
          <DollarSign strokeWidth={1} className="w-48 h-48" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Ingresos Reales</h3>
            <select
              value={earningsFilter}
              onChange={(e) => setEarningsFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest px-4 py-2 outline-none hover:bg-white/10 transition-all appearance-none text-center min-w-[120px]"
            >
              <option value="all" className="text-black">Todo</option>
              {properties.map(p => (
                <option key={p.id} value={p.id} className="text-black">{p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-baseline gap-2 mb-10 animate-fade-in">
            <span className="text-5xl font-serif font-black italic tracking-tighter">
              {loadingEarnings ? '...' : `$${analytics.total.toLocaleString()}`}
            </span>
            <div className="bg-primary text-white px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Live
            </div>
          </div>

          <div className="flex gap-2.5 items-end h-24 mb-4">
            {analytics.chartData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end group/bar">
                <div
                  className="bg-white group-hover/bar:bg-primary transition-all duration-700 rounded-t-lg w-full opacity-10 group-hover/bar:opacity-100"
                  style={{ height: `${h}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[8px] font-bold uppercase opacity-30 px-1 tracking-[0.2em]">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
        </div>
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white p-8 rounded-[3rem] shadow-soft border border-gray-50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-serif font-black text-2xl text-text-main flex items-center gap-3 italic tracking-tighter">
            <Wand2 strokeWidth={1.5} className="w-6 h-6 text-primary" /> Mantenimiento
          </h3>
          <span className="text-[9px] font-bold text-text-light bg-gray-50 border border-gray-100 px-4 py-2 rounded-full uppercase tracking-widest">
            {loadingTasks ? '...' : tasks.filter(t => !t.done).length} Pendientes
          </span>
        </div>

        {loadingTasks ? (
          <div className="py-12 text-center text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] animate-pulse">Sincronizando tareas...</div>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pr-1">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-5 rounded-[1.8rem] border transition-all duration-500 ${task.done ? 'bg-gray-50 border-gray-100 opacity-40 grayscale' : 'bg-white border-gray-100 shadow-soft-sm hover:shadow-soft active:scale-[0.99] group/task'}`}
              >
                <button
                  onClick={() => toggleTask(task.id, task.done)}
                  className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center transition-all ${task.done ? 'bg-primary border-primary' : 'border-gray-200 group-hover/task:border-primary'}`}
                >
                  {task.done ? <Check className="w-3.5 h-3.5 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-100 group-hover/task:bg-primary/20" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-medium leading-tight ${task.done ? 'line-through text-gray-400' : 'text-text-main'}`}>{task.text}</p>
                  <p className="text-[8px] text-primary/70 font-bold uppercase tracking-[0.2em] mt-1.5">{task.property}</p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-[9px] font-bold uppercase text-gray-300 tracking-[0.2em]">Todo Impecable</p>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setActiveModal('task')} className="w-full mt-8 text-[9px] font-bold uppercase text-text-light flex items-center justify-center gap-2.5 py-5 bg-gray-50 rounded-[1.8rem] hover:bg-gray-100 transition-all tracking-[0.2em] active:scale-95 shadow-sm border border-gray-100">
          <PlusCircle className="w-4 h-4" /> Crear Tarea
        </button>
      </div>

      {/* Quick Settings Grid */}
      <div className="grid items-start grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { id: 'cohost', icon: Users, label: 'Equipo', color: 'purple' },
          { id: 'payouts', icon: DollarSign, label: 'Pagos', color: 'blue' },
          { id: 'alerts', icon: Bell, label: 'Alertas', color: 'orange' },
          { id: 'protocol', icon: BookOpen, label: 'Protocolo', color: 'green' },
          { id: 'concierge', icon: Eye, label: 'Tracking', color: 'blue' },
          { id: 'exit', icon: Power, label: 'Salir', color: 'red' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => {
              if (btn.id === 'exit') return onNavigate && onNavigate('home');
              if (btn.id === 'protocol') return onGoToProtocol && onGoToProtocol();
              if (btn.id === 'cohost') return onGoToTeam && onGoToTeam();
              if (btn.id === 'concierge') return onGoToConcierge && onGoToConcierge();
              setActiveModal(btn.id as ModalType);
            }}
            className={`bg-white p-8 rounded-[2.5rem] shadow-soft border border-gray-50 flex flex-col items-center gap-5 hover:shadow-md transition-all active:scale-95 group relative overflow-hidden`}
          >
            <div className={`w-16 h-16 bg-${btn.color}-50 text-${btn.color}-600 rounded-full flex items-center justify-center group-hover:bg-${btn.color}-100 transition-colors`}>
              <btn.icon strokeWidth={1.5} className="w-7 h-7" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-light group-hover:text-primary transition-colors">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Modals injection */}
      {activeModal === 'task' && renderTaskModal()}
      {activeModal === 'payouts' && renderPayoutsModal()}
      {activeModal === 'alerts' && renderAlertsModal()}
      {activeModal === 'account' && renderAccountModal()}
    </div>
  );
};

export default HostMenu;