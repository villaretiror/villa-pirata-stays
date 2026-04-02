import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Grid3X3, Waves, BedDouble, Bath, UtensilsCrossed, Flame, Home, Sofa } from 'lucide-react';
import { PropertyImage } from '../types';

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'Todo',        icon: <Grid3X3 size={14} /> },
  { key: 'piscina',   label: 'Piscina',     icon: <Waves size={14} /> },
  { key: 'habitación',label: 'Habitaciones',icon: <BedDouble size={14} /> },
  { key: 'baño',      label: 'Baños',       icon: <Bath size={14} /> },
  { key: 'cocina',    label: 'Cocina',      icon: <UtensilsCrossed size={14} /> },
  { key: 'bbq',       label: 'BBQ',         icon: <Flame size={14} /> },
  { key: 'sala',      label: 'Sala',        icon: <Sofa size={14} /> },
  { key: 'exterior',  label: 'Exterior',    icon: <Home size={14} /> },
];

interface FilteredGalleryProps {
  images_meta: PropertyImage[];
  /** Fallback array if images_meta is empty */
  images?: string[];
  title?: string;
  /** If true, shows a compact grid optimised for dashboard use */
  compact?: boolean;
  className?: string;
}

const FilteredGallery: React.FC<FilteredGalleryProps> = ({
  images_meta,
  images = [],
  title = '',
  compact = false,
  className = '',
}) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Build a normalised list – prefer images_meta, fall back to plain images[]
  const allItems: PropertyImage[] = useMemo(() => {
    if (images_meta && images_meta.length > 0) return images_meta;
    return images.map(url => ({ url, category: 'all', description: '' }));
  }, [images_meta, images]);

  // Which categories actually have photos?
  const presentCategories = useMemo(() => {
    const set = new Set(allItems.map(i => i.category));
    return CATEGORIES.filter(c => c.key === 'all' || set.has(c.key));
  }, [allItems]);

  // Filtered view
  const filtered = useMemo(
    () => activeCategory === 'all' ? allItems : allItems.filter(i => i.category === activeCategory),
    [allItems, activeCategory]
  );

  const openLightbox = (globalIndex: number) => setLightboxIndex(globalIndex);
  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => setLightboxIndex(i => i !== null ? (i - 1 + filtered.length) % filtered.length : null);
  const lightboxNext = () => setLightboxIndex(i => i !== null ? (i + 1) % filtered.length : null);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex]);

  if (allItems.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* ── Category Filter Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-6">
        {presentCategories.map(cat => (
          <motion.button
            key={cat.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border ${
              activeCategory === cat.key
                ? 'bg-secondary text-primary border-primary/20 shadow-md'
                : 'bg-white text-text-light border-black/5 hover:border-primary/20'
            }`}
          >
            {cat.icon}
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* ── Image Grid ── */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeCategory}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`grid gap-3 ${compact ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}
        >
          {filtered.map((img, idx) => (
            <motion.div
              key={img.url + idx}
              layout
              className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-gray-100 ${
                compact ? 'aspect-square' : idx === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openLightbox(idx)}
            >
              <img
                src={img.url}
                alt={img.description || title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-secondary/0 group-hover:bg-secondary/30 transition-all duration-300 flex items-end p-3">
                {img.description && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                    {img.description}
                  </span>
                )}
              </div>
              {/* Category Badge */}
              <div className="absolute top-2 left-2">
                <span className="bg-white/80 backdrop-blur-md text-secondary text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.category}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Photo count badge */}
      <p className="text-center mt-4 text-[11px] text-text-light font-semibold">
        {filtered.length} foto{filtered.length !== 1 ? 's' : ''} {activeCategory !== 'all' ? `· ${activeCategory}` : ''}
      </p>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
            >
              <X size={22} />
            </button>

            {/* Prev */}
            <button
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              className="absolute left-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-5xl px-16 py-10"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filtered[lightboxIndex]?.url}
                alt={filtered[lightboxIndex]?.description || ''}
                className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
              {/* Caption */}
              {filtered[lightboxIndex]?.description && (
                <p className="text-center text-white/70 text-sm mt-4 font-medium">
                  {filtered[lightboxIndex].description}
                </p>
              )}
              <p className="text-center text-white/40 text-[11px] mt-2 uppercase tracking-widest">
                {lightboxIndex + 1} / {filtered.length}
              </p>
            </motion.div>

            {/* Next */}
            <button
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              className="absolute right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
            >
              <ChevronRight size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilteredGallery;
