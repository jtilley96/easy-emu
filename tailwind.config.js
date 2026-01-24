/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        'surface': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        'accent': {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          muted: '#4338ca',
        }
      },
      animation: {
        'focus-pulse': 'focus-pulse 1.5s ease-in-out infinite',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
      },
      keyframes: {
        'focus-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.5)' },
          '50%': { boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.8)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      scale: {
        '102': '1.02',
      }
    },
  },
  plugins: [],
}
