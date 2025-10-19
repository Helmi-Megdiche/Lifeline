import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Emergency-appropriate dark mode colors
        'emergency-red': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        'emergency-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'emergency-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Dark mode specific colors
        'dark-bg': {
          primary: '#0f172a',    // slate-900
          secondary: '#1e293b',   // slate-800
          tertiary: '#334155',    // slate-700
        },
        'dark-text': {
          primary: '#f8fafc',     // slate-50
          secondary: '#e2e8f0',   // slate-200
          tertiary: '#94a3b8',   // slate-400
        },
        'dark-border': {
          primary: '#334155',    // slate-700
          secondary: '#475569',  // slate-600
        },
        'dark-surface': {
          primary: '#1e293b',     // slate-800
          secondary: '#334155',   // slate-700
          tertiary: '#475569',   // slate-600
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'emergency-gradient': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        'emergency-gradient-light': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      },
      animation: {
        'pulse-emergency': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-emergency': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
};

export default config;
