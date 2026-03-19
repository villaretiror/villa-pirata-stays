import React, { useState } from 'react';
import { LocalGuideCategory, LocalGuideItem } from '../../types';
import GuideCard from '../GuideCard';
import { useProperty } from '../../contexts/PropertyContext';

interface ExperienceManagerProps {
  guideData: LocalGuideCategory[];
}

const ExperienceManager: React.FC<ExperienceManagerProps> = ({ guideData }) => {
  const { saveGuideItem, deleteGuideItem } = useProperty();
  const [isEditing, setIsEditing] = useState<{ catId: string; item?: LocalGuideItem } | null>(null);

  const handleSave = async (item: LocalGuideItem, catId: string) => {
    try {
      // Map UI category ID to DB slug
      const dbKeys: Record<string, string> = {
        'beaches': 'beach',
        'gastronomy': 'food',
        'nearby': 'landmark'
      };
      await saveGuideItem(item, dbKeys[catId] || 'beach');
      setIsEditing(null);
    } catch (error) {
      alert("Error al guardar el lugar: " + (error as any).message);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm("¿Seguro que quieres eliminar este lugar de la guía?")) {
      try {
        await deleteGuideItem(id);
      } catch (error) {
        alert("Error al eliminar: " + (error as any).message);
      }
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-primary text-xl mb-1">Curador de Experiencias</h3>
          <p className="text-sm text-text-light">Gestiona los destinos premium de Cabo Rojo que aparecen en la web.</p>
        </div>
        <div className="hidden md:block">
           <span className="material-icons text-primary/30 text-4xl">travel_explore</span>
        </div>
      </div>

      {guideData.map((category) => (
        <div key={category.id} className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <h3 className="font-serif font-bold text-2xl text-text-main flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                <span className="material-icons text-secondary">{category.icon}</span>
              </div>
              {category.category}
            </h3>
            <button
              onClick={() => setIsEditing({ catId: category.id })}
              className="px-5 py-2.5 bg-text-main text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <span className="material-icons text-sm">add</span>
              Agregar Lugar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.items.map((item, idx) => (
              <div key={item.id || idx} className="relative group">
                <GuideCard
                  item={item}
                  isEditable={true}
                  onEdit={() => setIsEditing({ catId: category.id, item })}
                />
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-4 left-4 bg-white/90 hover:bg-red-50 text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-red-100"
                  title="Eliminar lugar"
                >
                  <span className="material-icons text-sm">delete_outline</span>
                </button>
              </div>
            ))}
            {category.items.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-400">
                <span className="material-icons text-4xl mb-2">map</span>
                <p className="text-sm font-bold uppercase tracking-widest">Sin lugares en esta categoría</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {isEditing && (
        <GuideEditorModal
          item={isEditing.item}
          onSave={(item) => handleSave(item, isEditing.catId)}
          onCancel={() => setIsEditing(null)}
        />
      )}
    </div>
  );
};

const GuideEditorModal = ({ item, onSave, onCancel }: { item?: LocalGuideItem, onSave: (item: LocalGuideItem) => void, onCancel: () => void }) => {
  const [form, setForm] = useState<LocalGuideItem>(item || {
    name: '',
    distance: '',
    desc: '',
    image: '',
    saltyTip: '',
    sortOrder: 0
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-serif font-bold text-2xl text-text-main">
            {item ? 'Editar Destino' : 'Nuevo Destino'}
          </h2>
          <button onClick={onCancel} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-icons text-gray-400">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Nombre del Lugar</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Playa Buyé" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Orden (SEO)</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Distancia / Tiempo</label>
            <input value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 12-15 min" />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">URL de Imagen Premium</label>
            <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://unsplash.com/..." />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Google Maps Link</label>
            <input value={form.mapUrl} onChange={e => setForm({ ...form, mapUrl: e.target.value })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://google.com/maps/..." />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light ml-1">Descripción Aspiracional</label>
            <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className="w-full p-3.5 border border-gray-100 rounded-2xl bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 h-28 resize-none" placeholder="Describe la magia del lugar..." />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-1">
              <span className="material-icons text-xs">tips_and_updates</span> Salty Tip (Tu secreto)
            </label>
            <textarea value={form.saltyTip} onChange={e => setForm({ ...form, saltyTip: e.target.value })} className="w-full p-3.5 border border-primary/10 rounded-2xl bg-primary/5 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-primary/20 h-20 resize-none" placeholder="Un consejo personal de experto..." />
          </div>

          <div className="pt-4 flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-text-light hover:bg-gray-100 rounded-2xl transition-colors">Cancelar</button>
            <button 
              onClick={() => onSave(form)} 
              className="flex-1 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              Guardar Destino
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceManager;
