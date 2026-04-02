import React, { useState, useEffect } from 'react';
import { 
  Users, PlusCircle, Trash2, Check, ClipboardCheck, 
  Sparkles, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/SupabaseService';
import { CohostRow, TaskRow } from '../../types/host';

interface CohostManagerProps {
  propertyId: string;
  propertyName: string;
  onShowToast: (msg: string) => void;
}

/**
 * 🔱 CO-HOST MANAGER & OPERATIONAL PROTOCOL
 * Central hub for team management and property-specific operational tasks.
 */
export const CohostManager: React.FC<CohostManagerProps> = ({ 
  propertyId, 
  propertyName, 
  onShowToast 
}) => {
  const [newCohostEmail, setNewCohostEmail] = useState('');
  const [cohosts, setCohosts] = useState<CohostRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingResend, setSendingResend] = useState<string | null>(null);
  const [showEliteView, setShowEliteView] = useState(false);

  // --- Task Management ---
  const [tasks, setTasks] = useState<TaskRow[]>([]);
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
    const { data } = await supabase.from('tasks').select('*').eq('property_id', propertyId).order('created_at', { ascending: true });
    if (data) setTasks(data as TaskRow[]);
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
            customerEmail: trimmedEmail,
            email: trimmedEmail,
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
      onShowToast(`No se pudo eliminar: ${error.message}`);
    }
  };

  const handleResendInvitation = async (ch: CohostRow) => {
    if (sendingResend) return;
    setSendingResend(ch.id);
    onShowToast(`Enviando invitación a ${ch.email}... ✉️`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || '';

      let token = ch.invitation_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from('property_cohosts').update({ invitation_token: token }).eq('id', ch.id);
      }

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          type: 'cohost_invitation',
          customerEmail: ch.email,
          email: ch.email,
          propertyName: propertyName,
          propertyId: propertyId,
          token
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onShowToast(`✅ Invitación reenviada a ${ch.email}`);
    } catch (e: any) {
      onShowToast(`❌ Error al enviar: ${e.message || 'Intenta de nuevo'}`);
    } finally {
      setSendingResend(null);
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: boolean | null) => {
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
      setTasks([...tasks, data as TaskRow]);
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
          className="relative overflow-hidden bg-gradient-to-br from-[#0A0D14] via-[#1A1F2B] to-[#0A0D14] p-10 rounded-[3.5rem] border border-white/10 shadow-3xl text-center"
        >
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ x: [0, 100, 0], y: [0, -50, 0], rotate: [0, 360] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 blur-[120px] rounded-full"
            />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-tr from-primary to-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ring-4 ring-primary/20"
            >
              <CheckCircle2 strokeWidth={2} className="w-12 h-12 text-black" />
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <h3 className="text-4xl font-serif font-black text-white italic tracking-tighter mb-4 leading-tight">¡Protocolo Impecable! ✨</h3>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-12">Villa lista para recepción Salty Élite</p>
            </motion.div>

            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: "spring" }} className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-12">
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
    <div className="space-y-6 mt-8 p-8 bg-gray-50/50 rounded-[3rem] border border-gray-100 shadow-inner">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft">
        <h3 className="font-serif font-black italic text-xl mb-6 flex items-center gap-3 tracking-tighter text-text-main">
          <Users strokeWidth={2} className="w-6 h-6 text-primary" /> 
          Gestión de Equipo
        </h3>
        <div className="space-y-3 mb-8">
          {cohosts.map((ch, idx) => (
            <div key={ch.id || idx} className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-primary/20 transition-all">
              <div>
                <p className="text-xs font-black text-text-main uppercase tracking-widest">{ch.email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${ch.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-sand text-primary border border-primary/20'}`}>
                    {ch.status === 'active' ? 'Activo' : 'Pendiente'}
                  </span>
                  {ch.status === 'pending' && (
                    <button
                      onClick={() => handleResendInvitation(ch)}
                      disabled={sendingResend === ch.id}
                      className={`text-[8px] font-black uppercase tracking-widest transition-all ${sendingResend === ch.id ? 'text-primary animate-pulse' : 'text-gray-400 hover:text-black'}`}
                    >
                      {sendingResend === ch.id ? 'Enviando...' : 'Reenviar'}
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleRemoveCohost(ch.id)} 
                className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {cohosts.length === 0 && (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl">
              <p className="text-[10px] text-gray-300 uppercase font-black tracking-widest leading-none">Navegación en Solitario</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <input 
            value={newCohostEmail} 
            onChange={e => setNewCohostEmail(e.target.value)} 
            placeholder="email@equipo.com" 
            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary/30 transition-all shadow-inner" 
          />
          <button 
            onClick={handleInvite} 
            disabled={!newCohostEmail || isLoading} 
            className="bg-black text-white px-8 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-gray-800 shadow-xl"
          >
            Invitar
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft relative overflow-hidden group">
        {allDone && (
          <div 
            className="absolute top-0 right-0 p-4 bg-green-500 text-white rounded-bl-3xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xl z-20" 
            onClick={() => setShowEliteView(true)}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        )}
        <h3 className="font-serif font-black italic text-xl mb-8 flex items-center gap-3 tracking-tighter text-text-main">
          <ClipboardCheck strokeWidth={2} className="w-6 h-6 text-secondary" /> 
          Protocolo Operativo
        </h3>
        <div className="space-y-3 mb-8">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group/task hover:bg-white transition-all">
              <button 
                onClick={() => handleToggleTask(t.id, t.done)} 
                className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${t.done ? 'bg-green-500 border-green-500 shadow-lg shadow-green-200' : 'bg-white border-gray-200 hover:border-secondary'}`}
              >
                {t.done && <Check className="w-4 h-4 text-white" />}
              </button>
              <span className={`text-[13px] font-medium transition-all ${t.done ? 'line-through text-gray-300' : 'text-text-main'}`}>{t.text}</span>
            </div>
          ))}
          {tasks.length === 0 && (
             <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl">
               <p className="text-[10px] text-gray-300 uppercase font-black tracking-widest leading-none">Sin tareas asignadas</p>
             </div>
          )}
        </div>
        <div className="flex gap-3">
          <input 
            value={newTaskDesc} 
            onChange={e => setNewTaskDesc(e.target.value)} 
            placeholder="Añadir punto crítico al protocolo..." 
            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-secondary/30 transition-all shadow-inner" 
          />
          <button 
            onClick={handleAddTask} 
            className="bg-secondary text-white p-4 rounded-xl hover:bg-secondary-dark transition-all shadow-xl active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={handleResetTasks} 
          className="w-full mt-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 hover:text-red-400 transition-colors"
        >
          Reiniciar Todo
        </button>
      </div>
    </div>
  );
};
