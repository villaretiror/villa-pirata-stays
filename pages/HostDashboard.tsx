import React, { useState, useEffect } from 'react';
import { Property, LocalGuideCategory, LocalGuideItem, Offer, CalendarSync, Review, User } from '../types';
import GuideCard from '../components/GuideCard';
import { fetchMockICal, parseICalData, mockImportFromLink } from '../utils';
import HostMenu from '../components/host/HostMenu';
import HostChat from '../components/host/HostChat';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { localAuth } from '../lib/auth';

// --- EXTRACTED COMPONENTS ---

interface ReviewManagerProps {
  property: Property;
  onUpdateStats: (propertyId: string, rating: number, count: number) => void;
  onAddReview: (propertyId: string, review: Review) => void;
}

const ReviewManager: React.FC<ReviewManagerProps> = ({ property, onUpdateStats, onAddReview }) => {
     const [isAdding, setIsAdding] = useState(false);
     const [newReview, setNewReview] = useState<Partial<Review>>({ rating: 5, source: 'Airbnb', date: 'Mayo 2024' });
     const [stats, setStats] = useState({ rating: property.rating, count: property.reviews });

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
         alert("Puntuación actualizada correctamente.");
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
                       onChange={e => setStats({...stats, rating: parseFloat(e.target.value)})}
                       className="w-full p-2 rounded-lg border text-sm font-bold"
                     />
                  </div>
                  <div className="flex-1">
                     <label className="text-[10px] text-gray-400 block mb-1">Total Reseñas</label>
                     <input 
                       type="number" 
                       value={stats.count} 
                       onChange={e => setStats({...stats, count: parseInt(e.target.value)})}
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
                  <h4 className="font-bold text-sm">Reseñas Destacadas ({property.reviewsList?.length || 0})</h4>
                  <button onClick={() => setIsAdding(!isAdding)} className="text-primary text-xs font-bold underline">
                     {isAdding ? 'Cancelar' : '+ Agregar Manualmente'}
                  </button>
               </div>

               {isAdding && (
                   <div className="bg-sand p-4 rounded-xl border border-orange-200 animate-fade-in">
                       <div className="grid grid-cols-2 gap-3 mb-3">
                          <input placeholder="Nombre Autor" className="p-2 rounded-lg text-sm" onChange={e => setNewReview({...newReview, author: e.target.value})} />
                          <input placeholder="Fecha (ej. Mayo 2024)" className="p-2 rounded-lg text-sm" onChange={e => setNewReview({...newReview, date: e.target.value})} />
                          <select className="p-2 rounded-lg text-sm bg-white" onChange={e => setNewReview({...newReview, source: e.target.value as any})}>
                             <option value="Airbnb">Airbnb</option>
                             <option value="Booking.com">Booking.com</option>
                             <option value="Google">Google</option>
                          </select>
                          <select className="p-2 rounded-lg text-sm bg-white" onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})}>
                             <option value={5}>5 Estrellas</option>
                             <option value={4}>4 Estrellas</option>
                          </select>
                       </div>
                       <textarea 
                         placeholder="Copia y pega aquí el texto de la reseña..." 
                         className="w-full p-3 rounded-lg text-sm mb-3 h-24"
                         onChange={e => setNewReview({...newReview, text: e.target.value})}
                       />
                       <button onClick={saveReview} className="w-full bg-primary text-white font-bold py-2 rounded-lg text-sm">Guardar Reseña</button>
                   </div>
               )}

               {property.reviewsList?.map(review => (
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

const GuideEditor = ({ item, onSave, onCancel }: { item: LocalGuideItem, onSave: (item: LocalGuideItem) => void, onCancel: () => void }) => {
    const [form, setForm] = useState(item);
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
          <h2 className="font-bold text-xl mb-4">Editar Lugar</h2>
          <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold uppercase text-text-light mb-1">Nombre</label>
               <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-lg bg-gray-50" />
             </div>
             <div>
               <label className="block text-xs font-bold uppercase text-text-light mb-1">Distancia (Tiempo)</label>
               <input value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} className="w-full p-2 border rounded-lg bg-gray-50" placeholder="e.g. 12 min" />
             </div>
             <div>
               <label className="block text-xs font-bold uppercase text-text-light mb-1">URL Imagen</label>
               <input value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="w-full p-2 border rounded-lg bg-gray-50" />
             </div>
             <div>
               <label className="block text-xs font-bold uppercase text-text-light mb-1">Descripción</label>
               <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="w-full p-2 border rounded-lg bg-gray-50 h-24" />
             </div>
             <div className="flex gap-3 pt-2">
               <button onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancelar</button>
               <button onClick={() => onSave(form)} className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20">Guardar</button>
             </div>
          </div>
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
                                Analizando...
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

const Editor = ({ property, onSave, onCancel }: { property: Property, onSave: (p: Property) => void, onCancel: () => void }) => {
    const [form, setForm] = useState(property);
    const [activeSection, setActiveSection] = useState<'info' | 'photos' | 'calendar' | 'fees' | 'offers'>('info');
    
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

    // Calendar Toggle Logic
    const toggleDateBlock = (dateStr: string) => {
       const isBlocked = form.blockedDates.includes(dateStr);
       let newBlocked;
       if (isBlocked) {
         newBlocked = form.blockedDates.filter(d => d !== dateStr);
       } else {
         newBlocked = [...form.blockedDates, dateStr];
       }
       setForm({ ...form, blockedDates: newBlocked });
    };

    // Calendar Sync Logic
    const syncExternalCalendars = async (syncItems: CalendarSync[]) => {
      setIsSyncing(true);
      let gatheredEvents: string[] = [];

      try {
        // Fetch all sync URLs
        for (const sync of syncItems) {
           const icalData = await fetchMockICal(sync.url);
           const events = parseICalData(icalData);
           gatheredEvents = [...gatheredEvents, ...events];
        }
        
        // Merge with existing MANUAL blocks
        const allUniqueDates = Array.from(new Set([...form.blockedDates, ...gatheredEvents]));
        
        setForm(prev => ({
          ...prev,
          blockedDates: allUniqueDates,
          calendarSync: prev.calendarSync.map(c => ({ ...c, lastSynced: new Date().toISOString() }))
        }));
        
      } catch (e) {
        console.error("Sync failed", e);
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
        lastSynced: new Date().toISOString()
      };
      
      const updatedSyncList = [...(form.calendarSync || []), newSync];
      
      // Update local state first to show the item
      setForm({ ...form, calendarSync: updatedSyncList });
      setNewSyncUrl('');

      // Immediately trigger a fetch for the new list
      await syncExternalCalendars(updatedSyncList);
    };

    const handleRemoveSync = (id: string) => {
      setForm({ ...form, calendarSync: (form.calendarSync || []).filter(c => c.id !== id) });
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
         
         days.push(
           <button 
             key={i}
             onClick={() => toggleDateBlock(dateStr)}
             className={`h-10 w-full rounded-lg text-xs font-bold transition-all ${isBlocked ? 'bg-gray-800 text-white' : 'bg-gray-100 text-text-main hover:bg-gray-200'}`}
           >
             <div className="flex flex-col items-center">
               <span>{i}</span>
               {isBlocked && <span className="text-[8px] uppercase">B</span>}
             </div>
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
                   {['D','L','M','M','J','V','S'].map(d => <div key={d}>{d}</div>)}
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
                  {form.calendarSync?.map((sync) => (
                    <div key={sync.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                       <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <span className="material-icons text-gray-500 text-sm">{platformIcons[sync.platform] || 'link'}</span>
                          </div>
                          <div className="min-w-0">
                             <p className="font-bold text-sm truncate">{sync.platform}</p>
                             <p className="text-[10px] text-gray-400 truncate w-32 md:w-48">{sync.url}</p>
                             <p className="text-[9px] text-green-600 font-bold mt-0.5">
                               Última sinc: {new Date(sync.lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                        https://api.villaretiro.com/ical/{form.id}.ics
                      </code>
                      <button className="text-primary text-[10px] font-bold uppercase hover:underline">Copiar</button>
                   </div>
                </div>
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
           
           <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {['info', 'photos', 'calendar', 'fees', 'offers'].map(section => (
                 <button 
                   key={section}
                   onClick={() => setActiveSection(section as any)}
                   className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${activeSection === section ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
                 >
                   {section}
                 </button>
              ))}
           </div>

           <div className="space-y-4">
              {activeSection === 'info' && (
                 <>
                   <input 
                     value={form.title} 
                     onChange={e => setForm({...form, title: e.target.value})} 
                     className="w-full p-3 border rounded-xl font-bold text-lg" 
                     placeholder="Título" 
                   />
                   <textarea 
                     value={form.description} 
                     onChange={e => setForm({...form, description: e.target.value})} 
                     className="w-full p-3 border rounded-xl h-32" 
                     placeholder="Descripción" 
                   />
                   <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="number"
                        value={form.price} 
                        onChange={e => setForm({...form, price: Number(e.target.value)})} 
                        className="w-full p-3 border rounded-xl" 
                        placeholder="Precio" 
                      />
                      <input 
                        value={form.location} 
                        onChange={e => setForm({...form, location: e.target.value})} 
                        className="w-full p-3 border rounded-xl" 
                        placeholder="Ubicación" 
                      />
                   </div>
                 </>
              )}
              
              {activeSection === 'calendar' && renderCalendarEditor()}
              
              {activeSection === 'photos' && <p className="text-gray-400 text-center py-10">Gestión de fotos próximamente.</p>}
              {activeSection === 'fees' && <p className="text-gray-400 text-center py-10">Configuración de tarifas próximamente.</p>}
              
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
                          {form.offers?.map((offer, i) => (
                              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                  <span className="text-sm">{offer.text}</span>
                                  <button onClick={() => handleRemoveOffer(i)} className="text-red-500"><span className="material-icons text-sm">delete</span></button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
           </div>

           <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
             <button onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancelar</button>
             <button onClick={() => onSave(form)} className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20">Guardar Cambios</button>
           </div>
        </div>
      </div>
    );
};

// --- MAIN COMPONENT ---

type Tab = 'today' | 'calendar' | 'listings' | 'guidebook' | 'messages' | 'reviews' | 'menu' | 'leads';

const HostDashboard: React.FC = () => {
  const { user } = useAuth();
  const { properties, localGuideData: guideData, updateProperties: onUpdateProperties, updateGuide: onUpdateGuide } = useProperty();
  
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [leads, setLeads] = useState<User[]>([]);
  
  // Property & Guide Editing State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingGuide, setIsEditingGuide] = useState<{catId: string, idx: number} | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Chat State (Controlled by Dashboard to open from "Today" view)
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- FETCH LEADS ---
  useEffect(() => {
    if (activeTab === 'leads') {
        const data = localAuth.getAllLeads();
        setLeads(data);
    }
  }, [activeTab]);

  // --- HANDLERS ---

  const handleSaveProperty = (updated: Property) => {
    // Check if it's a new property or existing
    const exists = properties.find(p => p.id === updated.id);
    if (exists) {
        const updatedProperties = properties.map(p => p.id === updated.id ? updated : p);
        onUpdateProperties(updatedProperties);
    } else {
        onUpdateProperties([...properties, updated]);
    }
    setIsEditing(null);
  };

  const handleSaveGuideItem = (updatedItem: LocalGuideItem, catId: string, itemIdx: number) => {
    const newGuide = guideData.map(cat => {
      if (cat.id === catId) {
        const newItems = [...cat.items];
        newItems[itemIdx] = updatedItem;
        return { ...cat, items: newItems };
      }
      return cat;
    });
    onUpdateGuide(newGuide);
    setIsEditingGuide(null);
  };

  const handleImport = async (url: string) => {
    setShowImportModal(false);
    // 1. Get Simulated Data
    const importedData = await mockImportFromLink(url);
    
    // 2. Create a full Property object merging defaults with imported data
    const newProperty: Property = {
        id: `imported-${Date.now()}`,
        title: importedData.title || "Nueva Propiedad",
        subtitle: "Recién importada",
        location: "Cabo Rojo, PR",
        address: "",
        description: importedData.description || "",
        price: importedData.price || 150,
        rating: importedData.rating || 0,
        reviews: importedData.reviews || 0,
        images: importedData.images || [],
        amenities: importedData.amenities || [],
        guests: 4,
        bedrooms: 2,
        beds: 2,
        baths: 1,
        fees: { cleaningShort: 50, cleaningMedium: 75, cleaningLong: 100, petFee: 30, securityDeposit: 100 },
        policies: { checkInTime: "15:00", checkOutTime: "11:00", maxGuests: 6, wifiName: "", wifiPass: "", accessCode: "" },
        blockedDates: [],
        calendarSync: [],
        host: properties[0]?.host || { name: user?.name || 'Host', image: user?.avatar || '', yearsHosting: 1 }
    };

    // 3. Add to list and immediately open editor
    onUpdateProperties([...properties, newProperty]);
    setIsEditing(newProperty.id);
  };

  // Check if an offer is expired
  const isOfferActive = (offer: Offer) => {
    return new Date(offer.expiresAt) > new Date();
  };

  // --- REVIEW MANAGEMENT ---
  const handleUpdateReviewStats = (propertyId: string, newRating: number, newCount: number) => {
      const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
              return { ...p, rating: newRating, reviews: newCount };
          }
          return p;
      });
      onUpdateProperties(updatedProps);
  };

  const handleAddManualReview = (propertyId: string, review: Review) => {
      const updatedProps = properties.map(p => {
          if (p.id === propertyId) {
              const currentReviews = p.reviewsList || [];
              return { ...p, reviewsList: [review, ...currentReviews] };
          }
          return p;
      });
      onUpdateProperties(updatedProps);
  };

  // --- RENDERERS ---

  const renderToday = () => (
    <div className="space-y-6">
       {/* Filters/Tabs */}
       <div className="flex items-center gap-4 mt-2">
           <button className="bg-white border border-transparent shadow-sm px-4 py-1.5 rounded-full text-sm font-bold text-text-main ring-1 ring-black/5">
             Próximos
           </button>
           <button className="text-sm font-medium text-text-light hover:text-text-main px-2">
             Hospedando
           </button>
           <button className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
             <span className="material-icons text-sm">tune</span>
           </button>
        </div>

        {/* Section Title */}
        <div className="flex justify-between items-center pt-2">
          <h2 className="text-xl font-bold">Tienes 1 reserva</h2>
        </div>

        {/* Specific Reservation Card */}
        <article className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
          
          <div className="flex justify-between items-start mb-4">
             <div className="bg-sand/80 px-3 py-1 rounded-lg text-xs font-bold text-text-main border border-orange-100">
               Check-in hoy
             </div>
             <span className="font-bold text-text-main">3:00 PM</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
               <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-md">
                 <img src="https://i.pravatar.cc/150?img=32" alt="Meliza" className="w-full h-full object-cover" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                 <span className="material-icons text-primary text-xs">chat_bubble</span>
               </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main leading-tight">Grupo de Meliza (7)</h3>
              <p className="text-xs text-text-light font-medium mt-0.5">Llegan pronto</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC83oioenIjcT4wBU08nghv-208PfMNLvznO8NyLjU6Wo0R2jFpni4EjACAljmDBw2mQmNTFyHzwLFoceJ2ZH9K0OHV_7Ozplpj0uBMngFAR2BeiP7Gz1A7uvKyxrNlzQqCoIvQgQIl3-IIYxvnpvQ8_Quo8GPP3YslJlSZLr-N64Ud_t68nQ8zW2dBIwxXImcMzgFZoHKQbNt1wDEjHf_mvUj-rIRa5-e4lLqU3ThIDaBnMpKI_LyM2dOE1Du37RqAIIPNt7WzxeE" alt="Property" className="w-10 h-10 rounded-lg object-cover" />
             <div className="overflow-hidden">
               <h4 className="font-bold text-sm truncate">Villa Retiro R</h4>
               <p className="text-xs text-text-light truncate">Piscina • 15 min de Buyé • Familiar</p>
             </div>
          </div>
          
          <div className="mt-5 flex items-center gap-3">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span className="material-icons text-sm">forum</span>
              Mensaje
            </button>
            <button className="w-12 h-12 bg-white border border-gray-200 text-text-main rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
               <span className="material-icons">call</span>
            </button>
          </div>
        </article>
    </div>
  );

  const renderLeads = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-4 flex gap-3">
             <div className="bg-green-100 p-2 rounded-lg text-green-700 h-fit">
               <span className="material-icons">database</span>
             </div>
             <div>
                <h3 className="font-bold text-green-800 text-sm">Base de Datos de Clientes (Local)</h3>
                <p className="text-xs text-green-700 leading-relaxed mt-1">
                    Aquí se guardan automáticamente los datos de las personas que se registran en la app.
                    Útil para marketing y seguimiento.
                </p>
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-text-main">Clientes Registrados</h3>
                <span className="bg-gray-100 text-xs font-bold px-2 py-1 rounded-full">{leads.length}</span>
             </div>
             
             {leads.length === 0 ? (
                 <div className="p-8 text-center text-gray-400 text-sm">
                     Aún no hay clientes registrados.
                 </div>
             ) : (
                 <div className="divide-y divide-gray-100">
                     {leads.map((lead, i) => (
                         <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold">
                                    {lead.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-text-main">{lead.name}</p>
                                    <p className="text-xs text-text-light">{lead.email}</p>
                                </div>
                             </div>
                             <button className="text-primary text-xs font-bold hover:underline">Ver Detalles</button>
                         </div>
                     ))}
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

          {properties.map(p => (
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
    <div className="space-y-8 animate-fade-in">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
        <h3 className="font-bold text-blue-800 text-sm mb-1">Gestor de Guía Local</h3>
        <p className="text-xs text-blue-600">Edita lugares para asegurar que los huéspedes tengan información precisa.</p>
      </div>

      {guideData.map((category) => (
        <div key={category.id}>
           <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
             <span className="material-icons text-secondary">{category.icon}</span>
             {category.category}
           </h3>
           <div className="grid grid-cols-2 gap-4">
              {category.items.map((item, idx) => (
                <div key={idx} className="h-64">
                   <GuideCard 
                     item={item} 
                     isEditable={true} 
                     onEdit={() => setIsEditingGuide({catId: category.id, idx})} 
                   />
                </div>
              ))}
           </div>
        </div>
      ))}
    </div>
  );

  const renderListings = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold font-serif">Tus Propiedades</h2>
         <div className="flex gap-2">
            <button 
                onClick={() => setShowImportModal(true)}
                className="bg-white text-text-main border border-gray-200 rounded-full px-4 py-2 text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"
            >
                <span className="material-icons text-sm text-[#FF385C]">download</span> Importar
            </button>
            <button className="bg-black text-white rounded-full p-2 w-8 h-8 flex items-center justify-center shadow-lg">
                <span className="material-icons text-sm">add</span>
            </button>
         </div>
       </div>

       {properties.map(p => {
         // Filter active offers to display active count
         const activeOffersCount = p.offers?.filter(isOfferActive).length || 0;
         
         return (
         <div key={p.id} className="bg-white rounded-2xl p-4 shadow-card flex gap-4 border border-gray-100">
            <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative">
               <img src={p.images[0] || 'https://placehold.co/400'} className="w-full h-full object-cover" alt="Listing" />
               <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                 ★ {p.rating || 'N/A'}
               </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
               <div>
                 <h3 className="font-bold text-text-main leading-tight">{p.title}</h3>
                 <div className="flex items-center gap-2 mt-1">
                   {activeOffersCount > 0 && (
                     <span className="bg-orange-100 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                       <span className="material-icons text-[10px]">local_offer</span> {activeOffersCount} Ofertas Activas
                     </span>
                   )}
                 </div>
                 <p className="text-xs text-text-light mt-1 line-clamp-1">{p.description}</p>
               </div>
               <div className="flex justify-between items-end mt-2">
                  <div className="text-sm font-bold text-primary">${p.price}<span className="text-text-light text-xs font-normal">/noche</span></div>
                  <button 
                    onClick={() => setIsEditing(p.id)}
                    className="text-xs font-bold border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-black hover:text-white transition-colors"
                  >
                    Editar
                  </button>
               </div>
            </div>
         </div>
       )})}
    </div>
  );

  const editingProperty = properties.find(p => p.id === isEditing);

  return (
    <div className="bg-sand min-h-screen pb-24 font-display text-text-main">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-sand/95 backdrop-blur-md px-6 pt-12 pb-2 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-main capitalize">
          {activeTab === 'today' && 'Hoy'}
          {activeTab === 'listings' && 'Listados'}
          {activeTab === 'guidebook' && 'Guía'}
          {activeTab === 'menu' && 'Menú'}
          {activeTab === 'reviews' && 'Reseñas'}
          {activeTab === 'messages' && 'Mensajes'}
          {activeTab === 'leads' && 'Clientes'}
        </h1>
        <button 
          onClick={() => onNavigate && onNavigate('home')}
          className="text-xs font-bold text-text-main border border-gray-300 bg-white px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
        >
          Modo Viajero
        </button>
      </header>

      <main className="px-6 mt-4">
         {activeTab === 'today' && renderToday()}
         {activeTab === 'guidebook' && renderGuidebook()}
         {activeTab === 'listings' && renderListings()}
         {activeTab === 'reviews' && renderReviews()}
         {activeTab === 'leads' && renderLeads()}
         {activeTab === 'menu' && <HostMenu properties={properties} onNavigate={onNavigate} />}
         {activeTab === 'messages' && <div className="text-center py-10 text-gray-400">Centro de mensajes (Próximamente)</div>}
      </main>

      {/* Overlays */}
      <HostChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      {editingProperty && <Editor property={editingProperty} onSave={handleSaveProperty} onCancel={() => setIsEditing(null)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
      
      {isEditingGuide && (
         <GuideEditor 
           item={guideData.find(c => c.id === isEditingGuide.catId)!.items[isEditingGuide.idx]} 
           onSave={(item) => handleSaveGuideItem(item, isEditingGuide.catId, isEditingGuide.idx)}
           onCancel={() => setIsEditingGuide(null)}
         />
      )}

      {/* Host Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] z-40 overflow-x-auto no-scrollbar">
        <div className="flex justify-around items-center px-4 pb-2 min-w-max gap-6 sm:gap-0 sm:min-w-0 sm:w-full">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'today' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">today</span>
            <span className="text-[10px] font-bold">Hoy</span>
          </button>

          <button 
            onClick={() => setActiveTab('listings')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'listings' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">format_list_bulleted</span>
            <span className="text-[10px] font-bold">Listados</span>
          </button>

          <button 
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'leads' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">group</span>
            <span className="text-[10px] font-bold">Clientes</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'reviews' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">star</span>
            <span className="text-[10px] font-bold">Reseñas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('guidebook')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'guidebook' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">map</span>
            <span className="text-[10px] font-bold">Guía</span>
          </button>

          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'messages' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className="relative">
              <span className="material-icons">chat_bubble_outline</span>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">6</span>
            </div>
            <span className="text-[10px] font-bold">Mensajes</span>
          </button>

          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'menu' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons">menu</span>
            <span className="text-[10px] font-bold">Menú</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default HostDashboard;