module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { 
    extend: {
      colors: {
        cyan: {
          500: 'var(--accent)',
          400: 'var(--accent)',
        }
      },
      backgroundColor: {
        'cyan-500/20': 'var(--accent-glow)',
      }
    } 
  },
  plugins: [],
};
