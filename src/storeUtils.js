// @ts-check
const path = require('path');
const { exists } = require('./utils');

/** @type {void} */
let grammarManifest;
/** @type {void} */
let themeManifest;

/** @returns {GrammarCache} */
function getGrammarManifest() {
  // @ts-ignore
  return grammarManifest || (grammarManifest = require('../lib/grammars/manifest.json'));
}

/** @returns {ThemeCache} */
function getThemeManifest() {
  // @ts-ignore
  return themeManifest || (themeManifest = require('../lib/themes/manifest.json'));
}

/**
 * @param {string} language
 * @param {Record<string, string>} languageAliases
 */
function resolveAlias(language, languageAliases) {
  return languageAliases[language] || language;
}

/**
 * @param {string} language
 * @param {GrammarCache} grammarCache
 * @param {Record<string, string>} languageAliases
 */
function getScope(language, grammarCache, languageAliases) {
  const resolvedLanguage = resolveAlias(language, languageAliases);
  const grammars = { ...getGrammarManifest(), ...grammarCache };
  for (const scopeName in grammars) {
    const grammar = grammars[scopeName];
    if (grammar.languageNames.includes(resolvedLanguage)) {
      return scopeName;
    }
  }
}

/**
 * @param {GrammarData} grammar
 */
function getGrammarLocation(grammar) {
  return path.isAbsolute(grammar.path) ? grammar.path : path.resolve(__dirname, '../lib/grammars', grammar.path);
}

/**
 *
 * @param {string} themeNameOrId
 * @param {ThemeCache} themeCache
 * @param {string=} contextDirectory
 * @returns {Promise<string>}
 */
async function ensureThemeLocation(themeNameOrId, themeCache, contextDirectory) {
  const themes = { ...getThemeManifest(), ...themeCache };
  for (const themeId in themes) {
    const theme = themes[themeId];
    if (
      themeNameOrId === themeId ||
      themeNameOrId.toLowerCase() === theme.label.toLowerCase() ||
      (themeNameOrId === theme.packageName && theme.isOnlyThemeInPackage)
    ) {
      const themePath = path.isAbsolute(theme.path) ? theme.path : path.resolve(__dirname, '../lib/themes', theme.path);
      if (!(await exists(themePath))) {
        throw new Error(`Theme manifest lists '${themeNameOrId}' at '${themePath}, but no such file exists.'`);
      }
      return themePath;
    }
    if (themeNameOrId === theme.packageName) {
      throw new Error(
        `Cannot identify theme by '${themeNameOrId}' because the extension contains more than one theme.`
      );
    }
  }

  const locallyResolved = contextDirectory && path.resolve(contextDirectory, themeNameOrId);
  if (!locallyResolved || !(await exists(locallyResolved))) {
    throw new Error(`Theme manifest does not contain theme '${themeNameOrId}'.`);
  }
  return locallyResolved;
}

function getHighestBuiltinLanguageId() {
  return Object.keys(getGrammarManifest()).reduce(
    (highest, scopeName) => Math.max(highest, getGrammarManifest()[scopeName].languageId),
    1
  );
}

/**
 * @param {string} scopeName
 * @param {GrammarCache} grammarCache
 */
function getGrammar(scopeName, grammarCache) {
  return getAllGrammars(grammarCache)[scopeName];
}

/**
 * @param {GrammarCache} grammarCache
 * @returns {GrammarCache}
 */
function getAllGrammars(grammarCache) {
  return { ...getGrammarManifest(), ...grammarCache };
}

module.exports = {
  getScope,
  getGrammar,
  getGrammarLocation,
  ensureThemeLocation,
  getHighestBuiltinLanguageId,
  getAllGrammars
};
