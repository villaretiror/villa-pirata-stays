import React, { useState, useEffect } from 'react';
import { Property, PropertyImage } from '../../../types';
import { supabase } from '../../../lib/SupabaseService';
import { showToast } from '../../../utils/toast';

interface PhotoSectionProps {
  form: Property;
  setForm: (p: Property) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'General / Todo' },
  { key: 'piscina', label: 'Piscina' },
  { key: 'habitación', label: 'Habitaciones' },
  { key: 'baño', label: 'Baños' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'bbq', label: 'BBQ' },
  { key: 'sala', label: 'Sala' },
  { key: 'exterior', label: 'Exterior' },
];

const PhotoSection: React.FC<PhotoSectionProps> = ({ form, setForm }) => {
  const [isUploading, setIsUploading] = useState(false);

  // Synchronize images_meta with images if they differ in length
  useEffect(() => {
    const images = form.images || [];
    const meta = (form.images_meta as unknown as PropertyImage[]) || [];
    
    if (images.length !== meta.length) {
      const newMeta = images.map(url => {
        const existing = meta.find(m => m.url === url);
        return existing || { url, category: 'all', description: '' };
      });
      setForm({ ...form, images_meta: newMeta as any });
    }
  }, [form.images]);

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err: any) {
      showToast(`Error al subir imagen: ${err.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const updateMeta = (index: number, updates: Partial<PropertyImage>) => {
    const newMeta = [...((form.images_meta as unknown as PropertyImage[]) || [])];
    if (newMeta[index]) {
      newMeta[index] = { ...newMeta[index], ...updates };
      setForm({ ...form, images_meta: newMeta as any });
    }
  };

  const currentMeta = (form.images_meta as unknown as PropertyImage[]) || [];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Curaduría Visual 🔱</h3>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.25em] opacity-80 mt-1">Gestión de Galería, Categorías y Portada</p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary/60">{form.images.length} fotos totales</p>
      </header>

      {/* Upload Dropzone */}
      <div className="relative group">
        <input
          type="file"
          id="photo-upload"
          hidden
          multiple
          accept="image/*"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files) return;
            const newImages = [...form.images];
            const newMeta = [...((form.images_meta as unknown as PropertyImage[]) || [])];
            
            for (let i = 0; i < files.length; i++) {
              if (files[i].size > 5 * 1024 * 1024) {
                showToast("Una o más imágenes superan los 5MB.");
                continue;
              }
              const url = await uploadImage(files[i]);
              if (url) {
                newImages.push(url);
                newMeta.push({ url, category: 'all', description: '' });
              }
            }
            setForm({ ...form, images: newImages, images_meta: newMeta as any });
          }}
        />
        <label
          htmlFor="photo-upload"
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer ${
            isUploading ? 'bg-gray-50 border-primary animate-pulse' : 'bg-gray-50 border-gray-100 hover:border-primary hover:bg-primary/5 group'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <span className={`material-icons text-3xl mb-2 transition-transform duration-500 ${isUploading ? 'animate-spin' : 'group-hover:scale-110'}`}>
              {isUploading ? 'sync' : 'cloud_upload'}
            </span>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light">
              {isUploading ? 'Subiendo Galería Elite...' : 'Vuela o Arrastra Fotos'}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest tracking-tighter mt-1">Soporta múltiples archivos (Máx 5MB c/u)</p>
          </div>
        </label>
      </div>

      {/* Manual Reordering Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentMeta.map((img, i) => (
          <div key={img.url + i} className={`relative group rounded-[2.5rem] overflow-hidden shadow-soft border-2 transition-all flex flex-col bg-white ${i === 0 ? 'border-yellow-400 ring-4 ring-yellow-400/10' : 'border-transparent hover:border-primary'}`}>
            <div className="relative h-48 overflow-hidden">
              <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Property ${i}`} />
              
              {/* Order Badge */}
              <div className={`absolute top-3 left-3 ${i === 0 ? 'bg-yellow-400 text-black' : 'bg-white/90 text-black'} text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-widest flex items-center gap-1.5 z-10`}>
                {i === 0 && <span className="material-icons text-[10px]">workspace_premium</span>}
                #{i + 1} {i === 0 && 'PORTADA'}
              </div>

              {/* Control HUD */}
              <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-lg p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <div className="flex gap-1.5">
                  {/* Move Left */}
                  {i > 0 && (
                    <button onClick={(e) => {
                      e.preventDefault();
                      const newImages = [...form.images];
                      const newMeta = [...((form.images_meta as unknown as PropertyImage[]) || [])];
                      [newImages[i-1], newImages[i]] = [newImages[i], newImages[i-1]];
                      [newMeta[i-1], newMeta[i]] = [newMeta[i], newMeta[i-1]];
                      setForm({ ...form, images: newImages, images_meta: newMeta as any });
                    }} className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-lg transition-all"><span className="material-icons text-white text-xs">chevron_left</span></button>
                  )}
                  
                  {/* Make Cover */}
                  {i > 0 && (
                    <button onClick={(e) => {
                      e.preventDefault();
                      const newImages = [form.images[i], ...form.images.filter((_, idx) => idx !== i)];
                      const newMeta = [currentMeta[i], ...currentMeta.filter((_, idx) => idx !== i)];
                      setForm({ ...form, images: newImages, images_meta: newMeta as any });
                      showToast("Portada establecida ⭐️");
                    }} className="w-7 h-7 flex items-center justify-center bg-yellow-400 text-black rounded-lg transition-all"><span className="material-icons text-xs">star</span></button>
                  )}
                  
                  {/* Move Right */}
                  {i < form.images.length - 1 && (
                    <button onClick={(e) => {
                      e.preventDefault();
                      const newImages = [...form.images];
                      const newMeta = [...((form.images_meta as unknown as PropertyImage[]) || [])];
                      [newImages[i+1], newImages[i]] = [newImages[i], newImages[i+1]];
                      [newMeta[i+1], newMeta[i]] = [newMeta[i], newMeta[i+1]];
                      setForm({ ...form, images: newImages, images_meta: newMeta as any });
                    }} className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-lg transition-all"><span className="material-icons text-white text-xs">chevron_right</span></button>
                  )}
                </div>
                
                <button onClick={(e) => {
                  e.preventDefault();
                  const newImages = form.images.filter((_, idx) => idx !== i);
                  const newMeta = currentMeta.filter((_, idx) => idx !== i);
                  setForm({ ...form, images: newImages, images_meta: newMeta as any });
                }} className="w-7 h-7 flex items-center justify-center bg-red-600/90 hover:bg-red-600 rounded-lg transition-all"><span className="material-icons text-white text-xs">delete_outline</span></button>
              </div>
            </div>

            {/* Metadata Inputs */}
            <div className="p-4 space-y-3 bg-gray-50/50">
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Categoría</label>
                <select 
                  value={img.category || 'all'}
                  onChange={(e) => updateMeta(i, { category: e.target.value })}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-secondary outline-none focus:ring-2 ring-primary/20 appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Descripción (Opcional)</label>
                <input 
                  type="text"
                  value={img.description || ''}
                  onChange={(e) => updateMeta(i, { description: e.target.value })}
                  placeholder="Ej: Vista desde el balcón..."
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-medium text-secondary outline-none focus:ring-2 ring-primary/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoSection;
