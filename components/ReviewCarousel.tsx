import React, { useState, useEffect } from 'react';
import { Review } from '../types';

interface ReviewCarouselProps {
  reviews: Review[];
}

const ReviewCarousel: React.FC<ReviewCarouselProps> = ({ reviews }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (reviews.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [reviews.length]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-12 overflow-hidden">
      <div className="flex flex-col items-center text-center">
        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="material-icons text-primary text-xl">star</span>
          ))}
        </div>

        <div className="relative h-48 md:h-32 w-full">
          {reviews.map((review, index) => (
            <div
              key={index}
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

        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center font-bold text-primary border border-primary/20">
              {reviews[currentIndex].author.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-bold text-text-main text-sm">{reviews[currentIndex].author}</p>
              <p className="text-[10px] text-text-light uppercase tracking-widest flex items-center gap-1">
                <span className="material-icons text-[10px]">verified</span>
                Huésped Real via {reviews[currentIndex].source}
              </p>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex gap-2 mt-8">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewCarousel;
