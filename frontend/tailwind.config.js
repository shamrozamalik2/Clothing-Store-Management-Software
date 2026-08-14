/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand — indigo palette (PBC brand color)
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Surface palette — values come from CSS variables so light/dark toggle works at runtime
        surface: {
          50:  'rgb(var(--s-50) / <alpha-value>)',
          100: 'rgb(var(--s-100) / <alpha-value>)',
          200: 'rgb(var(--s-200) / <alpha-value>)',
          300: 'rgb(var(--s-300) / <alpha-value>)',
          400: 'rgb(var(--s-400) / <alpha-value>)',
          500: 'rgb(var(--s-500) / <alpha-value>)',
          600: 'rgb(var(--s-600) / <alpha-value>)',
          700: 'rgb(var(--s-700) / <alpha-value>)',
          800: 'rgb(var(--s-800) / <alpha-value>)',
          900: 'rgb(var(--s-900) / <alpha-value>)',
          950: 'rgb(var(--s-950) / <alpha-value>)',
        },
        // Semantic tokens — theme-aware via CSS variables
        card:   'rgb(var(--card) / <alpha-value>)',
        appbg:  'rgb(var(--app-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      boxShadow: {
        sm:          '0 1px 2px 0 rgb(0 0 0 / 0.06)',
        card:        '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md':   '0 4px 8px -2px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'card-lg':   '0 8px 16px -4px rgb(0 0 0 / 0.12), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        glow:        '0 0 24px rgb(79 70 229 / 0.25)',
        'glow-sm':   '0 0 12px rgb(79 70 229 / 0.20)',
        'glow-blue': '0 0 20px rgb(59 130 246 / 0.30)',
        'glow-violet':'0 0 20px rgb(139 92 246 / 0.35)',
        'btn':       '0 4px 14px rgb(79 70 229 / 0.35)',
        'btn-hover': '0 6px 22px rgb(139 92 246 / 0.45)',
        sidebar:     '4px 0 24px rgb(0 0 0 / 0.15)',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-in-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'slide-down':  'slideDown 0.2s ease-out',
        'slide-in-left':'slideInLeft 0.25s ease-out',
        shimmer:       'shimmer 2s linear infinite',
        'gradient-x':  'gradientX 8s ease infinite',
        'glow-pulse':  'glowPulse 6s ease-in-out infinite',
        'glow-pulse-slow':'glowPulse 10s ease-in-out infinite',
        'float':       'float 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown:    { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft:  { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer:      { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '0.9', transform: 'scale(1.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};