/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pond-blue': '#4A90E2',
        'lily-green': '#7ED321',
        'frog-green': '#50E3C2',
        'water-dark': '#2C5F7F',
        'danger-red': '#D0021B',
      },
      fontFamily: {
        game: ['Comic Sans MS', 'cursive'],
      },
    },
  },
  plugins: [],
}
