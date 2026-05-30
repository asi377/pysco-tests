export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffb8b8',
          300: '#ff8a8a',
          400: '#ff5959',
          500: '#e60000',
          600: '#cc0000',
          700: '#990000',
          800: '#660000',
          900: '#330000',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}