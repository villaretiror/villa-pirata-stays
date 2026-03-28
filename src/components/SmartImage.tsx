import React, { useState } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    fallbackSrc = 'https://images.unsplash.com/photo-1549492423-400230234946?auto=format&fit=crop&q=80&w=1200',
    alt,
    className,
    ...props
}) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // 🚀 BOUTIQUE OPTIMIZATION: Handle Airbnb (muscache) and Unsplash resizing
    let optimizedSrc = error ? fallbackSrc : src;
    
    if (optimizedSrc && optimizedSrc.includes('muscache.com')) {
        // Append im_w to Airbnb images for optimized loading (720 is ideal for 1x cards)
        optimizedSrc = optimizedSrc.includes('?') 
            ? `${optimizedSrc}&im_w=720` 
            : `${optimizedSrc}?im_w=720`;
    } else if (optimizedSrc && optimizedSrc.includes('unsplash.com') && !optimizedSrc.includes('auto=format')) {
        optimizedSrc += optimizedSrc.includes('?') ? '&auto=format' : '?auto=format';
    } else if (optimizedSrc && optimizedSrc.includes('supabase.co/storage/v1/render/image')) {
        // Supabase already using render endpoint, just ensure width/format
        if (!optimizedSrc.includes('width=')) optimizedSrc += `&width=1200&format=webp&quality=80`;
    } else if (optimizedSrc && optimizedSrc.includes('supabase.co/storage/v1/object/public')) {
        // 🔱 SALTY TRANSFORMATION: Convert raw Public URL to Render URL for WebP delivery
        optimizedSrc = optimizedSrc.replace('/object/public/', '/render/image/public/') + 
                        (optimizedSrc.includes('?') ? '&' : '?') + 'width=1200&format=webp&quality=80';
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Blur Placeholder / Low-res base */}
            {!loaded && !error && (
                <div className="absolute inset-0 bg-gradient-to-br from-sand to-gray-200">
                    {src?.includes('unsplash.com') && (
                        <img
                            src={src + (src.includes('?') ? '&' : '?') + 'w=50&blur=50&auto=format'}
                            className="w-full h-full object-cover scale-110 opacity-60"
                            alt="loading-placeholder"
                        />
                    )}
                </div>
            )}

            <img
                src={optimizedSrc}
                alt={alt}
                loading="lazy"
                className={`w-full h-full object-cover transition-all duration-1000 ease-out ${loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'}`}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    if (!error) {
                        setError(true);
                        setLoaded(true);
                    }
                }}
                {...props}
            />
        </div>
    );
};

export default SmartImage;
