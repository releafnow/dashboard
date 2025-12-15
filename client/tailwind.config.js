/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2d5016',
          50: '#f0f9f0',
          100: '#dcefdc',
          200: '#bbdfbb',
          300: '#8dc68d',
          400: '#57a657',
          500: '#2d5016',
          600: '#1a3009',
          700: '#152908',
          800: '#142407',
          900: '#111e06',
        },
        green: {
          light: '#4ade80',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}





