import React, { useState } from 'react';
import { Property } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../utils/toast';

interface PhotoSectionProps {
  form: Property;
  setForm: (p: Property) => void;
}

const PhotoSection: React.FC<PhotoSectionProps> = ({ form, setForm }) => {
  const [isUploading, setIsUploading] = useState(false);

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

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Curaduría Visual 🔱</h3>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.25em] opacity-80 mt-1">Gestión de Galería y Portada</p>
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
            for (let i = 0; i < files.length; i++) {
              if (files[i].size > 2 * 1024 * 1024) {
                showToast("Una o más imágenes superan los 2MB.");
                continue;
              }
              const url = await uploadImage(files[i]);
              if (url) newImages.push(url);
            }
            setForm({ ...form, images: newImages });
          }}
        />
        <label
          htmlFor="photo-upload"
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer ${
            isUploading ? 'bg-gray-50 border-primary animate-pulse' : 'bg-gray-50 border-gray-100 hover:border-primary hover:bg-primary/5 group'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <span className={`material-icons text-3xl mb-2 transition-transform duration-500 ${isUploading ? 'animate-spin' : 'group-hoverScale-110'}`}>
              {isUploading ? 'sync' : 'cloud_upload'}
            </span>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] opacity-80 text-text-light">
              {isUploading ? 'Subiendo Galería Elite...' : 'Vuela o Arrastra Fotos'}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest tracking-tighter mt-1">Soporta múltiples archivos (Máx 2MB c/u)</p>
          </div>
        </label>
      </div>

      {/* Manual Reordering Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {form.images.map((img: string, i: number) => (
          <div key={i} className={`relative group rounded-[2.5rem] overflow-hidden shadow-soft border-2 transition-all ${i === 0 ? 'border-yellow-400 ring-4 ring-yellow-400/10 scale-[1.05]' : 'border-transparent hover:border-primary'}`}>
            <img src={img} className="w-full h-40 object-cover" alt={`Property ${i}`} />
            
            {/* Control HUD (Tactical HUD Overlay) */}
            <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-lg p-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <div className="flex gap-2">
                {/* Move Left */}
                {i > 0 && (
                  <button onClick={(e) => {
                    e.preventDefault();
                    const newImages = [...form.images];
                    [newImages[i-1], newImages[i]] = [newImages[i], newImages[i-1]];
                    setForm({ ...form, images: newImages });
                  }} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-xl transition-all"><span className="material-icons text-white text-sm">chevron_left</span></button>
                )}
                
                {/* Make Cover STAR */}
                {i > 0 && (
                  <button onClick={(e) => {
                    e.preventDefault();
                    const newImages = [form.images[i], ...form.images.filter((_, idx) => idx !== i)];
                    setForm({ ...form, images: newImages });
                    showToast("Portada establecida ⭐️");
                  }} className="w-8 h-8 flex items-center justify-center bg-yellow-400 text-black rounded-xl transition-all"><span className="material-icons text-sm">star</span></button>
                )}
                
                {/* Move Right */}
                {i < form.images.length - 1 && (
                  <button onClick={(e) => {
                    e.preventDefault();
                    const newImages = [...form.images];
                    [newImages[i+1], newImages[i]] = [newImages[i], newImages[i+1]];
                    setForm({ ...form, images: newImages });
                  }} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-xl transition-all"><span className="material-icons text-white text-sm">chevron_right</span></button>
                )}
              </div>
              
              <button onClick={(e) => {
                e.preventDefault();
                setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });
              }} className="w-8 h-8 flex items-center justify-center bg-red-600/90 hover:bg-red-600 rounded-xl transition-all"><span className="material-icons text-white text-sm">delete_outline</span></button>
            </div>

            {/* Order Badge */}
            <div className={`absolute top-3 left-3 ${i === 0 ? 'bg-yellow-400 text-black' : 'bg-white/90 text-black'} text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-widest flex items-center gap-1.5`}>
              {i === 0 && <span className="material-icons text-[10px]">workspace_premium</span>}
              #{i + 1} {i === 0 && 'PORTADA'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoSection;
