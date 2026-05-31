/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand — warm teal/green evoking Manggarai highlands.
        primary: {
          50: '#eef9f5',
          100: '#d6f0e6',
          200: '#a8e0cb',
          300: '#73cba8',
          400: '#3eaf85',
          500: '#1d9168',
          600: '#0f7553',
          700: '#0b5d44',
          800: '#0a4a37',
          900: '#093d2d',
          950: '#042419',
        },
        // Accent — warm amber for highlights/CTAs sparingly.
        accent: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#fedba8',
          300: '#fcc070',
          400: '#f99d37',
          500: '#f77f12',
          600: '#e86308',
          700: '#c04909',
          800: '#983a10',
          900: '#7a3110',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 3px 0 rgb(15 23 42 / 0.05), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        pop: '0 10px 40px -12px rgb(15 23 42 / 0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease both',
        rise: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
