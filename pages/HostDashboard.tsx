import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property, LocalGuideCategory, LocalGuideItem, Offer, CalendarSync, Review, User } from '../types';
import GuideCard from '../components/GuideCard';
import { fetchMockICal, parseICalData, mockImportFromLink } from '../utils';
import HostMenu from '../components/host/HostMenu';
import HostChat from '../components/host/HostChat';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

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
          <h4 className="font-bold text-sm">Reseñas Destacadas ({property.reviewsList?.length || 0})</h4>
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
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-text-light mb-1">Distancia (Tiempo)</label>
            <input value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50" placeholder="e.g. 12 min" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-text-light mb-1">URL Imagen</label>
            <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-text-light mb-1">Descripción</label>
            <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 h-24" />
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
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'photos' | 'calendar' | 'fees' | 'offers'>('info');

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('villas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('villas')
        .getPublicUrl(filePath);

      return data.publicUrl;
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
      for (const sync of syncItems) {
        const icalData = await fetchMockICal(sync.url);
        const events = parseICalData(icalData);
        gatheredEvents = [...gatheredEvents, ...events];
      }

      const allUniqueDates = Array.from(new Set([...form.blockedDates, ...gatheredEvents]));

      const updatedForm = {
        ...form,
        blockedDates: allUniqueDates,
        calendarSync: form.calendarSync.map(c => ({ ...c, lastSynced: new Date().toISOString() }))
      };

      setForm(updatedForm);
      // Auto-save to Context for Real-Time effect across the app
      onSave(updatedForm);
      showToast("Sincronización completada.");
    } catch (e) {
      console.error("Sync failed", e);
      showToast("No se pudo conectar con el servidor de iCal.");
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
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d}>{d}</div>)}
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
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 border rounded-xl font-bold text-lg"
                placeholder="Título"
              />
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 border rounded-xl h-32"
                placeholder="Descripción"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                  placeholder="Precio"
                />
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                  placeholder="Ubicación"
                />
              </div>
            </>
          )}

          {activeSection === 'calendar' && renderCalendarEditor()}

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
                {form.images.map((img, i) => (
                  <div key={i} className="relative group rounded-3xl overflow-hidden shadow-soft border-2 border-transparent hover:border-primary transition-all cursor-move">
                    <img src={img} className="w-full h-32 object-cover" alt="Property" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm p-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-icons text-white text-sm">drag_indicator</span>
                      <button onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}>
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { properties, localGuideData: guideData, updateProperties: onUpdateProperties, updateGuide: onUpdateGuide } = useProperty();

  const onNavigate = (path: string) => {
    if (path === 'home') navigate('/');
    else navigate(path);
  };

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [leads, setLeads] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingGuide, setIsEditingGuide] = useState<{ catId: string, idx: number } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Real-time Database State
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [cleaningStatus, setCleaningStatus] = useState<'ready' | 'progress' | 'dirty'>('ready');

  // --- SYNC WITH SUPABASE ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Properties from DB
      const { data: props } = await supabase.from('properties').select('*');
      if (props && props.length > 0) {
        const mappedProps = props.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: Number(p.price_per_night),
          location: p.location,
          images: p.images || [],
          amenities: p.amenities || [],
          guests: p.max_guests,
          // Re-mapping deeper fields to satisfy Property type
          featuredAmenity: p.amenities?.[0],
          rating: 4.8,
          reviews: 12,
          subtitle: "Villa Privada",
          address: p.location,
          bedrooms: 2, beds: 2, baths: 1,
          fees: { cleaningShort: 50, cleaningMedium: 75, cleaningLong: 100, petFee: 30, securityDeposit: 200 },
          policies: { checkInTime: "15:00", checkOutTime: "11:00", maxGuests: p.max_guests, wifiName: "Villa_WiFi", wifiPass: "familia123", accessCode: "4532" },
          blockedDates: [],
          calendarSync: [],
          host: { name: user?.name || 'Anfitrión', image: user?.avatar || '', yearsHosting: 3, badges: ['Superhost'] }
        } as Property));
        onUpdateProperties(mappedProps);
      }

      // 2. Fetch Bookings joined with User Profiles
      const today = new Date().toISOString().split('T')[0];
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          properties:property_id (title, images)
        `)
        .eq('check_in', today);

      if (bookings) setRealBookings(bookings);
    };

    fetchData();
  }, [user]);

  // --- FETCH LEADS (PROFILES) ---
  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        setLeads(data.map(p => ({
          id: p.id,
          name: p.full_name || 'Huésped Anónimo',
          email: 'Registrado vía App',
          role: p.role || 'guest',
          avatar: p.avatar_url,
          phone: p.phone,
          verificationStatus: 'verified',
          registeredAt: p.updated_at
        } as any)));
      }
    };
    if (activeTab === 'leads') fetchLeads();
  }, [activeTab]);

  // --- HANDLERS ---

  const handleSaveProperty = async (updated: Property) => {
    // Persistent Save to Supabase
    const { error } = await supabase.from('properties').upsert({
      id: updated.id.includes('imported') ? undefined : updated.id,
      title: updated.title,
      description: updated.description,
      location: updated.location,
      price_per_night: updated.price,
      images: updated.images,
      amenities: updated.amenities,
      max_guests: updated.guests
    });

    if (error) {
      showToast("Error al sincronizar con Supabase.");
      console.error(error);
      return;
    }

    const exists = properties.find(p => p.id === updated.id);
    if (exists) {
      const updatedProperties = properties.map(p => p.id === updated.id ? updated : p);
      onUpdateProperties(updatedProperties);
    } else {
      onUpdateProperties([...properties, updated]);
    }
    setIsEditing(null);
    showToast("Propiedad guardada en la nube.");
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
    const importedData = await mockImportFromLink(url);

    // Save to Database first to get a real ID
    const { data: dbItem, error } = await supabase.from('properties').insert({
      title: importedData.title || "Nueva Propiedad",
      description: importedData.description || "",
      price_per_night: importedData.price || 150,
      location: "Isabela, PR",
      images: importedData.images || [],
      amenities: importedData.amenities || [],
      max_guests: 4
    }).select().single();

    if (error || !dbItem) {
      showToast("Fallo en la importación a DB.");
      return;
    }

    const newProperty: Property = {
      id: dbItem.id,
      title: dbItem.title,
      subtitle: "Importada de plataforma",
      location: dbItem.location,
      address: "",
      description: dbItem.description,
      price: Number(dbItem.price_per_night),
      rating: importedData.rating || 4.5,
      reviews: importedData.reviews || 10,
      images: dbItem.images,
      amenities: dbItem.amenities,
      guests: dbItem.max_guests,
      bedrooms: 2,
      beds: 2,
      baths: 1,
      fees: { cleaningShort: 50, cleaningMedium: 75, cleaningLong: 100, petFee: 30, securityDeposit: 100 },
      policies: { checkInTime: "15:00", checkOutTime: "11:00", maxGuests: 6, wifiName: "", wifiPass: "", accessCode: "" },
      blockedDates: [],
      calendarSync: [],
      host: { name: user?.name || 'Host', image: user?.avatar || '', yearsHosting: 1, badges: [] }
    };

    onUpdateProperties([...properties, newProperty]);
    setIsEditing(newProperty.id);
    showToast("Importada con éxito en Supabase.");
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
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-serif font-bold text-text-main">Gestión del Día</h2>
        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
          <span className="material-icons text-[12px]">check_circle</span>
          Villas Listas para Check-in
        </div>
      </div>
      {/* Quick Summary Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black p-5 rounded-[2rem] text-white shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Ingresos Marzo</p>
          <p className="text-2xl font-serif font-bold">$4,820</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-light mb-1">Ocupación</p>
          <p className="text-2xl font-serif font-bold text-text-main">82%</p>
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
          {['dirty', 'progress', 'ready'].map(s => (
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
      {realBookings.length > 0 ? (
        realBookings.map((booking) => (
          <article key={booking.id} className="bg-white rounded-[2rem] p-6 shadow-soft border border-gray-100 relative overflow-hidden mb-4">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                Reserva {booking.status}
              </div>
              <span className="font-serif font-bold text-text-main">In: {booking.check_in}</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-float relative">
                <img src={booking.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="Guest" className="w-full h-full object-cover" />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-text-main leading-tight">{booking.profiles?.full_name || 'Huésped'}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light mt-1">
                  ${booking.total_price} • {booking.status}
                </p>
              </div>
            </div>

            <div className="bg-gray-50/50 rounded-2xl p-4 flex items-center gap-4 border border-gray-100 mb-6">
              <div className="w-12 h-12 bg-white p-1 rounded-xl shadow-sm overflow-hidden">
                <img src={booking.properties?.images?.[0] || 'https://placehold.co/150'} className="w-full h-full object-cover rounded-lg" alt="Prop" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-main">{booking.properties?.title || 'Villa'}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">ID: {booking.id.slice(0, 8)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="bg-black hover:bg-gray-900 text-white font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-icons text-sm">chat</span> Mensaje
              </button>
              <button className="bg-white border border-gray-200 text-text-main font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
                <span className="material-icons text-sm">assignment</span> Detalles
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-gray-200">
          <span className="material-icons text-4xl text-gray-200 mb-2">hotel</span>
          <p className="text-xs font-bold text-gray-400">Sin check-ins para hoy</p>
        </div>
      )}
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-black/95 p-6 rounded-[2rem] text-white shadow-soft relative overflow-hidden">
        <span className="material-icons absolute -bottom-4 -right-4 text-7xl opacity-5">database</span>
        <h3 className="text-xl font-serif font-bold mb-2">Base CRM Local</h3>
        <p className="text-[11px] font-medium opacity-60 leading-relaxed mb-6">
          Gestiona los datos de tus huéspedes registrados para campañas de WhatsApp.
        </p>
        <div className="flex gap-2">
          <button onClick={() => showToast("Exportando CSV...")} className="flex-1 bg-white text-black font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
            <span className="material-icons text-sm">file_download</span> CSV
          </button>
          <button onClick={() => showToast("Abriendo WhatsApp Web CRM...")} className="flex-1 bg-[#25D366] text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
            <span className="material-icons text-sm">chat</span> CRM WA
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-text-main text-sm">Clientes Registrados</h3>
          <span className="bg-gray-100 text-[10px] font-black text-text-light px-2 py-0.5 rounded-full">{leads.length}</span>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center text-text-light">
            <span className="material-icons text-4xl opacity-10 mb-2">group_off</span>
            <p className="text-xs font-bold">Sin registros aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leads.map((lead, i) => (
              <div key={i} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-sand text-secondary flex items-center justify-center font-bold text-sm shadow-sm">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-text-main leading-tight">{lead.name}</p>
                    <p className="text-[10px] font-medium text-text-light mt-0.5">{lead.email}</p>
                  </div>
                </div>
                <button className="text-primary p-2 hover:bg-primary/5 rounded-full transition-all">
                  <span className="material-icons text-lg">arrow_forward</span>
                </button>
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
                  onEdit={() => setIsEditingGuide({ catId: category.id, idx })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListings = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-text-main">Tus Propiedades</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white text-black border border-gray-200 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-soft hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="material-icons text-sm text-[#FF385C]">download</span> Importar
          </button>
          <button className="bg-black text-white rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-lg active:scale-95 transition-all">
            <span className="material-icons text-xl">add</span>
          </button>
        </div>
      </div>

      {properties.map(p => {
        const activeOffersCount = p.offers?.filter(isOfferActive).length || 0;

        return (
          <div key={p.id} className="bg-white rounded-[2rem] p-5 shadow-soft flex gap-5 border border-gray-100 group hover:border-black/10 transition-all">
            <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 relative shadow-sm">
              <img src={p.images[0] || 'https://placehold.co/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Listing" />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-black px-2 py-1 rounded-lg backdrop-blur-sm uppercase">
                ★ {p.rating || 'N/A'}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-serif font-bold text-lg text-text-main leading-tight">{p.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {activeOffersCount > 0 && (
                    <span className="bg-black text-white text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest">
                      <span className="material-icons text-[10px]">local_offer</span> {activeOffersCount} Promo
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">{p.location}</span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-lg font-serif font-bold text-text-main">${p.price}<span className="text-text-light text-[10px] font-black uppercase tracking-widest ml-1">/noche</span></div>
                <button
                  onClick={() => setIsEditing(p.id)}
                  className="bg-gray-50 text-black font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                >
                  Gestionar
                </button>
              </div>
            </div>
          </div>
        )
      })}
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
      <CustomToast />
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
      <nav className="fixed bottom-0 w-full bg-black border-t border-white/10 pb-safe pt-3 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-40 overflow-x-auto no-scrollbar">
        <div className="flex justify-around items-center px-4 pb-2 min-w-max gap-8 sm:gap-0 sm:min-w-0 sm:w-full">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'today' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">insights</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Hoy</span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'listings' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">apartment</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Villas</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'leads' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">contacts</span>
            <span className="text-[9px] font-black uppercase tracking-widest">CRM</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'reviews' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">star_outline</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Reseñas</span>
          </button>

          <button
            onClick={() => setActiveTab('guidebook')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'guidebook' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">explore</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Guía</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === 'messages' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className="relative">
              <span className="material-icons text-xl">chat_bubble_outline</span>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">6</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Chats</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'menu' ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons text-xl">more_horiz</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Más</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default HostDashboard;