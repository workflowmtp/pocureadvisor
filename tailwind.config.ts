import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        brand: {
          blue: '#3B82F6',
          'blue-soft': 'rgba(59,130,246,0.08)',
          green: '#10B981',
          'green-soft': 'rgba(16,185,129,0.08)',
          red: '#EF4444',
          'red-soft': 'rgba(239,68,68,0.08)',
          orange: '#F97316',
          'orange-soft': 'rgba(249,115,22,0.08)',
          purple: '#8B5CF6',
          'purple-soft': 'rgba(139,92,246,0.08)',
          cyan: '#06B6D4',
          'cyan-soft': 'rgba(6,182,212,0.08)',
        },
        sidebar: {
          bg: '#0F172A',
          hover: '#1E293B',
          active: 'rgba(59,130,246,0.15)',
          text: '#94A3B8',
          'text-active': '#F8FAFC',
          border: '#1E293B',
          section: '#475569',
        },
        surface: {
          DEFAULT: 'var(--bg-main)',
          card: 'var(--bg-card)',
          input: 'var(--bg-input)',
        },
      },
      spacing: {
        sidebar: '260px',
        header: '60px',
      },
      animation: {
        'pulse-dot': 'pulseDot 2s infinite',
        'typing': 'typingBounce 1.2s infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
