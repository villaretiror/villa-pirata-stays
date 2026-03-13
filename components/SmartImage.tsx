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

    // Basic optimization for common providers if not already present
    let optimizedSrc = error ? fallbackSrc : src;
    if (optimizedSrc?.includes('unsplash.com') && !optimizedSrc.includes('auto=format')) {
        optimizedSrc += optimizedSrc.includes('?') ? '&auto=format' : '?auto=format';
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
