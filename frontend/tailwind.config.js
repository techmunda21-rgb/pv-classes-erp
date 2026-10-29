/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#4361ee',
          600: '#3b55d8',
          700: '#2d41b8',
          900: '#1e2d80',
        },
        purple: {
          500: '#7c3aed',
          600: '#6d28d9',
        },
        gold: {
          400: '#fbbf24',
          500: '#f4b942',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
