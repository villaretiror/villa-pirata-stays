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
                primary: "#BBA27E",
                "primary-dark": "#9F8B6C",
                secondary: "#1A1A1A",
                "secondary-light": "#333333",
                sand: "#F9F6F2",
                surface: "#FFFFFF",
                "text-main": "#1A1A1A",
                "text-light": "#888888",
                accent: "#BBA27E",
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
            },
            boxShadow: {
                'soft': '0 10px 40px -10px hsla(37, 41%, 74%, 0.1)',
                'card': '0 20px 40px -15px hsla(37, 41%, 74%, 0.15)',
                'float': '0 25px 50px -12px hsla(17, 100%, 60%, 0.2)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }
            }
        },
    },
    plugins: [],
}
