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
    let optimizedSrc = currentSrc;
    
    if (optimizedSrc && optimizedSrc.includes('muscache.com')) {
        // 🔱 AIRBNB ELITE: Force specific widths and quality. 
        // 1200 matches our max card width, but for priority (Hero) we might want more.
        const width = priority ? 1440 : 800; // Efficient sizing for Hero vs Cards
        optimizedSrc = optimizedSrc.split('?')[0] + `?im_w=${width}`;
    } else if (optimizedSrc && optimizedSrc.includes('unsplash.com')) {
        const width = priority ? 1440 : 800;
        optimizedSrc = optimizedSrc.split('?')[0] + `?auto=format,compress&q=80&w=${width}`;
    } else if (optimizedSrc && (optimizedSrc.includes('supabase.co/storage/v1/render/image') || optimizedSrc.includes('supabase.co/storage/v1/object/public'))) {
        // 🔱 SUPABASE DIRECT: High-speed delivery (Removing /render to avoid 403/404)
        const width = priority ? 1200 : 800; 
        optimizedSrc = optimizedSrc.replace('/render/image/public/', '/object/public/');
        // Not adding transform params that require Image Transformation service
        optimizedSrc = optimizedSrc.split('?')[0]; 
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
                        />
                    )}
                </div>
            )}

            <img
                src={optimizedSrc}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                className={`w-full h-full object-cover transition-all duration-1000 ease-out ${loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'}`}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    if (errorCount < 1 && fallbackSrc && fallbackSrc !== src) {
                        // 🚢 RESCUE PROTOCOL: Try the fallback image exactly once
                        console.warn(`[SmartImage] Primary failed. Attempting Rescue with fallback...`);
                        setErrorCount(prev => prev + 1);
                    } else {
                        // All attempts failed
                        setLoaded(true);
                    }
                }}
                {...props}
            />
        </div>
    );
};

export default SmartImage;
