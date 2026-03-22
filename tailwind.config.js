/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./script.js",
    "./*.js",
  ],
  safelist: [
    // --- Ring widths & offsets ---
    'ring-1', 'ring-2', 'ring-4',
    'ring-offset-2', 'ring-offset-4',
    'ring-offset-white',
    'ring-offset-slate-800',
    // --- Ring colours (all statuses) ---
    'ring-emerald-500',
    'ring-teal-500',
    'ring-amber-500',
    'ring-blue-500',
    'ring-red-500',
    'ring-purple-500',
    'ring-cyan-500',
    'ring-indigo-500',
    'ring-slate-400',
    'ring-white',
    'ring-white/50',
    'ring-black/20',
    'ring-amber-200', 'ring-amber-800/50',
    'ring-blue-200',  'ring-blue-800/50',
    'ring-purple-200','ring-purple-800/50',
    // --- Cyan (Tugas Madrasah) backgrounds, text, borders ---
    'bg-cyan-50', 'bg-cyan-100', 'bg-cyan-500', 'bg-cyan-800',
    'bg-cyan-50/30', 'bg-cyan-900/10', 'bg-cyan-900/20', 'bg-cyan-900/30',
    'text-cyan-400', 'text-cyan-500', 'text-cyan-600',
    'border-cyan-100', 'border-cyan-200', 'border-cyan-500', 'border-cyan-700',
    'dark:bg-cyan-900/30', 'dark:text-cyan-400', 'dark:border-cyan-700',
    // --- Teal (Telat) backgrounds, text, borders ---
    'bg-teal-100', 'bg-teal-900/30',
    'text-teal-500', 'text-teal-600',
    'border-teal-200', 'border-teal-700',
    // --- Dark-mode ring offsets ---
    'dark:ring-offset-slate-800',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { 
        sans: ['"Plus Jakarta Sans"', 'sans-serif'] 
      },
      colors: {
        brand: { 
          50: '#ecfdf5', 
          100: '#d1fae5', 
          500: '#10b981', 
          600: '#059669', 
          900: '#064e3b' 
        },
        dark: { 
          bg: '#0f172a', 
          card: '#1e293b', 
          text: '#f1f5f9' 
        }
      },
      animation: {
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'blob': 'blob 10s infinite alternate',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: { 
          '0%': { transform: 'translateY(20px)', opacity: 0 }, 
          '100%': { transform: 'translateY(0)', opacity: 1 } 
        },
        fadeIn: { 
          '0%': { opacity: 0 }, 
          '100%': { opacity: 1 } 
        },
        blob: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(20px, -20px) scale(1.1)' }
        }
      }
    }
  },
  plugins: [],
}
