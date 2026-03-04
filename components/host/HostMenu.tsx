import React, { useState, useMemo, useEffect } from 'react';
import { Property } from '../../types';
import { supabase } from '../../lib/supabase';

type ModalType = 'none' | 'task' | 'cohost' | 'payouts' | 'alerts';

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

interface Earning {
  id: number;
  property_id: string;
  amount: number;
  date: string;
}

const HostMenu: React.FC<HostMenuProps> = ({ properties, onNavigate }) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  // --- REAL SUPABASE STATES ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Task Input States
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskProperty, setNewTaskProperty] = useState("Todas");

  // 2. Co-Hosts (Local state for now, can be Supabase 'profiles' later)
  const [coHosts, setCoHosts] = useState([
    { email: 'maria@limpieza.com', role: 'Limpieza', status: 'Activo' },
    { email: 'juan@mantenimiento.com', role: 'Mantenimiento', status: 'Pendiente' }
  ]);
  const [newCoHostEmail, setNewCoHostEmail] = useState("");

  // 3. Payouts
  const [connectedServices, setConnectedServices] = useState({ stripe: false, paypal: false });

  // 4. Alerts
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
    fetchEarnings();
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      // If code is 42P01, it means table missing
      if (error.code === '42P01') {
        // We handle this via dbError in fetchEarnings mainly, but good to note
      }
    } else {
      setTasks(data || []);
    }
    setLoadingTasks(false);
  };

  const fetchEarnings = async () => {
    setLoadingEarnings(true);
    setDbError(null);
    const { data, error } = await supabase
      .from('earnings')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching earnings:', error);
      if (error.code === '42P01') { // Code for "relation does not exist"
        setDbError('Faltan tablas en Supabase. Ejecuta el archivo "supabase_setup.sql".');
      } else {
        setDbError('Error de conexión con Supabase. Revisa la consola.');
      }
    } else {
      setEarnings(data || []);
    }
    setLoadingEarnings(false);
  };

  // --- CALCULATIONS ---

  const calculateEarnings = useMemo(() => {
    let filtered = earnings;
    if (earningsFilter !== 'all') {
      filtered = earnings.filter(e => e.property_id === earningsFilter);
    }
    const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Generate simple chart data based on filtered items count or random distribution for demo visualization
    // In a real production app, we would group by day of week here.
    // Simulating 7 days distribution based on total amount
    const baseDistribution = [0.1, 0.2, 0.15, 0.25, 0.1, 0.15, 0.05];
    const chartData = total > 0 
      ? baseDistribution.map(factor => (total * factor) / (total / 100 || 1)) 
      : [0,0,0,0,0,0,0];

    return { total, chartData };
  }, [earningsFilter, earnings]);

  // --- HANDLERS ---

  const toggleTask = async (id: number, currentStatus: boolean) => {
    // Optimistic update
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !currentStatus } : t));
    
    const { error } = await supabase
      .from('tasks')
      .update({ done: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const addTask = async () => {
    if(!newTaskText.trim()) return;

    const newTask = { text: newTaskText, property: newTaskProperty, done: false };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select();

    if (error) {
      console.error('Error adding task:', error);
      alert('No se pudo guardar la tarea. Verifica que la tabla "tasks" exista.');
    } else {
      if (data) setTasks([data[0], ...tasks]);
      setNewTaskText("");
      setActiveModal('none');
    }
  };

  const deleteTask = async (id: number) => {
    // Optimistic update
    setTasks(tasks.filter(t => t.id !== id));

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task', error);
      fetchTasks();
    }
  };

  const inviteCoHost = () => {
    if(!newCoHostEmail.trim()) return;
    setCoHosts([...coHosts, { email: newCoHostEmail, role: 'Co-Anfitrión', status: 'Pendiente' }]);
    setNewCoHostEmail("");
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

  const CoHostModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
          <h2 className="font-bold text-xl mb-1">Acceso Co-Anfitrión</h2>
          <p className="text-xs text-text-light mb-4">Otorga acceso a limpieza o mantenimiento.</p>
          
          <div className="space-y-2 mb-6">
            {coHosts.map((host, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold">
                    {host.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{host.email}</p>
                    <p className="text-[10px] text-text-light">{host.role}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${host.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {host.status}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100">
             <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Invitar Nuevo</label>
             <div className="flex gap-2">
               <input 
                  value={newCoHostEmail}
                  onChange={(e) => setNewCoHostEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 p-2 border rounded-xl text-sm outline-none focus:border-primary"
               />
               <button onClick={inviteCoHost} disabled={!newCoHostEmail} className="bg-black text-white px-4 rounded-xl text-xs font-bold">Invitar</button>
             </div>
          </div>

          <button onClick={() => setActiveModal('none')} className="w-full mt-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cerrar</button>
        </div>
    </div>
  );

  const PayoutsModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
          <h2 className="font-bold text-xl mb-4">Configuración de Pagos</h2>
          
          <div className="space-y-4 mb-6">
            {/* Stripe */}
            <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <span className="material-icons text-purple-600 text-3xl">credit_card</span>
                 <div>
                   <p className="font-bold text-sm">Stripe</p>
                   <p className="text-[10px] text-gray-500">Procesamiento de Tarjetas</p>
                 </div>
               </div>
               <button 
                 onClick={() => setConnectedServices({...connectedServices, stripe: !connectedServices.stripe})}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${connectedServices.stripe ? 'bg-green-100 text-green-700' : 'bg-black text-white'}`}
               >
                 {connectedServices.stripe ? 'Conectado' : 'Conectar'}
               </button>
            </div>

            {/* PayPal */}
            <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <span className="material-icons text-blue-600 text-3xl">account_balance_wallet</span>
                 <div>
                   <p className="font-bold text-sm">PayPal</p>
                   <p className="text-[10px] text-gray-500">Transferencias Rápidas</p>
                 </div>
               </div>
               <button 
                 onClick={() => setConnectedServices({...connectedServices, paypal: !connectedServices.paypal})}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${connectedServices.paypal ? 'bg-green-100 text-green-700' : 'bg-black text-white'}`}
               >
                 {connectedServices.paypal ? 'Conectado' : 'Conectar'}
               </button>
            </div>
          </div>

          <h3 className="font-bold text-sm mb-2">Historial de Ingresos</h3>
          <div className="space-y-2 bg-gray-50 p-3 rounded-xl max-h-32 overflow-y-auto">
             {earnings.length > 0 ? earnings.slice(0, 5).map(e => (
               <div key={e.id} className="flex justify-between text-xs p-2 bg-white rounded-lg shadow-sm">
                 <span>{new Date(e.date).toLocaleDateString()}</span>
                 <span className="font-bold text-green-600">+${e.amount}</span>
               </div>
             )) : (
               <p className="text-xs text-gray-400 text-center py-2">
                 {loadingEarnings ? 'Cargando...' : 'Sin ingresos registrados'}
               </p>
             )}
          </div>

          <button onClick={() => setActiveModal('none')} className="w-full mt-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cerrar</button>
        </div>
    </div>
  );

  const AlertsModal = () => {
    const requestPush = () => {
      alert("Host Dashboard: Se han solicitado permisos de notificación push para este dispositivo.");
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h2 className="font-bold text-xl mb-1">Notificaciones</h2>
            <p className="text-xs text-text-light mb-6">Gestiona las alertas push.</p>
            
            <button 
              onClick={requestPush}
              className="w-full bg-primary/10 text-primary font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2"
            >
              <span className="material-icons text-sm">notifications_active</span>
              Activar Notificaciones Push
            </button>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize text-sm font-medium text-text-main">{key}</span>
                  <button 
                    onClick={() => setNotifications({...notifications, [key]: !val})}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${val ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${val ? 'translate-x-4' : ''}`}></div>
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setActiveModal('none')} className="w-full mt-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Guardar</button>
          </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* DB Config Warning */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3">
          <span className="material-icons text-xl">warning</span>
          <div>
            <p className="font-bold text-sm">Configuración Incompleta</p>
            <p className="text-xs">{dbError}</p>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-soft border border-gray-100">
        <div className="relative">
           <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg" alt="Host" className="w-16 h-16 rounded-full object-cover border-4 border-sand" />
           <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white">
             <span className="material-icons text-xs">verified</span>
           </div>
        </div>
        <div>
           <h2 className="text-xl font-bold font-serif text-text-main">Carlos</h2>
           <p className="text-sm text-text-light">Superhost • 5 Años</p>
           <button className="text-xs font-bold text-secondary mt-1 underline">Ver perfil público</button>
        </div>
      </div>

      {/* Financial Analytics Card */}
      <div className="bg-secondary text-white p-6 rounded-3xl shadow-float relative overflow-hidden transition-all duration-300">
         <div className="absolute top-0 right-0 p-3 opacity-10">
           <span className="material-icons text-9xl">analytics</span>
         </div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium opacity-80">Ingresos (Histórico)</h3>
              <select 
                value={earningsFilter}
                onChange={(e) => setEarningsFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg text-xs p-1 outline-none focus:bg-white/20 text-white"
              >
                <option value="all" className="text-black">Todas</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id} className="text-black">{p.title}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold font-serif">
                 {loadingEarnings ? '...' : `$${calculateEarnings.total.toLocaleString()}`}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <span className="material-icons text-[10px]">trending_up</span> +12%
              </span>
            </div>

            <div className="flex gap-2 items-end h-24 mb-2">
               {/* Bar Chart Visualization */}
               {calculateEarnings.chartData.map((h, i) => (
                 <div key={i} className="flex-1 flex flex-col justify-end group">
                    <div 
                      className="bg-white/20 group-hover:bg-primary transition-all duration-500 rounded-t-lg w-full" 
                      style={{ height: `${h}%` }}
                    ></div>
                 </div>
               ))}
            </div>
            <div className="flex justify-between text-[10px] opacity-60">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>
         </div>
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white p-5 rounded-3xl shadow-soft border border-gray-100">
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-main flex items-center gap-2">
               <span className="material-icons text-orange-400">build_circle</span> Mantenimiento
            </h3>
            <span className="text-xs font-bold text-text-light bg-gray-100 px-2 py-1 rounded-full">
              {loadingTasks ? '...' : tasks.filter(t=>!t.done).length} Pendientes
            </span>
         </div>
         
         {loadingTasks ? (
            <div className="py-4 text-center text-xs text-gray-400">Cargando tareas...</div>
         ) : (
           <div className="space-y-3">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${task.done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-primary'}`}
                >
                   <button onClick={() => toggleTask(task.id, task.done)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {task.done && <span className="material-icons text-white text-xs">check</span>}
                   </button>
                   <div className="flex-1">
                      <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-text-main'}`}>{task.text}</p>
                      <p className="text-[10px] text-text-light font-bold uppercase">{task.property}</p>
                   </div>
                   <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1">
                     <span className="material-icons text-sm">delete</span>
                   </button>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-center text-xs text-gray-400 py-2">No hay tareas pendientes</p>}
           </div>
         )}
         <button onClick={() => setActiveModal('task')} className="w-full mt-4 text-xs font-bold text-secondary flex items-center justify-center gap-1 py-2 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="material-icons text-sm">add</span> Agregar Tarea
         </button>
      </div>

      {/* Quick Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
         <button onClick={() => setActiveModal('cohost')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <span className="material-icons">manage_accounts</span>
            </div>
            <span className="text-xs font-bold">Co-Anfitriones</span>
         </button>
         <button onClick={() => setActiveModal('payouts')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <span className="material-icons">payments</span>
            </div>
            <span className="text-xs font-bold">Pagos</span>
         </button>
         <button onClick={() => setActiveModal('alerts')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
              <span className="material-icons">notifications</span>
            </div>
            <span className="text-xs font-bold">Alertas</span>
         </button>
         <button onClick={() => onNavigate && onNavigate('home')} className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center gap-2 hover:bg-red-100 transition-colors">
            <div className="w-10 h-10 bg-white text-red-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="material-icons">logout</span>
            </div>
            <span className="text-xs font-bold text-red-500">Salir</span>
         </button>
      </div>

      {/* Modals injection */}
      {activeModal === 'task' && <TaskModal />}
      {activeModal === 'cohost' && <CoHostModal />}
      {activeModal === 'payouts' && <PayoutsModal />}
      {activeModal === 'alerts' && <AlertsModal />}
    </div>
  );
};

export default HostMenu;