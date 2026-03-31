import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tables } from '../supabase_types';
import { Star, CheckCircle2 } from 'lucide-react';

type ReviewRow = Tables<'reviews'>;

interface ReviewCarouselProps {
  /** Opcional: filtrar reviews de una propiedad específica.
   *  Si se omite, muestra las más recientes de todas las propiedades. */
  propertyId?: string;
  /** Límite de reviews a mostrar (default: 8) */
  limit?: number;
}

const ReviewCarousel: React.FC<ReviewCarouselProps> = ({ propertyId, limit = 8 }) => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch real desde Supabase ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      setIsLoading(true);
      let query = supabase
        .from('reviews')
        .select('id, booking_id, property_id, author, text, rating, source, avatar_url, created_at')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      try {
        const { data, error } = await query;

        if (!cancelled) {
          if (error) {
            console.error('[ReviewCarousel] Supabase error:', error.message);
          } else {
            setReviews(data ?? []);
            setCurrentIndex(0);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Ignorar silenciosamente peticiones canceladas
        if (!cancelled) {
          console.error('[ReviewCarousel] Fetch error:', err);
          setIsLoading(false);
        }
      }
    };

    fetchReviews();
    return () => { cancelled = true; };
  }, [propertyId, limit]);

  // ── Auto-avance ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  // ── Estados vacíos ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="relative w-full max-w-4xl mx-auto px-4 py-12 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) return null;

  const current = reviews[currentIndex];
  const authorInitial = current.author?.charAt(0)?.toUpperCase() ?? '?';
  const displaySource = current.source as string;

  // Format date for display
  const displayDate = current.created_at
    ? new Date(current.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    : '';

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-12 overflow-hidden">
      <div className="flex flex-col items-center text-center">

        {/* Stars — dynamic based on rating */}
        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={20}
              className={`${
                i < Math.round(current.rating || 0) ? 'text-primary fill-primary' : 'text-secondary/10'
              }`}
            />
          ))}
        </div>

        {/* Review text with slide transition */}
        <div className="relative h-48 md:h-32 w-full">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className={`absolute inset-0 transition-all duration-1000 transform ${
                index === currentIndex
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-8 pointer-events-none'
              }`}
            >
              <p className="text-lg md:text-xl font-serif italic text-text-main leading-relaxed px-8">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>

        {/* Author info */}
        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            {current.avatar_url ? (
              <img
                src={current.avatar_url}
                alt={current.author}
                className="w-10 h-10 rounded-full object-cover border border-primary/20"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center font-bold text-primary border border-primary/20">
                {authorInitial}
              </div>
            )}
            <div className="text-left">
              <p className="font-bold text-text-main text-sm">{current.author}</p>
              <p className="text-[10px] text-text-light uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 size={12} className="text-primary" />
                {current.booking_id ? 'Huésped Verificado' : `Huésped Real`} via {displaySource}
                {displayDate && <> · {displayDate}</>}
              </p>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-2 mt-8">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ver reseña ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-secondary/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewCarousel;
