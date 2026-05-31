/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
