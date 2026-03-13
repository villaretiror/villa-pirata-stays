import React, { useState, useMemo, useEffect } from 'react';
import { Property, User as UserType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SystemHealthIndicator from './SystemHealthIndicator';

type ModalType = 'none' | 'task' | 'cohost' | 'payouts' | 'alerts' | 'account';

interface HostMenuProps {
  properties: Property[];
  onNavigate?: (view: any) => void;
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

const HostMenu: React.FC<HostMenuProps> = ({ properties, onNavigate }) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  // --- REAL SUPABASE STATES ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [loadingCoHosts, setLoadingCoHosts] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Task/CoHost Input States
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskProperty, setNewTaskProperty] = useState("Todas");
  const [newCoHostEmail, setNewCoHostEmail] = useState("");
  const [selectedPropertyForCoHost, setSelectedPropertyForCoHost] = useState(properties[0]?.id || "");

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
    fetchCoHosts();
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

  const fetchCoHosts = async () => {
    setLoadingCoHosts(true);
    const { data, error } = await supabase
      .from('property_cohosts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setCoHosts(data || []);
    setLoadingCoHosts(false);
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
        name: profileForm.name,
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

  const inviteCoHost = async () => {
    const trimmedEmail = newCoHostEmail.trim();

    // Validaciones preventivas
    if (!trimmedEmail) return alert("Por favor ingresa un email válido.");
    if (!selectedPropertyForCoHost) return alert("Error: Debes seleccionar una propiedad.");

    const { data, error } = await supabase
      .from('property_cohosts')
      .insert({
        email: trimmedEmail,
        property_id: selectedPropertyForCoHost,
        status: 'pending'
      })
      .select();

    if (!error && data) {
      setCoHosts([data[0], ...coHosts]);
      setNewCoHostEmail("");

      // TRIGGER RE-SEND EMAIL
      try {
        const prop = properties.find(p => p.id === selectedPropertyForCoHost);
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invite',
            to: [trimmedEmail],
            propertyTitle: prop?.title || 'Villa Retiro'
          })
        });
      } catch (e) {
        console.error("Resend Trigger Error:", e);
      }

      alert("Invitación enviada exitosamente ✨");
    } else {
      console.error('--- SUPABASE ERROR [inviteCoHost] ---', error);
      const detail = error?.details || '';
      const fieldMatch = error?.message?.match(/column "([^"]+)"/);
      const field = fieldMatch ? ` en campo [${fieldMatch[1]}]` : "";

      alert(`Error invitando anfitrión${field}: ${error?.message}\n\nDetalle: ${detail}`);
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

  const TaskModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="font-bold text-xl mb-4">Agregar Tarea</h2>
        <div className="space-y-4">
          <input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Propiedad</label>
            <div className="flex gap-2 flex-wrap">
              {['Todas', ...properties.map(p => p.title)].map(p => (
                <button
                  key={p}
                  onClick={() => setNewTaskProperty(p)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${newTaskProperty === p ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setActiveModal('none')} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancelar</button>
            <button onClick={addTask} disabled={!newTaskText.trim()} className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">Agregar</button>
          </div>
        </div>
      </div>
    </div>
  );

  const AlertsModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="font-bold text-xl mb-1">Notificaciones</h2>
        <p className="text-xs text-text-light mb-6">Gestiona las alertas push.</p>
        <div className="space-y-4">
          {Object.entries(notifications).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="capitalize text-sm font-medium text-text-main">{key}</span>
              <button
                onClick={() => setNotifications({ ...notifications, [key]: !val })}
                className={`w-10 h-6 rounded-full p-1 transition-colors ${val ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${val ? 'translate-x-4' : ''}`}></div>
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setActiveModal('none')} className="w-full mt-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cerrar</button>
      </div>
    </div>
  );

  const AccountModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/20">
        <h2 className="font-serif font-bold text-2xl mb-1">Mi Cuenta</h2>
        <p className="text-xs text-text-light mb-6">Gestiona tu identidad de anfitrión.</p>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nombre Completo</label>
            <input
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Teléfono</label>
            <input
              value={profileForm.phone}
              onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Bio / Descripción</label>
            <textarea
              value={profileForm.bio}
              onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setActiveModal('none')} className="flex-1 py-4 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-2xl">Cancelar</button>
            <button
              onClick={saveProfile}
              disabled={isSavingProfile}
              className="flex-1 py-4 text-xs font-bold bg-black text-white rounded-2xl shadow-xl flex items-center justify-center gap-2"
            >
              {isSavingProfile && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              GUARDAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const CoHostModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="font-bold text-xl mb-1 text-text-main">Co-Anfitriones</h2>
        <p className="text-xs text-text-light mb-4 text-balanced">Otorga el control de tus villas a tu equipo.</p>

        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
          {loadingCoHosts ? <p className="text-center py-4 animate-pulse text-[10px] font-bold text-gray-400 uppercase">Cargando...</p> :
            coHosts.map((host, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold border border-secondary/20">
                    {host.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-text-main leading-tight">{host.email.split('@')[0]}</p>
                    <p className="text-[9px] text-text-light font-bold truncate opacity-60">{host.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${host.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                  {host.status === 'active' ? 'ACTIVO' : 'PENDIENTE'}
                </span>
              </div>
            ))}
          {!loadingCoHosts && coHosts.length === 0 && <p className="text-center py-4 text-[10px] text-gray-400 uppercase font-black tracking-widest">Sin equipo asignado</p>}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Invitar Nuevo Miembro</label>
          <div className="space-y-2">
            <input
              value={newCoHostEmail}
              onChange={(e) => setNewCoHostEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full p-3 border border-gray-100 rounded-xl text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={selectedPropertyForCoHost}
              onChange={e => setSelectedPropertyForCoHost(e.target.value)}
              className="w-full p-3 border border-gray-100 rounded-xl text-xs bg-gray-50 outline-none"
            >
              {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button onClick={inviteCoHost} disabled={!newCoHostEmail} className="w-full bg-black text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Invitar</button>
          </div>
        </div>

        <button onClick={() => setActiveModal('none')} className="w-full mt-4 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cerrar</button>
      </div>
    </div>
  );

  const PayoutsModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <h2 className="font-serif font-bold text-2xl mb-1">Ingresos & Pagos</h2>
        <p className="text-xs text-text-light mb-6">Conciliación de reservas confirmadas.</p>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-3xl border border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <span className="material-icons text-purple-600">credit_card</span>
              </div>
              <p className="font-black text-xs uppercase tracking-widest text-text-main">Stripe</p>
            </div>
            <button
              onClick={() => setConnectedServices({ ...connectedServices, stripe: !connectedServices.stripe })}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${connectedServices.stripe ? 'bg-green-100 text-green-700' : 'bg-black text-white shadow-lg shadow-black/20'}`}
            >
              {connectedServices.stripe ? 'ONLINE' : 'Conectar'}
            </button>
          </div>
        </div>

        <h3 className="font-black text-[10px] uppercase text-gray-400 mb-3 tracking-widest">Últimas Confirmaciones</h3>
        <div className="space-y-2 bg-gray-50 p-4 rounded-3xl max-h-48 overflow-y-auto no-scrollbar border border-gray-100">
          {earnings.length > 0 ? earnings.slice(0, 5).map(e => (
            <div key={e.id} className="flex justify-between items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-gray-400">{new Date(e.date).toLocaleDateString()}</span>
                <span className="text-[11px] font-bold text-text-main truncate w-24">#{e.id.substring(0, 8)}</span>
              </div>
              <span className="font-serif text-lg font-bold text-green-600">+${e.amount}</span>
            </div>
          )) : (
            <p className="text-[10px] font-black uppercase text-gray-400 text-center py-6 animate-pulse">
              {loadingEarnings ? 'Sincronizando...' : 'Sin reservas confirmadas'}
            </p>
          )}
        </div>

        <button onClick={() => setActiveModal('none')} className="w-full mt-6 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">Regresar</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* DB Config Warning */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl shadow-sm flex items-start gap-3">
          <span className="material-icons text-xl">error_outline</span>
          <p className="text-xs font-bold leading-tight uppercase tracking-tighter">{dbError}</p>
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
            src={user?.avatar || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000"}
            alt="Host"
            className="w-16 h-16 rounded-full object-cover border-4 border-sand shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
            <span className="material-icons text-[10px] font-bold">star</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-black font-serif text-text-main leading-tight">{user?.name}</h2>
            <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{user?.role === 'host' ? 'Admin' : 'Co-host'}</div>
          </div>
          <p className="text-[11px] text-text-light font-medium uppercase tracking-widest mb-1">{user?.role === 'host' ? 'Host Principal' : 'Colaborador'} • {new Date().getFullYear() - new Date(user?.registeredAt || '').getFullYear()} Años</p>
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
        <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
          <span className="material-icons text-[200px]">monetization_on</span>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Ingresos Reales (Confirmados)</h3>
            <select
              value={earningsFilter}
              onChange={(e) => setEarningsFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl text-[10px] font-black uppercase px-3 py-1.5 outline-none hover:bg-white/20 transition-colors"
            >
              <option value="all" className="text-black">Todas las villas</option>
              {properties.map(p => (
                <option key={p.id} value={p.id} className="text-black">{p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-baseline gap-2 mb-8 animate-fade-in">
            <span className="text-5xl font-black font-serif italic tracking-tighter">
              {loadingEarnings ? '...' : `$${analytics.total.toLocaleString()}`}
            </span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">
              Live
            </span>
          </div>

          <div className="flex gap-2 items-end h-24 mb-3">
            {analytics.chartData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end group/bar">
                <div
                  className="bg-white group-hover/bar:bg-primary transition-all duration-700 rounded-full w-full opacity-20 group-hover/bar:opacity-100"
                  style={{ height: `${h}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-black uppercase opacity-40 px-1 tracking-widest">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
        </div>
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif font-black text-xl text-text-main flex items-center gap-2 italic">
            <span className="material-icons text-orange-400">auto_fix_high</span> Mantenimiento
          </h3>
          <span className="text-[10px] font-black text-text-light bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full uppercase tracking-tighter">
            {loadingTasks ? '...' : tasks.filter(t => !t.done).length} Pendientes
          </span>
        </div>

        {loadingTasks ? (
          <div className="py-12 text-center text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] animate-pulse">Sincronizando tareas...</div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto no-scrollbar pr-1">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${task.done ? 'bg-gray-50/50 border-gray-100 opacity-40 grayscale' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
              >
                <button
                  onClick={() => toggleTask(task.id, task.done)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-200 hover:border-primary'}`}
                >
                  {task.done && <span className="material-icons text-white text-xs font-bold">check</span>}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-bold leading-tight ${task.done ? 'line-through text-gray-400' : 'text-text-main'}`}>{task.text}</p>
                  <p className="text-[9px] text-primary/70 font-black uppercase tracking-[0.15em] mt-1">{task.property}</p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-center text-[10px] font-black uppercase text-gray-300 py-6 tracking-widest">No hay tareas</p>}
          </div>
        )}
        <button onClick={() => setActiveModal('task')} className="w-full mt-6 text-[10px] font-black uppercase text-secondary-light flex items-center justify-center gap-2 py-4 bg-secondary/5 rounded-2xl hover:bg-secondary/10 transition-all tracking-widest active:scale-95 shadow-sm border border-secondary/10">
          <span className="material-icons text-sm">add_circle</span> CREAR TAREA
        </button>
      </div>

      {/* Quick Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'cohost', icon: 'groups', label: 'Co-Anfitriones', color: 'purple' },
          { id: 'payouts', icon: 'account_balance', label: 'Pagos', color: 'blue' },
          { id: 'alerts', icon: 'notifications_active', label: 'Alertas', color: 'orange' },
          { id: 'exit', icon: 'power_settings_new', label: 'Salir', color: 'red' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => btn.id === 'exit' ? (onNavigate && onNavigate('home')) : setActiveModal(btn.id as ModalType)}
            className={`bg-white p-6 rounded-[2rem] shadow-soft border border-gray-50 flex flex-col items-center gap-4 hover:shadow-md transition-all active:scale-95 group`}
          >
            <div className={`w-14 h-14 bg-${btn.color}-50 text-${btn.color}-600 rounded-full flex items-center justify-center group-hover:bg-${btn.color}-100 transition-colors`}>
              <span className="material-icons text-3xl">{btn.icon}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-main group-hover:text-primary transition-colors">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Modals injection */}
      {activeModal === 'task' && <TaskModal />}
      {activeModal === 'cohost' && <CoHostModal />}
      {activeModal === 'payouts' && <PayoutsModal />}
      {activeModal === 'alerts' && <AlertsModal />}
      {activeModal === 'account' && <AccountModal />}
    </div>
  );
};

export default HostMenu;