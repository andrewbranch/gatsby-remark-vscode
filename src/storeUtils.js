// @ts-check
const path = require('path');
// @ts-ignore
const grammarManifest = require('../lib/grammars/manifest.json');
// @ts-ignore
const themeManifest = require('../lib/themes/manifest.json');

/**
 * @param {string} language
 * @param {Record<string, string>} languageAliases
 */
function resolveAlias(language, languageAliases) {
  return languageAliases[language] || language;
}

/**
 * @param {string} language
 * @param {*} grammarCache
 * @param {Record<string, string>} languageAliases
 */
function getScope(language, grammarCache, languageAliases) {
  const resolvedLanguage = resolveAlias(language, languageAliases);
  const grammars = { ...grammarManifest, ...grammarCache };
  for (const scopeName in grammars) {
    const grammar = grammars[scopeName];
    if (grammar.languageNames.includes(resolvedLanguage)) {
      return scopeName;
    }
  }
}

/**
 * @param {*} grammar
 */
function getGrammarLocation(grammar) {
  return path.isAbsolute(grammar.path) ? grammar.path : path.resolve(__dirname, '../lib/grammars', grammar.path);
}

/**
 *
 * @param {string} themeNameOrId
 * @param {*} themeCache
 */
function getThemeLocation(themeNameOrId, themeCache) {
  const themes = { ...themeManifest, ...themeCache };
  for (const themeId in themes) {
    const theme = themes[themeId];
    if (themeNameOrId === themeId || themeNameOrId.toLowerCase() === theme.label.toLowerCase()) {
      return path.isAbsolute(theme.path) ? theme.path : path.resolve(__dirname, '../lib/themes', theme.path);
    }
  }
}

const highestBuiltinLanguageId = Object.keys(grammarManifest).reduce(
  (highest, scopeName) => Math.max(highest, grammarManifest[scopeName].languageId),
  1
);

/**
 * @param {string} scopeName
 * @param {*} grammarCache
 */
function getGrammar(scopeName, grammarCache) {
  return getAllGrammars(grammarCache)[scopeName];
}

/**
 * @param {*} grammarCache
 */
function getAllGrammars(grammarCache) {
  return { ...grammarManifest, ...grammarCache };
}

module.exports = {
  getScope,
  getGrammar,
  getGrammarLocation,
  getThemeLocation,
  highestBuiltinLanguageId,
  getAllGrammars
};
