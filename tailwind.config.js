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
        background: 'var(--bg)',
        'background-elevated': 'var(--bg-elevated)',
        foreground: 'var(--text)',
        'foreground-muted': 'var(--text-muted)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        cyan: {
          50: 'var(--accent-glow)',
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent)',
        },
      },
    },
  },
  plugins: [],
};
