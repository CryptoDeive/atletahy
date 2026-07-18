/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Impact', 'Haettenschweiler', '"Arial Narrow Bold"', 'sans-serif'],
        body: ['"Arial Narrow"', 'Aptos Narrow', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Consolas', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        hyrox: {
          black: '#050505',
          panel: '#0b0d0f',
          panel2: '#121418',
          line: '#262a2f',
          gold: '#f6c94c',
          amber: '#d99b24',
          smoke: '#a9adb5',
        },
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(246, 201, 76, 0.45), 0 18px 60px rgba(246, 201, 76, 0.09)',
        panel: '0 24px 90px rgba(0, 0, 0, 0.42)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(246,201,76,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(246,201,76,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
