/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fcf4f4',
                    100: '#f8e6e6',
                    200: '#f0c7c7',
                    300: '#e5a3a3',
                    400: '#d77676',
                    500: '#c54444',
                    600: '#a82c2c',
                    700: '#800000',
                    800: '#660000',
                    900: '#4d0000',
                },
                indigo: {
                    50: '#fcf4f4',
                    100: '#f8e6e6',
                    200: '#f0c7c7',
                    300: '#e5a3a3',
                    400: '#d77676',
                    500: '#c54444',
                    600: '#a82c2c',
                    700: '#800000',
                    800: '#660000',
                    900: '#4d0000',
                },
                violet: {
                    50: '#fcf4f4',
                    100: '#f8e6e6',
                    200: '#f0c7c7',
                    300: '#e5a3a3',
                    400: '#d77676',
                    500: '#c54444',
                    600: '#a82c2c',
                    700: '#800000',
                    800: '#660000',
                    900: '#4d0000',
                },
                accent: {
                    400: '#fb7185',
                    500: '#e11d48',
                    600: '#be123c',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            keyframes: {
                blob: {
                    '0%,100%': { transform: 'translate(0,0) scale(1)' },
                    '33%': { transform: 'translate(30px,-30px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px,20px) scale(0.9)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                float: {
                    '0%,100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                blob: 'blob 8s infinite ease-in-out',
                shimmer: 'shimmer 2.5s linear infinite',
                float: 'float 4s ease-in-out infinite',
                'fade-up': 'fade-up 0.7s ease-out both',
            },
        },
    },
    plugins: [],
}
