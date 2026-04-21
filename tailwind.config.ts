import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Material Design 3 Tokens from UI_Component.html ── */
        'primary': '#0040df',
        'primary-container': '#2d5bff',
        'primary-fixed': '#dde1ff',
        'primary-fixed-dim': '#b8c3ff',
        'on-primary': '#ffffff',
        'on-primary-container': '#efefff',
        'on-primary-fixed': '#001355',
        'on-primary-fixed-variant': '#0035bd',

        'secondary': '#4648d4',
        'secondary-container': '#6063ee',
        'secondary-fixed': '#e1e0ff',
        'secondary-fixed-dim': '#c0c1ff',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#fffbff',
        'on-secondary-fixed': '#07006c',
        'on-secondary-fixed-variant': '#2f2ebe',

        'tertiary': '#006242',
        'tertiary-container': '#007d55',
        'tertiary-fixed': '#6ffbbe',
        'tertiary-fixed-dim': '#4edea3',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#bdffdb',
        'on-tertiary-fixed': '#002113',
        'on-tertiary-fixed-variant': '#005236',

        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        'background': '#f7f9fb',
        'on-background': '#191c1e',
        'surface': '#f7f9fb',
        'surface-bright': '#f7f9fb',
        'surface-dim': '#d8dadc',
        'surface-tint': '#104af0',
        'surface-variant': '#e0e3e5',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434656',

        'outline': '#747688',
        'outline-variant': '#c4c5d9',
        'inverse-surface': '#2d3133',
        'inverse-on-surface': '#eff1f3',
        'inverse-primary': '#b8c3ff',

        /* ── Legacy aliases for backward compatibility ── */
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0040df',     // mapped to primary
          700: '#0035bd',
          800: '#001355',
          900: '#001355',
          950: '#07006c',
        },
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        label: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 16px 40px -8px rgba(0,0,0,0.08)',
        'elevated': '40px 0 60px -5px rgba(0,0,0,0.06)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
