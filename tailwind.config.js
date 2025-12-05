/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#f4701f',
        'primary-strong': '#d95f1b',
        'primary-light': '#ff9446',
        'primary-soft': '#ffb347',
        surface: '#fff4e6',
        cream: '#ffe7d6',
        ink: '#2d1b10',
        'accent-green': '#6ca67c',
        'accent-red': '#d43f2f',
        'status-available': '#22c55e',
        'status-unavailable': '#9ca3af',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
}
