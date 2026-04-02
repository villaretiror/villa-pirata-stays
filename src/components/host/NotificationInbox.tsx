import React from 'react';
import { Bell, Check } from 'lucide-react';
import { getSourceBadge } from './common';
import { NotificationItem } from '../../types/host';

interface NotificationInboxProps {
  leads: any[];
  alerts: any[];
  pendingPayments: any[];
  onResolve: (type: 'lead' | 'alert' | 'payment', id: string) => void;
}

/**
 * 🛰️ NOTIFICATION INBOX (Salty Command Center)
 * Centralized alerts for leads, system warnings, and pending validations.
 */
export const NotificationInbox: React.FC<NotificationInboxProps> = ({ 
  leads, 
  alerts, 
  pendingPayments, 
  onResolve 
}) => {
  const allNotifications: NotificationItem[] = [
    ...leads.map(l => ({ 
      ...l, 
      type: 'lead' as const, 
      icon: 'user' as any, 
      color: 'text-blue-500', 
      created_at: l.created_at || new Date().toISOString() 
    })),
    ...alerts.map(a => ({ 
      ...a, 
      type: 'alert' as const, 
      icon: 'alert-triangle' as any, 
      color: 'text-red-500', 
      created_at: a.created_at || new Date().toISOString() 
    })),
    ...pendingPayments.map(p => ({ 
      ...p, 
      type: 'payment' as const, 
      icon: 'credit-card' as any, 
      color: 'text-primary', 
      name: p.profiles?.full_name || 'Huésped', 
      created_at: p.created_at || new Date().toISOString() 
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as any[];

  if (allNotifications.length === 0) return null;

  // Icon mapping helper (since icons are passed as generic names in the original)
  const renderIcon = (type: string) => {
    // In the original, the icons were passed as components. 
    // Here we use the color and type to distinguish.
    return null; // The parent usually handles specific icons, but here we can use placeholders or Lucide
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-soft overflow-hidden mb-8 animate-fade-in print:hidden">
      <div className="px-8 py-5 bg-gray-50/30 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-main flex items-center gap-3">
          <Bell className="w-4 h-4 text-primary animate-pulse" />
          Centro de Alertas
        </h3>
        <span className="bg-primary text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg shadow-primary/20">
          {allNotifications.length} Pendientes
        </span>
      </div>
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto no-scrollbar">
        {allNotifications.map((n: any) => (
          <div key={`${n.type}-${n.id}`} className="p-6 hover:bg-gray-50/50 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full bg-sand/30 flex items-center justify-center ${n.color} border border-white shadow-sm transition-transform group-hover:scale-110`}>
                 <span className="material-icons text-xl">
                   {n.type === 'lead' ? 'person' : n.type === 'alert' ? 'warning' : 'payments'}
                 </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-black text-text-main truncate max-w-[200px]">
                    {n.full_name || n.profiles?.full_name || 'Novedad Crítica'}
                  </p>
                  {n.type === 'payment' && getSourceBadge(n.source)}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-text-light mt-1 flex items-center gap-2">
                  {n.type === 'lead' && <span className="text-blue-500">Nuevo Lead Interesado</span>}
                  {n.type === 'alert' && (
                    <span className="flex items-center gap-2 text-red-500">
                      <span className="font-black">[{n.severity || 1}/5]</span> {n.message}
                      {n.severity >= 4 && <span className="bg-red-500 text-white text-[7px] px-2 py-0.5 rounded-full animate-pulse tracking-tighter">Impacto Crítico</span>}
                    </span>
                  )}
                  {n.type === 'payment' && <span className="text-primary">Validación de Pago Pendiente</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => onResolve(n.type, n.id)}
              className="p-3 opacity-0 group-hover:opacity-100 bg-white border border-gray-100 rounded-full hover:bg-black hover:text-white transition-all shadow-soft active:scale-90"
              title="Marcar como resuelto"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
