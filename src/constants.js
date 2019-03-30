// @ts-check
const path = require('path');

module.exports.scopesByLanguage = {
  js: 'source.js',
  jsx: 'source.jsx',
  md: 'text.html.markdown',
  ts: 'source.ts',
  tsx: 'source.tsx',
  yaml: 'source.yaml',
};

module.exports.languageAliases = {
  javascript: 'js',
  markdown: 'md',
  typescript: 'ts',
  yml: 'yaml',
};

module.exports.themeLocations = {
  darkPlus: path.resolve(__dirname, '../lib/themes/dark_plus.json'),
}