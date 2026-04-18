module.exports = (() => {
  const plugins = {};
  try {
    require.resolve('@tailwindcss/postcss');
    plugins['@tailwindcss/postcss'] = {};
  } catch (e) {
    // Tailwind PostCSS plugin not installed.
  }
  try {
    require.resolve('autoprefixer');
    plugins.autoprefixer = {};
  } catch (e) {
    // autoprefixer not installed — skip it
  }
  return { plugins };
})();
