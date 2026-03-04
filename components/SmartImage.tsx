import React, { useState } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    fallbackSrc = 'https://images.unsplash.com/photo-1549492423-400230234946?auto=format&fit=crop&q=80&w=1200', // Texture/Pattern Fallback
    alt,
    className,
    ...props
}) => {
    const [error, setError] = useState(false);

    return (
        <img
            src={error ? fallbackSrc : src}
            alt={alt}
            className={className}
            onError={() => {
                if (!error) {
                    setError(true);
                    console.warn(`SmartImage: Fallback triggered for ${src}`);
                }
            }}
            {...props}
        />
    );
};

export default SmartImage;
