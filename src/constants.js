// @ts-check
const path = require('path');
// @ts-ignore
const grammarManifest = require('../lib/grammars/manifest.json');
// @ts-ignore
const themeManifest = require('../lib/themes/manifest.json');

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

const grammarLocations = Object.keys(grammarManifest).reduce((hash, scopeName) => ({
  ...hash,
  [scopeName]: path.resolve(__dirname, '../lib/grammars', grammarManifest[scopeName]),
}), {});

const themeLocations = Object.keys(themeManifest).reduce((hash, themeId) => ({
  ...hash,
  [themeId]: path.resolve(__dirname, '../lib/themes', themeManifest[themeId].path),
}), {});

const themeAliases = Object.keys(themeManifest).reduce((hash, themeId) => themeManifest[themeId].label ? ({
  ...hash,
  [themeManifest[themeId].label.toLowerCase()]: themeId,
}) : hash, {});

module.exports = { scopesByLanguage, languageAliases, grammarLocations, themeLocations, themeAliases };
