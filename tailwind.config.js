/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,css,json}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // 🔱 ATLANTIC SIGNATURE PALETTE
                primary: "#997300",    // Sovereign Gold (WCAG Contrast compliant)
                secondary: "#0A192F",  // Deep Atlantic Navy (Sustituye al negro)
                sand: "#FDFBF7",       // Champagne Mist (Fondo más limpio)
                surface: "#FFFFFF",
                "text-main": "#0A192F", // Texto principal en Navy para suavidad
                "text-light": "#4B5563",
                accent: "#1B3B5F",     // Navy medio para detalles
                "gold-dark": "#B8860B",
                "navy-deep": "#050D1A", // El tono más oscuro para sombras
            },
            fontFamily: {
                sans: ["Outfit", "sans-serif"],
                serif: ["Playfair Display", "serif"],
                display: ["Outfit", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "16px",
                "xl": "24px",
                "2xl": "32px",
                "3xl": "40px",
                "4xl": "50px",
                "5xl": "64px",
            },
            boxShadow: {
                'soft': '0 10px 40px -10px rgba(10, 25, 47, 0.05)',
                'card': '0 20px 40px -15px rgba(10, 25, 47, 0.08)',
                'float': '0 25px 50px -12px rgba(212, 175, 55, 0.2)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'bunker': '0 30px 60px -10px rgba(10, 25, 47, 0.4)',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'float': 'float 6s ease-in-out infinite',
                'pulse-gold': 'pulseGold 3s infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
                pulseGold: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6', transform: 'scale(1.02)' } }
            }
        },
    },
    plugins: [],
}
