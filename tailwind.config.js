module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          glow: 'var(--accent-glow)',
        },
        cyan: {
          50: 'var(--accent-glow)', // approximation
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent)', // approximation
        },
      },
    },
  },
  plugins: [],
};
