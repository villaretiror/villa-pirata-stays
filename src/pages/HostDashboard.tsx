import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHostDashboard } from '../hooks/useHostDashboard';
import { HostTab } from '../types/host';
import { HOST_PHONE } from '../constants';
import { formatDateLong, generateWhatsAppLink, getHostInstructionMessage, importPropertyFromUrl } from '../utils';
import { supabase } from '../lib/supabase';
import FilteredGallery from '../components/FilteredGallery';
import { PropertyImage } from '../types';


// Shared Host Components
import HostNavbar from '../components/host/HostNavbar';
import HostChat from '../components/host/HostChat';
import HostMessageCenter from '../components/host/HostMessageCenter';
import SavingsInsights from '../components/host/SavingsInsights';
import ExperienceManager from '../components/host/ExperienceManager';
import SiteSettingsManager from '../components/host/SiteSettingsManager';
import InsightViewer from '../components/host/InsightViewer';
import HostAvailabilityManager from '../components/host/HostAvailabilityManager';
import PropertyEditorModal from '../components/host/PropertyEditorModal';
import { DigitalConcierge } from '../components/host/DigitalConcierge';
import { LoadingSpinner, CustomToast } from '../components/host/common';

// Extracted Components
import { ImportModal } from '../components/host/ImportModal';
import { AnalysisDashboard } from '../components/host/AnalysisDashboard';
import { ReviewManager } from '../components/host/ReviewManager';
import { CohostManager } from '../components/host/CohostManager';
import { NotificationInbox } from '../components/host/NotificationInbox';
import { WelcomeModal } from '../components/host/WelcomeModal';
import { SmartValidationModal } from '../components/host/SmartValidationModal';

