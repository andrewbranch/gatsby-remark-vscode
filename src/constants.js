// @ts-check
const path = require('path');
// @ts-ignore
const grammarManifest = require('../lib/grammars/manifest.json');
// @ts-ignore
const themeManifest = require('../lib/themes/manifest.json');

const scopesByLanguage = Object.keys(grammarManifest).reduce((hash, scopeName) => ({
  ...hash,
  ...grammarManifest[scopeName].languageNames
    && grammarManifest[scopeName].languageNames.reduceRight((hash, name) => ({
      ...hash,
      [name]: scopeName,
    }), {}),
}), {});

const grammarLocations = Object.keys(grammarManifest).reduce((hash, scopeName) => ({
  ...hash,
  [scopeName]: path.resolve(__dirname, '../lib/grammars', grammarManifest[scopeName].path),
}), {});

const themeLocations = Object.keys(themeManifest).reduce((hash, themeId) => ({
  ...hash,
  [themeId]: path.resolve(__dirname, '../lib/themes', themeManifest[themeId].path),
}), {});

const themeAliases = Object.keys(themeManifest).reduce((hash, themeId) => themeManifest[themeId].label ? ({
  ...hash,
  [themeManifest[themeId].label.toLowerCase()]: themeId,
}) : hash, {});

const highestBuiltinLanguageId = Object.keys(grammarManifest).reduce((highest, scopeName) => (
  Math.max(highest, grammarManifest[scopeName].languageId)
), 1);

const languageIds = Object.keys(grammarManifest).reduce((hash, scopeName) => ({
  ...hash,
  [scopeName]: grammarManifest[scopeName].languageId,
}), {});

const tokenTypes = Object.keys(grammarManifest).reduce((hash, scopeName) => ({
  ...hash,
  [scopeName]: grammarManifest[scopeName].tokenTypes,
}), {});

module.exports = { scopesByLanguage, grammarLocations, themeLocations, themeAliases, languageIds, tokenTypes, highestBuiltinLanguageId };
