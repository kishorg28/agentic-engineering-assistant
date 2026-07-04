/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          dark: '#080c14',
          panel: '#0d1117',
          card: '#111827',
          border: 'rgba(255, 255, 255, 0.07)',
        },
        accent: {
          primary: '#38bdf8', // sky-400
          secondary: '#818cf8', // indigo-400
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(56, 189, 248, 0.15)',
        'glow-lg': '0 0 30px rgba(56, 189, 248, 0.28)',
      },
      animation: {
        'brand-pulse': 'brandPulse 4s ease-in-out infinite',
        'dot-pulse': 'dotPulse 2.2s ease-in-out infinite',
        'empty-float': 'emptyFloat 5s ease-in-out infinite',
        'spin-reverse': 'spin 8s linear infinite reverse',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        brandPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(56,189,248,0.0), 0 0 20px rgba(56,189,248,0.12)' },
          '50%': { boxShadow: '0 0 0 6px rgba(56,189,248,0.0), 0 0 30px rgba(56,189,248,0.28)' },
        },
        dotPulse: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 5px #4ade80' },
          '50%': { opacity: 0.5, boxShadow: 'none' },
        },
        emptyFloat: {
          '0%, 100%': { transform: 'translateY(0)', boxShadow: '0 0 28px rgba(56,189,248,0.18)' },
          '50%': { transform: 'translateY(-9px)', boxShadow: '0 12px 40px rgba(56,189,248,0.28)' },
        }
      }
    },
  },
  plugins: [],
}
