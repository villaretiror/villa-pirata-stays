import React, { useState } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    priority?: boolean;
}

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    fallbackSrc = 'https://images.unsplash.com/photo-1549492423-400230234946?auto=format&fit=crop&q=80&w=1200',
    alt,
    className,
    priority = false,
    ...props
}) => {
    const [errorCount, setErrorCount] = useState(0);
    const [loaded, setLoaded] = useState(false);

    // 🚀 BOUTIQUE OPTIMIZATION: High-Precision Image Resizing & Format Conversion
    let currentSrc = errorCount === 0 ? src : fallbackSrc;
    // 🚢 DUAL-STRATEGY: Primary (Optimized) vs Secondary (Raw Original)
    let optimizedSrc = currentSrc;
    if (optimizedSrc && optimizedSrc.includes('muscache.com')) {
        const width = priority ? 1440 : 800;
        // BUST-UP: Only transform if we haven't failed yet
        if (errorCount === 0) {
            optimizedSrc = optimizedSrc.split('?')[0] + `?im_w=${width}`;
        }
    } else if (optimizedSrc && optimizedSrc.includes('unsplash.com')) {
        const width = priority ? 1440 : 800;
        optimizedSrc = optimizedSrc.split('?')[0] + `?auto=format,compress&q=80&w=${width}`;
    } else if (optimizedSrc && (optimizedSrc.includes('supabase.co/storage/v1/render/image') || optimizedSrc.includes('supabase.co/storage/v1/object/public'))) {
        optimizedSrc = optimizedSrc.replace('/render/image/public/', '/object/public/').split('?')[0]; 
    }
    
    // 🔱 CACHE SLAYER: Add timestamp during retry to force a fresh non-cached pull
    if (errorCount === 1 && optimizedSrc) {
        optimizedSrc += (optimizedSrc.includes('?') ? '&' : '?') + `v_ref=${Date.now()}`;
    }

    return (
        <div className={`relative overflow-hidden aspect-square ${className || ''}`}>
            {/* 🌊 UNIVERSAL BLUR-UP (Elite Rescue Strategy) */}
            {!loaded && errorCount === 0 && (
                <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-2xl">
                    {src && (
                        <img
                            src={
                                src.includes('muscache.com') ? src.includes('?') ? `${src}&im_w=40` : `${src}?im_w=40` :
                                src.includes('supabase.co') ? src + (src.includes('?') ? '&' : '?') + 'width=50&quality=20&blur=50' :
                                src + (src.includes('?') ? '&' : '?') + 'w=50&blur=50&auto=format'
                            }
                            className="w-full h-full object-cover scale-110 opacity-40 blur-lg"
                            alt="loading-luxury-placeholder"
                            referrerPolicy="no-referrer"
                        />
                    )}
                </div>
            )}

            <img
                src={optimizedSrc}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-all duration-1000 ease-out ${loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'}`}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    if (errorCount === 0) {
                        // 🚢 SECONDARY DEFENSE: Try the raw original URL with a cache buster
                        console.warn(`[SmartImage] Optimized failed. Reverting to Raw...`);
                        setErrorCount(1);
                    } else if (errorCount === 1 && fallbackSrc && fallbackSrc !== src) {
                        // ⚓ FINAL STAND: Go to Unsplash
                        console.warn(`[SmartImage] Raw failed. Final Rescue with Unsplash...`);
                        setErrorCount(2);
                    } else {
                        setLoaded(true);
                    }
                }}
                {...props}
            />
        </div>
    );
};

export default SmartImage;
