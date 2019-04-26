// @ts-check
const path = require('path');
// @ts-ignore
const grammarManifest = require('../lib/grammars/manifest.json');
// @ts-ignore
const themeManifest = require('../lib/themes/manifest.json');

/**
 * @param {string} language 
 * @param {*} grammarCache
 */
function getScope(language, grammarCache) {
  const grammars = { ...grammarManifest, ...grammarCache };
  for (const scopeName in grammars) {
    const grammar = grammars[scopeName];
    if (grammar.languageNames.includes(language)) {
      return scopeName;
    }
  }
}

/**
 * @param {*} grammar
 */
function getGrammarLocation(grammar) {
    return path.isAbsolute(grammar.path)
      ? grammar.path
      : path.resolve(__dirname, '../lib/grammars', grammar.path);
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
      return path.isAbsolute(theme.path)
        ? theme.path
        : path.resolve(__dirname, '../lib/themes', theme.path);
    }
  }
}

const highestBuiltinLanguageId = Object.keys(grammarManifest).reduce((highest, scopeName) => (
  Math.max(highest, grammarManifest[scopeName].languageId)
), 1);

/**
 * @param {string} scopeName 
 * @param {*} grammarCache
 */
function getGrammar(scopeName, grammarCache) {
  return { ...grammarManifest, ...grammarCache }[scopeName];
}

module.exports = { getScope, getGrammar, getGrammarLocation, getThemeLocation, highestBuiltinLanguageId };
