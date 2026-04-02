import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/SupabaseService';
import { Mail, Eye, AlertCircle, CheckCircle2, Clock, MapPin, Send, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmailLog {
  id: string;
  guest_name: string;
  guest_email: string;
  subject: string;
  status: string;
  opened_at: string | null;
  created_at: string;
  booking_id: string | null;
  property_id?: string | null;
}

interface PropertySummary {
  id: string;
  title: string;
}

export const DigitalConcierge: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    email: '',
    name: '',
    type: 'lead_recovery' as const,
    propertyId: '',
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchProperties();
    
    // Subscribe to real-time updates for tracking
    const subscription = supabase
      .channel('email_logs_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProperties = async () => {
    const { data } = await supabase.from('properties').select('id, title');
    setProperties(data || []);
    if (data && data.length > 0) setTestForm(prev => ({ ...prev, propertyId: data[0].id }));
  };

  const handleManualSend = async () => {
    if (!testForm.email || !testForm.name || !testForm.propertyId) return;
    setIsSendingTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          type: testForm.type,
          email: testForm.email,
          customerName: testForm.name,
          propertyId: testForm.propertyId
        })
      });
      if (response.ok) {
        alert('🚀 Email enviado con éxito');
        setShowTestModal(false);
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (log: EmailLog) => {
    if (log.status === 'bounced') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-semibold uppercase opacity-80 tracking-wider">
          <AlertCircle className="w-3 h-3" /> Error / Rebote
        </span>
      );
    }
    if (log.opened_at) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-semibold uppercase opacity-80 tracking-wider">
          <Eye className="w-3 h-3" /> Abierto
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-semibold uppercase opacity-80 tracking-wider">
        <Send className="w-3 h-3" /> Enviado
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Estilizado */}
      <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-125 duration-700">
          <Mail strokeWidth={1} className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 border border-white/5">Digital Concierge Intelligence</span>
          </div>
          <h2 className="text-4xl font-serif font-black italic tracking-tighter mb-4 leading-none">Concierge Intelligence</h2>
          <div className="flex flex-wrap gap-4 mt-8">
            <button 
              onClick={() => setShowTestModal(true)}
              className="bg-primary text-black px-6 py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Enviar Manual / Test
            </button>
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 opacity-60">Engagement:</span>
              <span className="text-lg font-serif font-black italic">
                {logs.length > 0 ? Math.round((logs.filter(l => l.opened_at).length / logs.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {showTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative animate-scale-up">
            <h3 className="text-3xl font-serif font-black italic tracking-tighter mb-2">Manual Dispatch</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">Envía un email de seguimiento manual</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-400 ml-1">Plantilla</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                  value={testForm.type}
                  onChange={e => setTestForm({...testForm, type: e.target.value as any})}
                >
                  <option value="lead_recovery">Recuperación de Lead (Abandono)</option>
                  <option value="reservation_confirmed">Instrucciones de Check-in</option>
                  <option value="contact">Confirmación de Contacto</option>
                  <option value="cohost_invitation">Invitación Equipo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Nombre Cliente"
                  className="p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                  value={testForm.name}
                  onChange={e => setTestForm({...testForm, name: e.target.value})}
                />
                <input 
                  type="email" 
                  placeholder="Email Cliente"
                  className="p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                  value={testForm.email}
                  onChange={e => setTestForm({...testForm, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-400 ml-1">Propiedad Asociada</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                  value={testForm.propertyId}
                  onChange={e => setTestForm({...testForm, propertyId: e.target.value})}
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setShowTestModal(false)}
                  className="flex-1 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-400"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isSendingTest}
                  onClick={handleManualSend}
                  className="flex-3 py-4 bg-black text-white rounded-2xl text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 shadow-xl shadow-black/20 flex items-center justify-center gap-2"
                >
                  {isSendingTest ? "Enviando..." : <><Send className="w-4 h-4" /> DISPATCH</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por huésped, email o asunto..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchLogs}
          className="p-3 bg-gray-50 text-gray-400 hover:text-black rounded-2xl transition-colors border border-gray-100"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Actividad */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white h-64 rounded-[2.5rem] border border-dashed border-gray-200 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-gray-100 group hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center gap-6"
            >
              {/* Icono de Tipo de Email */}
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 transition-colors">
                {log.opened_at ? (
                  <Eye className="w-6 h-6 text-primary" />
                ) : (
                  <Mail className="w-6 h-6 text-gray-300" />
                )}
              </div>

              {/* Info Principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-text-main truncate">{log.guest_name || 'Desconocido'}</h4>
                  {getStatusBadge(log)}
                </div>
                <p className="text-xs text-text-light opacity-60 truncate">{log.subject}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-semibold uppercase opacity-80 text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Enviado: {format(new Date(log.created_at), 'd MMM, HH:mm', { locale: es })}
                  </span>
                  {log.opened_at && (
                    <span className="text-[10px] font-semibold uppercase opacity-80 text-primary flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Leído: {format(new Date(log.opened_at), 'd MMM, HH:mm', { locale: es })}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-none border-gray-50">
                <div className="text-right hidden md:block">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light opacity-40">Destinatario</p>
                  <p className="text-[10px] font-bold text-text-main">{log.guest_email}</p>
                </div>
                {log.booking_id && (
                  <div className="w-10 h-10 bg-sand text-secondary rounded-xl flex items-center justify-center cursor-help tooltip" title="Vinculado a una reserva">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-100">
            <Mail className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h4 className="font-serif font-black italic text-xl text-text-main">Silencio Digital</h4>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-300 mt-2">No se han registrado envíos recientes en este periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
};