// Icons
import { 
  Zap, Home, BarChart3, CreditCard, Users, Star, Sparkles, 
  RefreshCcw, Anchor, Calendar, Send, Tag, CheckCircle2, 
  Plus 
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../utils/toast';
import HostMenu from '../components/host/HostMenu';

// Lazy Loaded Recharts
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const Area = lazy(() => import('recharts').then(m => ({ default: m.Area })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));

const HostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HostTab>('today');
  
  // 🔱 MASTER HOOK: Unified Intelligence Hub
  const {
    leads, urgentAlerts, hotCheckins, pendingPayments, properties, 
    totalRevenue, monthlyRevenue, chartData, propertyPerformance, globalExpenses,
    realBookings, guideData,
    isLoading, isSaving, error, fetchData, approvePayment, rejectPayment,
    resolveNotification, saveProperty, addTag, saltyBriefing
  } = useHostDashboard();

  const authUser = user as any;

  // Local UI State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [showSmartValidation, setShowSmartValidation] = useState<any | null>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState<string>('all');
  const [galleryPropertyId, setGalleryPropertyId] = useState<string | null>(null);

  const onNavigate = (path: string) => {
    if (path === 'home') navigate('/');
    else navigate(path);
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
      await supabase.from('bookings').update({ instructions_sent_at: new Date().toISOString() }).eq('id', booking.id);
      showToast("🚀 Instrucciones enviadas");
    } catch (err) { showToast("❌ Error al enviar email"); }
  };

  const handleImport = async (url: string) => {
    setShowImportModal(false);
    try {
      showToast("Importando flota... 🪄");
      const importedData: any = await importPropertyFromUrl(url);
      if (!importedData) throw new Error("Fallo");
      const { error } = await supabase.from('properties').insert({
        host_id: authUser?.id,
        title: importedData.title,
        price: importedData.price || 150,
        email: authUser?.email?.toLowerCase() || ''
      });
      if (error) throw error;
      fetchData();
      showToast('Importada con éxito ✨');
    } catch (e) { showToast("Error al importar."); }
  };

  const renderToday = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32">
      {/* ⚠️ Unified Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex items-center gap-3 animate-shake">
          <span className="material-icons text-red-500">error_outline</span>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">{error}</p>
        </div>
      )}

      {/* Salty AI Card */}
      <motion.div className="bg-gradient-to-br from-[#0A0D14] to-[#1A1F2B] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Anchor className="w-5 h-5 text-primary" />
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-primary">Salty AI Briefing</span>
                <span className="block text-[10px] font-bold text-white/40 tracking-wider font-display uppercase">{new Date().toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <button onClick={() => fetchData()} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 shadow-lg active:rotate-180 duration-500">
               <RefreshCcw className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-black italic tracking-tighter mb-8 leading-tight">
            "{saltyBriefing}"
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/5">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black uppercase text-white/40 mb-1">Check-ins</p><p className="text-xl font-bold">{hotCheckins.length}</p></div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black uppercase text-white/40 mb-1">Leads CRM</p><p className="text-xl font-bold">{leads.length}</p></div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black uppercase text-white/40 mb-1">Alertas</p><p className="text-xl font-bold text-red-400">{urgentAlerts.length}</p></div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black uppercase text-white/40 mb-1">Ingreso Mes</p><p className="text-xl font-bold text-primary-light">${monthlyRevenue.toLocaleString()}</p></div>
          </div>
        </div>
      </motion.div>

      <NotificationInbox 
        leads={leads} 
        alerts={urgentAlerts} 
        pendingPayments={pendingPayments} 
        onResolve={(type, id) => {
          if (type === 'payment') setShowSmartValidation(pendingPayments.find(p => p.id === id));
          else resolveNotification(type === 'lead' ? 'lead' : 'alert', id);
        }} 
      />

      {/* Hot Hotlist */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft">
        <h3 className="font-serif font-black italic text-xl mb-6 flex items-center gap-2.5 tracking-tighter">
           <Calendar className="w-5 h-5 text-primary" /> Check-ins Próximos
        </h3>
        <div className="space-y-4">
          {hotCheckins.map(booking => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-sand flex items-center justify-center font-black text-secondary">
                   {booking.profiles?.avatar_url ? <img src={booking.profiles.avatar_url} alt="User" /> : booking.profiles?.full_name?.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-text-main group-hover:text-primary transition-colors">{booking.profiles?.full_name || 'Huésped'}</h4>
                  <p className="text-[9px] font-bold uppercase text-text-light opacity-50 tracking-widest mt-0.5">{formatDateLong(booking.check_in)}</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <p className="text-xl font-serif font-black italic text-green-600 tracking-tighter">${booking.total_price}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                       const msg = getHostInstructionMessage({ guestName: booking.profiles?.full_name || 'Huésped', propertyName: booking.properties?.title || 'Villa', accessCode: "C-" + (booking.id || '').slice(-4), googleMapsLink: "https://maps.google.com/?q=Villa+Retiro+R" });
                       window.open(generateWhatsAppLink(booking.profiles?.phone || HOST_PHONE, msg), '_blank');
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-all"
                  >
                     <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4 brightness-0 invert" alt="WA" />
                  </button>
                  <button onClick={() => handleSendAccessEmail(booking)} className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-all"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {hotCheckins.length === 0 && (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
               <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Sin llegadas inmediatas</p>
            </div>
          )}
        </div>
      </div>

      <SavingsInsights bookings={hotCheckins as any} />
      
      {/* Dynamic Mini-Chart */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-gray-300">Desempeño Visual (6M)</h3>
        <div className="h-44 w-full">
           <Suspense fallback={<div className="h-full bg-gray-50/50 animate-pulse rounded-2xl" />}>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <XAxis dataKey="label" hide />
                    <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="val" stroke="#CBB28A" fill="#CBB28A" fillOpacity={0.05} strokeWidth={4} />
                 </AreaChart>
              </ResponsiveContainer>
           </Suspense>
        </div>
      </div>
    </motion.div>
  );

  const renderSettings = () => (
    <div className="space-y-12 pb-32">
       <SiteSettingsManager />
       <div className="px-6 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-2">Propiedades Maestro</p>
          <div className="grid grid-cols-1 gap-6">
            {properties.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-soft group">
                 <div className="flex items-center gap-4">
                    <img src={p.images?.[0]} className="w-12 h-12 rounded-2xl object-cover border border-gray-100" alt="V" />
                    <div><h4 className="font-black text-sm italic font-serif">{p.title}</h4><p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{p.location}</p></div>
                 </div>
                 <button onClick={() => setIsEditing(p.id)} className="px-6 py-3 bg-gray-50 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all shadow-sm">Configurar</button>
              </div>
            ))}
          </div>
       </div>
    </div>
  );

  return (
    <div className="bg-sand min-h-screen pb-24 font-display text-text-main relative overflow-x-hidden">
      <Suspense fallback={<LoadingSpinner />}>
        {(isLoading || isSaving) && <LoadingSpinner />}
        <CustomToast />
        <HostNavbar activeTab={activeTab} onNavigateHome={() => onNavigate('home')} />
        
        <main className="px-6 mt-4 max-w-5xl mx-auto min-h-[70vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'today' && renderToday()}
              {activeTab === 'listings' && (
                <div className="space-y-8 pb-32">
                  <div className="flex justify-between items-center px-2">
                     <h2 className="text-3xl font-serif font-black italic tracking-tighter">Tu Flota de Autor</h2>
                     <button onClick={() => setShowImportModal(true)} className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-primary transition-all active:scale-90"><Plus /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {properties.map(p => (
                       <div key={p.id} className="bg-white rounded-[3rem] shadow-soft border border-gray-100 overflow-hidden">
                         {/* Property Card Header */}
                         <div className="p-6 flex gap-6 group">
                           <div className="w-32 h-32 rounded-[2rem] overflow-hidden shadow-inner flex-shrink-0">
                             <img
                               src={((p.images_meta as unknown as PropertyImage[])?.find((m: PropertyImage) => m.category === 'piscina') || (p.images_meta as unknown as PropertyImage[])?.[0])?.url || p.images?.[0]}
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                               alt="Villa"
                             />
                           </div>
                           <div className="flex-1 flex flex-col justify-between py-1">
                             <div>
                               <h3 className="font-serif font-black italic text-xl tracking-tighter text-text-main line-clamp-1">{p.title}</h3>
                               <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-1">Ref: {p.id.slice(0, 5)}</p>
                               {Array.isArray(p.images_meta) && (
                                 <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-1">
                                   {(p.images_meta as unknown as PropertyImage[]).length} fotos organizadas
                                 </p>
                               )}
                             </div>
                             <div className="flex gap-2 mt-4">
                               <button
                                 onClick={() => setIsEditing(p.id)}
                                 className="flex-1 bg-gray-50 text-[9px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm"
                               >
                                 Editar
                               </button>
                               {Array.isArray(p.images_meta) && (p.images_meta as unknown as PropertyImage[]).length > 0 && (
                                 <button
                                   onClick={() => setGalleryPropertyId(galleryPropertyId === p.id ? null : p.id)}
                                   className={`flex-1 text-[9px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl transition-all shadow-sm ${
                                     galleryPropertyId === p.id
                                       ? 'bg-primary text-white'
                                       : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                                   }`}
                                 >
                                   {galleryPropertyId === p.id ? '▲ Cerrar' : '📸 Galería'}
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>

                         {/* Expandable Gallery Panel */}
                         {galleryPropertyId === p.id && Array.isArray(p.images_meta) && (p.images_meta as unknown as PropertyImage[]).length > 0 && (
                           <div className="border-t border-gray-50 px-6 pb-6 pt-4">
                             <FilteredGallery
                               images_meta={p.images_meta as unknown as PropertyImage[]}
                               images={p.images || []}
                               title={p.title}
                               compact={true}
                             />
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                </div>
              )}
              {activeTab === 'analytics' && <AnalysisDashboard bookings={realBookings as any} expenses={globalExpenses} properties={properties} selectedPropertyId={analyticsFilter} onFilterChange={setAnalyticsFilter} />}
              {activeTab === 'payments' && (
                <div className="space-y-8 pb-32">
                   <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl"><h2 className="text-3xl font-serif font-black italic tracking-tighter mb-2">Pasarela de Pagos</h2><p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Auditoría Financiera y Conciliación Multi-Canal</p></div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {pendingPayments.map(p => (
                        <div key={p.id} className="bg-white p-8 rounded-[3.5rem] shadow-soft border border-gray-100 hover:border-primary/20 transition-all">
                           <div className="flex items-center gap-4 mb-8">
                              <img src={p.profiles?.avatar_url || "https://i.pravatar.cc/100"} className="w-14 h-14 rounded-full border-4 border-white shadow-float" alt="U" />
                              <div><h4 className="font-black text-xl italic font-serif leading-none">{p.profiles?.full_name}</h4><p className="text-2xl font-serif font-black text-green-600 mt-2 tracking-tighter">${p.total_price}</p></div>
                           </div>
                           <div className="aspect-video bg-gray-50 rounded-[2.5rem] border border-gray-100 overflow-hidden mb-8 shadow-inner"><img src={p.payment_proof_url || undefined} alt="Proof" className="w-full h-full object-contain p-4 transition-transform hover:scale-105 duration-700" /></div>
                           <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => approvePayment(p.id)} className="bg-black text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl active:scale-95"><CheckCircle2 className="w-4 h-4 text-primary" /> Confirmar</button>
                              <button onClick={() => rejectPayment(p.id, "Comprobante no válido")} className="bg-white border border-gray-100 text-red-500 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-50 transition-all">Rechazar</button>
                           </div>
                        </div>
                      ))}
                      {pendingPayments.length === 0 && <div className="col-span-full py-24 text-center bg-white/50 rounded-[4rem] border-2 border-dashed border-gray-100"><p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.4em]">Flujo de caja conciliado</p></div>}
                   </div>
                </div>
              )}
              {activeTab === 'leads' && (
                <div className="space-y-8 pb-32">
                   <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden"><h2 className="text-3xl font-serif font-black italic tracking-tighter">Base CRM Salty Intelligence</h2><p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Fidelización y Marketing de Proximidad</p></div>
                   <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-soft overflow-hidden">
                      {leads.map((l: any, i) => (
                        <div key={i} className="p-6 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-sand rounded-full flex items-center justify-center font-black text-secondary border border-white shadow-sm">{l.full_name?.charAt(0)}</div>
                              <div><p className="font-black text-sm text-text-main">{l.full_name}</p><p className="text-[9px] font-bold text-primary uppercase opacity-60 tracking-widest leading-none mt-1">{l.email}</p></div>
                           </div>
                           <button onClick={() => { const newTag = window.prompt("Nueva Etiqueta:"); if(newTag) addTag('lead', l.id, [...(l.tags || []), newTag]); }} className="p-3 bg-gray-50 rounded-full hover:bg-primary/10 transition-all"><Tag className="w-4 h-4 text-gray-300" /></button>
                        </div>
                      ))}
                   </div>
                </div>
              )}
              
              {/* Orphaned Portals Re-Connected via Command Hub State */}
              {activeTab === 'reviews' && (
                <div className="space-y-12 pb-32">
                    <div className="bg-black p-12 rounded-[3.5rem] text-white shadow-2xl flex justify-between items-center">
                      <div><h2 className="text-4xl font-serif font-black italic tracking-tighter">Legado de Prestigio</h2><p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.4em] mt-4">Gestión de Testimonios Salty Elite</p></div>
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 animate-pulse"><Star className="w-10 h-10 text-primary" /></div>
                    </div>
                    {properties.map(p => (
                      <ReviewManager key={p.id} property={p} onAddReview={(id, r) => saveProperty({ ...p, reviews_list: [r, ...(p.reviews_list || [])] } as any)} onUpdateStats={(id, r, c) => saveProperty({ ...p, rating: r, reviews_count: c } as any)} />
                    ))}
                </div>
              )}
              {activeTab === 'team' && (
                 <div className="space-y-12 pb-32">
                    {properties.map(p => (
                       <div key={p.id} className="space-y-6">
                          <h3 className="font-serif font-black text-2xl italic tracking-tighter px-4 border-l-4 border-primary ml-2">{p.title}</h3>
                          <CohostManager propertyId={p.id} propertyName={p.title} onShowToast={showToast} />
                       </div>
                    ))}
                 </div>
              )}
              {activeTab === 'guidebook' && <ExperienceManager guideData={guideData} />}
              {activeTab === 'messages' && <HostMessageCenter hostAvatar={authUser?.avatar_url} onNavigate={(tab: any) => setActiveTab(tab)} />}
              {activeTab === 'concierge' && <DigitalConcierge />}
              {activeTab === 'insights' && <InsightViewer onNavigate={(view: any) => setActiveTab(view)} />}
              {activeTab === 'availability' && <HostAvailabilityManager properties={properties} onRefresh={fetchData} />}
              {activeTab === 'menu' && <HostMenu properties={properties} onNavigate={(view: any) => setActiveTab(view)} onGoToProtocol={() => setActiveTab('guidebook')} onGoToTeam={() => setActiveTab('team')} onGoToConcierge={() => setActiveTab('concierge')} />}
              {activeTab === 'settings' && renderSettings()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Overlays */}
        <HostChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} message={welcomeMessage} />
        {showSmartValidation && <SmartValidationModal data={showSmartValidation} onConfirm={approvePayment} onClose={() => setShowSmartValidation(null)} />}
        {isEditing && properties.find(p => p.id === isEditing) && <PropertyEditorModal property={properties.find(p => p.id === isEditing) as any} realBookings={hotCheckins as any} onSave={saveProperty as any} onCancel={() => setIsEditing(null)} isSaving={isSaving} onRefresh={fetchData} />}
        {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
        
        {/* 🔱 THE SOVEREIGN ORB: Radical Command Hub Trigger */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
           <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('menu')}
              className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 group relative"
           >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all"></div>
              <Anchor className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-500 relative z-10" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-black rounded-full animate-pulse z-20"></div>
           </motion.button>
        </div>

        {/* 🗺️ STRATEGIC NAVIGATION HUB */}
        <nav className="fixed bottom-0 w-full bg-sand/80 backdrop-blur-2xl border-t border-gray-100/50 pb-safe pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 overflow-hidden">
           <div className="flex justify-between items-center px-8 relative max-w-lg mx-auto">
              {[
                { id: 'today', icon: Zap, label: 'Hoy' },
                { id: 'listings', icon: Home, label: 'Villas' },
                { id: 'spacer', icon: null, label: null }, // Space for the Orb
                { id: 'analytics', icon: BarChart3, label: 'Intel' },
                { id: 'leads', icon: Users, label: 'CRM' }
              ].map((item, idx) => {
                if (item.id === 'spacer') return <div key={idx} className="w-16" />;
                const Icon = item.icon as any;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as HostTab)} 
                    className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-text-main py-1' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {activeTab === item.id && (
                      <motion.div layoutId="navActive" className="absolute -top-4 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#CBB28A]" />
                    )}
                    <Icon className={`w-5 h-5 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] font-display">{item.label}</span>
                  </button>
                );
              })}
           </div>
        </nav>
      </Suspense>
    </div>
  );
};

export default HostDashboard;