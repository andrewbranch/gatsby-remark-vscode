// @ts-check
const path = require('path');

const scopesByLanguage = {
  js: 'source.js',
  jsx: 'source.jsx',
  md: 'text.html.markdown',
  ts: 'source.ts',
  tsx: 'source.tsx',
  yaml: 'source.yaml',
};

const languageAliases = {
  javascript: 'js',
  markdown: 'md',
  typescript: 'ts',
  yml: 'yaml',
};

const themeLocations = {
  darkPlus: path.resolve(__dirname, '../lib/themes/dark_plus.json'),
};

const grammarLocations = {
  [scopesByLanguage.js]: path.resolve(__dirname, '../lib/grammars/JavaScript.tmLanguage.json'),
  [scopesByLanguage.jsx]: path.resolve(__dirname, '../lib/grammars/JavaScriptReact.tmLanguage.json'),
  [scopesByLanguage.ts]: path.resolve(__dirname, '../lib/grammars/TypeScript.tmLanguage'),
  [scopesByLanguage.tsx]: path.resolve(__dirname, '../lib/grammars/TypeScriptReact.tmLanguage'),
};

module.exports = { scopesByLanguage, languageAliases, themeLocations, grammarLocations };
